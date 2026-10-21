"use client";

import React, { useState, useEffect } from "react";
import type { Design, TokenContext } from "@/lib/studio/types";
import { drawDesign } from "@/lib/studio/render";
import type { Guest } from "@/lib/seating";
import type { EventEssentials } from "@/lib/rsvp/types";
import { encodeInvitePayload } from "@/lib/rsvp/payload";
import { generateQrDataUrl } from "@/lib/rsvp/qr";
import { getSiteUrlInfo } from "@/lib/rsvp/site";

interface StudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  design: Design;
  guests: Guest[];
  eventEssentials: EventEssentials;
  tokenContext: TokenContext;
}

interface ExportedGuestCard {
  guest: Guest;
  dataUrl: string;
}

export default function StudioExportModal({
  isOpen,
  onClose,
  design,
  guests,
  eventEssentials,
  tokenContext,
}: StudioExportModalProps) {
  const [activeTab, setActiveTab] = useState<"current" | "batch">("current");
  const [exportScale, setExportScale] = useState<1 | 2>(1);
  const [isRendering, setIsRendering] = useState(false);
  const [renderedCards, setRenderedCards] = useState<ExportedGuestCard[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Single Card Download (Current Design)
  const handleDownloadSingle = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = design.width * exportScale;
    canvas.height = design.height * exportScale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (exportScale > 1) {
      ctx.scale(exportScale, exportScale);
    }

    await drawDesign(ctx, design, tokenContext);

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${design.name.toLowerCase().replace(/\s+/g, "-")}-${exportScale}x.png`;
    link.href = dataUrl;
    link.click();
  };

  // 2. Batch Export for All Guests (Up to 600 guests)
  const handleStartBatchExport = async () => {
    setIsRendering(true);
    setRenderedCards([]);

    const siteInfo = getSiteUrlInfo(process.env.NEXT_PUBLIC_SITE_URL);
    const targetGuests = (
      guests.length > 0
        ? guests
        : [
            { id: "g-1", name: "Aarav Sharma" },
            { id: "g-2", name: "Priya Patel" },
            { id: "g-3", name: "Vikram Malhotra" },
          ]
    ).slice(0, 600);

    const total = targetGuests.length;
    setProgress({ current: 0, total });

    const results: ExportedGuestCard[] = [];

    for (let i = 0; i < total; i++) {
      const guest = targetGuests[i];

      // Generate unique QR per guest
      let qrDataUrl = "";
      try {
        const payloadHash = await encodeInvitePayload({
          v: 1,
          e: eventEssentials,
          g: {
            id: guest.id,
            n: guest.name,
            grp: guest.group,
          },
        });
        qrDataUrl = await generateQrDataUrl(
          `${siteInfo.siteUrl}/i#${payloadHash}`,
          6,
          0
        );
      } catch {
        qrDataUrl = await generateQrDataUrl(
          `https://celebrate.local/i#${guest.id}`,
          6,
          0
        );
      }

      // Load QR into an Image element for canvas rendering
      let qrImg: HTMLImageElement | null = null;
      if (typeof Image !== "undefined" && qrDataUrl) {
        try {
          qrImg = new Image();
          qrImg.src = qrDataUrl;
          if (!qrImg.complete) {
            await new Promise<void>((resolve) => {
              const timer = setTimeout(resolve, 50);
              if (qrImg) {
                qrImg.onload = () => {
                  clearTimeout(timer);
                  resolve();
                };
                qrImg.onerror = () => {
                  clearTimeout(timer);
                  resolve();
                };
              }
            });
          }
        } catch {
          qrImg = null;
        }
      }

      // Render individual card
      const canvas = document.createElement("canvas");
      canvas.width = design.width;
      canvas.height = design.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await drawDesign(
          ctx,
          design,
          {
            ...tokenContext,
            guestName: guest.name,
            guestId: guest.id,
            qrDataUrl,
          },
          qrImg
        );
        const cardDataUrl = canvas.toDataURL("image/png");
        results.push({ guest, dataUrl: cardDataUrl });
      }

      setProgress({ current: i + 1, total });
      setRenderedCards([...results]);

      // Yield event loop between cards
      await new Promise((r) => setTimeout(r, 20));
    }

    setIsRendering(false);
  };

  // Download individual guest card
  const handleDownloadGuestCard = (item: ExportedGuestCard) => {
    const link = document.createElement("a");
    link.download = `invite-${item.guest.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = item.dataUrl;
    link.click();
  };

  // Native Web Share API
  const handleShareGuestCard = async (item: ExportedGuestCard) => {
    try {
      const res = await fetch(item.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `invite-${item.guest.name}.png`, {
        type: "image/png",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${design.name} for ${item.guest.name}`,
          text: `You are cordially invited to celebrate!`,
        });
      }
    } catch {
      // User cancelled share
    }
  };

  // Print all layout
  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div
      className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-export-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E8DCC8] px-6 py-4">
          <div>
            <h3
              id="studio-export-title"
              className="font-serif text-xl font-normal text-[#2B1B14] sm:text-2xl"
            >
              Export & Share <span className="italic">Cards</span>
            </h3>
            <p className="text-xs text-[#6B5848]">
              Download high-res PNGs or batch-personalise cards for every guest.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="rounded-full p-2 text-[#6B5848] hover:bg-[#FCEBD3] hover:text-[#2B1B14] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          >
            ✕
          </button>
        </div>

        {/* Export Mode Tabs */}
        <div className="flex border-b border-[#E8DCC8] bg-[#FAF2E6]/50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("current")}
            className={`border-b-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "current"
                ? "border-[#5B1A2B] text-[#5B1A2B]"
                : "border-transparent text-[#6B5848] hover:text-[#2B1B14]"
            }`}
          >
            Current Design (1 Card)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("batch")}
            className={`ml-6 border-b-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "batch"
                ? "border-[#5B1A2B] text-[#5B1A2B]"
                : "border-transparent text-[#6B5848] hover:text-[#2B1B14]"
            }`}
          >
            Export for All Guests ({guests.length || 3})
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "current" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#E8DCC8] bg-white p-4">
                <span className="mb-2 block text-xs font-semibold text-[#2B1B14]">
                  Image Resolution
                </span>
                <div className="flex gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#2B1B14]">
                    <input
                      type="radio"
                      name="scale"
                      checked={exportScale === 1}
                      onChange={() => setExportScale(1)}
                      className="accent-[#5B1A2B]"
                    />
                    <span>
                      1x Standard ({design.width}×{design.height}px)
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#2B1B14]">
                    <input
                      type="radio"
                      name="scale"
                      checked={exportScale === 2}
                      onChange={() => setExportScale(2)}
                      className="accent-[#5B1A2B]"
                    />
                    <span>
                      2x High-DPI ({design.width * 2}×{design.height * 2}px)
                    </span>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-[#E8DCC8] bg-[#FAF2E6]/60 p-4 text-xs text-[#6B5848]">
                <p className="font-semibold text-[#2B1B14]">
                  Privacy & Processing Guarantee
                </p>
                <p className="mt-1">
                  Card generation happens 100% on your device using canvas
                  rasterization. No image bytes or private names are ever
                  uploaded to any cloud server.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSingle}
                className="w-full rounded-xl bg-[#5B1A2B] py-3 text-sm font-semibold text-[#FBF6EE] shadow-sm transition-all hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
              >
                Download PNG ({exportScale}x)
              </button>
            </div>
          )}

          {activeTab === "batch" && (
            <div className="space-y-5">
              {renderedCards.length === 0 && !isRendering ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#E8DCC8] bg-white p-4 text-xs">
                    <p className="font-semibold text-[#2B1B14]">
                      Personalised Guest Export ({guests.length || 3} Guests)
                    </p>
                    <p className="mt-1 text-[#6B5848]">
                      Each guest card replaces the &ldquo;{"{guestName}"}&rdquo;
                      token with their name and synthesizes a personal RSVP QR
                      code with their unique encoded payload.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartBatchExport}
                    className="w-full rounded-xl bg-[#5B1A2B] py-3 text-sm font-semibold text-[#FBF6EE] shadow-sm transition-all hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
                  >
                    Generate All Cards ({guests.length || 3})
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Progress Bar */}
                  {isRendering && (
                    <div className="rounded-xl border border-[#E8DCC8] bg-white p-4">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#2B1B14]">
                          Generating cards...
                        </span>
                        <span className="text-[#6B5848]">
                          {progress.current} of {progress.total}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8DCC8]">
                        <div
                          className="h-full bg-[#5B1A2B] transition-all duration-150"
                          style={{
                            width: `${(progress.current / Math.max(1, progress.total)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions Header when completed */}
                  {!isRendering && renderedCards.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8DCC8] bg-[#FAF2E6]/60 p-3">
                      <span className="text-xs font-semibold text-[#2B1B14]">
                        ✓ {renderedCards.length} Cards Ready
                      </span>
                      <button
                        type="button"
                        onClick={handlePrintAll}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#5B1A2B] bg-[#5B1A2B] px-3 py-1.5 text-xs font-semibold text-[#FBF6EE] hover:bg-[#3A0F1C]"
                      >
                        <span>🖨️</span>
                        <span>Print All Cards</span>
                      </button>
                    </div>
                  )}

                  {/* Rendered Cards Gallery */}
                  <div className="grid max-h-72 grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
                    {renderedCards.map((item) => (
                      <div
                        key={item.guest.id}
                        className="shadow-2xs flex items-center justify-between rounded-lg border border-[#E8DCC8] bg-white p-2.5"
                      >
                        <div className="truncate">
                          <span className="block truncate text-xs font-semibold text-[#2B1B14]">
                            {item.guest.name}
                          </span>
                          <span className="text-[10px] text-[#6B5848]">
                            Card Ready
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadGuestCard(item)}
                            title="Download PNG"
                            className="rounded border border-[#E8DCC8] px-2 py-1 text-xs text-[#2B1B14] hover:bg-[#FCEBD3]"
                          >
                            PNG
                          </button>
                          {"share" in navigator && (
                            <button
                              type="button"
                              onClick={() => handleShareGuestCard(item)}
                              title="Share"
                              className="rounded border border-[#E8DCC8] px-2 py-1 text-xs text-[#2B1B14] hover:bg-[#FCEBD3]"
                            >
                              Share
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
