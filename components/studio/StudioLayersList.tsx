"use client";

import React from "react";
import type { StudioElement } from "@/lib/studio/types";

interface StudioLayersListProps {
  elements: StudioElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  onReorderLayer: (
    id: string,
    direction: "up" | "down" | "top" | "bottom"
  ) => void;
  onToggleLock: (id: string) => void;
  onDeleteElement: (id: string) => void;
  className?: string;
}

export default function StudioLayersList({
  elements,
  selectedElementId,
  onSelectElement,
  onReorderLayer,
  onToggleLock,
  onDeleteElement,
  className = "",
}: StudioLayersListProps) {
  // Layers are rendered in visual order (top-most layer first)
  const reversed = [...elements].reverse();

  const getElementLabel = (el: StudioElement): string => {
    if (el.name) return el.name;
    if (el.type === "text") {
      const truncated =
        el.text.length > 20 ? `${el.text.slice(0, 20)}…` : el.text;
      return truncated ? `Text: "${truncated}"` : "Text Element";
    }
    if (el.type === "token") return `Token: {${el.tokenType}}`;
    if (el.type === "sticker") return `Sticker: ${el.stickerType}`;
    if (el.type === "shape") return `Shape: ${el.shapeType}`;
    return "Element";
  };

  const getElementIcon = (type: string) => {
    switch (type) {
      case "text":
        return "🔤";
      case "token":
        return "🏷️";
      case "sticker":
        return "🌸";
      case "shape":
        return "📐";
      default:
        return "📄";
    }
  };

  return (
    <div
      className={`shadow-xs rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-3 ${className}`}
      role="region"
      aria-label="Layers manager"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
          Layers ({elements.length})
        </h4>
        <span className="text-[11px] text-[#6B5848]">Top to bottom</span>
      </div>

      {elements.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#6B5848]">
          No elements added yet. Choose a template or add text and stickers from
          the left panel.
        </div>
      ) : (
        <div
          className="max-h-56 space-y-1.5 overflow-y-auto pr-1"
          role="list"
          aria-label="Elements list"
        >
          {reversed.map((el) => {
            const isSelected = selectedElementId === el.id;

            return (
              <div
                key={el.id}
                role="listitem"
                className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "border-[#5B1A2B] bg-[#5B1A2B] text-[#FBF6EE]"
                    : "border-[#E8DCC8] bg-white text-[#2B1B14] hover:bg-[#FCEBD3]"
                }`}
              >
                {/* Element Selection Button (Real Button for Accessibility) */}
                <button
                  type="button"
                  onClick={() => onSelectElement(el.id)}
                  aria-pressed={isSelected}
                  className="flex flex-1 items-center gap-2 truncate text-left focus:outline-none focus-visible:underline"
                >
                  <span aria-hidden="true">{getElementIcon(el.type)}</span>
                  <span className="truncate font-medium">
                    {getElementLabel(el)}
                  </span>
                </button>

                {/* Layer Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {/* Move Up */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderLayer(el.id, "up");
                    }}
                    title="Move Layer Up"
                    aria-label={`Move ${getElementLabel(el)} up`}
                    className={`rounded p-1 transition-colors hover:bg-black/10 focus:outline-none focus:ring-1 ${
                      isSelected ? "text-[#FBF6EE]" : "text-[#6B5848]"
                    }`}
                  >
                    ▲
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderLayer(el.id, "down");
                    }}
                    title="Move Layer Down"
                    aria-label={`Move ${getElementLabel(el)} down`}
                    className={`rounded p-1 transition-colors hover:bg-black/10 focus:outline-none focus:ring-1 ${
                      isSelected ? "text-[#FBF6EE]" : "text-[#6B5848]"
                    }`}
                  >
                    ▼
                  </button>

                  {/* Lock/Unlock */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock(el.id);
                    }}
                    title={el.locked ? "Unlock element" : "Lock element"}
                    aria-label={`${el.locked ? "Unlock" : "Lock"} ${getElementLabel(el)}`}
                    className={`rounded p-1 transition-colors hover:bg-black/10 focus:outline-none focus:ring-1 ${
                      isSelected ? "text-[#FBF6EE]" : "text-[#6B5848]"
                    }`}
                  >
                    {el.locked ? "🔒" : "🔓"}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteElement(el.id);
                    }}
                    title="Delete element"
                    aria-label={`Delete ${getElementLabel(el)}`}
                    className={`rounded p-1 transition-colors hover:bg-red-500 hover:text-white focus:outline-none focus:ring-1 ${
                      isSelected ? "text-[#FBF6EE]" : "text-red-700"
                    }`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
