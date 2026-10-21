"use client";

import { memo } from "react";
import type { FloorItem, UnitSystem } from "@/lib/floor";
import { METERS_TO_FEET } from "@/lib/floor";

interface VenueInspectorProps {
  item: FloorItem | null;
  unit: UnitSystem;
  onUpdate: (
    id: string,
    changes: {
      label?: string;
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      rotation?: number;
      seats?: number;
      locked?: boolean;
    }
  ) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}

function VenueInspectorComponent({
  item,
  unit,
  onUpdate,
  onDuplicate,
  onDelete,
  onClose,
}: VenueInspectorProps) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-[#5A5A5A]">
        <span className="mb-2 text-2xl" aria-hidden="true">
          📐
        </span>
        <span className="font-semibold text-[#111111]">No item selected</span>
        <p className="mt-1 text-[11px] leading-relaxed">
          Click or Tab to any table or fixture on the floor plan to inspect and
          fine-tune its dimensions, coordinates, and seats.
        </p>
      </div>
    );
  }

  const isTable = item.type === "roundTable" || item.type === "longTable";

  const displayX =
    unit === "m" ? item.x : Math.round(item.x * METERS_TO_FEET * 100) / 100;
  const displayY =
    unit === "m" ? item.y : Math.round(item.y * METERS_TO_FEET * 100) / 100;
  const displayW =
    unit === "m" ? item.w : Math.round(item.w * METERS_TO_FEET * 100) / 100;
  const displayH =
    unit === "m" ? item.h : Math.round(item.h * METERS_TO_FEET * 100) / 100;

  const handleXChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    onUpdate(item.id, { x: unit === "m" ? num : num / METERS_TO_FEET });
  };

  const handleYChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    onUpdate(item.id, { y: unit === "m" ? num : num / METERS_TO_FEET });
  };

  const handleWChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return;
    const finalW = unit === "m" ? num : num / METERS_TO_FEET;
    // Keep aspect ratio for round tables
    if (item.type === "roundTable") {
      onUpdate(item.id, { w: finalW, h: finalW });
    } else {
      onUpdate(item.id, { w: finalW });
    }
  };

  const handleHChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return;
    const finalH = unit === "m" ? num : num / METERS_TO_FEET;
    if (item.type === "roundTable") {
      onUpdate(item.id, { w: finalH, h: finalH });
    } else {
      onUpdate(item.id, { h: finalH });
    }
  };

  return (
    <div
      role="region"
      aria-label={`Item inspector: ${item.label}`}
      className="space-y-4 p-4 text-xs"
    >
      {/* Header with Title and Close Button */}
      <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A5A]">
            Fixture details
          </span>
          <h4 className="font-serif text-lg font-normal text-[#111111]">
            {item.label}
          </h4>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#5A5A5A] hover:bg-[#EFEFEF] hover:text-[#111111] lg:hidden"
            aria-label="Close inspector"
          >
            ✕
          </button>
        )}
      </div>

      {/* Label Edit */}
      <div>
        <label
          htmlFor="item-label-input"
          className="mb-1 block font-semibold text-[#111111]"
        >
          Label
        </label>
        <input
          id="item-label-input"
          type="text"
          maxLength={30}
          value={item.label}
          onChange={(e) => onUpdate(item.id, { label: e.target.value })}
          className="w-full rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
        />
      </div>

      {/* Coordinates (X, Y) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="item-x-input"
            className="mb-1 block font-semibold text-[#111111]"
          >
            X ({unit})
          </label>
          <input
            id="item-x-input"
            type="number"
            step="0.25"
            value={displayX}
            onChange={(e) => handleXChange(e.target.value)}
            disabled={item.locked}
            className="w-full rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 font-mono text-xs text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor="item-y-input"
            className="mb-1 block font-semibold text-[#111111]"
          >
            Y ({unit})
          </label>
          <input
            id="item-y-input"
            type="number"
            step="0.25"
            value={displayY}
            onChange={(e) => handleYChange(e.target.value)}
            disabled={item.locked}
            className="w-full rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 font-mono text-xs text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:opacity-50"
          />
        </div>
      </div>

      {/* Dimensions (Width, Height) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="item-w-input"
            className="mb-1 block font-semibold text-[#111111]"
          >
            {item.type === "roundTable"
              ? `Diameter (${unit})`
              : `Width (${unit})`}
          </label>
          <input
            id="item-w-input"
            type="number"
            step="0.1"
            min="0.5"
            value={displayW}
            onChange={(e) => handleWChange(e.target.value)}
            disabled={item.locked}
            className="w-full rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 font-mono text-xs text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor="item-h-input"
            className="mb-1 block font-semibold text-[#111111]"
          >
            {item.type === "roundTable"
              ? `Diameter (${unit})`
              : `Depth (${unit})`}
          </label>
          <input
            id="item-h-input"
            type="number"
            step="0.1"
            min="0.5"
            value={displayH}
            onChange={(e) => handleHChange(e.target.value)}
            disabled={item.locked || item.type === "roundTable"}
            className="w-full rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 font-mono text-xs text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:opacity-50"
          />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="item-rot-input"
            className="font-semibold text-[#111111]"
          >
            Rotation
          </label>
          <span className="font-mono text-[11px] text-[#5A5A5A]">
            {Math.round(item.rotation)}°
          </span>
        </div>
        <input
          id="item-rot-input"
          type="range"
          min="0"
          max="360"
          step="5"
          value={item.rotation}
          onChange={(e) =>
            onUpdate(item.id, { rotation: parseFloat(e.target.value) })
          }
          disabled={item.locked}
          className="mt-1 w-full accent-[#111111] disabled:opacity-50"
          aria-label="Rotation angle in degrees"
        />
      </div>

      {/* Seats (for tables) */}
      {isTable && (
        <div>
          <label
            htmlFor="item-seats-input"
            className="mb-1 block font-semibold text-[#111111]"
          >
            Seats per table
          </label>
          <input
            id="item-seats-input"
            type="number"
            min={item.type === "roundTable" ? 6 : 2}
            max={item.type === "roundTable" ? 12 : 24}
            value={item.seats ?? 8}
            onChange={(e) =>
              onUpdate(item.id, { seats: parseInt(e.target.value, 10) })
            }
            className="w-full rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 font-mono text-xs text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
          />
        </div>
      )}

      {/* Lock Toggle */}
      <div className="flex items-center justify-between border-t border-[#D9D9D9] pt-3">
        <span className="font-medium text-[#111111]">Lock position</span>
        <button
          type="button"
          onClick={() => onUpdate(item.id, { locked: !item.locked })}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            item.locked
              ? "bg-[#111111] text-[#F7F7F7]"
              : "border border-[#D9D9D9] bg-white text-[#5A5A5A] hover:text-[#111111]"
          }`}
          aria-pressed={item.locked}
        >
          {item.locked ? "🔒 Locked" : "🔓 Unlocked"}
        </button>
      </div>

      {/* Action Buttons: Duplicate & Delete */}
      <div className="grid grid-cols-2 gap-2 border-t border-[#D9D9D9] pt-3">
        <button
          type="button"
          onClick={() => onDuplicate(item.id)}
          className="rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 font-semibold text-[#111111] transition-colors hover:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export const VenueInspector = memo(VenueInspectorComponent);
