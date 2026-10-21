"use client";

import {
  useState,
  useRef,
  memo,
  type KeyboardEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { FloorPlanLayout, TableItem } from "@/lib/floorplan";
import type { Guest, SeatKey, SeatPosition } from "@/lib/seating";
import { seatPositions, getInitials } from "@/lib/seating";

interface SeatingCanvasProps {
  layout: FloorPlanLayout;
  seatsPerTable: number;
  guests: Guest[];
  assignments: Record<SeatKey, string>;
  hoveredGuestId: string | null;
  onSelectSeat: (seatKey: SeatKey) => void;
  onUnassignSeat: (seatKey: SeatKey) => void;
  onSwapSeats: (seatKeyA: SeatKey, seatKeyB: SeatKey) => void;
  onAssignGuestToSeat: (seatKey: SeatKey, guestId: string) => void;
  onAnnounce: (msg: string) => void;
}

function SeatingCanvasComponent({
  layout,
  seatsPerTable,
  guests,
  assignments,
  hoveredGuestId,
  onSelectSeat,
  onUnassignSeat,
  onSwapSeats,
  onAssignGuestToSeat,
  onAnnounce,
}: SeatingCanvasProps) {
  const [hoveredTable, setHoveredTable] = useState<TableItem | null>(null);
  const [activeTooltipSeat, setActiveTooltipSeat] = useState<{
    seatKey: SeatKey;
    tableNumber: number;
    seatIndex: number;
    x: number;
    y: number;
    guest?: Guest;
  } | null>(null);

  // Drag-and-drop state
  const [draggedSeatKey, setDraggedSeatKey] = useState<SeatKey | null>(null);
  const [dropTargetSeatKey, setDropTargetSeatKey] = useState<SeatKey | null>(
    null
  );

  const guestMap = useRef<Map<string, Guest>>(new Map());
  guestMap.current = new Map(guests.map((g) => [g.id, g]));

  // Find seatKey of the hovered guest in the sidebar (for highlighting)
  const highlightedSeatKey = Object.entries(assignments).find(
    ([, gId]) => gId === hoveredGuestId
  )?.[0];

  // Flattened list of all seat positions across all tables for arrow-key navigation
  const allSeatPositions: SeatPosition[] = [];
  for (const table of layout.tables) {
    const tableSeats = seatPositions(table, seatsPerTable);
    allSeatPositions.push(...tableSeats);
  }

  // Keyboard navigation across seats
  const handleSeatKeyDown = (
    e: KeyboardEvent<SVGElement>,
    pos: SeatPosition,
    guest?: Guest
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectSeat(pos.seatKey);
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      if (guest) {
        e.preventDefault();
        onUnassignSeat(pos.seatKey);
        onAnnounce(
          `Unseated ${guest.name} from Table ${pos.tableNumber}, seat ${pos.seatIndex + 1}`
        );
      }
      return;
    }

    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const curIdx = allSeatPositions.findIndex(
        (p) => p.seatKey === pos.seatKey
      );
      if (curIdx === -1) return;

      const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
      const nextIdx = forward
        ? (curIdx + 1) % allSeatPositions.length
        : (curIdx - 1 + allSeatPositions.length) % allSeatPositions.length;

      const nextSeat = allSeatPositions[nextIdx];
      const nextElem = document.getElementById(`seat-btn-${nextSeat.seatKey}`);
      if (nextElem) {
        nextElem.focus();
      }
    }
  };

  // HTML5 Drag and Drop Handlers (from sidebar guest chips)
  const handleDragOverSeat = (e: DragEvent<SVGElement>, seatKey: SeatKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetSeatKey !== seatKey) {
      setDropTargetSeatKey(seatKey);
    }
  };

  const handleDragLeaveSeat = () => {
    setDropTargetSeatKey(null);
  };

  const handleDropOnSeat = (
    e: DragEvent<SVGElement>,
    targetSeatKey: SeatKey
  ) => {
    e.preventDefault();
    setDropTargetSeatKey(null);

    // 1. From sidebar guest chip
    const guestId = e.dataTransfer.getData("text/celebrate-guest-id");
    if (guestId) {
      onAssignGuestToSeat(targetSeatKey, guestId);
      const guest = guestMap.current.get(guestId);
      const [tNum, sIdx] = targetSeatKey.split("-");
      onAnnounce(
        `${guest ? guest.name : "Guest"} seated at Table ${tNum}, seat ${parseInt(sIdx, 10) + 1}`
      );
      return;
    }

    // 2. From another seat (swap)
    const sourceSeatKey = e.dataTransfer.getData("text/celebrate-seat-key");
    if (sourceSeatKey && sourceSeatKey !== targetSeatKey) {
      onSwapSeats(sourceSeatKey, targetSeatKey);
      onAnnounce(`Swapped seat ${sourceSeatKey} with seat ${targetSeatKey}`);
    }
  };

  // Pointer-based seat drag initiation
  const handlePointerDownSeat = (
    e: ReactPointerEvent<SVGElement>,
    seatKey: SeatKey,
    hasGuest: boolean
  ) => {
    if (!hasGuest) return;
    setDraggedSeatKey(seatKey);
  };

  return (
    <div className="relative select-none overflow-hidden rounded-xl border border-[#D9D9D9] bg-[#F7F7F7] p-2 sm:p-4">
      <svg
        viewBox="0 0 800 520"
        className="h-auto w-full"
        role="region"
        aria-label={`Interactive seating floor plan: ${layout.summaryText}`}
        onPointerUp={() => setDraggedSeatKey(null)}
      >
        <defs>
          <pattern
            id="seating-floor-grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#E8E8E8"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>

        {/* Floor Grid Surface */}
        <rect
          width="800"
          height="520"
          fill="url(#seating-floor-grid)"
          rx="10"
        />

        {/* Venue Architecture Features Layer */}
        <g role="img" aria-label="Venue architectural zones">
          {/* Main Stage */}
          <rect
            x="290"
            y="20"
            width="220"
            height="52"
            rx="8"
            fill="var(--palette-1, #111111)"
            fillOpacity="0.15"
            stroke="var(--palette-1, #111111)"
            strokeWidth="2"
          />
          <text
            x="400"
            y="46"
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="var(--palette-1, #111111)"
          >
            {layout.features.find((f) => f.type === "stage")?.label ||
              "Main Stage"}
          </text>

          {/* Dance Floor */}
          <rect
            x="310"
            y="88"
            width="180"
            height="62"
            rx="6"
            fill="none"
            stroke="var(--palette-2, #800020)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x="400"
            y="124"
            textAnchor="middle"
            fontSize="11"
            fill="#5A5A5A"
          >
            {layout.features.find((f) => f.type === "danceFloor")?.label ||
              "Dance Floor"}
          </text>

          {/* Buffet Station */}
          <rect
            x="675"
            y="80"
            width="95"
            height="270"
            rx="8"
            fill="#FFFFFF"
            stroke="var(--palette-3, #D4AF37)"
            strokeWidth="2"
          />
          <text
            x="722"
            y="215"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#111111"
            transform="rotate(-90 722 215)"
            letterSpacing="0.05em"
          >
            BUFFET &amp; BEVERAGES
          </text>

          {/* Entrance */}
          <rect
            x="335"
            y="475"
            width="130"
            height="28"
            rx="4"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="1.5"
          />
          <text
            x="400"
            y="493"
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#111111"
          >
            MAIN ENTRANCE
          </text>
        </g>

        {/* Tables & Surrounding Seats Layer */}
        <g role="group" aria-label="Tables and seats">
          {layout.tables.map((table) => {
            const isHovered = hoveredTable?.tableNumber === table.tableNumber;
            const tableSeats = seatPositions(table, seatsPerTable);

            // Compute table fill count
            const seatedAtTable = tableSeats.filter(
              (s) => assignments[s.seatKey]
            ).length;

            return (
              <g key={`table_group_${table.id}`}>
                {/* 1. Main Central Table Circle (rendered first for DOM ordering & test focus) */}
                <g
                  tabIndex={0}
                  role="button"
                  aria-label={`Table ${table.tableNumber}, ${table.seats} seats (${seatedAtTable} of ${table.seats} seated)`}
                  onMouseEnter={() => setHoveredTable(table)}
                  onMouseLeave={() => setHoveredTable(null)}
                  onFocus={() => setHoveredTable(table)}
                  onBlur={() => setHoveredTable(null)}
                  className="cursor-pointer focus:outline-none"
                >
                  <circle
                    cx={table.x}
                    cy={table.y}
                    r={table.radius}
                    fill={isHovered ? "var(--palette-1, #111111)" : "#FFFFFF"}
                    stroke={isHovered ? "var(--palette-1, #111111)" : "#B0B0B0"}
                    strokeWidth="2"
                    className="transition-colors duration-200"
                  />

                  {/* Table Number */}
                  <text
                    x={table.x}
                    y={table.y - 1}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill={
                      isHovered ? "var(--palette-text-1, #FFFFFF)" : "#111111"
                    }
                    className="pointer-events-none select-none"
                  >
                    {table.tableNumber}
                  </text>

                  {/* Fill Ratio Subtitle (e.g. 5/8) */}
                  <text
                    x={table.x}
                    y={table.y + 8}
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="600"
                    fill={
                      isHovered ? "var(--palette-text-1, #FFFFFF)" : "#5A5A5A"
                    }
                    className="pointer-events-none select-none font-mono"
                  >
                    {seatedAtTable}/{table.seats}
                  </text>
                </g>

                {/* 2. Surrounding Seats */}
                {tableSeats.map((pos) => {
                  const guestId = assignments[pos.seatKey];
                  const guest = guestId
                    ? guestMap.current.get(guestId)
                    : undefined;
                  const isFilled = Boolean(guest);
                  const isDropTarget = dropTargetSeatKey === pos.seatKey;
                  const isHighlighted = highlightedSeatKey === pos.seatKey;
                  const isDragged = draggedSeatKey === pos.seatKey;
                  const initials = guest ? getInitials(guest.name) : "";

                  const seatAriaLabel = `Table ${pos.tableNumber}, seat ${
                    pos.seatIndex + 1
                  }, ${isFilled ? guest!.name : "empty"}`;

                  return (
                    <g
                      key={`seat_${pos.seatKey}`}
                      id={`seat-btn-${pos.seatKey}`}
                      tabIndex={0}
                      role="button"
                      aria-label={seatAriaLabel}
                      className="cursor-pointer focus:outline-none"
                      onClick={() => onSelectSeat(pos.seatKey)}
                      onKeyDown={(e) => handleSeatKeyDown(e, pos, guest)}
                      onMouseEnter={() =>
                        setActiveTooltipSeat({
                          seatKey: pos.seatKey,
                          tableNumber: pos.tableNumber,
                          seatIndex: pos.seatIndex,
                          x: pos.x,
                          y: pos.y,
                          guest,
                        })
                      }
                      onMouseLeave={() => setActiveTooltipSeat(null)}
                      onFocus={() =>
                        setActiveTooltipSeat({
                          seatKey: pos.seatKey,
                          tableNumber: pos.tableNumber,
                          seatIndex: pos.seatIndex,
                          x: pos.x,
                          y: pos.y,
                          guest,
                        })
                      }
                      onBlur={() => setActiveTooltipSeat(null)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "text/celebrate-seat-key",
                          pos.seatKey
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => handleDragOverSeat(e, pos.seatKey)}
                      onDragLeave={handleDragLeaveSeat}
                      onDrop={(e) => handleDropOnSeat(e, pos.seatKey)}
                      onPointerDown={(e) =>
                        handlePointerDownSeat(e, pos.seatKey, isFilled)
                      }
                    >
                      {/* Active Drop Target Glow / Sidebar Guest Highlight Ring */}
                      {(isDropTarget || isHighlighted) && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="7.5"
                          fill="none"
                          stroke={
                            isDropTarget
                              ? "#2563EB"
                              : "var(--palette-1, #111111)"
                          }
                          strokeWidth="2.2"
                          strokeDasharray={isDropTarget ? "3 2" : undefined}
                          className="animate-pulse"
                        />
                      )}

                      {/* Main Seat Circle: Hollow when empty, filled with palette when occupied */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="4.6"
                        opacity={isDragged ? 0.35 : 1}
                        fill={
                          isFilled ? "var(--palette-1, #111111)" : "#FFFFFF"
                        }
                        stroke={
                          isFilled
                            ? "#FFFFFF"
                            : isDropTarget
                              ? "#2563EB"
                              : "#9CA3AF"
                        }
                        strokeWidth={isFilled ? "1.0" : "1.2"}
                        strokeDasharray={isFilled ? undefined : "2 1.5"}
                        className="transition-all duration-150 hover:scale-125"
                      />

                      {/* Guest Initials on Filled Seats */}
                      {isFilled && (
                        <text
                          x={pos.x}
                          y={pos.y + 1.2}
                          textAnchor="middle"
                          fontSize="3.4"
                          fontWeight="bold"
                          fill="var(--palette-text-1, #FFFFFF)"
                          className="pointer-events-none select-none font-sans"
                        >
                          {initials}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* Hovered / Focused Table Callout (Matches existing test expectation) */}
        {hoveredTable && (
          <g
            pointerEvents="none"
            transform={`translate(${hoveredTable.x}, ${hoveredTable.y - 34})`}
          >
            <rect
              x="-60"
              y="-16"
              width="120"
              height="26"
              rx="6"
              fill="#111111"
              stroke="#FFFFFF"
              strokeWidth="1"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
            />
            <text
              x="0"
              y="1"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="10"
              fontWeight="600"
            >
              Table {hoveredTable.tableNumber} · {hoveredTable.seats} seats
            </text>
          </g>
        )}

        {/* Seat Hover / Focus Tooltip ("full name, group, and Table 6, seat 3" or "Empty seat") */}
        {activeTooltipSeat && (
          <g
            pointerEvents="none"
            transform={`translate(${activeTooltipSeat.x}, ${
              activeTooltipSeat.y > 60
                ? activeTooltipSeat.y - 20
                : activeTooltipSeat.y + 22
            })`}
          >
            <rect
              x="-75"
              y="-15"
              width="150"
              height="26"
              rx="5"
              fill="#111111"
              stroke="#FFFFFF"
              strokeWidth="1"
              filter="drop-shadow(0 3px 6px rgba(0,0,0,0.3))"
            />
            <text
              x="0"
              y="-1"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="9.5"
              fontWeight="bold"
            >
              {activeTooltipSeat.guest
                ? activeTooltipSeat.guest.name
                : "Empty seat"}
              {activeTooltipSeat.guest?.group
                ? ` (${activeTooltipSeat.guest.group})`
                : ""}
            </text>
            <text
              x="0"
              y="8.5"
              textAnchor="middle"
              fill="#D1D5DB"
              fontSize="8"
              fontFamily="monospace"
            >
              Table {activeTooltipSeat.tableNumber}, seat{" "}
              {activeTooltipSeat.seatIndex + 1}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export const SeatingCanvas = memo(SeatingCanvasComponent);
