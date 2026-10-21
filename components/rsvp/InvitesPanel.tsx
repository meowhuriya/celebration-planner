"use client";

import { useState, useMemo, useCallback } from "react";
import type { Guest } from "@/lib/seating";
import type { EventEssentials, RsvpStatus } from "@/lib/rsvp/types";
import { encodeInvitePayload } from "@/lib/rsvp/payload";
import { parseRsvpReplies, calculateRsvpSummary } from "@/lib/rsvp/parser";
import { getSiteUrlInfo, validateHostPhone } from "@/lib/rsvp/site";
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

  // Site Address and Local Wi-Fi Warning
  const siteInfo = useMemo(() => {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    return getSiteUrlInfo(envUrl);
  }, []);

  // Summary calculations
  const summary = useMemo(() => calculateRsvpSummary(guests), [guests]);

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

  // Generate Invite URL for a guest
  const getGuestInviteUrl = useCallback(
    async (guest: Guest): Promise<string> => {
      const mergedEssentials: EventEssentials = {
        ...eventEssentials,
        ph: phoneInput ? phoneInput.replace(/[\s\-\+\(\)]/g, "") : undefined,
      };

      const hash = await encodeInvitePayload({
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
    [eventEssentials, phoneInput, siteInfo.siteUrl]
  );

  // Action: Copy Personal Invite Link
  const handleCopyLink = async (guest: Guest) => {
    try {
      const fullUrl = await getGuestInviteUrl(guest);
      await navigator.clipboard.writeText(fullUrl);
      setCopiedGuestId(guest.id);
      setAnnouncement(`Invite link copied for ${guest.name}`);
      setTimeout(() => setCopiedGuestId(null), 2500);
    } catch {
      setAnnouncement("Failed to copy link to clipboard");
    }
  };

  // Action: Send on WhatsApp
  const handleSendWhatsApp = async (guest: Guest) => {
    const fullUrl = await getGuestInviteUrl(guest);
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
  const handleShowQr = async (guest: Guest) => {
    const fullUrl = await getGuestInviteUrl(guest);
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

          <button
            type="button"
            onClick={onPrintAllInvites}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8DCC8] bg-[#FFFDF8] px-2.5 py-1 text-xs font-semibold text-[#2B1B14] hover:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          >
            <span>🖨️</span>
            <span>Print all invites (4/page)</span>
          </button>
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
                className="flex flex-col justify-between gap-2.5 p-3 transition-colors hover:bg-[#FBF6EE] sm:flex-row sm:items-center"
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
