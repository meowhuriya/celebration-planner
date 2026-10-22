"use client";

import { useEffect, useState, useRef } from "react";
import { generateQrDataUrl, downloadQrPng } from "@/lib/rsvp/qr";

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  inviteUrl: string;
}

export default function QrModal({
  isOpen,
  onClose,
  guestName,
  inviteUrl,
}: QrModalProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Autofocus close button on open
    setTimeout(() => closeButtonRef.current?.focus(), 50);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Generate QR code data URL whenever inviteUrl changes
  useEffect(() => {
    if (!isOpen || !inviteUrl) return;

    let isMounted = true;
    generateQrDataUrl(inviteUrl, 8, 2)
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR data URL:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, inviteUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!dataUrl) return;
    const filename = `invite-${guestName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
    downloadQrPng(dataUrl, filename);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="backdrop-blur-xs animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 text-center shadow-2xl">
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close QR code modal"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[#E8DCC8] bg-[#FBF6EE] text-[#2B1B14] hover:bg-[#5B1A2B] hover:text-[#FBF6EE] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="mb-4 pr-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
            Personalized QR Invite
          </span>
          <h3
            id="qr-modal-title"
            className="mt-1 font-serif text-xl font-normal text-[#2B1B14]"
          >
            {guestName}
          </h3>
          <p className="mt-1 text-xs text-[#6B5848]">
            Scan with any camera phone to view invitation and submit RSVP.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="my-5 flex items-center justify-center">
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt={`QR code for ${guestName}'s invitation`}
                className="h-56 w-56 object-contain"
              />
            ) : (
              <div className="flex h-56 w-56 animate-pulse items-center justify-center text-xs text-[#6B5848]">
                Generating QR code...
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {inviteUrl && (
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B1A2B] px-4 py-2.5 text-xs font-semibold text-[#FBF6EE] transition-colors hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            >
              <span>💌</span>
              <span>Open Invitation in New Tab ↗</span>
            </a>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!dataUrl}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E8DCC8] bg-[#FBF6EE] px-3 py-2 text-xs font-semibold text-[#2B1B14] transition-colors hover:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] disabled:opacity-50"
            >
              <span>📥</span>
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E8DCC8] bg-[#FBF6EE] px-3 py-2 text-xs font-semibold text-[#2B1B14] transition-colors hover:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            >
              <span>{copied ? "✓" : "🔗"}</span>
              <span>{copied ? "Copied!" : "Copy link"}</span>
            </button>
          </div>
        </div>

        {/* Live aria feedback */}
        <div aria-live="polite" className="sr-only">
          {copied ? "Personal invite link copied to clipboard" : ""}
        </div>
      </div>
    </div>
  );
}
