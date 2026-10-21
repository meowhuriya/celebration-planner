import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { axe, toHaveNoViolations } from "./axe-helper";
import GuestInvitePage from "../app/i/page";
import GuestEnvelope from "../components/rsvp/GuestEnvelope";
import { encodeInvitePayload } from "../lib/rsvp/payload";
import type { InvitePayload } from "../lib/rsvp/types";

expect.extend(toHaveNoViolations);

describe("Guest Invite Page & Envelope Flow", () => {
  const samplePayload: InvitePayload = {
    v: 1,
    e: {
      t: "wedding",
      h: "Priya & Rohan",
      d: "2026-11-20",
      v: "Taj West End",
      c: "Bengaluru",
      ph: "919876543210",
      th: "Royal Heritage",
      dc: "Traditional Festive",
      p: ["#800020", "#D4AF37", "#FFFFFF", "#2E5D4B"],
      s: "royal",
    },
    g: {
      id: "guest-aisha-123",
      n: "Aisha Khan",
      grp: "Friends",
    },
  };

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

  afterEach(() => {
    window.location.hash = "";
  });

  it("shows friendly error state when hash is missing", async () => {
    window.location.hash = "";
    render(<GuestInvitePage />);

    await waitFor(() => {
      expect(screen.getByText("Invitation Unavailable")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/No invitation code found in link/i)
    ).toBeInTheDocument();
  });

  it("shows friendly error state when hash is tampered or invalid", async () => {
    window.location.hash = "#invalid-corrupted-hash-payload";
    render(<GuestInvitePage />);

    await waitFor(() => {
      expect(screen.getByText("Invitation Unavailable")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        /This invitation link appears to be invalid, tampered, or expired/i
      )
    ).toBeInTheDocument();
  });

  it("decodes valid hash payload and displays closed envelope with guest name", async () => {
    const encoded = await encodeInvitePayload(samplePayload);
    window.location.hash = `#${encoded}`;

    render(<GuestInvitePage />);

    await waitFor(() => {
      expect(screen.getByText("Dear Aisha Khan")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", {
        name: /Open invitation envelope for Aisha Khan/i,
      })
    ).toBeInTheDocument();
  });

  it("opens envelope on button click and reveals greeting, card, and RSVP form", async () => {
    const encoded = await encodeInvitePayload(samplePayload);
    window.location.hash = `#${encoded}`;

    render(<GuestInvitePage />);

    const openBtn = await screen.findByRole("button", {
      name: /Open invitation envelope for Aisha Khan/i,
    });
    fireEvent.click(openBtn);

    // Header & Greeting
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Dear Aisha Khan,"
    );
    expect(
      screen.getByText(/You are warmly invited by Priya & Rohan/i)
    ).toBeInTheDocument();

    // RSVP form
    expect(
      screen.getByRole("heading", {
        name: /Will you be attending\?/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Yes Attending/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /No Can't make it/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Maybe Tentative/i })
    ).toBeInTheDocument();
  });

  it("skips closed envelope when prefers-reduced-motion is true", () => {
    // Mock matchMedia to simulate prefers-reduced-motion: reduce
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<GuestEnvelope payload={samplePayload} />);

    // Directly shows the revealed greeting and RSVP form
    expect(
      screen.getByRole("heading", { name: /Will you be attending\?/i })
    ).toBeInTheDocument();

    window.matchMedia = originalMatchMedia;
  });

  it("completes RSVP form flow and triggers WhatsApp reply with RSVP1 code", async () => {
    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);

    render(<GuestEnvelope payload={samplePayload} />);

    // Open envelope
    const openBtn = screen.getByRole("button", {
      name: /Open invitation envelope for Aisha Khan/i,
    });
    fireEvent.click(openBtn);

    // Select "Yes"
    const yesRadio = screen.getByRole("radio", { name: /Yes Attending/i });
    fireEvent.click(yesRadio);

    // Select Party Size: 2
    const partySize2 = screen.getByRole("radio", { name: "2" });
    fireEvent.click(partySize2);

    // Select Food Choice: Vegetarian
    const vegRadio = screen.getByRole("radio", { name: /Vegetarian/i });
    fireEvent.click(vegRadio);

    // Add note
    const noteInput = screen.getByLabelText(/Note for/i);
    fireEvent.change(noteInput, {
      target: { value: "So excited for you both!" },
    });

    // Submit RSVP
    const sendBtn = screen.getByRole("button", { name: /Send my reply/i });
    fireEvent.click(sendBtn);

    // Verify window.open was called with wa.me and host phone + RSVP code
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
    expect(openedUrl).toContain("https://wa.me/919876543210?text=");

    const decodedQuery = decodeURIComponent(openedUrl);
    expect(decodedQuery).toContain("RSVP for Wedding celebration");
    expect(decodedQuery).toContain("Guest: Aisha Khan");
    expect(decodedQuery).toContain("Attending: Yes, attending");
    expect(decodedQuery).toContain("Party size: 2 seats");
    expect(decodedQuery).toContain("Food preference: Vegetarian");
    expect(decodedQuery).toContain("Note: So excited for you both!");
    expect(decodedQuery).toContain(
      "RSVP1|guest-aisha-123|Y|2|veg|So excited for you both!"
    );

    // Shows thank you state with calendar and maps buttons
    expect(screen.getByText(/Thank you, Aisha Khan!/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Save to calendar/i }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("link", { name: /Open map/i }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("falls back to clipboard copy when no host WhatsApp phone is configured", async () => {
    // Explicitly define navigator.share as undefined so it falls back to clipboard
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true,
    });

    const payloadNoPhone: InvitePayload = {
      ...samplePayload,
      e: { ...samplePayload.e, ph: undefined },
    };

    render(<GuestEnvelope payload={payloadNoPhone} />);

    // Open envelope
    fireEvent.click(
      screen.getByRole("button", {
        name: /Open invitation envelope for Aisha Khan/i,
      })
    );

    // Select "Yes"
    fireEvent.click(screen.getByRole("radio", { name: /Yes Attending/i }));

    // Send reply
    const sendBtn = screen.getByRole("button", { name: /^Send my reply$/i });
    fireEvent.click(sendBtn);

    // Should copy to clipboard
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
    });
    const clipboardText = writeTextSpy.mock.calls[0][0];
    expect(clipboardText).toContain("RSVP1|guest-aisha-123|Y|1|veg|");

    // Shows thank you state with copied feedback
    expect(screen.getByText(/Thank you, Aisha Khan!/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Reply copied to clipboard/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("passes axe accessibility tests in both closed and open states", async () => {
    const { container } = render(<GuestEnvelope payload={samplePayload} />);

    // 1. Closed Envelope axe check
    const closedResults = await axe(container);
    expect(closedResults).toHaveNoViolations();

    // Open envelope
    fireEvent.click(
      screen.getByRole("button", {
        name: /Open invitation envelope for Aisha Khan/i,
      })
    );

    // Select attendance to render the full form
    fireEvent.click(screen.getByRole("radio", { name: /Yes Attending/i }));

    // 2. Open State axe check
    const openResults = await axe(container);
    expect(openResults).toHaveNoViolations();
  });
});
