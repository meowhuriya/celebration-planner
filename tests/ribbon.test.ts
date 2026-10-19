import { describe, it, expect } from "vitest";
import {
  computeRibbonPanels,
  getEventMotif,
  getRibbonGradients,
} from "@/lib/ribbon";

describe("3D Twisting Ribbon Pure Functions", () => {
  describe("computeRibbonPanels", () => {
    it("returns exactly 20 panels by default with full 3D coordinates and rotations", () => {
      const panels = computeRibbonPanels();
      expect(panels).toHaveLength(20);

      panels.forEach((p, index) => {
        expect(p.id).toBe(index);
        expect(typeof p.x).toBe("number");
        expect(typeof p.y).toBe("number");
        expect(typeof p.z).toBe("number");
        expect(typeof p.rotateX).toBe("number");
        expect(typeof p.rotateY).toBe("number");
        expect(typeof p.rotateZ).toBe("number");
        expect(typeof p.scale).toBe("number");
        expect(typeof p.opacity).toBe("number");
        expect(typeof p.transform).toBe("string");
        expect(p.transform).toContain("translate3d(");
        expect(p.transform).toContain("rotateY(");
      });
    });

    it("places panels along a monotonic left-to-right diagonal trajectory", () => {
      const panels = computeRibbonPanels({
        count: 20,
        containerWidth: 1000,
      });

      // Left-to-right progression
      expect(panels[0].x).toBeLessThan(0);
      expect(panels[19].x).toBeGreaterThan(0);

      for (let i = 0; i < panels.length - 1; i++) {
        expect(panels[i + 1].x).toBeGreaterThan(panels[i].x);
      }

      // Diagonal progression: overall trend from top-left (negative/lower Y) to bottom-right
      expect(panels[0].y).toBeLessThan(panels[19].y);
    });

    it("generates a twisting ribbon where panels rotate around the Y axis", () => {
      const panels = computeRibbonPanels({ count: 20 });
      const rotationsY = panels.map((p) => p.rotateY);

      // Verify rotation angles vary along the ribbon to create the twisting effect
      const uniqueRotations = new Set(rotationsY);
      expect(uniqueRotations.size).toBeGreaterThan(10);
    });

    it("is completely deterministic given the same inputs", () => {
      const call1 = computeRibbonPanels({
        count: 20,
        containerWidth: 1200,
        rotation: 45,
        parallaxX: 0.2,
      });
      const call2 = computeRibbonPanels({
        count: 20,
        containerWidth: 1200,
        rotation: 45,
        parallaxX: 0.2,
      });

      expect(call1).toEqual(call2);
    });

    it("shifts rotation angles dynamically when continuous rotation advances", () => {
      const base = computeRibbonPanels({ count: 20, rotation: 0 });
      const rotated = computeRibbonPanels({ count: 20, rotation: 90 });

      // RotateY of panel 0 should reflect the +90deg shift
      expect(rotated[0].rotateY).not.toBe(base[0].rotateY);
    });

    it("applies parallax offsets to pitch and yaw", () => {
      const neutral = computeRibbonPanels({ count: 20 });
      const tilted = computeRibbonPanels({
        count: 20,
        parallaxX: 0.8,
        parallaxY: -0.5,
      });

      expect(tilted[0].rotateX).not.toBe(neutral[0].rotateX);
      expect(tilted[0].rotateY).not.toBe(neutral[0].rotateY);
    });

    it("handles custom panel counts and edge cases safely", () => {
      const single = computeRibbonPanels({ count: 1 });
      expect(single).toHaveLength(1);
      expect(single[0].scale).toBeGreaterThan(0);

      const customCount = computeRibbonPanels({ count: 12 });
      expect(customCount).toHaveLength(12);
    });
  });

  describe("getEventMotif", () => {
    it("maps Diwali and pooja events to diya", () => {
      expect(getEventMotif("other", "Diwali celebration", "traditional")).toBe(
        "diya"
      );
      expect(getEventMotif("community", "Deepavali Festival", "radiant")).toBe(
        "diya"
      );
      expect(getEventMotif("other", "Ganesh Pooja", "spiritual")).toBe("diya");
    });

    it("maps weddings and anniversaries to ring", () => {
      expect(getEventMotif("wedding", "Traditional Hindu", "royal")).toBe(
        "ring"
      );
      expect(getEventMotif("other", "Silver Anniversary", "elegant")).toBe(
        "ring"
      );
      expect(getEventMotif("other", "Nikah ceremony", "modest")).toBe("ring");
    });

    it("maps Haldi, Mehendi, and floral events to flower", () => {
      expect(getEventMotif("other", "Haldi Ceremony", "yellow theme")).toBe(
        "flower"
      );
      expect(getEventMotif("other", "Mehendi night", "botanical")).toBe(
        "flower"
      );
      expect(getEventMotif("wedding", "Garden reception", "floral vibe")).toBe(
        "flower"
      );
    });

    it("maps birthdays to cake and balloon", () => {
      expect(getEventMotif("birthday", "", "dinner party")).toBe("cake");
      expect(
        getEventMotif("birthday", "", "fun kids party with balloons")
      ).toBe("balloon");
      expect(getEventMotif("other", "Baby Shower", "carnival")).toBe("balloon");
    });

    it("maps community events and default to confetti", () => {
      expect(getEventMotif("community", "", "")).toBe("confetti");
      expect(getEventMotif("other", "", "")).toBe("confetti");
    });
  });

  describe("getRibbonGradients", () => {
    it("returns 20 CSS linear-gradient strings based on palette colors", () => {
      const palette = {
        name: "Haldi Sunshine",
        colors: ["#FFC107", "#FFFDD0", "#2E7D32", "#FF9800"],
      };

      const gradients = getRibbonGradients(palette, 20);
      expect(gradients).toHaveLength(20);
      expect(gradients.some((g) => g.includes("#FFC107"))).toBe(true);
      expect(gradients.some((g) => g.includes("#FFFDD0"))).toBe(true);
      gradients.forEach((g) => {
        expect(g).toContain("linear-gradient(");
      });
    });

    it("falls back gracefully when palette is null or missing", () => {
      const gradients = getRibbonGradients(null, 20);
      expect(gradients).toHaveLength(20);
      gradients.forEach((g) => {
        expect(g).toContain("linear-gradient(");
      });
    });
  });
});
