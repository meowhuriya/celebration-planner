import { SEATING_STORAGE_KEY } from "@/lib/seating/storage";
import type { SeatingState } from "@/lib/seating/types";
import { seatingPlanSchema } from "@/lib/seating/schema";

export const RSVP_SYNC_STORAGE_KEY = "celebrate_live_rsvp_sync";
export const RSVP_BROADCAST_CHANNEL = "celebrate_rsvp";

export interface LiveRsvpUpdate {
  guestId: string;
  status: "yes" | "no" | "maybe";
  partySize: number;
  foodChoice?: "vegetarian" | "non-vegetarian" | "either";
  note?: string;
  timestamp: number;
}

/**
 * Synchronously writes an RSVP update to localStorage and notifies other tabs
 * via BroadcastChannel, StorageEvent, and CustomEvent.
 */
export function syncGuestRsvpLocally(
  update: Omit<LiveRsvpUpdate, "timestamp">
): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  const fullUpdate: LiveRsvpUpdate = {
    ...update,
    timestamp: Date.now(),
  };

  try {
    // 1. Directly update the host's stored seating plan if it exists
    const rawSeating = window.localStorage.getItem(SEATING_STORAGE_KEY);
    if (rawSeating) {
      try {
        const parsed = JSON.parse(rawSeating);
        const validated = seatingPlanSchema.safeParse(parsed);
        if (validated.success && Array.isArray(validated.data.guests)) {
          const guestIndex = validated.data.guests.findIndex(
            (g) => g.id === update.guestId
          );
          if (guestIndex !== -1) {
            const updatedGuests = [...validated.data.guests];
            updatedGuests[guestIndex] = {
              ...updatedGuests[guestIndex],
              rsvpStatus: update.status,
              partySize: update.status === "no" ? 0 : update.partySize,
              foodChoice:
                update.status === "no" ? undefined : update.foodChoice,
              note: update.note ?? updatedGuests[guestIndex].note,
            };

            const updatedPlan: SeatingState = {
              seatsPerTable: validated.data.seatsPerTable,
              guests: updatedGuests,
              assignments: validated.data.assignments,
            };

            window.localStorage.setItem(
              SEATING_STORAGE_KEY,
              JSON.stringify({
                version: 1,
                ...updatedPlan,
              })
            );
          }
        }
      } catch {
        // Continue to dedicated sync key
      }
    }

    // 2. Set the dedicated live sync key in localStorage
    const serialized = JSON.stringify(fullUpdate);
    window.localStorage.setItem(RSVP_SYNC_STORAGE_KEY, serialized);

    // 3. Post to BroadcastChannel (inter-tab communication)
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const channel = new BroadcastChannel(RSVP_BROADCAST_CHANNEL);
        channel.postMessage(fullUpdate);
        channel.close();
      } catch {
        // Fallback to storage event
      }
    }

    // 4. Dispatch same-window and cross-tab storage notifications
    window.dispatchEvent(
      new CustomEvent("celebrate_rsvp_update", { detail: fullUpdate })
    );

    // Synthetic StorageEvent for environments that don't auto-dispatch in same tab
    try {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: RSVP_SYNC_STORAGE_KEY,
          newValue: serialized,
          storageArea: window.localStorage,
        })
      );
    } catch {
      // Ignore if StorageEvent constructor is not polyfilled
    }
  } catch (err) {
    console.warn("[RSVP Sync] Failed to synchronize RSVP locally:", err);
  }
}

/**
 * Listens for live RSVP updates across browser tabs and same-tab windows.
 * Re-reads and calls the callback when updates occur or when the window gains focus.
 */
export function listenToRsvpSync(
  callback: (update: LiveRsvpUpdate) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let broadcastChannel: BroadcastChannel | null = null;
  let lastTimestamp = 0;

  const handleUpdate = (update: LiveRsvpUpdate) => {
    if (!update || !update.guestId) return;
    if (update.timestamp && update.timestamp <= lastTimestamp) return;
    lastTimestamp = update.timestamp || Date.now();
    callback(update);
  };

  // 1. BroadcastChannel listener (instant cross-tab messaging)
  if (typeof BroadcastChannel !== "undefined") {
    try {
      broadcastChannel = new BroadcastChannel(RSVP_BROADCAST_CHANNEL);
      broadcastChannel.onmessage = (event) => {
        if (event.data) {
          handleUpdate(event.data);
        }
      };
    } catch {
      broadcastChannel = null;
    }
  }

  // 2. Native Storage event listener (fires in all other tabs when localStorage changes)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === RSVP_SYNC_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        handleUpdate(parsed);
      } catch {
        // Ignore parse error
      }
    }
  };
  window.addEventListener("storage", handleStorage);

  // 3. Same-window custom event listener
  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent<LiveRsvpUpdate>).detail;
    if (detail) {
      handleUpdate(detail);
    }
  };
  window.addEventListener("celebrate_rsvp_update", handleCustomEvent);

  // 4. Window focus listener (re-checks when returning to the host tab)
  const handleFocus = () => {
    try {
      const raw = window.localStorage.getItem(RSVP_SYNC_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        handleUpdate(parsed);
      }
    } catch {
      // Ignore parse error
    }
  };
  window.addEventListener("focus", handleFocus);

  // Cleanup all listeners
  return () => {
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch {
        // Ignore
      }
    }
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("celebrate_rsvp_update", handleCustomEvent);
    window.removeEventListener("focus", handleFocus);
  };
}
