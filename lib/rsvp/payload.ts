import { invitePayloadSchema } from "./schema";
import type { InvitePayload } from "./types";

export const MAX_HASH_PAYLOAD_LENGTH = 1500;

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
 * Compresses and encodes an InvitePayload into a compact base64url hash string.
 * Uses CompressionStream('deflate-raw') when available.
 */
export async function encodeInvitePayload(
  payload: InvitePayload
): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const utf8Bytes = new TextEncoder().encode(jsonStr);

  if (typeof CompressionStream !== "undefined") {
    try {
      const stream = new Blob([utf8Bytes as BlobPart])
        .stream()
        .pipeThrough(new CompressionStream("deflate-raw"));
      const buffer = await new Response(stream).arrayBuffer();
      return toBase64Url(new Uint8Array(buffer));
    } catch {
      // Fallback to uncompressed base64url
      return toBase64Url(utf8Bytes);
    }
  }

  return toBase64Url(utf8Bytes);
}

/**
 * Decodes, decompresses, and validates a base64url hash payload against the strict Zod schema.
 * Rejects payloads exceeding 1,500 characters, tampered data, or malformed JSON.
 */
export async function decodeInvitePayload(
  rawHash: string
): Promise<InvitePayload | null> {
  if (!rawHash) return null;

  // Clean hash prefix '#' if present
  const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
  if (!hash.trim()) return null;

  // Strict length check: reject oversized payloads
  if (hash.length > MAX_HASH_PAYLOAD_LENGTH) {
    console.warn(
      `[RSVP] Hash payload length ${hash.length} exceeds limit of ${MAX_HASH_PAYLOAD_LENGTH}`
    );
    return null;
  }

  try {
    const bytes = fromBase64Url(hash);

    let jsonText: string;

    // Attempt decompression via DecompressionStream('deflate-raw')
    if (typeof DecompressionStream !== "undefined") {
      try {
        const stream = new Blob([bytes as BlobPart])
          .stream()
          .pipeThrough(new DecompressionStream("deflate-raw"));
        jsonText = await new Response(stream).text();
      } catch {
        // Fallback: the payload might be uncompressed UTF-8 bytes
        jsonText = new TextDecoder().decode(bytes);
      }
    } else {
      jsonText = new TextDecoder().decode(bytes);
    }

    const parsed = JSON.parse(jsonText);
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
