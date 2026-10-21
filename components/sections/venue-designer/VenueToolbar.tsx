"use client";

import { useState, useRef, useEffect, memo } from "react";
import type { FloorItemType, Room, UnitSystem, VenueType } from "@/lib/floor";
import { VENUE_TYPES, METERS_TO_FEET } from "@/lib/floor";

interface VenueToolbarProps {
  room: Room;
  unit: UnitSystem;
  canUndo: boolean;
  canRedo: boolean;
  snapEnabled: boolean;
  zoom: number;
  onSetRoom: (room: Partial<Room>) => void;
  onSetUnit: (unit: UnitSystem) => void;
  onToggleSnap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddItem: (type: FloorItemType) => void;
  onAutoLayout: () => void;
}

const ITEM_MENU_OPTIONS: {
  type: FloorItemType;
  label: string;
  icon: string;
}[] = [
  { type: "roundTable", label: "Round table (8 seats)", icon: "⚪" },
  { type: "longTable", label: "Long table (8 seats)", icon: "▭" },
  { type: "stage", label: "Ceremonial stage", icon: "🏛️" },
  { type: "danceFloor", label: "Dance floor", icon: "💃" },
  { type: "buffet", label: "Buffet station", icon: "🍱" },
  { type: "bar", label: "Beverage bar", icon: "🍸" },
  { type: "entrance", label: "Main entrance", icon: "🚪" },
  { type: "mandap", label: "Mandap / Canopy", icon: "🌸" },
  { type: "photoBooth", label: "Photo booth", icon: "📸" },
  { type: "pillar", label: "Pillar / Column", icon: "⏹️" },
  { type: "zone", label: "Custom zone", icon: "⬚" },
];

function VenueToolbarComponent({
  room,
  unit,
  canUndo,
  canRedo,
  snapEnabled,
  zoom,
  onSetRoom,
  onSetUnit,
  onToggleSnap,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onUndo,
  onRedo,
  onAddItem,
  onAutoLayout,
}: VenueToolbarProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close add dropdown on outside click
  useEffect(() => {
    if (!isAddOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setIsAddOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isAddOpen]);

  const displayWidth =
    unit === "m"
      ? room.widthM
      : Math.round(room.widthM * METERS_TO_FEET * 10) / 10;
  const displayHeight =
    unit === "m"
      ? room.heightM
      : Math.round(room.heightM * METERS_TO_FEET * 10) / 10;

  const handleWidthChange = (valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num)) return;
    const finalMeters = unit === "m" ? num : num / METERS_TO_FEET;
    onSetRoom({ widthM: Math.round(finalMeters * 10) / 10 });
  };

  const handleHeightChange = (valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num)) return;
    const finalMeters = unit === "m" ? num : num / METERS_TO_FEET;
    onSetRoom({ heightM: Math.round(finalMeters * 10) / 10 });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D9D9] bg-white p-3 sm:p-4 print:hidden">
      {/* Group 1: Venue Type & Room Dimensions */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Venue Type */}
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#111111]">
          <span className="hidden text-[#5A5A5A] sm:inline">Venue:</span>
          <select
            value={room.venueType}
            onChange={(e) =>
              onSetRoom({ venueType: e.target.value as VenueType })
            }
            className="rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] px-2.5 py-1.5 text-xs font-medium text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
            aria-label="Venue atmosphere and surface type"
          >
            {VENUE_TYPES.map((vt) => (
              <option key={vt} value={vt}>
                {vt.charAt(0).toUpperCase() + vt.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {/* Room Width & Height */}
        <div className="flex items-center gap-1.5 text-xs text-[#5A5A5A]">
          <label className="flex items-center gap-1 font-mono">
            <span className="text-[11px] font-semibold text-[#111111]">W</span>
            <input
              type="number"
              min={unit === "m" ? 6 : 20}
              max={unit === "m" ? 80 : 260}
              step="0.5"
              value={displayWidth}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="w-14 rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] px-2 py-1 text-center font-mono text-xs text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
              aria-label={`Room width in ${unit}`}
            />
          </label>
          <span>×</span>
          <label className="flex items-center gap-1 font-mono">
            <span className="text-[11px] font-semibold text-[#111111]">H</span>
            <input
              type="number"
              min={unit === "m" ? 6 : 20}
              max={unit === "m" ? 80 : 260}
              step="0.5"
              value={displayHeight}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="w-14 rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] px-2 py-1 text-center font-mono text-xs text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
              aria-label={`Room height in ${unit}`}
            />
          </label>
        </div>

        {/* Unit Toggle */}
        <div className="flex rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] p-0.5">
          <button
            type="button"
            onClick={() => onSetUnit("m")}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              unit === "m"
                ? "bg-[#111111] text-[#F7F7F7]"
                : "text-[#5A5A5A] hover:text-[#111111]"
            }`}
            aria-label="Display measurements in meters"
          >
            m
          </button>
          <button
            type="button"
            onClick={() => onSetUnit("ft")}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              unit === "ft"
                ? "bg-[#111111] text-[#F7F7F7]"
                : "text-[#5A5A5A] hover:text-[#111111]"
            }`}
            aria-label="Display measurements in feet"
          >
            ft
          </button>
        </div>
      </div>

      {/* Group 2: Add Menu, Undo/Redo, Snap, Zoom, Auto Layout */}
      <div className="flex flex-wrap items-center gap-2">
        {/* "Add" Dropdown Menu */}
        <div ref={addMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsAddOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#111111] bg-[#111111] px-3 py-1.5 text-xs font-semibold text-[#F7F7F7] shadow-sm transition-all hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#111111]"
            aria-haspopup="true"
            aria-expanded={isAddOpen}
          >
            <span>+ Add fixture</span>
            <span aria-hidden="true">{isAddOpen ? "▲" : "▼"}</span>
          </button>

          {isAddOpen && (
            <div
              role="menu"
              aria-label="Add fixture to room"
              className="absolute left-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-[#D9D9D9] bg-white py-1.5 shadow-xl"
            >
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#5A5A5A]">
                Select item to place
              </div>
              {ITEM_MENU_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onAddItem(opt.type);
                    setIsAddOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs font-medium text-[#111111] transition-colors hover:bg-[#F7F7F7] focus:bg-[#F7F7F7] focus:outline-none"
                >
                  <span className="text-sm" aria-hidden="true">
                    {opt.icon}
                  </span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] p-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            aria-label="Undo last change"
            className="rounded-md px-2 py-1 text-xs font-bold text-[#111111] transition-colors hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⇧⌘Z)"
            aria-label="Redo last change"
            className="rounded-md px-2 py-1 text-xs font-bold text-[#111111] transition-colors hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ↻
          </button>
        </div>

        {/* Snap Toggle */}
        <button
          type="button"
          onClick={onToggleSnap}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111] ${
            snapEnabled
              ? "border-[#111111] bg-[#111111] text-[#F7F7F7]"
              : "border-[#D9D9D9] bg-white text-[#5A5A5A] hover:text-[#111111]"
          }`}
          aria-pressed={snapEnabled}
          aria-label="Toggle grid snap (0.25m)"
          title="Toggle grid snap (hold Alt while dragging to temporarily disable)"
        >
          {snapEnabled ? "✓ Snap 0.25m" : "Snap Off"}
        </button>

        {/* Zoom Controls & Fit to screen */}
        <div className="flex items-center rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] p-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Zoom out"
            className="rounded-md px-2 py-0.5 text-xs font-bold text-[#111111] hover:bg-white"
          >
            −
          </button>
          <span className="px-1 font-mono text-[11px] font-medium text-[#5A5A5A]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Zoom in"
            className="rounded-md px-2 py-0.5 text-xs font-bold text-[#111111] hover:bg-white"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onFitToScreen}
          className="rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
          aria-label="Fit room to screen view"
        >
          Fit
        </button>

        {/* Auto layout button */}
        <button
          type="button"
          onClick={onAutoLayout}
          className="rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] px-3 py-1.5 text-xs font-semibold text-[#111111] transition-all hover:border-[#111111] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
          aria-label="Reset floor plan to smart auto layout"
        >
          Auto layout ↻
        </button>
      </div>
    </div>
  );
}

export const VenueToolbar = memo(VenueToolbarComponent);
