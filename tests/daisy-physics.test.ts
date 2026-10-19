import { describe, expect, it } from "vitest";
import {
  calculateStemGeometry,
  createDaisyField,
  createPollenBurst,
  DAISY_CONFIG,
  disturbDaisyStem,
  stepDaisyStems,
  stepPollenParticles,
} from "@/lib/physics/daisy";

describe("Daisy Stems & Pollen Physics (lib/physics/daisy)", () => {
  it("creates a curated field of 6 graceful daisies with staggered heights", () => {
    const field = createDaisyField();
    expect(field).toHaveLength(6);

    for (const stem of field) {
      expect(stem.height).toBeGreaterThanOrEqual(100);
      expect(stem.height).toBeLessThanOrEqual(215);
      expect(stem.petalCount).toBeGreaterThanOrEqual(12);
      expect(stem.flowerRadius).toBeGreaterThanOrEqual(16);
      expect(stem.leafRatio).toBeGreaterThan(0.2);
      expect(stem.leafRatio).toBeLessThan(0.8);
    }

    // Heights are staggered
    const heights = field.map((f) => f.height);
    const uniqueHeights = new Set(heights);
    expect(uniqueHeights.size).toBe(6);
  });

  it("restores deflected stem back toward its restAngle via spring torque", () => {
    let field = createDaisyField();
    const restAngle = field[2].restAngle;

    // Deflect center daisy by an impulse
    field = disturbDaisyStem(field, 3, 0.25);
    expect(field[2].angularVelocity).toBeGreaterThan(0.2);

    // Step 15 frames
    for (let i = 0; i < 15; i++) {
      field = stepDaisyStems(field, i * 16);
    }

    // Stem has moved
    expect(field[2].angle).not.toBe(restAngle);

    // Step 150 frames to allow damping to settle
    for (let i = 15; i < 150; i++) {
      field = stepDaisyStems(field, i * 16);
    }

    // Settled near restAngle (within breeze variation)
    expect(Math.abs(field[2].angle - restAngle)).toBeLessThan(0.12);
    expect(Math.abs(field[2].angularVelocity)).toBeLessThan(0.05);
  });

  it("propagates sympathy sway to adjacent daisy stems", () => {
    let field = createDaisyField();
    field = disturbDaisyStem(field, 3, 0.3);

    // Target is disturbed
    expect(field[2].angularVelocity).toBe(0.3);
    // Adjacent neighbors receive 35% sympathy impulse
    expect(field[1].angularVelocity).toBeCloseTo(0.3 * 0.35, 3);
    expect(field[3].angularVelocity).toBeCloseTo(0.3 * 0.35, 3);
    // Distant daisy 1 is unaffected
    expect(field[0].angularVelocity).toBe(0);
  });

  it("clamps extreme deflections within maxAngle", () => {
    let field = createDaisyField();
    // Huge impulse
    field = disturbDaisyStem(field, 1, 5.0);

    // Step physics
    field = stepDaisyStems(field, 0);

    expect(field[0].angle).toBeLessThanOrEqual(DAISY_CONFIG.maxAngle);
    expect(field[0].angle).toBeGreaterThanOrEqual(-DAISY_CONFIG.maxAngle);
  });

  it("calculates smooth SVG stem path and leaf orientation", () => {
    const field = createDaisyField();
    const stem = field[2];
    const geom = calculateStemGeometry(stem);

    expect(geom.pathD).toMatch(
      /^M \d+\.\d+,\d+\.\d+ Q \d+\.\d+,\d+\.\d+ \d+\.\d+,\d+\.\d+$/
    );
    expect(geom.tipX).toBeCloseTo(
      stem.baseX + Math.sin(stem.angle) * stem.height,
      1
    );
    expect(geom.tipY).toBeCloseTo(
      stem.baseY - Math.cos(stem.angle) * stem.height,
      1
    );
    expect(geom.leafX).toBeGreaterThan(0);
    expect(geom.leafY).toBeGreaterThan(0);
    expect(typeof geom.leafRotationDeg).toBe("number");
  });

  it("spawns and steps pollen sparkle dust particles", () => {
    let particles = createPollenBurst(100, 100, 8);
    expect(particles).toHaveLength(8);

    const initialY = particles[0].y;
    const initialAlpha = particles[0].alpha;

    // Step physics
    particles = stepPollenParticles(particles);

    expect(particles[0].alpha).toBeLessThan(initialAlpha);

    // Step until all particles fade away
    for (let i = 0; i < 60; i++) {
      particles = stepPollenParticles(particles);
    }
    expect(particles).toHaveLength(0);
  });
});
