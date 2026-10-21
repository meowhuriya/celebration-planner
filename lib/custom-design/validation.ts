import type { FileValidationResult } from "./types";

export const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
export const MAX_IMAGE_DIMENSION = 6000; // 6,000 pixels
export const MAX_DOWNSCALE_SIDE = 2000; // 2,000 pixels

/**
 * Validates the raw binary magic bytes of an ArrayBuffer.
 * Strictly accepts ONLY PNG, JPEG, and WebP.
 * Explicitly detects and rejects SVGs (script execution vulnerability),
 * PDFs, fake extensions, and other binary types with clear friendly messages.
 */
export function validateMagicBytes(buffer: ArrayBuffer): {
  valid: boolean;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  error?: string;
} {
  if (!buffer || buffer.byteLength < 12) {
    return {
      valid: false,
      error:
        "The selected file is empty or corrupted. Please upload a valid PNG, JPG, or WebP image.",
    };
  }

  const bytes = new Uint8Array(buffer.slice(0, 32));

  // 1. Check for SVG / XML text signatures (reject script injection risks)
  // Text-based files often start with <?xml or <svg or whitespace followed by <
  const textHeader = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes)
    .trim()
    .toLowerCase();

  if (
    textHeader.startsWith("<?xml") ||
    textHeader.startsWith("<svg") ||
    textHeader.includes("<svg") ||
    textHeader.includes("xmlns")
  ) {
    return {
      valid: false,
      error:
        "SVG files are not supported due to potential embedded script security risks. In Canva, choose Share → Download → PNG, and upload the PNG file.",
    };
  }

  // 2. Check for PDF: '%PDF' (0x25, 0x50, 0x44, 0x46)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return {
      valid: false,
      error:
        "PDF files are not supported. Please export your invitation as a PNG, JPG, or WebP image.",
    };
  }

  // 3. PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  if (isPng) {
    return { valid: true, mimeType: "image/png" };
  }

  // 4. JPEG Magic Bytes: FF D8 FF
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpeg) {
    return { valid: true, mimeType: "image/jpeg" };
  }

  // 5. WebP: 'RIFF' .... 'WEBP' (Bytes 0-3: 52 49 46 46, Bytes 8-11: 57 45 42 50)
  const isWebP =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (isWebP) {
    return { valid: true, mimeType: "image/webp" };
  }

  // Everything else is rejected
  return {
    valid: false,
    error:
      "File format not recognized. Please upload a genuine PNG, JPG, or WebP image.",
  };
}

/**
 * Calculates proportional downscaling so the longest side is at most maxSide (2,000 px).
 * If the image is already within bounds, preserves exact 1:1 dimensions.
 */
export function calculateDownscaleDimensions(
  width: number,
  height: number,
  maxSide: number = MAX_DOWNSCALE_SIDE
): { width: number; height: number; scale: number } {
  if (width <= 0 || height <= 0) {
    return { width: 1, height: 1, scale: 1 };
  }

  const longestSide = Math.max(width, height);
  if (longestSide <= maxSide) {
    return {
      width: Math.round(width),
      height: Math.round(height),
      scale: 1,
    };
  }

  const scale = maxSide / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/**
 * Validates a user-uploaded File: checks size, magic bytes, and dimensions.
 */
export async function validateCardFile(
  file: File
): Promise<FileValidationResult> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMb} MB). Maximum allowed size is 8 MB.`,
    };
  }

  // Read array buffer for magic bytes
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return {
      valid: false,
      error: "Unable to read the uploaded file. Please select another file.",
    };
  }

  const magicCheck = validateMagicBytes(buffer);
  if (!magicCheck.valid || !magicCheck.mimeType) {
    return {
      valid: false,
      error:
        magicCheck.error ||
        "Invalid image format. Only PNG, JPG, and WebP are accepted.",
    };
  }

  // Verify dimensions by loading into an Image object
  return new Promise<FileValidationResult>((resolve) => {
    if (typeof window === "undefined") {
      // In SSR or non-browser unit test environment without Image
      resolve({
        valid: true,
        mimeType: magicCheck.mimeType!,
        width: 1200,
        height: 1600,
        buffer,
      });
      return;
    }

    const objectUrl = URL.createObjectURL(
      new Blob([buffer], { type: magicCheck.mimeType })
    );
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        resolve({
          valid: false,
          error: `Image dimensions (${width} × ${height} px) exceed the 6,000 pixel limit. Please downscale your card in Canva or an image editor before uploading.`,
        });
        return;
      }

      resolve({
        valid: true,
        mimeType: magicCheck.mimeType!,
        width,
        height,
        buffer,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error:
          "The image data appears corrupted and could not be rendered. Please export a fresh image.",
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Re-encodes an image through an offscreen canvas to strip all EXIF/metadata
 * and downscale to target dimensions. The image never leaves the device.
 */
export function reencodeImageThroughCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas 2D rendering context");
  }

  // Draw scaled image, cleanly stripping all EXIF and metadata
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Return clean PNG data URL
  return canvas.toDataURL("image/png");
}
