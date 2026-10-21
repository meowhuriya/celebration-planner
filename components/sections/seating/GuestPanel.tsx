"use client";

import { useState, useMemo, memo, type DragEvent } from "react";
import type { Guest, SeatKey } from "@/lib/seating";
import { parseGuestNames, sanitizeName, MAX_GUESTS } from "@/lib/seating";
import type { EventEssentials } from "@/lib/rsvp/types";
import InvitesPanel from "@/components/rsvp/InvitesPanel";

interface GuestPanelProps {
  guests: Guest[];
  assignments: Record<SeatKey, string>;
  seatsPerTable: number;
  totalTables: number;
  totalCapacity: number;
  rsvpConfirmedCount?: number;
  eventEssentials?: EventEssentials;
  onAddGuest: (name: string, group?: string) => void;
  onAddMultipleGuests: (
    guestList: Array<{ name: string; group?: string }>
  ) => void;
  onRemoveGuest: (guestId: string) => void;
  onUnassignSeat: (seatKey: SeatKey) => void;
  onChangeSeatsPerTable: (count: number) => void;
  onAutoSeat: () => void;
  onClearAll: () => void;
  onHoverGuest: (guestId: string | null) => void;
  onPrintChart: () => void;
  onCopyAsText: () => void;
  onUseRsvpCount?: () => void;
  onUpdateGuests?: (updatedGuests: Guest[]) => void;
  onUseConfirmedSeatsForBudget?: (confirmedSeats: number) => void;
  onAutoSeatConfirmedOnly?: () => void;
  onPrintAllInvites?: () => void;
  hostPhone?: string;
  onUpdateHostPhone?: (phone: string) => void;
}

function GuestPanelComponent({
  guests,
  assignments,
  seatsPerTable,
  totalTables,
  totalCapacity,
  rsvpConfirmedCount,
  eventEssentials,
  onAddGuest,
  onAddMultipleGuests,
  onRemoveGuest,
  onUnassignSeat,
  onChangeSeatsPerTable,
  onAutoSeat,
  onClearAll,
  onHoverGuest,
  onPrintChart,
  onCopyAsText,
  onUseRsvpCount,
  onUpdateGuests,
  onUseConfirmedSeatsForBudget,
  onAutoSeatConfirmedOnly,
  onPrintAllInvites,
  hostPhone,
  onUpdateHostPhone,
}: GuestPanelProps) {
  // Tab switcher state
  const [activeTab, setActiveTab] = useState<"seating" | "invites">("seating");

  // Input states
  const [singleName, setSingleName] = useState("");
  const [singleGroup, setSingleGroup] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkGroup, setBulkGroup] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [unseatedOnly, setUnseatedOnly] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Inverted assignment map: guestId -> seatKey
  const guestToSeatMap = useMemo(() => {
    const map = new Map<string, SeatKey>();
    for (const [sKey, gId] of Object.entries(assignments)) {
      map.set(gId, sKey);
    }
    return map;
  }, [assignments]);

  const seatedCount = guestToSeatMap.size;
  const shortfall = Math.max(0, guests.length - totalCapacity);

  // Filtered guest list
  const filteredGuests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return guests.filter((g) => {
      const isSeated = guestToSeatMap.has(g.id);
      if (unseatedOnly && isSeated) return false;
      if (!query) return true;
      const matchName = g.name.toLowerCase().includes(query);
      const matchGroup = g.group?.toLowerCase().includes(query);
      return matchName || matchGroup;
    });
  }, [guests, searchQuery, unseatedOnly, guestToSeatMap]);

  // Compute fill count per table: tableNum -> count
  const tableFillCounts = useMemo(() => {
    const counts: number[] = new Array(totalTables).fill(0);
    for (const seatKey of Object.keys(assignments)) {
      const [tStr] = seatKey.split("-");
      const tNum = parseInt(tStr, 10);
      if (tNum >= 1 && tNum <= totalTables) {
        counts[tNum - 1]++;
      }
    }
    return counts;
  }, [assignments, totalTables]);

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeName(singleName);
    if (!clean) return;
    onAddGuest(clean, singleGroup ? sanitizeName(singleGroup) : undefined);
    setSingleName("");
    setSingleGroup("");
  };

  const handleAddBulk = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseGuestNames(bulkText, bulkGroup);
    if (parsed.length === 0) return;
    onAddMultipleGuests(parsed);
    setBulkText("");
    setBulkGroup("");
    setPasteMode(false);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, guestId: string) => {
    e.dataTransfer.setData("text/celebrate-guest-id", guestId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCopyClick = () => {
    onCopyAsText();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="flex flex-col space-y-4 rounded-xl border border-[#D9D9D9] bg-white p-4 sm:p-5">
      {/* ── TAB SWITCHER: SEATING CHART vs INVITES & RSVP ── */}
      <div
        role="tablist"
        aria-label="Guest management modes"
        className="flex rounded-xl border border-[#D9D9D9] bg-[#F7F7F7] p-1"
      >
        <button
          type="button"
          role="tab"
          id="tab-seating-chart"
          aria-selected={activeTab === "seating"}
          aria-controls="panel-seating-chart"
          onClick={() => setActiveTab("seating")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            activeTab === "seating"
              ? "shadow-2xs bg-white text-[#111111]"
              : "text-[#5A5A5A] hover:text-[#111111]"
          }`}
        >
          👥 Seating chart ({guests.length})
        </button>

        <button
          type="button"
          role="tab"
          id="tab-invites-rsvp"
          aria-selected={activeTab === "invites"}
          aria-controls="panel-invites-rsvp"
          onClick={() => setActiveTab("invites")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            activeTab === "invites"
              ? "shadow-2xs bg-white text-[#111111]"
              : "text-[#5A5A5A] hover:text-[#111111]"
          }`}
        >
          💌 Invites &amp; RSVP
        </button>
      </div>

      {activeTab === "invites" ? (
        <div
          id="panel-invites-rsvp"
          role="tabpanel"
          aria-labelledby="tab-invites-rsvp"
        >
          <InvitesPanel
            guests={guests}
            eventEssentials={
              eventEssentials || {
                t: "wedding",
                h: "",
                c: "",
                d: "",
              }
            }
            onUpdateGuests={onUpdateGuests || (() => {})}
            onUseConfirmedSeatsForBudget={onUseConfirmedSeatsForBudget}
            onAutoSeatConfirmedOnly={onAutoSeatConfirmedOnly}
            onPrintAllInvites={onPrintAllInvites || onPrintChart}
            hostPhone={hostPhone}
            onUpdateHostPhone={onUpdateHostPhone}
          />
        </div>
      ) : (
        <div
          id="panel-seating-chart"
          role="tabpanel"
          aria-labelledby="tab-seating-chart"
          className="space-y-4"
        >
          {/* 1. Header with Seated Progress ("42 of 83 seated") */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A5A5A]">
                Guest Seating Overview
              </span>
              <span className="font-mono text-xs font-semibold text-[#111111]">
                {seatedCount} of {guests.length} seated
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EFEFEF]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${
                    guests.length > 0 ? (seatedCount / guests.length) * 100 : 0
                  }%`,
                  background: "var(--palette-1, #111111)",
                }}
              />
            </div>
          </div>

          {/* 2. Seats per table stepper (6, 8, 10, 12) & Total Capacity */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#D9D9D9] py-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-[#111111]">
              <span className="text-[#5A5A5A]">Seats per table:</span>
              <div className="flex rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] p-0.5">
                {[6, 8, 10, 12].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => onChangeSeatsPerTable(cnt)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      seatsPerTable === cnt
                        ? "bg-[#111111] text-[#F7F7F7]"
                        : "text-[#5A5A5A] hover:text-[#111111]"
                    }`}
                    aria-pressed={seatsPerTable === cnt}
                    aria-label={`Set ${cnt} seats per table`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            <div className="font-mono text-[11px] text-[#5A5A5A]">
              Capacity:{" "}
              <span className="font-semibold text-[#111111]">
                {totalCapacity} seats
              </span>{" "}
              ({totalTables} tables)
            </div>
          </div>

          {/* 3. Shortfall Alert (if guests exceed capacity) */}
          {shortfall > 0 && (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
            >
              <div className="flex items-start gap-2">
                <span aria-hidden="true" className="text-sm">
                  ⚠️
                </span>
                <div className="leading-relaxed">
                  <span className="font-semibold">Capacity shortfall:</span>{" "}
                  {shortfall} guest{shortfall > 1 ? "s" : ""} exceed available
                  seats ({totalCapacity} capacity). Increase seats per table to
                  accommodate all guests.
                </div>
              </div>
            </div>
          )}

          {/* 4. Fill Count Per Table ("5/8") */}
          {totalTables > 0 && (
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold text-[#5A5A5A]">
                Table Occupancy:
              </span>
              <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                {tableFillCounts.map((count, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                      count === seatsPerTable
                        ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-800"
                        : count > 0
                          ? "border-[#D9D9D9] bg-[#F7F7F7] text-[#111111]"
                          : "border-dashed border-[#D9D9D9] text-[#767676]"
                    }`}
                  >
                    <span>T{idx + 1}:</span>
                    <span>
                      {count}/{seatsPerTable}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 5. Add Single or Paste Multiple Guests */}
          <div className="rounded-xl border border-[#D9D9D9] bg-[#F7F7F7] p-3 text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-[#111111]">
                {pasteMode ? "Paste Multiple Guests" : "Add Guest"}
              </span>
              <button
                type="button"
                onClick={() => setPasteMode(!pasteMode)}
                className="text-[11px] font-semibold text-[#111111] underline hover:text-[#5A5A5A]"
              >
                {pasteMode ? "← Single add" : "+ Paste many"}
              </button>
            </div>

            {pasteMode ? (
              <form onSubmit={handleAddBulk} className="space-y-2">
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Paste names (one per line or comma-separated, e.g. Aisha Khan, Rahul Sharma)"
                  aria-label="Paste multiple guest names"
                  className="w-full rounded-lg border border-[#D9D9D9] bg-white p-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                />
                <input
                  type="text"
                  value={bulkGroup}
                  onChange={(e) => setBulkGroup(e.target.value)}
                  placeholder="Optional group tag for all (e.g. VIP Family)"
                  aria-label="Optional group for pasted guests"
                  className="w-full rounded-lg border border-[#D9D9D9] bg-white px-2 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!bulkText.trim()}
                  className="w-full rounded-lg bg-[#111111] py-1.5 font-semibold text-[#F7F7F7] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Add all guests
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddSingle} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    placeholder="Guest name"
                    aria-label="Guest name"
                    maxLength={40}
                    className="w-full rounded-lg border border-[#D9D9D9] bg-white px-2 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={singleGroup}
                    onChange={(e) => setSingleGroup(e.target.value)}
                    placeholder="Group tag (optional)"
                    aria-label="Optional group tag"
                    maxLength={40}
                    className="w-full rounded-lg border border-[#D9D9D9] bg-white px-2 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!singleName.trim() || guests.length >= MAX_GUESTS}
                  className="w-full rounded-lg bg-[#111111] py-1.5 font-semibold text-[#F7F7F7] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  + Add guest
                </button>
              </form>
            )}
          </div>

          {/* 6. Search & Filters */}
          <div className="space-y-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guests or groups..."
              aria-label="Search guests"
              className="w-full rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] px-2.5 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-1.5 text-[#111111]">
                <input
                  type="checkbox"
                  checked={unseatedOnly}
                  onChange={(e) => setUnseatedOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#D9D9D9] text-[#111111] focus:ring-[#111111]"
                />
                <span className="text-[11px] font-medium">
                  Show unseated only
                </span>
              </label>
              <span className="text-[11px] text-[#5A5A5A]">
                Showing {filteredGuests.length} of {guests.length}
              </span>
            </div>
          </div>

          {/* 7. Scrollable Guest Chips List */}
          <div
            className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs"
            aria-label="Guest list"
          >
            {filteredGuests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#D9D9D9] p-4 text-center text-[#5A5A5A]">
                {guests.length === 0
                  ? "No guests added yet. Add names above to start assigning seats."
                  : "No guests match your search filter."}
              </div>
            ) : (
              filteredGuests.map((guest) => {
                const seatKey = guestToSeatMap.get(guest.id);
                const isSeated = Boolean(seatKey);
                let seatLabel = "Unseated";
                if (seatKey) {
                  const [tStr, sStr] = seatKey.split("-");
                  seatLabel = `Table ${tStr}, Seat ${parseInt(sStr, 10) + 1}`;
                }

                return (
                  <div
                    key={guest.id}
                    role="listitem"
                    draggable
                    onDragStart={(e) => handleDragStart(e, guest.id)}
                    onMouseEnter={() => onHoverGuest(guest.id)}
                    onMouseLeave={() => onHoverGuest(null)}
                    className={`flex cursor-grab items-center justify-between rounded-lg border p-2 transition-all active:cursor-grabbing ${
                      isSeated
                        ? "border-[#D9D9D9] bg-white hover:border-[#111111]"
                        : "border-dashed border-amber-300 bg-amber-50/40 hover:border-amber-500"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-[#111111]">
                          {guest.name}
                        </span>
                        {guest.group && (
                          <span className="rounded bg-[#EFEFEF] px-1.5 py-0.5 text-[10px] font-medium text-[#5A5A5A]">
                            {guest.group}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#5A5A5A]">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSeated ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                        />
                        <span>{seatLabel}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isSeated && seatKey && (
                        <button
                          type="button"
                          onClick={() => onUnassignSeat(seatKey)}
                          aria-label={`Unseat ${guest.name}`}
                          className="rounded p-1 text-[11px] text-[#767676] hover:bg-[#F7F7F7] hover:text-red-600"
                          title="Unseat from table"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveGuest(guest.id)}
                        aria-label={`Remove ${guest.name} from guests`}
                        className="rounded p-1 text-[11px] text-[#767676] hover:bg-[#F7F7F7] hover:text-red-600"
                        title="Remove guest completely"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 8. Action Buttons (Auto-seat, Clear all, Print, Copy) */}
          <div className="space-y-2 border-t border-[#D9D9D9] pt-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onAutoSeat}
                disabled={guests.length === 0}
                className="rounded-lg bg-[#111111] py-2 text-xs font-semibold text-[#F7F7F7] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                ⚡ Auto-seat
              </button>

              {confirmClear ? (
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                  className="rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Confirm clear?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  disabled={seatedCount === 0}
                  className="rounded-lg border border-[#D9D9D9] bg-white py-2 text-xs font-semibold text-[#5A5A5A] hover:border-[#111111] hover:text-[#111111] disabled:opacity-40"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onPrintChart}
                className="rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]"
              >
                🖨️ Print seating chart
              </button>

              <button
                type="button"
                onClick={handleCopyClick}
                className="rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]"
              >
                {copyFeedback ? "✓ Copied" : "📋 Copy as text"}
              </button>
            </div>

            {/* RSVP button (only if confirmed count exists) */}
            {typeof rsvpConfirmedCount === "number" &&
              rsvpConfirmedCount > 0 &&
              onUseRsvpCount && (
                <button
                  type="button"
                  onClick={onUseRsvpCount}
                  className="w-full rounded-lg border border-purple-200 bg-purple-50 py-1.5 text-xs font-semibold text-purple-900 hover:bg-purple-100"
                >
                  Use RSVP confirmed count ({rsvpConfirmedCount})
                </button>
              )}

            {/* Privacy Note */}
            <p className="text-center text-[10.5px] text-[#5A5A5A]">
              🔒 Guest names stay on this device.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export const GuestPanel = memo(GuestPanelComponent);
