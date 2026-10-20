import { describe, it, expect } from "vitest";
import { paletteSchema } from "@/lib/schemas";
import {
  FALLBACK_PALETTES,
  DEFAULT_PALETTE,
  getFallbackPalette,
  getRelativeLuminance,
  getContrastRatio,
  getReadableTextColor,
  getPaletteCssVariables,
} from "@/lib/palette";

describe("paletteSchema", () => {
  it("validates a proper 4-color palette", () => {
    const valid = {
      name: "Diwali Radiance",
      colors: ["#E65100", "#FFB300", "#800020", "#D4AF37"],
    };
    const result = paletteSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.colors).toHaveLength(4);
    }
  });

  it("rejects palettes with fewer or more than 4 colors", () => {
    const tooFew = {
      name: "Incomplete",
      colors: ["#E65100", "#FFB300", "#800020"],
    };
    const tooMany = {
      name: "Oversized",
      colors: ["#E65100", "#FFB300", "#800020", "#D4AF37", "#000000"],
    };
    expect(paletteSchema.safeParse(tooFew).success).toBe(false);
    expect(paletteSchema.safeParse(tooMany).success).toBe(false);
  });

  it("rejects invalid hex color codes", () => {
    const invalidHexes = [
      "red",
      "#FFF", // 3-digit not 6-digit
      "#GGGGGG", // non-hex letters
      "123456", // missing hash
      "#1234567", // 7 digits
    ];

    for (const badHex of invalidHexes) {
      const result = paletteSchema.safeParse({
        name: "Test",
        colors: ["#E65100", "#FFB300", "#800020", badHex],
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects empty palette names", () => {
    const result = paletteSchema.safeParse({
      name: "",
      colors: ["#E65100", "#FFB300", "#800020", "#D4AF37"],
    });
    expect(result.success).toBe(false);
  });
});

describe("getFallbackPalette", () => {
  it("returns Diwali palette for Diwali/Deepavali celebrations", () => {
    const pal1 = getFallbackPalette({ cultureOrTradition: "Diwali festival" });
    expect(pal1.name).toContain("Diwali");
    expect(pal1.colors).toEqual(["#E65100", "#FFB300", "#800020", "#D4AF37"]);

    const pal2 = getFallbackPalette({ vibeOrTheme: "Deepavali celebration" });
    expect(pal2.name).toContain("Diwali");
  });

  it("returns Haldi palette for Haldi ceremony", () => {
    const pal = getFallbackPalette({ cultureOrTradition: "Haldi & Mehndi" });
    expect(pal.name).toContain("Haldi");
    expect(pal.colors).toEqual(["#FFC107", "#FFFDD0", "#2E7D32", "#FF9800"]);
  });

  it("returns Mehndi palette when Mehndi is primary", () => {
    const pal = getFallbackPalette({ cultureOrTradition: "Mehndi night" });
    expect(pal.name).toContain("Mehndi");
    expect(pal.colors[0]).toBe("#2E7D32"); // Henna green
  });

  it("returns Sangeet palette for Sangeet & Garba", () => {
    const pal = getFallbackPalette({ cultureOrTradition: "Sangeet ceremony" });
    expect(pal.name).toContain("Sangeet");
  });

  it("returns Royal Nikah palette for Nikah / Walima", () => {
    const pal = getFallbackPalette({ cultureOrTradition: "Nikah" });
    expect(pal.name).toContain("Nikah");
    expect(pal.colors[0]).toBe("#004D40"); // Emerald
  });

  it("returns event type fallbacks when no culture is specified", () => {
    const wedding = getFallbackPalette({ eventType: "wedding" });
    expect(wedding.name).toContain("Wedding");
    expect(wedding.colors).toHaveLength(4);

    const birthday = getFallbackPalette({ eventType: "birthday" });
    expect(birthday.name).toContain("Birthday");
    expect(birthday.colors).toHaveLength(4);

    const community = getFallbackPalette({ eventType: "community" });
    expect(community.name).toContain("Community");
    expect(community.colors).toHaveLength(4);
  });

  it("returns default palette when input is missing or empty", () => {
    expect(getFallbackPalette(null)).toEqual(DEFAULT_PALETTE);
    expect(getFallbackPalette({})).toEqual(DEFAULT_PALETTE);
  });
});

describe("WCAG Luminance and Contrast Picker", () => {
  it("calculates relative luminance correctly for extremes", () => {
    expect(getRelativeLuminance("#000000")).toBeCloseTo(0, 3);
    expect(getRelativeLuminance("#FFFFFF")).toBeCloseTo(1, 3);
  });

  it("calculates contrast ratios properly", () => {
    // Black and white should have maximum contrast 21:1
    expect(getContrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    // Identical colors should have contrast 1:1
    expect(getContrastRatio("#FF0000", "#FF0000")).toBeCloseTo(1, 1);
  });

  it("guarantees WCAG AA contrast of at least 4.5:1 on ALL curated palette colors", () => {
    const allPalettes = Object.values(FALLBACK_PALETTES);
    allPalettes.push(DEFAULT_PALETTE);

    for (const pal of allPalettes) {
      for (const color of pal.colors) {
        const textColor = getReadableTextColor(color);
        const ratio = getContrastRatio(color, textColor);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("picks high-contrast dark text (#111111) on light pastel backgrounds", () => {
    expect(getReadableTextColor("#FFFFFF")).toBe("#111111");
    expect(getReadableTextColor("#FFFDD0")).toBe("#111111"); // Cream
    expect(getReadableTextColor("#FFEB3B")).toBe("#111111"); // Bright yellow
    expect(getReadableTextColor("#FFC107")).toBe("#111111"); // Turmeric
    expect(getReadableTextColor("#FAF9F6")).toBe("#111111"); // Ivory
  });

  it("picks high-contrast light text (#FFFFFF) on dark saturated backgrounds", () => {
    expect(getReadableTextColor("#000000")).toBe("#FFFFFF");
    expect(getReadableTextColor("#800020")).toBe("#FFFFFF"); // Maroon
    expect(getReadableTextColor("#004D40")).toBe("#FFFFFF"); // Dark emerald
    expect(getReadableTextColor("#1A237E")).toBe("#FFFFFF"); // Deep indigo
    expect(getReadableTextColor("#4A0E17")).toBe("#FFFFFF"); // Deep wine
  });
});

describe("getPaletteCssVariables", () => {
  it("generates CSS variable dictionary with palette hexes and contrast text colors", () => {
    const vars = getPaletteCssVariables(FALLBACK_PALETTES.diwali);
    expect(vars["--palette-1"]).toBe("#E65100");
    expect(vars["--palette-2"]).toBe("#FFB300");
    expect(vars["--palette-3"]).toBe("#800020");
    expect(vars["--palette-4"]).toBe("#D4AF37");

    expect(vars["--palette-text-1"]).toBeDefined();
    expect(vars["--palette-text-2"]).toBeDefined();
    expect(vars["--palette-text-3"]).toBeDefined();
    expect(vars["--palette-text-4"]).toBeDefined();
  });
});
