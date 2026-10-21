"use client";

import {
  useState,
  useRef,
  useCallback,
  memo,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { FloorItem, Room, UnitSystem } from "@/lib/floor";
import {
  snapToGrid,
  clampToRoom,
  seatPositions,
  roundFloat,
  METERS_TO_FEET,
} from "@/lib/floor";
import { VenuePatterns } from "./VenuePatterns";

interface VenueCanvasProps {
  room: Room;
  items: FloorItem[];
  selectedId: string | null;
  unit: UnitSystem;
  snapEnabled: boolean;
  zoom: number;
  violationItemIds: Set<string>;
  onSelect: (id: string | null) => void;
  onMoveItem: (id: string, x: number, y: number, snap?: boolean) => void;
  onResizeItem: (id: string, w: number, h: number, snap?: boolean) => void;
  onRotateItem: (id: string, rotation: number) => void;
  onDeleteItem: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onAnnounce: (msg: string) => void;
}

type DragMode =
  | {
      type: "move";
      itemId: string;
      startX: number;
      startY: number;
      itemStartX: number;
      itemStartY: number;
    }
  | {
      type: "resize";
      itemId: string;
      corner: "nw" | "ne" | "se" | "sw";
      startX: number;
      startY: number;
      itemStartX: number;
      itemStartY: number;
      itemStartW: number;
      itemStartH: number;
    }
  | {
      type: "rotate";
      itemId: string;
      startAngle: number;
      itemStartRot: number;
      cx: number;
      cy: number;
    };

function VenueCanvasComponent({
  room,
  items,
  selectedId,
  unit,
  snapEnabled,
  zoom,
  violationItemIds,
  onSelect,
  onMoveItem,
  onResizeItem,
  onRotateItem,
  onDeleteItem,
  onUndo,
  onRedo,
  onAnnounce,
}: VenueCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);

  // Transient state for smooth dragging of only the active item
  const [transientItem, setTransientItem] = useState<FloorItem | null>(null);

  // Convert client pointer coordinates to SVG room meter coordinates
  const clientToMeters = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();

      let vbX = 0;
      let vbY = 0;
      let vbWidth = room.widthM;
      let vbHeight = room.heightM;

      const baseVal = svgRef.current.viewBox?.baseVal;
      if (baseVal && baseVal.width > 0) {
        vbX = baseVal.x;
        vbY = baseVal.y;
        vbWidth = baseVal.width;
        vbHeight = baseVal.height;
      } else {
        const vbAttr = svgRef.current.getAttribute("viewBox");
        if (vbAttr) {
          const parts = vbAttr.split(/[\s,]+/).map(Number);
          if (parts.length === 4 && !parts.some(isNaN)) {
            [vbX, vbY, vbWidth, vbHeight] = parts;
          }
        }
      }

      const rectW = rect.width || 800;
      const rectH = rect.height || 600;
      const pxX = clientX - rect.left;
      const pxY = clientY - rect.top;
      const meterX = vbX + (pxX / rectW) * vbWidth;
      const meterY = vbY + (pxY / rectH) * vbHeight;
      return { x: meterX, y: meterY };
    },
    [room.widthM, room.heightM]
  );

  const handlePointerDownItem = (
    e: ReactPointerEvent<SVGElement>,
    item: FloorItem
  ) => {
    e.stopPropagation();
    onSelect(item.id);

    if (item.locked) return;

    if ("setPointerCapture" in e.currentTarget) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const { x: mX, y: mY } = clientToMeters(e.clientX, e.clientY);
    setDragMode({
      type: "move",
      itemId: item.id,
      startX: mX,
      startY: mY,
      itemStartX: item.x,
      itemStartY: item.y,
    });
    setTransientItem(item);
  };

  const handlePointerDownResize = (
    e: ReactPointerEvent<SVGElement>,
    item: FloorItem,
    corner: "nw" | "ne" | "se" | "sw"
  ) => {
    e.stopPropagation();
    if (item.locked) return;

    if ("setPointerCapture" in e.currentTarget) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const { x: mX, y: mY } = clientToMeters(e.clientX, e.clientY);
    setDragMode({
      type: "resize",
      itemId: item.id,
      corner,
      startX: mX,
      startY: mY,
      itemStartX: item.x,
      itemStartY: item.y,
      itemStartW: item.w,
      itemStartH: item.h,
    });
    setTransientItem(item);
  };

  const handlePointerDownRotate = (
    e: ReactPointerEvent<SVGElement>,
    item: FloorItem
  ) => {
    e.stopPropagation();
    if (item.locked) return;

    if ("setPointerCapture" in e.currentTarget) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const { x: mX, y: mY } = clientToMeters(e.clientX, e.clientY);
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const startAngle = (Math.atan2(mY - cy, mX - cx) * 180) / Math.PI;

    setDragMode({
      type: "rotate",
      itemId: item.id,
      startAngle,
      itemStartRot: item.rotation,
      cx,
      cy,
    });
    setTransientItem(item);
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragMode || !transientItem) return;

    const { x: mX, y: mY } = clientToMeters(e.clientX, e.clientY);
    const snap = e.altKey ? false : snapEnabled;

    if (dragMode.type === "move") {
      const dx = mX - dragMode.startX;
      const dy = mY - dragMode.startY;
      const rawX = dragMode.itemStartX + dx;
      const rawY = dragMode.itemStartY + dy;
      const nextX = snap ? snapToGrid(rawX) : roundFloat(rawX);
      const nextY = snap ? snapToGrid(rawY) : roundFloat(rawY);
      const clamped = clampToRoom(
        { ...transientItem, x: nextX, y: nextY },
        room
      );
      setTransientItem(clamped);
    } else if (dragMode.type === "resize") {
      const dx = mX - dragMode.startX;
      const dy = mY - dragMode.startY;
      let nextW = dragMode.itemStartW;
      let nextH = dragMode.itemStartH;

      if (dragMode.corner === "se") {
        nextW = Math.max(0.6, dragMode.itemStartW + dx);
        nextH = Math.max(0.6, dragMode.itemStartH + dy);
      } else if (dragMode.corner === "sw") {
        nextW = Math.max(0.6, dragMode.itemStartW - dx);
        nextH = Math.max(0.6, dragMode.itemStartH + dy);
      } else if (dragMode.corner === "ne") {
        nextW = Math.max(0.6, dragMode.itemStartW + dx);
        nextH = Math.max(0.6, dragMode.itemStartH - dy);
      } else if (dragMode.corner === "nw") {
        nextW = Math.max(0.6, dragMode.itemStartW - dx);
        nextH = Math.max(0.6, dragMode.itemStartH - dy);
      }

      if (transientItem.type === "roundTable") {
        // Keep 1:1 circle diameter
        const maxDim = Math.max(nextW, nextH);
        nextW = maxDim;
        nextH = maxDim;
      }

      const finalW = snap ? snapToGrid(nextW) : roundFloat(nextW);
      const finalH = snap ? snapToGrid(nextH) : roundFloat(nextH);
      const clamped = clampToRoom(
        { ...transientItem, w: finalW, h: finalH },
        room
      );
      setTransientItem(clamped);
    } else if (dragMode.type === "rotate") {
      const curAngle =
        (Math.atan2(mY - dragMode.cy, mX - dragMode.cx) * 180) / Math.PI;
      const deltaAngle = curAngle - dragMode.startAngle;
      let nextRot = (dragMode.itemStartRot + deltaAngle) % 360;
      if (nextRot < 0) nextRot += 360;
      if (snap) {
        nextRot = Math.round(nextRot / 15) * 15; // 15-deg steps
      }
      setTransientItem({ ...transientItem, rotation: roundFloat(nextRot) });
    }
  };

  const handlePointerUp = () => {
    if (!dragMode || !transientItem) return;

    if (dragMode.type === "move") {
      onMoveItem(transientItem.id, transientItem.x, transientItem.y, false);
      onAnnounce(
        `Moved ${transientItem.label} to ${transientItem.x} by ${transientItem.y} meters`
      );
    } else if (dragMode.type === "resize") {
      onResizeItem(transientItem.id, transientItem.w, transientItem.h, false);
      onAnnounce(
        `Resized ${transientItem.label} to ${transientItem.w} by ${transientItem.h} meters`
      );
    } else if (dragMode.type === "rotate") {
      onRotateItem(transientItem.id, transientItem.rotation);
      onAnnounce(
        `Rotated ${transientItem.label} to ${Math.round(transientItem.rotation)} degrees`
      );
    }

    setDragMode(null);
    setTransientItem(null);
  };

  // Keyboard navigation & accessibility on focused items
  const handleItemKeyDown = (e: KeyboardEvent<SVGElement>, item: FloorItem) => {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    if (isCmdOrCtrl && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        onRedo();
        onAnnounce("Redid last action");
      } else {
        onUndo();
        onAnnounce("Undid last action");
      }
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onDeleteItem(item.id);
      onAnnounce(`Deleted ${item.label}`);
      return;
    }

    if (e.key.toLowerCase() === "r" && !item.locked) {
      e.preventDefault();
      const step = e.shiftKey ? -15 : 15;
      let nextRot = (item.rotation + step) % 360;
      if (nextRot < 0) nextRot += 360;
      onRotateItem(item.id, nextRot);
      onAnnounce(`Rotated ${item.label} to ${nextRot} degrees`);
      return;
    }

    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
      !item.locked
    ) {
      e.preventDefault();
      const step = e.shiftKey ? 1.0 : 0.25;
      let nextX = item.x;
      let nextY = item.y;

      if (e.key === "ArrowUp") nextY -= step;
      if (e.key === "ArrowDown") nextY += step;
      if (e.key === "ArrowLeft") nextX -= step;
      if (e.key === "ArrowRight") nextX += step;

      onMoveItem(item.id, nextX, nextY, true);
      onAnnounce(`Nudged ${item.label} to ${nextX} by ${nextY} meters`);
    }
  };

  // Compute SVG viewBox based on room size and zoom factor
  const marginM = 1.2;
  const baseVbWidth = room.widthM + marginM * 2;
  const baseVbHeight = room.heightM + marginM * 2;
  const vbWidth = baseVbWidth / zoom;
  const vbHeight = baseVbHeight / zoom;
  const vbX = -marginM - (vbWidth - baseVbWidth) / 2;
  const vbY = -marginM - (vbHeight - baseVbHeight) / 2;

  // Selected item reference (incorporating live transient drag updates)
  const activeSelected =
    transientItem && transientItem.id === selectedId
      ? transientItem
      : items.find((it) => it.id === selectedId);

  return (
    <div className="relative select-none bg-[#FAFAFA] p-2 sm:p-4">
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${vbWidth} ${vbHeight}`}
        className="h-auto w-full touch-none rounded-xl border border-[#D9D9D9] shadow-inner"
        role="region"
        aria-label={`Interactive venue floor plan: ${room.venueType}, ${room.widthM} by ${room.heightM} meters.`}
        onClick={() => onSelect(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <title>{`Floor Plan: ${room.venueType}`}</title>
        <desc>
          {`Venue designer layout with ${items.length} fixtures in a ${room.widthM} by ${room.heightM} meter room. Use arrow keys to move, R to rotate, Delete to remove.`}
        </desc>

        {/* Procedural Pattern Definitions */}
        <VenuePatterns />

        {/* Room Floor Surface with Venue Pattern */}
        <rect
          x="0"
          y="0"
          width={room.widthM}
          height={room.heightM}
          rx="0.4"
          fill={`url(#venue-pattern-${room.venueType.replace(/\s+/g, "-")})`}
          stroke="#111111"
          strokeWidth="0.1"
        />

        {/* Room Border Outer Glow */}
        <rect
          x="0"
          y="0"
          width={room.widthM}
          height={room.heightM}
          rx="0.4"
          fill="none"
          stroke="#5A5A5A"
          strokeWidth="0.04"
          strokeDasharray="0.5 0.5"
          opacity="0.6"
        />

        {/* Fixtures Layer */}
        {items.map((rawItem) => {
          // If this item is being actively dragged, render the transient version
          const item =
            transientItem && transientItem.id === rawItem.id
              ? transientItem
              : rawItem;

          const isSelected = item.id === selectedId;
          const hasViolation = violationItemIds.has(item.id);
          const cx = item.x + item.w / 2;
          const cy = item.y + item.h / 2;

          const seats = seatPositions(item);

          const ariaText = `${item.label}${
            item.seats ? `, ${item.seats} seats` : ""
          }, at ${item.x.toFixed(1)} by ${item.y.toFixed(1)} meters${
            item.locked ? ", locked" : ""
          }`;

          return (
            <g
              key={item.id}
              tabIndex={0}
              role="button"
              aria-label={ariaText}
              aria-pressed={isSelected}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.id);
              }}
              onPointerDown={(e) => handlePointerDownItem(e, item)}
              onKeyDown={(e) => handleItemKeyDown(e, item)}
              className="cursor-move focus:outline-none"
            >
              {/* Chair dots for tables */}
              {seats.map((s) => (
                <circle
                  key={`seat_${s.seatIndex}`}
                  cx={s.x}
                  cy={s.y}
                  r="0.18"
                  fill="var(--palette-1, #111111)"
                  stroke="#FFFFFF"
                  strokeWidth="0.04"
                  opacity="0.9"
                />
              ))}

              {/* Main Item Geometry with Rotation */}
              <g transform={`rotate(${item.rotation} ${cx} ${cy})`}>
                {item.type === "roundTable" ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={item.w / 2}
                    fill="#FFFFFF"
                    stroke={
                      hasViolation
                        ? "#DC2626"
                        : isSelected
                          ? "#111111"
                          : "var(--palette-1, #444444)"
                    }
                    strokeWidth={
                      hasViolation ? "0.14" : isSelected ? "0.10" : "0.06"
                    }
                    className="transition-[stroke,stroke-width] duration-150"
                  />
                ) : (
                  <rect
                    x={item.x}
                    y={item.y}
                    width={item.w}
                    height={item.h}
                    rx="0.25"
                    fill={
                      item.type === "stage" || item.type === "mandap"
                        ? "var(--palette-1, #111111)"
                        : item.type === "danceFloor"
                          ? "var(--palette-2, #800020)"
                          : item.type === "buffet" || item.type === "bar"
                            ? "var(--palette-3, #D4AF37)"
                            : "#FFFFFF"
                    }
                    fillOpacity={
                      item.type === "longTable" || item.type === "pillar"
                        ? "1"
                        : "0.2"
                    }
                    stroke={
                      hasViolation
                        ? "#DC2626"
                        : isSelected
                          ? "#111111"
                          : item.type === "stage"
                            ? "var(--palette-1, #111111)"
                            : "var(--palette-2, #555555)"
                    }
                    strokeWidth={
                      hasViolation ? "0.14" : isSelected ? "0.10" : "0.06"
                    }
                    strokeDasharray={
                      item.type === "zone" ? "0.3 0.15" : undefined
                    }
                    className="transition-[stroke,stroke-width] duration-150"
                  />
                )}

                {/* Fixture Centered Label */}
                <text
                  x={cx}
                  y={cy + 0.1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="0.45"
                  fontWeight="600"
                  fill="#111111"
                  className="pointer-events-none select-none"
                  style={{
                    letterSpacing: "0.02em",
                  }}
                >
                  {item.label}
                </text>

                {/* Lock Icon */}
                {item.locked && (
                  <text
                    x={cx}
                    y={cy - 0.45}
                    textAnchor="middle"
                    fontSize="0.4"
                    fill="#5A5A5A"
                    className="pointer-events-none select-none"
                  >
                    🔒
                  </text>
                )}

                {/* Violation Warning Symbol */}
                {hasViolation && (
                  <text
                    x={item.x + item.w - 0.25}
                    y={item.y + 0.35}
                    textAnchor="middle"
                    fontSize="0.5"
                    className="pointer-events-none select-none"
                  >
                    ⚠️
                  </text>
                )}
              </g>

              {/* Selection Border Glow */}
              {isSelected && (
                <rect
                  x={item.x - 0.12}
                  y={item.y - 0.12}
                  width={item.w + 0.24}
                  height={item.h + 0.24}
                  rx="0.3"
                  fill="none"
                  stroke="#111111"
                  strokeWidth="0.05"
                  strokeDasharray="0.3 0.15"
                  transform={`rotate(${item.rotation} ${cx} ${cy})`}
                  className="pointer-events-none"
                />
              )}
            </g>
          );
        })}

        {/* Selected Item Resize and Rotation Controls */}
        {activeSelected && !activeSelected.locked && (
          <g
            transform={`rotate(${activeSelected.rotation} ${activeSelected.x + activeSelected.w / 2} ${activeSelected.y + activeSelected.h / 2})`}
          >
            {/* Rotation Stalk and Handle Knob */}
            <line
              x1={activeSelected.x + activeSelected.w / 2}
              y1={activeSelected.y}
              x2={activeSelected.x + activeSelected.w / 2}
              y2={activeSelected.y - 0.7}
              stroke="#111111"
              strokeWidth="0.04"
            />
            <circle
              cx={activeSelected.x + activeSelected.w / 2}
              cy={activeSelected.y - 0.7}
              r="0.28"
              fill="#FFFFFF"
              stroke="#111111"
              strokeWidth="0.06"
              className="cursor-crosshair transition-transform hover:scale-125"
              onPointerDown={(e) => handlePointerDownRotate(e, activeSelected)}
              aria-label="Rotate fixture handle"
            />

            {/* 4 Corner Resize Knobs */}
            <circle
              cx={activeSelected.x}
              cy={activeSelected.y}
              r="0.22"
              fill="#FFFFFF"
              stroke="#111111"
              strokeWidth="0.05"
              className="cursor-nwse-resize hover:scale-125"
              onPointerDown={(e) =>
                handlePointerDownResize(e, activeSelected, "nw")
              }
              aria-label="Resize northwest handle"
            />
            <circle
              cx={activeSelected.x + activeSelected.w}
              cy={activeSelected.y}
              r="0.22"
              fill="#FFFFFF"
              stroke="#111111"
              strokeWidth="0.05"
              className="cursor-nesw-resize hover:scale-125"
              onPointerDown={(e) =>
                handlePointerDownResize(e, activeSelected, "ne")
              }
              aria-label="Resize northeast handle"
            />
            <circle
              cx={activeSelected.x + activeSelected.w}
              cy={activeSelected.y + activeSelected.h}
              r="0.22"
              fill="#FFFFFF"
              stroke="#111111"
              strokeWidth="0.05"
              className="cursor-nwse-resize hover:scale-125"
              onPointerDown={(e) =>
                handlePointerDownResize(e, activeSelected, "se")
              }
              aria-label="Resize southeast handle"
            />
            <circle
              cx={activeSelected.x}
              cy={activeSelected.y + activeSelected.h}
              r="0.22"
              fill="#FFFFFF"
              stroke="#111111"
              strokeWidth="0.05"
              className="cursor-nesw-resize hover:scale-125"
              onPointerDown={(e) =>
                handlePointerDownResize(e, activeSelected, "sw")
              }
              aria-label="Resize southwest handle"
            />
          </g>
        )}

        {/* Scale Rule in Bottom Corner */}
        <g transform={`translate(0.5, ${room.heightM - 0.5})`}>
          <rect
            x="0"
            y="-0.3"
            width="2.0"
            height="0.4"
            rx="0.08"
            fill="#FFFFFF"
            fillOpacity="0.9"
            stroke="#D9D9D9"
            strokeWidth="0.03"
          />
          <line
            x1="0.1"
            y1="-0.1"
            x2="1.9"
            y2="-0.1"
            stroke="#111111"
            strokeWidth="0.04"
          />
          <line
            x1="0.1"
            y1="-0.2"
            x2="0.1"
            y2="0"
            stroke="#111111"
            strokeWidth="0.04"
          />
          <line
            x1="1.9"
            y1="-0.2"
            x2="1.9"
            y2="0"
            stroke="#111111"
            strokeWidth="0.04"
          />
          <text
            x="1.0"
            y="-0.16"
            textAnchor="middle"
            fontSize="0.2"
            fontWeight="bold"
            fill="#111111"
          >
            {unit === "m"
              ? "Scale: 1 m grid"
              : `Scale: ${METERS_TO_FEET.toFixed(1)} ft grid`}
          </text>
        </g>
      </svg>

      {/* Keyboard Shortcuts Helper Bar */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[#5A5A5A] print:hidden">
        <div>
          <span className="font-semibold text-[#111111]">Shortcuts:</span> Click
          or Tab to select · Drag to move · Arrow keys move (Shift: 1m) · R
          rotates (15°) · Del removes · Alt disables snap
        </div>
        <div>
          <span>Undo: ⌘Z · Redo: ⇧⌘Z</span>
        </div>
      </div>
    </div>
  );
}

export const VenueCanvas = memo(VenueCanvasComponent);
