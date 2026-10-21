import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  assign,
  unassign,
  swap,
  autoSeat,
  sanitizeName,
  parseGuestNames,
  getInitials,
  seatPositions,
  loadSeatingPlan,
  saveSeatingPlan,
  createDefaultSeatingState,
  SEATING_STORAGE_KEY,
  MAX_GUESTS,
  type Guest,
  type SeatingState,
} from "../lib/seating";

describe("Stage 1: Seating Plan Pure Logic", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("sanitizeName & parseGuestNames", () => {
    it("trims and collapses whitespace", () => {
      expect(sanitizeName("   Aisha    Khan   ")).toBe("Aisha Khan");
      expect(sanitizeName("\tRahul   Sharma\n")).toBe("Rahul Sharma");
    });

    it("strips ASCII control characters", () => {
      const withControls = "Priya\x00\x08\x1F\x7FVerma";
      expect(sanitizeName(withControls)).toBe("PriyaVerma");
    });

    it("caps string length to 40 characters", () => {
      const longName = "A".repeat(60);
      const sanitized = sanitizeName(longName);
      expect(sanitized.length).toBe(40);
      expect(sanitized).toBe("A".repeat(40));
    });

    it("handles non-string or empty inputs", () => {
      expect(sanitizeName("")).toBe("");
      expect(sanitizeName(null as unknown as string)).toBe("");
      expect(sanitizeName(undefined as unknown as string)).toBe("");
    });

    it("extracts 1 or 2 letter initials correctly", () => {
      expect(getInitials("Aisha Khan")).toBe("AK");
      expect(getInitials("Rahul")).toBe("RA");
      expect(getInitials("Mohammad Ali Jinnah")).toBe("MJ");
      expect(getInitials("")).toBe("?");
    });

    it("parses multiline and comma separated names", () => {
      const input =
        "Aisha Khan, Rahul Sharma\nPriya Verma,Vikram Mehta\n\nSunil";
      const parsed = parseGuestNames(input, "VIP Family");

      expect(parsed).toHaveLength(5);
      expect(parsed[0]).toEqual({ name: "Aisha Khan", group: "VIP Family" });
      expect(parsed[1]).toEqual({ name: "Rahul Sharma", group: "VIP Family" });
      expect(parsed[2]).toEqual({ name: "Priya Verma", group: "VIP Family" });
      expect(parsed[3]).toEqual({ name: "Vikram Mehta", group: "VIP Family" });
      expect(parsed[4]).toEqual({ name: "Sunil", group: "VIP Family" });
    });

    it("caps parsed guests at MAX_GUESTS (600)", () => {
      const longList = Array.from(
        { length: 700 },
        (_, i) => `Guest ${i + 1}`
      ).join("\n");
      const parsed = parseGuestNames(longList);
      expect(parsed.length).toBe(MAX_GUESTS);
    });
  });

  describe("seatPositions", () => {
    it("returns correct count and circular coordinates around table", () => {
      const table = { tableNumber: 1, x: 100, y: 100, radius: 20 };
      const positions = seatPositions(table, 8);

      expect(positions).toHaveLength(8);
      expect(positions[0].seatKey).toBe("1-0");
      expect(positions[7].seatKey).toBe("1-7");

      // Verify each point is at distance (radius + 9) = 29 from (100, 100)
      for (const pos of positions) {
        const dx = pos.x - 100;
        const dy = pos.y - 100;
        const dist = Math.hypot(dx, dy);
        expect(dist).toBeCloseTo(29, 0);
      }
    });

    it("handles 0 seats gracefully", () => {
      const positions = seatPositions({ tableNumber: 2, x: 50, y: 50 }, 0);
      expect(positions).toHaveLength(0);
    });
  });

  describe("assign, unassign, and swap operations (immutability)", () => {
    const sampleGuests: Guest[] = [
      { id: "g1", name: "Aisha Khan", group: "Family" },
      { id: "g2", name: "Rahul Sharma", group: "Friends" },
      { id: "g3", name: "Priya Verma", group: "Work" },
    ];

    const baseState: SeatingState = {
      seatsPerTable: 8,
      guests: sampleGuests,
      assignments: {
        "1-0": "g1",
      },
    };

    it("assigns guest to seat without mutating original state", () => {
      const next = assign(baseState, "1-1", "g2");

      expect(next).not.toBe(baseState);
      expect(baseState.assignments["1-1"]).toBeUndefined();
      expect(next.assignments["1-1"]).toBe("g2");
      expect(next.assignments["1-0"]).toBe("g1");
    });

    it("moves guest if they were already seated elsewhere (one seat per guest)", () => {
      // g1 is at "1-0". Assign g1 to "2-0"
      const next = assign(baseState, "2-0", "g1");

      expect(next.assignments["2-0"]).toBe("g1");
      expect(next.assignments["1-0"]).toBeUndefined();
    });

    it("replaces previous occupant if seat is already taken (one guest per seat)", () => {
      // "1-0" has g1. Assign g2 to "1-0"
      const next = assign(baseState, "1-0", "g2");

      expect(next.assignments["1-0"]).toBe("g2");
      // g1 is now unseated
      expect(Object.values(next.assignments)).not.toContain("g1");
    });

    it("ignores assign for non-existent guest id", () => {
      const next = assign(baseState, "1-2", "unknown_guest");
      expect(next).toBe(baseState);
    });

    it("unassigns a seated guest immutably", () => {
      const next = unassign(baseState, "1-0");

      expect(next).not.toBe(baseState);
      expect(next.assignments["1-0"]).toBeUndefined();
      expect(baseState.assignments["1-0"]).toBe("g1");
    });

    it("unassigning an already empty seat is a safe no-op", () => {
      const next = unassign(baseState, "5-5");
      expect(next).toBe(baseState);
    });

    it("swaps two occupied seats", () => {
      const stateWithTwo: SeatingState = {
        ...baseState,
        assignments: {
          "1-0": "g1",
          "1-1": "g2",
        },
      };

      const next = swap(stateWithTwo, "1-0", "1-1");

      expect(next.assignments["1-0"]).toBe("g2");
      expect(next.assignments["1-1"]).toBe("g1");
    });

    it("moves guest to empty seat when swapping occupied with empty", () => {
      const next = swap(baseState, "1-0", "1-5");

      expect(next.assignments["1-0"]).toBeUndefined();
      expect(next.assignments["1-5"]).toBe("g1");
    });

    it("swapping two empty seats does nothing", () => {
      const next = swap(baseState, "2-0", "2-1");
      expect(next).toBe(baseState);
    });
  });

  describe("autoSeat algorithm", () => {
    it("handles 0 guests cleanly", () => {
      const result = autoSeat([], 5, 8);
      expect(result.seatedCount).toBe(0);
      expect(result.unseatedGuests).toHaveLength(0);
      expect(Object.keys(result.assignments)).toHaveLength(0);
      expect(result.totalCapacity).toBe(40);
    });

    it("handles 0 tables or 0 seatsPerTable", () => {
      const guests: Guest[] = [{ id: "g1", name: "Aisha" }];
      const res0Tables = autoSeat(guests, 0, 8);
      expect(res0Tables.seatedCount).toBe(0);
      expect(res0Tables.unseatedGuests).toHaveLength(1);

      const res0Seats = autoSeat(guests, 4, 0);
      expect(res0Seats.seatedCount).toBe(0);
      expect(res0Seats.unseatedGuests).toHaveLength(1);
    });

    it("keeps members of the same group together at the same table", () => {
      const guests: Guest[] = [
        { id: "g1", name: "Family 1", group: "Patel Family" },
        { id: "g2", name: "Family 2", group: "Patel Family" },
        { id: "g3", name: "Family 3", group: "Patel Family" },
        { id: "g4", name: "Family 4", group: "Patel Family" },
        { id: "g5", name: "Friend 1", group: "College Friends" },
        { id: "g6", name: "Friend 2", group: "College Friends" },
      ];

      // 2 tables, 4 seats per table
      const res = autoSeat(guests, 2, 4);

      expect(res.seatedCount).toBe(6);
      expect(res.unseatedGuests).toHaveLength(0);

      // Patel Family (4 members) fits exactly at Table 1
      expect(res.assignments["1-0"]).toBe("g1");
      expect(res.assignments["1-1"]).toBe("g2");
      expect(res.assignments["1-2"]).toBe("g3");
      expect(res.assignments["1-3"]).toBe("g4");

      // College Friends (2 members) sits at Table 2
      expect(res.assignments["2-0"]).toBe("g5");
      expect(res.assignments["2-1"]).toBe("g6");
    });

    it("spans large group across neighbouring tables without exceeding capacity", () => {
      // 10 members in a wedding party, 8 seats per table, 2 tables
      const largeGroup: Guest[] = Array.from({ length: 10 }, (_, i) => ({
        id: `wp_${i + 1}`,
        name: `Party Member ${i + 1}`,
        group: "Wedding Party",
      }));

      const res = autoSeat(largeGroup, 2, 8);

      expect(res.seatedCount).toBe(10);
      expect(res.unseatedGuests).toHaveLength(0);

      // 8 members at Table 1
      for (let s = 0; s < 8; s++) {
        expect(res.assignments[`1-${s}`]).toBe(`wp_${s + 1}`);
      }
      // Remaining 2 members at Table 2 (neighbouring table)
      expect(res.assignments["2-0"]).toBe("wp_9");
      expect(res.assignments["2-1"]).toBe("wp_10");
    });

    it("respects capacity when guests exceed seats (returns unseated rest)", () => {
      // 15 guests, 2 tables of 6 seats = 12 capacity
      const guests: Guest[] = Array.from({ length: 15 }, (_, i) => ({
        id: `g_${i + 1}`,
        name: `Guest ${i + 1}`,
      }));

      const res = autoSeat(guests, 2, 6);

      expect(res.totalCapacity).toBe(12);
      expect(res.seatedCount).toBe(12);
      expect(res.unseatedGuests).toHaveLength(3);
      expect(res.unseatedGuests.map((g) => g.id)).toEqual([
        "g_13",
        "g_14",
        "g_15",
      ]);
    });

    it("handles large guest count (600 guests) deterministically and quickly", () => {
      const manyGuests: Guest[] = Array.from({ length: 600 }, (_, i) => ({
        id: `id_${i}`,
        name: `Guest ${i}`,
        group: i % 10 === 0 ? `Group_${i % 5}` : undefined,
      }));

      const start = Date.now();
      const res1 = autoSeat(manyGuests, 40, 10);
      const res2 = autoSeat(manyGuests, 40, 10);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Super fast pure algorithm
      expect(res1.totalCapacity).toBe(400);
      expect(res1.seatedCount).toBe(400);
      expect(res1.unseatedGuests).toHaveLength(200);

      // Determinism test: identical mapping
      expect(res1.assignments).toEqual(res2.assignments);
    });
  });

  describe("storage & resilience", () => {
    it("persists and reloads seating plan", () => {
      const state: SeatingState = {
        seatsPerTable: 10,
        guests: [{ id: "g1", name: "Aisha Khan", group: "VIP" }],
        assignments: { "1-0": "g1" },
      };

      saveSeatingPlan(state);
      const loaded = loadSeatingPlan(8);

      expect(loaded.seatsPerTable).toBe(10);
      expect(loaded.guests).toEqual(state.guests);
      expect(loaded.assignments).toEqual(state.assignments);
    });

    it("falls back to default without crashing when localStorage contains invalid JSON", () => {
      localStorage.setItem(SEATING_STORAGE_KEY, "{ invalid json corrupt");
      const loaded = loadSeatingPlan(8);

      expect(loaded).toEqual(createDefaultSeatingState(8));
    });

    it("falls back to default when localStorage violates Zod schema", () => {
      localStorage.setItem(
        SEATING_STORAGE_KEY,
        JSON.stringify({
          seatsPerTable: 999, // Invalid seatsPerTable
          guests: [{ id: 123 }], // Invalid guest schema
        })
      );
      const loaded = loadSeatingPlan(6);

      expect(loaded).toEqual(createDefaultSeatingState(6));
    });
  });
});
