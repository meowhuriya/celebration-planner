import type { SeatingState } from "./types";
import { seatingPlanSchema } from "./schema";

export const SEATING_STORAGE_KEY = "celebrate_seating_plan_v1";

export function createDefaultSeatingState(
  seatsPerTable: number = 8
): SeatingState {
  return {
    seatsPerTable: [6, 8, 10, 12].includes(seatsPerTable) ? seatsPerTable : 8,
    guests: [],
    assignments: {},
  };
}

/**
 * Loads the saved seating plan from localStorage.
 * Guaranteed to never crash: falls back to a clean default state on corrupted JSON,
 * missing data, or schema validation failures.
 */
export function loadSeatingPlan(
  seatsPerTable: number = 8,
  customKey: string = SEATING_STORAGE_KEY
): SeatingState {
  if (typeof window === "undefined" || !window.localStorage) {
    return createDefaultSeatingState(seatsPerTable);
  }

  try {
    const raw = window.localStorage.getItem(customKey);
    if (!raw) {
      return createDefaultSeatingState(seatsPerTable);
    }

    const parsed = JSON.parse(raw);
    const validated = seatingPlanSchema.safeParse(parsed);

    if (!validated.success) {
      console.warn(
        "Corrupted seating plan in localStorage, resetting to default:",
        validated.error
      );
      return createDefaultSeatingState(seatsPerTable);
    }

    return {
      seatsPerTable: validated.data.seatsPerTable,
      guests: validated.data.guests,
      assignments: validated.data.assignments,
    };
  } catch (err) {
    console.warn(
      "Error reading seating plan from localStorage, using default:",
      err
    );
    return createDefaultSeatingState(seatsPerTable);
  }
}

/**
 * Saves seating plan data safely to localStorage.
 */
export function saveSeatingPlan(
  state: SeatingState,
  customKey: string = SEATING_STORAGE_KEY
): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const payload = {
      version: 1,
      seatsPerTable: state.seatsPerTable,
      guests: state.guests,
      assignments: state.assignments,
    };
    window.localStorage.setItem(customKey, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to persist seating plan in localStorage:", err);
  }
}
