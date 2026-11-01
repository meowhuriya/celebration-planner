import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  syncGuestRsvpLocally,
  listenToRsvpSync,
  RSVP_SYNC_STORAGE_KEY,
} from "@/lib/rsvp/sync";
import { SEATING_STORAGE_KEY } from "@/lib/seating/storage";

describe("Real-Time Same-Browser RSVP Sync", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("writes update to dedicated sync key in localStorage", () => {
    syncGuestRsvpLocally({
      guestId: "guest-test-1",
      status: "yes",
      partySize: 2,
      foodChoice: "vegetarian",
      note: "Excited to be there!",
    });

    const raw = localStorage.getItem(RSVP_SYNC_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.guestId).toBe("guest-test-1");
    expect(parsed.status).toBe("yes");
    expect(parsed.partySize).toBe(2);
    expect(parsed.foodChoice).toBe("vegetarian");
    expect(parsed.note).toBe("Excited to be there!");
    expect(typeof parsed.timestamp).toBe("number");
  });

  it("directly updates matching guest in host seating plan localStorage", () => {
    // Seed initial seating plan in localStorage
    const initialPlan = {
      version: 1,
      seatsPerTable: 8,
      guests: [
        { id: "guest-test-1", name: "Aarav Sharma", group: "VIP" },
        { id: "guest-test-2", name: "Priya Patel", group: "Family" },
      ],
      assignments: {},
    };
    localStorage.setItem(SEATING_STORAGE_KEY, JSON.stringify(initialPlan));

    syncGuestRsvpLocally({
      guestId: "guest-test-1",
      status: "yes",
      partySize: 3,
      foodChoice: "non-vegetarian",
    });

    const updatedRaw = localStorage.getItem(SEATING_STORAGE_KEY);
    const updatedPlan = JSON.parse(updatedRaw!);

    const g1 = updatedPlan.guests.find(
      (g: { id: string }) => g.id === "guest-test-1"
    );
    expect(g1.rsvpStatus).toBe("yes");
    expect(g1.partySize).toBe(3);
    expect(g1.foodChoice).toBe("non-vegetarian");

    // Other guest unchanged
    const g2 = updatedPlan.guests.find(
      (g: { id: string }) => g.id === "guest-test-2"
    );
    expect(g2.rsvpStatus).toBeUndefined();
  });

  it("sets partySize to 0 and removes foodChoice when status is 'no'", () => {
    const initialPlan = {
      version: 1,
      seatsPerTable: 8,
      guests: [
        {
          id: "guest-test-1",
          name: "Aarav Sharma",
          rsvpStatus: "yes",
          partySize: 2,
          foodChoice: "vegetarian",
        },
      ],
      assignments: {},
    };
    localStorage.setItem(SEATING_STORAGE_KEY, JSON.stringify(initialPlan));

    syncGuestRsvpLocally({
      guestId: "guest-test-1",
      status: "no",
      partySize: 2,
      foodChoice: "vegetarian",
    });

    const updatedRaw = localStorage.getItem(SEATING_STORAGE_KEY);
    const updatedPlan = JSON.parse(updatedRaw!);
    const g1 = updatedPlan.guests[0];

    expect(g1.rsvpStatus).toBe("no");
    expect(g1.partySize).toBe(0);
    expect(g1.foodChoice).toBeUndefined();
  });

  it("notifies listeners via celebrate_rsvp_update custom event and cleanup stops notifications", () => {
    const callback = vi.fn();
    const unsubscribe = listenToRsvpSync(callback);

    syncGuestRsvpLocally({
      guestId: "guest-live-99",
      status: "maybe",
      partySize: 1,
      foodChoice: "either",
    });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        guestId: "guest-live-99",
        status: "maybe",
        partySize: 1,
        foodChoice: "either",
      })
    );

    // Unsubscribe and verify no further callbacks
    unsubscribe();
    callback.mockClear();

    syncGuestRsvpLocally({
      guestId: "guest-live-99",
      status: "yes",
      partySize: 1,
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
