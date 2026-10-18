import type { EventInput, EventPlan } from "./schemas";

const STORAGE_KEY = "celebration-planner-saved-plans";

interface SavedPlan {
  id: string;
  input: EventInput;
  plan: EventPlan;
  savedAt: string;
  label: string;
}

/**
 * Saves a plan to localStorage.
 */
export function savePlan(
  input: EventInput,
  plan: EventPlan,
  label?: string
): string {
  const id = `plan-${Date.now()}`;
  const saved: SavedPlan = {
    id,
    input,
    plan,
    savedAt: new Date().toISOString(),
    label:
      label ??
      `${input.eventType.charAt(0).toUpperCase() + input.eventType.slice(1)} in ${input.city}`,
  };

  const existing = getSavedPlans();
  existing.push(saved);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return id;
}

/**
 * Gets all saved plans from localStorage.
 */
export function getSavedPlans(): SavedPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPlan[];
  } catch {
    return [];
  }
}

/**
 * Gets a single saved plan by ID.
 */
export function getSavedPlan(id: string): SavedPlan | null {
  const plans = getSavedPlans();
  return plans.find((p) => p.id === id) ?? null;
}

/**
 * Deletes a saved plan by ID.
 */
export function deleteSavedPlan(id: string): void {
  const plans = getSavedPlans();
  const filtered = plans.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Updates a saved plan in localStorage.
 */
export function updateSavedPlan(
  id: string,
  plan: EventPlan,
  input?: EventInput
): void {
  const plans = getSavedPlans();
  const index = plans.findIndex((p) => p.id === id);
  if (index >= 0) {
    plans[index].plan = plan;
    if (input) plans[index].input = input;
    plans[index].savedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  }
}
