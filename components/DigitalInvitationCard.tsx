"use client";

import { useState, useCallback, useMemo } from "react";
import type { EventInput, EventPalette } from "@/lib/schemas";
import { type InviteCardData, type CardStyle } from "@/lib/invitation";
import {
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
  buildLocalizedInviteText,
} from "@/lib/languages";
import DesignerCard from "@/components/invitation/DesignerCard";

interface DigitalInvitationCardProps {
  input?: Partial<EventInput> | null;
  palette?: EventPalette | null;
  className?: string;
}

export default function DigitalInvitationCard({
  input,
  palette,
  className = "",
}: DigitalInvitationCardProps) {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("en");
  const [cardStyle, setCardStyle] = useState<CardStyle>("royal");
  const [copied, setCopied] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const currentLangConfig = useMemo(
    () =>
      SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) ??
      SUPPORTED_LANGUAGES[0],
    [selectedLang]
  );

  const cardData: InviteCardData = useMemo(
    () => ({
      hostName: input?.hostName ?? "",
      eventType: input?.eventType ?? "celebration",
      eventDate: input?.eventDate ?? "",
      city: input?.city ?? "",
      guestCount: input?.guestCount,
      vibeOrTheme: input?.vibeOrTheme ?? "",
      cultureOrTradition: input?.cultureOrTradition ?? "",
      specialRequirements: input?.specialRequirements ?? "",
      venueName: input?.venueName ?? "",
      dressCode: input?.dressCode ?? "",
    }),
    [
      input?.hostName,
      input?.eventType,
      input?.eventDate,
      input?.city,
      input?.guestCount,
      input?.vibeOrTheme,
      input?.cultureOrTradition,
      input?.specialRequirements,
      input?.venueName,
      input?.dressCode,
    ]
  );

  const inviteText = useMemo(
    () => buildLocalizedInviteText(cardData, selectedLang),
    [cardData, selectedLang]
  );

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteText);
      }
      setCopied(true);
      setLiveAnnouncement("Invite text copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        setLiveAnnouncement("");
      }, 2500);
    } catch {
      setLiveAnnouncement("Failed to copy invite text");
      setTimeout(() => setLiveAnnouncement(""), 2000);
    }
  }, [inviteText]);

  const handlePrintCard = useCallback(() => {
    if (typeof document === "undefined" || typeof window === "undefined")
      return;
    document.body.classList.add("print-card-mode");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-card-mode");
    }, 500);
  }, []);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;

  return (
    <section
      aria-label="Digital Invitation Card"
      className={`relative mx-auto w-full max-w-lg ${className}`}
    >
      {/* Live announcement region for accessibility */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Top Controls: Card Style & Language Selectors */}
      <div className="mb-4 space-y-2.5 print:hidden">
        {/* Card Style Selector: Royal, Modern, Floral */}
        <div
          role="radiogroup"
          aria-label="Select card style"
          className="flex flex-wrap items-center justify-center gap-1.5"
        >
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
            Style:
          </span>
          {[
            { id: "royal", label: "Royal", icon: "👑" },
            { id: "modern", label: "Modern", icon: "🏛️" },
            { id: "floral", label: "Floral", icon: "🌸" },
          ].map((style) => {
            const isSelected = cardStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setCardStyle(style.id as CardStyle)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#111111] text-[#F7F7F7] shadow-sm ring-1 ring-[#111111]"
                    : "border border-stone-300 bg-white/90 text-stone-700 hover:bg-white"
                }`}
              >
                <span aria-hidden="true">{style.icon}</span>
                <span>{style.label}</span>
              </button>
            );
          })}
        </div>

        {/* Language Selector: English, हिन्दी, اردو, తెలుగు */}
        <div
          role="radiogroup"
          aria-label="Select invitation language"
          className="flex flex-wrap items-center justify-center gap-1.5"
        >
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
            Language:
          </span>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedLang(lang.code)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? "shadow-xs bg-[#111111] text-[#F7F7F7] ring-1 ring-[#111111]"
                    : "border border-stone-300 bg-white/90 text-stone-700 hover:bg-white"
                } ${lang.fontClass}`}
              >
                {lang.nativeLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Designer Card Body (Printable Target) */}
      <div
        className="invitation-card-print-target group border-0 bg-transparent shadow-none transition-all"
        lang={selectedLang}
        dir={currentLangConfig.dir}
      >
        <DesignerCard
          data={cardData}
          cardStyle={cardStyle}
          selectedLang={selectedLang}
          palette={palette}
          defaultHostText="You Are Invited"
        />
      </div>

      {/* Action Buttons: Copy, WhatsApp, Print */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 print:hidden">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] px-4 py-2 text-xs font-semibold text-[#F7F7F7] shadow-sm transition-all hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#111111]"
          aria-label="Copy invitation text"
        >
          {copied ? (
            <>
              <span aria-hidden="true">✓</span>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">📋</span>
              <span>Copy invitation text</span>
            </>
          )}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#20ba5a] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Share invitation on WhatsApp"
        >
          <span aria-hidden="true">💬</span>
          <span>Share on WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handlePrintCard}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-sm transition-all hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400"
          aria-label="Print or save invitation card"
        >
          <span aria-hidden="true">🖨️</span>
          <span>Print / Save as PDF</span>
        </button>
      </div>
    </section>
  );
}
