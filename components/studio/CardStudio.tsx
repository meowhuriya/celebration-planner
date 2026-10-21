"use client";

import React, { useReducer, useState, useEffect, useMemo } from "react";
import type { EventPalette, EventInput } from "@/lib/schemas";
import type { Guest } from "@/lib/seating";
import { loadSeatingPlan } from "@/lib/seating";
import type { EventEssentials } from "@/lib/rsvp/types";
import { studioReducer } from "@/lib/studio/reducer";
import { buildTemplates } from "@/lib/studio/templates";
import {
  loadStudioDesign,
  saveStudioDesign,
  saveToMyDesigns,
} from "@/lib/studio/storage";
import type { SizePreset, TokenContext, GuideLines } from "@/lib/studio/types";
import { SIZE_PRESETS } from "@/lib/studio/types";
import StudioLeftPanel from "./StudioLeftPanel";
import CardStudioCanvas from "./CardStudioCanvas";
import StudioInspector from "./StudioInspector";
import StudioLayersList from "./StudioLayersList";
import StudioExportModal from "./StudioExportModal";

interface CardStudioProps {
  palette?: EventPalette | null;
  eventInput?: EventInput | null;
  className?: string;
}

export default function CardStudio({
  palette,
  eventInput,
  className = "",
}: CardStudioProps) {
  // 1. Initial State Initialization
  const templates = useMemo(
    () => buildTemplates(palette, eventInput),
    [palette, eventInput]
  );

  const initialDesign = useMemo(() => {
    return loadStudioDesign(templates["royal-wedding"]);
  }, [templates]);

  const [state, dispatch] = useReducer(studioReducer, null, () => ({
    current: initialDesign,
    past: [],
    future: [],
    selectedElementId: initialDesign.elements[0]?.id || null,
    zoom: 0.52, // Default fit on desktop
    guideLines: null as GuideLines | null,
    announcement: "Card studio loaded",
  }));

  // Auto-save design to localStorage on change
  useEffect(() => {
    saveStudioDesign(state.current);
  }, [state]);

  // Seating Guest List
  const guests: Guest[] = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const plan = loadSeatingPlan();
      return plan.guests || [];
    } catch {
      return [];
    }
  }, []);

  // Event Essentials for QR payloads
  const eventEssentials: EventEssentials = useMemo(
    () => ({
      t: eventInput?.eventType || "celebration",
      h: eventInput?.hostName || "Host",
      d: eventInput?.eventDate || new Date().toISOString().split("T")[0],
      c: eventInput?.city || "City",
      v: eventInput?.venueName || "Venue",
      th: eventInput?.vibeOrTheme || "Festive",
      dc: eventInput?.dressCode,
    }),
    [eventInput]
  );

  // Token Context
  const tokenContext: TokenContext = useMemo(
    () => ({
      hostNames: eventInput?.hostName || "Aarav & Ananya",
      eventTitle: eventInput?.eventType
        ? `${eventInput.eventType.charAt(0).toUpperCase() + eventInput.eventType.slice(1)} Celebration`
        : "Wedding Celebration",
      date: eventInput?.eventDate || "2026-12-12",
      city: eventInput?.city || "Udaipur",
      venue: eventInput?.venueName || "The Palace Pavilion",
      guestName: guests[0]?.name || "Guest Name",
      palette: palette || undefined,
      eventInput: eventInput || undefined,
    }),
    [eventInput, guests, palette]
  );

  // Export Modal Open State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [saveToast, setSaveToast] = useState("");

  // Global Keyboard Shortcuts (Undo, Redo, Delete, Duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          dispatch({ type: "REDO" });
        } else {
          e.preventDefault();
          dispatch({ type: "UNDO" });
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        if (state.selectedElementId) {
          e.preventDefault();
          dispatch({ type: "DUPLICATE_ELEMENT", id: state.selectedElementId });
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedElementId) {
          e.preventDefault();
          dispatch({ type: "DELETE_ELEMENT", id: state.selectedElementId });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.selectedElementId]);

  const selectedElement = useMemo(
    () =>
      state.current.elements.find((e) => e.id === state.selectedElementId) ||
      null,
    [state]
  );

  const handleSaveToMyDesigns = () => {
    saveToMyDesigns(state.current);
    setSaveToast("Saved to My Designs");
    setTimeout(() => setSaveToast(""), 3000);
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] shadow-md ${className}`}
      role="region"
      aria-label="Card Studio Designer"
    >
      {/* Aria Live Announcement Region */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {state.announcement}
      </div>

      {/* Responsive Screen Advice for Under 768px */}
      <div className="block rounded-t-2xl border-b border-[#E8DCC8] bg-[#FAF2E6] px-4 py-2 text-xs text-[#6B5848] md:hidden">
        💡 <strong className="text-[#2B1B14]">Pro tip:</strong> Card studio
        offers a full drag-and-drop workspace on larger screens and tablets. On
        mobile you can still select starter templates and edit text below.
      </div>

      {/* Top Studio Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DCC8] bg-[#FFFDF8] px-4 py-3 sm:px-6">
        {/* Left: Design Name & Presets */}
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-serif text-lg font-normal text-[#2B1B14] sm:text-xl">
              {state.current.name}
            </h3>
            <span className="text-[11px] text-[#6B5848]">
              {SIZE_PRESETS[state.current.sizePreset].label} ·{" "}
              {state.current.elements.length}/60 elements
            </span>
          </div>

          {/* Size Preset Selector */}
          <select
            value={state.current.sizePreset}
            aria-label="Select canvas size preset"
            onChange={(e) =>
              dispatch({
                type: "SET_SIZE",
                sizePreset: e.target.value as SizePreset,
              })
            }
            className="shadow-2xs rounded-lg border border-[#E8DCC8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2B1B14] hover:border-[#5B1A2B] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
          >
            {(["whatsapp", "story", "square", "a5"] as const).map(
              (presetKey) => (
                <option key={presetKey} value={presetKey}>
                  {SIZE_PRESETS[presetKey].label}
                </option>
              )
            )}
          </select>
        </div>

        {/* Center: Undo, Redo, Zoom */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={state.past.length === 0}
            title="Undo (Ctrl+Z)"
            aria-label="Undo action"
            className="shadow-2xs rounded-lg border border-[#E8DCC8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#2B1B14] hover:bg-[#FCEBD3] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B] disabled:opacity-40"
          >
            ↺ Undo
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "REDO" })}
            disabled={state.future.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo action"
            className="shadow-2xs rounded-lg border border-[#E8DCC8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#2B1B14] hover:bg-[#FCEBD3] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B] disabled:opacity-40"
          >
            ↻ Redo
          </button>

          <div className="ml-2 hidden items-center gap-1 border-l border-[#E8DCC8] pl-2 sm:flex">
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "SET_ZOOM", zoom: state.zoom - 0.1 })
              }
              title="Zoom out"
              aria-label="Zoom out canvas"
              className="rounded border border-[#E8DCC8] bg-white px-2 py-1 text-xs text-[#2B1B14] hover:bg-[#FCEBD3]"
            >
              −
            </button>
            <span className="w-12 text-center text-xs text-[#6B5848]">
              {Math.round(state.zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "SET_ZOOM", zoom: state.zoom + 0.1 })
              }
              title="Zoom in"
              aria-label="Zoom in canvas"
              className="rounded border border-[#E8DCC8] bg-white px-2 py-1 text-xs text-[#2B1B14] hover:bg-[#FCEBD3]"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_ZOOM", zoom: 0.52 })}
              title="Fit to view"
              className="ml-1 rounded border border-[#E8DCC8] bg-white px-2 py-1 text-[11px] text-[#6B5848] hover:bg-[#FCEBD3]"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Right: Save & Export Modal Trigger */}
        <div className="flex items-center gap-2">
          {saveToast && (
            <span className="animate-fade-in text-xs font-semibold text-emerald-700">
              ✓ {saveToast}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveToMyDesigns}
            className="shadow-2xs rounded-xl border border-[#E8DCC8] bg-white px-3.5 py-2 text-xs font-semibold text-[#2B1B14] hover:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          >
            Save Design
          </button>
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="rounded-xl bg-[#5B1A2B] px-4 py-2 text-xs font-semibold text-[#FBF6EE] shadow-sm hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          >
            Export & Share ↗
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Workspace */}
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:gap-6 lg:p-6">
        {/* Left Column: Toolbox Panel */}
        <div className="lg:col-span-3">
          <StudioLeftPanel
            onApplyTemplate={(tmpl) =>
              dispatch({ type: "APPLY_TEMPLATE", template: tmpl })
            }
            onAddElement={(el) =>
              dispatch({ type: "ADD_ELEMENT", element: el })
            }
            onSetBackground={(bg) =>
              dispatch({ type: "SET_BACKGROUND", background: bg })
            }
            palette={palette}
            eventInput={eventInput}
            className="h-full min-h-[500px]"
          />
        </div>

        {/* Center Column: Interactive Canvas */}
        <div className="lg:col-span-6">
          <CardStudioCanvas
            design={state.current}
            selectedElementId={state.selectedElementId}
            onSelectElement={(id) => dispatch({ type: "SELECT_ELEMENT", id })}
            onUpdateElementPosition={(id, x, y, commit) =>
              dispatch({ type: "MOVE_ELEMENT", id, x, y, commit })
            }
            onUpdateElementSize={(id, x, y, w, h, commit) =>
              dispatch({ type: "RESIZE_ELEMENT", id, x, y, w, h, commit })
            }
            onUpdateElementRotation={(id, rotation, commit) =>
              dispatch({ type: "ROTATE_ELEMENT", id, rotation, commit })
            }
            onUpdateElementText={(id, text) =>
              dispatch({
                type: "EDIT_ELEMENT",
                id,
                updates: { text },
                commit: true,
              })
            }
            tokenContext={tokenContext}
            zoom={state.zoom}
            guideLines={state.guideLines}
            setGuideLines={(guides) =>
              dispatch({ type: "SET_GUIDELINES", guideLines: guides })
            }
          />
        </div>

        {/* Right Column: Inspector & Layers List */}
        <div className="space-y-4 lg:col-span-3">
          <StudioInspector
            element={selectedElement}
            onUpdateElement={(id, updates) =>
              dispatch({ type: "EDIT_ELEMENT", id, updates, commit: true })
            }
            onAlignElement={(id, alignment) =>
              dispatch({ type: "ALIGN_ELEMENT", id, alignment })
            }
            onDuplicateElement={(id) =>
              dispatch({ type: "DUPLICATE_ELEMENT", id })
            }
            onDeleteElement={(id) => dispatch({ type: "DELETE_ELEMENT", id })}
            onToggleLock={(id) => dispatch({ type: "LOCK_ELEMENT", id })}
            palette={palette}
          />

          <StudioLayersList
            elements={state.current.elements}
            selectedElementId={state.selectedElementId}
            onSelectElement={(id) => dispatch({ type: "SELECT_ELEMENT", id })}
            onReorderLayer={(id, direction) =>
              dispatch({ type: "REORDER_LAYER", id, direction })
            }
            onToggleLock={(id) => dispatch({ type: "LOCK_ELEMENT", id })}
            onDeleteElement={(id) => dispatch({ type: "DELETE_ELEMENT", id })}
          />
        </div>
      </div>

      {/* Export & Batch Share Modal */}
      <StudioExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        design={state.current}
        guests={guests}
        eventEssentials={eventEssentials}
        tokenContext={tokenContext}
      />
    </div>
  );
}
