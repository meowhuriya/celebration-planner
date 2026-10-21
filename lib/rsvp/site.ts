import type { SiteUrlInfo } from "./types";

/**
 * Checks if a hostname corresponds to localhost or an RFC 1918 private / local IP network.
 */
export function isLocalOrPrivateHost(hostname: string): boolean {
  if (!hostname) return true;
  const host = hostname.toLowerCase().trim();

  // Localhost & loopback
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    return true;
  }

  // 10.0.0.0/8 (10.0.0.0 – 10.255.255.255)
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

  // 172.16.0.0/12 (172.16.0.0 – 172.31.255.255)
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

  // 192.168.0.0/16 (192.168.0.0 – 192.168.255.255)
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

  // .local / .lan mDNS domains
  if (host.endsWith(".local") || host.endsWith(".lan")) return true;

  return false;
}

/**
 * Determines site address info and warns if running on localhost / private network.
 */
export function getSiteUrlInfo(
  siteUrlEnv?: string,
  windowOrigin?: string
): SiteUrlInfo {
  const envVal = siteUrlEnv?.trim();
  const originVal =
    windowOrigin ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "");

  const rawUrl = envVal || originVal || "http://localhost:3000";

  let hostname = "localhost";
  try {
    const urlObj = new URL(rawUrl);
    hostname = urlObj.hostname;
  } catch {
    hostname = "localhost";
  }

  const isLocalOrPrivate = isLocalOrPrivateHost(hostname);
  const warningMessage = isLocalOrPrivate
    ? "QR codes will only work on this Wi-Fi. Deploy the app and set NEXT_PUBLIC_SITE_URL for guests anywhere."
    : undefined;

  return {
    siteUrl: rawUrl.replace(/\/+$/, ""),
    isLocalOrPrivate,
    warningMessage,
  };
}

/**
 * Validates optional host WhatsApp phone number.
 * Must contain 8 to 15 digits only.
 */
export function validateHostPhone(phone?: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!phone || !phone.trim()) {
    return { valid: true, normalized: "" };
  }

  const clean = phone.replace(/[\s\-\+\(\)]/g, "");

  if (!/^\d+$/.test(clean)) {
    return {
      valid: false,
      normalized: clean,
      error: "Phone number must contain digits only",
    };
  }

  if (clean.length < 8 || clean.length > 15) {
    return {
      valid: false,
      normalized: clean,
      error: "Phone number must be between 8 and 15 digits",
    };
  }

  return { valid: true, normalized: clean };
}
