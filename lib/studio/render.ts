import type { Design, TokenContext, ShapeElement } from "./types";
import { STICKER_CATALOG } from "./stickers";
import { resolveTokens, wrapText, formatStudioDate } from "./text";

/**
 * Preloads all unique fonts referenced in a design before rendering onto canvas.
 */
export async function ensureFontsLoaded(design: Design): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;

  const fontPromises: Promise<unknown>[] = [];
  const checked = new Set<string>();

  design.elements.forEach((el) => {
    if (el.type === "text" || el.type === "token") {
      const family =
        "fontFamily" in el && el.fontFamily
          ? el.fontFamily
          : "Instrument Serif";
      const size = "fontSize" in el && el.fontSize ? el.fontSize : 36;
      const key = `${size}px "${family}"`;

      if (!checked.has(key)) {
        checked.add(key);
        try {
          fontPromises.push(document.fonts.load(key));
        } catch {
          // Ignore font load errors in environments without network fonts
        }
      }
    }
  });

  try {
    await Promise.allSettled(fontPromises);
  } catch {
    // Graceful fallback if font loading fails
  }
}

/**
 * Draws background (solid, gradient, or pattern) onto the canvas context.
 */
function drawBackground(ctx: CanvasRenderingContext2D, design: Design): void {
  const { width, height, background } = design;

  if (background.type === "solid") {
    ctx.fillStyle = background.color || "#FFFDF8";
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === "gradient") {
    const from = background.gradient?.from || "#FFFDF8";
    const to = background.gradient?.to || "#E8DCC8";
    const dir = background.gradient?.direction || "vertical";

    let grad: CanvasGradient;
    if (dir === "horizontal") {
      grad = ctx.createLinearGradient(0, 0, width, 0);
    } else if (dir === "radial") {
      grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height) / 1.5
      );
    } else {
      // vertical default
      grad = ctx.createLinearGradient(0, 0, 0, height);
    }

    grad.addColorStop(0, from);
    grad.addColorStop(1, to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === "pattern") {
    // Fill base
    ctx.fillStyle = background.color || "#FFFDF8";
    ctx.fillRect(0, 0, width, height);

    const patColor = background.patternColor || "#C9A24B";
    ctx.save();

    if (background.pattern === "rangoli-dots") {
      ctx.fillStyle = patColor;
      ctx.globalAlpha = 0.25;
      const spacing = 36;
      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (background.pattern === "confetti") {
      ctx.globalAlpha = 0.2;
      const spacing = 72;
      for (let x = 30; x < width; x += spacing) {
        for (let y = 30; y < height; y += spacing) {
          ctx.fillStyle = (x + y) % 144 === 0 ? patColor : "#E91E63";
          ctx.fillRect(x, y, 6, 6);
        }
      }
    } else if (background.pattern === "damask") {
      ctx.strokeStyle = patColor;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1.2;
      const step = 60;
      for (let x = -step; x < width + step; x += step) {
        for (let y = -step; y < height + step; y += step) {
          ctx.beginPath();
          ctx.moveTo(x, y + step / 2);
          ctx.lineTo(x + step / 2, y);
          ctx.lineTo(x + step, y + step / 2);
          ctx.lineTo(x + step / 2, y + step);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }
}

/**
 * Draws a shape element onto the canvas context.
 */
function drawShape(ctx: CanvasRenderingContext2D, el: ShapeElement): void {
  ctx.beginPath();

  if (el.shapeType === "rectangle") {
    const rx = el.rx || 0;
    if (rx > 0 && typeof ctx.roundRect === "function") {
      ctx.roundRect(0, 0, el.w, el.h, rx);
    } else {
      ctx.rect(0, 0, el.w, el.h);
    }
  } else if (el.shapeType === "circle") {
    ctx.ellipse(el.w / 2, el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
  } else if (el.shapeType === "arch") {
    // Arch with semicircle top and flat bottom
    const r = el.w / 2;
    ctx.moveTo(0, el.h);
    ctx.lineTo(0, r);
    ctx.arc(r, r, r, Math.PI, 0, false);
    ctx.lineTo(el.w, el.h);
    ctx.closePath();
  } else if (el.shapeType === "line") {
    ctx.moveTo(0, el.h / 2);
    ctx.lineTo(el.w, el.h / 2);
  }

  if (el.fill && el.shapeType !== "line") {
    ctx.fillStyle = el.fill;
    ctx.fill();
  }
  if (el.stroke) {
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = el.strokeWidth || 1;
    ctx.stroke();
  }
}

/**
 * Pure function that renders the complete card design onto a CanvasRenderingContext2D.
 * Used for both live editor canvas and export PNGs (WYSIWYG guarantee).
 */
export async function drawDesign(
  ctx: CanvasRenderingContext2D,
  design: Design,
  context: TokenContext = {},
  loadedQrImage?: HTMLImageElement | null
): Promise<void> {
  if (!ctx || typeof ctx.save !== "function") return;

  // 1. Ensure fonts are loaded before painting text
  await ensureFontsLoaded(design);

  ctx.save();
  ctx.clearRect(0, 0, design.width, design.height);

  // 2. Background
  drawBackground(ctx, design);

  // 3. Render Elements in Layer Order
  for (const el of design.elements) {
    ctx.save();

    // Position and rotation around center point
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    ctx.translate(cx, cy);
    if (el.rotation) {
      ctx.rotate((el.rotation * Math.PI) / 180);
    }
    ctx.globalAlpha = el.opacity ?? 1;
    ctx.translate(-el.w / 2, -el.h / 2);

    // Render by type
    if (el.type === "shape") {
      drawShape(ctx, el);
    } else if (el.type === "sticker") {
      const stickerFn = STICKER_CATALOG[el.stickerType];
      if (stickerFn) {
        const renderData = stickerFn(el.color, el.secondaryColor, el.seed);
        const scaleX = el.w / renderData.viewBox.w;
        const scaleY = el.h / renderData.viewBox.h;

        ctx.save();
        ctx.scale(scaleX, scaleY);

        for (const p of renderData.paths) {
          try {
            if (typeof Path2D !== "undefined") {
              const p2d = new Path2D(p.d);
              if (p.fill) {
                ctx.fillStyle = p.fill;
                ctx.fill(p2d);
              }
              if (p.stroke) {
                ctx.strokeStyle = p.stroke;
                ctx.lineWidth = p.strokeWidth || 1;
                ctx.stroke(p2d);
              }
            }
          } catch {
            // Path2D fallback in environments where Path2D is not mocked
          }
        }
        ctx.restore();
      }
    } else if (el.type === "text") {
      const resolved = resolveTokens(el.text, context);
      const fontStr = `${el.italic ? "italic " : ""}${el.bold ? "bold " : ""}${el.fontSize}px "${el.fontFamily}", sans-serif`;
      ctx.font = fontStr;

      const lines = wrapText(resolved, el.w, (str) => {
        try {
          return ctx.measureText(str).width;
        } catch {
          return str.length * (el.fontSize * 0.55);
        }
      });

      const lineHeightPx = el.fontSize * (el.lineHeight || 1.2);
      ctx.fillStyle = el.color;

      lines.forEach((line, lineIdx) => {
        let lineX = 0;
        if (el.align === "center") {
          lineX = el.w / 2;
          ctx.textAlign = "center";
        } else if (el.align === "right") {
          lineX = el.w;
          ctx.textAlign = "right";
        } else {
          lineX = 0;
          ctx.textAlign = "left";
        }
        ctx.textBaseline = "top";
        ctx.fillText(line, lineX, lineIdx * lineHeightPx);
      });
    } else if (el.type === "token") {
      if (el.tokenType === "qr") {
        const pad = el.qrPadding ?? 8;
        // Quiet zone rounded backing
        ctx.fillStyle = "#FFFFFF";
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(0, 0, el.w, el.h, pad > 0 ? 12 : 0);
          ctx.fill();
        } else {
          ctx.fillRect(0, 0, el.w, el.h);
        }

        // Draw QR image if loaded, else vector placeholder
        if (loadedQrImage && loadedQrImage.complete) {
          ctx.drawImage(
            loadedQrImage,
            pad,
            pad,
            el.w - pad * 2,
            el.h - pad * 2
          );
        } else {
          // Placeholder QR pattern
          ctx.fillStyle = "#111111";
          const qrW = el.w - pad * 2;
          const qrH = el.h - pad * 2;
          ctx.strokeRect(pad, pad, qrW, qrH);
          ctx.fillRect(pad + 8, pad + 8, qrW * 0.28, qrH * 0.28);
          ctx.fillRect(pad + qrW * 0.72 - 8, pad + 8, qrW * 0.28, qrH * 0.28);
          ctx.fillRect(pad + 8, pad + qrH * 0.72 - 8, qrW * 0.28, qrH * 0.28);
          ctx.font = '12px "Hanken Grotesk", sans-serif';
          ctx.textAlign = "center";
          ctx.fillText("QR CODE", el.w / 2, el.h / 2);
        }
      } else {
        // Text token
        let val = "";
        if (el.tokenType === "hostNames")
          val = context.hostNames || "Host Names";
        else if (el.tokenType === "eventTitle")
          val = context.eventTitle || "Celebration";
        else if (el.tokenType === "date") val = formatStudioDate(context.date);
        else if (el.tokenType === "city") val = context.city || "City";
        else if (el.tokenType === "venue") val = context.venue || "Venue";
        else if (el.tokenType === "guestName")
          val = context.guestName || "Guest Name";

        const fontSize = el.fontSize || 36;
        const fontFamily = el.fontFamily || "Instrument Serif";
        const fontStr = `${el.italic ? "italic " : ""}${el.bold ? "bold " : ""}${fontSize}px "${fontFamily}", sans-serif`;
        ctx.font = fontStr;

        const lines = wrapText(val, el.w, (str) => {
          try {
            return ctx.measureText(str).width;
          } catch {
            return str.length * (fontSize * 0.55);
          }
        });

        const lineHeightPx = fontSize * (el.lineHeight || 1.2);
        ctx.fillStyle = el.color || "#2B1B14";

        lines.forEach((line, lineIdx) => {
          let lineX = 0;
          if (el.align === "center") {
            lineX = el.w / 2;
            ctx.textAlign = "center";
          } else if (el.align === "right") {
            lineX = el.w;
            ctx.textAlign = "right";
          } else {
            lineX = 0;
            ctx.textAlign = "left";
          }
          ctx.textBaseline = "top";
          ctx.fillText(line, lineX, lineIdx * lineHeightPx);
        });
      }
    }

    ctx.restore();
  }

  ctx.restore();
}
