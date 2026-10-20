import type { EventInput, EventPalette } from "./schemas";

/**
 * Curated cultural and event palettes with 4 exact hex colors each.
 * All hex codes are strict 6-digit hexes matching /^#[0-9A-Fa-f]{6}$/.
 */
export const FALLBACK_PALETTES: Record<string, EventPalette> = {
  diwali: {
    name: "Diwali Radiance",
    colors: ["#E65100", "#FFB300", "#800020", "#D4AF37"], // Saffron, Marigold, Maroon, Gold
  },
  haldi: {
    name: "Haldi Sunshine",
    colors: ["#FFC107", "#FFFDD0", "#2E7D32", "#FF9800"], // Turmeric, Cream, Green, Orange
  },
  mehndi: {
    name: "Mehndi Botanical",
    colors: ["#2E7D32", "#FFC107", "#C2185B", "#D4AF37"], // Henna green, Marigold, Fuchsia, Gold
  },
  sangeet: {
    name: "Sangeet Glamour",
    colors: ["#7B1FA2", "#C2185B", "#FFD700", "#00838F"], // Royal purple, Magenta, Gold, Teal
  },
  nikah: {
    name: "Royal Nikah",
    colors: ["#004D40", "#D4AF37", "#FAF9F6", "#800020"], // Emerald, Antique gold, Ivory, Maroon
  },
  eid: {
    name: "Eid Celebration",
    colors: ["#004D40", "#D4AF37", "#00ACC1", "#FAF9F6"], // Emerald, Gold, Turquoise, Ivory
  },
  christmas: {
    name: "Classic Christmas",
    colors: ["#B71C1C", "#1B5E20", "#D4AF37", "#FAF9F6"], // Crimson, Forest green, Gold, Snow white
  },
  hanukkah: {
    name: "Hanukkah Lights",
    colors: ["#0D47A1", "#42A5F5", "#D4AF37", "#FFFFFF"], // Royal blue, Soft blue, Gold, White
  },
  wedding: {
    name: "Wedding Ivory & Maroon",
    colors: ["#4A0E17", "#D4AF37", "#FAF9F6", "#B8860B"], // Deep maroon, Antique gold, Ivory, Warm bronze
  },
  birthday: {
    name: "Birthday Joy & Confetti",
    colors: ["#E91E63", "#FF9800", "#2196F3", "#4CAF50"], // Hot pink, Bright orange, Sky blue, Meadow green
  },
  community: {
    name: "Community Warm Hearth",
    colors: ["#5D4037", "#E65100", "#F57C00", "#FFF3E0"], // Terracotta brown, Deep saffron, Warm amber, Soft cream
  },
  other: {
    name: "Modern Festive",
    colors: ["#1A237E", "#00838F", "#D4AF37", "#FAF9F6"], // Indigo, Cyan, Gold, Ivory
  },
};

/**
 * Universal fallback palette if no specific match is found.
 */
export const DEFAULT_PALETTE: EventPalette = {
  name: "Festive Gold & Maroon",
  colors: ["#D4AF37", "#800020", "#2E7D32", "#FAF9F6"],
};

/**
 * Pure code lookup to determine the best fallback palette based on event inputs.
 * Matches specific traditions (Diwali, Haldi, Mehndi, Sangeet, Nikah, Eid, etc.) first,
 * then falls back to event type (wedding, birthday, community), then default.
 */
export function getFallbackPalette(
  input?: Partial<EventInput> | null
): EventPalette {
  if (!input) return DEFAULT_PALETTE;

  const culture = (input.cultureOrTradition || "").toLowerCase();
  const theme = (input.vibeOrTheme || "").toLowerCase();
  const combined = `${culture} ${theme}`;

  // 1. Check specific cultural celebrations
  if (combined.includes("diwali") || combined.includes("deepavali")) {
    return FALLBACK_PALETTES.diwali;
  }
  if (combined.includes("haldi")) {
    return FALLBACK_PALETTES.haldi;
  }
  if (
    combined.includes("mehndi") ||
    combined.includes("mehendi") ||
    combined.includes("henna")
  ) {
    return FALLBACK_PALETTES.mehndi;
  }
  if (combined.includes("sangeet") || combined.includes("garba")) {
    return FALLBACK_PALETTES.sangeet;
  }
  if (combined.includes("nikah") || combined.includes("walima")) {
    return FALLBACK_PALETTES.nikah;
  }
  if (combined.includes("eid")) {
    return FALLBACK_PALETTES.eid;
  }
  if (combined.includes("christmas")) {
    return FALLBACK_PALETTES.christmas;
  }
  if (combined.includes("hanukkah") || combined.includes("chanukah")) {
    return FALLBACK_PALETTES.hanukkah;
  }

  // 2. Check event type
  if (input.eventType && FALLBACK_PALETTES[input.eventType]) {
    return FALLBACK_PALETTES[input.eventType];
  }

  return DEFAULT_PALETTE;
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB hex color.
 * Returns a value between 0.0 (pure black) and 1.0 (pure white).
 */
export function getRelativeLuminance(hex: string): number {
  const clean = hex.replace("#", "").trim();
  const r8 = parseInt(clean.substring(0, 2), 16);
  const g8 = parseInt(clean.substring(2, 4), 16);
  const b8 = parseInt(clean.substring(4, 6), 16);

  if (isNaN(r8) || isNaN(g8) || isNaN(b8)) {
    return 0;
  }

  const [rs, gs, bs] = [r8 / 255, g8 / 255, b8 / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors.
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter color.
 * Returns a ratio between 1.0 and 21.0.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Pure function that picks readable text (WCAG contrast of at least 4.5:1) on any palette color.
 * Uses high-contrast editorial ink (#111111) for light backgrounds and crisp white (#FFFFFF) for dark backgrounds.
 * Guarantees a contrast ratio >= 4.5:1 against the provided background color.
 */
export function getReadableTextColor(bgColorHex: string): string {
  const darkCandidate = "#111111";
  const lightCandidate = "#FFFFFF";

  const contrastWithDark = getContrastRatio(bgColorHex, darkCandidate);
  const contrastWithLight = getContrastRatio(bgColorHex, lightCandidate);

  // If dark ink meets the WCAG AA threshold of 4.5:1, prefer it
  if (contrastWithDark >= 4.5) {
    return darkCandidate;
  }

  // If light text meets 4.5:1, use light text
  if (contrastWithLight >= 4.5) {
    return lightCandidate;
  }

  // In the theoretical edge near luminance ~0.18, test pure black (#000000)
  const contrastWithPureBlack = getContrastRatio(bgColorHex, "#000000");
  if (contrastWithPureBlack >= 4.5) {
    return "#000000";
  }

  // Fallback to whichever candidate offers the highest contrast ratio
  return contrastWithDark >= contrastWithLight ? darkCandidate : lightCandidate;
}

/**
 * Generates CSS variables dictionary for a given event palette.
 */
export function getPaletteCssVariables(
  palette: EventPalette
): Record<string, string> {
  const [c1, c2, c3, c4] = palette.colors;
  return {
    "--palette-name": `"${palette.name}"`,
    "--palette-1": c1,
    "--palette-2": c2,
    "--palette-3": c3,
    "--palette-4": c4,
    "--palette-text-1": getReadableTextColor(c1),
    "--palette-text-2": getReadableTextColor(c2),
    "--palette-text-3": getReadableTextColor(c3),
    "--palette-text-4": getReadableTextColor(c4),
  };
}
