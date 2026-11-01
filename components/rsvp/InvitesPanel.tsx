"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { Guest } from "@/lib/seating";
import type { EventEssentials, RsvpStatus } from "@/lib/rsvp/types";
import {
  encodeInvitePayload,
  encodeInvitePayloadSync,
} from "@/lib/rsvp/payload";
import { parseRsvpReplies, calculateRsvpSummary } from "@/lib/rsvp/parser";
import { getSiteUrlInfo, validateHostPhone } from "@/lib/rsvp/site";
import { listenToRsvpSync, exportCatererCsv } from "@/lib/rsvp/sync";
import QrModal from "./QrModal";

interface InvitesPanelProps {
  guests: Guest[];
  eventEssentials: EventEssentials;
  onUpdateGuests: (updatedGuests: Guest[]) => void;
  onUseConfirmedSeatsForBudget?: (confirmedSeats: number) => void;
  onAutoSeatConfirmedOnly?: () => void;
  onPrintAllInvites: () => void;
  hostPhone?: string;
  onUpdateHostPhone?: (phone: string) => void;
}

export default function InvitesPanel({
  guests,
  eventEssentials,
  onUpdateGuests,
  onUseConfirmedSeatsForBudget,
  onAutoSeatConfirmedOnly,
  onPrintAllInvites,
  hostPhone: initialHostPhone = "",
  onUpdateHostPhone,
}: InvitesPanelProps) {
  // Host WhatsApp phone state
  const [phoneInput, setPhoneInput] = useState(initialHostPhone);
  const [phoneError, setPhoneError] = useState("");

  // Paste Replies state
  const [pastedReplies, setPastedReplies] = useState("");
  const [parseNotice, setParseNotice] = useState<string>("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RsvpStatus>("all");

  // QR Modal state
  const [qrGuest, setQrGuest] = useState<{ name: string; url: string } | null>(
    null
  );

  // Aria announcements & link copy feedback
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");

  // Live real-time sync highlight & toast
  const [liveToast, setLiveToast] = useState<{
    guestName: string;
    status: string;
    partySize: number;
  } | null>(null);
  const [recentlyUpdatedGuestId, setRecentlyUpdatedGuestId] = useState<
    string | null
  >(null);

  // Site Address and Local Wi-Fi Warning
  const siteInfo = useMemo(() => {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    return getSiteUrlInfo(envUrl);
  }, []);

  // Summary calculations
  const summary = useMemo(() => calculateRsvpSummary(guests), [guests]);

  // Total expected headcount
  const totalExpectedHeadcount = useMemo(() => {
    return guests.reduce(
      (acc, g) =>
        acc +
        (g.rsvpStatus === "no"
          ? 0
          : g.partySize && g.partySize > 0
            ? g.partySize
            : 1),
      0
    );
  }, [guests]);

  // Listen for live same-browser RSVP updates from the guest /i tab
  useEffect(() => {
    const unsubscribe = listenToRsvpSync((update) => {
      const guestIndex = guests.findIndex((g) => g.id === update.guestId);
      if (guestIndex !== -1) {
        const updated = [...guests];
        const g = updated[guestIndex];
        const newPartySize = update.status === "no" ? 0 : update.partySize;
        updated[guestIndex] = {
          ...g,
          rsvpStatus: update.status,
          partySize: newPartySize,
          foodChoice: update.status === "no" ? undefined : update.foodChoice,
          note: update.note ?? g.note,
        };
        onUpdateGuests(updated);
        setRecentlyUpdatedGuestId(update.guestId);
        setLiveToast({
          guestName: g.name,
          status:
            update.status === "yes"
              ? "Attending"
              : update.status === "no"
                ? "Declined"
                : "Tentative",
          partySize: newPartySize,
        });
        setAnnouncement(
          `Live RSVP received: ${g.name} is ${
            update.status === "yes"
              ? "Attending"
              : update.status === "no"
                ? "Declined"
                : "Tentative"
          }`
        );
        setTimeout(() => setRecentlyUpdatedGuestId(null), 3500);
      }
    });
    return unsubscribe;
  }, [guests, onUpdateGuests]);

  // 1-Click quick status cycle
  const handleToggleStatus = (guest: Guest) => {
    const current = guest.rsvpStatus || "pending";
    let nextStatus: RsvpStatus = "yes";
    let nextSize = guest.partySize || 1;
    if (current === "pending") {
      nextStatus = "yes";
      nextSize = Math.max(1, guest.partySize || 1);
    } else if (current === "yes") {
      nextStatus = "no";
      nextSize = 0;
    } else if (current === "no") {
      nextStatus = "maybe";
      nextSize = 1;
    } else {
      nextStatus = "pending";
      nextSize = 1;
    }

    const updated = guests.map((g) =>
      g.id === guest.id
        ? {
            ...g,
            rsvpStatus: nextStatus,
            partySize: nextSize,
          }
        : g
    );
    onUpdateGuests(updated);
    setRecentlyUpdatedGuestId(guest.id);
    setTimeout(() => setRecentlyUpdatedGuestId(null), 2500);
  };

  // Handle Host Phone change
  const handlePhoneChange = (val: string) => {
    setPhoneInput(val);
    const result = validateHostPhone(val);
    if (!result.valid) {
      setPhoneError(result.error || "Invalid phone number");
    } else {
      setPhoneError("");
      onUpdateHostPhone?.(result.normalized);
    }
  };

  // Pre-generate reactive guest invite URLs with instant synchronous fallback
  const [guestUrls, setGuestUrls] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    const merged: EventEssentials = {
      ...eventEssentials,
      ph: phoneInput ? phoneInput.replace(/[\s\-\+\(\)]/g, "") : undefined,
    };
    for (const g of guests) {
      const syncHash = encodeInvitePayloadSync({
        v: 1,
        e: merged,
        g: { id: g.id, n: g.name, grp: g.group },
      });
      initialMap[g.id] = `${siteInfo.siteUrl}/i#${syncHash}`;
    }
    return initialMap;
  });

  useEffect(() => {
    let isMounted = true;
    const merged: EventEssentials = {
      ...eventEssentials,
      ph: phoneInput ? phoneInput.replace(/[\s\-\+\(\)]/g, "") : undefined,
    };

    // 1. Synchronous pass: immediately ensures all guest URLs are ready without delay
    const syncMap: Record<string, string> = {};
    for (const g of guests) {
      const syncHash = encodeInvitePayloadSync({
        v: 1,
        e: merged,
        g: { id: g.id, n: g.name, grp: g.group },
      });
      syncMap[g.id] = `${siteInfo.siteUrl}/i#${syncHash}`;
    }
    setGuestUrls(syncMap);

    // 2. Background pass with compressed hashes
    async function updateCompressedUrls() {
      try {
        const asyncMap: Record<string, string> = {};
        for (const g of guests) {
          const hash = await encodeInvitePayload({
            v: 1,
            e: merged,
            g: { id: g.id, n: g.name, grp: g.group },
          });
          asyncMap[g.id] = `${siteInfo.siteUrl}/i#${hash}`;
        }
        if (isMounted) {
          setGuestUrls(asyncMap);
        }
      } catch {
        // Keeps syncMap
      }
    }

    updateCompressedUrls();
    return () => {
      isMounted = false;
    };
  }, [guests, eventEssentials, phoneInput, siteInfo.siteUrl]);

  // Synchronous and instant URL getter for a guest
  const getGuestInviteUrl = useCallback(
    (guest: Guest): string => {
      if (guestUrls[guest.id]) return guestUrls[guest.id];
      const mergedEssentials: EventEssentials = {
        ...eventEssentials,
        ph: phoneInput ? phoneInput.replace(/[\s\-\+\(\)]/g, "") : undefined,
      };
      const hash = encodeInvitePayloadSync({
        v: 1,
        e: mergedEssentials,
        g: {
          id: guest.id,
          n: guest.name,
          grp: guest.group,
        },
      });
      return `${siteInfo.siteUrl}/i#${hash}`;
    },
    [guestUrls, eventEssentials, phoneInput, siteInfo.siteUrl]
  );

  // Action: Copy Personal Invite Link
  const handleCopyLink = async (guest: Guest) => {
    try {
      const fullUrl = getGuestInviteUrl(guest);
      await navigator.clipboard.writeText(fullUrl);
      setCopiedGuestId(guest.id);
      setAnnouncement(`Invite link copied for ${guest.name}`);
      setTimeout(() => setCopiedGuestId(null), 2500);
    } catch {
      setAnnouncement("Failed to copy link to clipboard");
    }
  };

  // Action: Send on WhatsApp
  const handleSendWhatsApp = (guest: Guest) => {
    const fullUrl = getGuestInviteUrl(guest);
    const hostLabel = eventEssentials.h || "us";
    const title = eventEssentials.t
      ? `${eventEssentials.t.charAt(0).toUpperCase() + eventEssentials.t.slice(1)} celebration`
      : "our celebration";

    const text = `Hi ${guest.name}! You are warmly invited to join ${hostLabel} for ${title}. Please view your personal invitation card and let us know if you can make it:\n\n${fullUrl}`;
    const encoded = encodeURIComponent(text);
    window.open(
      `https://wa.me/?text=${encoded}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // Action: Show QR Modal
  const handleShowQr = (guest: Guest) => {
    const fullUrl = getGuestInviteUrl(guest);
    setQrGuest({ name: guest.name, url: fullUrl });
  };

  // Action: Parse Pasted Replies
  const handleApplyReplies = () => {
    if (!pastedReplies.trim()) {
      setParseNotice("Please paste replies to apply.");
      return;
    }

    const result = parseRsvpReplies(pastedReplies, guests);
    onUpdateGuests(result.updatedGuests);
    setParseNotice(result.summaryMessage);
    setPastedReplies("");
  };

  // Filtered guest list
  const filteredGuests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return guests.filter((g) => {
      const currentStatus = g.rsvpStatus || "pending";
      if (statusFilter !== "all" && currentStatus !== statusFilter)
        return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        (g.group && g.group.toLowerCase().includes(q))
      );
    });
  }, [guests, searchQuery, statusFilter]);

  return (
    <div className="space-y-5">
      {/* ── ARIA LIVE REGION FOR SCREEN READERS ── */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* ── LIVE TOAST NOTIFICATION ── */}
      {liveToast && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50/95 px-4 py-2.5 text-xs text-emerald-950 shadow-sm transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🎉</span>
            <span>
              <strong>RSVP Updated:</strong> {liveToast.guestName} &mdash;{" "}
              <span className="font-semibold text-emerald-800">
                {liveToast.status}
              </span>
              {liveToast.partySize > 0
                ? ` (Party of ${liveToast.partySize})`
                : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            className="rounded p-1 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
            aria-label="Dismiss RSVP notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 4-CARD SUMMARY KPI DASHBOARD ── */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Invited */}
        <div className="rounded-xl border border-[#E8DCC8] bg-[#FBF6EE] p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-[#6B5848]">
            <span>Total Invited</span>
            <span className="text-base">👥</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#2B1B14]">
              {guests.length}
            </span>
            <span className="text-xs font-medium text-[#6B5848]">contacts</span>
          </div>
          <p className="mt-0.5 text-[11px] text-[#6B5848]">
            {totalExpectedHeadcount} expected headcount
          </p>
        </div>

        {/* Card 2: Confirmed Attending */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-emerald-800">
            <span>Confirmed Attending</span>
            <span className="text-base">✅</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-900">
              {summary.confirmedSeats}
            </span>
            <span className="text-xs font-semibold text-emerald-700">seats</span>
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-700">
            {summary.confirmedGuestsCount} party leads confirmed
          </p>
        </div>

        {/* Card 3: Declined / Pending */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-rose-800">
            <span>Declined / Pending</span>
            <span className="text-base">⏳</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-rose-900">
              {summary.declinedCount}{" "}
              <span className="text-xs font-normal text-rose-700">declined</span>
            </span>
            <span className="text-stone-300">|</span>
            <span className="text-xl font-bold text-stone-700">
              {summary.pendingCount}{" "}
              <span className="text-xs font-normal text-stone-500">pending</span>
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-[#6B5848]">
            {summary.maybeCount > 0
              ? `${summary.maybeCount} tentative (maybe)`
              : "Awaiting responses"}
          </p>
        </div>

        {/* Card 4: Caterer Meal Breakdown */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-teal-800">
            <span>Caterer Meal Breakdown</span>
            <span className="text-base">🍽️</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-teal-100/80 px-2 py-0.5 text-[11px] font-semibold text-teal-900">
              🥦 Veg: {summary.vegetarianCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-orange-100/80 px-2 py-0.5 text-[11px] font-semibold text-orange-900">
              🍗 Non-veg: {summary.nonVegetarianCount}
            </span>
            {summary.eitherCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                🍽️ Any: {summary.eitherCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-teal-700">
            Live counts for caterer handover
          </p>
        </div>
      </div>

      {/* ── LOCAL WI-FI / SITE URL WARNING ── */}
      {siteInfo.isLocalOrPrivate && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900"
        >
          <span className="text-base leading-none">⚠️</span>
          <div>
            <span className="font-semibold">Local Wi-Fi Notice:</span>{" "}
            {siteInfo.warningMessage}
          </div>
        </div>
      )}

      {/* ── HOST WHATSAPP PHONE NUMBER FIELD ── */}
      <div className="space-y-1.5 rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-3.5">
        <label
          htmlFor="host-phone-input"
          className="block text-xs font-semibold text-[#2B1B14]"
        >
          Host WhatsApp Number (optional)
        </label>
        <div className="flex gap-2">
          <input
            id="host-phone-input"
            type="tel"
            value={phoneInput}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="e.g. 919876543210 (with country code)"
            className="flex-1 rounded-lg border border-[#E8DCC8] bg-[#FBF6EE] px-3 py-1.5 text-xs text-[#2B1B14] focus:border-[#5B1A2B] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
          />
        </div>
        {phoneError && (
          <p className="text-[11px] font-medium text-rose-600">{phoneError}</p>
        )}
        <p className="text-[11px] text-[#6B5848]">
          When set, guests can tap &ldquo;Send my reply&rdquo; to send their
          RSVP directly to your WhatsApp. This number is stored inside the link.
        </p>
      </div>

      {/* ── RSVP SUMMARY ROW ── */}
      <div className="space-y-3 rounded-xl border border-[#E8DCC8] bg-[#FBF6EE] p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6B5848]">
            RSVP Summary
          </span>
          <span className="text-xs font-medium text-[#2B1B14]">
            {summary.confirmedGuestsCount} of {summary.totalGuests} guests
            responded
          </span>
        </div>

        {/* Counter Grid */}
        <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-2">
            <span className="block text-base font-semibold text-emerald-900">
              {summary.confirmedSeats}
            </span>
            <span className="text-[10px] font-medium uppercase text-emerald-700">
              Confirmed
            </span>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-2">
            <span className="block text-base font-semibold text-rose-900">
              {summary.declinedCount}
            </span>
            <span className="text-[10px] font-medium uppercase text-rose-700">
              Declined
            </span>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2">
            <span className="block text-base font-semibold text-amber-900">
              {summary.maybeCount}
            </span>
            <span className="text-[10px] font-medium uppercase text-amber-700">
              Maybe
            </span>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-2">
            <span className="block text-base font-semibold text-stone-800">
              {summary.pendingCount}
            </span>
            <span className="text-[10px] font-medium uppercase text-stone-500">
              Pending
            </span>
          </div>

          <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-2">
            <span className="block text-base font-semibold text-teal-900">
              {summary.vegetarianCount}
            </span>
            <span className="text-[10px] font-medium uppercase text-teal-700">
              Veg
            </span>
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-2">
            <span className="block text-base font-semibold text-orange-900">
              {summary.nonVegetarianCount}
            </span>
            <span className="text-[10px] font-medium uppercase text-orange-700">
              Non-veg
            </span>
          </div>
        </div>

        {/* Summary Action Buttons */}
        <div className="flex flex-wrap gap-2 border-t border-[#E8DCC8] pt-1">
          <button
            type="button"
            onClick={() =>
              onUseConfirmedSeatsForBudget?.(summary.confirmedSeats)
            }
            className="flex-1 rounded-lg border border-[#5B1A2B] bg-[#5B1A2B] px-3 py-1.5 text-xs font-semibold text-[#FBF6EE] hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          >
            Use confirmed seats for budget ({summary.confirmedSeats})
          </button>

          <button
            type="button"
            onClick={onAutoSeatConfirmedOnly}
            className="flex-1 rounded-lg border border-[#E8DCC8] bg-[#FFFDF8] px-3 py-1.5 text-xs font-semibold text-[#2B1B14] hover:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          >
            Auto-seat confirmed guests only
          </button>
        </div>
      </div>

      {/* ── PASTE REPLIES BOX ── */}
      <div className="space-y-2 rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-3.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="paste-replies-box"
            className="text-xs font-semibold text-[#2B1B14]"
          >
            Paste WhatsApp Replies
          </label>
          <span className="text-[11px] text-[#6B5848]">
            Auto-detects reply codes
          </span>
        </div>

        <textarea
          id="paste-replies-box"
          rows={2}
          value={pastedReplies}
          onChange={(e) => setPastedReplies(e.target.value)}
          placeholder="Paste messages received from guests containing RSVP1|... lines here"
          className="w-full rounded-lg border border-[#E8DCC8] bg-[#FBF6EE] p-2.5 font-mono text-xs text-[#2B1B14] placeholder:font-sans focus:border-[#5B1A2B] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
        />

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleApplyReplies}
            className="rounded-lg bg-[#5B1A2B] px-3.5 py-1.5 text-xs font-semibold text-[#FBF6EE] hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          >
            Apply replies
          </button>

          {parseNotice && (
            <span
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-[#2B1B14]"
            >
              ✓ {parseNotice}
            </span>
          )}
        </div>
      </div>

      {/* ── INVITATIONS LIST HEADER & CONTROLS ── */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2B1B14]">
              Guest Invites ({filteredGuests.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filteredGuests[0] && (
              <a
                href={getGuestInviteUrl(filteredGuests[0])}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open live invitation preview for ${filteredGuests[0].name} in new tab`}
                className="shadow-xs inline-flex items-center gap-1.5 rounded-lg border border-[#5B1A2B] bg-[#5B1A2B] px-3 py-1 text-xs font-semibold text-[#FBF6EE] transition-colors hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
              >
                <span>💌</span>
                <span>Open Guest Preview ({filteredGuests[0].name}) ↗</span>
              </a>
            )}

            <button
              type="button"
              onClick={() =>
                exportCatererCsv(filteredGuests, eventEssentials.t)
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8DCC8] bg-[#FFFDF8] px-2.5 py-1 text-xs font-semibold text-[#2B1B14] hover:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            >
              <span>📥</span>
              <span>Export Caterer CSV</span>
            </button>

            <button
              type="button"
              onClick={onPrintAllInvites}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8DCC8] bg-[#FFFDF8] px-2.5 py-1 text-xs font-semibold text-[#2B1B14] hover:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            >
              <span>🖨️</span>
              <span>Print all invites (4/page)</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guests..."
            aria-label="Search guests for invite"
            className="min-w-[140px] flex-1 rounded-lg border border-[#E8DCC8] bg-[#FFFDF8] px-2.5 py-1 text-xs text-[#2B1B14] focus:border-[#5B1A2B] focus:outline-none"
          />

          <div
            role="radiogroup"
            aria-label="Filter guests by RSVP status"
            className="flex items-center gap-1"
          >
            {(["all", "pending", "yes", "no", "maybe"] as const).map((st) => (
              <button
                key={st}
                type="button"
                role="radio"
                aria-checked={statusFilter === st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-[#5B1A2B] text-[#FBF6EE]"
                    : "border border-[#E8DCC8] bg-[#FFFDF8] text-[#6B5848] hover:bg-[#FBF6EE]"
                }`}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── GUEST INVITES LIST ── */}
      <div
        role="list"
        aria-label="List of guest invitations"
        className="max-h-[360px] divide-y divide-[#E8DCC8] overflow-y-auto rounded-xl border border-[#E8DCC8] bg-[#FFFDF8]"
      >
        {filteredGuests.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#6B5848]">
            No guests found matching your criteria.
          </div>
        ) : (
          filteredGuests.map((guest) => {
            const status = guest.rsvpStatus || "pending";
            const isCopied = copiedGuestId === guest.id;

            return (
              <div
                key={guest.id}
                role="listitem"
                className={`flex flex-col justify-between gap-2.5 p-3 transition-all sm:flex-row sm:items-center ${
                  recentlyUpdatedGuestId === guest.id
                    ? "bg-emerald-50/90 ring-2 ring-emerald-400"
                    : "hover:bg-[#FBF6EE]"
                }`}
              >
                {/* Guest Info & Badges */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-[#2B1B14]">
                      {guest.name}
                    </span>

                    {guest.group && (
                      <span className="py-0.2 rounded-sm bg-[#E8DCC8]/40 px-1.5 text-[10px] text-[#6B5848]">
                        {guest.group}
                      </span>
                    )}

                    {/* Status Badge */}
                    {status === "yes" && (
                      <span className="py-0.2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 text-[10px] font-semibold text-emerald-800">
                        <span>✓</span>
                        <span>Yes</span>
                        {guest.partySize && guest.partySize > 1 && (
                          <span>({guest.partySize})</span>
                        )}
                      </span>
                    )}
                    {status === "no" && (
                      <span className="py-0.2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 text-[10px] font-semibold text-rose-800">
                        <span>✕</span>
                        <span>No</span>
                      </span>
                    )}
                    {status === "maybe" && (
                      <span className="py-0.2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 text-[10px] font-semibold text-amber-800">
                        <span>?</span>
                        <span>Maybe</span>
                      </span>
                    )}
                    {status === "pending" && (
                      <span className="py-0.2 rounded-full bg-stone-100 px-2 text-[10px] font-medium text-stone-600">
                        Pending
                      </span>
                    )}

                    {/* Food Choice Badge */}
                    {guest.foodChoice && status === "yes" && (
                      <span className="py-0.2 rounded-full border border-stone-300 bg-white px-1.5 text-[10px] text-stone-700">
                        {guest.foodChoice === "vegetarian"
                          ? "🥦 Veg"
                          : "🍗 Non-veg"}
                      </span>
                    )}
                  </div>

                  {guest.note && (
                    <p className="mt-1 max-w-sm truncate text-[11px] italic text-[#6B5848]">
                      &ldquo;{guest.note}&rdquo;
                    </p>
                  )}
                </div>

                {/* Per-Guest Actions */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(guest)}
                    aria-label={`Cycle status for ${guest.name}`}
                    title="Click to toggle RSVP: Pending → Yes → No → Maybe"
                    className="rounded-lg border border-[#E8DCC8] bg-[#FFFDF8] px-2 py-1 text-xs font-semibold text-[#2B1B14] hover:border-[#5B1A2B] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
                  >
                    🔄 Cycle
                  </button>

                  <a
                    href={getGuestInviteUrl(guest)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open invitation preview for ${guest.name} in new tab`}
                    className="shadow-xs inline-flex items-center gap-1 rounded-lg border border-[#5B1A2B] bg-[#5B1A2B] px-2.5 py-1 text-xs font-semibold text-[#FBF6EE] transition-colors hover:bg-[#3A0F1C] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
                  >
                    <span>Open ↗</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(guest)}
                    aria-label={`Copy invitation link for ${guest.name}`}
                    className="rounded-lg border border-[#E8DCC8] bg-[#FFFDF8] px-2.5 py-1 text-xs font-semibold text-[#2B1B14] hover:border-[#5B1A2B] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
                  >
                    {isCopied ? "✓ Copied" : "Copy link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(guest)}
                    aria-label={`Send invitation to ${guest.name} on WhatsApp`}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShowQr(guest)}
                    aria-label={`Show QR code for ${guest.name}`}
                    className="rounded-lg border border-[#E8DCC8] bg-[#FFFDF8] px-2.5 py-1 text-xs font-semibold text-[#2B1B14] hover:border-[#5B1A2B] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
                  >
                    Show QR
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── QR CODE MODAL ── */}
      {qrGuest && (
        <QrModal
          isOpen={Boolean(qrGuest)}
          onClose={() => setQrGuest(null)}
          guestName={qrGuest.name}
          inviteUrl={qrGuest.url}
        />
      )}
    </div>
  );
}
