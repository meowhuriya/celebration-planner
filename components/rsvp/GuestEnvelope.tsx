"use client";

import { useState, useEffect } from "react";
import type { InvitePayload } from "@/lib/rsvp/types";
import DesignerCard from "@/components/invitation/DesignerCard";
import { formatRsvpHumanMessage } from "@/lib/rsvp/parser";
import {
  buildIcsCalendar,
  triggerIcsDownload,
  getGoogleMapsUrl,
} from "@/lib/invitation";

interface GuestEnvelopeProps {
  payload: InvitePayload;
  className?: string;
}

export default function GuestEnvelope({
  payload,
  className = "",
}: GuestEnvelopeProps) {
  // Animation state: envelope closed vs open
  const [isOpen, setIsOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // RSVP Form state
  const [attending, setAttending] = useState<"yes" | "no" | "maybe" | null>(
    null
  );
  const [partySize, setPartySize] = useState<number>(1);
  const [foodChoice, setFoodChoice] = useState<
    "vegetarian" | "non-vegetarian" | "either"
  >("vegetarian");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setPrefersReducedMotion(true);
      setIsOpen(true); // Skip envelope animation directly
    }

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setIsOpen(true);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const { e: eventData, g: guestData } = payload;
  const guestName = guestData.n;
  const hostName = eventData.h || "Your Host";
  const eventTitle = eventData.t
    ? `${eventData.t.charAt(0).toUpperCase() + eventData.t.slice(1)} celebration`
    : "Celebration";

  // Handle Envelope Open
  const handleOpenEnvelope = () => {
    setIsOpen(true);
    setAnnouncement(`Envelope opened. Invitation for ${guestName} revealed.`);
  };

  // Handle Submit RSVP
  const handleSendReply = async () => {
    if (!attending) {
      setAnnouncement("Please choose whether you are attending.");
      return;
    }

    const humanMessage = formatRsvpHumanMessage(
      eventData.h || "",
      guestName,
      eventTitle,
      attending,
      partySize,
      foodChoice,
      note,
      guestData.id
    );

    setSubmitted(true);

    // If host WhatsApp phone exists, open wa.me
    if (eventData.ph) {
      const cleanPhone = eventData.ph.replace(/[\s\-\+\(\)]/g, "");
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        humanMessage
      )}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
      setAnnouncement("Opening WhatsApp to send your reply.");
      return;
    }

    // If no host phone, try Web Share API
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `RSVP for ${eventTitle}`,
          text: humanMessage,
        });
        setAnnouncement("Reply shared successfully.");
        return;
      } catch {
        // Fall back to copy
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(humanMessage);
      setCopyFeedback(true);
      setAnnouncement("Reply copied to clipboard! Send this to your host.");
      setTimeout(() => setCopyFeedback(false), 3000);
    } catch {
      setAnnouncement("Please copy your reply manually.");
    }
  };

  // Action: Save to calendar (.ics)
  const handleDownloadCalendar = () => {
    const icsContent = buildIcsCalendar({
      title: eventTitle,
      eventDate: eventData.d || "",
      venueName: eventData.v,
      city: eventData.c,
      hostName: eventData.h,
      dressCode: eventData.dc,
      theme: eventData.th,
    });
    const filename = `${eventTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}-invite`;
    triggerIcsDownload(filename, icsContent);
    setAnnouncement("Calendar event downloaded.");
  };

  const mapsUrl = getGoogleMapsUrl(eventData.v, eventData.c);

  return (
    <div className={`mx-auto w-full max-w-lg ${className}`}>
      {/* ── ARIA LIVE ANNOUNCEMENTS ── */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* ── CLOSED ENVELOPE STATE ── */}
      {!isOpen ? (
        <div className="animate-in fade-in flex flex-col items-center justify-center p-6 text-center duration-300">
          <div className="relative flex aspect-[4/3] w-full max-w-sm flex-col items-center justify-between overflow-hidden rounded-3xl border-2 border-[#5B1A2B] bg-[#FBF6EE] p-6 shadow-xl">
            {/* Flap Triangle Shadow */}
            <div
              className="absolute left-0 right-0 top-0 h-28 origin-top border-b border-[#E8DCC8] bg-[#E8DCC8]/60"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              }}
              aria-hidden="true"
            />

            {/* Wax Seal / Stamp Button */}
            <div className="relative z-10 flex h-full flex-col items-center justify-center space-y-4 pt-12">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B5848]">
                Personal Invitation
              </span>

              <h1 className="font-serif text-2xl font-normal text-[#2B1B14]">
                Dear {guestName}
              </h1>

              <button
                type="button"
                onClick={handleOpenEnvelope}
                className="group relative mt-2 inline-flex items-center gap-2 rounded-full border-2 border-[#5B1A2B] bg-[#5B1A2B] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#FBF6EE] shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-2 active:scale-95"
                aria-label={`Open invitation envelope for ${guestName}`}
              >
                <span>✉️</span>
                <span>Tap to open</span>
              </button>
            </div>

            <p className="relative z-10 text-[11px] text-[#6B5848]">
              Celebration planned with care
            </p>
          </div>
        </div>
      ) : (
        /* ── OPEN STATE: REVEALED CARD & RSVP FORM ── */
        <div
          className={`space-y-8 ${
            prefersReducedMotion
              ? ""
              : "animate-in fade-in slide-in-from-bottom-8 duration-500"
          }`}
        >
          {/* Guest Greeting Header */}
          <div className="pt-2 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B5848]">
              Exclusive Invitation
            </span>
            <h1 className="mt-1 font-serif text-3xl font-normal tracking-tight text-[#2B1B14]">
              Dear {guestName},
            </h1>
            <p className="mt-1 text-xs text-[#6B5848]">
              You are warmly invited by {hostName}
            </p>
          </div>

          {/* Redesigned Invitation Card */}
          <div className="flex flex-col items-center justify-center">
            <h2 className="sr-only">Invitation Card</h2>
            <DesignerCard
              data={{
                hostName: eventData.h,
                eventType: eventData.t,
                eventDate: eventData.d,
                city: eventData.c,
                venueName: eventData.v,
                vibeOrTheme: eventData.th,
                dressCode: eventData.dc,
              }}
              cardStyle={eventData.s || "royal"}
              palette={
                eventData.p
                  ? { name: "Event Palette", colors: eventData.p }
                  : undefined
              }
            />
          </div>

          {/* ── RSVP FORM SECTION ── */}
          <div className="rounded-3xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 shadow-sm sm:p-8">
            <div className="mb-5 border-b border-[#E8DCC8] pb-4 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6B5848]">
                RSVP Response
              </span>
              <h2 className="mt-1 font-serif text-2xl font-normal text-[#2B1B14]">
                Will you be attending?
              </h2>
              <p className="mt-1 text-xs text-[#6B5848]">
                Please let {hostName} know so seating and arrangements can be
                finalized.
              </p>
            </div>

            {!submitted ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReply();
                }}
                className="space-y-5"
              >
                {/* Attending Selection */}
                <div
                  role="radiogroup"
                  aria-label="Will you be attending?"
                  className="grid grid-cols-3 gap-2"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={attending === "yes"}
                    onClick={() => setAttending("yes")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3.5 text-center transition-all ${
                      attending === "yes"
                        ? "border-[#5B1A2B] bg-[#5B1A2B] text-[#FBF6EE] shadow-sm ring-1 ring-[#5B1A2B]"
                        : "border-[#E8DCC8] bg-[#FBF6EE] text-[#2B1B14] hover:border-[#5B1A2B]"
                    }`}
                  >
                    <span className="text-xl" aria-hidden="true">
                      🎉
                    </span>
                    <span className="text-xs font-semibold">Yes</span>
                    <span className="text-[10px] opacity-80">Attending</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={attending === "maybe"}
                    onClick={() => setAttending("maybe")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3.5 text-center transition-all ${
                      attending === "maybe"
                        ? "border-[#5B1A2B] bg-[#5B1A2B] text-[#FBF6EE] shadow-sm ring-1 ring-[#5B1A2B]"
                        : "border-[#E8DCC8] bg-[#FBF6EE] text-[#2B1B14] hover:border-[#5B1A2B]"
                    }`}
                  >
                    <span className="text-xl" aria-hidden="true">
                      🤔
                    </span>
                    <span className="text-xs font-semibold">Maybe</span>
                    <span className="text-[10px] opacity-80">Tentative</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={attending === "no"}
                    onClick={() => setAttending("no")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3.5 text-center transition-all ${
                      attending === "no"
                        ? "border-[#5B1A2B] bg-[#5B1A2B] text-[#FBF6EE] shadow-sm ring-1 ring-[#5B1A2B]"
                        : "border-[#E8DCC8] bg-[#FBF6EE] text-[#2B1B14] hover:border-[#5B1A2B]"
                    }`}
                  >
                    <span className="text-xl" aria-hidden="true">
                      💌
                    </span>
                    <span className="text-xs font-semibold">No</span>
                    <span className="text-[10px] opacity-80">
                      Can&apos;t make it
                    </span>
                  </button>
                </div>

                {/* Party Size & Food Preference (if attending or maybe) */}
                {attending !== "no" && (
                  <div className="space-y-4 border-t border-[#E8DCC8] pt-2">
                    {/* Party Size */}
                    <div className="space-y-1.5">
                      <label
                        id="party-size-label"
                        className="block text-xs font-semibold text-[#2B1B14]"
                      >
                        Party size (including yourself)
                      </label>
                      <div
                        role="radiogroup"
                        aria-labelledby="party-size-label"
                        className="flex gap-2"
                      >
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            role="radio"
                            aria-checked={partySize === num}
                            onClick={() => setPartySize(num)}
                            className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                              partySize === num
                                ? "border-[#5B1A2B] bg-[#5B1A2B] text-[#FBF6EE]"
                                : "border-[#E8DCC8] bg-[#FBF6EE] text-[#2B1B14] hover:border-[#5B1A2B]"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Meal Preference */}
                    <div className="space-y-1.5">
                      <label
                        id="food-choice-label"
                        className="block text-xs font-semibold text-[#2B1B14]"
                      >
                        Food preference
                      </label>
                      <div
                        role="radiogroup"
                        aria-labelledby="food-choice-label"
                        className="grid grid-cols-3 gap-2"
                      >
                        {[
                          { key: "vegetarian", label: "🥦 Vegetarian" },
                          { key: "non-vegetarian", label: "🍗 Non-veg" },
                          { key: "either", label: "🍽️ Either" },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            role="radio"
                            aria-checked={foodChoice === item.key}
                            onClick={() =>
                              setFoodChoice(
                                item.key as
                                  "vegetarian" | "non-vegetarian" | "either"
                              )
                            }
                            className={`rounded-xl border px-2 py-2 text-center text-xs font-semibold transition-all ${
                              foodChoice === item.key
                                ? "border-[#5B1A2B] bg-[#5B1A2B] text-[#FBF6EE]"
                                : "border-[#E8DCC8] bg-[#FBF6EE] text-[#2B1B14] hover:border-[#5B1A2B]"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Note */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="rsvp-note-input"
                      className="text-xs font-semibold text-[#2B1B14]"
                    >
                      Note for {hostName} (optional)
                    </label>
                    <span className="text-[11px] text-[#6B5848]">
                      {note.length} / 140
                    </span>
                  </div>
                  <textarea
                    id="rsvp-note-input"
                    rows={2}
                    maxLength={140}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add dietary restrictions, congratulations, or special wishes..."
                    className="w-full rounded-xl border border-[#E8DCC8] bg-[#FBF6EE] p-3 text-xs text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
                  />
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={!attending}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSendReply();
                  }}
                  className="w-full rounded-2xl bg-[#5B1A2B] py-3 text-sm font-semibold text-[#FBF6EE] shadow-md transition-transform hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
                >
                  {eventData.ph ? "Send my reply on WhatsApp" : "Send my reply"}
                </button>
              </form>
            ) : (
              /* ── THANK-YOU CONFIRMATION STATE ── */
              <div className="animate-in fade-in space-y-4 py-4 text-center duration-300">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-800">
                  ✓
                </div>

                <div>
                  <h3 className="font-serif text-2xl font-normal text-[#2B1B14]">
                    Thank you, {guestName}!
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-[#6B5848]">
                    Your reply has been prepared. If WhatsApp didn&apos;t open
                    automatically, you can copy your response below.
                  </p>
                </div>

                {/* Copy Feedback */}
                {copyFeedback && (
                  <div
                    role="status"
                    className="rounded-xl bg-[#3A0F1C] p-2.5 text-xs text-[#FBF6EE]"
                  >
                    ✓ Reply copied to clipboard! Paste it into WhatsApp or text.
                  </div>
                )}

                {/* Save to Calendar & Open Map Actions */}
                <div className="flex flex-wrap items-center justify-center gap-2 border-t border-[#E8DCC8] pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadCalendar}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DCC8] bg-[#FBF6EE] px-4 py-2 text-xs font-semibold text-[#2B1B14] transition-colors hover:bg-[#FFFDF8]"
                  >
                    <span>📅</span>
                    <span>Save to calendar</span>
                  </button>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DCC8] bg-[#FBF6EE] px-4 py-2 text-xs font-semibold text-[#2B1B14] transition-colors hover:bg-[#FFFDF8]"
                  >
                    <span>🗺️</span>
                    <span>Open map ↗</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <p className="mx-auto max-w-sm text-center text-[11px] leading-relaxed text-[#6B5848]">
            Privacy notice: This invitation link contains the guest&apos;s name
            and celebration details stored securely within the link. No personal
            data is sent to or stored on external servers.
          </p>
        </div>
      )}
    </div>
  );
}
