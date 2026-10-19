import { describe, expect, it } from "vitest";
import {
  calculateCapsuleTransform,
  createSplashDroplets,
  createSplashRipples,
  createWaterState,
  disturbWater,
  getIdleWave,
  stepDroplets,
  stepRipples,
  stepWaterColumns,
} from "@/lib/physics/water";

describe("Water Physics Simulation (lib/physics/water)", () => {
  it("initializes 6 columns at rest with 0 displacement and velocity", () => {
    const cols = createWaterState(6);
    expect(cols).toHaveLength(6);
    for (const c of cols) {
      expect(c.y).toBe(0);
      expect(c.vy).toBe(0);
      expect(c.tilt).toBe(0);
      expect(c.vTilt).toBe(0);
    }
  });

  it("leaves columns at rest if no forces act on them", () => {
    const cols = createWaterState(6);
    const stepped = stepWaterColumns(cols);
    for (const c of stepped) {
      expect(c.y).toBe(0);
      expect(c.vy).toBe(0);
    }
  });

  it("applies restoring spring force and propagates surface wave to neighbors", () => {
    let cols = createWaterState(6);
    // Push column 2 down with an impulse
    cols = disturbWater(cols, 2, 10);

    expect(cols[2].vy).toBeGreaterThan(0);
    expect(cols[1].vy).toBeGreaterThan(0); // immediate left neighbor receives spread
    expect(cols[3].vy).toBeGreaterThan(0); // immediate right neighbor receives spread
    expect(cols[5].vy).toBe(0); // distant column not yet disturbed

    // Step several frames
    for (let i = 0; i < 5; i++) {
      cols = stepWaterColumns(cols);
    }

    // Displacement has occurred and spread through the water
    expect(cols[2].y).toBeGreaterThan(0);
    expect(cols[1].y).toBeGreaterThan(0);
    expect(cols[3].y).toBeGreaterThan(0);
  });

  it("decays oscillation over time due to fluid damping", () => {
    let cols = createWaterState(6);
    cols = disturbWater(cols, 2, 15);

    // Run 150 simulation steps
    for (let i = 0; i < 150; i++) {
      cols = stepWaterColumns(cols);
    }

    // Velocity and displacement should be damped back towards resting equilibrium
    for (const c of cols) {
      expect(Math.abs(c.y)).toBeLessThan(0.8);
      expect(Math.abs(c.vy)).toBeLessThan(0.5);
    }
  });

  it("safely handles out-of-bounds disturb indices", () => {
    const cols = createWaterState(6);
    const updated = disturbWater(cols, 99, 10);
    expect(updated).toEqual(cols);
  });

  it("calculates smooth ambient idle swell wave", () => {
    const wave0 = getIdleWave(0, 1000);
    const wave1 = getIdleWave(1, 1000);

    expect(wave0.idleY).toBeGreaterThanOrEqual(-5);
    expect(wave0.idleY).toBeLessThanOrEqual(5);
    expect(wave0.idleTilt).toBeGreaterThanOrEqual(-2);
    expect(wave0.idleTilt).toBeLessThanOrEqual(2);
    // Neighbor columns have a phase difference
    expect(wave0.idleY).not.toBe(wave1.idleY);
  });

  it("calculates fluid squash and stretch preserving volume", () => {
    const neutral = calculateCapsuleTransform(
      { y: 0, vy: 0, tilt: 0, vTilt: 0 },
      { idleY: 0, idleTilt: 0 }
    );
    expect(neutral.translateY).toBe(0);
    expect(neutral.scaleX).toBe(1);
    expect(neutral.scaleY).toBe(1);

    // When submerged/pushed down (positive Y)
    const pushedDown = calculateCapsuleTransform(
      { y: 20, vy: 0, tilt: 0, vTilt: 0 },
      { idleY: 0, idleTilt: 0 }
    );
    expect(pushedDown.translateY).toBe(20);
    expect(pushedDown.scaleY).toBeLessThan(1); // squashed vertically
    expect(pushedDown.scaleX).toBeGreaterThan(1); // bulging horizontally
  });

  it("expands water ripples and decays their alpha until removed", () => {
    let ripples = createSplashRipples(50, 50, 40);
    expect(ripples.length).toBe(2);
    const initialRadius = ripples[0].radius;
    const initialAlpha = ripples[0].alpha;

    ripples = stepRipples(ripples);
    expect(ripples[0].radius).toBeGreaterThan(initialRadius);
    expect(ripples[0].alpha).toBeLessThan(initialAlpha);

    // Step until all have faded
    for (let i = 0; i < 50; i++) {
      ripples = stepRipples(ripples);
    }
    expect(ripples.length).toBe(0);
  });

  it("spawns droplets that arc under gravity and fade away", () => {
    let droplets = createSplashDroplets(100, 100, "#FEF08A", 5);
    expect(droplets.length).toBe(5);
    expect(droplets[0].vy).toBeLessThan(0); // initial upward speed

    // Step under gravity
    for (let i = 0; i < 60; i++) {
      droplets = stepDroplets(droplets);
    }
    expect(droplets.length).toBe(0);
  });
});
