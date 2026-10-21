"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Guest } from "@/lib/seating";
import type { EventEssentials } from "@/lib/rsvp/types";
import {
  calculateDownscaleDimensions,
  reencodeImageThroughCanvas,
  validateCardFile,
} from "@/lib/custom-design/validation";
import {
  clampBox,
  qrSizeCheck,
  sanitizeGuestName,
  snapBoxToCenter,
  type QrSizeCheckResult,
} from "@/lib/custom-design/placement";
import {
  clearCustomDesign,
  loadCustomDesign,
  saveCustomDesign,
} from "@/lib/custom-design/storage";
import {
  batchRenderGuests,
  loadImage,
  renderCardForGuest,
} from "@/lib/custom-design/render";
import type {
  CustomDesignBox,
  CustomDesignState,
  ExportProgress,
  FontFamilyOption,
  RenderedGuestCard,
} from "@/lib/custom-design/types";
import { generateQrDataUrl } from "@/lib/rsvp/qr";
import { encodeInvitePayload } from "@/lib/rsvp/payload";

interface CustomDesignEditorProps {
  guests?: Guest[];
  eventEssentials?: EventEssentials;
  siteUrl?: string;
  className?: string;
}

const DEFAULT_EVENT_ESSENTIALS: EventEssentials = {
  t: "celebration",
  h: "Host",
  d: new Date().toISOString().split("T")[0],
  c: "City",
  v: "Venue",
  th: "Festive",
};

const SAMPLE_GUESTS: Guest[] = [
  {
    id: "sample-1",
    name: "Aarav Sharma",
    partySize: 2,
    foodChoice: "vegetarian",
  },
  {
    id: "sample-2",
    name: "Priya Patel",
    partySize: 1,
    foodChoice: "vegetarian",
  },
  {
    id: "sample-3",
    name: "Vikram Malhotra",
    partySize: 2,
    foodChoice: "non-vegetarian",
  },
];

const FONT_OPTIONS: { label: string; value: FontFamilyOption }[] = [
  { label: "Classic Serif (Playfair)", value: "Playfair Display, serif" },
  { label: "Cormorant (Elegant)", value: "Cormorant Garamond, serif" },
  { label: "Modern Sans (Inter)", value: "Inter, sans-serif" },
  { label: "Imperial Roman (Cinzel)", value: "Cinzel, serif" },
  { label: "Standard Serif", value: "serif" },
  { label: "Standard Sans", value: "sans-serif" },
];

export default function CustomDesignEditor({
  guests: providedGuests = [],
  eventEssentials = DEFAULT_EVENT_ESSENTIALS,
  siteUrl = "http://localhost:3000",
  className = "",
}: CustomDesignEditorProps) {
  // Use provided guests or fallback to sample guests
  const effectiveGuests = useMemo(() => {
    return providedGuests.length > 0 ? providedGuests : SAMPLE_GUESTS;
  }, [providedGuests]);

  // Main custom design state
  const [designState, setDesignState] = useState<CustomDesignState | null>(
    null
  );
  const [storageNotice, setStorageNotice] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Active selected box for keyboard nudging / numeric controls
  const [selectedBox, setSelectedBox] = useState<"name" | "qr">("name");

  // Visual snapping indicator state
  const [snappedCenter, setSnappedCenter] = useState<{
    x: boolean;
    y: boolean;
  }>({
    x: false,
    y: false,
  });

  // Mode: "edit" (placement boxes) vs "preview" (sample guest live render)
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [previewGuestIndex, setPreviewGuestIndex] = useState<number>(0);
  const [previewCardDataUrl, setPreviewCardDataUrl] = useState<string>("");

  // Export & Batch generation state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(
    null
  );
  const [renderedCards, setRenderedCards] = useState<RenderedGuestCard[]>([]);
  const [printLayout, setPrintLayout] = useState<"single" | "four">("single");
  const [shareAnnouncement, setShareAnnouncement] = useState<string>("");

  // DOM Container & Drag state refs
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    dragType: "move" | "resize";
    handle?: "tl" | "tr" | "bl" | "br";
    boxType: "name" | "qr";
    startX: number;
    startY: number;
    initialBox: CustomDesignBox;
  } | null>(null);

  // Load saved design from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    loadCustomDesign().then(({ design, storageType }) => {
      if (!isMounted) return;
      if (design) {
        setDesignState(design);
      }
      if (storageType === "memory") {
        setStorageNotice(
          "IndexedDB is unavailable. Your custom design is safely stored in temporary memory for this session."
        );
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Save design on update
  const persistDesign = useCallback((nextState: CustomDesignState) => {
    setDesignState(nextState);
    saveCustomDesign(nextState).then(({ storageType, warning }) => {
      if (warning) setStorageNotice(warning);
      else if (storageType === "memory") {
        setStorageNotice(
          "IndexedDB is unavailable. Your custom design is safely stored in temporary memory."
        );
      } else {
        setStorageNotice("");
      }
    });
  }, []);

  // Handle file upload with magic byte check & canvas metadata stripping
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setIsUploading(true);

    try {
      // 1. Safe binary magic bytes & dimension validator
      const validation = await validateCardFile(file);
      if (!validation.valid) {
        setUploadError(validation.error);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // 2. Load into HTMLImageElement
      const objectUrl = URL.createObjectURL(
        new Blob([validation.buffer], { type: validation.mimeType })
      );
      const img = await loadImage(objectUrl);
      URL.revokeObjectURL(objectUrl);

      // 3. Downscale math (max 2,000 px on longest side)
      const { width: targetWidth, height: targetHeight } =
        calculateDownscaleDimensions(validation.width, validation.height, 2000);

      // 4. Re-encode through canvas to strip metadata & EXIF
      const cleanDataUrl = reencodeImageThroughCanvas(
        img,
        targetWidth,
        targetHeight
      );

      // 5. Initialize sensible default box positions
      const defaultNameBox: CustomDesignBox = {
        x: Math.round(targetWidth * 0.15),
        y: Math.round(targetHeight * 0.22),
        width: Math.round(targetWidth * 0.7),
        height: Math.max(50, Math.round(targetHeight * 0.08)),
      };

      const qrSize = Math.max(140, Math.round(targetWidth * 0.22));
      const defaultQrBox: CustomDesignBox = {
        x: Math.round(targetWidth / 2 - qrSize / 2),
        y: Math.round(targetHeight * 0.72),
        width: qrSize,
        height: qrSize,
      };

      const newState: CustomDesignState = {
        imageSrc: cleanDataUrl,
        imageWidth: targetWidth,
        imageHeight: targetHeight,
        originalFileName: file.name,
        nameBox: defaultNameBox,
        qrBox: defaultQrBox,
        nameFontFamily: "Playfair Display, serif",
        nameFontSize: Math.max(24, Math.round(targetWidth * 0.038)),
        nameColor: "#2B1B14",
        nameAlign: "center",
        namePill: true,
        namePillColor: "rgba(255, 255, 255, 0.92)",
        nameTemplate: "Dear {name}",
        qrHasQuietZone: true,
        updatedAt: Date.now(),
      };

      persistDesign(newState);
      setIsUploading(false);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(
        "Failed to process your image. Please try again with another file."
      );
      setIsUploading(false);
    }
  };

  // Remove current design
  const handleRemoveDesign = async () => {
    await clearCustomDesign();
    setDesignState(null);
    setRenderedCards([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Update a box position or dimension with clamping & center snapping
  const updateBox = useCallback(
    (
      boxType: "name" | "qr",
      updater: (prev: CustomDesignBox) => CustomDesignBox,
      options?: { snap?: boolean }
    ) => {
      if (!designState) return;

      const currentBox =
        boxType === "name" ? designState.nameBox : designState.qrBox;
      let newBox = updater(currentBox);

      // QR box is strictly square (1:1)
      if (boxType === "qr") {
        const side = Math.max(newBox.width, newBox.height);
        newBox = { ...newBox, width: side, height: side };
      }

      // Center snap check
      if (options?.snap) {
        const snap = snapBoxToCenter(
          newBox,
          designState.imageWidth,
          designState.imageHeight,
          Math.max(6, Math.round(designState.imageWidth * 0.015))
        );
        newBox = snap;
        setSnappedCenter({
          x: snap.snappedToCenterX,
          y: snap.snappedToCenterY,
        });
      } else {
        newBox = clampBox(
          newBox,
          designState.imageWidth,
          designState.imageHeight
        );
        setSnappedCenter({ x: false, y: false });
      }

      const nextState: CustomDesignState = {
        ...designState,
        [boxType === "name" ? "nameBox" : "qrBox"]: newBox,
        updatedAt: Date.now(),
      };
      persistDesign(nextState);
    },
    [designState, persistDesign]
  );

  // Keyboard nudging for accessible box movement (1px, or 10px with Shift)
  const handleBoxKeyDown = (
    e: ReactKeyboardEvent<HTMLDivElement>,
    boxType: "name" | "qr"
  ) => {
    const step = e.shiftKey ? 10 : 1;
    let handled = false;

    if (e.key === "ArrowLeft") {
      updateBox(boxType, (b) => ({ ...b, x: b.x - step }), { snap: true });
      handled = true;
    } else if (e.key === "ArrowRight") {
      updateBox(boxType, (b) => ({ ...b, x: b.x + step }), { snap: true });
      handled = true;
    } else if (e.key === "ArrowUp") {
      updateBox(boxType, (b) => ({ ...b, y: b.y - step }), { snap: true });
      handled = true;
    } else if (e.key === "ArrowDown") {
      updateBox(boxType, (b) => ({ ...b, y: b.y + step }), { snap: true });
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      setSelectedBox(boxType);
    }
  };

  // Convert screen coordinates into base image coordinate space
  const getScaleFactor = useCallback(() => {
    if (!previewContainerRef.current || !designState) return 1;
    const displayedWidth = previewContainerRef.current.clientWidth || 1;
    return designState.imageWidth / displayedWidth;
  }, [designState]);

  // Pointer drag start
  const handlePointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    boxType: "name" | "qr",
    dragType: "move" | "resize",
    handle?: "tl" | "tr" | "bl" | "br"
  ) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setSelectedBox(boxType);
    const box = boxType === "name" ? designState!.nameBox : designState!.qrBox;

    dragRef.current = {
      isDragging: true,
      dragType,
      handle,
      boxType,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...box },
    };
  };

  // Pointer drag move
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current?.isDragging || !designState) return;

    const { dragType, handle, boxType, startX, startY, initialBox } =
      dragRef.current;
    const scale = getScaleFactor();
    const deltaX = (e.clientX - startX) * scale;
    const deltaY = (e.clientY - startY) * scale;

    if (dragType === "move") {
      updateBox(
        boxType,
        () => ({
          ...initialBox,
          x: initialBox.x + deltaX,
          y: initialBox.y + deltaY,
        }),
        { snap: true }
      );
    } else if (dragType === "resize" && handle) {
      updateBox(
        boxType,
        () => {
          let newX = initialBox.x;
          let newY = initialBox.y;
          let newW = initialBox.width;
          let newH = initialBox.height;

          if (handle === "br") {
            newW = Math.max(30, initialBox.width + deltaX);
            newH = Math.max(30, initialBox.height + deltaY);
          } else if (handle === "bl") {
            newW = Math.max(30, initialBox.width - deltaX);
            newH = Math.max(30, initialBox.height + deltaY);
            newX = initialBox.x + (initialBox.width - newW);
          } else if (handle === "tr") {
            newW = Math.max(30, initialBox.width + deltaX);
            newH = Math.max(30, initialBox.height - deltaY);
            newY = initialBox.y + (initialBox.height - newH);
          } else if (handle === "tl") {
            newW = Math.max(30, initialBox.width - deltaX);
            newH = Math.max(30, initialBox.height - deltaY);
            newX = initialBox.x + (initialBox.width - newW);
            newY = initialBox.y + (initialBox.height - newH);
          }

          if (boxType === "qr") {
            const side = Math.max(newW, newH);
            return { x: newX, y: newY, width: side, height: side };
          }
          return { x: newX, y: newY, width: newW, height: newH };
        },
        { snap: false }
      );
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current?.isDragging) {
      dragRef.current = null;
      setSnappedCenter({ x: false, y: false });
    }
  };

  // QR Size Check
  const qrCheck: QrSizeCheckResult = useMemo(() => {
    if (!designState) return { isTooSmall: false, recommendedSize: 150 };
    return qrSizeCheck(designState.imageWidth, designState.qrBox);
  }, [designState]);

  // Live render single card for preview
  useEffect(() => {
    if (!designState || viewMode !== "preview") return;

    let isMounted = true;
    const guest = effectiveGuests[previewGuestIndex] || effectiveGuests[0];

    async function generatePreview() {
      if (!designState || !guest) return;
      try {
        const baseImg = await loadImage(designState.imageSrc);

        // Generate QR code for this guest
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
            `${siteUrl}/i#${payloadHash}`,
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

        const dataUrl = await renderCardForGuest({
          baseImage: baseImg,
          guest,
          design: designState,
          qrDataUrl,
        });

        if (isMounted) setPreviewCardDataUrl(dataUrl);
      } catch (err) {
        console.error("Preview render failed:", err);
      }
    }

    generatePreview();

    return () => {
      isMounted = false;
    };
  }, [
    designState,
    viewMode,
    previewGuestIndex,
    effectiveGuests,
    eventEssentials,
    siteUrl,
  ]);

  // Batch Export All Guests
  const handleBatchExport = async () => {
    if (!designState) return;

    setIsExporting(true);
    setExportProgress({
      current: 0,
      total: effectiveGuests.length,
      percentage: 0,
      isComplete: false,
    });

    try {
      const cards = await batchRenderGuests(
        effectiveGuests,
        designState,
        eventEssentials,
        siteUrl,
        (progress) => {
          setExportProgress(progress);
        }
      );

      setRenderedCards(cards);
      setIsExporting(false);
    } catch (err) {
      console.error("Batch export error:", err);
      setIsExporting(false);
    }
  };

  // Download Single Guest Card
  const handleDownloadSingle = (card: RenderedGuestCard) => {
    const link = document.createElement("a");
    link.download = `Invite-${sanitizeGuestName(card.guest.name).replace(/\s+/g, "-")}.png`;
    link.href = card.dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Web Share API with file support
  const handleShareCard = async (card: RenderedGuestCard) => {
    setShareAnnouncement("");
    try {
      const res = await fetch(card.dataUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `Invite-${sanitizeGuestName(card.guest.name)}.png`,
        {
          type: "image/png",
        }
      );

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `Invitation for ${card.guest.name}`,
          text: `Hi ${card.guest.name}, you are warmly invited!`,
          files: [file],
        });
        setShareAnnouncement("Shared successfully!");
      } else {
        // Fallback: download directly
        handleDownloadSingle(card);
        setShareAnnouncement(
          "Web Share not supported with files; downloaded PNG instead."
        );
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        handleDownloadSingle(card);
      }
    }
  };

  // Trigger browser print
  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div
      className={`rounded-3xl border border-[#E8DCC8] bg-[#FFFDF8] p-5 shadow-sm sm:p-7 ${className}`}
      aria-label="Custom invitation card designer"
    >
      {/* ── HEADER & UPLOAD SECTION ── */}
      <div className="flex flex-col gap-4 border-b border-[#E8DCC8] pb-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C9A24B]">
              Custom Invitation
            </span>
            <span className="rounded-full bg-[#E07A1F]/15 px-2 py-0.5 text-[10px] font-bold text-[#E07A1F]">
              Client-Only
            </span>
          </div>
          <h2 className="mt-1 font-serif text-2xl font-normal text-[#2B1B14] sm:text-3xl">
            Use your <span className="italic text-[#5B1A2B]">own design</span>
          </h2>
          <p className="mt-1 text-xs text-[#6B5848]">
            Upload any Canva, Photoshop, or hand-crafted card. Place the guest
            name and personal RSVP QR code anywhere.
          </p>
        </div>

        {/* Canva External Link & Upload Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="https://www.canva.com"
            target="_blank"
            rel="noopener noreferrer"
            className="shadow-xs inline-flex items-center gap-1.5 rounded-full border border-[#E8DCC8] bg-white px-3.5 py-2 text-xs font-medium text-[#2B1B14] transition-colors hover:border-[#5B1A2B] hover:text-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            title="Open Canva in a new tab to create or download your invitation template"
          >
            <span>Design in Canva</span>
            <span aria-hidden="true">↗</span>
          </a>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#5B1A2B] px-4 py-2 text-xs font-semibold text-[#FBF6EE] shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#5B1A2B] focus-within:ring-offset-2 hover:bg-[#3A0F1C]">
            <span>
              {designState
                ? "Replace card"
                : "Upload your card (PNG, JPG, or WebP)"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              className="sr-only"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Helpful Canva Tip Box */}
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#FBF6EE] p-3 text-[11px] text-[#6B5848] print:hidden">
        <span className="text-base leading-none" aria-hidden="true">
          💡
        </span>
        <div>
          <span className="font-semibold text-[#2B1B14]">Canva Tip: </span>
          In Canva choose{" "}
          <span className="font-medium text-[#5B1A2B]">
            Share → Download → PNG
          </span>
          , then upload your exported card here.
        </div>
      </div>

      {/* Storage Notification (IndexedDB vs Memory) */}
      {storageNotice && (
        <div
          role="status"
          className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 print:hidden"
        >
          ℹ️ {storageNotice}
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 print:hidden"
        >
          <span className="font-bold">Upload Error: </span>
          {uploadError}
        </div>
      )}

      {/* Share Announcement */}
      {shareAnnouncement && (
        <div role="status" className="sr-only">
          {shareAnnouncement}
        </div>
      )}

      {/* ── EMPTY STATE WHEN NO DESIGN UPLOADED ── */}
      {!designState && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E8DCC8] p-10 text-center print:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5B1A2B]/10 text-2xl text-[#5B1A2B]">
            🖼️
          </div>
          <h3 className="mt-3 font-serif text-xl font-normal text-[#2B1B14]">
            No custom invitation uploaded yet
          </h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-[#6B5848]">
            Create an invitation in Canva or your favorite design software,
            export as a PNG or JPG, and upload it above. We will position the
            guest names and personal RSVP QR codes seamlessly onto your artwork.
          </p>
        </div>
      )}

      {/* ── ACTIVE DESIGN EDITOR WORKSPACE ── */}
      {designState && (
        <div className="mt-6 space-y-6">
          {/* Subheader Toolbar: Mode Switch (Edit vs Preview) & Remove */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DCC8] pb-4 print:hidden">
            <div
              role="tablist"
              aria-label="Editor view mode"
              className="inline-flex rounded-full border border-[#E8DCC8] bg-[#FBF6EE] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "edit"}
                onClick={() => setViewMode("edit")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "edit"
                    ? "bg-[#5B1A2B] text-[#FBF6EE] shadow-sm"
                    : "text-[#6B5848] hover:text-[#2B1B14]"
                }`}
              >
                1. Box Placement
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "preview"}
                onClick={() => setViewMode("preview")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "preview"
                    ? "bg-[#5B1A2B] text-[#FBF6EE] shadow-sm"
                    : "text-[#6B5848] hover:text-[#2B1B14]"
                }`}
              >
                2. Live Preview
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B5848]">
                {designState.originalFileName} ({designState.imageWidth} ×{" "}
                {designState.imageHeight} px)
              </span>
              <button
                type="button"
                onClick={handleRemoveDesign}
                className="text-xs text-rose-700 underline hover:text-rose-900"
              >
                Remove card
              </button>
            </div>
          </div>

          {/* ── PLACEMENT CANVAS VIEW ── */}
          <div className="grid gap-8 lg:grid-cols-12 print:hidden">
            {/* Left Column: Interactive Visual Placement Box */}
            <div className="lg:col-span-7">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#6B5848]">
                  <span>
                    {viewMode === "edit"
                      ? "Drag boxes or use arrow keys (Shift for 10px)"
                      : "Previewing guest card"}
                  </span>
                  {viewMode === "preview" && (
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="previewGuestSelect" className="sr-only">
                        Select guest to preview
                      </label>
                      <span className="text-[11px]">Guest:</span>
                      <select
                        id="previewGuestSelect"
                        value={previewGuestIndex}
                        onChange={(e) =>
                          setPreviewGuestIndex(Number(e.target.value))
                        }
                        className="rounded-md border border-[#E8DCC8] bg-white px-2 py-1 text-xs text-[#2B1B14]"
                      >
                        {effectiveGuests.map((g, idx) => (
                          <option key={g.id} value={idx}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Card Canvas Container */}
                <div
                  ref={previewContainerRef}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative mx-auto w-full max-w-md select-none overflow-hidden rounded-2xl border-2 border-[#E8DCC8] bg-stone-900 shadow-md"
                  style={{
                    aspectRatio: `${designState.imageWidth} / ${designState.imageHeight}`,
                  }}
                >
                  {/* Base Artwork Image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      viewMode === "preview" && previewCardDataUrl
                        ? previewCardDataUrl
                        : designState.imageSrc
                    }
                    alt="Card Artwork"
                    className="pointer-events-none h-full w-full object-contain"
                    draggable={false}
                  />

                  {/* ── EDIT MODE OVERLAYS ── */}
                  {viewMode === "edit" && (
                    <>
                      {/* Snapping Center Guide Lines */}
                      {snappedCenter.x && (
                        <div
                          className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-px border-l-2 border-dashed border-[#C9A24B] shadow-sm"
                          aria-hidden="true"
                        />
                      )}
                      {snappedCenter.y && (
                        <div
                          className="pointer-events-none absolute inset-x-0 top-1/2 z-30 h-px border-t-2 border-dashed border-[#C9A24B] shadow-sm"
                          aria-hidden="true"
                        />
                      )}

                      {/* 1. Guest Name Box */}
                      {(() => {
                        const scale = getScaleFactor();
                        const b = designState.nameBox;
                        const isSelected = selectedBox === "name";

                        return (
                          <div
                            tabIndex={0}
                            role="region"
                            aria-label="Guest name placement box. Use arrow keys to reposition."
                            onKeyDown={(e) => handleBoxKeyDown(e, "name")}
                            onPointerDown={(e) =>
                              handlePointerDown(e, "name", "move")
                            }
                            className={`absolute z-20 cursor-move border-2 transition-shadow ${
                              isSelected
                                ? "border-sky-500 bg-sky-500/20 shadow-lg ring-2 ring-sky-300"
                                : "border-sky-400/80 bg-sky-500/10 hover:border-sky-500"
                            }`}
                            style={{
                              left: `${(b.x / designState.imageWidth) * 100}%`,
                              top: `${(b.y / designState.imageHeight) * 100}%`,
                              width: `${(b.width / designState.imageWidth) * 100}%`,
                              height: `${(b.height / designState.imageHeight) * 100}%`,
                            }}
                          >
                            {/* Label Tag */}
                            <span className="absolute -top-5 left-0 rounded bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                              Guest Name
                            </span>

                            {/* Simulated Name in Edit Mode */}
                            <div
                              className="flex h-full w-full items-center justify-center p-1 text-center font-semibold"
                              style={{
                                color: designState.nameColor,
                                fontFamily: designState.nameFontFamily,
                                fontSize: `${Math.max(10, Math.round(designState.nameFontSize / scale))}px`,
                              }}
                            >
                              <span
                                className={`truncate ${
                                  designState.namePill
                                    ? "rounded-full px-2 py-0.5"
                                    : ""
                                }`}
                                style={{
                                  backgroundColor: designState.namePill
                                    ? designState.namePillColor
                                    : "transparent",
                                }}
                              >
                                {designState.nameTemplate.replace(
                                  /{name}/gi,
                                  "Aarav Sharma"
                                )}
                              </span>
                            </div>

                            {/* Resize Corner Handles */}
                            {(["tl", "tr", "bl", "br"] as const).map(
                              (handle) => (
                                <div
                                  key={handle}
                                  onPointerDown={(e) =>
                                    handlePointerDown(
                                      e,
                                      "name",
                                      "resize",
                                      handle
                                    )
                                  }
                                  className={`absolute h-3 w-3 rounded-full border-2 border-white bg-sky-600 ${
                                    handle === "tl"
                                      ? "-left-1.5 -top-1.5 cursor-nwse-resize"
                                      : handle === "tr"
                                        ? "-right-1.5 -top-1.5 cursor-nesw-resize"
                                        : handle === "bl"
                                          ? "-bottom-1.5 -left-1.5 cursor-nesw-resize"
                                          : "-bottom-1.5 -right-1.5 cursor-nwse-resize"
                                  }`}
                                />
                              )
                            )}
                          </div>
                        );
                      })()}

                      {/* 2. QR Code Box */}
                      {(() => {
                        const b = designState.qrBox;
                        const isSelected = selectedBox === "qr";

                        return (
                          <div
                            tabIndex={0}
                            role="region"
                            aria-label="QR code placement box. Square aspect ratio. Use arrow keys to reposition."
                            onKeyDown={(e) => handleBoxKeyDown(e, "qr")}
                            onPointerDown={(e) =>
                              handlePointerDown(e, "qr", "move")
                            }
                            className={`absolute z-20 cursor-move border-2 transition-shadow ${
                              isSelected
                                ? "border-amber-500 bg-amber-500/20 shadow-lg ring-2 ring-amber-300"
                                : "border-amber-400/80 bg-amber-500/10 hover:border-amber-500"
                            }`}
                            style={{
                              left: `${(b.x / designState.imageWidth) * 100}%`,
                              top: `${(b.y / designState.imageHeight) * 100}%`,
                              width: `${(b.width / designState.imageWidth) * 100}%`,
                              height: `${(b.height / designState.imageHeight) * 100}%`,
                            }}
                          >
                            {/* Label Tag */}
                            <span className="absolute -top-5 left-0 rounded bg-amber-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                              QR Code
                            </span>

                            {/* Simulated QR Pattern inside Box */}
                            <div
                              className={`flex h-full w-full items-center justify-center ${
                                designState.qrHasQuietZone
                                  ? "rounded-md bg-white/90 p-1.5 shadow-sm"
                                  : ""
                              }`}
                            >
                              <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-stone-600 bg-stone-100 text-stone-800">
                                <span className="text-[10px] font-bold">
                                  QR
                                </span>
                              </div>
                            </div>

                            {/* Resize Corner Handles */}
                            {(["tl", "tr", "bl", "br"] as const).map(
                              (handle) => (
                                <div
                                  key={handle}
                                  onPointerDown={(e) =>
                                    handlePointerDown(e, "qr", "resize", handle)
                                  }
                                  className={`absolute h-3 w-3 rounded-full border-2 border-white bg-amber-600 ${
                                    handle === "tl"
                                      ? "-left-1.5 -top-1.5 cursor-nwse-resize"
                                      : handle === "tr"
                                        ? "-right-1.5 -top-1.5 cursor-nesw-resize"
                                        : handle === "bl"
                                          ? "-bottom-1.5 -left-1.5 cursor-nesw-resize"
                                          : "-bottom-1.5 -right-1.5 cursor-nwse-resize"
                                  }`}
                                />
                              )
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Controls Panel */}
            <div className="space-y-6 lg:col-span-5">
              {/* Box Switcher for Tabbed Editing */}
              <div
                role="tablist"
                aria-label="Select box to customize"
                className="grid grid-cols-2 gap-2"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedBox === "name"}
                  onClick={() => setSelectedBox("name")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                    selectedBox === "name"
                      ? "shadow-xs border-sky-500 bg-sky-50 text-sky-900"
                      : "border-[#E8DCC8] bg-white text-[#6B5848] hover:bg-stone-50"
                  }`}
                >
                  <span>✏️ Guest Name Box</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedBox === "qr"}
                  onClick={() => setSelectedBox("qr")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                    selectedBox === "qr"
                      ? "shadow-xs border-amber-500 bg-amber-50 text-amber-900"
                      : "border-[#E8DCC8] bg-white text-[#6B5848] hover:bg-stone-50"
                  }`}
                >
                  <span>📱 QR Code Box</span>
                </button>
              </div>

              {/* 1. Guest Name Controls */}
              {selectedBox === "name" && (
                <div className="space-y-4 rounded-2xl border border-[#E8DCC8] bg-[#FBF6EE]/60 p-4">
                  <h3 className="font-serif text-sm font-semibold text-[#2B1B14]">
                    Typography & Appearance
                  </h3>

                  {/* Template Text */}
                  <div>
                    <label
                      htmlFor="customNameTemplate"
                      className="block text-[11px] font-semibold text-[#6B5848]"
                    >
                      Greeting Template (Use &#123;name&#125;)
                    </label>
                    <input
                      id="customNameTemplate"
                      type="text"
                      value={designState.nameTemplate}
                      onChange={(e) =>
                        persistDesign({
                          ...designState,
                          nameTemplate: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs text-[#2B1B14] focus:border-[#5B1A2B] focus:outline-none"
                    />
                  </div>

                  {/* Font Family Selector */}
                  <div>
                    <label
                      htmlFor="customNameFont"
                      className="block text-[11px] font-semibold text-[#6B5848]"
                    >
                      Font Family
                    </label>
                    <select
                      id="customNameFont"
                      value={designState.nameFontFamily}
                      onChange={(e) =>
                        persistDesign({
                          ...designState,
                          nameFontFamily: e.target.value as FontFamilyOption,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs text-[#2B1B14] focus:border-[#5B1A2B] focus:outline-none"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Size & Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="customNameFontSize"
                        className="block text-[11px] font-semibold text-[#6B5848]"
                      >
                        Base Size ({designState.nameFontSize}px)
                      </label>
                      <input
                        id="customNameFontSize"
                        type="range"
                        min="16"
                        max="72"
                        value={designState.nameFontSize}
                        onChange={(e) =>
                          persistDesign({
                            ...designState,
                            nameFontSize: Number(e.target.value),
                          })
                        }
                        className="mt-2 w-full accent-[#5B1A2B]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="customNameColor"
                        className="block text-[11px] font-semibold text-[#6B5848]"
                      >
                        Text Color
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          id="customNameColor"
                          type="color"
                          value={designState.nameColor}
                          onChange={(e) =>
                            persistDesign({
                              ...designState,
                              nameColor: e.target.value,
                            })
                          }
                          className="h-8 w-8 cursor-pointer rounded border border-[#E8DCC8]"
                        />
                        <span className="font-mono text-xs text-[#6B5848]">
                          {designState.nameColor}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div>
                    <span className="block text-[11px] font-semibold text-[#6B5848]">
                      Alignment
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="Text alignment"
                      className="mt-1 flex gap-1.5"
                    >
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          role="radio"
                          aria-checked={designState.nameAlign === align}
                          onClick={() =>
                            persistDesign({
                              ...designState,
                              nameAlign: align,
                            })
                          }
                          className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize ${
                            designState.nameAlign === align
                              ? "border-[#5B1A2B] bg-[#5B1A2B] text-white"
                              : "border-[#E8DCC8] bg-white text-[#2B1B14] hover:bg-stone-50"
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Pill Background Toggle */}
                  <div className="flex items-center justify-between border-t border-[#E8DCC8] pt-3">
                    <div>
                      <span className="text-xs font-semibold text-[#2B1B14]">
                        Pill Background
                      </span>
                      <p className="text-[10px] text-[#6B5848]">
                        Adds a rounded backdrop to enhance contrast
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={designState.namePill}
                        onChange={(e) =>
                          persistDesign({
                            ...designState,
                            namePill: e.target.checked,
                          })
                        }
                        className="peer sr-only"
                        aria-label="Toggle pill background"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-stone-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#5B1A2B] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                  </div>
                </div>
              )}

              {/* 2. QR Code Controls */}
              {selectedBox === "qr" && (
                <div className="space-y-4 rounded-2xl border border-[#E8DCC8] bg-[#FBF6EE]/60 p-4">
                  <h3 className="font-serif text-sm font-semibold text-[#2B1B14]">
                    QR Code Options
                  </h3>

                  {/* Quiet Zone Toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-[#E8DCC8] bg-white p-3">
                    <div>
                      <span className="text-xs font-semibold text-[#2B1B14]">
                        White Quiet Zone (Padding)
                      </span>
                      <p className="text-[10px] text-[#6B5848]">
                        Crucial for reliable scanning against artwork
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={designState.qrHasQuietZone}
                        onChange={(e) =>
                          persistDesign({
                            ...designState,
                            qrHasQuietZone: e.target.checked,
                          })
                        }
                        className="peer sr-only"
                        aria-label="Toggle QR code white quiet zone padding"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-stone-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#5B1A2B] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                  </div>

                  {/* QR Scan Size Warning */}
                  {qrCheck.isTooSmall && (
                    <div
                      role="alert"
                      className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800"
                    >
                      <span className="font-bold">⚠️ Scan Warning: </span>
                      {qrCheck.warning}
                    </div>
                  )}

                  {/* Contrast Warning if Quiet Zone Disabled */}
                  {!designState.qrHasQuietZone && (
                    <div
                      role="alert"
                      className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800"
                    >
                      <span className="font-bold">⚠️ Scanning Notice: </span>
                      Without the white quiet zone padding, QR code cameras may
                      struggle if placed on patterned or dark card backgrounds.
                    </div>
                  )}
                </div>
              )}

              {/* Numeric Position & Dimension Inputs (Accessible alternative to dragging) */}
              <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4">
                <h3 className="font-serif text-xs font-semibold uppercase tracking-wider text-[#6B5848]">
                  Precise Coordinates (
                  {selectedBox === "name" ? "Guest Name" : "QR Code"})
                </h3>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {(["x", "y", "width", "height"] as const).map((prop) => {
                    const currentBox =
                      selectedBox === "name"
                        ? designState.nameBox
                        : designState.qrBox;
                    return (
                      <div key={prop}>
                        <label
                          htmlFor={`num-input-${prop}`}
                          className="block text-[10px] font-semibold uppercase text-stone-500"
                        >
                          {prop}
                        </label>
                        <input
                          id={`num-input-${prop}`}
                          type="number"
                          value={Math.round(currentBox[prop])}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateBox(
                              selectedBox,
                              (b) => ({ ...b, [prop]: val }),
                              { snap: false }
                            );
                          }}
                          className="mt-1 w-full rounded border border-[#E8DCC8] px-2 py-1 text-xs text-[#2B1B14] focus:border-[#5B1A2B] focus:outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── EXPORT & PRINT SECTION ── */}
          <div className="mt-8 border-t border-[#E8DCC8] pt-6 print:hidden">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-serif text-xl font-normal text-[#2B1B14]">
                  Export & Print Invitations
                </h3>
                <p className="text-xs text-[#6B5848]">
                  Generate personalized cards for all {effectiveGuests.length}{" "}
                  guests. All processing happens in your browser — zero files
                  are uploaded to any server.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleBatchExport}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-full bg-[#5B1A2B] px-5 py-2.5 text-xs font-semibold text-[#FBF6EE] shadow-sm transition-all hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#FBF6EE] border-t-transparent" />
                      <span>
                        Processing ({exportProgress?.percentage || 0}%)...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Generate all {effectiveGuests.length} cards</span>
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>

                {renderedCards.length > 0 && (
                  <button
                    type="button"
                    onClick={handlePrintAll}
                    className="shadow-xs inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#2B1B14] hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    <span>🖨️ Print all</span>
                  </button>
                )}
              </div>
            </div>

            {/* Non-blocking Progress Bar */}
            {isExporting && exportProgress && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs text-[#6B5848]">
                  <span>
                    Processing guest cards: {exportProgress.current} /{" "}
                    {exportProgress.total}
                  </span>
                  <span className="font-semibold">
                    {exportProgress.percentage}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8DCC8]">
                  <div
                    className="h-full bg-[#5B1A2B] transition-all duration-150"
                    style={{ width: `${exportProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Generated Cards Gallery & Action Rows */}
            {renderedCards.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2B1B14]">
                    {renderedCards.length} Cards Generated:
                  </span>

                  {/* Print Layout Switcher */}
                  <div className="flex items-center gap-2 text-xs text-[#6B5848]">
                    <span>Print Layout:</span>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="printLayout"
                        checked={printLayout === "single"}
                        onChange={() => setPrintLayout("single")}
                        className="accent-[#5B1A2B]"
                      />
                      <span>1 per page</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="printLayout"
                        checked={printLayout === "four"}
                        onChange={() => setPrintLayout("four")}
                        className="accent-[#5B1A2B]"
                      />
                      <span>4 per page</span>
                    </label>
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {renderedCards.slice(0, 12).map((card) => (
                    <div
                      key={card.guest.id}
                      className="shadow-xs flex flex-col rounded-2xl border border-[#E8DCC8] bg-white p-3"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-stone-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.dataUrl}
                          alt={`Invitation for ${card.guest.name}`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="truncate text-xs font-semibold text-[#2B1B14]">
                          {card.guest.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(card)}
                            className="rounded-lg border border-[#E8DCC8] p-1.5 text-xs text-[#2B1B14] hover:bg-stone-50"
                            title="Download PNG"
                            aria-label={`Download PNG for ${card.guest.name}`}
                          >
                            ⬇️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareCard(card)}
                            className="rounded-lg border border-[#E8DCC8] p-1.5 text-xs text-[#2B1B14] hover:bg-stone-50"
                            title="Share Invitation"
                            aria-label={`Share invitation for ${card.guest.name}`}
                          >
                            ↗️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {renderedCards.length > 12 && (
                  <p className="text-center text-xs text-[#6B5848]">
                    Showing 12 of {renderedCards.length} cards. Click
                    &ldquo;Print all&rdquo; to print or save the complete set as
                    PDF.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── GUEST PAGE EXPLANATION NOTE ── */}
          <div className="mt-6 rounded-2xl border border-[#E8DCC8] bg-[#FBF6EE] p-4 text-xs leading-relaxed text-[#6B5848] print:hidden">
            <span className="font-semibold text-[#2B1B14]">
              Privacy &amp; Guest Page Note:{" "}
            </span>
            Your custom card design is saved locally on your device for
            generating print &amp; download invitations. When guests scan their
            personal QR code or open their link, the guest RSVP page displays
            your event details styled with the event palette and the RSVP form
            (custom image files cannot be transmitted without a central server).
          </div>
        </div>
      )}

      {/* ── PRINT-ONLY LAYOUT ── */}
      {renderedCards.length > 0 && (
        <div className="hidden print:block">
          {printLayout === "single" ? (
            // 1 card per page
            renderedCards.map((card) => (
              <div
                key={`print-${card.guest.id}`}
                className="page-break-always flex h-screen w-screen flex-col items-center justify-center p-8"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.dataUrl}
                  alt={`Invitation for ${card.guest.name}`}
                  className="max-h-[90vh] max-w-[90vw] object-contain"
                />
              </div>
            ))
          ) : (
            // 4 cards per page in a 2x2 grid
            <div className="grid grid-cols-2 gap-4 p-4">
              {renderedCards.map((card, i) => (
                <div
                  key={`print-grid-${card.guest.id}`}
                  className={`flex items-center justify-center p-2 ${
                    (i + 1) % 4 === 0 ? "page-break-always" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.dataUrl}
                    alt={`Invitation for ${card.guest.name}`}
                    className="max-h-[44vh] max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
