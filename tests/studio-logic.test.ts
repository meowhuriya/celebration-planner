import { describe, it, expect, beforeEach } from "vitest";
import {
  studioReducer,
  MAX_UNDO_STEPS,
  MAX_ELEMENTS_LIMIT,
} from "@/lib/studio/reducer";
import {
  snapElementPosition,
  getRotatedBoundingBox,
  pointInRotatedBox,
  clampElementBounds,
  snapToGrid,
} from "@/lib/studio/geometry";
import { wrapText, resolveTokens, formatStudioDate } from "@/lib/studio/text";
import {
  checkTextContrast,
  getRelativeLuminance,
  calculateContrastRatio,
  sampleBackgroundLuminance,
} from "@/lib/studio/contrast";
import { validateDesign, createBlankDesign } from "@/lib/studio/schema";
import {
  loadStudioDesign,
  saveStudioDesign,
  saveToMyDesigns,
  listMyDesigns,
  loadFromMyDesigns,
  deleteFromMyDesigns,
  STORAGE_CURRENT_DESIGN_KEY,
  STORAGE_MY_DESIGNS_KEY,
} from "@/lib/studio/storage";
import { buildTemplates } from "@/lib/studio/templates";
import type { Design, StudioState, TextElement } from "@/lib/studio/types";

describe("Stage 1: Studio Pure Logic & Model", () => {
  let initialDesign: Design;
  let initialState: StudioState;

  beforeEach(() => {
    localStorage.clear();
    initialDesign = createBlankDesign("whatsapp");
    initialState = {
      current: initialDesign,
      past: [],
      future: [],
      selectedElementId: null,
      zoom: 1.0,
      guideLines: null,
      announcement: "",
    };
  });

  describe("Reducer Actions & Undo/Redo Limits", () => {
    it("adds elements and caps past history at 50 steps", () => {
      let state = initialState;

      // Add 55 elements sequentially with commits
      for (let i = 0; i < 55; i++) {
        const el: TextElement = {
          id: `txt-${i}`,
          type: "text",
          text: `Line ${i}`,
          x: 100,
          y: i * 20,
          w: 200,
          h: 40,
          rotation: 0,
          opacity: 1,
          locked: false,
          fontFamily: "Hanken Grotesk",
          fontSize: 16,
          color: "#2B1B14",
          align: "center",
          letterSpacing: 0,
          lineHeight: 1.2,
        };
        state = studioReducer(state, { type: "ADD_ELEMENT", element: el });
      }

      // Check element count
      expect(state.current.elements.length).toBe(55);
      // History stack must be strictly capped at MAX_UNDO_STEPS (50)
      expect(state.past.length).toBe(MAX_UNDO_STEPS);
      expect(state.future.length).toBe(0);

      // Perform undo
      state = studioReducer(state, { type: "UNDO" });
      expect(state.current.elements.length).toBe(54);
      expect(state.future.length).toBe(1);

      // Perform redo
      state = studioReducer(state, { type: "REDO" });
      expect(state.current.elements.length).toBe(55);
      expect(state.future.length).toBe(0);
    });

    it("enforces maximum 60 elements limit in reducer", () => {
      let state = initialState;

      // Add 60 elements
      for (let i = 0; i < 60; i++) {
        const el: TextElement = {
          id: `el-${i}`,
          type: "text",
          text: `Item ${i}`,
          x: 0,
          y: 0,
          w: 100,
          h: 30,
          rotation: 0,
          opacity: 1,
          locked: false,
          fontFamily: "Hanken Grotesk",
          fontSize: 14,
          color: "#2B1B14",
          align: "left",
          letterSpacing: 0,
          lineHeight: 1.2,
        };
        state = studioReducer(state, { type: "ADD_ELEMENT", element: el });
      }

      expect(state.current.elements.length).toBe(60);

      // Try adding 61st element
      const extra: TextElement = {
        id: "el-61",
        type: "text",
        text: "Overflow",
        x: 0,
        y: 0,
        w: 100,
        h: 30,
        rotation: 0,
        opacity: 1,
        locked: false,
        fontFamily: "Hanken Grotesk",
        fontSize: 14,
        color: "#2B1B14",
        align: "left",
        letterSpacing: 0,
        lineHeight: 1.2,
      };
      state = studioReducer(state, { type: "ADD_ELEMENT", element: extra });

      // Should still be 60 and announce limit
      expect(state.current.elements.length).toBe(60);
      expect(state.announcement).toContain("Limit reached");
    });

    it("moves, resizes, rotates, and locks elements", () => {
      let state = initialState;
      const el: TextElement = {
        id: "txt-1",
        type: "text",
        text: "Move me",
        x: 50,
        y: 50,
        w: 100,
        h: 50,
        rotation: 0,
        opacity: 1,
        locked: false,
        fontFamily: "Instrument Serif",
        fontSize: 24,
        color: "#2B1B14",
        align: "center",
        letterSpacing: 0,
        lineHeight: 1.2,
      };

      state = studioReducer(state, { type: "ADD_ELEMENT", element: el });
      state = studioReducer(state, {
        type: "MOVE_ELEMENT",
        id: "txt-1",
        x: 120,
        y: 180,
        commit: true,
      });

      expect(state.current.elements[0].x).toBe(120);
      expect(state.current.elements[0].y).toBe(180);

      // Lock element
      state = studioReducer(state, { type: "LOCK_ELEMENT", id: "txt-1" });
      expect(state.current.elements[0].locked).toBe(true);

      // Moving a locked element should be ignored
      state = studioReducer(state, {
        type: "MOVE_ELEMENT",
        id: "txt-1",
        x: 300,
        y: 300,
      });
      expect(state.current.elements[0].x).toBe(120);
    });

    it("reorders layers correctly (up, down, top, bottom)", () => {
      let state = initialState;
      const e1 = {
        ...createBlankDesign().elements[0],
        id: "1",
        type: "text" as const,
        text: "A",
        x: 0,
        y: 0,
        w: 10,
        h: 10,
        rotation: 0,
        opacity: 1,
        locked: false,
        fontFamily: "Hanken Grotesk",
        fontSize: 12,
        color: "#000",
        align: "left" as const,
        letterSpacing: 0,
        lineHeight: 1,
      };
      const e2 = { ...e1, id: "2", text: "B" };
      const e3 = { ...e1, id: "3", text: "C" };

      state = studioReducer(state, { type: "ADD_ELEMENT", element: e1 });
      state = studioReducer(state, { type: "ADD_ELEMENT", element: e2 });
      state = studioReducer(state, { type: "ADD_ELEMENT", element: e3 });

      expect(state.current.elements.map((e) => e.id)).toEqual(["1", "2", "3"]);

      // Move element 1 to top
      state = studioReducer(state, {
        type: "REORDER_LAYER",
        id: "1",
        direction: "top",
      });
      expect(state.current.elements.map((e) => e.id)).toEqual(["2", "3", "1"]);

      // Move element 1 down
      state = studioReducer(state, {
        type: "REORDER_LAYER",
        id: "1",
        direction: "down",
      });
      expect(state.current.elements.map((e) => e.id)).toEqual(["2", "1", "3"]);
    });
  });

  describe("Geometry, Snapping, and Rotated Bounds", () => {
    it("snaps to canvas center lines within pixel threshold", () => {
      const canvasW = 1080;
      const canvasH = 1350;
      const w = 200;
      const h = 100;

      // Element near center X (center X is 540, w is 200, so ideal x is 440)
      const nearCenterX = 444; // delta = 4 <= 12
      const nearCenterY = 622; // delta = 3 <= 12

      const result = snapElementPosition(
        nearCenterX,
        nearCenterY,
        w,
        h,
        canvasW,
        canvasH,
        12,
        false
      );

      expect(result.snappedX).toBe(true);
      expect(result.x).toBe(440);
      expect(result.guideX).toBe(540);

      expect(result.snappedY).toBe(true);
      expect(result.y).toBe(625);
      expect(result.guideY).toBe(675);
    });

    it("snaps to 8px grid", () => {
      expect(snapToGrid(17)).toBe(16);
      expect(snapToGrid(21)).toBe(24);
      expect(snapToGrid(80)).toBe(80);
    });

    it("calculates accurate rotated bounding box", () => {
      // 100x100 square rotated 45 degrees
      const bounds = getRotatedBoundingBox(100, 100, 100, 100, 45);
      // Diagonal of 100 is 100 * sqrt(2) ≈ 141.4
      expect(bounds.width).toBeCloseTo(141, -1);
      expect(bounds.height).toBeCloseTo(141, -1);
    });

    it("tests point in rotated box", () => {
      const el = { x: 100, y: 100, w: 100, h: 50, rotation: 45 };
      // Center of element: (150, 125) must be inside
      expect(pointInRotatedBox(150, 125, el)).toBe(true);
      // Point far outside
      expect(pointInRotatedBox(0, 0, el)).toBe(false);
    });

    it("clamps element bounds inside canvas", () => {
      const clamped = clampElementBounds(
        { x: -50, y: 2000, w: 1500, h: 50 },
        1080,
        1350
      );
      expect(clamped.x).toBeGreaterThanOrEqual(0);
      expect(clamped.y + clamped.h).toBeLessThanOrEqual(1350);
      expect(clamped.w).toBeLessThanOrEqual(1080);
    });
  });

  describe("Text Wrapping and Token Resolution", () => {
    it("wraps text based on mock measure function", () => {
      const text =
        "Aarav and Ananya cordially invite you to celebrate their wedding";
      // Mock measure function: 10px per character
      const measureFn = (str: string) => str.length * 10;

      // Max width = 200px (allows up to ~20 chars per line)
      const lines = wrapText(text, 200, measureFn);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach((line) => {
        expect(measureFn(line)).toBeLessThanOrEqual(200);
      });
    });

    it("resolves token placeholders and handles missing values gracefully", () => {
      const template =
        "Join {hostNames} on {date} at {venue}, {city} with {guestName}!";
      const context = {
        hostNames: "Vikram & Pooja",
        date: "2026-11-20",
        venue: "Taj Lake Palace",
        city: "Udaipur",
        guestName: "Priya Sharma",
      };

      const resolved = resolveTokens(template, context);
      expect(resolved).toBe(
        "Join Vikram & Pooja on 2026-11-20 at Taj Lake Palace, Udaipur with Priya Sharma!"
      );

      // Test with missing fields: should use safe defaults without breaking
      const incomplete = resolveTokens("Host: {hostNames}, Venue: {venue}", {});
      expect(incomplete).toBe("Host: Host, Venue: Venue");
    });

    it("formats dates cleanly", () => {
      const formatted = formatStudioDate("2026-12-12");
      expect(formatted).toContain("December");
      expect(formatted).toContain("2026");
    });
  });

  describe("Readability Contrast Calculation", () => {
    it("computes accurate WCAG relative luminance and contrast ratios", () => {
      // White (1.0) vs Black (0.0) -> 21:1
      const whiteLum = getRelativeLuminance(255, 255, 255);
      const blackLum = getRelativeLuminance(0, 0, 0);
      expect(calculateContrastRatio(whiteLum, blackLum)).toBeCloseTo(21, 0);

      // Deep Maroon #3A0F1C vs Ivory #FBF6EE
      const maroonLum = getRelativeLuminance(58, 15, 28);
      const ivoryLum = getRelativeLuminance(251, 246, 238);
      const contrast = calculateContrastRatio(maroonLum, ivoryLum);
      expect(contrast).toBeGreaterThan(12);
    });

    it("checks text contrast against background and suggests accessible alternatives", () => {
      // Light background (~0.9) with white text fails
      const checkFail = checkTextContrast(0.9, "#FFFFFF");
      expect(checkFail.isPassing).toBe(false);
      expect(checkFail.suggestedColor).toBe("#2B1B14"); // Suggest dark ink

      // Dark background (~0.05) with white text passes
      const checkPass = checkTextContrast(0.05, "#FFFFFF");
      expect(checkPass.isPassing).toBe(true);
      expect(checkPass.contrast).toBeGreaterThan(10);
    });

    it("samples background luminance from pixel buffer", () => {
      // Create pure white 2x2 RGBA buffer
      const whitePixels = new Uint8ClampedArray([
        255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        255, 255,
      ]);
      expect(sampleBackgroundLuminance(whitePixels)).toBeCloseTo(1.0, 1);
    });
  });

  describe("Storage and Corrupted Data Fallback", () => {
    it("saves and loads valid studio designs", () => {
      const design = createBlankDesign("story");
      design.name = "My Custom Story";
      saveStudioDesign(design);

      const loaded = loadStudioDesign(createBlankDesign());
      expect(loaded.name).toBe("My Custom Story");
      expect(loaded.sizePreset).toBe("story");
    });

    it("falls back to default template without crashing when localStorage contains invalid JSON or schema violations", () => {
      const fallback = createBlankDesign("whatsapp");
      fallback.name = "Default Fallback";

      // Invalid JSON
      localStorage.setItem(STORAGE_CURRENT_DESIGN_KEY, "{corrupted json,,");
      const loaded1 = loadStudioDesign(fallback);
      expect(loaded1.name).toBe("Default Fallback");

      // Schema violation (e.g. elements exceeding 60)
      const oversized = {
        version: 1,
        id: "oversized",
        name: "Oversized",
        sizePreset: "whatsapp",
        width: 1080,
        height: 1350,
        background: { type: "solid", color: "#fff" },
        elements: Array.from({ length: 65 }, (_, i) => ({
          id: `el-${i}`,
          type: "text",
          text: "Hi",
          x: 0,
          y: 0,
          w: 10,
          h: 10,
        })),
      };
      localStorage.setItem(
        STORAGE_CURRENT_DESIGN_KEY,
        JSON.stringify(oversized)
      );
      const loaded2 = loadStudioDesign(fallback);
      expect(loaded2.name).toBe("Default Fallback");
    });

    it("manages My Designs collection capped at 10 items", () => {
      for (let i = 0; i < 12; i++) {
        const d = createBlankDesign("whatsapp");
        d.id = `design-${i}`;
        d.name = `Design ${i}`;
        saveToMyDesigns(d);
      }

      const list = listMyDesigns();
      expect(list.length).toBe(10);
      expect(list[0].name).toBe("Design 11"); // newest first

      // Load specific design
      const d8 = loadFromMyDesigns("design-8");
      expect(d8).not.toBeNull();
      expect(d8?.name).toBe("Design 8");

      // Delete design
      deleteFromMyDesigns("design-8");
      expect(listMyDesigns().some((d) => d.id === "design-8")).toBe(false);
    });
  });

  describe("Starter Templates Validation", () => {
    it("generates 6 valid starter templates with event palette integration", () => {
      const templates = buildTemplates();
      const keys = Object.keys(templates);

      expect(keys).toContain("royal-wedding");
      expect(keys).toContain("floral-wedding");
      expect(keys).toContain("modern-minimal");
      expect(keys).toContain("playful-birthday");
      expect(keys).toContain("diwali-community");
      expect(keys).toContain("blank");

      // Validate all templates against Zod schema
      keys.forEach((key) => {
        const t = templates[key];
        const valid = validateDesign(t);
        expect(valid).not.toBeNull();
        expect(valid?.elements.length).toBeLessThanOrEqual(60);
      });
    });
  });
});
