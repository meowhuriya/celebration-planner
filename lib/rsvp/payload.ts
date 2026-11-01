import { invitePayloadSchema } from "./schema";
import type { InvitePayload } from "./types";

export const MAX_HASH_PAYLOAD_LENGTH = 1500;

/**
 * Normalizes an InvitePayload by stripping empty strings and trimming optional fields.
 */
export function cleanInvitePayload(payload: InvitePayload): InvitePayload {
  return {
    v: 1,
    e: {
      t: payload.e.t || "celebration",
      h: payload.e.h || "",
      d: payload.e.d || "",
      c: payload.e.c || "",
      v: payload.e.v?.trim() || undefined,
      th: payload.e.th?.trim() || undefined,
      dc: payload.e.dc?.trim() || undefined,
      p: payload.e.p,
      s: payload.e.s || "royal",
      ph: payload.e.ph?.trim()
        ? payload.e.ph.replace(/[\s\-\+\(\)]/g, "")
        : undefined,
    },
    g: {
      id: payload.g.id || "guest",
      n: payload.g.n || "Guest",
      grp: payload.g.grp?.trim() || undefined,
    },
  };
}

/**
 * Converts a Uint8Array into a URL-safe Base64 string (no '+', '/', or '=' padding).
 */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Converts a URL-safe Base64 string back into a Uint8Array.
 */
export function fromBase64Url(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Fast synchronous encoder for InvitePayload.
 * Produces a URL-safe Base64 string prefixed with 'raw_' using standard UTF-8 TextEncoder.
 * Never hangs, has zero microtask delays, and works synchronously in any environment.
 */
export function encodeInvitePayloadSync(payload: InvitePayload): string {
  const cleaned = cleanInvitePayload(payload);
  const jsonStr = JSON.stringify(cleaned);
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  return `raw_${toBase64Url(utf8Bytes)}`;
}

/**
 * Compresses and encodes an InvitePayload into a compact base64url hash string.
 * Uses CompressionStream('deflate-raw') with a 200ms timeout race.
 * If CompressionStream hangs (>200ms), fails, or is unsupported,
 * falls back to the fast synchronous raw UTF-8 base64url encoding.
 */
export async function encodeInvitePayload(
  payload: InvitePayload
): Promise<string> {
  const cleaned = cleanInvitePayload(payload);
  const jsonStr = JSON.stringify(cleaned);
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  const syncFallback = `raw_${toBase64Url(utf8Bytes)}`;

  if (typeof CompressionStream !== "undefined") {
    try {
      const compressionPromise = (async () => {
        const stream = new Blob([utf8Bytes as BlobPart])
          .stream()
          .pipeThrough(new CompressionStream("deflate-raw"));
        const buffer = await new Response(stream).arrayBuffer();
        return toBase64Url(new Uint8Array(buffer));
      })();

      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve(syncFallback), 200);
      });

      return await Promise.race([compressionPromise, timeoutPromise]);
    } catch {
      return syncFallback;
    }
  }

  return syncFallback;
}

/**
 * Synchronous decoder for invite payloads.
 * Supports raw JSON, raw_ prefixed base64url, and uncompressed base64url.
 */
export function decodeInvitePayloadSync(rawHash: string): InvitePayload | null {
  if (!rawHash) return null;
  let hash = rawHash.trim();

  // Strip leading URL parts if full URL was passed
  if (hash.includes("#")) {
    hash = hash.slice(hash.indexOf("#") + 1);
  }
  if (hash.startsWith("%23")) {
    hash = hash.slice(3);
  }
  if (hash.includes("code=")) {
    const m = hash.match(/[?&]code=([^&]+)/);
    if (m) hash = m[1];
  } else if (hash.includes("data=")) {
    const m = hash.match(/[?&]data=([^&]+)/);
    if (m) hash = m[1];
  } else if (hash.includes("invite=")) {
    const m = hash.match(/[?&]invite=([^&]+)/);
    if (m) hash = m[1];
  }

  if (hash.startsWith("#")) hash = hash.slice(1);

  try {
    hash = decodeURIComponent(hash);
  } catch {}

  hash = hash.split("?")[0].split("&")[0].trim();
  if (!hash || hash.length > MAX_HASH_PAYLOAD_LENGTH) return null;

  // Strategy A: If hash is already raw JSON
  if (hash.startsWith("{") && hash.endsWith("}")) {
    try {
      const parsed = JSON.parse(hash);
      const validated = invitePayloadSchema.safeParse(parsed);
      return validated.success ? (validated.data as InvitePayload) : null;
    } catch {
      return null;
    }
  }

  // Strategy B: If hash has raw_ prefix or is uncompressed base64url
  if (hash.startsWith("raw_")) {
    hash = hash.slice(4);
  }

  try {
    const bytes = fromBase64Url(hash);
    const jsonText = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonText);

    if (parsed && typeof parsed === "object" && parsed.e) {
      if (parsed.e.ph === "") parsed.e.ph = undefined;
      if (parsed.e.v === "") parsed.e.v = undefined;
      if (parsed.e.th === "") parsed.e.th = undefined;
      if (parsed.e.dc === "") parsed.e.dc = undefined;
    }

    const validated = invitePayloadSchema.safeParse(parsed);
    return validated.success ? (validated.data as InvitePayload) : null;
  } catch {
    return null;
  }
}

/**
 * Decodes, decompresses, and validates a base64url hash payload against the Zod schema.
 * Supports full URLs, hash fragments, query params (?code=...), raw JSON, raw_ prefix, and deflate-raw base64url.
 * Includes a 200ms timeout on DecompressionStream to prevent browser hangs.
 */
export async function decodeInvitePayload(
  rawHash: string
): Promise<InvitePayload | null> {
  if (!rawHash) return null;

  // 1. Try instant synchronous decode first (handles raw JSON and raw_ prefix immediately)
  const syncResult = decodeInvitePayloadSync(rawHash);
  if (syncResult) return syncResult;

  let hash = rawHash.trim();

  // If full URL was passed, extract fragment or query param
  if (hash.includes("#")) {
    hash = hash.slice(hash.indexOf("#") + 1);
  }
  if (hash.startsWith("%23")) {
    hash = hash.slice(3);
  }
  if (hash.includes("code=")) {
    const m = hash.match(/[?&]code=([^&]+)/);
    if (m) hash = m[1];
  } else if (hash.includes("data=")) {
    const m = hash.match(/[?&]data=([^&]+)/);
    if (m) hash = m[1];
  } else if (hash.includes("invite=")) {
    const m = hash.match(/[?&]invite=([^&]+)/);
    if (m) hash = m[1];
  }

  // Strip leading '#' if still present
  if (hash.startsWith("#")) hash = hash.slice(1);

  // Decode URI encoding if present
  try {
    hash = decodeURIComponent(hash);
  } catch {
    // Keep raw if decodeURIComponent fails
  }

  // Strip query/anchor artifacts
  hash = hash.split("?")[0].split("&")[0].trim();
  if (!hash) return null;

  // Strict length check: reject oversized payloads
  if (hash.length > MAX_HASH_PAYLOAD_LENGTH) {
    console.warn(
      `[RSVP] Hash payload length ${hash.length} exceeds limit of ${MAX_HASH_PAYLOAD_LENGTH}`
    );
    return null;
  }

  if (hash.startsWith("raw_")) {
    hash = hash.slice(4);
  }

  try {
    const bytes = fromBase64Url(hash);
    let jsonText = "";

    // Attempt decompression via DecompressionStream('deflate-raw') with 200ms timeout
    if (typeof DecompressionStream !== "undefined") {
      try {
        const decompressionPromise = (async () => {
          const stream = new Blob([bytes as BlobPart])
            .stream()
            .pipeThrough(new DecompressionStream("deflate-raw"));
          return await new Response(stream).text();
        })();

        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error("Decompression timeout")), 200);
        });

        jsonText = await Promise.race([decompressionPromise, timeoutPromise]);
      } catch {
        // Fallback: the payload might be uncompressed UTF-8 bytes
        jsonText = new TextDecoder().decode(bytes);
      }
    } else {
      jsonText = new TextDecoder().decode(bytes);
    }

    const parsed = JSON.parse(jsonText);

    // Normalize empty strings to undefined for optional fields
    if (parsed && typeof parsed === "object" && parsed.e) {
      if (parsed.e.ph === "") parsed.e.ph = undefined;
      if (parsed.e.v === "") parsed.e.v = undefined;
      if (parsed.e.th === "") parsed.e.th = undefined;
      if (parsed.e.dc === "") parsed.e.dc = undefined;
    }

    const validated = invitePayloadSchema.safeParse(parsed);

    if (!validated.success) {
      console.warn("[RSVP] Payload validation error:", validated.error);
      return null;
    }

    return validated.data as InvitePayload;
  } catch (err) {
    console.warn("[RSVP] Failed to decode hash payload:", err);
    return null;
  }
}
