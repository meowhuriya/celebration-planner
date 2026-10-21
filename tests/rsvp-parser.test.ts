import { describe, it, expect } from "vitest";
import {
  formatRsvpReplyCode,
  formatRsvpHumanMessage,
  parseRsvpReplies,
  calculateRsvpSummary,
} from "@/lib/rsvp/parser";
import type { Guest } from "@/lib/seating";

describe("RSVP Parser & Reply Formatter", () => {
  const sampleGuests: Guest[] = [
    { id: "g1", name: "Aarav Sharma", group: "Groom Family" },
    { id: "g2", name: "Ananya Sen", group: "Bride Friends" },
    { id: "g3", name: "Kabir Khan", group: "Colleagues" },
    { id: "g4", name: "Zara Ali", group: "Family" },
  ];

  it("formats single-line reply code with exact RSVP1 syntax", () => {
    const code = formatRsvpReplyCode(
      "g1",
      "yes",
      2,
      "vegetarian",
      "Excited to attend!"
    );
    expect(code).toBe("RSVP1|g1|Y|2|veg|Excited to attend!");

    const declineCode = formatRsvpReplyCode(
      "g2",
      "no",
      1,
      undefined,
      "Out of town"
    );
    expect(declineCode).toBe("RSVP1|g2|N|0|none|Out of town");

    const maybeCode = formatRsvpReplyCode("g3", "maybe", 3, "non-vegetarian");
    expect(maybeCode).toBe("RSVP1|g3|M|3|nonveg|");
  });

  it("formats friendly human message containing the reply code", () => {
    const msg = formatRsvpHumanMessage(
      "Aisha & Rahul",
      "Aarav Sharma",
      "Wedding Celebration",
      "yes",
      2,
      "vegetarian",
      "See you there!",
      "g1"
    );

    expect(msg).toContain("Hi Aisha & Rahul!");
    expect(msg).toContain("Wedding Celebration");
    expect(msg).toContain("Aarav Sharma");
    expect(msg).toContain("Yes, attending");
    expect(msg).toContain("Party size: 2 seats");
    expect(msg).toContain("Vegetarian");
    expect(msg).toContain("RSVP1|g1|Y|2|veg|See you there!");
  });

  it("parses single valid reply line and updates corresponding guest", () => {
    const pasted = "RSVP1|g1|Y|2|veg|Looking forward to it!";
    const result = parseRsvpReplies(pasted, sampleGuests);

    expect(result.appliedCount).toBe(1);
    expect(result.ignoredCount).toBe(0);
    expect(result.summaryMessage).toBe("1 reply applied");

    const updated = result.updatedGuests.find((g) => g.id === "g1");
    expect(updated?.rsvpStatus).toBe("yes");
    expect(updated?.partySize).toBe(2);
    expect(updated?.foodChoice).toBe("vegetarian");
    expect(updated?.note).toBe("Looking forward to it!");
  });

  it("parses multiple mixed replies in messy WhatsApp text format", () => {
    const pastedText = `
Hi Aisha! Thanks so much for inviting us.
RSVP1|g1|Y|2|veg|Can't wait!

Hey here is my reply:
RSVP1|g2|N|0|none|So sorry, will be travelling

RSVP1|g3|M|1|either|Tentative, will confirm by Monday

Someone unknown sent this:
RSVP1|unknown_999|Y|4|nonveg|Hello
`;

    const result = parseRsvpReplies(pastedText, sampleGuests);

    expect(result.appliedCount).toBe(3);
    expect(result.ignoredCount).toBe(1);
    expect(result.summaryMessage).toBe(
      "3 replies applied, 1 ignored (unknown guest)"
    );

    const g1 = result.updatedGuests.find((g) => g.id === "g1");
    expect(g1?.rsvpStatus).toBe("yes");
    expect(g1?.partySize).toBe(2);
    expect(g1?.foodChoice).toBe("vegetarian");

    const g2 = result.updatedGuests.find((g) => g.id === "g2");
    expect(g2?.rsvpStatus).toBe("no");
    expect(g2?.partySize).toBe(0);

    const g3 = result.updatedGuests.find((g) => g.id === "g3");
    expect(g3?.rsvpStatus).toBe("maybe");
    expect(g3?.foodChoice).toBe("either");

    // g4 was untouched
    const g4 = result.updatedGuests.find((g) => g.id === "g4");
    expect(g4?.rsvpStatus).toBeUndefined();
  });

  it("ignores unknown guest IDs and reports them in the summary", () => {
    const pasted = `
RSVP1|ghost-id-1|Y|1|veg|
RSVP1|ghost-id-2|N|0|none|
`;
    const result = parseRsvpReplies(pasted, sampleGuests);
    expect(result.appliedCount).toBe(0);
    expect(result.ignoredCount).toBe(2);
    expect(result.summaryMessage).toBe(
      "0 replies applied, 2 ignored (unknown guest)"
    );
  });

  it("handles duplicate replies for the same guest by taking the latest", () => {
    const pasted = `
RSVP1|g1|M|1|either|Not sure yet
RSVP1|g1|Y|3|nonveg|Confirmed we are coming!
`;
    const result = parseRsvpReplies(pasted, sampleGuests);
    expect(result.appliedCount).toBe(1);

    const g1 = result.updatedGuests.find((g) => g.id === "g1");
    expect(g1?.rsvpStatus).toBe("yes");
    expect(g1?.partySize).toBe(3);
    expect(g1?.foodChoice).toBe("non-vegetarian");
    expect(g1?.note).toBe("Confirmed we are coming!");
  });

  it("sanitizes script tags and HTML in notes", () => {
    const pasted = "RSVP1|g1|Y|1|veg|<script>alert('xss')</script>Hello";
    const result = parseRsvpReplies(pasted, sampleGuests);
    const g1 = result.updatedGuests.find((g) => g.id === "g1");
    expect(g1?.note).not.toContain("<script>");
    expect(g1?.note).not.toContain("</script>");
    expect(g1?.note).toContain("alert('xss')Hello");
  });

  it("handles empty or whitespace pasted text gracefully", () => {
    const result = parseRsvpReplies("", sampleGuests);
    expect(result.appliedCount).toBe(0);
    expect(result.updatedGuests).toEqual(sampleGuests);
  });

  it("calculates accurate RSVP summary counts", () => {
    const guestsWithRsvp: Guest[] = [
      {
        id: "1",
        name: "A",
        rsvpStatus: "yes",
        partySize: 2,
        foodChoice: "vegetarian",
      },
      {
        id: "2",
        name: "B",
        rsvpStatus: "yes",
        partySize: 3,
        foodChoice: "non-vegetarian",
      },
      {
        id: "3",
        name: "C",
        rsvpStatus: "yes",
        partySize: 1,
        foodChoice: "either",
      },
      { id: "4", name: "D", rsvpStatus: "no", partySize: 0 },
      { id: "5", name: "E", rsvpStatus: "maybe", partySize: 2 },
      { id: "6", name: "F", rsvpStatus: "pending" },
      { id: "7", name: "G" }, // implicitly pending
    ];

    const summary = calculateRsvpSummary(guestsWithRsvp);

    expect(summary.totalGuests).toBe(7);
    expect(summary.confirmedGuestsCount).toBe(3);
    // Seats: 2 + 3 + 1 = 6
    expect(summary.confirmedSeats).toBe(6);
    expect(summary.declinedCount).toBe(1);
    expect(summary.maybeCount).toBe(1);
    expect(summary.pendingCount).toBe(2);
    expect(summary.vegetarianCount).toBe(2);
    expect(summary.nonVegetarianCount).toBe(3);
    expect(summary.eitherCount).toBe(1);
  });
});
