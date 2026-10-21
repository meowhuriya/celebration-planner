import type { FloorEditorSnapshot, VenueType } from "./types";
import { floorPlanStorageSchema } from "./schema";
import { createDefaultRoom, generateAutoLayoutItems } from "./autoLayout";

export const FLOOR_STORAGE_KEY = "celebration_venue_designer_v1";
export const STORAGE_VERSION = 1;

/**
 * Creates a clean default floor snapshot from auto-layout algorithms.
 */
export function createDefaultSnapshot(
  guestCount: number,
  eventType: string,
  venueType: VenueType = "banquet hall"
): FloorEditorSnapshot {
  const room = createDefaultRoom(guestCount, venueType);
  const items = generateAutoLayoutItems(guestCount, eventType, room);
  return {
    room,
    items,
    assignments: {},
    unseatedGuests: [],
  };
}

/**
 * Persists room, items, and assignments safely to localStorage.
 */
export function saveFloorPlan(snapshot: FloorEditorSnapshot): boolean {
  if (typeof window === "undefined") return false;
  try {
    const payload = {
      version: STORAGE_VERSION,
      room: snapshot.room,
      items: snapshot.items,
      assignments: snapshot.assignments,
      unseatedGuests: snapshot.unseatedGuests,
    };
    // Validate before saving
    const valid = floorPlanStorageSchema.safeParse(payload);
    if (!valid.success) {
      console.warn("Invalid floor plan state skipped save:", valid.error);
      return false;
    }
    localStorage.setItem(FLOOR_STORAGE_KEY, JSON.stringify(valid.data));
    return true;
  } catch (err) {
    console.warn("Failed to save floor plan to localStorage:", err);
    return false;
  }
}

/**
 * Loads floor plan from localStorage with Zod validation.
 * If data is corrupted, outdated, or absent, gracefully returns auto layout.
 */
export function loadFloorPlan(
  guestCount: number,
  eventType: string,
  venueType: VenueType = "banquet hall"
): FloorEditorSnapshot {
  const fallback = createDefaultSnapshot(guestCount, eventType, venueType);
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(FLOOR_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const result = floorPlanStorageSchema.safeParse(parsed);

    if (!result.success) {
      console.warn(
        "Corrupted floor plan data detected, resetting to auto layout:",
        result.error
      );
      return fallback;
    }

    return {
      room: result.data.room,
      items: result.data.items,
      assignments: result.data.assignments,
      unseatedGuests: result.data.unseatedGuests,
    };
  } catch (err) {
    console.warn(
      "Error reading floor plan from localStorage, using fallback:",
      err
    );
    return fallback;
  }
}
