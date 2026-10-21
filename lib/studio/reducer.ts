import type {
  Design,
  StudioState,
  StudioElement,
  BackgroundConfig,
  SizePreset,
  GuideLines,
} from "./types";
import { SIZE_PRESETS } from "./types";
import { alignElement } from "./geometry";

export type { StudioState };

export const MAX_UNDO_STEPS = 50;
export const MAX_ELEMENTS_LIMIT = 60;

export type StudioAction =
  | { type: "ADD_ELEMENT"; element: StudioElement }
  | {
      type: "MOVE_ELEMENT";
      id: string;
      x: number;
      y: number;
      commit?: boolean;
    }
  | {
      type: "RESIZE_ELEMENT";
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      commit?: boolean;
    }
  | { type: "ROTATE_ELEMENT"; id: string; rotation: number; commit?: boolean }
  | {
      type: "EDIT_ELEMENT";
      id: string;
      updates: Partial<StudioElement>;
      commit?: boolean;
    }
  | {
      type: "REORDER_LAYER";
      id: string;
      direction: "up" | "down" | "top" | "bottom";
    }
  | { type: "DUPLICATE_ELEMENT"; id: string }
  | { type: "DELETE_ELEMENT"; id: string }
  | { type: "LOCK_ELEMENT"; id: string }
  | {
      type: "ALIGN_ELEMENT";
      id: string;
      alignment: "center-h" | "center-v" | "left" | "right" | "top" | "bottom";
    }
  | { type: "SET_BACKGROUND"; background: BackgroundConfig }
  | { type: "SET_SIZE"; sizePreset: SizePreset }
  | { type: "APPLY_TEMPLATE"; template: Design }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SELECT_ELEMENT"; id: string | null }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_GUIDELINES"; guideLines: GuideLines | null };

/**
 * Pushes the current design onto the past stack (capped at MAX_UNDO_STEPS)
 * and clears future redo history.
 */
function pushHistory(state: StudioState): Pick<StudioState, "past" | "future"> {
  const newPast = [...state.past, state.current];
  if (newPast.length > MAX_UNDO_STEPS) {
    newPast.shift(); // Keep only the last 50 steps
  }
  return {
    past: newPast,
    future: [],
  };
}

export function studioReducer(
  state: StudioState,
  action: StudioAction
): StudioState {
  switch (action.type) {
    case "ADD_ELEMENT": {
      if (state.current.elements.length >= MAX_ELEMENTS_LIMIT) {
        return {
          ...state,
          announcement: `Limit reached: designs cannot exceed ${MAX_ELEMENTS_LIMIT} elements.`,
        };
      }

      const history = pushHistory(state);
      const newDesign: Design = {
        ...state.current,
        elements: [...state.current.elements, action.element],
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        ...history,
        current: newDesign,
        selectedElementId: action.element.id,
        announcement: `${action.element.type} element added`,
      };
    }

    case "MOVE_ELEMENT": {
      const idx = state.current.elements.findIndex((e) => e.id === action.id);
      if (idx === -1) return state;
      const el = state.current.elements[idx];
      if (el.locked) return state;

      const history = action.commit ? pushHistory(state) : {};
      const updatedEl = { ...el, x: action.x, y: action.y };
      const newElements = [...state.current.elements];
      newElements[idx] = updatedEl;

      return {
        ...state,
        ...history,
        current: { ...state.current, elements: newElements },
        announcement: action.commit ? "Element moved" : state.announcement,
      };
    }

    case "RESIZE_ELEMENT": {
      const idx = state.current.elements.findIndex((e) => e.id === action.id);
      if (idx === -1) return state;
      const el = state.current.elements[idx];
      if (el.locked) return state;

      const history = action.commit ? pushHistory(state) : {};
      const updatedEl = {
        ...el,
        x: action.x,
        y: action.y,
        w: Math.max(10, action.w),
        h: Math.max(10, action.h),
      };
      const newElements = [...state.current.elements];
      newElements[idx] = updatedEl;

      return {
        ...state,
        ...history,
        current: { ...state.current, elements: newElements },
        announcement: action.commit ? "Element resized" : state.announcement,
      };
    }

    case "ROTATE_ELEMENT": {
      const idx = state.current.elements.findIndex((e) => e.id === action.id);
      if (idx === -1) return state;
      const el = state.current.elements[idx];
      if (el.locked) return state;

      const history = action.commit ? pushHistory(state) : {};
      const updatedEl = { ...el, rotation: (action.rotation + 360) % 360 };
      const newElements = [...state.current.elements];
      newElements[idx] = updatedEl;

      return {
        ...state,
        ...history,
        current: { ...state.current, elements: newElements },
      };
    }

    case "EDIT_ELEMENT": {
      const idx = state.current.elements.findIndex((e) => e.id === action.id);
      if (idx === -1) return state;
      const el = state.current.elements[idx];

      const history = action.commit !== false ? pushHistory(state) : {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedEl = { ...el, ...(action.updates as any) };
      const newElements = [...state.current.elements];
      newElements[idx] = updatedEl;

      return {
        ...state,
        ...history,
        current: { ...state.current, elements: newElements },
        announcement: "Element updated",
      };
    }

    case "REORDER_LAYER": {
      const fromIdx = state.current.elements.findIndex(
        (e) => e.id === action.id
      );
      if (fromIdx === -1) return state;

      let toIdx = fromIdx;
      if (action.direction === "up") {
        toIdx = Math.min(state.current.elements.length - 1, fromIdx + 1);
      } else if (action.direction === "down") {
        toIdx = Math.max(0, fromIdx - 1);
      } else if (action.direction === "top") {
        toIdx = state.current.elements.length - 1;
      } else if (action.direction === "bottom") {
        toIdx = 0;
      }

      if (toIdx === fromIdx) return state;

      const history = pushHistory(state);
      const newElements = [...state.current.elements];
      const [item] = newElements.splice(fromIdx, 1);
      newElements.splice(toIdx, 0, item);

      return {
        ...state,
        ...history,
        current: { ...state.current, elements: newElements },
        announcement: `Layer moved ${action.direction}`,
      };
    }

    case "DUPLICATE_ELEMENT": {
      if (state.current.elements.length >= MAX_ELEMENTS_LIMIT) {
        return {
          ...state,
          announcement: `Limit reached: designs cannot exceed ${MAX_ELEMENTS_LIMIT} elements.`,
        };
      }

      const el = state.current.elements.find((e) => e.id === action.id);
      if (!el) return state;

      const history = pushHistory(state);
      const newId = `el-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const duplicated: StudioElement = {
        ...el,
        id: newId,
        x: el.x + 24,
        y: el.y + 24,
        locked: false,
      };

      return {
        ...state,
        ...history,
        current: {
          ...state.current,
          elements: [...state.current.elements, duplicated],
        },
        selectedElementId: newId,
        announcement: "Element duplicated",
      };
    }

    case "DELETE_ELEMENT": {
      const exists = state.current.elements.some((e) => e.id === action.id);
      if (!exists) return state;

      const history = pushHistory(state);
      return {
        ...state,
        ...history,
        current: {
          ...state.current,
          elements: state.current.elements.filter((e) => e.id !== action.id),
        },
        selectedElementId:
          state.selectedElementId === action.id
            ? null
            : state.selectedElementId,
        announcement: "Element deleted",
      };
    }

    case "LOCK_ELEMENT": {
      const idx = state.current.elements.findIndex((e) => e.id === action.id);
      if (idx === -1) return state;

      const history = pushHistory(state);
      const el = state.current.elements[idx];
      const updated = { ...el, locked: !el.locked };
      const newElements = [...state.current.elements];
      newElements[idx] = updated;

      return {
        ...state,
        ...history,
        current: { ...state.current, elements: newElements },
        announcement: updated.locked ? "Element locked" : "Element unlocked",
      };
    }

    case "ALIGN_ELEMENT": {
      const idx = state.current.elements.findIndex((e) => e.id === action.id);
      if (idx === -1) return state;
      const el = state.current.elements[idx];
      if (el.locked) return state;

      const history = pushHistory(state);
      const aligned = alignElement(
        el,
        state.current.width,
        state.current.height,
        action.alignment
      );
      const updated = { ...el, ...aligned };
      const newElements = [...state.current.elements];
      newElements[idx] = updated;

      return {
        ...state,
        ...history,
        current: { ...state.current, elements: newElements },
        announcement: `Element aligned ${action.alignment}`,
      };
    }

    case "SET_BACKGROUND": {
      const history = pushHistory(state);
      return {
        ...state,
        ...history,
        current: {
          ...state.current,
          background: action.background,
        },
        announcement: "Background updated",
      };
    }

    case "SET_SIZE": {
      const history = pushHistory(state);
      const preset = SIZE_PRESETS[action.sizePreset];
      const scaleX = preset.width / state.current.width;
      const scaleY = preset.height / state.current.height;

      // Scale elements proportionally to new aspect ratio
      const scaledElements = state.current.elements.map((el) => ({
        ...el,
        x: Math.round(el.x * scaleX),
        y: Math.round(el.y * scaleY),
        w: Math.round(el.w * scaleX),
        h: Math.round(el.h * scaleY),
        fontSize:
          "fontSize" in el && typeof el.fontSize === "number"
            ? Math.round(el.fontSize * Math.min(scaleX, scaleY))
            : undefined,
      })) as StudioElement[];

      return {
        ...state,
        ...history,
        current: {
          ...state.current,
          sizePreset: action.sizePreset,
          width: preset.width,
          height: preset.height,
          elements: scaledElements,
        },
        announcement: `Canvas resized to ${preset.label}`,
      };
    }

    case "APPLY_TEMPLATE": {
      const history = pushHistory(state);
      return {
        ...state,
        ...history,
        current: action.template,
        selectedElementId: null,
        announcement: `Applied template: ${action.template.name}`,
      };
    }

    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);

      return {
        ...state,
        past: newPast,
        future: [state.current, ...state.future],
        current: previous,
        selectedElementId: null,
        announcement: "Undo action",
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);

      return {
        ...state,
        past: [...state.past, state.current],
        future: newFuture,
        current: next,
        selectedElementId: null,
        announcement: "Redo action",
      };
    }

    case "SELECT_ELEMENT": {
      return {
        ...state,
        selectedElementId: action.id,
      };
    }

    case "SET_ZOOM": {
      return {
        ...state,
        zoom: Math.max(0.2, Math.min(2.0, action.zoom)),
      };
    }

    case "SET_GUIDELINES": {
      return {
        ...state,
        guideLines: action.guideLines,
      };
    }

    default:
      return state;
  }
}
