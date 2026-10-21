"use client";

import React, { useMemo } from "react";
import type { StudioElement } from "@/lib/studio/types";
import { checkTextContrast } from "@/lib/studio/contrast";
import type { EventPalette } from "@/lib/schemas";

interface StudioInspectorProps {
  element: StudioElement | null;
  onUpdateElement: (id: string, updates: Partial<StudioElement>) => void;
  onAlignElement: (id: string, alignment: "center-h" | "center-v") => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onToggleLock: (id: string) => void;
  palette?: EventPalette | null;
  backgroundLuminance?: number;
  className?: string;
}

export const CURATED_FONTS = [
  { label: "Instrument Serif", value: "Instrument Serif" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "DM Serif Display", value: "DM Serif Display" },
  { label: "Hanken Grotesk (Sans)", value: "Hanken Grotesk" },
  { label: "Great Vibes (Script)", value: "Great Vibes" },
  { label: "Devanagari (Hindi/Sanskrit)", value: "Noto Serif Devanagari" },
  { label: "Urdu (Nastaliq)", value: "Noto Nastaliq Urdu" },
  { label: "Telugu", value: "Noto Serif Telugu" },
];

export default function StudioInspector({
  element,
  onUpdateElement,
  onAlignElement,
  onDuplicateElement,
  onDeleteElement,
  onToggleLock,
  palette,
  backgroundLuminance = 0.95,
  className = "",
}: StudioInspectorProps) {
  const paletteColors = useMemo(() => {
    return palette?.colors || ["#5B1A2B", "#E07A1F", "#FFFDF8", "#C9A24B"];
  }, [palette]);

  if (!element) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 text-center text-xs text-[#6B5848] ${className}`}
      >
        <span className="mb-2 text-2xl" aria-hidden="true">
          👆
        </span>
        <p className="font-medium text-[#2B1B14]">No element selected</p>
        <p className="mt-1">
          Click an element on the canvas or pick one from the Layers list below
          to edit its properties.
        </p>
      </div>
    );
  }

  // Evaluate text contrast if element has text color
  const textColor =
    "color" in element && element.color ? element.color : "#2B1B14";
  const contrastResult = checkTextContrast(backgroundLuminance, textColor);

  return (
    <div
      className={`shadow-xs rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-4 ${className}`}
      role="region"
      aria-label="Element properties inspector"
    >
      {/* Header */}
      <div className="mb-3.5 flex items-center justify-between border-b border-[#E8DCC8] pb-2.5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
            {element.type} Properties
          </h3>
          <span className="text-[11px] text-[#6B5848]">
            ID: {element.id.slice(0, 10)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleLock(element.id)}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            element.locked
              ? "bg-[#5B1A2B] text-[#FBF6EE]"
              : "border border-[#E8DCC8] bg-white text-[#2B1B14] hover:bg-[#FCEBD3]"
          }`}
          title={element.locked ? "Unlock element" : "Lock element"}
        >
          <span>{element.locked ? "🔒 Locked" : "🔓 Unlocked"}</span>
        </button>
      </div>

      {/* Position & Dimensions */}
      <div className="mb-4 space-y-2">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B5848]">
          Position & Size
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label htmlFor="elem-x" className="mb-0.5 block text-[#6B5848]">
              X (px)
            </label>
            <input
              id="elem-x"
              type="number"
              value={element.x}
              disabled={element.locked}
              onChange={(e) =>
                onUpdateElement(element.id, {
                  x: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full rounded border border-[#E8DCC8] bg-white px-2 py-1 text-[#2B1B14] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
            />
          </div>
          <div>
            <label htmlFor="elem-y" className="mb-0.5 block text-[#6B5848]">
              Y (px)
            </label>
            <input
              id="elem-y"
              type="number"
              value={element.y}
              disabled={element.locked}
              onChange={(e) =>
                onUpdateElement(element.id, {
                  y: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full rounded border border-[#E8DCC8] bg-white px-2 py-1 text-[#2B1B14] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
            />
          </div>
          <div>
            <label htmlFor="elem-w" className="mb-0.5 block text-[#6B5848]">
              Width
            </label>
            <input
              id="elem-w"
              type="number"
              value={element.w}
              disabled={element.locked}
              onChange={(e) =>
                onUpdateElement(element.id, {
                  w: Math.max(10, parseInt(e.target.value, 10) || 10),
                })
              }
              className="w-full rounded border border-[#E8DCC8] bg-white px-2 py-1 text-[#2B1B14] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
            />
          </div>
          <div>
            <label htmlFor="elem-h" className="mb-0.5 block text-[#6B5848]">
              Height
            </label>
            <input
              id="elem-h"
              type="number"
              value={element.h}
              disabled={element.locked}
              onChange={(e) =>
                onUpdateElement(element.id, {
                  h: Math.max(10, parseInt(e.target.value, 10) || 10),
                })
              }
              className="w-full rounded border border-[#E8DCC8] bg-white px-2 py-1 text-[#2B1B14] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
            />
          </div>
        </div>

        {/* Alignment Shortcuts */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={element.locked}
            onClick={() => onAlignElement(element.id, "center-h")}
            className="flex-1 rounded border border-[#E8DCC8] bg-white px-2 py-1 text-xs font-medium text-[#2B1B14] hover:bg-[#FCEBD3] focus:outline-none focus:ring-1 disabled:opacity-50"
          >
            Align Center X
          </button>
          <button
            type="button"
            disabled={element.locked}
            onClick={() => onAlignElement(element.id, "center-v")}
            className="flex-1 rounded border border-[#E8DCC8] bg-white px-2 py-1 text-xs font-medium text-[#2B1B14] hover:bg-[#FCEBD3] focus:outline-none focus:ring-1 disabled:opacity-50"
          >
            Align Center Y
          </button>
        </div>
      </div>

      {/* Rotation & Opacity */}
      <div className="mb-4 space-y-2 border-t border-[#E8DCC8] pt-3">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="elem-rot" className="text-[#6B5848]">
            Rotation: {element.rotation}°
          </label>
          <input
            id="elem-rot"
            type="range"
            min="0"
            max="360"
            value={element.rotation}
            disabled={element.locked}
            onChange={(e) =>
              onUpdateElement(element.id, {
                rotation: parseInt(e.target.value, 10),
              })
            }
            className="w-32 accent-[#5B1A2B]"
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="elem-opacity" className="text-[#6B5848]">
            Opacity: {Math.round(element.opacity * 100)}%
          </label>
          <input
            id="elem-opacity"
            type="range"
            min="0.05"
            max="1.0"
            step="0.05"
            value={element.opacity}
            disabled={element.locked}
            onChange={(e) =>
              onUpdateElement(element.id, {
                opacity: parseFloat(e.target.value),
              })
            }
            className="w-32 accent-[#5B1A2B]"
          />
        </div>
      </div>

      {/* Specific Controls: Text & Token Elements */}
      {(element.type === "text" || element.type === "token") && (
        <div className="mb-4 space-y-3 border-t border-[#E8DCC8] pt-3 text-xs">
          <span className="block font-semibold uppercase tracking-wider text-[#6B5848]">
            Typography & Content
          </span>

          {element.type === "text" && (
            <div>
              <label htmlFor="elem-text" className="mb-1 block text-[#6B5848]">
                Text ({element.text.length}/300)
              </label>
              <textarea
                id="elem-text"
                rows={2}
                maxLength={300}
                value={element.text}
                disabled={element.locked}
                onChange={(e) =>
                  onUpdateElement(element.id, { text: e.target.value })
                }
                className="w-full rounded border border-[#E8DCC8] bg-white p-2 text-[#2B1B14] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
              />
            </div>
          )}

          <div>
            <label htmlFor="elem-font" className="mb-1 block text-[#6B5848]">
              Font Family
            </label>
            <select
              id="elem-font"
              value={element.fontFamily || "Instrument Serif"}
              disabled={element.locked}
              onChange={(e) =>
                onUpdateElement(element.id, { fontFamily: e.target.value })
              }
              className="w-full rounded border border-[#E8DCC8] bg-white px-2 py-1.5 text-[#2B1B14] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
            >
              {CURATED_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="elem-fontsize"
                className="mb-0.5 block text-[#6B5848]"
              >
                Font Size ({element.fontSize || 36}px)
              </label>
              <input
                id="elem-fontsize"
                type="number"
                min="10"
                max="180"
                value={element.fontSize || 36}
                disabled={element.locked}
                onChange={(e) =>
                  onUpdateElement(element.id, {
                    fontSize: parseInt(e.target.value, 10) || 12,
                  })
                }
                className="w-full rounded border border-[#E8DCC8] bg-white px-2 py-1 text-[#2B1B14]"
              />
            </div>
            <div>
              <label
                htmlFor="elem-align"
                className="mb-0.5 block text-[#6B5848]"
              >
                Alignment
              </label>
              <div className="flex gap-1" id="elem-align">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    disabled={element.locked}
                    onClick={() => onUpdateElement(element.id, { align })}
                    className={`flex-1 rounded border py-1 text-xs uppercase ${
                      element.align === align
                        ? "border-[#5B1A2B] bg-[#5B1A2B] text-white"
                        : "border-[#E8DCC8] bg-white text-[#2B1B14]"
                    }`}
                  >
                    {align[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color & Palette Swatches */}
          <div>
            <label
              htmlFor="elem-text-color"
              className="mb-1 block text-[#6B5848]"
            >
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="elem-text-color"
                type="color"
                aria-label="Text color"
                value={textColor}
                disabled={element.locked}
                onChange={(e) =>
                  onUpdateElement(element.id, { color: e.target.value })
                }
                className="h-8 w-10 cursor-pointer rounded border border-[#E8DCC8]"
              />
              <div className="flex flex-wrap gap-1">
                {paletteColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onUpdateElement(element.id, { color })}
                    style={{ backgroundColor: color }}
                    className="shadow-xs h-6 w-6 rounded-full border border-black/20 focus:outline-none focus:ring-1"
                    title={`Set color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Readability Contrast Warning Badge */}
          <div
            className={`rounded-lg border p-2 text-[11px] ${
              contrastResult.isPassing
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-amber-300 bg-amber-50 text-amber-950"
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span>
                {contrastResult.isPassing
                  ? "✓ Contrast Passing"
                  : "⚠ Low Contrast"}
              </span>
              <span>{contrastResult.contrast}:1</span>
            </div>
            {!contrastResult.isPassing && (
              <div className="mt-1">
                <p>Text contrast is below 4.5:1 on this background.</p>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(element.id, {
                      color: contrastResult.suggestedColor,
                    })
                  }
                  className="mt-1.5 inline-flex items-center rounded bg-[#5B1A2B] px-2 py-0.5 text-[10px] font-semibold text-[#FBF6EE] hover:bg-[#3A0F1C]"
                >
                  Use recommended color ({contrastResult.suggestedColor})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Specific Controls: Shape Element */}
      {element.type === "shape" && (
        <div className="mb-4 space-y-3 border-t border-[#E8DCC8] pt-3 text-xs">
          <span className="block font-semibold uppercase tracking-wider text-[#6B5848]">
            Shape Appearance
          </span>
          {element.shapeType !== "line" && (
            <div>
              <label
                htmlFor="elem-shape-fill"
                className="mb-1 block text-[#6B5848]"
              >
                Fill Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="elem-shape-fill"
                  type="color"
                  aria-label="Shape fill color"
                  value={element.fill || "#FFFFFF"}
                  disabled={element.locked}
                  onChange={(e) =>
                    onUpdateElement(element.id, { fill: e.target.value })
                  }
                  className="h-8 w-10 cursor-pointer rounded border border-[#E8DCC8]"
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(element.id, { fill: undefined })
                  }
                  className="rounded border border-[#E8DCC8] bg-white px-2 py-1 text-[11px] text-[#6B5848]"
                >
                  No Fill
                </button>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="elem-shape-stroke"
              className="mb-1 block text-[#6B5848]"
            >
              Border / Stroke
            </label>
            <div className="flex items-center gap-2">
              <input
                id="elem-shape-stroke"
                type="color"
                aria-label="Shape stroke color"
                value={element.stroke || "#C9A24B"}
                disabled={element.locked}
                onChange={(e) =>
                  onUpdateElement(element.id, { stroke: e.target.value })
                }
                className="h-8 w-10 cursor-pointer rounded border border-[#E8DCC8]"
              />
              <input
                id="elem-shape-stroke-width"
                type="number"
                aria-label="Shape stroke width"
                min="0"
                max="24"
                value={element.strokeWidth ?? 2}
                disabled={element.locked}
                onChange={(e) =>
                  onUpdateElement(element.id, {
                    strokeWidth: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-16 rounded border border-[#E8DCC8] bg-white px-2 py-1"
                placeholder="Width"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons: Duplicate & Delete */}
      <div className="flex gap-2 border-t border-[#E8DCC8] pt-3">
        <button
          type="button"
          onClick={() => onDuplicateElement(element.id)}
          className="flex-1 rounded-lg border border-[#E8DCC8] bg-white py-1.5 text-xs font-semibold text-[#2B1B14] hover:bg-[#FCEBD3] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => onDeleteElement(element.id)}
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
