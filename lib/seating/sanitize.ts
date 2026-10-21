export const MAX_GUESTS = 600;
export const MAX_NAME_LENGTH = 40;

/**
 * Sanitizes a guest name:
 * - Trims leading and trailing whitespace
 * - Collapses consecutive whitespace to a single space
 * - Strips control characters (ASCII 0-31, 127-159)
 * - Restricts length between 1 and 40 characters
 */
export function sanitizeName(name: string): string {
  if (typeof name !== "string") return "";

  const stripped = name
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return stripped.slice(0, MAX_NAME_LENGTH);
}

/**
 * Parses multiple guest names pasted into a textarea:
 * handles newline-separated or comma-separated names, sanitizing each one.
 */
export function parseGuestNames(
  input: string,
  defaultGroup?: string
): Array<{ name: string; group?: string }> {
  if (!input || typeof input !== "string") return [];

  // Split on newlines or commas
  const rawParts = input.split(/[\r\n,]+/);
  const results: Array<{ name: string; group?: string }> = [];

  for (const part of rawParts) {
    const clean = sanitizeName(part);
    if (clean.length > 0) {
      results.push({
        name: clean,
        group: defaultGroup
          ? sanitizeName(defaultGroup) || undefined
          : undefined,
      });
      if (results.length >= MAX_GUESTS) break;
    }
  }

  return results;
}

/**
 * Extracts 1-2 letter initials for compact display inside circular seat icons.
 */
export function getInitials(name: string): string {
  const clean = sanitizeName(name);
  if (!clean) return "?";

  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
