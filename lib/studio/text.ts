import type { TokenContext } from "./types";

/**
 * Pure text wrapping function that breaks text into multiple lines based on maximum width.
 * Takes a measure function as input so it can be completely unit-tested without a browser/canvas DOM.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measureFn: (str: string) => number
): string[] {
  if (!text) return [""];

  // Split by explicit newline characters first
  const rawParagraphs = text.split("\n");
  const resultLines: string[] = [];

  for (const paragraph of rawParagraphs) {
    if (!paragraph.trim()) {
      resultLines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = measureFn(testLine);

      if (testWidth <= maxWidth || !currentLine) {
        currentLine = testLine;
      } else {
        resultLines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}

/**
 * Replaces token placeholders like {hostNames}, {eventTitle}, {date}, {city}, {venue}, {guestName}
 * with values from the token context.
 * Gracefully handles missing values, long text, and special characters.
 */
export function resolveTokens(
  templateText: string,
  context: TokenContext
): string {
  if (!templateText) return "";

  const tokenMap: Record<string, string> = {
    "{hostNames}": context.hostNames?.trim() || "Host",
    "{eventTitle}": context.eventTitle?.trim() || "Celebration",
    "{date}": context.date?.trim() || "Event Date",
    "{city}": context.city?.trim() || "City",
    "{venue}": context.venue?.trim() || "Venue",
    "{guestName}": context.guestName?.trim() || "Guest",
    "{qr}": context.qrDataUrl || "[QR Code]",
  };

  let resolved = templateText;
  for (const [token, replacement] of Object.entries(tokenMap)) {
    // Global token replacement
    resolved = resolved.split(token).join(replacement);
  }

  return resolved;
}

/**
 * Formats date into human-readable string for card templates.
 */
export function formatStudioDate(dateString?: string): string {
  if (!dateString) return "Date TBD";
  try {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const date = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      );
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
    return dateString;
  } catch {
    return dateString;
  }
}
