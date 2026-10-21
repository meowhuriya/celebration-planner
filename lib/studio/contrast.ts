/**
 * WCAG 2.1 Contrast Calculation Utilities for Studio Readability Checks.
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (clean.length !== 6) {
    return { r: 43, g: 27, b: 20 }; // default espresso fallback
  }

  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculates relative luminance according to WCAG 2.1 specs.
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [sR, sG, sB] = [r, g, b].map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

/**
 * Computes contrast ratio (1:1 to 21:1) between two luminances.
 */
export function calculateContrastRatio(lum1: number, lum2: number): number {
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Computes average background luminance from sampled RGBA pixel array.
 */
export function sampleBackgroundLuminance(
  pixels: Uint8ClampedArray | number[]
): number {
  if (!pixels || pixels.length === 0) return 1.0; // default white canvas

  let totalLum = 0;
  let count = 0;

  // Each pixel has 4 bytes (R, G, B, A)
  for (let i = 0; i < pixels.length; i += 4) {
    const a = (pixels[i + 3] ?? 255) / 255;
    if (a < 0.1) continue; // Skip near-transparent pixels

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    totalLum += getRelativeLuminance(r, g, b);
    count++;
  }

  if (count === 0) return 1.0;
  return totalLum / count;
}

export interface ContrastCheckResult {
  contrast: number; // e.g. 7.2
  isPassing: boolean; // >= 4.5:1
  suggestedColor: string; // "#FFFDF8" or "#2B1B14"
}

/**
 * Evaluates whether text of a given color meets the 4.5:1 threshold against the background luminance.
 * Recommends an optimal accessible alternative color if failing.
 */
export function checkTextContrast(
  bgLuminance: number,
  textColorHex: string
): ContrastCheckResult {
  const rgb = hexToRgb(textColorHex);
  const textLum = getRelativeLuminance(rgb.r, rgb.g, rgb.b);
  const contrast = calculateContrastRatio(bgLuminance, textLum);
  const isPassing = contrast >= 4.5;

  // Suggest high-contrast ivory or espresso
  const suggestedColor = bgLuminance > 0.4 ? "#2B1B14" : "#FFFDF8";

  return {
    contrast: Math.round(contrast * 10) / 10,
    isPassing,
    suggestedColor,
  };
}
