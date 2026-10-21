import type { Guest } from "@/lib/seating";
import type { FoodChoice, RsvpStatus, RsvpSummary } from "./types";
import { replyCodeLineSchema } from "./schema";

/**
 * Generates the standardized single-line reply code:
 * RSVP1|guestId|status|partySize|foodChoice|note
 */
export function formatRsvpReplyCode(
  guestId: string,
  status: RsvpStatus,
  partySize: number,
  foodChoice?: FoodChoice,
  note?: string
): string {
  const s = status === "yes" ? "Y" : status === "no" ? "N" : "M";
  const size = status === "no" ? 0 : Math.min(5, Math.max(1, partySize));
  const food =
    status === "no"
      ? "none"
      : foodChoice === "vegetarian"
        ? "veg"
        : foodChoice === "non-vegetarian"
          ? "nonveg"
          : "either";
  const cleanNote = (note || "")
    .replace(/[|\r\n<>]/g, " ")
    .trim()
    .slice(0, 140);

  return `RSVP1|${guestId}|${s}|${size}|${food}|${cleanNote}`;
}

/**
 * Formats a friendly human message accompanying the reply code for WhatsApp / Web Share.
 */
export function formatRsvpHumanMessage(
  hostName: string,
  guestName: string,
  eventTitle: string,
  status: RsvpStatus,
  partySize: number,
  foodChoice?: FoodChoice,
  note?: string,
  guestId?: string
): string {
  const statusLabel =
    status === "yes"
      ? "Yes, attending"
      : status === "no"
        ? "Regretfully decline"
        : "Maybe / Tentative";

  const lines: string[] = [
    `Hi ${hostName ? hostName : "there"}!`,
    `Here is my RSVP for ${eventTitle}:`,
    `• Guest: ${guestName}`,
    `• Attending: ${statusLabel}`,
  ];

  if (status !== "no") {
    lines.push(
      `• Party size: ${partySize} ${partySize === 1 ? "seat" : "seats"}`
    );
    if (foodChoice) {
      lines.push(
        `• Food preference: ${
          foodChoice === "vegetarian"
            ? "Vegetarian"
            : foodChoice === "non-vegetarian"
              ? "Non-vegetarian"
              : "Either / No preference"
        }`
      );
    }
  }

  if (note && note.trim()) {
    lines.push(`• Note: ${note.trim().slice(0, 140)}`);
  }

  lines.push("");
  lines.push(
    formatRsvpReplyCode(guestId || "", status, partySize, foodChoice, note)
  );

  return lines.join("\n");
}

/**
 * Pure parser for pasted WhatsApp replies.
 * Searches for all lines matching RSVP1|guestId|status|partySize|foodChoice|note.
 * Rejects malformed lines, maps against existing guests, ignores unknown IDs,
 * and updates matched guests.
 */
export function parseRsvpReplies(
  pastedText: string,
  existingGuests: Guest[]
): {
  updatedGuests: Guest[];
  appliedCount: number;
  ignoredCount: number;
  errors: string[];
  summaryMessage: string;
} {
  if (!pastedText || !pastedText.trim()) {
    return {
      updatedGuests: existingGuests,
      appliedCount: 0,
      ignoredCount: 0,
      errors: ["No text provided to parse"],
      summaryMessage: "No replies found to apply",
    };
  }

  const existingGuestMap = new Map<string, Guest>();
  for (const g of existingGuests) {
    existingGuestMap.set(g.id, { ...g });
  }

  const lines = pastedText.split(/\r?\n/);
  const repliesToApply = new Map<
    string,
    {
      status: RsvpStatus;
      partySize: number;
      foodChoice?: FoodChoice;
      note?: string;
    }
  >();

  let ignoredCount = 0;
  const errors: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed.startsWith("RSVP1|")) continue;

    const parts = trimmed.split("|");
    if (parts.length < 5) {
      errors.push(`Malformed reply line: ${trimmed}`);
      continue;
    }

    const prefix = parts[0];
    const guestId = parts[1]?.trim();
    const rawStatus = parts[2]?.trim().toUpperCase();
    const rawPartySize = parseInt(parts[3]?.trim() || "1", 10);
    const rawFood = parts[4]?.trim().toLowerCase();
    const rawNote = parts.slice(5).join("|").trim();

    // Normalize status (accept Y/N/M or YES/NO/MAYBE)
    let normalizedStatus = rawStatus;
    if (rawStatus === "YES") normalizedStatus = "Y";
    else if (rawStatus === "NO") normalizedStatus = "N";
    else if (rawStatus === "MAYBE") normalizedStatus = "M";

    // Normalize food choice (accept veg/nonveg/either/none or full words)
    let normalizedFood = rawFood;
    if (rawFood === "vegetarian") normalizedFood = "veg";
    else if (rawFood === "non-vegetarian" || rawFood === "nonvegetarian")
      normalizedFood = "nonveg";

    // Validate using Zod schema
    const validation = replyCodeLineSchema.safeParse({
      prefix,
      guestId,
      status: normalizedStatus,
      partySize: isNaN(rawPartySize) ? 1 : rawPartySize,
      foodChoice: normalizedFood,
      note: rawNote,
    });

    if (!validation.success) {
      errors.push(`Invalid reply line: ${trimmed}`);
      continue;
    }

    const {
      status: vStatus,
      partySize: vSize,
      foodChoice: vFood,
      note: vNote,
    } = validation.data;

    const mappedStatus: RsvpStatus =
      vStatus === "Y" ? "yes" : vStatus === "N" ? "no" : "maybe";

    const mappedFood: FoodChoice | undefined =
      vFood === "veg"
        ? "vegetarian"
        : vFood === "nonveg"
          ? "non-vegetarian"
          : vFood === "either"
            ? "either"
            : undefined;

    // Check against local guest list
    if (!existingGuestMap.has(guestId)) {
      ignoredCount++;
      continue;
    }

    // Sanitize note (strip tags and angle brackets)
    const cleanNote = (vNote || "")
      .replace(/<[^>]*>/g, "")
      .replace(/[<>]/g, "")
      .slice(0, 140);

    // Store reply (later replies for the same guest overwrite earlier in the paste)
    repliesToApply.set(guestId, {
      status: mappedStatus,
      partySize: mappedStatus === "no" ? 0 : vSize,
      foodChoice: mappedStatus === "no" ? undefined : mappedFood,
      note: cleanNote || undefined,
    });
  }

  // Apply parsed replies
  const updatedGuests = existingGuests.map((guest) => {
    const reply = repliesToApply.get(guest.id);
    if (!reply) return guest;

    return {
      ...guest,
      rsvpStatus: reply.status,
      partySize: reply.partySize,
      foodChoice: reply.foodChoice,
      note: reply.note,
    };
  });

  const appliedCount = repliesToApply.size;

  // Build human summary message
  let summaryMessage = "";
  if (appliedCount === 0 && ignoredCount === 0) {
    summaryMessage = "No valid reply lines found (e.g. RSVP1|...)";
  } else {
    const appliedPart = `${appliedCount} ${
      appliedCount === 1 ? "reply applied" : "replies applied"
    }`;
    const ignoredPart =
      ignoredCount > 0 ? `, ${ignoredCount} ignored (unknown guest)` : "";
    summaryMessage = `${appliedPart}${ignoredPart}`;
  }

  return {
    updatedGuests,
    appliedCount,
    ignoredCount,
    errors,
    summaryMessage,
  };
}

/**
 * Calculates live RSVP summary counts from the current guest list.
 */
export function calculateRsvpSummary(guests: Guest[]): RsvpSummary {
  let confirmedSeats = 0;
  let confirmedGuestsCount = 0;
  let declinedCount = 0;
  let maybeCount = 0;
  let pendingCount = 0;
  let vegetarianCount = 0;
  let nonVegetarianCount = 0;
  let eitherCount = 0;

  for (const g of guests) {
    const status = g.rsvpStatus || "pending";
    const size =
      typeof g.partySize === "number" && g.partySize >= 1 ? g.partySize : 1;

    if (status === "yes") {
      confirmedGuestsCount++;
      confirmedSeats += size;

      if (g.foodChoice === "vegetarian") {
        vegetarianCount += size;
      } else if (g.foodChoice === "non-vegetarian") {
        nonVegetarianCount += size;
      } else {
        eitherCount += size;
      }
    } else if (status === "no") {
      declinedCount++;
    } else if (status === "maybe") {
      maybeCount++;
    } else {
      pendingCount++;
    }
  }

  return {
    confirmedSeats,
    confirmedGuestsCount,
    declinedCount,
    maybeCount,
    pendingCount,
    vegetarianCount,
    nonVegetarianCount,
    eitherCount,
    totalGuests: guests.length,
  };
}
