import type { FloorItem, Room, SeatPosition } from "./types";

/**
 * Rounds float to 4 decimal places to prevent floating-point drift.
 */
export function roundFloat(val: number, decimals = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Snaps a meter coordinate to the nearest grid increment (default 0.25m).
 */
export function snapToGrid(val: number, step = 0.25): number {
  if (step <= 0) return val;
  const snapped = Math.round(val / step) * step;
  return roundFloat(snapped, 3);
}

/**
 * Rotates point (x, y) around center (cx, cy) by angleDeg degrees clockwise.
 */
export function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: roundFloat(cx + dx * cos - dy * sin),
    y: roundFloat(cy + dx * sin + dy * cos),
  };
}

/**
 * Computes the 4 corners of an item in clockwise order, taking rotation into account.
 */
export function getItemCorners(item: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}): { x: number; y: number }[] {
  const cx = item.x + item.w / 2;
  const cy = item.y + item.h / 2;

  const rawCorners = [
    { x: item.x, y: item.y },
    { x: item.x + item.w, y: item.y },
    { x: item.x + item.w, y: item.y + item.h },
    { x: item.x, y: item.y + item.h },
  ];

  if (item.rotation === 0) {
    return rawCorners;
  }

  return rawCorners.map((pt) => rotatePoint(pt.x, pt.y, cx, cy, item.rotation));
}

/**
 * Returns axis-aligned bounding box for an item, taking rotation into account.
 */
export function getBounds(item: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  const corners = getItemCorners(item);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of corners) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  return {
    minX: roundFloat(minX),
    minY: roundFloat(minY),
    maxX: roundFloat(maxX),
    maxY: roundFloat(maxY),
    width: roundFloat(maxX - minX),
    height: roundFloat(maxY - minY),
  };
}

/**
 * Clamps item position so that its rotated bounding box fits entirely within room bounds.
 */
export function clampToRoom(item: FloorItem, room: Room): FloorItem {
  const bounds = getBounds(item);
  let dx = 0;
  let dy = 0;

  if (bounds.minX < 0) {
    dx = -bounds.minX;
  } else if (bounds.maxX > room.widthM) {
    dx = room.widthM - bounds.maxX;
  }

  if (bounds.minY < 0) {
    dy = -bounds.minY;
  } else if (bounds.maxY > room.heightM) {
    dy = room.heightM - bounds.maxY;
  }

  return {
    ...item,
    x: roundFloat(item.x + dx),
    y: roundFloat(item.y + dy),
  };
}

/**
 * Separating Axis Theorem (SAT) check for 2 convex polygons.
 */
function satOverlap(
  polyA: { x: number; y: number }[],
  polyB: { x: number; y: number }[]
): boolean {
  const polygons = [polyA, polyB];

  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i];
    for (let j = 0; j < polygon.length; j++) {
      const p1 = polygon[j];
      const p2 = polygon[(j + 1) % polygon.length];

      // Edge vector
      const edgeX = p2.x - p1.x;
      const edgeY = p2.y - p1.y;

      // Normal perpendicular axis
      const axisX = -edgeY;
      const axisY = edgeX;
      const len = Math.hypot(axisX, axisY);
      if (len === 0) continue;
      const normX = axisX / len;
      const normY = axisY / len;

      // Project polyA
      let minA = Infinity;
      let maxA = -Infinity;
      for (const p of polyA) {
        const dot = p.x * normX + p.y * normY;
        if (dot < minA) minA = dot;
        if (dot > maxA) maxA = dot;
      }

      // Project polyB
      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of polyB) {
        const dot = p.x * normX + p.y * normY;
        if (dot < minB) minB = dot;
        if (dot > maxB) maxB = dot;
      }

      // If separated along this axis, no overlap (with 0.005m tolerance)
      if (maxA < minB + 0.005 || maxB < minA + 0.005) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Generates an 8-sided polygon approximating a circle for accurate SAT tests.
 */
function getCirclePolygon(item: FloorItem): { x: number; y: number }[] {
  const r = item.w / 2;
  const cx = item.x + r;
  const cy = item.y + r;
  const pts: { x: number; y: number }[] = [];
  const segments = 12;
  for (let i = 0; i < segments; i++) {
    const theta = (i * 2 * Math.PI) / segments;
    pts.push({
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta),
    });
  }
  return pts;
}

/**
 * Checks if two floor items overlap, taking rotation and geometry into account.
 */
export function overlaps(itemA: FloorItem, itemB: FloorItem): boolean {
  if (itemA.id === itemB.id) return false;

  // Fast AABB rejection
  const bA = getBounds(itemA);
  const bB = getBounds(itemB);
  if (
    bA.maxX <= bB.minX + 0.005 ||
    bB.maxX <= bA.minX + 0.005 ||
    bA.maxY <= bB.minY + 0.005 ||
    bB.maxY <= bA.minY + 0.005
  ) {
    return false;
  }

  // Pure circle-circle check for round tables
  if (
    itemA.type === "roundTable" &&
    itemB.type === "roundTable" &&
    Math.abs(itemA.w - itemA.h) < 0.01 &&
    Math.abs(itemB.w - itemB.h) < 0.01
  ) {
    const rA = itemA.w / 2;
    const rB = itemB.w / 2;
    const cxA = itemA.x + rA;
    const cyA = itemA.y + rA;
    const cxB = itemB.x + rB;
    const cyB = itemB.y + rB;
    const distSq = (cxA - cxB) ** 2 + (cyA - cyB) ** 2;
    const minDist = rA + rB;
    return distSq < (minDist - 0.01) ** 2;
  }

  // SAT check for polygons
  const polyA =
    itemA.type === "roundTable"
      ? getCirclePolygon(itemA)
      : getItemCorners(itemA);
  const polyB =
    itemB.type === "roundTable"
      ? getCirclePolygon(itemB)
      : getItemCorners(itemB);

  return satOverlap(polyA, polyB);
}

/**
 * Calculates absolute coordinates and facing angle for all chairs around a table.
 */
export function seatPositions(item: FloorItem): SeatPosition[] {
  if (item.type === "roundTable") {
    const radius = item.w / 2;
    const cx = item.x + radius;
    const cy = item.y + radius;
    const count = item.seats ?? 8;
    const chairDistance = radius + 0.35; // 35cm outside table edge

    const seats: SeatPosition[] = [];
    for (let i = 0; i < count; i++) {
      const baseAngle = (i * 360) / count;
      const totalAngle = (baseAngle + item.rotation) % 360;
      const rad = (totalAngle * Math.PI) / 180;
      seats.push({
        seatIndex: i,
        x: roundFloat(cx + chairDistance * Math.cos(rad)),
        y: roundFloat(cy + chairDistance * Math.sin(rad)),
        angleDeg: (totalAngle + 180) % 360,
      });
    }
    return seats;
  }

  if (item.type === "longTable") {
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const count = item.seats ?? 8;
    const perSide = Math.max(1, Math.floor(count / 2));
    const chairOffset = item.h / 2 + 0.35;

    const seats: SeatPosition[] = [];
    const stepX = item.w / (perSide + 1);

    // Top side (seat 0 to perSide - 1)
    for (let k = 0; k < perSide; k++) {
      const unrotX = item.x + (k + 1) * stepX;
      const unrotY = cy - chairOffset;
      const pt = rotatePoint(unrotX, unrotY, cx, cy, item.rotation);
      seats.push({
        seatIndex: k,
        x: pt.x,
        y: pt.y,
        angleDeg: (90 + item.rotation) % 360, // facing downward toward table
      });
    }

    // Bottom side (seat perSide to 2*perSide - 1)
    for (let k = 0; k < perSide; k++) {
      const unrotX = item.x + (k + 1) * stepX;
      const unrotY = cy + chairOffset;
      const pt = rotatePoint(unrotX, unrotY, cx, cy, item.rotation);
      seats.push({
        seatIndex: perSide + k,
        x: pt.x,
        y: pt.y,
        angleDeg: (270 + item.rotation) % 360, // facing upward toward table
      });
    }

    return seats;
  }

  return [];
}
