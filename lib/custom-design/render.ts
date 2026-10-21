import type { Guest } from "@/lib/seating";
import type { EventEssentials } from "@/lib/rsvp/types";
import { encodeInvitePayload } from "@/lib/rsvp/payload";
import { generateQrDataUrl } from "@/lib/rsvp/qr";
import type {
  CustomDesignState,
  ExportProgress,
  RenderedGuestCard,
} from "./types";
import { fitText, sanitizeGuestName } from "./placement";

export const MAX_EXPORT_GUESTS = 600;

export interface RenderCardOptions {
  canvas?: HTMLCanvasElement;
  baseImage: HTMLImageElement;
  guest: Guest;
  design: CustomDesignState;
  qrDataUrl: string;
}

/**
 * Loads an HTMLImageElement from a data URL or source string.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    img.src = src;
  });
}

/**
 * Draws a rounded rectangle path on a 2D canvas context.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Renders a complete personalized invitation card for a specific guest onto a canvas.
 * Strips metadata, applies fitted typography, draws the QR code (with quiet zone padding),
 * and returns high-resolution PNG data URL.
 */
export async function renderCardForGuest(
  options: RenderCardOptions
): Promise<string> {
  const { baseImage, guest, design, qrDataUrl } = options;
  const canvas = options.canvas || document.createElement("canvas");

  canvas.width = design.imageWidth;
  canvas.height = design.imageHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is not available");
  }

  // 1. Draw base card image
  ctx.drawImage(baseImage, 0, 0, design.imageWidth, design.imageHeight);

  // 2. Draw QR Code Box
  if (qrDataUrl) {
    try {
      const qrImg = await loadImage(qrDataUrl);
      const { x, y, width, height } = design.qrBox;

      if (design.qrHasQuietZone) {
        // Draw white rounded quiet zone background
        const pad = Math.max(6, Math.round(width * 0.08));
        const padX = x - pad;
        const padY = y - pad;
        const padW = width + pad * 2;
        const padH = height + pad * 2;
        const cornerRadius = Math.max(6, Math.round(padW * 0.08));

        ctx.save();
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        drawRoundedRect(ctx, padX, padY, padW, padH, cornerRadius);
        ctx.fill();
        ctx.restore();

        // Draw crisp QR code inside quiet zone
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(qrImg, x, y, width, height);
      } else {
        // Direct draw without padding
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(qrImg, x, y, width, height);
      }
    } catch (err) {
      console.warn("Could not render QR code on card:", err);
    }
  }

  // 3. Draw Guest Name Box
  const sanitizedName = sanitizeGuestName(guest.name || "Special Guest");
  const template = design.nameTemplate || "Dear {name}";
  const fullText = template.replace(/{name}/gi, sanitizedName);

  const { x, y, width, height } = design.nameBox;
  const innerPad = Math.max(6, Math.round(height * 0.1));
  const availableWidth = Math.max(10, width - innerPad * 2);

  // Auto-shrink font to fit inside width
  const fittedFontSize = fitText(
    ctx,
    fullText,
    availableWidth,
    design.nameFontSize,
    14,
    design.nameFontFamily,
    "600"
  );

  ctx.font = `600 ${fittedFontSize}px ${design.nameFontFamily}`;

  // Optional Pill Background
  if (design.namePill) {
    ctx.save();
    ctx.fillStyle = design.namePillColor || "rgba(255, 255, 255, 0.88)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    drawRoundedRect(ctx, x, y, width, height, height / 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw Text
  ctx.save();
  ctx.fillStyle = design.nameColor || "#2B1B14";
  ctx.textAlign = design.nameAlign;
  ctx.textBaseline = "middle";

  let textX = x + width / 2;
  if (design.nameAlign === "left") {
    textX = x + innerPad;
  } else if (design.nameAlign === "right") {
    textX = x + width - innerPad;
  }
  const textY = y + height / 2;

  ctx.fillText(fullText, textX, textY);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

/**
 * Generates personal QR codes and invitation cards for multiple guests one by one
 * without locking up the browser UI. Emits progress events for the progress bar.
 */
export async function batchRenderGuests(
  guests: Guest[],
  design: CustomDesignState,
  eventEssentials: EventEssentials,
  siteUrl: string,
  onProgress?: (progress: ExportProgress) => void
): Promise<RenderedGuestCard[]> {
  const targetGuests = guests.slice(0, MAX_EXPORT_GUESTS);
  const total = targetGuests.length;
  if (total === 0) return [];

  const baseImage = await loadImage(design.imageSrc);
  const results: RenderedGuestCard[] = [];

  for (let i = 0; i < total; i++) {
    const guest = targetGuests[i];

    // Build unique payload & QR for this guest
    let qrDataUrl = "";
    try {
      const payloadHash = await encodeInvitePayload({
        v: 1,
        e: eventEssentials,
        g: {
          id: guest.id,
          n: guest.name,
          grp: guest.group,
        },
      });

      const inviteUrl = `${siteUrl}/i#${payloadHash}`;
      qrDataUrl = await generateQrDataUrl(inviteUrl, 6, 0);
    } catch {
      // Fallback placeholder QR
      qrDataUrl = await generateQrDataUrl(
        `https://celebrate.local/i#${guest.id}`,
        6,
        0
      );
    }

    // Render single card
    const cardDataUrl = await renderCardForGuest({
      baseImage,
      guest,
      design,
      qrDataUrl,
    });

    results.push({
      guest,
      dataUrl: cardDataUrl,
    });

    // Notify progress
    const current = i + 1;
    const percentage = Math.round((current / total) * 100);
    if (onProgress) {
      onProgress({
        current,
        total,
        percentage,
        isComplete: current === total,
      });
    }

    // Yield execution to the browser event loop so the page stays buttery smooth
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}
