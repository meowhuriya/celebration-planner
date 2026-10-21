import { describe, it, expect } from "vitest";
import {
  encodeInvitePayload,
  decodeInvitePayload,
  toBase64Url,
  fromBase64Url,
  MAX_HASH_PAYLOAD_LENGTH,
} from "@/lib/rsvp/payload";
import type { InvitePayload } from "@/lib/rsvp/types";

describe("RSVP Payload Encoding & Decoding", () => {
  const samplePayload: InvitePayload = {
    v: 1,
    e: {
      h: "Aisha & Rahul",
      t: "wedding",
      d: "2027-11-20",
      c: "Hyderabad",
      v: "Taj Falaknuma Palace",
      th: "Royal Mughal Elegance",
      dc: "Traditional Silk",
      p: ["#800020", "#D4AF37", "#2D5A27", "#FFFDD0"],
      s: "royal",
      ph: "919876543210",
    },
    g: {
      id: "guest-101",
      n: "Priya Patel",
      grp: "Family",
    },
  };

  it("encodes and decodes payload successfully in a round-trip", async () => {
    const hash = await encodeInvitePayload(samplePayload);
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
    expect(hash.length).toBeLessThan(MAX_HASH_PAYLOAD_LENGTH);

    // Ensure base64url characters only
    expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);

    const decoded = await decodeInvitePayload(hash);
    expect(decoded).not.toBeNull();
    expect(decoded?.v).toBe(1);
    expect(decoded?.e.h).toBe("Aisha & Rahul");
    expect(decoded?.e.t).toBe("wedding");
    expect(decoded?.e.c).toBe("Hyderabad");
    expect(decoded?.e.v).toBe("Taj Falaknuma Palace");
    expect(decoded?.e.ph).toBe("919876543210");
    expect(decoded?.g.id).toBe("guest-101");
    expect(decoded?.g.n).toBe("Priya Patel");
    expect(decoded?.g.grp).toBe("Family");
  });

  it("decodes payload when hash includes leading '#' character", async () => {
    const hash = await encodeInvitePayload(samplePayload);
    const decoded = await decodeInvitePayload(`#${hash}`);
    expect(decoded).not.toBeNull();
    expect(decoded?.g.n).toBe("Priya Patel");
  });

  it("handles Unicode names and Hindi/Urdu characters cleanly", async () => {
    const unicodePayload: InvitePayload = {
      v: 1,
      e: {
        h: "आयशा और राहुल",
        t: "wedding",
        c: "जयपुर",
      },
      g: {
        id: "guest-unicode-1",
        n: "فاطمہ خان",
      },
    };

    const hash = await encodeInvitePayload(unicodePayload);
    const decoded = await decodeInvitePayload(hash);
    expect(decoded).not.toBeNull();
    expect(decoded?.e.h).toBe("आयशा और राहुल");
    expect(decoded?.e.c).toBe("जयपुर");
    expect(decoded?.g.n).toBe("فاطمہ خان");
  });

  it("rejects oversized hash payloads (> 1,500 characters)", async () => {
    const oversizedHash = "A".repeat(MAX_HASH_PAYLOAD_LENGTH + 1);
    const result = await decodeInvitePayload(oversizedHash);
    expect(result).toBeNull();
  });

  it("rejects tampered or corrupt hash payloads gracefully without crashing", async () => {
    const resultGarbage = await decodeInvitePayload(
      "not-valid-base64-at-all!@#$"
    );
    expect(resultGarbage).toBeNull();

    const resultCorrupt = await decodeInvitePayload("SGVsbG8gV29ybGQ"); // "Hello World" - not valid payload JSON
    expect(resultCorrupt).toBeNull();

    const empty = await decodeInvitePayload("");
    expect(empty).toBeNull();

    const emptyHash = await decodeInvitePayload("#");
    expect(emptyHash).toBeNull();
  });

  it("rejects payloads that violate schema requirements", async () => {
    // Missing required guest id or invalid version
    const invalidJson = JSON.stringify({
      v: 2, // version must be 1
      e: { t: "wedding" },
      g: { n: "Priya" },
    });
    const bytes = new TextEncoder().encode(invalidJson);
    const b64 = toBase64Url(bytes);

    const result = await decodeInvitePayload(b64);
    expect(result).toBeNull();
  });

  it("toBase64Url and fromBase64Url convert binary buffers accurately", () => {
    const original = new Uint8Array([0, 15, 240, 255, 42, 128, 99]);
    const b64url = toBase64Url(original);
    expect(b64url).not.toContain("+");
    expect(b64url).not.toContain("/");
    expect(b64url).not.toContain("=");

    const decoded = fromBase64Url(b64url);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});
