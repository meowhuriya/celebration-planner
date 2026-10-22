"use client";

import React, { useId } from "react";
import {
  type InviteCardData,
  type CardStyle,
  getCardStyleConfig,
  parseInviteDate,
  formatEventHeadline,
  buildIcsCalendar,
  triggerIcsDownload,
  getGoogleMapsUrl,
} from "@/lib/invitation";
import {
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
  getTranslations,
} from "@/lib/languages";
import { getHostFontSizeClass } from "@/lib/physics/rope";
import type { EventPalette } from "@/lib/schemas";

export interface DesignerCardProps {
  data: InviteCardData;
  cardStyle?: CardStyle;
  selectedLang?: SupportedLanguage;
  palette?: EventPalette | null;
  className?: string;
  isPrintView?: boolean;
  defaultHostText?: string;
  showActions?: boolean;
}

/**
 * Architectural divider: thin line, small diamond in the middle, thin line again.
 */
function CardDivider({ color }: { color: string }) {
  return (
    <div className="my-3.5 flex items-center justify-center" aria-hidden="true">
      <svg className="h-3 w-36" viewBox="0 0 144 12" fill="none" stroke={color}>
        {/* Left thin line */}
        <line
          x1="8"
          y1="6"
          x2="60"
          y2="6"
          strokeWidth="0.8"
          strokeOpacity="0.45"
        />
        {/* Small diamond in the middle */}
        <polygon
          points="72,2.5 75.5,6 72,9.5 68.5,6"
          fill={color}
          stroke="none"
        />
        {/* Right thin line */}
        <line
          x1="84"
          y1="6"
          x2="136"
          y2="6"
          strokeWidth="0.8"
          strokeOpacity="0.45"
        />
      </svg>
    </div>
  );
}

/**
 * Neutral RSVP QR Code placeholder SVG with high-contrast label.
 */
function QrPlaceholder({
  color,
  labelColor,
}: {
  color: string;
  labelColor: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center pt-1 print:hidden">
      <div className="shadow-2xs rounded-lg border border-stone-300/80 bg-white p-1.5">
        <svg
          className="h-12 w-12"
          viewBox="0 0 32 32"
          fill={color}
          aria-hidden="true"
        >
          {/* Top-Left Finder */}
          <rect
            x="2"
            y="2"
            width="8"
            height="8"
            rx="1"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
          />
          <rect x="4.5" y="4.5" width="3" height="3" rx="0.5" />
          {/* Top-Right Finder */}
          <rect
            x="22"
            y="2"
            width="8"
            height="8"
            rx="1"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
          />
          <rect x="24.5" y="4.5" width="3" height="3" rx="0.5" />
          {/* Bottom-Left Finder */}
          <rect
            x="2"
            y="22"
            width="8"
            height="8"
            rx="1"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
          />
          <rect x="4.5" y="24.5" width="3" height="3" rx="0.5" />
          {/* Data Bits */}
          <rect x="12" y="3" width="2" height="2" />
          <rect x="16" y="3" width="3" height="2" />
          <rect x="13" y="7" width="2" height="3" />
          <rect x="17" y="7" width="2" height="2" />
          <rect x="3" y="12" width="2" height="2" />
          <rect x="7" y="13" width="3" height="2" />
          <rect x="12" y="12" width="3" height="3" />
          <rect x="17" y="13" width="2" height="2" />
          <rect x="21" y="12" width="2" height="3" />
          <rect x="25" y="14" width="3" height="2" />
          <rect x="12" y="18" width="2" height="3" />
          <rect x="16" y="17" width="3" height="2" />
          <rect x="21" y="18" width="3" height="2" />
          <rect x="26" y="19" width="2" height="3" />
          <rect x="12" y="24" width="3" height="2" />
          <rect x="17" y="23" width="2" height="3" />
          <rect x="22" y="24" width="2" height="2" />
          <rect x="26" y="25" width="3" height="2" />
        </svg>
      </div>
      <span
        className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: labelColor }}
      >
        Scan to RSVP
      </span>
    </div>
  );
}

/**
 * Premium Designer Digital Invitation Card
 *
 * Implements architectural shapes (Wedding Arch, Birthday Scallop/Confetti, Community Geometric Frame),
 * an inner frosted vellum panel, 6% paper grain texture, gold foil with shine sweep, and big date block.
 */
export default function DesignerCard({
  data,
  cardStyle = "royal",
  selectedLang = "en",
  palette,
  className = "",
  isPrintView = false,
  defaultHostText,
  showActions = true,
}: DesignerCardProps) {
  const grainFilterId = useId();

  const config = getCardStyleConfig(
    cardStyle,
    data.eventType,
    data.cultureOrTradition,
    palette
  );

  const t = getTranslations(selectedLang);
  const currentLangConfig =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) ??
    SUPPORTED_LANGUAGES[0];

  const parsedDate = parseInviteDate(data.eventDate);
  const headline = formatEventHeadline(data.eventType, data.cultureOrTradition);
  const mapsUrl = getGoogleMapsUrl(data.venueName, data.city);

  const hasCustomHost = Boolean(data.hostName?.trim());
  const hostDisplay = hasCustomHost
    ? data.hostName!.trim()
    : (defaultHostText ??
      (selectedLang === "en" ? "You Are Invited" : t.youreInvited));

  const hostFontSize = getHostFontSizeClass(hostDisplay);

  const handleDownloadCalendar = () => {
    const icsContent = buildIcsCalendar({
      title: headline,
      eventDate: data.eventDate || "",
      venueName: data.venueName,
      city: data.city,
      hostName: data.hostName,
      dressCode: data.dressCode,
      theme: data.vibeOrTheme || data.cultureOrTradition,
    });
    const filename = `${headline.toLowerCase().replace(/[^a-z0-9]/g, "-")}-invitation`;
    triggerIcsDownload(filename, icsContent);
  };

  // Card shape radii
  const isRoyal =
    cardStyle === "royal" ||
    (!cardStyle && data.eventType?.toLowerCase() === "wedding");
  const isBirthday =
    !isRoyal &&
    (data.eventType?.toLowerCase() === "birthday" ||
      config.variant === "birthday");
  const isCommunity = config.variant === "community";

  const outerShapeClass = isRoyal
    ? "rounded-t-[88px] sm:rounded-t-[100px] rounded-b-2xl sm:rounded-b-3xl"
    : isBirthday
      ? "rounded-[32px] sm:rounded-[36px]"
      : "rounded-2xl sm:rounded-3xl";

  const vellumShapeClass = isRoyal
    ? "rounded-t-[72px] sm:rounded-t-[84px] rounded-b-xl"
    : isBirthday
      ? "rounded-2xl"
      : "rounded-xl";

  return (
    <div
      data-testid="designer-card-wrapper"
      className={`relative mx-auto w-full max-w-[340px] select-none border-0 bg-transparent shadow-none transition-transform duration-300 sm:max-w-[360px] ${className}`}
      style={{
        filter: isPrintView
          ? "none"
          : "drop-shadow(0 12px 22px rgba(0, 0, 0, 0.12))",
      }}
      dir={currentLangConfig.dir}
      lang={currentLangConfig.code}
    >
      {/* ── Layer 1: Subtle Back Layer (in same shape, offset 6px, rotated 1.5deg) ── */}
      {!isPrintView && (
        <div
          data-testid="card-back-layer"
          className={`absolute inset-0 ${outerShapeClass} pointer-events-none transition-transform duration-300`}
          style={{
            transform: "translate3d(6px, 6px, 0) rotate(1.5deg)",
            background: config.backLayerBg,
            border: config.backLayerBorder,
            zIndex: 0,
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Layer 2: Main Outer Card ── */}
      <div
        data-testid="designer-card-front"
        className={`relative z-10 overflow-hidden ${outerShapeClass} ${config.cardBorder} shadow-none transition-all duration-300`}
        style={{ background: config.cardBg }}
      >
        {/* Subtle Paper Grain Filter (6% opacity) */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06] mix-blend-overlay"
          aria-hidden="true"
        >
          <filter id={`grain-${grainFilterId}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter={`url(#grain-${grainFilterId})`}
          />
        </svg>

        {/* ── Birthday Scalloped Top Edge & Confetti Layer ── */}
        {isBirthday && (
          <>
            <svg
              className="pointer-events-none absolute -top-1 left-0 right-0 h-4 w-full text-white/40"
              viewBox="0 0 320 16"
              preserveAspectRatio="none"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M0,16 L0,8 Q10,-2 20,8 Q30,-2 40,8 Q50,-2 60,8 Q70,-2 80,8 Q90,-2 100,8 Q110,-2 120,8 Q130,-2 140,8 Q150,-2 160,8 Q170,-2 180,8 Q190,-2 200,8 Q210,-2 220,8 Q230,-2 240,8 Q250,-2 260,8 Q270,-2 280,8 Q290,-2 300,8 Q310,-2 320,8 L320,16 Z" />
            </svg>
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden text-amber-300"
              viewBox="0 0 320 480"
              aria-hidden="true"
            >
              <circle
                cx="280"
                cy="50"
                r="3"
                fill="currentColor"
                opacity="0.35"
              />
              <circle
                cx="35"
                cy="190"
                r="2.5"
                fill="currentColor"
                opacity="0.35"
              />
              <circle
                cx="295"
                cy="280"
                r="3"
                fill="currentColor"
                opacity="0.3"
              />
              <circle
                cx="40"
                cy="350"
                r="2"
                fill="currentColor"
                opacity="0.35"
              />
              <path
                d="M48,110 L50,115 L55,117 L50,119 L48,124 L46,119 L41,117 L46,115 Z"
                fill="currentColor"
                opacity="0.4"
              />
              <path
                d="M275,180 L277,184 L281,185 L277,187 L275,191 L273,187 L269,185 L273,184 Z"
                fill="currentColor"
                opacity="0.4"
              />
            </svg>
          </>
        )}

        {/* ── Community Geometric Pattern Frame ── */}
        {isCommunity && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full text-stone-700/25"
            viewBox="0 0 320 480"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <rect
              x="6"
              y="6"
              width="308"
              height="468"
              rx="18"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <rect
              x="11"
              y="11"
              width="298"
              height="458"
              rx="14"
              strokeWidth="1.2"
              opacity="0.4"
            />
            <polygon
              points="12,20 20,12 28,20 20,28"
              strokeWidth="1"
              opacity="0.5"
            />
            <polygon
              points="292,20 300,12 308,20 300,28"
              strokeWidth="1"
              opacity="0.5"
            />
            <polygon
              points="12,460 20,452 28,460 20,468"
              strokeWidth="1"
              opacity="0.5"
            />
            <polygon
              points="292,460 300,452 308,460 300,468"
              strokeWidth="1"
              opacity="0.5"
            />
          </svg>
        )}

        {/* ── Layer 3: Inner Frosted Vellum Panel ── */}
        <div
          className={`relative z-10 m-3 p-5 sm:m-4 sm:p-6 ${vellumShapeClass} ${config.vellumBg} ${config.vellumBorder} ${config.vellumBackdrop} border text-center transition-all duration-300`}
        >
          {/* Header Tag / Spaced Caps */}
          <div className="mb-2 flex items-center justify-center gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.25em]"
              style={{ color: config.labelTextColor }}
            >
              {selectedLang === "en"
                ? "YOU'RE INVITED"
                : t.youreInvited.toUpperCase()}
            </span>
          </div>

          {/* Host Name in Display Serif (Gold foil on Royal, or solid high contrast) */}
          <div className="my-2.5">
            <h3
              className={`font-serif font-normal leading-tight tracking-tight transition-all duration-300 ${hostFontSize} ${
                config.useGoldFoil ? "gold-foil-text gold-foil-shine" : ""
              }`}
              style={{
                color: config.useGoldFoil ? undefined : config.hostTextColor,
              }}
            >
              {hostDisplay.includes(" & ") ? (
                <>
                  <span className="sr-only">{hostDisplay}</span>
                  <span aria-hidden="true">
                    {hostDisplay.split(" & ")[0]}{" "}
                    <span className="font-serif font-normal italic">&amp;</span>{" "}
                    {hostDisplay.split(" & ").slice(1).join(" & ")}
                  </span>
                </>
              ) : (
                hostDisplay
              )}
            </h3>
          </div>

          {/* Boilerplate text */}
          <p
            className="my-1 text-xs font-normal leading-relaxed"
            style={{ color: config.bodyTextColor }}
          >
            {hasCustomHost
              ? selectedLang === "en"
                ? "invites you to celebrate"
                : t.invitesYouToCelebrate
              : selectedLang === "en"
                ? "to join the celebration of"
                : t.joinCelebration}
          </p>

          {/* Event Title */}
          <p
            className="mt-1 font-serif text-lg font-normal tracking-tight sm:text-xl"
            style={{ color: config.headlineTextColor }}
          >
            {headline}
          </p>

          {/* Ornamental Divider */}
          <CardDivider color={config.dividerColor} />

          {/* ── Big Date Block ── */}
          <div
            className={`shadow-xs my-3.5 rounded-xl border p-3 text-left backdrop-blur-md sm:p-3.5 ${
              cardStyle === "royal"
                ? "border-[#D4AF37]/35 bg-black/50"
                : cardStyle === "modern"
                  ? "border-[#E7E2D9] bg-white/95"
                  : "border-rose-200/80 bg-white/95"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Huge Day Number */}
              <div
                className="shrink-0 font-serif text-4xl font-normal leading-none sm:text-5xl"
                style={{ color: config.dateDayColor }}
                suppressHydrationWarning
              >
                {parsedDate.dayNumber}
              </div>

              {/* Month, Year, and Day of Week */}
              <div
                className="flex flex-col justify-center border-l pl-3 leading-tight"
                style={{
                  borderColor:
                    cardStyle === "royal"
                      ? "rgba(212,175,55,0.35)"
                      : "rgba(0,0,0,0.15)",
                }}
              >
                <span
                  className="text-xs font-bold uppercase tracking-[0.16em]"
                  style={{ color: config.dateSubColor }}
                  suppressHydrationWarning
                >
                  {parsedDate.monthName} {parsedDate.yearNumber}
                </span>
                <span
                  className="mt-0.5 text-[11px] font-semibold"
                  style={{
                    color:
                      cardStyle === "royal"
                        ? "#FAF6EE"
                        : cardStyle === "modern"
                          ? "#292524"
                          : "#334155",
                  }}
                  suppressHydrationWarning
                >
                  {parsedDate.weekdayName || "Celebration Day"}
                </span>
              </div>
            </div>

            {/* Time & City */}
            <div
              className="mt-2.5 flex flex-wrap items-center justify-between gap-1 border-t pt-2 text-[11px] font-semibold"
              style={{
                borderColor:
                  cardStyle === "royal"
                    ? "rgba(212,175,55,0.25)"
                    : "rgba(0,0,0,0.1)",
                color:
                  cardStyle === "royal"
                    ? "#FAF6EE"
                    : cardStyle === "modern"
                      ? "#292524"
                      : "#334155",
              }}
            >
              <span>
                <span aria-hidden="true">⏰ </span>
                <span>7:00 PM onwards</span>
              </span>
              <span>
                <span aria-hidden="true">📍 </span>
                <span>{data.city || "Venue City"}</span>
              </span>
            </div>
          </div>

          {/* ── Readable Pills under the Date (tradition, theme, venue, dress code) ── */}
          {(data.cultureOrTradition ||
            data.vibeOrTheme ||
            data.venueName ||
            data.dressCode) && (
            <div className="my-3 flex flex-wrap items-center justify-center gap-1.5 px-0.5">
              {data.cultureOrTradition && (
                <span
                  data-testid="pill-tradition"
                  className="shadow-2xs inline-flex max-w-[280px] items-center justify-center break-words rounded-full px-3 py-1 text-center text-[10px] font-semibold leading-tight tracking-wide"
                  style={{
                    backgroundColor: config.pillBg,
                    color: config.pillText,
                    border: `1px solid ${config.pillBorder}`,
                  }}
                >
                  <span className="line-clamp-2">
                    {data.cultureOrTradition}
                  </span>
                </span>
              )}
              {data.vibeOrTheme && (
                <span
                  data-testid="pill-theme"
                  className="shadow-2xs inline-flex max-w-[280px] items-center justify-center break-words rounded-full px-3 py-1 text-center text-[10px] font-semibold leading-tight tracking-wide"
                  style={{
                    backgroundColor: config.pillBg,
                    color: config.pillText,
                    border: `1px solid ${config.pillBorder}`,
                  }}
                >
                  <span className="line-clamp-2">{data.vibeOrTheme}</span>
                </span>
              )}
              {data.venueName && (
                <span
                  data-testid="pill-venue"
                  className="shadow-2xs inline-flex max-w-[280px] items-center justify-center gap-1 break-words rounded-full px-3 py-1 text-center text-[10px] font-semibold leading-tight tracking-wide"
                  style={{
                    backgroundColor: config.pillBg,
                    color: config.pillText,
                    border: `1px solid ${config.pillBorder}`,
                  }}
                >
                  <span aria-hidden="true">🏛️</span>
                  <span className="line-clamp-2">{data.venueName}</span>
                </span>
              )}
              {data.dressCode && (
                <span
                  data-testid="pill-dresscode"
                  className="shadow-2xs inline-flex max-w-[280px] items-center justify-center gap-1 break-words rounded-full px-3 py-1 text-center text-[10px] font-semibold leading-tight tracking-wide"
                  style={{
                    backgroundColor: config.pillBg,
                    color: config.pillText,
                    border: `1px solid ${config.pillBorder}`,
                  }}
                >
                  <span aria-hidden="true">👔</span>
                  <span className="line-clamp-2">
                    <span>Dress code: </span>
                    <span className="font-semibold">{data.dressCode}</span>
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Action Links: Save to Calendar & Open Map with WCAG AAA Contrast */}
          {showActions && !isPrintView && (
            <div className="my-3 flex flex-wrap items-center justify-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleDownloadCalendar}
                className={
                  cardStyle === "royal"
                    ? "inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/70 bg-[#1A0307] px-3.5 py-1.5 text-xs font-semibold text-[#FAF6EE] shadow-sm transition-all hover:border-[#D4AF37] hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    : cardStyle === "modern"
                      ? "shadow-xs inline-flex items-center gap-1.5 rounded-full border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-1.5 text-xs font-semibold text-[#2B1B14] transition-all hover:border-[#5B1A2B] hover:text-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
                      : "shadow-xs inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#31102A] transition-all hover:border-rose-400 hover:bg-rose-50/50 focus:outline-none focus:ring-2 focus:ring-rose-700"
                }
              >
                <span aria-hidden="true">📅</span>
                <span>Save to calendar</span>
              </button>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  cardStyle === "royal"
                    ? "inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/70 bg-[#1A0307] px-3.5 py-1.5 text-xs font-semibold text-[#FAF6EE] shadow-sm transition-all hover:border-[#D4AF37] hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    : cardStyle === "modern"
                      ? "shadow-xs inline-flex items-center gap-1.5 rounded-full border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-1.5 text-xs font-semibold text-[#2B1B14] transition-all hover:border-[#5B1A2B] hover:text-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
                      : "shadow-xs inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#31102A] transition-all hover:border-rose-400 hover:bg-rose-50/50 focus:outline-none focus:ring-2 focus:ring-rose-700"
                }
              >
                <span aria-hidden="true">🗺️</span>
                <span>Open map</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          )}

          {/* Reserved QR Area ("Scan to RSVP" with high contrast label) */}
          <QrPlaceholder
            color={config.dividerColor}
            labelColor={
              cardStyle === "royal"
                ? "#E6CA85"
                : cardStyle === "modern"
                  ? "#6B5848"
                  : "#475569"
            }
          />

          {/* Warm Closing Note */}
          <p
            className="mb-1 mt-3.5 font-serif text-xs italic leading-snug"
            style={{ color: config.bodyTextColor }}
          >
            &ldquo;{t.wouldLoveToHaveYou}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
