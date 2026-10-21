import type { StudioElement } from "./types";

/**
 * Snaps a scalar value to an 8px grid.
 */
export function snapToGrid(value: number, gridSize: number = 8): number {
  return Math.round(value / gridSize) * gridSize;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guideX?: number;
  guideY?: number;
}

/**
 * Snaps an element to canvas centerlines and optionally to an 8px grid.
 */
export function snapElementPosition(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number,
  threshold: number = 12,
  enableGrid: boolean = false
): SnapResult {
  let targetX = x;
  let targetY = y;
  let snappedX = false;
  let snappedY = false;
  let guideX: number | undefined;
  let guideY: number | undefined;

  // Horizontal center check
  const elementCenterX = x + w / 2;
  const canvasCenterX = canvasW / 2;
  if (Math.abs(elementCenterX - canvasCenterX) <= threshold) {
    targetX = canvasCenterX - w / 2;
    snappedX = true;
    guideX = canvasCenterX;
  } else if (enableGrid) {
    targetX = snapToGrid(targetX);
  }

  // Vertical center check
  const elementCenterY = y + h / 2;
  const canvasCenterY = canvasH / 2;
  if (Math.abs(elementCenterY - canvasCenterY) <= threshold) {
    targetY = canvasCenterY - h / 2;
    snappedY = true;
    guideY = canvasCenterY;
  } else if (enableGrid) {
    targetY = snapToGrid(targetY);
  }

  return {
    x: Math.round(targetX),
    y: Math.round(targetY),
    snappedX,
    snappedY,
    guideX,
    guideY,
  };
}

/**
 * Clamps an element so its bounding rectangle remains within canvas bounds [0, 0, canvasW, canvasH].
 */
export function clampElementBounds<
  T extends { x: number; y: number; w: number; h: number },
>(el: T, canvasW: number, canvasH: number, padding: number = 0): T {
  const w = Math.min(Math.max(10, el.w), canvasW - padding * 2);
  const h = Math.min(Math.max(10, el.h), canvasH - padding * 2);
  const x = Math.min(Math.max(padding, el.x), canvasW - w - padding);
  const y = Math.min(Math.max(padding, el.y), canvasH - h - padding);

  return {
    ...el,
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
  };
}

export interface RotatedBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Calculates the axis-aligned bounding box of an element rotated around its center point.
 */
export function getRotatedBoundingBox(
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg: number
): RotatedBounds {
  if (!rotationDeg || rotationDeg % 360 === 0) {
    return {
      minX: x,
      minY: y,
      maxX: x + w,
      maxY: y + h,
      width: w,
      height: h,
    };
  }

  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const cx = x + w / 2;
  const cy = y + h / 2;

  // 4 corners relative to center
  const corners = [
    { dx: -w / 2, dy: -h / 2 },
    { dx: w / 2, dy: -h / 2 },
    { dx: w / 2, dy: h / 2 },
    { dx: -w / 2, dy: h / 2 },
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  corners.forEach(({ dx, dy }) => {
    const rx = cx + dx * cos - dy * sin;
    const ry = cy + dx * sin + dy * cos;

    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry;
    if (ry > maxY) maxY = ry;
  });

  return {
    minX: Math.round(minX),
    minY: Math.round(minY),
    maxX: Math.round(maxX),
    maxY: Math.round(maxY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  };
}

/**
 * Checks if a point (px, py) lies inside an element that may be rotated around its center.
 */
export function pointInRotatedBox(
  px: number,
  py: number,
  el: { x: number; y: number; w: number; h: number; rotation: number }
): boolean {
  if (!el.rotation || el.rotation % 360 === 0) {
    return px >= el.x && px <= el.x + el.w && py >= el.y && py <= el.y + el.h;
  }

  const rad = (-el.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;

  // Translate point to origin, rotate inversely, translate back
  const dx = px - cx;
  const dy = py - cy;
  const unrotX = cx + dx * cos - dy * sin;
  const unrotY = cy + dx * sin + dy * cos;

  return (
    unrotX >= el.x &&
    unrotX <= el.x + el.w &&
    unrotY >= el.y &&
    unrotY <= el.y + el.h
  );
}

/**
 * Aligns an element to canvas center lines or edges.
 */
export function alignElement(
  el: StudioElement,
  canvasW: number,
  canvasH: number,
  alignment: "center-h" | "center-v" | "left" | "right" | "top" | "bottom"
): { x: number; y: number } {
  switch (alignment) {
    case "center-h":
      return { x: Math.round((canvasW - el.w) / 2), y: el.y };
    case "center-v":
      return { x: el.x, y: Math.round((canvasH - el.h) / 2) };
    case "left":
      return { x: 0, y: el.y };
    case "right":
      return { x: canvasW - el.w, y: el.y };
    case "top":
      return { x: el.x, y: 0 };
    case "bottom":
      return { x: el.x, y: canvasH - el.h };
    default:
      return { x: el.x, y: el.y };
  }
}
