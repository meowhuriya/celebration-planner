/**
 * Pure physics engine for rope and hanging card simulation.
 * Verlet integration with distance constraints, soft spring dragging,
 * velocity clamping, and automatic sleep detection.
 * NO DOM dependencies inside this file.
 */

export interface RopePoint {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  isPinned: boolean;
}

export interface RopeState {
  points: RopePoint[];
  segmentLength: number;
  totalLength: number;
  gravity: number; // px/s^2 (default 1800)
  damping: number; // per step multiplier (default 0.985)
  maxVelocity: number; // px/s max allowed velocity
  isSleeping: boolean;
  sleepDurationMs: number; // time below motion threshold in ms
}

export const FIXED_TIMESTEP = 1 / 60; // 60Hz physics step (approx 0.01667s)
export const MOTION_SLEEP_THRESHOLD = 0.08; // px^2 motion threshold for sleep
export const SLEEP_TRIGGER_MS = 500; // 500ms below threshold to sleep
export const DEFAULT_GRAVITY = 1800; // px/s^2
export const DEFAULT_DAMPING = 0.985;
export const DEFAULT_MAX_VELOCITY = 2000; // px/s

/**
 * Creates a rope with `numPoints` (default 7).
 * Point 0 is pinned at (anchorX, anchorY).
 * If `dropStart` is true, points start raised/displaced to drop in on load.
 */
export function createRope(
  anchorX: number,
  anchorY: number,
  totalLength: number,
  numPoints = 7,
  dropStart = false
): RopeState {
  const segmentLength = totalLength / (numPoints - 1);
  const points: RopePoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const isPinned = i === 0;
    let x = anchorX;
    let y = anchorY + i * segmentLength;

    if (dropStart && i > 0) {
      // Displace upwards and slightly sideways for natural drop entrance
      x = anchorX + i * 18;
      y = anchorY + i * (segmentLength * 0.35);
    }

    points.push({
      x,
      y,
      oldX: x,
      oldY: y,
      isPinned,
    });
  }

  return {
    points,
    segmentLength,
    totalLength,
    gravity: DEFAULT_GRAVITY,
    damping: DEFAULT_DAMPING,
    maxVelocity: DEFAULT_MAX_VELOCITY,
    isSleeping: false,
    sleepDurationMs: 0,
  };
}

/**
 * Step the rope physics forward by `dt` using Verlet integration
 * and relaxation constraints.
 */
export function stepRope(
  rope: RopeState,
  dt: number = FIXED_TIMESTEP,
  constraintIterations = 10
): void {
  const points = rope.points;
  const gravityStep = rope.gravity * dt * dt;
  const maxStepVelocity = rope.maxVelocity * dt;

  let totalMotionSq = 0;

  // 1. Record start positions for accurate motion measurement
  const startPositions = points.map((p) => ({ x: p.x, y: p.y }));

  // 2. Verlet integration for each unpinned point
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.isPinned) continue;

    let vx = (p.x - p.oldX) * rope.damping;
    let vy = (p.y - p.oldY) * rope.damping;

    // Clamp velocity
    const speed = Math.hypot(vx, vy);
    if (speed > maxStepVelocity && speed > 0) {
      const scale = maxStepVelocity / speed;
      vx *= scale;
      vy *= scale;
    }

    p.oldX = p.x;
    p.oldY = p.y;

    p.x += vx;
    p.y += vy + gravityStep;
  }

  // 3. Distance constraint relaxation
  const targetDist = rope.segmentLength;
  for (let iter = 0; iter < constraintIterations; iter++) {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 1e-6) continue;

      const diff = (dist - targetDist) / dist;

      if (p1.isPinned) {
        p2.x -= dx * diff;
        p2.y -= dy * diff;
      } else if (p2.isPinned) {
        p1.x += dx * diff;
        p1.y += dy * diff;
      } else {
        const half = 0.5 * diff;
        p1.x += dx * half;
        p1.y += dy * half;
        p2.x -= dx * half;
        p2.y -= dy * half;
      }
    }
  }

  // 4. Measure actual post-constraint motion
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - startPositions[i].x;
    const dy = points[i].y - startPositions[i].y;
    totalMotionSq += dx * dx + dy * dy;
  }

  // 5. Sleep detection
  const dtMs = dt * 1000;
  if (totalMotionSq < MOTION_SLEEP_THRESHOLD) {
    rope.sleepDurationMs += dtMs;
    if (rope.sleepDurationMs >= SLEEP_TRIGGER_MS) {
      rope.isSleeping = true;
    }
  } else {
    rope.sleepDurationMs = 0;
    rope.isSleeping = false;
  }
}

/**
 * Wake rope from sleep.
 */
export function wakeRope(rope: RopeState): void {
  rope.isSleeping = false;
  rope.sleepDurationMs = 0;
}

/**
 * Pulls the last point of the rope toward a target pointer position using a soft spring.
 * Clamps target to max reach from anchor to prevent rope explosion.
 */
export function pullLastPoint(
  rope: RopeState,
  targetX: number,
  targetY: number,
  springK = 0.32,
  maxReachFactor = 1.25
): void {
  wakeRope(rope);
  const points = rope.points;
  const anchor = points[0];
  const last = points[points.length - 1];

  // Limit how far the card can be dragged from the anchor
  const maxReach = rope.totalLength * maxReachFactor;
  let tx = targetX;
  let ty = targetY;

  const dxFromAnchor = tx - anchor.x;
  const dyFromAnchor = ty - anchor.y;
  const distFromAnchor = Math.hypot(dxFromAnchor, dyFromAnchor);

  if (distFromAnchor > maxReach && distFromAnchor > 0) {
    const scale = maxReach / distFromAnchor;
    tx = anchor.x + dxFromAnchor * scale;
    ty = anchor.y + dyFromAnchor * scale;
  }

  // Prevent dragging above the anchor point
  if (ty < anchor.y + 20) {
    ty = anchor.y + 20;
  }

  // Soft spring pull
  last.x += (tx - last.x) * springK;
  last.y += (ty - last.y) * springK;
}

/**
 * Release card with flick velocity.
 */
export function applyFlick(
  rope: RopeState,
  vx: number,
  vy: number,
  dt: number = FIXED_TIMESTEP
): void {
  wakeRope(rope);
  const points = rope.points;
  const last = points[points.length - 1];

  // Clamp flick velocity
  const maxFlick = rope.maxVelocity * 0.9;
  const clampedVx = Math.max(-maxFlick, Math.min(maxFlick, vx));
  const clampedVy = Math.max(-maxFlick, Math.min(maxFlick, vy));

  last.oldX = last.x - clampedVx * dt;
  last.oldY = last.y - clampedVy * dt;
}

/**
 * Applies a sideways or vertical impulse (e.g. keyboard nudge or scenario change).
 */
export function addImpulse(
  rope: RopeState,
  impulseX: number,
  impulseY = 0,
  dt: number = FIXED_TIMESTEP
): void {
  wakeRope(rope);
  const points = rope.points;
  // Apply impulse to lower segments
  for (let i = 3; i < points.length; i++) {
    const weight = (i - 2) / (points.length - 2);
    points[i].oldX = points[i].x - impulseX * weight * dt;
    points[i].oldY = points[i].y - impulseY * weight * dt;
  }
}

/**
 * Brings rope immediately to resting position directly below anchor.
 */
export function settleRope(rope: RopeState): void {
  const points = rope.points;
  const anchor = points[0];
  const segLen = rope.segmentLength;

  for (let i = 0; i < points.length; i++) {
    const x = anchor.x;
    const y = anchor.y + i * segLen;
    points[i].x = x;
    points[i].y = y;
    points[i].oldX = x;
    points[i].oldY = y;
  }

  rope.isSleeping = true;
  rope.sleepDurationMs = SLEEP_TRIGGER_MS;
}

/**
 * Calculate the card's attachment position, rotation angle (degrees),
 * and velocity tilt.
 */
export function calculateCardTransform(
  rope: RopeState,
  smoothedTiltPrev = 0,
  dt: number = FIXED_TIMESTEP
): {
  x: number;
  y: number;
  rotation: number;
  smoothedTilt: number;
} {
  const points = rope.points;
  const p5 = points[points.length - 2];
  const p6 = points[points.length - 1];

  // Angle of the last segment from vertical
  const dx = p6.x - p5.x;
  const dy = p6.y - p5.y;
  const segmentAngleRad = Math.atan2(dx, Math.max(dy, 1e-4));
  const segmentAngleDeg = (segmentAngleRad * 180) / Math.PI;

  // Horizontal velocity of attachment point
  const vx = (p6.x - p6.oldX) / dt;

  // Extra dynamic tilt from horizontal velocity
  const rawTiltDeg = Math.max(-14, Math.min(14, vx * 0.018));
  // Smooth the extra tilt
  const smoothedTilt = smoothedTiltPrev * 0.82 + rawTiltDeg * 0.18;

  // Total rotation clamped between -55 and 55 degrees
  const totalRotation = Math.max(
    -55,
    Math.min(55, segmentAngleDeg + smoothedTilt)
  );

  return {
    x: p6.x,
    y: p6.y,
    rotation: totalRotation,
    smoothedTilt,
  };
}

/**
 * Builds smooth SVG path data (quadratic bezier curve) through rope points.
 */
export function buildRopeSvgPath(points: RopePoint[]): string {
  if (points.length < 2) return "";

  const p0 = points[0];
  let path = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`;

  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    path += ` Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }

  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  path += ` Q ${secondLast.x.toFixed(2)} ${secondLast.y.toFixed(2)} ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;

  return path;
}

/**
 * Generates dynamic layered box-shadow that shifts and blurs with swing angle.
 */
export function calculateDynamicShadow(rotationDeg: number): string {
  const angleRad = (rotationDeg * Math.PI) / 180;
  const absAngle = Math.abs(rotationDeg);

  // Greater swing => longer offset and softer blur
  const offsetX = -Math.sin(angleRad) * (18 + absAngle * 0.35);
  const offsetY = 16 + Math.cos(angleRad) * 12 + absAngle * 0.25;
  const blur = 24 + absAngle * 0.6;
  const spread = 2 + absAngle * 0.08;
  const alpha = Math.max(0.12, 0.24 - absAngle * 0.002);

  return `${offsetX.toFixed(1)}px ${offsetY.toFixed(1)}px ${blur.toFixed(1)}px ${spread.toFixed(1)}px rgba(27, 16, 48, ${alpha.toFixed(3)}), 0 4px 10px rgba(0,0,0,0.06)`;
}

/**
 * Pure function: Selects font-size class for host name by text length so it never overflows.
 */
export function getHostFontSizeClass(name?: string): string {
  const len = (name?.trim() || "You Are Invited").length;
  if (len <= 14) return "text-2xl";
  if (len <= 22) return "text-xl";
  if (len <= 32) return "text-lg";
  if (len <= 45) return "text-base";
  return "text-sm";
}

/**
 * Pure function: Selects font-size class for event title by text length.
 */
export function getTitleFontSizeClass(title: string): string {
  const len = title.trim().length;
  if (len <= 18) return "text-xl";
  if (len <= 28) return "text-lg";
  if (len <= 40) return "text-base";
  return "text-sm";
}
