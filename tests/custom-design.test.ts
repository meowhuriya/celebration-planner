import { describe, expect, it } from "vitest";
import {
  calculateDownscaleDimensions,
  MAX_FILE_SIZE,
  MAX_IMAGE_DIMENSION,
  validateCardFile,
  validateMagicBytes,
} from "@/lib/custom-design/validation";
import {
  clampBox,
  fitText,
  qrSizeCheck,
  sanitizeGuestName,
  snapBoxToCenter,
} from "@/lib/custom-design/placement";
import {
  clearCustomDesign,
  isIndexedDBAvailable,
  loadCustomDesign,
  saveCustomDesign,
} from "@/lib/custom-design/storage";
import type { CustomDesignState } from "@/lib/custom-design/types";

describe("Custom Design Magic Bytes & File Validation", () => {
  it("accepts a valid PNG with 89 50 4E 47 0D 0A 1A 0A header", () => {
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ]);
    const result = validateMagicBytes(pngBytes.buffer);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/png");
  });

  it("accepts a valid JPEG with FF D8 FF header", () => {
    const jpegBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const result = validateMagicBytes(jpegBytes.buffer);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("accepts a valid WebP with RIFF...WEBP header", () => {
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20,
    ]);
    const result = validateMagicBytes(webpBytes.buffer);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/webp");
  });

  it("rejects an SVG file disguised with a fake .png extension (script execution risk)", () => {
    const svgText =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const svgBytes = new TextEncoder().encode(svgText);
    const result = validateMagicBytes(svgBytes.buffer);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/SVG files are not supported/i);
    expect(result.error).toMatch(/script security risk/i);
  });

  it("rejects an XML-prefixed SVG file", () => {
    const xmlSvg = '<?xml version="1.0"?><svg width="100" height="100"></svg>';
    const bytes = new TextEncoder().encode(xmlSvg);
    const result = validateMagicBytes(bytes.buffer);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/SVG files are not supported/i);
  });

  it("rejects a PDF file with %PDF magic bytes", () => {
    const pdfBytes = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 0x0a, 0x25, 0xd0, 0xd4,
    ]);
    const result = validateMagicBytes(pdfBytes.buffer);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/PDF files are not supported/i);
  });

  it("rejects arbitrary garbage or fake extensions", () => {
    const junkBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const result = validateMagicBytes(junkBytes.buffer);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/File format not recognized/i);
  });

  it("rejects files exceeding the 8 MB maximum size limit", async () => {
    // Mock oversized file
    const fakeFile = {
      name: "giant_card.png",
      size: MAX_FILE_SIZE + 1024,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File;

    const result = await validateCardFile(fakeFile);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/8 MB/i);
    }
  });
});

describe("Downscale Math & Dimensions Calculation", () => {
  it("preserves exact 1:1 dimensions when image is within 2,000 px limit", () => {
    const res = calculateDownscaleDimensions(1200, 1600, 2000);
    expect(res.width).toBe(1200);
    expect(res.height).toBe(1600);
    expect(res.scale).toBe(1);
  });

  it("downscales proportionally when longest side exceeds 2,000 px", () => {
    // 4000 x 3000 -> longest side is 4000 -> scale to 2000 x 1500
    const res = calculateDownscaleDimensions(4000, 3000, 2000);
    expect(res.width).toBe(2000);
    expect(res.height).toBe(1500);
    expect(res.scale).toBe(0.5);
  });

  it("handles tall vertical cards correctly", () => {
    // 1500 x 3000 -> longest side is 3000 -> scale to 1000 x 2000
    const res = calculateDownscaleDimensions(1500, 3000, 2000);
    expect(res.width).toBe(1000);
    expect(res.height).toBe(2000);
    expect(res.scale).toBeCloseTo(2 / 3, 3);
  });
});

describe("Placement Clamping & Center Snapping", () => {
  it("clamps box dragged past the left or top boundary", () => {
    const clamped = clampBox(
      { x: -50, y: -20, width: 200, height: 100 },
      1000,
      1400
    );
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
  });

  it("clamps box dragged past the right or bottom boundary", () => {
    const clamped = clampBox(
      { x: 900, y: 1350, width: 200, height: 100 },
      1000,
      1400
    );
    // Max x = 1000 - 200 = 800
    expect(clamped.x).toBe(800);
    // Max y = 1400 - 100 = 1300
    expect(clamped.y).toBe(1300);
  });

  it("snaps box to horizontal center line when within threshold", () => {
    const containerWidth = 800; // center is 400
    // Box width 200 -> center should be 400 -> x should be 300
    // If x is 304, box center is 404 (within threshold 8)
    const result = snapBoxToCenter(
      { x: 304, y: 100, width: 200, height: 80 },
      containerWidth,
      1000,
      8
    );

    expect(result.snappedToCenterX).toBe(true);
    expect(result.x).toBe(300);
  });

  it("snaps box to vertical center line when within threshold", () => {
    const containerHeight = 1000; // center is 500
    // Box height 100 -> center should be 500 -> y should be 450
    // If y is 447, box center is 497 (within threshold 8)
    const result = snapBoxToCenter(
      { x: 100, y: 447, width: 200, height: 100 },
      800,
      containerHeight,
      8
    );

    expect(result.snappedToCenterY).toBe(true);
    expect(result.y).toBe(450);
  });
});

describe("QR Code Size Checker & Contrast Warnings", () => {
  it("warns if QR code is under minimum recommended scanning width", () => {
    const smallQr = qrSizeCheck(1200, {
      x: 100,
      y: 100,
      width: 80,
      height: 80,
    });
    expect(smallQr.isTooSmall).toBe(true);
    expect(smallQr.warning).toMatch(/too small/i);
  });

  it("passes when QR code is large enough to scan reliably", () => {
    const adequateQr = qrSizeCheck(1200, {
      x: 100,
      y: 100,
      width: 180,
      height: 180,
    });
    expect(adequateQr.isTooSmall).toBe(false);
  });
});

describe("Fit-Text Typography Auto-Shrink & Name Sanitization", () => {
  it("preserves initial font size for short names", () => {
    // Estimator in unit test
    const fitted = fitText(null, "Ali", 400, 36, 14);
    expect(fitted).toBe(36);
  });

  it("auto-shrinks font size for long names so they fit the box", () => {
    const fitted = fitText(
      null,
      "Her Royal Highness Princess Isabella Marie Alexandrina",
      200,
      36,
      14
    );
    expect(fitted).toBeLessThan(36);
    expect(fitted).toBeGreaterThanOrEqual(14);
  });

  it("sanitizes names by stripping control characters and trimming", () => {
    const dirty = "  \x00\x1FAarav   Kumar \x7F  ";
    expect(sanitizeGuestName(dirty)).toBe("Aarav Kumar");
  });

  it("caps names at 40 characters", () => {
    const huge = "A".repeat(80);
    expect(sanitizeGuestName(huge)).toHaveLength(40);
  });
});

describe("IndexedDB Storage Wrapper & In-Memory Fallback", () => {
  const sampleState: CustomDesignState = {
    imageSrc:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    imageWidth: 800,
    imageHeight: 1200,
    originalFileName: "invitation.png",
    nameBox: { x: 200, y: 300, width: 400, height: 80 },
    qrBox: { x: 300, y: 800, width: 200, height: 200 },
    nameFontFamily: "serif",
    nameFontSize: 32,
    nameColor: "#2B1B14",
    nameAlign: "center",
    namePill: true,
    namePillColor: "rgba(255, 255, 255, 0.9)",
    nameTemplate: "Dear {name}",
    qrHasQuietZone: true,
    updatedAt: Date.now(),
  };

  it("saves and loads custom design without crashing even if IndexedDB is not fully available in test runner", async () => {
    const saveResult = await saveCustomDesign(sampleState);
    expect(saveResult.success).toBe(true);
    expect(["indexeddb", "memory"]).toContain(saveResult.storageType);

    const loaded = await loadCustomDesign();
    expect(loaded.design).not.toBeNull();
    expect(loaded.design?.imageWidth).toBe(800);
    expect(loaded.design?.nameTemplate).toBe("Dear {name}");

    await clearCustomDesign();
    const afterClear = await loadCustomDesign();
    expect(afterClear.design).toBeNull();
  });
});
