import { describe, it, expect } from "vitest";
import {
  isLocalOrPrivateHost,
  getSiteUrlInfo,
  validateHostPhone,
} from "@/lib/rsvp/site";

describe("RSVP Site URL & Host Phone Validation", () => {
  describe("isLocalOrPrivateHost", () => {
    it("identifies localhost and loopbacks as local", () => {
      expect(isLocalOrPrivateHost("localhost")).toBe(true);
      expect(isLocalOrPrivateHost("127.0.0.1")).toBe(true);
      expect(isLocalOrPrivateHost("::1")).toBe(true);
      expect(isLocalOrPrivateHost("0.0.0.0")).toBe(true);
    });

    it("identifies private RFC 1918 IPs as private", () => {
      // 10.x.x.x
      expect(isLocalOrPrivateHost("10.0.0.1")).toBe(true);
      expect(isLocalOrPrivateHost("10.254.1.99")).toBe(true);
      // 172.16.x.x - 172.31.x.x
      expect(isLocalOrPrivateHost("172.16.0.1")).toBe(true);
      expect(isLocalOrPrivateHost("172.31.255.254")).toBe(true);
      // 192.168.x.x
      expect(isLocalOrPrivateHost("192.168.1.100")).toBe(true);
      expect(isLocalOrPrivateHost("192.168.0.1")).toBe(true);
      // mDNS .local
      expect(isLocalOrPrivateHost("my-macbook.local")).toBe(true);
    });

    it("identifies public domain names as non-private", () => {
      expect(isLocalOrPrivateHost("celebrate.app")).toBe(false);
      expect(isLocalOrPrivateHost("my-event-planner.vercel.app")).toBe(false);
      expect(isLocalOrPrivateHost("sub.example.com")).toBe(false);
      expect(isLocalOrPrivateHost("8.8.8.8")).toBe(false);
    });
  });

  describe("getSiteUrlInfo", () => {
    it("returns warning message when running on localhost", () => {
      const info = getSiteUrlInfo(undefined, "http://localhost:3000");
      expect(info.isLocalOrPrivate).toBe(true);
      expect(info.siteUrl).toBe("http://localhost:3000");
      expect(info.warningMessage).toContain(
        "QR codes will only work on this Wi-Fi"
      );
      expect(info.warningMessage).toContain("NEXT_PUBLIC_SITE_URL");
    });

    it("uses NEXT_PUBLIC_SITE_URL env variable over origin when provided", () => {
      const info = getSiteUrlInfo(
        "https://celebrate.app",
        "http://localhost:3000"
      );
      expect(info.isLocalOrPrivate).toBe(false);
      expect(info.siteUrl).toBe("https://celebrate.app");
      expect(info.warningMessage).toBeUndefined();
    });

    it("strips trailing slashes cleanly", () => {
      const info = getSiteUrlInfo("https://celebrate.app///");
      expect(info.siteUrl).toBe("https://celebrate.app");
    });
  });

  describe("validateHostPhone", () => {
    it("accepts valid phone numbers of 8 to 15 digits", () => {
      expect(validateHostPhone("919876543210")).toEqual({
        valid: true,
        normalized: "919876543210",
      });
      expect(validateHostPhone("+91 98765-43210")).toEqual({
        valid: true,
        normalized: "919876543210",
      });
      expect(validateHostPhone("12345678")).toEqual({
        valid: true,
        normalized: "12345678",
      });
    });

    it("accepts empty or whitespace input since phone is optional", () => {
      expect(validateHostPhone("")).toEqual({ valid: true, normalized: "" });
      expect(validateHostPhone("   ")).toEqual({ valid: true, normalized: "" });
      expect(validateHostPhone(undefined)).toEqual({
        valid: true,
        normalized: "",
      });
    });

    it("rejects invalid characters, letters, or out-of-range lengths", () => {
      const letterTest = validateHostPhone("9876abc123");
      expect(letterTest.valid).toBe(false);
      expect(letterTest.error).toContain("digits only");

      const tooShort = validateHostPhone("12345");
      expect(tooShort.valid).toBe(false);
      expect(tooShort.error).toContain("between 8 and 15 digits");

      const tooLong = validateHostPhone("12345678901234567");
      expect(tooLong.valid).toBe(false);
      expect(tooLong.error).toContain("between 8 and 15 digits");
    });
  });
});
