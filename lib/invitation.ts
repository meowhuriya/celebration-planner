import type { EventType, EventPalette } from "./schemas";

export interface InviteCardData {
  hostName?: string;
  eventType?: string;
  eventDate?: string;
  city?: string;
  guestCount?: number;
  vibeOrTheme?: string;
  cultureOrTradition?: string;
  specialRequirements?: string;
  venueName?: string;
  dressCode?: string;
}

export type CulturalTint = "haldi" | "nikah" | "sangeet" | "diwali" | null;

export type CardStyle = "royal" | "modern" | "floral";

export interface CardTheme {
  variant: "wedding" | "birthday" | "community" | "other";
  culturalTint: CulturalTint;
  containerBg: string;
  cardBorder: string;
  cornerOrnamentColor: string;
  topBadgeBg: string;
  topBadgeText: string;
  hostTextColor: string;
  eventTextColor: string;
  detailsBg: string;
  detailsBorder: string;
  labelTextColor: string;
  bodyTextColor: string;
  footerTextColor: string;
  accentBorder: string;
}

export interface CardStyleConfig {
  style: CardStyle;
  variant: "wedding" | "birthday" | "community" | "other";
  culturalTint: CulturalTint;
  // Outer card styling
  cardBg: string;
  cardBackingBg: string;
  cardBorder: string;
  cardShadow: string;
  // Inner vellum styling
  vellumBg: string;
  vellumBorder: string;
  vellumBackdrop: string;
  // Typography colors (All small text WCAG AA >= 4.5:1)
  hostTextColor: string;
  headlineTextColor: string;
  bodyTextColor: string;
  labelTextColor: string;
  dateDayColor: string;
  dateSubColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dividerColor: string;
  // Effects & Ornaments
  useGoldFoil: boolean;
  ornamentType: "paisley" | "confetti" | "mandala" | "geometric";
  ornamentColor: string;
  accentShapeColor: string;
}

/**
 * Detect cultural keywords to tint the invitation card appropriately.
 */
export function detectCulturalTint(culture?: string): CulturalTint {
  if (!culture) return null;
  const lower = culture.toLowerCase();
  if (
    lower.includes("haldi") ||
    lower.includes("peeli") ||
    lower.includes("pithi")
  )
    return "haldi";
  if (lower.includes("nikah") || lower.includes("walima")) return "nikah";
  if (
    lower.includes("sangeet") ||
    lower.includes("mehndi") ||
    lower.includes("mehendi")
  )
    return "sangeet";
  if (
    lower.includes("diwali") ||
    lower.includes("deepavali") ||
    lower.includes("puja") ||
    lower.includes("pooja")
  )
    return "diwali";
  return null;
}

/**
 * Returns accessible styling configuration for each event type and cultural tradition.
 * Preserved for backward compatibility with existing tests.
 */
export function getCardTheme(eventType?: string, culture?: string): CardTheme {
  const tint = detectCulturalTint(culture);
  const type = (eventType?.toLowerCase() || "other") as EventType;

  if (tint === "haldi") {
    return {
      variant: type === "wedding" ? "wedding" : "other",
      culturalTint: "haldi",
      containerBg:
        "bg-gradient-to-br from-[#fffdf0] via-[#fef9c3] to-[#fef08a]",
      cardBorder: "border-4 border-amber-600/90 shadow-amber-900/15",
      cornerOrnamentColor: "#b45309",
      topBadgeBg: "bg-amber-100/90 border border-amber-400",
      topBadgeText: "text-amber-950",
      hostTextColor: "text-amber-950",
      eventTextColor: "text-amber-900",
      detailsBg: "bg-white/95 backdrop-blur-sm",
      detailsBorder: "border-amber-300",
      labelTextColor: "text-amber-900",
      bodyTextColor: "text-stone-900",
      footerTextColor: "text-amber-950",
      accentBorder: "border-amber-400",
    };
  }

  if (tint === "nikah") {
    return {
      variant: "wedding",
      culturalTint: "nikah",
      containerBg:
        "bg-gradient-to-br from-[#f0fdf4] via-[#ecfdf5] to-[#fefce8]",
      cardBorder: "border-4 border-emerald-700/85 shadow-emerald-950/15",
      cornerOrnamentColor: "#047857",
      topBadgeBg: "bg-emerald-100 border border-emerald-300",
      topBadgeText: "text-emerald-950",
      hostTextColor: "text-emerald-950",
      eventTextColor: "text-emerald-900",
      detailsBg: "bg-white/95 backdrop-blur-sm",
      detailsBorder: "border-emerald-300",
      labelTextColor: "text-emerald-900",
      bodyTextColor: "text-stone-900",
      footerTextColor: "text-emerald-950",
      accentBorder: "border-emerald-400",
    };
  }

  if (tint === "sangeet") {
    return {
      variant: type === "wedding" ? "wedding" : "other",
      culturalTint: "sangeet",
      containerBg:
        "bg-gradient-to-br from-[#fdf4ff] via-[#fae8ff] to-[#fff1f2]",
      cardBorder: "border-4 border-fuchsia-700/85 shadow-fuchsia-950/15",
      cornerOrnamentColor: "#a21caf",
      topBadgeBg: "bg-fuchsia-100 border border-fuchsia-300",
      topBadgeText: "text-fuchsia-950",
      hostTextColor: "text-fuchsia-950",
      eventTextColor: "text-fuchsia-900",
      detailsBg: "bg-white/95 backdrop-blur-sm",
      detailsBorder: "border-fuchsia-300",
      labelTextColor: "text-fuchsia-900",
      bodyTextColor: "text-stone-900",
      footerTextColor: "text-fuchsia-950",
      accentBorder: "border-fuchsia-400",
    };
  }

  if (tint === "diwali") {
    return {
      variant: "community",
      culturalTint: "diwali",
      containerBg:
        "bg-gradient-to-br from-[#fff7ed] via-[#ffedd5] to-[#fef3c7]",
      cardBorder: "border-4 border-amber-600/90 shadow-orange-950/15",
      cornerOrnamentColor: "#c2410c",
      topBadgeBg: "bg-amber-100 border border-amber-300",
      topBadgeText: "text-amber-950",
      hostTextColor: "text-stone-950",
      eventTextColor: "text-amber-950",
      detailsBg: "bg-white/95 backdrop-blur-sm",
      detailsBorder: "border-amber-300",
      labelTextColor: "text-amber-900",
      bodyTextColor: "text-stone-900",
      footerTextColor: "text-stone-950",
      accentBorder: "border-amber-400",
    };
  }

  if (type === "wedding") {
    return {
      variant: "wedding",
      culturalTint: null,
      containerBg: "bg-[#fffdfa]",
      cardBorder:
        "border-4 border-double border-amber-600/75 shadow-amber-950/10",
      cornerOrnamentColor: "#b45309",
      topBadgeBg: "bg-amber-100/80 border border-amber-300/80",
      topBadgeText: "text-amber-900",
      hostTextColor: "text-[#581c27]",
      eventTextColor: "text-[#701a2b]",
      detailsBg: "bg-[#faf6ee] border border-amber-200/80",
      detailsBorder: "border-amber-200",
      labelTextColor: "text-amber-900",
      bodyTextColor: "text-stone-900",
      footerTextColor: "text-[#581c27]",
      accentBorder: "border-amber-500/60",
    };
  }

  if (type === "birthday") {
    return {
      variant: "birthday",
      culturalTint: null,
      containerBg: "bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50",
      cardBorder:
        "border-2 border-dashed border-purple-400 shadow-purple-900/10",
      cornerOrnamentColor: "#7e22ce",
      topBadgeBg: "bg-purple-100 border border-purple-300",
      topBadgeText: "text-purple-950",
      hostTextColor: "text-indigo-950",
      eventTextColor: "text-purple-950",
      detailsBg: "bg-white/95 backdrop-blur-sm",
      detailsBorder: "border-purple-200",
      labelTextColor: "text-purple-900",
      bodyTextColor: "text-slate-900",
      footerTextColor: "text-purple-950",
      accentBorder: "border-purple-300",
    };
  }

  if (type === "community") {
    return {
      variant: "community",
      culturalTint: null,
      containerBg: "bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50",
      cardBorder: "border-2 border-stone-400 shadow-stone-900/10",
      cornerOrnamentColor: "#78350f",
      topBadgeBg: "bg-stone-200/80 border border-stone-300",
      topBadgeText: "text-stone-900",
      hostTextColor: "text-stone-950",
      eventTextColor: "text-stone-900",
      detailsBg: "bg-white/95 backdrop-blur-sm",
      detailsBorder: "border-stone-300",
      labelTextColor: "text-stone-800",
      bodyTextColor: "text-stone-900",
      footerTextColor: "text-stone-950",
      accentBorder: "border-stone-400",
    };
  }

  return {
    variant: "other",
    culturalTint: null,
    containerBg: "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50",
    cardBorder: "border-2 border-slate-300 shadow-slate-900/10",
    cornerOrnamentColor: "#475569",
    topBadgeBg: "bg-slate-200 border border-slate-300",
    topBadgeText: "text-slate-900",
    hostTextColor: "text-slate-950",
    eventTextColor: "text-slate-900",
    detailsBg: "bg-white/95 backdrop-blur-sm",
    detailsBorder: "border-slate-300",
    labelTextColor: "text-slate-800",
    bodyTextColor: "text-slate-900",
    footerTextColor: "text-slate-950",
    accentBorder: "border-slate-300",
  };
}

/**
 * Pure function returning modern designer card specifications across Royal, Modern, and Floral styles.
 * Guarantees small text contrast ratio >= 4.5:1 against respective backgrounds.
 */
export function getCardStyleConfig(
  style: CardStyle = "royal",
  eventType?: string,
  culture?: string,
  palette?: EventPalette | null
): CardStyleConfig {
  const type = (eventType?.toLowerCase() || "other") as
    "wedding" | "birthday" | "community" | "other";
  const tint = detectCulturalTint(culture);

  // Palette color fallbacks
  const p1 = palette?.colors?.[0] || "#D4AF37"; // primary accent / gold
  const p2 = palette?.colors?.[1] || "#800020"; // secondary / maroon
  const p3 = palette?.colors?.[2] || "#2E7D32"; // tertiary

  // Determine ornament type
  let ornamentType: "paisley" | "confetti" | "mandala" | "geometric" =
    "mandala";
  if (
    type === "wedding" ||
    tint === "diwali" ||
    tint === "sangeet" ||
    tint === "haldi"
  ) {
    ornamentType = "paisley";
  } else if (type === "birthday") {
    ornamentType = "confetti";
  } else if (type === "community") {
    ornamentType = "geometric";
  }

  if (style === "royal") {
    return {
      style: "royal",
      variant: type,
      culturalTint: tint,
      // Deep burgundy / maroon background with antique gold foil accents
      cardBg: "linear-gradient(160deg, #3B0D14 0%, #29060B 50%, #1A0307 100%)",
      cardBackingBg: p1 || "#D4AF37",
      cardBorder: "border border-[#D4AF37]/50",
      cardShadow:
        "shadow-[0_24px_50px_-12px_rgba(0,0,0,0.55),0_0_20px_rgba(212,175,55,0.15)]",
      // Semi-transparent dark frosted vellum panel
      vellumBg: "bg-black/30",
      vellumBorder: "border-[#D4AF37]/35",
      vellumBackdrop: "backdrop-blur-md",
      // High contrast text on dark maroon/black (contrast > 12:1)
      hostTextColor: "#FAF6EE",
      headlineTextColor: "#FDF9F0",
      bodyTextColor: "#F5EBE1",
      labelTextColor: "#E6CA85",
      dateDayColor: "#FAF6EE",
      dateSubColor: "#E6CA85",
      badgeBg: "bg-[#4D121B]/90",
      badgeText: "text-[#FFF8EE]",
      badgeBorder: "border-[#D4AF37]/45",
      dividerColor: "#D4AF37",
      useGoldFoil: true,
      ornamentType,
      ornamentColor: "#D4AF37",
      accentShapeColor: p1 || "#D4AF37",
    };
  }

  if (style === "modern") {
    return {
      style: "modern",
      variant: type,
      culturalTint: tint,
      // Warm ivory background, generous white space, crisp minimal architectural lines
      cardBg: "#FAF8F5",
      cardBackingBg: p2 || "#800020",
      cardBorder: "border border-[#E7E2D9]",
      cardShadow: "shadow-[0_18px_40px_-12px_rgba(0,0,0,0.1)]",
      // Semi-transparent light vellum panel
      vellumBg: "bg-white/80",
      vellumBorder: "border-[#E7E2D9]",
      vellumBackdrop: "backdrop-blur-md",
      // Crisp deep charcoal text on ivory (contrast > 14:1)
      hostTextColor: "#111111",
      headlineTextColor: "#1C1917",
      bodyTextColor: "#292524",
      labelTextColor: "#57534E",
      dateDayColor: "#111111",
      dateSubColor: "#57534E",
      badgeBg: "bg-[#F3EFEA]",
      badgeText: "text-[#1C1917]",
      badgeBorder: "border-[#DDD7CE]",
      dividerColor: "#111111",
      useGoldFoil: false,
      ornamentType: "geometric",
      ornamentColor: "#111111",
      accentShapeColor: p1 || "#111111",
    };
  }

  // Floral Style
  return {
    style: "floral",
    variant: type,
    culturalTint: tint,
    // Soft luminous pastel gradient background
    cardBg: `linear-gradient(145deg, #FFF8F0 0%, #FFF1F2 45%, #F5F3FF 100%)`,
    cardBackingBg: p3 || "#2E7D32",
    cardBorder: "border border-rose-200/70",
    cardShadow: "shadow-[0_20px_44px_-12px_rgba(244,63,94,0.12)]",
    // Semi-transparent frosted white vellum panel
    vellumBg: "bg-white/85",
    vellumBorder: "border-rose-200/60",
    vellumBackdrop: "backdrop-blur-md",
    // Deep botanical plum and slate text on light vellum (contrast > 12:1)
    hostTextColor: "#31102A",
    headlineTextColor: "#1E293B",
    bodyTextColor: "#334155",
    labelTextColor: "#64748B",
    dateDayColor: "#31102A",
    dateSubColor: "#475569",
    badgeBg: "bg-rose-100/85",
    badgeText: "text-rose-950",
    badgeBorder: "border-rose-300",
    dividerColor: "#E11D48",
    useGoldFoil: false,
    ornamentType,
    ornamentColor: "#BE123C",
    accentShapeColor: p1 || "#E11D48",
  };
}

export interface ParsedInviteDate {
  dayNumber: string;
  monthName: string;
  yearNumber: string;
  weekdayName: string;
  fullFormatted: string;
}

/**
 * Parses date string into separate components for the large date block display.
 */
export function parseInviteDate(dateStr?: string): ParsedInviteDate {
  if (!dateStr || !dateStr.trim()) {
    return {
      dayNumber: "--",
      monthName: "DATE",
      yearNumber: "TBD",
      weekdayName: "",
      fullFormatted: "",
    };
  }

  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const d = new Date(year, month - 1, day);
      return {
        dayNumber: String(day).padStart(2, "0"),
        monthName: d
          .toLocaleDateString("en-IN", { month: "short" })
          .toUpperCase(),
        yearNumber: String(year),
        weekdayName: d.toLocaleDateString("en-IN", { weekday: "long" }),
        fullFormatted: d.toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
    }
  }

  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return {
      dayNumber: String(d.getDate()).padStart(2, "0"),
      monthName: d
        .toLocaleDateString("en-IN", { month: "short" })
        .toUpperCase(),
      yearNumber: String(d.getFullYear()),
      weekdayName: d.toLocaleDateString("en-IN", { weekday: "long" }),
      fullFormatted: d.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  }

  return {
    dayNumber: "--",
    monthName: "DATE",
    yearNumber: "TBD",
    weekdayName: "",
    fullFormatted: dateStr,
  };
}

/**
 * Format date string into a readable Indian/International standard format.
 */
export function formatInviteDate(dateStr?: string): string {
  const parsed = parseInviteDate(dateStr);
  return parsed.fullFormatted;
}

/**
 * Format event headline matching event type and cultural tradition.
 */
export function formatEventHeadline(
  eventType?: string,
  culture?: string
): string {
  const type = (eventType?.toLowerCase() || "celebration").trim();
  const cult = culture?.trim();

  if (cult) {
    if (type === "wedding") return `${cult} & Wedding Celebration`;
    if (type === "birthday") return `${cult} Birthday Celebration`;
    if (type === "community") return `${cult} Community Gathering`;
    return `${cult} Celebration`;
  }

  if (type === "wedding") return "Wedding Celebration";
  if (type === "birthday") return "Birthday Celebration";
  if (type === "community") return "Community Gathering";
  return "Special Celebration";
}

/**
 * Pure function that generates a clean, beautifully formatted plain-text invitation.
 */
export function buildInviteText(data: InviteCardData): string {
  const host = data.hostName?.trim();
  const headline = formatEventHeadline(data.eventType, data.cultureOrTradition);
  const dateFormatted = formatInviteDate(data.eventDate);
  const city = data.city?.trim();
  const venue = data.venueName?.trim();
  const dressCode = data.dressCode?.trim();
  const theme = data.vibeOrTheme?.trim();
  const tradition = data.cultureOrTradition?.trim();

  const lines: string[] = ["✨ INVITATION ✨", ""];

  if (host) {
    lines.push(`${host} invites you to celebrate`);
  } else {
    lines.push("You are warmly invited to celebrate");
  }

  lines.push(`🎉 ${headline.toUpperCase()} 🎉`, "");

  if (dateFormatted) {
    lines.push(`📅 Date: ${dateFormatted}`);
  }
  if (venue) {
    lines.push(`🏛️ Venue: ${venue}`);
  }
  if (city) {
    lines.push(`📍 Location: ${city}`);
  }
  if (dressCode) {
    lines.push(`👔 Dress code: ${dressCode}`);
  }
  if (tradition) {
    lines.push(`🪔 Traditions & Ceremonies: ${tradition}`);
  }
  if (theme) {
    lines.push(`🎨 Theme & Vibe: ${theme}`);
  }

  lines.push("");
  lines.push("We would love to have you with us.");
  lines.push("Please join us to make this day truly memorable! 💫");

  return lines.join("\n");
}

/* ── Calendar & Map Pure Functions ── */

export interface IcsEventData {
  title: string;
  description?: string;
  eventDate: string; // YYYY-MM-DD
  venueName?: string;
  city?: string;
  hostName?: string;
  dressCode?: string;
  theme?: string;
}

/**
 * Escapes special characters for iCalendar (RFC 5545) text fields.
 * Backslashes, semicolons, commas, and newlines must be escaped.
 */
export function escapeIcsText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Pure function that builds an RFC 5545 compliant .ics calendar event file string.
 */
export function buildIcsCalendar(data: IcsEventData): string {
  // Parse date into YYYYMMDD
  let startStr = data.eventDate ? data.eventDate.replace(/-/g, "").trim() : "";
  if (startStr.length !== 8 || isNaN(Number(startStr))) {
    const today = new Date();
    startStr =
      today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");
  }

  const year = parseInt(startStr.slice(0, 4), 10);
  const month = parseInt(startStr.slice(4, 6), 10) - 1;
  const day = parseInt(startStr.slice(6, 8), 10);
  const nextDay = new Date(Date.UTC(year, month, day + 1));
  const endStr =
    nextDay.getUTCFullYear() +
    String(nextDay.getUTCMonth() + 1).padStart(2, "0") +
    String(nextDay.getUTCDate()).padStart(2, "0");

  const nowStamp = "20261021T110000Z";
  const uidHash = simpleHash(
    `${data.title}-${data.eventDate}-${data.hostName || ""}`
  );
  const uid = `celebrate-${startStr}-${uidHash}@celebrate.app`;

  const summary = escapeIcsText(data.title);
  const location = escapeIcsText(
    [data.venueName?.trim(), data.city?.trim()].filter(Boolean).join(", ")
  );

  const descParts: string[] = [];
  if (data.hostName?.trim()) {
    descParts.push(`Hosted by: ${data.hostName.trim()}`);
  }
  if (data.theme?.trim()) {
    descParts.push(`Theme / Tradition: ${data.theme.trim()}`);
  }
  if (data.dressCode?.trim()) {
    descParts.push(`Dress code: ${data.dressCode.trim()}`);
  }
  if (data.description?.trim()) {
    descParts.push(data.description.trim());
  }
  descParts.push("Created with Celebrate — Event planning, made easy.");
  const description = escapeIcsText(descParts.join("\n"));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Celebrate//Event Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART;VALUE=DATE:${startStr}`,
    `DTEND;VALUE=DATE:${endStr}`,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : null,
    description ? `DESCRIPTION:${description}` : null,
    "STATUS:CONFIRMED",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

/**
 * Downloads a generated .ics string as a file on the client.
 */
export function triggerIcsDownload(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    filename.endsWith(".ics") ? filename : `${filename}.ics`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Pure function generating a URL-encoded Google Maps search link.
 */
export function getGoogleMapsUrl(venueName?: string, city?: string): string {
  const query = [venueName?.trim(), city?.trim()].filter(Boolean).join(", ");
  if (!query) {
    return "https://www.google.com/maps";
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
