"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type {
  Design,
  StudioElement,
  TokenContext,
  GuideLines,
} from "@/lib/studio/types";
import { drawDesign } from "@/lib/studio/render";
import { snapElementPosition, clampElementBounds } from "@/lib/studio/geometry";

interface CardStudioCanvasProps {
  design: Design;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElementPosition: (
    id: string,
    x: number,
    y: number,
    commit?: boolean
  ) => void;
  onUpdateElementSize: (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    commit?: boolean
  ) => void;
  onUpdateElementRotation: (
    id: string,
    rotation: number,
    commit?: boolean
  ) => void;
  onUpdateElementText: (id: string, text: string) => void;
  tokenContext?: TokenContext;
  zoom: number;
  guideLines: GuideLines | null;
  setGuideLines: (guides: GuideLines | null) => void;
  className?: string;
}

type DragMode =
  | {
      type: "move";
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    }
  | {
      type: "resize";
      handle: "nw" | "ne" | "se" | "sw";
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
    }
  | {
      type: "rotate";
      centerX: number;
      centerY: number;
      origAngle: number;
      startPointerAngle: number;
    };

export default function CardStudioCanvas({
  design,
  selectedElementId,
  onSelectElement,
  onUpdateElementPosition,
  onUpdateElementSize,
  onUpdateElementRotation,
  onUpdateElementText,
  tokenContext = {},
  zoom = 1.0,
  guideLines,
  setGuideLines,
  className = "",
}: CardStudioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Editing text overlay state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState("");

  const dragRef = useRef<DragMode | null>(null);

  // Currently selected element
  const selectedElement =
    design.elements.find((e) => e.id === selectedElementId) || null;

  // Render canvas via pure drawDesign WYSIWYG engine
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await drawDesign(ctx, design, tokenContext);
  }, [design, tokenContext]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer Interaction Handlers
  const handlePointerDownElement = (
    e: ReactPointerEvent,
    el: StudioElement
  ) => {
    e.stopPropagation();
    onSelectElement(el.id);
    if (el.locked) return;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    dragRef.current = {
      type: "move",
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
    };
  };

  const handlePointerDownResize = (
    e: ReactPointerEvent,
    handle: "nw" | "ne" | "se" | "sw"
  ) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.locked) return;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    dragRef.current = {
      type: "resize",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origX: selectedElement.x,
      origY: selectedElement.y,
      origW: selectedElement.w,
      origH: selectedElement.h,
    };
  };

  const handlePointerDownRotate = (e: ReactPointerEvent) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.locked || !containerRef.current)
      return;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const rect = containerRef.current.getBoundingClientRect();
    const elemCenterX =
      (selectedElement.x + selectedElement.w / 2) * zoom + rect.left;
    const elemCenterY =
      (selectedElement.y + selectedElement.h / 2) * zoom + rect.top;

    const startPointerAngle =
      (Math.atan2(e.clientY - elemCenterY, e.clientX - elemCenterX) * 180) /
      Math.PI;

    dragRef.current = {
      type: "rotate",
      centerX: elemCenterX,
      centerY: elemCenterY,
      origAngle: selectedElement.rotation || 0,
      startPointerAngle,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current || !selectedElement) return;

    const drag = dragRef.current;

    if (drag.type === "move") {
      const deltaX = (e.clientX - drag.startX) / zoom;
      const deltaY = (e.clientY - drag.startY) / zoom;
      const rawX = drag.origX + deltaX;
      const rawY = drag.origY + deltaY;

      // Smart snapping
      const snapped = snapElementPosition(
        rawX,
        rawY,
        selectedElement.w,
        selectedElement.h,
        design.width,
        design.height,
        14,
        false
      );

      // Clamp inside canvas
      const clamped = clampElementBounds(
        { ...selectedElement, x: snapped.x, y: snapped.y },
        design.width,
        design.height
      );

      setGuideLines({
        x: snapped.snappedX ? snapped.guideX : undefined,
        y: snapped.snappedY ? snapped.guideY : undefined,
      });

      onUpdateElementPosition(selectedElement.id, clamped.x, clamped.y, false);
    } else if (drag.type === "resize") {
      const deltaX = (e.clientX - drag.startX) / zoom;
      const deltaY = (e.clientY - drag.startY) / zoom;

      let newX = drag.origX;
      let newY = drag.origY;
      let newW = drag.origW;
      let newH = drag.origH;

      if (drag.handle === "se") {
        newW = Math.max(20, drag.origW + deltaX);
        newH = Math.max(20, drag.origH + deltaY);
      } else if (drag.handle === "sw") {
        newW = Math.max(20, drag.origW - deltaX);
        newX = drag.origX + (drag.origW - newW);
        newH = Math.max(20, drag.origH + deltaY);
      } else if (drag.handle === "ne") {
        newW = Math.max(20, drag.origW + deltaX);
        newH = Math.max(20, drag.origH - deltaY);
        newY = drag.origY + (drag.origH - newH);
      } else if (drag.handle === "nw") {
        newW = Math.max(20, drag.origW - deltaX);
        newX = drag.origX + (drag.origW - newW);
        newH = Math.max(20, drag.origH - deltaY);
        newY = drag.origY + (drag.origH - newH);
      }

      onUpdateElementSize(
        selectedElement.id,
        Math.round(newX),
        Math.round(newY),
        Math.round(newW),
        Math.round(newH),
        false
      );
    } else if (drag.type === "rotate") {
      const currentPointerAngle =
        (Math.atan2(e.clientY - drag.centerY, e.clientX - drag.centerX) * 180) /
        Math.PI;
      const angleDelta = currentPointerAngle - drag.startPointerAngle;
      const newRotation = (Math.round(drag.origAngle + angleDelta) + 360) % 360;

      onUpdateElementRotation(selectedElement.id, newRotation, false);
    }
  };

  const handlePointerUp = () => {
    if (!dragRef.current || !selectedElement) {
      dragRef.current = null;
      setGuideLines(null);
      return;
    }

    if (dragRef.current.type === "move") {
      onUpdateElementPosition(
        selectedElement.id,
        selectedElement.x,
        selectedElement.y,
        true
      );
    } else if (dragRef.current.type === "resize") {
      onUpdateElementSize(
        selectedElement.id,
        selectedElement.x,
        selectedElement.y,
        selectedElement.w,
        selectedElement.h,
        true
      );
    } else if (dragRef.current.type === "rotate") {
      onUpdateElementRotation(
        selectedElement.id,
        selectedElement.rotation,
        true
      );
    }

    dragRef.current = null;
    setGuideLines(null);
  };

  // Keyboard Nudging for selected element
  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (!selectedElement || selectedElement.locked || editingTextId) return;

    const step = e.shiftKey ? 10 : 1;
    let handled = false;

    if (e.key === "ArrowUp") {
      onUpdateElementPosition(
        selectedElement.id,
        selectedElement.x,
        selectedElement.y - step,
        true
      );
      handled = true;
    } else if (e.key === "ArrowDown") {
      onUpdateElementPosition(
        selectedElement.id,
        selectedElement.x,
        selectedElement.y + step,
        true
      );
      handled = true;
    } else if (e.key === "ArrowLeft") {
      onUpdateElementPosition(
        selectedElement.id,
        selectedElement.x - step,
        selectedElement.y,
        true
      );
      handled = true;
    } else if (e.key === "ArrowRight") {
      onUpdateElementPosition(
        selectedElement.id,
        selectedElement.x + step,
        selectedElement.y,
        true
      );
      handled = true;
    }

    if (handled) {
      e.preventDefault();
    }
  };

  // Double Click Text to Edit in Inline Overlay
  const handleDoubleClickElement = (el: StudioElement) => {
    if (el.type === "text") {
      setEditingTextId(el.id);
      setEditTextValue(el.text);
    }
  };

  const handleSaveTextEdit = () => {
    if (editingTextId) {
      onUpdateElementText(editingTextId, editTextValue.slice(0, 300));
      setEditingTextId(null);
    }
  };

  return (
    <div
      ref={containerRef}
      role="region"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={() => onSelectElement(null)}
      className={`relative flex select-none items-center justify-center overflow-auto rounded-xl border border-[#E8DCC8] bg-[#F4EDE2] p-6 focus:outline-none focus:ring-1 focus:ring-[#5B1A2B] ${className}`}
      style={{ minHeight: "520px" }}
      aria-label={`Card canvas, size ${design.width} by ${design.height} pixels, containing ${design.elements.length} elements`}
    >
      {/* Scaled Canvas Container */}
      <div
        className="relative shadow-2xl transition-transform duration-75"
        style={{
          width: design.width * zoom,
          height: design.height * zoom,
        }}
      >
        {/* Real HTML Canvas */}
        <canvas
          ref={canvasRef}
          width={design.width}
          height={design.height}
          className="h-full w-full rounded-sm"
        />

        {/* Center Snapping Guidelines */}
        {guideLines?.x !== undefined && (
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-30 border-r-2 border-dashed border-sky-500 shadow-sm"
            style={{ left: guideLines.x * zoom }}
          />
        )}
        {guideLines?.y !== undefined && (
          <div
            className="pointer-events-none absolute left-0 right-0 z-30 border-b-2 border-dashed border-sky-500 shadow-sm"
            style={{ top: guideLines.y * zoom }}
          />
        )}

        {/* DOM Overlay of Interactive Elements */}
        {design.elements.map((el) => {
          const isSelected = selectedElementId === el.id;

          return (
            <div
              key={el.id}
              data-testid={`studio-element-${el.id}`}
              onPointerDown={(e) => handlePointerDownElement(e, el)}
              onDoubleClick={() => handleDoubleClickElement(el)}
              className={`absolute cursor-move ${
                isSelected
                  ? "ring-2 ring-[#5B1A2B] ring-offset-1"
                  : "hover:ring-1 hover:ring-[#C9A24B]"
              }`}
              style={{
                left: el.x * zoom,
                top: el.y * zoom,
                width: el.w * zoom,
                height: el.h * zoom,
                transform: el.rotation
                  ? `rotate(${el.rotation}deg)`
                  : undefined,
                transformOrigin: "center center",
              }}
            >
              {/* Corner Resize Handles for Selected Element */}
              {isSelected && !el.locked && (
                <>
                  {/* Top Rotation Handle */}
                  <div
                    onPointerDown={handlePointerDownRotate}
                    className="absolute -top-7 left-1/2 h-5 w-5 -translate-x-1/2 cursor-grab rounded-full border-2 border-white bg-[#5B1A2B] shadow-md hover:scale-125"
                    title="Rotate element"
                  >
                    <div className="absolute left-1/2 top-5 h-2 w-0.5 -translate-x-1/2 bg-[#5B1A2B]" />
                  </div>

                  {/* 4 Corners */}
                  <div
                    onPointerDown={(e) => handlePointerDownResize(e, "nw")}
                    className="absolute -left-1.5 -top-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-[#5B1A2B] shadow-sm hover:scale-125"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDownResize(e, "ne")}
                    className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 cursor-nesw-resize rounded-full border-2 border-white bg-[#5B1A2B] shadow-sm hover:scale-125"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDownResize(e, "se")}
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-[#5B1A2B] shadow-sm hover:scale-125"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDownResize(e, "sw")}
                    className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 cursor-nesw-resize rounded-full border-2 border-white bg-[#5B1A2B] shadow-sm hover:scale-125"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Double Click Text Inline Textarea Overlay */}
        {editingTextId && (
          <div
            className="absolute z-40 rounded-lg border-2 border-[#5B1A2B] bg-white p-2 shadow-2xl"
            style={{
              left: (selectedElement?.x || 100) * zoom,
              top: (selectedElement?.y || 100) * zoom,
              width: Math.max(260, (selectedElement?.w || 300) * zoom),
            }}
          >
            <textarea
              rows={3}
              autoFocus
              maxLength={300}
              value={editTextValue}
              onChange={(e) => setEditTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveTextEdit();
                } else if (e.key === "Escape") {
                  setEditingTextId(null);
                }
              }}
              className="w-full text-sm text-[#2B1B14] focus:outline-none"
              placeholder="Edit card text (plain text only)..."
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#6B5848]">
              <span>Press Enter to save, Esc to cancel</span>
              <button
                type="button"
                onClick={handleSaveTextEdit}
                className="rounded bg-[#5B1A2B] px-2.5 py-0.5 font-semibold text-[#FBF6EE]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
