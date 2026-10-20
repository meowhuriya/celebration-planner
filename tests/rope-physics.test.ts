import { describe, it, expect } from "vitest";
import {
  createRope,
  stepRope,
  wakeRope,
  addImpulse,
  pullLastPoint,
  settleRope,
  calculateCardTransform,
  buildRopeSvgPath,
  calculateDynamicShadow,
  getHostFontSizeClass,
  getTitleFontSizeClass,
  FIXED_TIMESTEP,
} from "@/lib/physics/rope";

describe("Rope Physics Engine", () => {
  it("creates a rope with 7 points and pins point 0", () => {
    const rope = createRope(150, 0, 210, 7);
    expect(rope.points).toHaveLength(7);
    expect(rope.points[0].isPinned).toBe(true);
    expect(rope.points[0].x).toBe(150);
    expect(rope.points[0].y).toBe(0);

    for (let i = 1; i < rope.points.length; i++) {
      expect(rope.points[i].isPinned).toBe(false);
    }
  });

  it("never moves the pinned point after many steps and violent impulses", () => {
    const rope = createRope(200, 10, 240, 7);
    addImpulse(rope, 800, -200);

    for (let step = 0; step < 120; step++) {
      stepRope(rope, FIXED_TIMESTEP, 10);
      expect(rope.points[0].x).toBe(200);
      expect(rope.points[0].y).toBe(10);
      expect(rope.points[0].oldX).toBe(200);
      expect(rope.points[0].oldY).toBe(10);
    }
  });

  it("keeps segment lengths within 1% after many physics steps", () => {
    const totalLength = 210;
    const rope = createRope(150, 0, totalLength, 7, true);
    const targetSegmentLength = rope.segmentLength; // 35px

    // Run for 3 seconds of simulation (180 frames)
    for (let i = 0; i < 180; i++) {
      stepRope(rope, FIXED_TIMESTEP, 10);
    }

    // Verify distance between all adjacent pairs
    for (let i = 0; i < rope.points.length - 1; i++) {
      const p1 = rope.points[i];
      const p2 = rope.points[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const diffPercent =
        Math.abs(dist - targetSegmentLength) / targetSegmentLength;

      // Assert error is well under 1% (0.01)
      expect(diffPercent).toBeLessThan(0.01);
    }
  });

  it("decreases energy/motion over time with damping and no input", () => {
    const rope = createRope(150, 0, 210, 7);
    addImpulse(rope, 600, 0); // Give initial swing

    // Measure initial kinetic energy approximation
    let initialEnergy = 0;
    for (const p of rope.points) {
      initialEnergy += Math.hypot(p.x - p.oldX, p.y - p.oldY);
    }

    // Run for 240 steps (~4 seconds)
    for (let i = 0; i < 240; i++) {
      stepRope(rope, FIXED_TIMESTEP, 10);
    }

    let finalEnergy = 0;
    for (const p of rope.points) {
      finalEnergy += Math.hypot(p.x - p.oldX, p.y - p.oldY);
    }

    expect(finalEnergy).toBeLessThan(initialEnergy * 0.1);
  });

  it("triggers sleep when motion stays below threshold for 500ms", () => {
    const rope = createRope(150, 0, 210, 7);
    // Settle rope so motion is tiny
    settleRope(rope);
    expect(rope.isSleeping).toBe(true);

    // Wake it with a tiny impulse
    wakeRope(rope);
    expect(rope.isSleeping).toBe(false);

    // Step for > 500ms (31 steps * 16.6ms ≈ 516ms) without disturbing
    for (let i = 0; i < 40; i++) {
      stepRope(rope, FIXED_TIMESTEP, 10);
    }

    expect(rope.isSleeping).toBe(true);
  });

  it("clamps maximum velocity per step", () => {
    const rope = createRope(150, 0, 210, 7);
    rope.maxVelocity = 500; // clamp to 500 px/s
    // Apply huge impulse
    addImpulse(rope, 50000, 50000);

    stepRope(rope, FIXED_TIMESTEP, 10);

    const maxAllowedStep = rope.maxVelocity * FIXED_TIMESTEP;
    for (let i = 1; i < rope.points.length; i++) {
      const p = rope.points[i];
      const vx = p.x - p.oldX;
      const vy = p.y - p.oldY;
      const stepDist = Math.hypot(vx, vy);
      // Verlet position step change should not wildly exceed clamped velocity
      expect(stepDist).toBeLessThanOrEqual(maxAllowedStep * 1.5);
    }
  });

  it("limits how far the card can be dragged (max reach)", () => {
    const rope = createRope(150, 0, 200, 7);
    // Try dragging 5000px away
    pullLastPoint(rope, 5000, 5000);

    const anchor = rope.points[0];
    const last = rope.points[rope.points.length - 1];
    const dist = Math.hypot(last.x - anchor.x, last.y - anchor.y);

    expect(dist).toBeLessThanOrEqual(rope.totalLength * 1.3);
  });

  it("calculates card transform including angle and smoothed velocity tilt", () => {
    const rope = createRope(150, 0, 210, 7);
    const transform = calculateCardTransform(rope);

    expect(transform.x).toBeCloseTo(150, 1);
    expect(transform.y).toBeCloseTo(210, 1);
    expect(transform.rotation).toBeCloseTo(0, 1);
  });

  it("builds a valid smooth SVG path string through points", () => {
    const rope = createRope(100, 10, 180, 7);
    const svgPath = buildRopeSvgPath(rope.points);

    expect(svgPath).toContain("M 100.00 10.00");
    expect(svgPath).toContain("Q");
  });

  it("computes dynamic layered box-shadow based on rotation angle", () => {
    const shadow0 = calculateDynamicShadow(0);
    const shadow30 = calculateDynamicShadow(30);

    expect(shadow0).toContain("rgba");
    expect(shadow30).toContain("rgba");
    expect(shadow0).not.toBe(shadow30);
  });
});

describe("Font size auto-shrinker", () => {
  it("picks largest font size for short host names (<= 14 chars)", () => {
    expect(getHostFontSizeClass("Aisha")).toBe("text-2xl");
    expect(getHostFontSizeClass("Aisha & Rahul")).toBe("text-2xl");
  });

  it("picks text-xl for medium names (15-22 chars)", () => {
    expect(getHostFontSizeClass("The Sharma Family")).toBe("text-xl");
  });

  it("picks text-lg for long names (23-32 chars)", () => {
    expect(getHostFontSizeClass("The Royal Singhania Family")).toBe("text-lg");
  });

  it("picks text-base or text-sm for very long host names", () => {
    const veryLong = "Mr. & Mrs. Alexander Montgomery-Smith III";
    const cls = getHostFontSizeClass(veryLong);
    expect(cls).toBe("text-base");

    const ultraLong =
      "Grand Celebration Hosts and Global Community Committee Members";
    expect(getHostFontSizeClass(ultraLong)).toBe("text-sm");
  });

  it("handles event title font sizing responsively", () => {
    expect(getTitleFontSizeClass("Royal Wedding")).toBe("text-xl");
    expect(getTitleFontSizeClass("Super Fun Superhero 10th Birthday")).toBe(
      "text-base"
    );
  });
});
