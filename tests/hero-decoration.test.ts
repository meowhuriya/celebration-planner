import { describe, it, expect } from "vitest";
import {
  getHeroDecoration,
  resolveDecorationType,
  createSeededRandom,
  generateMarigold,
  generateRose,
  generateJasmine,
  generateLeaf,
  generatePaisley,
  generateHeroScene,
} from "../lib/hero-decoration";
import { getContrastRatio } from "../lib/palette";

describe("Hero Decoration Pure Logic (lib/hero-decoration.ts)", () => {
  it("resolves decoration type accurately from eventType and cultural hints", () => {
    expect(resolveDecorationType("wedding")).toBe("wedding");
    expect(resolveDecorationType("birthday")).toBe("birthday");
    expect(resolveDecorationType("community")).toBe("community");
    expect(resolveDecorationType("other")).toBe("other");
    expect(resolveDecorationType("community", "Diwali Festival")).toBe(
      "diwali"
    );
    expect(resolveDecorationType("other", "Deepavali Puja")).toBe("diwali");
  });

  it("returns wedding decoration with garland and mandala outline", () => {
    const dec = getHeroDecoration("wedding");
    expect(dec.type).toBe("wedding");
    expect(dec.hasGarland).toBe(true);
    expect(dec.hasMandala).toBe(true);
    expect(dec.hasDiyas).toBe(false);
    expect(dec.hasLantern).toBe(false);
    expect(dec.hasBunting).toBe(false);
    expect(dec.hasBalloons).toBe(false);
    expect(dec.burstType).toBe("sparkler");
    expect(dec.particleStyle).toBe("petals");
    expect(dec.petalsCount).toBeLessThanOrEqual(10);
  });

  it("returns birthday decoration with bunting and balloon strings", () => {
    const dec = getHeroDecoration("birthday");
    expect(dec.type).toBe("birthday");
    expect(dec.hasGarland).toBe(false);
    expect(dec.hasMandala).toBe(false);
    expect(dec.hasBunting).toBe(true);
    expect(dec.hasBalloons).toBe(true);
    expect(dec.burstType).toBe("confetti");
    expect(dec.particleStyle).toBe("confetti");
  });

  it("returns community/diwali decoration with string of diyas and paper lantern", () => {
    const comm = getHeroDecoration("community");
    expect(comm.hasDiyas).toBe(true);
    expect(comm.hasLantern).toBe(true);
    expect(comm.hasGarland).toBe(false);

    const diwali = getHeroDecoration("community", "Diwali party");
    expect(diwali.type).toBe("diwali");
    expect(diwali.hasDiyas).toBe(true);
    expect(diwali.hasLantern).toBe(true);
    expect(diwali.burstType).toBe("sparkler");
  });

  it("returns other decoration with simple celebratory bunting", () => {
    const other = getHeroDecoration("other");
    expect(other.type).toBe("other");
    expect(other.hasBunting).toBe(true);
    expect(other.hasBalloons).toBe(false);
    expect(other.hasGarland).toBe(false);
    expect(other.hasDiyas).toBe(false);
    expect(other.burstType).toBe("confetti");
  });

  it("respects custom event palette colors when provided", () => {
    const customPalette = {
      name: "Custom Palette",
      colors: ["#123456", "#654321", "#abcdef", "#fedcba"] as [
        string,
        string,
        string,
        string,
      ],
    };
    const dec = getHeroDecoration(
      "wedding",
      undefined,
      undefined,
      customPalette
    );
    expect(dec.paletteColors).toEqual(customPalette.colors);
    expect(dec.primaryColor).toBe("#123456");
    expect(dec.secondaryColor).toBe("#654321");
  });
});

describe("Procedural Flower Engine", () => {
  it("createSeededRandom is 100% deterministic with the same seed", () => {
    const rng1 = createSeededRandom(12345);
    const rng2 = createSeededRandom(12345);

    const sequence1 = [rng1(), rng1(), rng1(), rng1(), rng1()];
    const sequence2 = [rng2(), rng2(), rng2(), rng2(), rng2()];

    expect(sequence1).toEqual(sequence2);

    // Different seed produces different sequence
    const rng3 = createSeededRandom(54321);
    expect(rng3()).not.toBe(sequence1[0]);
  });

  it("generateMarigold builds 3 concentric rings of 12-16 ruffled petals with valid geometry", () => {
    const flower1 = generateMarigold(100, 100, 30, undefined, 42);
    const flower2 = generateMarigold(100, 100, 30, undefined, 42);

    // Deterministic geometry with same seed
    expect(flower1).toEqual(flower2);

    expect(flower1.rings).toHaveLength(3);
    // Outer ring: 16 petals
    expect(flower1.rings[0].petals).toHaveLength(16);
    // Middle ring: 14 petals
    expect(flower1.rings[1].petals).toHaveLength(14);
    // Inner ring: 12 petals
    expect(flower1.rings[2].petals).toHaveLength(12);

    // Check valid SVG path strings
    flower1.rings.forEach((ring) => {
      ring.petals.forEach((petal) => {
        expect(petal.path.startsWith("M")).toBe(true);
        expect(petal.path.endsWith("Z")).toBe(true);
        expect(petal.transform).toContain("translate(");
        expect(petal.transform).toContain("rotate(");
        expect(petal.fill).toBeDefined();
        expect(petal.stroke).toBeDefined();
      });
    });

    expect(flower1.center.r).toBeGreaterThan(0);
    expect(flower1.center.stamenR).toBeGreaterThan(0);
  });

  it("generateRose builds concentric spiral of curved petals deterministically", () => {
    const rose1 = generateRose(80, 80, 25, "#5B1A2B", 99);
    const rose2 = generateRose(80, 80, 25, "#5B1A2B", 99);

    expect(rose1).toEqual(rose2);
    expect(rose1.petals.length).toBeGreaterThanOrEqual(15);

    rose1.petals.forEach((p) => {
      expect(p.path.startsWith("M")).toBe(true);
      expect(p.path.endsWith("Z")).toBe(true);
      expect(p.fill).toBeDefined();
      expect(p.stroke).toBeDefined();
    });
  });

  it("generateJasmine creates 5-petal white flower with gold center", () => {
    const jasmine1 = generateJasmine(50, 50, 12, "#C9A24B", 77);
    const jasmine2 = generateJasmine(50, 50, 12, "#C9A24B", 77);

    expect(jasmine1).toEqual(jasmine2);
    expect(jasmine1.petals).toHaveLength(5);
    expect(jasmine1.center.fill).toBe("#C9A24B");

    jasmine1.petals.forEach((p) => {
      expect(p.rx).toBeGreaterThan(0);
      expect(p.ry).toBeGreaterThan(0);
      expect(p.fill).toBe("#FFFDF8");
    });
  });

  it("generateLeaf and generatePaisley output valid geometry", () => {
    const leaf = generateLeaf(10, 20, 40, 45, "#2E5D4B");
    expect(leaf.path.startsWith("M")).toBe(true);
    expect(leaf.vein.startsWith("M")).toBe(true);
    expect(leaf.transform).toContain("translate(10.0, 20.0)");

    const paisley = generatePaisley(15, 25, 0.5, 30, "#C9A24B");
    expect(paisley.path.startsWith("M")).toBe(true);
    expect(paisley.innerPath.startsWith("M")).toBe(true);
    expect(paisley.transform).toContain("scale(0.50)");
  });

  it("generateHeroScene returns complete procedural scene for wedding", () => {
    const scene = generateHeroScene("wedding");
    expect(scene.type).toBe("wedding");
    expect(scene.marigolds.length).toBeGreaterThanOrEqual(4);
    expect(scene.roses.length).toBeGreaterThanOrEqual(3);
    expect(scene.jasmines.length).toBeGreaterThanOrEqual(5);
    expect(scene.leaves.length).toBeGreaterThanOrEqual(6);
    expect(scene.paisleys.length).toBeGreaterThanOrEqual(2);
    expect(scene.toranPoints.length).toBe(14);
    expect(scene.diyas.length).toBe(4);
  });
});

describe("Warm Theme Contrast Checks", () => {
  it("verifies main espresso text (#2B1B14) on warm ivory page (#FBF6EE) exceeds 4.5:1", () => {
    const ratio = getContrastRatio("#2B1B14", "#FBF6EE");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeGreaterThan(14); // Expected ~15.5:1
  });

  it("verifies main espresso text (#2B1B14) on card surface (#FFFDF8) exceeds 4.5:1", () => {
    const ratio = getContrastRatio("#2B1B14", "#FFFDF8");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeGreaterThan(15); // Expected ~16.4:1
  });

  it("verifies muted text (#6B5848) on warm ivory page and card surface exceeds 4.5:1", () => {
    const pageRatio = getContrastRatio("#6B5848", "#FBF6EE");
    const cardRatio = getContrastRatio("#6B5848", "#FFFDF8");
    expect(pageRatio).toBeGreaterThanOrEqual(4.5);
    expect(cardRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies ivory text (#FBF6EE) on primary maroon button (#5B1A2B) exceeds 4.5:1", () => {
    const ratio = getContrastRatio("#FBF6EE", "#5B1A2B");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeGreaterThan(11); // Expected ~12.6:1
  });

  it("verifies ivory text (#FBF6EE) on deep maroon hover/selected row (#3A0F1C) exceeds 4.5:1", () => {
    const ratio = getContrastRatio("#FBF6EE", "#3A0F1C");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeGreaterThan(14); // Expected ~15.7:1
  });

  it("verifies gold (#C9A24B) on dark espresso footer (#24100E) exceeds 4.5:1", () => {
    const ratio = getContrastRatio("#C9A24B", "#24100E");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeGreaterThan(7); // Expected ~7.4:1
  });
});
