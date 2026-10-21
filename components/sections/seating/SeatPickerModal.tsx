"use client";

import { useState, useMemo, useEffect, useRef, memo } from "react";
import type { Guest, SeatKey } from "@/lib/seating";

interface SeatPickerModalProps {
  seatKey: SeatKey | null;
  currentGuest?: Guest;
  unseatedGuests: Guest[];
  onAssign: (seatKey: SeatKey, guestId: string) => void;
  onUnassign: (seatKey: SeatKey) => void;
  onClose: () => void;
}

function SeatPickerModalComponent({
  seatKey,
  currentGuest,
  unseatedGuests,
  onAssign,
  onUnassign,
  onClose,
}: SeatPickerModalProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse table & seat numbers from seatKey e.g. "3-2"
  const { tableNumber, seatNumber } = useMemo(() => {
    if (!seatKey) return { tableNumber: 1, seatNumber: 1 };
    const [t, s] = seatKey.split("-");
    return {
      tableNumber: parseInt(t, 10),
      seatNumber: parseInt(s, 10) + 1,
    };
  }, [seatKey]);

  useEffect(() => {
    if (seatKey) {
      inputRef.current?.focus();
    }
  }, [seatKey]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredUnseated = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unseatedGuests;
    return unseatedGuests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) || g.group?.toLowerCase().includes(q)
    );
  }, [unseatedGuests, search]);

  if (!seatKey) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Seat picker for Table ${tableNumber}, Seat ${seatNumber}`}
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-[#D9D9D9] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A5A]">
              Seat Assignment
            </span>
            <h3 className="font-serif text-lg font-normal text-[#111111]">
              Table {tableNumber}, Seat {seatNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-[#5A5A5A] hover:bg-[#F7F7F7] hover:text-[#111111]"
          >
            ✕
          </button>
        </div>

        {/* Current Occupant Details (if filled) */}
        {currentGuest && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
            <div>
              <span className="block text-[10.5px] font-semibold uppercase text-emerald-800">
                Currently seated:
              </span>
              <span className="text-sm font-bold text-emerald-950">
                {currentGuest.name}
              </span>
              {currentGuest.group && (
                <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                  {currentGuest.group}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onUnassign(seatKey);
                onClose();
              }}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Unseat
            </button>
          </div>
        )}

        {/* Search unseated guests */}
        <div className="mt-4">
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unseated guests by name or group..."
            aria-label="Filter unseated guests"
            className="w-full rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
          />
        </div>

        {/* List of Unseated Guests */}
        <div
          className="mt-3 max-h-60 flex-1 space-y-1.5 overflow-y-auto pr-1 text-xs"
          aria-label="Available unseated guests"
        >
          {filteredUnseated.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#D9D9D9] p-4 text-center text-[#5A5A5A]">
              {unseatedGuests.length === 0
                ? "All guests are currently seated."
                : "No unseated guests match your search."}
            </div>
          ) : (
            filteredUnseated.map((guest) => (
              <button
                key={guest.id}
                type="button"
                onClick={() => {
                  onAssign(seatKey, guest.id);
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-lg border border-[#D9D9D9] bg-white p-2.5 text-left transition-colors hover:border-[#111111] hover:bg-[#F7F7F7]"
              >
                <div>
                  <span className="block font-semibold text-[#111111]">
                    {guest.name}
                  </span>
                  {guest.group && (
                    <span className="text-[10px] text-[#5A5A5A]">
                      Group: {guest.group}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-[#111111]">
                  Assign →
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-[#D9D9D9] pt-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#D9D9D9] bg-white px-4 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#F7F7F7]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export const SeatPickerModal = memo(SeatPickerModalComponent);
