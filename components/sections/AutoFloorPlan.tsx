"use client";

import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { layoutTables, type TableItem } from "@/lib/floorplan";
import TiltCard from "../editorial/TiltCard";
import { SeatingCanvas } from "./seating/SeatingCanvas";
import { GuestPanel } from "./seating/GuestPanel";
import { SeatPickerModal } from "./seating/SeatPickerModal";
import { SeatingPrintView } from "./seating/SeatingPrintView";
import PrintInvitesView from "@/components/rsvp/PrintInvitesView";
import type { EventInput } from "@/lib/schemas";
import type { EventEssentials } from "@/lib/rsvp/types";
import { getSiteUrlInfo } from "@/lib/rsvp/site";
import type { Guest, SeatKey, SeatingState } from "@/lib/seating";
import {
  assign,
  unassign,
  swap,
  autoSeat,
  loadSeatingPlan,
  saveSeatingPlan,
} from "@/lib/seating";

interface AutoFloorPlanProps {
  guestCount?: number;
  eventType?: string;
  rsvpConfirmedCount?: number;
  eventInput?: EventInput;
  onBudgetGuestCountChange?: (count: number) => void;
  className?: string;
}

function AutoFloorPlanComponent({
  guestCount = 100,
  eventType = "wedding",
  rsvpConfirmedCount,
  eventInput,
  onBudgetGuestCountChange,
  className = "",
}: AutoFloorPlanProps) {
  const defaultSeats = useMemo(() => {
    const norm = (eventType || "").toLowerCase();
    if (norm === "wedding") return 10;
    return 8;
  }, [eventType]);

  // 1. Initial State from localStorage (or defaults)
  const [seatingState, setSeatingState] = useState<SeatingState>(() => {
    return loadSeatingPlan(defaultSeats);
  });

  useEffect(() => {
    if (seatingState.guests.length === 0) {
      setSeatingState((prev) => ({
        ...prev,
        seatsPerTable: defaultSeats,
      }));
    }
  }, [defaultSeats, seatingState.guests.length]);

  const [activeModalSeatKey, setActiveModalSeatKey] = useState<SeatKey | null>(
    null
  );
  const [hoveredGuestId, setHoveredGuestId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");
  const [printMode, setPrintMode] = useState<"chart" | "invites">("chart");
  const [hostPhone, setHostPhone] = useState<string>("");

  const eventEssentials: EventEssentials = useMemo(() => {
    return {
      t: eventType,
      h: eventInput?.hostName || "",
      d: eventInput?.eventDate || "",
      c: eventInput?.city || "",
      v: eventInput?.venueName,
      th: eventInput?.vibeOrTheme || eventInput?.cultureOrTradition,
      dc: eventInput?.dressCode,
      ph: hostPhone || undefined,
    };
  }, [eventType, eventInput, hostPhone]);

  const handleUpdateGuests = useCallback((updatedGuests: Guest[]) => {
    setSeatingState((prev) => ({
      ...prev,
      guests: updatedGuests,
    }));
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveSeatingPlan(seatingState);
  }, [seatingState]);

  // 2. Compute Architectural Layout based on guest count and chosen seatsPerTable
  const layout = useMemo(() => {
    const baseLayout = layoutTables(guestCount, eventType);
    // Override seatsPerTable with the user's chosen stepper setting
    const chosenSeats = seatingState.seatsPerTable || baseLayout.seatsPerTable;

    // Recalculate table capacities with the chosen seatsPerTable
    const validGuestCount = Math.max(0, Math.floor(guestCount || 0));
    const totalTables =
      validGuestCount > 0 ? Math.ceil(validGuestCount / chosenSeats) : 0;
    const displayedCount = Math.min(totalTables, 48);

    const guestLabel =
      validGuestCount === 1 ? "1 guest" : `${validGuestCount} guests`;
    const tableLabel = totalTables === 1 ? "1 table" : `${totalTables} tables`;
    const summaryText = `${guestLabel}, ${tableLabel}`;

    const updatedTables: TableItem[] = baseLayout.tables.map((t) => ({
      ...t,
      seats: chosenSeats,
    }));

    return {
      ...baseLayout,
      totalGuests: validGuestCount,
      totalTables,
      displayedTables: displayedCount,
      seatsPerTable: chosenSeats,
      summaryText,
      tables: updatedTables,
    };
  }, [guestCount, eventType, seatingState.seatsPerTable]);

  const totalCapacity = layout.displayedTables * layout.seatsPerTable;

  // 3. Handlers for Seating Actions
  const handleAssignGuest = useCallback((seatKey: SeatKey, guestId: string) => {
    setSeatingState((prev) => assign(prev, seatKey, guestId));
  }, []);

  const handleUnassignSeat = useCallback((seatKey: SeatKey) => {
    setSeatingState((prev) => unassign(prev, seatKey));
  }, []);

  const handleSwapSeats = useCallback(
    (seatKeyA: SeatKey, seatKeyB: SeatKey) => {
      setSeatingState((prev) => swap(prev, seatKeyA, seatKeyB));
    },
    []
  );

  const handleAddGuest = useCallback((name: string, group?: string) => {
    const id = `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newGuest: Guest = { id, name, group };

    setSeatingState((prev) => ({
      ...prev,
      guests: [...prev.guests, newGuest],
    }));
    setAnnouncement(`Added ${name} to guest list`);
  }, []);

  const handleAddMultipleGuests = useCallback(
    (parsedList: Array<{ name: string; group?: string }>) => {
      const newGuests: Guest[] = parsedList.map((item, idx) => ({
        id: `g_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        group: item.group,
      }));

      setSeatingState((prev) => ({
        ...prev,
        guests: [...prev.guests, ...newGuests],
      }));
      setAnnouncement(`Added ${newGuests.length} guests to list`);
    },
    []
  );

  const handleRemoveGuest = useCallback((guestId: string) => {
    setSeatingState((prev) => {
      const nextGuests = prev.guests.filter((g) => g.id !== guestId);
      const nextAssignments: Record<SeatKey, string> = {};
      for (const [sKey, gId] of Object.entries(prev.assignments)) {
        if (gId !== guestId) {
          nextAssignments[sKey] = gId;
        }
      }
      return {
        ...prev,
        guests: nextGuests,
        assignments: nextAssignments,
      };
    });
    setAnnouncement("Removed guest from list");
  }, []);

  const handleChangeSeatsPerTable = useCallback((count: number) => {
    setSeatingState((prev) => ({
      ...prev,
      seatsPerTable: count,
    }));
    setAnnouncement(`Set table capacity to ${count} seats`);
  }, []);

  const handleAutoSeat = useCallback(() => {
    const res = autoSeat(
      seatingState.guests,
      layout.displayedTables,
      layout.seatsPerTable
    );

    setSeatingState((prev) => ({
      ...prev,
      assignments: res.assignments,
    }));

    setAnnouncement(
      `Auto-seated ${res.seatedCount} guests across ${layout.displayedTables} tables`
    );
  }, [seatingState.guests, layout.displayedTables, layout.seatsPerTable]);

  const handleAutoSeatConfirmedOnly = useCallback(() => {
    const confirmedGuests = seatingState.guests.filter(
      (g) => g.rsvpStatus === "yes"
    );
    if (confirmedGuests.length === 0) {
      setAnnouncement("No confirmed guests to seat yet.");
      return;
    }
    const result = autoSeat(
      confirmedGuests,
      layout.displayedTables,
      layout.seatsPerTable
    );
    setSeatingState((prev) => ({
      ...prev,
      assignments: result.assignments,
    }));
    setAnnouncement(
      `Auto-seated ${result.seatedCount} confirmed guests across ${layout.displayedTables} tables.`
    );
  }, [seatingState.guests, layout.displayedTables, layout.seatsPerTable]);

  const handleClearAll = useCallback(() => {
    setSeatingState((prev) => ({
      ...prev,
      assignments: {},
    }));
    setAnnouncement("Cleared all seat assignments");
  }, []);

  const handlePrintAllInvites = useCallback(() => {
    setPrintMode("invites");
    setTimeout(() => {
      if (typeof window !== "undefined") window.print();
    }, 150);
  }, []);

  const handlePrintChart = useCallback(() => {
    setPrintMode("chart");
    setTimeout(() => {
      if (typeof window !== "undefined") window.print();
    }, 150);
  }, []);

  const handleCopyAsText = useCallback(() => {
    const guestMap = new Map(seatingState.guests.map((g) => [g.id, g]));
    const lines: string[] = [];

    lines.push(`SEATING CHART — ${layout.summaryText.toUpperCase()}`);
    lines.push(`Seats per table: ${layout.seatsPerTable}`);
    lines.push("----------------------------------------");

    for (let t = 1; t <= layout.displayedTables; t++) {
      lines.push(`\nTable ${t}:`);
      let filledAtTable = 0;
      for (let s = 0; s < layout.seatsPerTable; s++) {
        const gId = seatingState.assignments[`${t}-${s}`];
        if (gId) {
          filledAtTable++;
          const g = guestMap.get(gId);
          lines.push(
            `  Seat ${s + 1}: ${g ? g.name : "Assigned"}${
              g?.group ? ` (${g.group})` : ""
            }`
          );
        } else {
          lines.push(`  Seat ${s + 1}: [Empty]`);
        }
      }
      if (filledAtTable === 0) {
        lines.push("  (All seats empty)");
      }
    }

    const textPayload = lines.join("\n");
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textPayload);
    }
    setAnnouncement("Copied seating chart to clipboard");
  }, [seatingState, layout]);

  const handleUseRsvpCount = useCallback(() => {
    if (!rsvpConfirmedCount || rsvpConfirmedCount <= 0) return;

    const currentCount = seatingState.guests.length;
    if (currentCount >= rsvpConfirmedCount) {
      setAnnouncement(
        "Guest count already meets or exceeds RSVP confirmed count"
      );
      return;
    }

    const needed = rsvpConfirmedCount - currentCount;
    const placeholders: Guest[] = Array.from({ length: needed }, (_, i) => ({
      id: `rsvp_guest_${Date.now()}_${i}`,
      name: `Guest ${currentCount + i + 1}`,
      group: "RSVP Confirmed",
    }));

    setSeatingState((prev) => ({
      ...prev,
      guests: [...prev.guests, ...placeholders],
    }));
    setAnnouncement(`Added ${needed} confirmed RSVP guest slots`);
  }, [rsvpConfirmedCount, seatingState.guests.length]);

  // Guest currently seated at active modal seat
  const currentModalGuest = useMemo(() => {
    if (!activeModalSeatKey) return undefined;
    const gId = seatingState.assignments[activeModalSeatKey];
    if (!gId) return undefined;
    return seatingState.guests.find((g) => g.id === gId);
  }, [activeModalSeatKey, seatingState.assignments, seatingState.guests]);

  // Unseated guests list
  const unseatedGuestsList = useMemo(() => {
    const seatedIds = new Set(Object.values(seatingState.assignments));
    return seatingState.guests.filter((g) => !seatedIds.has(g.id));
  }, [seatingState.guests, seatingState.assignments]);

  return (
    <TiltCard
      className={`rounded-2xl border border-[#D9D9D9] bg-white p-6 sm:p-7 ${className}`}
    >
      {/* Accessibility polite live announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>

      {/* Header with Title and Current Stepper Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D9D9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--palette-1, #111111)" }}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5A5A5A]">
              Seating plan
            </span>
          </div>
          <h4 className="mt-1 font-serif text-xl font-normal text-[#111111] sm:text-2xl">
            Venue &amp; table <span className="italic">floor plan</span>
          </h4>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#5A5A5A]">
          <span className="rounded-full border border-[#D9D9D9] bg-[#F7F7F7] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#111111]">
            {layout.seatsPerTable} seats / table
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive SVG Canvas (Left) + Guest Panel (Right) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Interactive Canvas */}
        <div className="lg:col-span-7 xl:col-span-8">
          <SeatingCanvas
            layout={layout}
            seatsPerTable={layout.seatsPerTable}
            guests={seatingState.guests}
            assignments={seatingState.assignments}
            hoveredGuestId={hoveredGuestId}
            onSelectSeat={(seatKey) => setActiveModalSeatKey(seatKey)}
            onUnassignSeat={handleUnassignSeat}
            onSwapSeats={handleSwapSeats}
            onAssignGuestToSeat={handleAssignGuest}
            onAnnounce={setAnnouncement}
          />

          {/* Text Summary Displayed Under Floor Plan (Preserves exact previous text) */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#D9D9D9] pt-3">
            <p className="font-serif text-lg font-normal text-[#111111]">
              {layout.summaryText}
              {layout.isCapped && (
                <span className="ml-2 font-sans text-xs font-normal text-[#5A5A5A]">
                  (showing {layout.displayedTables} representative tables for
                  layout clarity)
                </span>
              )}
            </p>

            <span className="text-xs text-[#5A5A5A]">
              Hover or tab to inspect individual tables &amp; seat capacities
            </span>
          </div>
        </div>

        {/* Right Column: Guest Management & Seating Controls Panel */}
        <div className="lg:col-span-5 xl:col-span-4 print:hidden">
          <GuestPanel
            guests={seatingState.guests}
            assignments={seatingState.assignments}
            seatsPerTable={layout.seatsPerTable}
            totalTables={layout.displayedTables}
            totalCapacity={totalCapacity}
            rsvpConfirmedCount={rsvpConfirmedCount}
            eventEssentials={eventEssentials}
            onAddGuest={handleAddGuest}
            onAddMultipleGuests={handleAddMultipleGuests}
            onRemoveGuest={handleRemoveGuest}
            onUnassignSeat={handleUnassignSeat}
            onChangeSeatsPerTable={handleChangeSeatsPerTable}
            onAutoSeat={handleAutoSeat}
            onClearAll={handleClearAll}
            onHoverGuest={setHoveredGuestId}
            onPrintChart={handlePrintChart}
            onCopyAsText={handleCopyAsText}
            onUseRsvpCount={handleUseRsvpCount}
            onUpdateGuests={handleUpdateGuests}
            onUseConfirmedSeatsForBudget={onBudgetGuestCountChange}
            onAutoSeatConfirmedOnly={handleAutoSeatConfirmedOnly}
            onPrintAllInvites={handlePrintAllInvites}
            hostPhone={hostPhone}
            onUpdateHostPhone={setHostPhone}
          />
        </div>
      </div>

      {/* Pop-up Seat Assignment Modal / Mobile Bottom Sheet */}
      <SeatPickerModal
        seatKey={activeModalSeatKey}
        currentGuest={currentModalGuest}
        unseatedGuests={unseatedGuestsList}
        onAssign={handleAssignGuest}
        onUnassign={handleUnassignSeat}
        onClose={() => setActiveModalSeatKey(null)}
      />

      {/* Print-Only Layouts */}
      {printMode === "invites" ? (
        <PrintInvitesView
          guests={seatingState.guests}
          eventEssentials={eventEssentials}
          siteUrl={getSiteUrlInfo(process.env.NEXT_PUBLIC_SITE_URL).siteUrl}
        />
      ) : (
        <SeatingPrintView
          totalTables={layout.displayedTables}
          seatsPerTable={layout.seatsPerTable}
          guests={seatingState.guests}
          assignments={seatingState.assignments}
        />
      )}
    </TiltCard>
  );
}

const AutoFloorPlan = memo(AutoFloorPlanComponent);
export default AutoFloorPlan;
