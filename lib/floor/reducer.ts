import type {
  FloorEditorState,
  FloorEditorSnapshot,
  FloorItem,
  Room,
  UnitSystem,
  VenueType,
} from "./types";
import { snapToGrid, clampToRoom, roundFloat } from "./geometry";
import { generateAutoLayoutItems, createDefaultRoom } from "./autoLayout";

export const MAX_HISTORY = 50;
export const MAX_ITEMS = 150;

export type FloorAction =
  | { type: "add"; item: FloorItem }
  | { type: "move"; id: string; x: number; y: number; snap?: boolean }
  | { type: "resize"; id: string; w: number; h: number; snap?: boolean }
  | { type: "rotate"; id: string; rotation: number }
  | { type: "rename"; id: string; label: string }
  | { type: "duplicate"; id: string }
  | { type: "delete"; id: string }
  | { type: "lock"; id: string; locked?: boolean }
  | { type: "setSeats"; id: string; seats: number }
  | { type: "setRoom"; room: Partial<Room> }
  | {
      type: "autoLayout";
      guestCount: number;
      eventType: string;
      venueType?: VenueType;
    }
  | { type: "select"; id: string | null }
  | { type: "setUnit"; unit: UnitSystem }
  | { type: "toggleSnap" }
  | { type: "undo" }
  | { type: "redo" }
  | {
      type: "assignSeat";
      tableId: string;
      seatIndex: number;
      guestName: string;
    }
  | { type: "unassignSeat"; tableId: string; seatIndex: number }
  | { type: "resetState"; state: FloorEditorSnapshot };

export function createSnapshot(state: FloorEditorState): FloorEditorSnapshot {
  return {
    room: { ...state.room },
    items: state.items.map((it) => ({ ...it })),
    assignments: JSON.parse(JSON.stringify(state.assignments)),
    unseatedGuests: [...state.unseatedGuests],
  };
}

function pushHistory(
  state: FloorEditorState,
  nextSnapshot: FloorEditorSnapshot
): FloorEditorState {
  const currentSnapshot = createSnapshot(state);
  const newPast = [...state.past, currentSnapshot];
  if (newPast.length > MAX_HISTORY) {
    newPast.shift();
  }
  return {
    ...state,
    ...nextSnapshot,
    past: newPast,
    future: [],
  };
}

export function floorReducer(
  state: FloorEditorState,
  action: FloorAction
): FloorEditorState {
  switch (action.type) {
    case "select":
      return { ...state, selectedId: action.id };

    case "setUnit":
      return { ...state, unit: action.unit };

    case "toggleSnap":
      return { ...state, snapEnabled: !state.snapEnabled };

    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      const current = createSnapshot(state);
      return {
        ...state,
        ...previous,
        past: newPast,
        future: [current, ...state.future].slice(0, MAX_HISTORY),
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const current = createSnapshot(state);
      return {
        ...state,
        ...next,
        past: [...state.past, current].slice(-MAX_HISTORY),
        future: newFuture,
      };
    }

    case "add": {
      if (state.items.length >= MAX_ITEMS) return state;
      const safeLabel = action.item.label.slice(0, 30);
      const newItem: FloorItem = clampToRoom(
        { ...action.item, label: safeLabel },
        state.room
      );
      return pushHistory(state, {
        room: state.room,
        items: [...state.items, newItem],
        assignments: state.assignments,
        unseatedGuests: state.unseatedGuests,
      });
    }

    case "move": {
      const idx = state.items.findIndex((it) => it.id === action.id);
      if (idx === -1 || state.items[idx].locked) return state;

      const shouldSnap = action.snap ?? state.snapEnabled;
      const finalX = shouldSnap ? snapToGrid(action.x) : roundFloat(action.x);
      const finalY = shouldSnap ? snapToGrid(action.y) : roundFloat(action.y);

      const updatedItem = clampToRoom(
        { ...state.items[idx], x: finalX, y: finalY },
        state.room
      );

      const nextItems = [...state.items];
      nextItems[idx] = updatedItem;

      return pushHistory(state, {
        room: state.room,
        items: nextItems,
        assignments: state.assignments,
        unseatedGuests: state.unseatedGuests,
      });
    }

    case "resize": {
      const idx = state.items.findIndex((it) => it.id === action.id);
      if (idx === -1 || state.items[idx].locked) return state;

      const shouldSnap = action.snap ?? state.snapEnabled;
      const finalW = Math.max(
        0.5,
        shouldSnap ? snapToGrid(action.w) : roundFloat(action.w)
      );
      const finalH = Math.max(
        0.5,
        shouldSnap ? snapToGrid(action.h) : roundFloat(action.h)
      );

      const updatedItem = clampToRoom(
        { ...state.items[idx], w: finalW, h: finalH },
        state.room
      );

      const nextItems = [...state.items];
      nextItems[idx] = updatedItem;

      return pushHistory(state, {
        room: state.room,
        items: nextItems,
        assignments: state.assignments,
        unseatedGuests: state.unseatedGuests,
      });
    }

    case "rotate": {
      const idx = state.items.findIndex((it) => it.id === action.id);
      if (idx === -1 || state.items[idx].locked) return state;

      const normalizedAngle = ((action.rotation % 360) + 360) % 360;
      const updatedItem = clampToRoom(
        { ...state.items[idx], rotation: roundFloat(normalizedAngle) },
        state.room
      );

      const nextItems = [...state.items];
      nextItems[idx] = updatedItem;

      return pushHistory(state, {
        room: state.room,
        items: nextItems,
        assignments: state.assignments,
        unseatedGuests: state.unseatedGuests,
      });
    }

    case "rename": {
      const idx = state.items.findIndex((it) => it.id === action.id);
      if (idx === -1) return state;

      const safeLabel = action.label.slice(0, 30);
      const nextItems = [...state.items];
      nextItems[idx] = { ...state.items[idx], label: safeLabel };

      return pushHistory(state, {
        room: state.room,
        items: nextItems,
        assignments: state.assignments,
        unseatedGuests: state.unseatedGuests,
      });
    }

    case "duplicate": {
      if (state.items.length >= MAX_ITEMS) return state;
      const target = state.items.find((it) => it.id === action.id);
      if (!target) return state;

      const newId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const duplicated: FloorItem = clampToRoom(
        {
          ...target,
          id: newId,
          label: `${target.label} (Copy)`.slice(0, 30),
          x: target.x + 1.0,
          y: target.y + 1.0,
          locked: false,
        },
        state.room
      );

      return {
        ...pushHistory(state, {
          room: state.room,
          items: [...state.items, duplicated],
          assignments: state.assignments,
          unseatedGuests: state.unseatedGuests,
        }),
        selectedId: newId,
      };
    }

    case "delete": {
      const target = state.items.find((it) => it.id === action.id);
      if (!target) return state;

      // Return any guests seated at this table to unseatedGuests
      const returnedGuests: string[] = [];
      const nextAssignments = { ...state.assignments };
      if (nextAssignments[action.id]) {
        for (const guest of Object.values(nextAssignments[action.id])) {
          if (guest) returnedGuests.push(guest);
        }
        delete nextAssignments[action.id];
      }

      return {
        ...pushHistory(state, {
          room: state.room,
          items: state.items.filter((it) => it.id !== action.id),
          assignments: nextAssignments,
          unseatedGuests: [...state.unseatedGuests, ...returnedGuests],
        }),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    }

    case "lock": {
      const idx = state.items.findIndex((it) => it.id === action.id);
      if (idx === -1) return state;

      const isLocked = action.locked ?? !state.items[idx].locked;
      const nextItems = [...state.items];
      nextItems[idx] = { ...state.items[idx], locked: isLocked };

      return pushHistory(state, {
        room: state.room,
        items: nextItems,
        assignments: state.assignments,
        unseatedGuests: state.unseatedGuests,
      });
    }

    case "setSeats": {
      const idx = state.items.findIndex((it) => it.id === action.id);
      if (idx === -1) return state;

      const safeSeats = Math.max(1, Math.min(24, Math.floor(action.seats)));
      const nextItems = [...state.items];
      nextItems[idx] = { ...state.items[idx], seats: safeSeats };

      // Return any guests beyond new seat count
      const returnedGuests: string[] = [];
      const nextAssignments = { ...state.assignments };
      if (nextAssignments[action.id]) {
        const tableSeats = { ...nextAssignments[action.id] };
        for (const [seatKey, guest] of Object.entries(tableSeats)) {
          const seatIdx = Number(seatKey);
          if (seatIdx >= safeSeats) {
            returnedGuests.push(guest);
            delete tableSeats[seatIdx];
          }
        }
        nextAssignments[action.id] = tableSeats;
      }

      return pushHistory(state, {
        room: state.room,
        items: nextItems,
        assignments: nextAssignments,
        unseatedGuests: [...state.unseatedGuests, ...returnedGuests],
      });
    }

    case "setRoom": {
      const nextWidth = action.room.widthM
        ? Math.max(6, Math.min(80, action.room.widthM))
        : state.room.widthM;
      const nextHeight = action.room.heightM
        ? Math.max(6, Math.min(80, action.room.heightM))
        : state.room.heightM;
      const nextType = action.room.venueType ?? state.room.venueType;

      const nextRoom: Room = {
        widthM: nextWidth,
        heightM: nextHeight,
        venueType: nextType,
      };

      // Clamp existing items to new room boundaries
      const clampedItems = state.items.map((it) => clampToRoom(it, nextRoom));

      return pushHistory(state, {
        room: nextRoom,
        items: clampedItems,
        assignments: state.assignments,
        unseatedGuests: state.unseatedGuests,
      });
    }

    case "autoLayout": {
      const targetRoom = createDefaultRoom(
        action.guestCount,
        action.venueType ?? state.room.venueType
      );
      const autoItems = generateAutoLayoutItems(
        action.guestCount,
        action.eventType,
        targetRoom
      );

      return pushHistory(state, {
        room: targetRoom,
        items: autoItems,
        assignments: state.assignments,
        unseatedGuests: state.unseatedGuests,
      });
    }

    case "assignSeat": {
      const currentTable = state.assignments[action.tableId] ?? {};
      const nextAssignments = {
        ...state.assignments,
        [action.tableId]: {
          ...currentTable,
          [action.seatIndex]: action.guestName,
        },
      };
      const nextUnseated = state.unseatedGuests.filter(
        (g) => g !== action.guestName
      );

      return pushHistory(state, {
        room: state.room,
        items: state.items,
        assignments: nextAssignments,
        unseatedGuests: nextUnseated,
      });
    }

    case "unassignSeat": {
      const currentTable = state.assignments[action.tableId];
      if (!currentTable || !currentTable[action.seatIndex]) return state;

      const removedGuest = currentTable[action.seatIndex];
      const nextTable = { ...currentTable };
      delete nextTable[action.seatIndex];

      const nextAssignments = {
        ...state.assignments,
        [action.tableId]: nextTable,
      };

      return pushHistory(state, {
        room: state.room,
        items: state.items,
        assignments: nextAssignments,
        unseatedGuests: [...state.unseatedGuests, removedGuest],
      });
    }

    case "resetState":
      return {
        ...state,
        ...action.state,
        past: [],
        future: [],
      };

    default:
      return state;
  }
}
