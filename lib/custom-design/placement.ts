import type { CustomDesignBox } from "./types";

/**
 * Clamps a box so that it stays entirely inside the image boundary [0, 0, containerWidth, containerHeight].
 * Width and height are also constrained to not exceed the container.
 */
export function clampBox(
  box: CustomDesignBox,
  containerWidth: number,
  containerHeight: number
): CustomDesignBox {
  const minDimension = 20;

  // Constrain dimensions to fit within container
  const width = Math.min(
    Math.max(box.width, minDimension),
    Math.max(minDimension, containerWidth)
  );
  const height = Math.min(
    Math.max(box.height, minDimension),
    Math.max(minDimension, containerHeight)
  );

  // Constrain position so box is fully contained
  const maxX = Math.max(0, containerWidth - width);
  const maxY = Math.max(0, containerHeight - height);

  const x = Math.min(Math.max(box.x, 0), maxX);
  const y = Math.min(Math.max(box.y, 0), maxY);

  return { x, y, width, height };
}

export interface SnapResult extends CustomDesignBox {
  snappedToCenterX: boolean;
  snappedToCenterY: boolean;
}

/**
 * Snaps a box's center to the container's horizontal or vertical center lines
 * if the center offset is within the given pixel threshold.
 */
export function snapBoxToCenter(
  box: CustomDesignBox,
  containerWidth: number,
  containerHeight: number,
  threshold: number = 8
): SnapResult {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  const boxCenterX = box.x + box.width / 2;
  const boxCenterY = box.y + box.height / 2;

  let newX = box.x;
  let newY = box.y;
  let snappedToCenterX = false;
  let snappedToCenterY = false;

  if (Math.abs(boxCenterX - centerX) <= threshold) {
    newX = Math.round(centerX - box.width / 2);
    snappedToCenterX = true;
  }

  if (Math.abs(boxCenterY - centerY) <= threshold) {
    newY = Math.round(centerY - box.height / 2);
    snappedToCenterY = true;
  }

  // Ensure still clamped within boundaries
  const clamped = clampBox(
    { ...box, x: newX, y: newY },
    containerWidth,
    containerHeight
  );

  return {
    ...clamped,
    snappedToCenterX,
    snappedToCenterY,
  };
}

export interface QrSizeCheckResult {
  isTooSmall: boolean;
  warning?: string;
  recommendedSize: number;
}

/**
 * Pure function that evaluates if a QR code is large enough to scan reliably.
 * A physical printed QR should be at least ~20mm × 20mm, or on digital exports
 * at least 120px wide (or 10% of total card width).
 */
export function qrSizeCheck(
  imageWidth: number,
  qrBox: CustomDesignBox
): QrSizeCheckResult {
  const minRecommendedPixels = 130;
  const minRatio = 0.1; // at least 10% of image width

  const pixelCheck = qrBox.width < minRecommendedPixels;
  const ratioCheck = imageWidth > 0 && qrBox.width / imageWidth < minRatio;

  if (pixelCheck || ratioCheck) {
    return {
      isTooSmall: true,
      warning: `QR code width (${Math.round(qrBox.width)}px) may be too small for reliable camera scanning. We recommend at least ${minRecommendedPixels}px.`,
      recommendedSize: Math.max(
        minRecommendedPixels,
        Math.round(imageWidth * 0.14)
      ),
    };
  }

  return {
    isTooSmall: false,
    recommendedSize: Math.round(qrBox.width),
  };
}

export interface ContrastCheckResult {
  hasWarning: boolean;
  warning?: string;
}

/**
 * Checks if the area underneath the QR box on the canvas has sufficient contrast or is very busy.
 * If the white quiet zone padding is enabled, scanning is always reliable.
 */
export function checkQrAreaContrast(
  ctx: CanvasRenderingContext2D | null,
  qrBox: CustomDesignBox,
  hasQuietZone: boolean
): ContrastCheckResult {
  // If quiet zone is ON, the QR sits on an opaque white pad, guaranteeing contrast!
  if (hasQuietZone) {
    return { hasWarning: false };
  }

  if (!ctx) {
    return { hasWarning: false };
  }

  try {
    const startX = Math.max(0, Math.floor(qrBox.x));
    const startY = Math.max(0, Math.floor(qrBox.y));
    const w = Math.max(
      1,
      Math.min(Math.floor(qrBox.width), ctx.canvas.width - startX)
    );
    const h = Math.max(
      1,
      Math.min(Math.floor(qrBox.height), ctx.canvas.height - startY)
    );

    // Sample a sparse grid of pixels (step by 8px for performance)
    const imgData = ctx.getImageData(startX, startY, w, h);
    const data = imgData.data;

    let totalLuminance = 0;
    let sampleCount = 0;
    const luminances: number[] = [];

    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3] / 255;

        // Perceived luminance (ITU-R BT.709)
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) * a;
        totalLuminance += lum;
        luminances.push(lum);
        sampleCount++;
      }
    }

    if (sampleCount === 0) return { hasWarning: false };

    const avgLuminance = totalLuminance / sampleCount;

    // Calculate variance (visual busyness / pattern noise)
    let varianceSum = 0;
    for (const lum of luminances) {
      varianceSum += (lum - avgLuminance) ** 2;
    }
    const stdDev = Math.sqrt(varianceSum / sampleCount);

    // If background is dark (average luminance < 110) or very busy (stdDev > 40),
    // dark QR code modules will not scan reliably without a white quiet zone.
    if (avgLuminance < 110 || stdDev > 40) {
      return {
        hasWarning: true,
        warning:
          "The background under the QR code appears dark or busy. We strongly recommend enabling the white quiet zone padding for reliable camera scanning.",
      };
    }

    return { hasWarning: false };
  } catch {
    return { hasWarning: false };
  }
}

/**
 * Pure function that calculates the fitted font size for text to fit within maxWidth.
 * Long names auto-shrink gracefully so they never overflow the box.
 */
export function fitText(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  maxWidth: number,
  initialSize: number = 36,
  minSize: number = 13,
  fontFamily: string = "serif",
  fontWeight: string = "600"
): number {
  if (!text || maxWidth <= 0) return initialSize;

  // In test or non-canvas environments, estimate text width based on character count
  if (!ctx || typeof ctx.measureText !== "function") {
    // Rough estimate: average char width is ~0.55 * fontSize
    const estimatedWidth = text.length * initialSize * 0.55;
    if (estimatedWidth <= maxWidth) return initialSize;
    const ratio = maxWidth / estimatedWidth;
    const fitted = Math.floor(initialSize * ratio);
    return Math.max(minSize, Math.min(initialSize, fitted));
  }

  ctx.font = `${fontWeight} ${initialSize}px ${fontFamily}`;
  const measured = ctx.measureText(text).width;

  if (measured <= maxWidth) {
    return initialSize;
  }

  // Scale down proportionally
  const scale = maxWidth / measured;
  const fitted = Math.floor(initialSize * scale);
  return Math.max(minSize, fitted);
}

/**
 * Sanitizes guest name to plain text: trims, collapses multiple spaces,
 * strips control characters, and caps at 40 characters.
 */
export function sanitizeGuestName(name: string): string {
  if (!name) return "";
  return name
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // strip control characters
    .replace(/\s+/g, " ") // collapse whitespace
    .trim()
    .slice(0, 40);
}
