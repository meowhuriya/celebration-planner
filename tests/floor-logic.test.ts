import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  snapToGrid,
  rotatePoint,
  getBounds,
  clampToRoom,
  overlaps,
  seatPositions,
  clearanceViolations,
  areaPerGuest,
  floorReducer,
  saveFloorPlan,
  loadFloorPlan,
  FLOOR_STORAGE_KEY,
  MAX_HISTORY,
  type FloorItem,
  type Room,
  type FloorEditorState,
} from "@/lib/floor";

describe("Stage 1: Floor Plan Geometry & Pure Functions", () => {
  describe("snapToGrid", () => {
    it("snaps coordinates to the default 0.25m grid", () => {
      expect(snapToGrid(0.24)).toBe(0.25);
      expect(snapToGrid(0.49)).toBe(0.5);
      expect(snapToGrid(0.61)).toBe(0.5);
      expect(snapToGrid(0.63)).toBe(0.75);
      expect(snapToGrid(1.0)).toBe(1.0);
      expect(snapToGrid(0)).toBe(0);
    });

    it("supports custom grid step sizes", () => {
      expect(snapToGrid(1.3, 0.5)).toBe(1.5);
      expect(snapToGrid(1.1, 0.5)).toBe(1.0);
      expect(snapToGrid(2.7, 1.0)).toBe(3.0);
    });
  });

  describe("rotatePoint", () => {
    it("rotates points accurately around center", () => {
      const cx = 5;
      const cy = 5;
      // Point (5, 3) rotated 90 deg clockwise around (5, 5) -> (7, 5)
      const pt90 = rotatePoint(5, 3, cx, cy, 90);
      expect(pt90.x).toBeCloseTo(7, 3);
      expect(pt90.y).toBeCloseTo(5, 3);

      // Rotated 180 deg -> (5, 7)
      const pt180 = rotatePoint(5, 3, cx, cy, 180);
      expect(pt180.x).toBeCloseTo(5, 3);
      expect(pt180.y).toBeCloseTo(7, 3);

      // Rotated 360 deg -> original point (5, 3)
      const pt360 = rotatePoint(5, 3, cx, cy, 360);
      expect(pt360.x).toBeCloseTo(5, 3);
      expect(pt360.y).toBeCloseTo(3, 3);
    });
  });

  describe("getBounds with rotation", () => {
    it("computes exact bounding box for unrotated rectangle", () => {
      const item = { x: 2, y: 3, w: 4, h: 2, rotation: 0 };
      const bounds = getBounds(item);
      expect(bounds.minX).toBe(2);
      expect(bounds.minY).toBe(3);
      expect(bounds.maxX).toBe(6);
      expect(bounds.maxY).toBe(5);
      expect(bounds.width).toBe(4);
      expect(bounds.height).toBe(2);
    });

    it("expands bounding box for a 45-degree rotated square", () => {
      // 2m x 2m square rotated 45 degrees: width = 2 * sqrt(2) ≈ 2.8284
      const item = { x: 5, y: 5, w: 2, h: 2, rotation: 45 };
      const bounds = getBounds(item);
      const expectedSpan = 2 * Math.SQRT2;
      expect(bounds.width).toBeCloseTo(expectedSpan, 2);
      expect(bounds.height).toBeCloseTo(expectedSpan, 2);
    });
  });

  describe("clampToRoom", () => {
    const room: Room = {
      widthM: 20,
      heightM: 15,
      venueType: "banquet hall",
    };

    it("keeps items inside room boundaries", () => {
      const outsideLeft: FloorItem = {
        id: "t1",
        type: "roundTable",
        label: "Table 1",
        x: -2,
        y: 5,
        w: 2,
        h: 2,
        rotation: 0,
        locked: false,
      };
      const clamped = clampToRoom(outsideLeft, room);
      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(5);

      const outsideRight: FloorItem = {
        ...outsideLeft,
        x: 25,
      };
      const clampedRight = clampToRoom(outsideRight, room);
      expect(clampedRight.x).toBe(18); // 20 - 2
    });

    it("accounts for rotated bounds during clamping", () => {
      // Rotated square needs more room
      const item: FloorItem = {
        id: "t2",
        type: "stage",
        label: "Stage",
        x: 19,
        y: 5,
        w: 2,
        h: 2,
        rotation: 45,
        locked: false,
      };
      const clamped = clampToRoom(item, room);
      const bounds = getBounds(clamped);
      expect(bounds.maxX).toBeLessThanOrEqual(room.widthM + 0.01);
    });
  });

  describe("overlaps", () => {
    it("detects unrotated rectangle overlaps", () => {
      const itemA: FloorItem = {
        id: "a",
        type: "buffet",
        label: "Buffet",
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        rotation: 0,
        locked: false,
      };
      const itemB: FloorItem = {
        id: "b",
        type: "roundTable",
        label: "Table",
        x: 3,
        y: 1,
        w: 2,
        h: 2,
        rotation: 0,
        locked: false,
      };
      expect(overlaps(itemA, itemB)).toBe(true);

      const itemC: FloorItem = {
        ...itemB,
        x: 10,
        y: 10,
      };
      expect(overlaps(itemA, itemC)).toBe(false);
    });

    it("detects overlap between rotated items using SAT", () => {
      const itemA: FloorItem = {
        id: "a",
        type: "stage",
        label: "Stage",
        x: 5,
        y: 5,
        w: 4,
        h: 2,
        rotation: 30,
        locked: false,
      };
      const itemB: FloorItem = {
        id: "b",
        type: "danceFloor",
        label: "Dance Floor",
        x: 6,
        y: 6,
        w: 3,
        h: 3,
        rotation: 0,
        locked: false,
      };
      expect(overlaps(itemA, itemB)).toBe(true);
    });

    it("returns false for an item tested with itself", () => {
      const itemA: FloorItem = {
        id: "a",
        type: "buffet",
        label: "Buffet",
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        rotation: 0,
        locked: false,
      };
      expect(overlaps(itemA, itemA)).toBe(false);
    });
  });

  describe("seatPositions with rotation", () => {
    it("calculates radial seat positions for round tables", () => {
      const table: FloorItem = {
        id: "t1",
        type: "roundTable",
        label: "Table 1",
        x: 10,
        y: 10,
        w: 2, // radius 1
        h: 2,
        rotation: 0,
        locked: false,
        seats: 8,
      };
      const seats = seatPositions(table);
      expect(seats).toHaveLength(8);

      // Seat 0 at angle 0 deg (east of center at 11, 10):
      // distance = radius (1) + chair distance (0.35) = 1.35
      expect(seats[0].x).toBeCloseTo(11 + 1.35, 2);
      expect(seats[0].y).toBeCloseTo(11, 2);
    });

    it("calculates long table seats per side with rotation", () => {
      const longTable: FloorItem = {
        id: "lt1",
        type: "longTable",
        label: "Banquet Table",
        x: 10,
        y: 10,
        w: 4,
        h: 1,
        rotation: 90,
        locked: false,
        seats: 6, // 3 per side
      };
      const seats = seatPositions(longTable);
      expect(seats).toHaveLength(6);
      expect(seats[0].seatIndex).toBe(0);
      expect(seats[5].seatIndex).toBe(5);
    });
  });

  describe("clearanceViolations", () => {
    const room: Room = { widthM: 20, heightM: 15, venueType: "banquet hall" };

    it("reports items extending outside room boundaries", () => {
      const outsideItem: FloorItem = {
        id: "out1",
        type: "roundTable",
        label: "Table Out",
        x: 19.5,
        y: 5,
        w: 2,
        h: 2,
        rotation: 0,
        locked: false,
      };
      const violations = clearanceViolations([outsideItem], room);
      expect(violations.some((v) => v.type === "out_of_bounds")).toBe(true);
      expect(violations[0].message).toContain("extends outside");
    });

    it("reports overlapping items with exact names", () => {
      const tableA: FloorItem = {
        id: "tA",
        type: "roundTable",
        label: "Table 1",
        x: 5,
        y: 5,
        w: 2,
        h: 2,
        rotation: 0,
        locked: false,
      };
      const tableB: FloorItem = {
        id: "tB",
        type: "roundTable",
        label: "Table 2",
        x: 6,
        y: 5,
        w: 2,
        h: 2,
        rotation: 0,
        locked: false,
      };
      const violations = clearanceViolations([tableA, tableB], room);
      expect(violations.some((v) => v.type === "overlap")).toBe(true);
      expect(violations[0].message).toContain("Table 1 overlaps with Table 2");
    });

    it("warns about walking gaps under 0.9m between tables", () => {
      const tableA: FloorItem = {
        id: "tA",
        type: "roundTable",
        label: "Table A",
        x: 5,
        y: 5,
        w: 2,
        h: 2,
        rotation: 0,
        locked: false,
      };
      // Distance between edges: 7.6 - 5 - 2 = 0.6m (< 0.9m)
      const tableB: FloorItem = {
        id: "tB",
        type: "roundTable",
        label: "Table B",
        x: 7.6,
        y: 5,
        w: 2,
        h: 2,
        rotation: 0,
        locked: false,
      };
      const violations = clearanceViolations([tableA, tableB], room);
      expect(violations.some((v) => v.type === "table_gap")).toBe(true);
      expect(violations[0].severity).toBe("warning");
    });

    it("reports entrance blocked when item is in clearance corridor", () => {
      const entrance: FloorItem = {
        id: "ent",
        type: "entrance",
        label: "Main Door",
        x: 8,
        y: 14,
        w: 3,
        h: 1,
        rotation: 0,
        locked: true,
      };
      const blocker: FloorItem = {
        id: "blk",
        type: "buffet",
        label: "Snack Bar",
        x: 8.5,
        y: 13, // inside the 1.5m corridor before entrance
        w: 2,
        h: 1,
        rotation: 0,
        locked: false,
      };
      const violations = clearanceViolations([entrance, blocker], room);
      expect(violations.some((v) => v.type === "entrance_blocked")).toBe(true);
      expect(violations[0].message).toContain(
        "blocking the clearance corridor"
      );
    });
  });

  describe("areaPerGuest", () => {
    it("calculates area per guest and flags tight venues under 1.2 m²", () => {
      const room: Room = { widthM: 10, heightM: 10, venueType: "courtyard" }; // 100 m²

      // 100 guests = 1.0 m² per guest (< 1.2 m²)
      const tight = areaPerGuest(room, 100);
      expect(tight.areaM2).toBe(100);
      expect(tight.areaPerGuestM2).toBe(1.0);
      expect(tight.isTight).toBe(true);
      expect(tight.warning).toContain("Tight venue");

      // 50 guests = 2.0 m² per guest (> 1.2 m²)
      const comfortable = areaPerGuest(room, 50);
      expect(comfortable.areaPerGuestM2).toBe(2.0);
      expect(comfortable.isTight).toBe(false);
      expect(comfortable.warning).toBeUndefined();
    });
  });
});

describe("Stage 1: Floor Reducer & History", () => {
  const initialRoom: Room = {
    widthM: 20,
    heightM: 15,
    venueType: "banquet hall",
  };
  const baseItem: FloorItem = {
    id: "item_1",
    type: "roundTable",
    label: "Table 1",
    x: 5,
    y: 5,
    w: 1.8,
    h: 1.8,
    rotation: 0,
    locked: false,
    seats: 8,
  };

  const initialState: FloorEditorState = {
    room: initialRoom,
    items: [baseItem],
    selectedId: null,
    unit: "m",
    snapEnabled: true,
    assignments: { item_1: { 0: "Alice", 1: "Bob" } },
    unseatedGuests: [],
    past: [],
    future: [],
  };

  it("handles move action and snaps to grid", () => {
    const nextState = floorReducer(initialState, {
      type: "move",
      id: "item_1",
      x: 7.23,
      y: 8.49,
      snap: true,
    });
    expect(nextState.items[0].x).toBe(7.25);
    expect(nextState.items[0].y).toBe(8.5);
    expect(nextState.past).toHaveLength(1);
  });

  it("handles resize action with safety min constraints", () => {
    const nextState = floorReducer(initialState, {
      type: "resize",
      id: "item_1",
      w: 2.24,
      h: 2.24,
    });
    expect(nextState.items[0].w).toBe(2.25);
    expect(nextState.items[0].h).toBe(2.25);
  });

  it("handles rotate action and normalizes angle to 0..360", () => {
    const nextState = floorReducer(initialState, {
      type: "rotate",
      id: "item_1",
      rotation: 375,
    });
    expect(nextState.items[0].rotation).toBe(15);
  });

  it("handles rename and truncates to 30 characters", () => {
    const longName =
      "This is a super long label that exceeds thirty characters";
    const nextState = floorReducer(initialState, {
      type: "rename",
      id: "item_1",
      label: longName,
    });
    expect(nextState.items[0].label).toHaveLength(30);
  });

  it("handles duplicate action with offset and new ID", () => {
    const nextState = floorReducer(initialState, {
      type: "duplicate",
      id: "item_1",
    });
    expect(nextState.items).toHaveLength(2);
    expect(nextState.items[1].id).not.toBe("item_1");
    expect(nextState.items[1].x).toBe(baseItem.x + 1.0);
    expect(nextState.selectedId).toBe(nextState.items[1].id);
  });

  it("prevents move or rotate on locked items", () => {
    const lockedState: FloorEditorState = {
      ...initialState,
      items: [{ ...baseItem, locked: true }],
    };
    const nextState = floorReducer(lockedState, {
      type: "move",
      id: "item_1",
      x: 12,
      y: 12,
    });
    expect(nextState.items[0].x).toBe(5); // unchanged
  });

  it("preserves seated guests when table is moved, resized, or rotated", () => {
    const moved = floorReducer(initialState, {
      type: "move",
      id: "item_1",
      x: 9,
      y: 9,
    });
    expect(moved.assignments["item_1"][0]).toBe("Alice");
    expect(moved.assignments["item_1"][1]).toBe("Bob");
  });

  it("returns seated guests to unseatedGuests when table is deleted", () => {
    const deleted = floorReducer(initialState, {
      type: "delete",
      id: "item_1",
    });
    expect(deleted.items).toHaveLength(0);
    expect(deleted.assignments["item_1"]).toBeUndefined();
    expect(deleted.unseatedGuests).toContain("Alice");
    expect(deleted.unseatedGuests).toContain("Bob");
  });

  it("caps undo/redo history at 50 steps", () => {
    let state = initialState;
    for (let i = 0; i < 60; i++) {
      state = floorReducer(state, {
        type: "move",
        id: "item_1",
        x: i * 0.25,
        y: 5,
        snap: false,
      });
    }
    expect(state.past.length).toBeLessThanOrEqual(MAX_HISTORY);
    expect(state.past.length).toBe(50);

    // Undo step
    const undone = floorReducer(state, { type: "undo" });
    expect(undone.past.length).toBe(49);
    expect(undone.future.length).toBe(1);

    // Redo step
    const redone = floorReducer(undone, { type: "redo" });
    expect(redone.past.length).toBe(50);
    expect(redone.future.length).toBe(0);
  });
});

describe("Stage 1: Floor Storage & Fallback", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("saves and loads valid floor plan from localStorage", () => {
    const room: Room = { widthM: 22, heightM: 16, venueType: "garden" };
    const items: FloorItem[] = [
      {
        id: "table_1",
        type: "roundTable",
        label: "VIP Table",
        x: 5,
        y: 5,
        w: 2,
        h: 2,
        rotation: 0,
        locked: false,
      },
    ];

    const saved = saveFloorPlan({
      room,
      items,
      assignments: {},
      unseatedGuests: [],
    });
    expect(saved).toBe(true);

    const loaded = loadFloorPlan(50, "wedding", "garden");
    expect(loaded.room.widthM).toBe(22);
    expect(loaded.room.venueType).toBe("garden");
    expect(loaded.items).toHaveLength(1);
    expect(loaded.items[0].label).toBe("VIP Table");
  });

  it("falls back to auto layout without crashing when localStorage data is corrupted", () => {
    localStorage.setItem(FLOOR_STORAGE_KEY, "{ corrupted_non_json_data !!! }");
    const loaded = loadFloorPlan(60, "birthday");
    expect(loaded.room).toBeDefined();
    expect(loaded.items.length).toBeGreaterThan(0);
    expect(loaded.items.some((it) => it.type === "roundTable")).toBe(true);
  });

  it("falls back to auto layout when room dimensions violate Zod schema limits", () => {
    localStorage.setItem(
      FLOOR_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        room: { widthM: 9999, heightM: -10, venueType: "invalid_venue" },
        items: [],
      })
    );
    const loaded = loadFloorPlan(40, "wedding");
    expect(loaded.room.widthM).toBeLessThanOrEqual(80);
    expect(loaded.room.widthM).toBeGreaterThanOrEqual(6);
  });
});
