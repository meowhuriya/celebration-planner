/**
 * Pure physics engine for interactive botanical daisy stems and pollen sparkles.
 * Models cantilever flexible beam deflection (pedicel stem elasticity),
 * gentle ambient breeze, cursor brushing impulses, and pollen dust dynamics.
 * NO DOM dependencies inside this file.
 */

export interface DaisyStem {
  id: number;
  baseX: number; // Root position on the ground (px)
  baseY: number; // Ground level (px)
  height: number; // Stature / length of the pedicel stem (px)
  restAngle: number; // Equilibrium lean angle (radians)
  angle: number; // Current deflection angle (radians)
  angularVelocity: number; // Angular velocity (rad/frame)
  flowerRadius: number; // Head radius (px)
  petalCount: number; // Number of radiating ivory petals
  leafRatio: number; // Offset along stem for the leaf node (0..1)
  leafSide: "left" | "right";
  leafAngle: number; // Tilt of the leaf relative to stem (radians)
}

export interface PollenParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

export const DAISY_CONFIG = {
  springK: 0.065, // Elastic restoring torque towards restAngle
  damping: 0.92, // Aerodynamic stem damping
  maxAngle: 0.62, // Clamped deflection angle (~35.5 degrees)
  breezeFreq: 0.0016, // Ambient summer wind frequency
  breezeAmp: 0.004, // Gentle ambient wind acceleration
  gravity: 0.12, // Pollen gravity
  pollenFade: 0.024, // Pollen alpha decay per frame
};

/**
 * Creates a curated field of 6 graceful daisies with staggered heights,
 * natural leaning angles, petal counts, and leaf nodes.
 */
export function createDaisyField(groundY = 225): DaisyStem[] {
  return [
    {
      id: 1,
      baseX: 45,
      baseY: groundY,
      height: 125,
      restAngle: -0.12,
      angle: -0.12,
      angularVelocity: 0,
      flowerRadius: 20,
      petalCount: 14,
      leafRatio: 0.42,
      leafSide: "left",
      leafAngle: -0.55,
    },
    {
      id: 2,
      baseX: 105,
      baseY: groundY,
      height: 175,
      restAngle: -0.06,
      angle: -0.06,
      angularVelocity: 0,
      flowerRadius: 23,
      petalCount: 16,
      leafRatio: 0.48,
      leafSide: "right",
      leafAngle: 0.45,
    },
    {
      id: 3,
      baseX: 175,
      baseY: groundY,
      height: 205, // Grand central apex bloom
      restAngle: 0.02,
      angle: 0.02,
      angularVelocity: 0,
      flowerRadius: 26,
      petalCount: 18,
      leafRatio: 0.52,
      leafSide: "left",
      leafAngle: -0.4,
    },
    {
      id: 4,
      baseX: 245,
      baseY: groundY,
      height: 185,
      restAngle: 0.08,
      angle: 0.08,
      angularVelocity: 0,
      flowerRadius: 24,
      petalCount: 16,
      leafRatio: 0.45,
      leafSide: "right",
      leafAngle: 0.5,
    },
    {
      id: 5,
      baseX: 305,
      baseY: groundY,
      height: 145,
      restAngle: 0.14,
      angle: 0.14,
      angularVelocity: 0,
      flowerRadius: 21,
      petalCount: 15,
      leafRatio: 0.4,
      leafSide: "left",
      leafAngle: -0.6,
    },
    {
      id: 6,
      baseX: 350,
      baseY: groundY,
      height: 105,
      restAngle: 0.18,
      angle: 0.18,
      angularVelocity: 0,
      flowerRadius: 18,
      petalCount: 13,
      leafRatio: 0.38,
      leafSide: "right",
      leafAngle: 0.55,
    },
  ];
}

/**
 * Steps the daisy stems in time.
 * Calculates restoring elastic torque, ambient wind sway, and damping.
 */
export function stepDaisyStems(
  stems: DaisyStem[],
  timeMs: number
): DaisyStem[] {
  return stems.map((stem) => {
    // Ambient breeze variation with unique phase offset per daisy
    const breeze =
      Math.sin(timeMs * DAISY_CONFIG.breezeFreq + stem.id * 1.15) *
      DAISY_CONFIG.breezeAmp;

    // Hooke's restoring torque towards the natural resting posture
    const springTorque = -DAISY_CONFIG.springK * (stem.angle - stem.restAngle);

    // Total angular acceleration
    const accel = springTorque + breeze;
    let nextVelocity = (stem.angularVelocity + accel) * DAISY_CONFIG.damping;
    let nextAngle = stem.angle + nextVelocity;

    // Soft clamp limits
    if (nextAngle > DAISY_CONFIG.maxAngle) {
      nextAngle = DAISY_CONFIG.maxAngle;
      nextVelocity = 0;
    } else if (nextAngle < -DAISY_CONFIG.maxAngle) {
      nextAngle = -DAISY_CONFIG.maxAngle;
      nextVelocity = 0;
    }

    return {
      ...stem,
      angle: nextAngle,
      angularVelocity: nextVelocity,
    };
  });
}

/**
 * Applies an angular impulse (e.g. from mouse brushing or click pluck)
 * to a specific daisy and propagates a gentle sympathy sway to neighboring stems.
 */
export function disturbDaisyStem(
  stems: DaisyStem[],
  targetId: number,
  impulse: number
): DaisyStem[] {
  const targetIndex = stems.findIndex((s) => s.id === targetId);
  if (targetIndex === -1) return stems;

  return stems.map((stem, i) => {
    if (i === targetIndex) {
      return {
        ...stem,
        angularVelocity: stem.angularVelocity + impulse,
      };
    }
    if (i === targetIndex - 1 || i === targetIndex + 1) {
      return {
        ...stem,
        angularVelocity: stem.angularVelocity + impulse * 0.35,
      };
    }
    return stem;
  });
}

export interface StemGeometry {
  pathD: string;
  tipX: number;
  tipY: number;
  tipAngle: number;
  leafX: number;
  leafY: number;
  leafRotationDeg: number;
}

/**
 * Computes the smooth curved stem path (SVG Bézier) and tip/leaf coordinates.
 * An organic cantilever beam curves progressively more toward its tip.
 */
export function calculateStemGeometry(stem: DaisyStem): StemGeometry {
  const { baseX, baseY, height, angle, leafRatio, leafSide, leafAngle } = stem;

  // Tip coordinate
  const tipX = baseX + Math.sin(angle) * height;
  const tipY = baseY - Math.cos(angle) * height;

  // Cantilever quadratic control point (starts upright near root, curves toward tip)
  const ctrlDist = height * 0.58;
  const ctrlAngle = angle * 0.35;
  const cx = baseX + Math.sin(ctrlAngle) * ctrlDist;
  const cy = baseY - Math.cos(ctrlAngle) * ctrlDist;

  const pathD = `M ${baseX.toFixed(2)},${baseY.toFixed(2)} Q ${cx.toFixed(2)},${cy.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)}`;

  // Position along quadratic curve for leaf: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const t = leafRatio;
  const oneMinusT = 1 - t;
  const leafX =
    oneMinusT * oneMinusT * baseX + 2 * oneMinusT * t * cx + t * t * tipX;
  const leafY =
    oneMinusT * oneMinusT * baseY + 2 * oneMinusT * t * cy + t * t * tipY;

  // Tangent angle along curve at t: B'(t) = 2(1-t)(P1 - P0) + 2t(P2 - P1)
  const dx = 2 * oneMinusT * (cx - baseX) + 2 * t * (tipX - cx);
  const dy = 2 * oneMinusT * (cy - baseY) + 2 * t * (tipY - cy);
  const tangentAngle = Math.atan2(dy, dx);
  const tangentDeg = (tangentAngle * 180) / Math.PI;

  const leafSideAngle = leafSide === "left" ? leafAngle : -leafAngle;
  const leafRotationDeg = tangentDeg + (leafSideAngle * 180) / Math.PI;

  // Flowerhead angle matches the tip tangent (in degrees)
  const tipAngleDeg = (angle * 180) / Math.PI;

  return {
    pathD,
    tipX,
    tipY,
    tipAngle: tipAngleDeg,
    leafX,
    leafY,
    leafRotationDeg,
  };
}

let nextPollenId = 1;

/**
 * Spawns radiant golden pollen sparkle dust drifting from a flowerhead.
 */
export function createPollenBurst(
  x: number,
  y: number,
  count = 8
): PollenParticle[] {
  const particles: PollenParticle[] = [];
  const palette = ["#FDE047", "#F59E0B", "#FEF08A", "#C9A24B", "#FFFDF8"];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 2.2;
    particles.push({
      id: nextPollenId++,
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2, // initial upward lift
      alpha: 0.95,
      size: 1.5 + Math.random() * 2.2,
      color: palette[i % palette.length],
    });
  }
  return particles;
}

/**
 * Steps pollen particles with soft air drag, slight gravity, and alpha fading.
 */
export function stepPollenParticles(
  particles: PollenParticle[]
): PollenParticle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vx: p.vx * 0.97,
      vy: p.vy * 0.97 + DAISY_CONFIG.gravity,
      alpha: p.alpha - DAISY_CONFIG.pollenFade,
    }))
    .filter((p) => p.alpha > 0.02);
}
