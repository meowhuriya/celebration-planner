import type { Guest, SeatingState, AutoSeatResult, SeatKey } from "./types";

/**
 * Assigns a guest to a seat.
 * Guarantees:
 * - A seat holds at most one guest (replaces any previous occupant).
 * - A guest sits in at most one seat (clears any previous seat occupied by this guest).
 * Returns a new immutable state.
 */
export function assign(
  state: SeatingState,
  seatKey: SeatKey,
  guestId: string
): SeatingState {
  // Validate that guest exists
  const guestExists = state.guests.some((g) => g.id === guestId);
  if (!guestExists) return state;

  const nextAssignments: Record<SeatKey, string> = {};

  // Copy existing assignments, unassigning the guest from any other seat
  for (const [key, occupantId] of Object.entries(state.assignments)) {
    if (occupantId !== guestId && key !== seatKey) {
      nextAssignments[key] = occupantId;
    }
  }

  // Assign to target seat
  nextAssignments[seatKey] = guestId;

  return {
    ...state,
    assignments: nextAssignments,
  };
}

/**
 * Unassigns the guest currently at seatKey.
 * Returns a new immutable state.
 */
export function unassign(state: SeatingState, seatKey: SeatKey): SeatingState {
  if (!(seatKey in state.assignments)) {
    return state;
  }

  const nextAssignments: Record<SeatKey, string> = { ...state.assignments };
  delete nextAssignments[seatKey];

  return {
    ...state,
    assignments: nextAssignments,
  };
}

/**
 * Swaps occupants between two seats.
 * Correctly handles:
 * - Both seats occupied (exchange positions).
 * - Seat A occupied, Seat B empty (Seat A moves to Seat B).
 * - Seat B occupied, Seat A empty (Seat B moves to Seat A).
 * - Both seats empty (no-op).
 * Returns a new immutable state.
 */
export function swap(
  state: SeatingState,
  seatKeyA: SeatKey,
  seatKeyB: SeatKey
): SeatingState {
  if (seatKeyA === seatKeyB) return state;

  const occupantA = state.assignments[seatKeyA];
  const occupantB = state.assignments[seatKeyB];

  if (!occupantA && !occupantB) return state;

  const nextAssignments: Record<SeatKey, string> = { ...state.assignments };

  if (occupantB) {
    nextAssignments[seatKeyA] = occupantB;
  } else {
    delete nextAssignments[seatKeyA];
  }

  if (occupantA) {
    nextAssignments[seatKeyB] = occupantA;
  } else {
    delete nextAssignments[seatKeyB];
  }

  return {
    ...state,
    assignments: nextAssignments,
  };
}

/**
 * Deterministically seats guests into available tables and seats:
 * - Keeps guests of the same group together at the same or neighbouring tables.
 * - Never exceeds capacity.
 * - Leaves excess guests in `unseatedGuests`.
 *
 * @param guests List of guests to seat
 * @param tableCount Total number of tables available
 * @param seatsPerTable Number of seats per table (e.g. 6, 8, 10, 12)
 */
export function autoSeat(
  guests: Guest[],
  tableCount: number,
  seatsPerTable: number
): AutoSeatResult {
  const totalCapacity = Math.max(0, tableCount * seatsPerTable);

  if (tableCount <= 0 || seatsPerTable <= 0 || guests.length === 0) {
    return {
      assignments: {},
      unseatedGuests: [...guests],
      seatedCount: 0,
      totalCapacity,
    };
  }

  // Cluster guests by group preserving insertion order
  const groupClusters: Map<string, Guest[]> = new Map();
  const ungrouped: Guest[] = [];

  for (const g of guests) {
    const grp = g.group?.trim();
    if (grp) {
      const list = groupClusters.get(grp) ?? [];
      list.push(g);
      groupClusters.set(grp, list);
    } else {
      ungrouped.push(g);
    }
  }

  const assignments: Record<SeatKey, string> = {};
  const unseatedGuests: Guest[] = [];

  // Track table occupancy: tableNumber (1-based) -> array of assigned guestIds or undefined
  const tables: Array<Array<string | null>> = [];
  for (let t = 0; t < tableCount; t++) {
    tables.push(new Array<string | null>(seatsPerTable).fill(null));
  }

  let curTable = 0;
  let curSeat = 0;

  // Track leftover gaps from table skips so ungrouped guests can backfill them
  const openGaps: Array<{ tableIdx: number; seatIdx: number }> = [];

  // 1. Seat grouped guests
  for (const [, groupMembers] of groupClusters.entries()) {
    const groupSize = groupMembers.length;

    // Check if the whole group fits in the remaining seats of curTable
    const remainingInCur = seatsPerTable - curSeat;

    if (groupSize <= seatsPerTable) {
      if (groupSize <= remainingInCur) {
        // Fits right into current table
        for (const guest of groupMembers) {
          tables[curTable][curSeat] = guest.id;
          assignments[`${curTable + 1}-${curSeat}`] = guest.id;
          curSeat++;
          if (curSeat >= seatsPerTable) {
            curTable++;
            curSeat = 0;
          }
        }
      } else {
        // Group fits at a table, but not in the few leftover seats of curTable.
        // If there is another table available, advance to next table so all members sit together!
        if (curTable + 1 < tableCount) {
          // Record leftover seats on curTable as open gaps for backfilling
          for (let s = curSeat; s < seatsPerTable; s++) {
            openGaps.push({ tableIdx: curTable, seatIdx: s });
          }
          // Move to next table
          curTable++;
          curSeat = 0;

          for (const guest of groupMembers) {
            if (curTable < tableCount) {
              tables[curTable][curSeat] = guest.id;
              assignments[`${curTable + 1}-${curSeat}`] = guest.id;
              curSeat++;
              if (curSeat >= seatsPerTable) {
                curTable++;
                curSeat = 0;
              }
            } else {
              unseatedGuests.push(guest);
            }
          }
        } else {
          // No next table; seat as many as possible in curTable and overflow
          for (const guest of groupMembers) {
            if (curTable < tableCount) {
              tables[curTable][curSeat] = guest.id;
              assignments[`${curTable + 1}-${curSeat}`] = guest.id;
              curSeat++;
              if (curSeat >= seatsPerTable) {
                curTable++;
                curSeat = 0;
              }
            } else {
              unseatedGuests.push(guest);
            }
          }
        }
      }
    } else {
      // Group is larger than a single table: fill curTable and overflow to neighbouring table
      for (const guest of groupMembers) {
        if (curTable < tableCount) {
          tables[curTable][curSeat] = guest.id;
          assignments[`${curTable + 1}-${curSeat}`] = guest.id;
          curSeat++;
          if (curSeat >= seatsPerTable) {
            curTable++;
            curSeat = 0;
          }
        } else {
          unseatedGuests.push(guest);
        }
      }
    }
  }

  // 2. Backfill open gaps with ungrouped guests
  let ungroupedIdx = 0;
  for (const gap of openGaps) {
    if (ungroupedIdx < ungrouped.length) {
      const guest = ungrouped[ungroupedIdx++];
      tables[gap.tableIdx][gap.seatIdx] = guest.id;
      assignments[`${gap.tableIdx + 1}-${gap.seatIdx}`] = guest.id;
    }
  }

  // 3. Place remaining ungrouped guests in normal sequence
  while (ungroupedIdx < ungrouped.length) {
    const guest = ungrouped[ungroupedIdx++];
    if (curTable < tableCount) {
      tables[curTable][curSeat] = guest.id;
      assignments[`${curTable + 1}-${curSeat}`] = guest.id;
      curSeat++;
      if (curSeat >= seatsPerTable) {
        curTable++;
        curSeat = 0;
      }
    } else {
      unseatedGuests.push(guest);
    }
  }

  return {
    assignments,
    unseatedGuests,
    seatedCount: Object.keys(assignments).length,
    totalCapacity,
  };
}
