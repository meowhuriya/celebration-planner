import type { Design, SizePreset } from "./types";
import { validateDesign } from "./schema";

export const STORAGE_CURRENT_DESIGN_KEY = "celebrate_studio_current_v1";
export const STORAGE_MY_DESIGNS_KEY = "celebrate_studio_my_designs_v1";
export const MAX_MY_DESIGNS = 10;

export interface SavedDesignSummary {
  id: string;
  name: string;
  updatedAt: string;
  sizePreset: SizePreset;
  elementsCount: number;
}

/**
 * Saves current working design to localStorage with version key.
 */
export function saveStudioDesign(design: Design): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(design);
    localStorage.setItem(STORAGE_CURRENT_DESIGN_KEY, serialized);
  } catch (e) {
    console.warn("Failed to persist studio design to localStorage", e);
  }
}

/**
 * Loads current design from localStorage.
 * If data is missing or corrupted, returns the fallback template without crashing.
 */
export function loadStudioDesign(fallback: Design): Design {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_DESIGN_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const valid = validateDesign(parsed);
    if (!valid) {
      console.warn("Corrupted studio design detected, using fallback template");
      return fallback;
    }
    return valid;
  } catch (e) {
    console.warn("Error reading studio design from localStorage", e);
    return fallback;
  }
}

/**
 * Retrieves the list of saved designs in "My Designs" (up to 10).
 */
export function listMyDesigns(): SavedDesignSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_MY_DESIGNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        const valid = validateDesign(item);
        if (!valid) return null;
        return {
          id: valid.id,
          name: valid.name,
          updatedAt: valid.updatedAt || new Date().toISOString(),
          sizePreset: valid.sizePreset,
          elementsCount: valid.elements.length,
        };
      })
      .filter((s): s is SavedDesignSummary => s !== null);
  } catch {
    return [];
  }
}

/**
 * Saves a design into "My Designs", capping at 10 items.
 */
export function saveToMyDesigns(design: Design): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_MY_DESIGNS_KEY);
    let list: Design[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed
            .map((item) => validateDesign(item))
            .filter((d): d is Design => d !== null);
        }
      } catch {
        list = [];
      }
    }

    const updatedDesign: Design = {
      ...design,
      updatedAt: new Date().toISOString(),
    };

    // Filter out previous version of this design if exists
    const filtered = list.filter((d) => d.id !== design.id);
    const updatedList = [updatedDesign, ...filtered].slice(0, MAX_MY_DESIGNS);

    localStorage.setItem(STORAGE_MY_DESIGNS_KEY, JSON.stringify(updatedList));
    return true;
  } catch (e) {
    console.warn("Failed to save into My Designs", e);
    return false;
  }
}

/**
 * Loads a specific saved design from "My Designs" by id.
 */
export function loadFromMyDesigns(id: string): Design | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_MY_DESIGNS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const match = parsed.find((item) => item?.id === id);
    if (!match) return null;
    return validateDesign(match);
  } catch {
    return null;
  }
}

/**
 * Deletes a design from "My Designs".
 */
export function deleteFromMyDesigns(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_MY_DESIGNS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const filtered = parsed.filter((item) => item?.id !== id);
    localStorage.setItem(STORAGE_MY_DESIGNS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Failed to delete from My Designs", e);
  }
}
