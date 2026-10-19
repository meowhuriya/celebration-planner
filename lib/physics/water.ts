/**
 * Pure physics engine for interactive water ripple and buoyancy simulation.
 * Models coupled harmonic oscillators (water surface tension & wave propagation),
 * ambient ocean swell buoyancy, concentric ripple rings, and splash droplets.
 * NO DOM dependencies inside this file.
 */

export interface WaterColumn {
  y: number; // Vertical displacement in px (positive = pushed down, negative = pulled up)
  vy: number; // Vertical velocity (px/step)
  tilt: number; // Tilt angle in degrees
  vTilt: number; // Angular velocity (deg/step)
}

export interface WaterRippleRing {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export interface WaterDroplet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export const WATER_CONFIG = {
  springTension: 0.045, // Restoring force towards equilibrium
  damping: 0.91, // Viscous fluid damping
  neighborSpread: 0.12, // Surface tension transmission to adjacent columns
  tiltSpring: 0.065, // Restoring force for angular rotation
  tiltDamping: 0.88, // Angular damping
  gravity: 0.38, // Droplet gravity in px/step^2
  dropletFade: 0.03, // Droplet alpha decay per step
  rippleGrowth: 2.8, // Ripple radius growth in px/step
  rippleFade: 0.032, // Ripple alpha decay per step
};

/**
 * Initializes a row of N water columns in resting equilibrium.
 */
export function createWaterState(count = 6): WaterColumn[] {
  return Array.from({ length: count }, () => ({
    y: 0,
    vy: 0,
    tilt: 0,
    vTilt: 0,
  }));
}

/**
 * Steps the coupled water columns by one simulation frame.
 * Models Hooke's restoring spring force, fluid damping, and neighbor tension spread.
 */
export function stepWaterColumns(columns: WaterColumn[]): WaterColumn[] {
  const len = columns.length;
  if (len === 0) return [];

  // Pass 1: compute velocity changes from forces
  const nextCols: WaterColumn[] = columns.map((col, i) => {
    // Restoring spring force towards y = 0
    const springForce = -WATER_CONFIG.springTension * col.y;

    // Neighbor surface tension wave spread
    const leftY = i > 0 ? columns[i - 1].y : 0;
    const rightY = i < len - 1 ? columns[i + 1].y : 0;
    const spreadForce =
      WATER_CONFIG.neighborSpread * (leftY - col.y + (rightY - col.y));

    const totalVy = (col.vy + springForce + spreadForce) * WATER_CONFIG.damping;

    // Tilt target based on slope between left and right water height
    const slope = (leftY - rightY) * 0.18;
    const tiltSpring =
      -WATER_CONFIG.tiltSpring * (col.tilt - slope) -
      (1 - WATER_CONFIG.tiltDamping) * col.vTilt;
    const totalVTilt = (col.vTilt + tiltSpring) * WATER_CONFIG.tiltDamping;

    return {
      y: col.y + totalVy,
      vy: totalVy,
      tilt: col.tilt + totalVTilt,
      vTilt: totalVTilt,
    };
  });

  return nextCols;
}

/**
 * Applies a vertical impulse to a specific column and slightly to its immediate neighbors.
 */
export function disturbWater(
  columns: WaterColumn[],
  index: number,
  impulse: number
): WaterColumn[] {
  if (index < 0 || index >= columns.length) return columns;

  return columns.map((col, i) => {
    if (i === index) {
      return {
        ...col,
        vy: col.vy + impulse,
        vTilt: col.vTilt + (Math.random() - 0.5) * 4,
      };
    }
    if (i === index - 1 || i === index + 1) {
      return {
        ...col,
        vy: col.vy + impulse * 0.45,
      };
    }
    return col;
  });
}

/**
 * Computes organic ambient swell (buoyancy wave) for a column at a given timestamp.
 */
export function getIdleWave(
  index: number,
  timeMs: number,
  total = 6
): { idleY: number; idleTilt: number } {
  // Slower, soothing wave oscillation
  const phase = (index / total) * Math.PI * 1.5;
  const idleY = Math.sin(timeMs * 0.002 + phase) * 5.0;
  const idleTilt = Math.cos(timeMs * 0.0016 + phase) * 2.0;
  return { idleY, idleTilt };
}

/**
 * Calculates transform styling (translateY, rotation, and fluid volume squash & stretch).
 */
export function calculateCapsuleTransform(
  col: WaterColumn,
  idle: { idleY: number; idleTilt: number }
): {
  translateY: number;
  rotateDeg: number;
  scaleX: number;
  scaleY: number;
} {
  const totalY = col.y + idle.idleY;
  const totalTilt = col.tilt + idle.idleTilt;

  // Fluid volume preservation: compression when pushed down, elongation when lifted up
  const scaleY = Math.min(Math.max(1 - totalY * 0.006, 0.85), 1.25);
  const scaleX = Math.min(Math.max(1 + totalY * 0.004, 0.85), 1.2);

  return {
    translateY: totalY,
    rotateDeg: totalTilt,
    scaleX,
    scaleY,
  };
}

/**
 * Advances concentric water ripple rings, expanding radius and decaying opacity.
 */
export function stepRipples(ripples: WaterRippleRing[]): WaterRippleRing[] {
  return ripples
    .map((r) => ({
      ...r,
      radius: r.radius + WATER_CONFIG.rippleGrowth,
      alpha: r.alpha - WATER_CONFIG.rippleFade,
    }))
    .filter((r) => r.alpha > 0.01 && r.radius < r.maxRadius);
}

let nextRippleId = 1;
/**
 * Spawns 2 staggered concentric water ripple rings at a given point (x, y).
 */
export function createSplashRipples(
  x: number,
  y: number,
  maxRadius = 110
): WaterRippleRing[] {
  return [
    {
      id: nextRippleId++,
      x,
      y,
      radius: 6,
      maxRadius,
      alpha: 0.75,
    },
    {
      id: nextRippleId++,
      x,
      y,
      radius: 18,
      maxRadius: maxRadius * 0.85,
      alpha: 0.5,
    },
  ];
}

let nextDropletId = 1;
/**
 * Spawns playful celebratory water splash droplets around (x, y).
 */
export function createSplashDroplets(
  x: number,
  y: number,
  color = "#FEF08A",
  count = 6
): WaterDroplet[] {
  const droplets: WaterDroplet[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6; // upward cone
    const speed = 2.5 + Math.random() * 4.5;
    droplets.push({
      id: nextDropletId++,
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 2.5,
      alpha: 0.9,
    });
  }
  return droplets;
}

/**
 * Advances splash droplets under gravity, drag, and alpha fading.
 */
export function stepDroplets(droplets: WaterDroplet[]): WaterDroplet[] {
  return droplets
    .map((d) => ({
      ...d,
      x: d.x + d.vx,
      y: d.y + d.vy,
      vy: d.vy + WATER_CONFIG.gravity,
      alpha: d.alpha - WATER_CONFIG.dropletFade,
    }))
    .filter((d) => d.alpha > 0.02);
}
