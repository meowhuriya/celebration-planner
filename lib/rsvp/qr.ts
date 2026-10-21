/**
 * Dynamic import wrapper for qrcode-generator.
 * Loaded on-demand only when QR codes or invites are requested.
 */
export async function getQrInstance(
  text: string,
  errorCorrectionLevel: "L" | "M" | "Q" | "H" = "M"
) {
  // Exact single external dependency loaded dynamically on demand
  const qrMod = await import("qrcode-generator");
  // Handle ES module default or CommonJS export
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrcode = (qrMod.default || qrMod) as any;
  const qr = qrcode(0, errorCorrectionLevel);
  qr.addData(text);
  qr.make();
  return qr;
}

/**
 * Generates pure vector SVG markup for a QR code.
 */
export async function generateQrSvg(
  text: string,
  cellSize: number = 4,
  margin: number = 0
): Promise<string> {
  const qr = await getQrInstance(text, "M");
  return qr.createSvgTag(cellSize, margin);
}

/**
 * Generates a data URL for a QR code image.
 */
export async function generateQrDataUrl(
  text: string,
  cellSize: number = 6,
  margin: number = 2
): Promise<string> {
  const qr = await getQrInstance(text, "M");
  return qr.createDataURL(cellSize, margin);
}

/**
 * Converts a QR code data URL into a high-res PNG file and triggers browser download.
 */
export function downloadQrPng(
  dataUrlOrSvg: string,
  filename: string = "invite-qr.png"
): void {
  if (typeof window === "undefined" || !document) return;

  const cleanFilename = filename.endsWith(".png")
    ? filename
    : `${filename}.png`;

  // If already an image data URL, render onto a canvas for high-DPI crisp PNG output
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2; // 2x retina crispness
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = cleanFilename;
    link.href = pngUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  img.src = dataUrlOrSvg;
}
