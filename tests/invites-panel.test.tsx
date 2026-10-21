import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { axe, toHaveNoViolations } from "./axe-helper";
import InvitesPanel from "../components/rsvp/InvitesPanel";
import type { Guest } from "../lib/seating";
import type { EventEssentials } from "../lib/rsvp/types";

expect.extend(toHaveNoViolations);

describe("InvitesPanel (Host Side Management)", () => {
  const sampleEventEssentials: EventEssentials = {
    t: "wedding",
    h: "Priya & Rohan",
    d: "2026-11-20",
    v: "Taj West End",
    c: "Bengaluru",
    ph: "919876543210",
  };

  const sampleGuests: Guest[] = [
    {
      id: "guest-1",
      name: "Aisha Khan",
      group: "Bride Family",
      rsvpStatus: "yes",
      partySize: 2,
      foodChoice: "vegetarian",
    },
    {
      id: "guest-2",
      name: "Rohan Verma",
      group: "Groom Friends",
      rsvpStatus: "no",
      partySize: 1,
    },
    {
      id: "guest-3",
      name: "Fatima Syed",
      group: "Bride Family",
      rsvpStatus: "maybe",
      partySize: 3,
      foodChoice: "non-vegetarian",
    },
    {
      id: "guest-4",
      name: "Kabir Das",
      group: "Colleagues",
      rsvpStatus: "pending",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
      writable: true,
    });
  });

  it("renders guest list with status badges, party size, and food preferences", () => {
    render(
      <InvitesPanel
        guests={sampleGuests}
        eventEssentials={sampleEventEssentials}
        onUpdateGuests={vi.fn()}
        onPrintAllInvites={vi.fn()}
      />
    );

    // Guest names
    expect(screen.getByText("Aisha Khan")).toBeInTheDocument();
    expect(screen.getByText("Rohan Verma")).toBeInTheDocument();
    expect(screen.getByText("Fatima Syed")).toBeInTheDocument();
    expect(screen.getByText("Kabir Das")).toBeInTheDocument();

    // Badges & details
    expect(screen.getAllByText("Yes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getAllByText("No").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Maybe").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);

    // Food choices
    expect(screen.getByText("🥦 Veg")).toBeInTheDocument();
  });

  it("calculates RSVP summary metrics accurately and triggers budget update callback", () => {
    const handleBudgetUpdate = vi.fn();
    const handleAutoSeat = vi.fn();

    render(
      <InvitesPanel
        guests={sampleGuests}
        eventEssentials={sampleEventEssentials}
        onUpdateGuests={vi.fn()}
        onUseConfirmedSeatsForBudget={handleBudgetUpdate}
        onAutoSeatConfirmedOnly={handleAutoSeat}
        onPrintAllInvites={vi.fn()}
      />
    );

    // 1 confirmed guest with partySize 2 = 2 confirmed seats
    expect(
      screen.getByText(/Use confirmed seats for budget \(2\)/i)
    ).toBeInTheDocument();

    // Click "Use confirmed seats for budget"
    fireEvent.click(
      screen.getByRole("button", {
        name: /Use confirmed seats for budget \(2\)/i,
      })
    );
    expect(handleBudgetUpdate).toHaveBeenCalledWith(2);

    // Click "Auto-seat confirmed guests only"
    fireEvent.click(
      screen.getByRole("button", {
        name: /Auto-seat confirmed guests only/i,
      })
    );
    expect(handleAutoSeat).toHaveBeenCalledTimes(1);
  });

  it("supports copying personal invite link to clipboard", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true,
    });

    render(
      <InvitesPanel
        guests={sampleGuests}
        eventEssentials={sampleEventEssentials}
        onUpdateGuests={vi.fn()}
        onPrintAllInvites={vi.fn()}
      />
    );

    const copyBtn = screen.getByRole("button", {
      name: /Copy invitation link for Aisha Khan/i,
    });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
    });

    const copiedUrl = writeTextSpy.mock.calls[0][0];
    expect(copiedUrl).toContain("/i#");
  });

  it("opens WhatsApp with pre-composed invite message and personal link", async () => {
    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);

    render(
      <InvitesPanel
        guests={sampleGuests}
        eventEssentials={sampleEventEssentials}
        onUpdateGuests={vi.fn()}
        onPrintAllInvites={vi.fn()}
      />
    );

    const waBtn = screen.getByRole("button", {
      name: /Send invitation to Aisha Khan on WhatsApp/i,
    });
    fireEvent.click(waBtn);

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    });

    const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
    expect(openedUrl).toContain("https://wa.me/?text=");
    const decoded = decodeURIComponent(openedUrl);
    expect(decoded).toContain("Hi Aisha Khan!");
    expect(decoded).toContain("Priya & Rohan");
    expect(decoded).toContain("/i#");
  });

  it("opens QR modal dialog for guest with Download PNG option", async () => {
    render(
      <InvitesPanel
        guests={sampleGuests}
        eventEssentials={sampleEventEssentials}
        onUpdateGuests={vi.fn()}
        onPrintAllInvites={vi.fn()}
      />
    );

    const qrBtn = screen.getByRole("button", {
      name: /Show QR code for Aisha Khan/i,
    });
    fireEvent.click(qrBtn);

    // Modal dialog opens
    const dialog = await screen.findByRole("dialog", {
      name: "Aisha Khan",
    });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Download PNG/i })
    ).toBeInTheDocument();

    // Close dialog
    const closeBtn = screen.getByRole("button", {
      name: /Close QR code modal/i,
    });
    fireEvent.click(closeBtn);
    expect(
      screen.queryByRole("dialog", {
        name: "Aisha Khan",
      })
    ).not.toBeInTheDocument();
  });

  it("handles Paste Replies box: updates valid guests and ignores unknown IDs", async () => {
    const onUpdateGuestsSpy = vi.fn();

    render(
      <InvitesPanel
        guests={sampleGuests}
        eventEssentials={sampleEventEssentials}
        onUpdateGuests={onUpdateGuestsSpy}
        onPrintAllInvites={vi.fn()}
      />
    );

    const textarea = screen.getByLabelText(/Paste WhatsApp Replies/i);
    const applyBtn = screen.getByRole("button", { name: /Apply replies/i });

    // Paste two reply lines: one known (guest-4) and one unknown (guest-unknown-999)
    const pasteContent = `
Thanks for inviting me!
RSVP1|guest-4|yes|2|vegetarian|See you there!

Another person:
RSVP1|guest-unknown-999|yes|1|either|Who am I?
`;

    fireEvent.change(textarea, { target: { value: pasteContent } });
    fireEvent.click(applyBtn);

    expect(onUpdateGuestsSpy).toHaveBeenCalledTimes(1);
    const updatedList = onUpdateGuestsSpy.mock.calls[0][0] as Guest[];

    // guest-4 is updated to 'yes', partySize 2, foodChoice vegetarian, note 'See you there!'
    const guest4 = updatedList.find((g) => g.id === "guest-4");
    expect(guest4?.rsvpStatus).toBe("yes");
    expect(guest4?.partySize).toBe(2);
    expect(guest4?.foodChoice).toBe("vegetarian");
    expect(guest4?.note).toBe("See you there!");

    // Status notice shows 1 reply applied, 1 ignored
    expect(
      screen.getByText(/1 reply applied, 1 ignored \(unknown guest\)/i)
    ).toBeInTheDocument();
  });

  it("validates host WhatsApp phone number and reports invalid input", async () => {
    const onUpdatePhoneSpy = vi.fn();
    const user = userEvent.setup();

    render(
      <InvitesPanel
        guests={sampleGuests}
        eventEssentials={sampleEventEssentials}
        onUpdateGuests={vi.fn()}
        onPrintAllInvites={vi.fn()}
        onUpdateHostPhone={onUpdatePhoneSpy}
      />
    );

    const phoneInput = screen.getByLabelText(/Host WhatsApp Number/i);

    // Enter short invalid number
    await user.clear(phoneInput);
    await user.type(phoneInput, "1234");
    expect(
      screen.getByText(/Phone number must be between 8 and 15 digits/i)
    ).toBeInTheDocument();

    // Enter valid phone number
    await user.clear(phoneInput);
    await user.type(phoneInput, "+91 98765 43210");
    expect(onUpdatePhoneSpy).toHaveBeenCalledWith("919876543210");
  });

  it("triggers print all invites callback when print button is clicked", () => {
    const onPrintSpy = vi.fn();

    render(
      <InvitesPanel
        guests={sampleGuests}
        eventEssentials={sampleEventEssentials}
        onUpdateGuests={vi.fn()}
        onPrintAllInvites={onPrintSpy}
      />
    );

    const printBtn = screen.getByRole("button", {
      name: /Print all invites \(4\/page\)/i,
    });
    fireEvent.click(printBtn);

    expect(onPrintSpy).toHaveBeenCalledTimes(1);
  });

  it("passes axe accessibility tests with zero violations", async () => {
    const { container } = render(
      <InvitesPanel
        guests={sampleGuests}
        eventEssentials={sampleEventEssentials}
        onUpdateGuests={vi.fn()}
        onPrintAllInvites={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
