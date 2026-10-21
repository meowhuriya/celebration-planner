"use client";

import React, { useState } from "react";
import type {
  Design,
  StudioElement,
  BackgroundConfig,
  TextElement,
  ShapeElement,
  StickerElement,
  TokenElement,
  StickerType,
  TokenType,
  ShapeType,
} from "@/lib/studio/types";
import { buildTemplates } from "@/lib/studio/templates";
import type { EventPalette, EventInput } from "@/lib/schemas";
import {
  listMyDesigns,
  loadFromMyDesigns,
  type SavedDesignSummary,
} from "@/lib/studio/storage";

interface StudioLeftPanelProps {
  onApplyTemplate: (template: Design) => void;
  onAddElement: (element: StudioElement) => void;
  onSetBackground: (background: BackgroundConfig) => void;
  palette?: EventPalette | null;
  eventInput?: EventInput | null;
  className?: string;
}

export default function StudioLeftPanel({
  onApplyTemplate,
  onAddElement,
  onSetBackground,
  palette,
  eventInput,
  className = "",
}: StudioLeftPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "templates" | "text" | "shapes" | "stickers" | "background"
  >("templates");

  const [savedDesigns, setSavedDesigns] = useState<SavedDesignSummary[]>(() =>
    listMyDesigns()
  );

  const templates = buildTemplates(palette, eventInput);

  const refreshMyDesigns = () => {
    setSavedDesigns(listMyDesigns());
  };

  // Helper to add new text element
  const handleAddText = (
    text: string,
    fontSize: number,
    fontFamily: string = "Instrument Serif",
    align: "left" | "center" | "right" = "center"
  ) => {
    const newEl: TextElement = {
      id: `text-${Date.now()}`,
      type: "text",
      text,
      fontFamily,
      fontSize,
      color: "#2B1B14",
      align,
      letterSpacing: 0,
      lineHeight: 1.2,
      x: 140,
      y: 400,
      w: 800,
      h: Math.round(fontSize * 1.5),
      rotation: 0,
      opacity: 1,
      locked: false,
    };
    onAddElement(newEl);
  };

  // Helper to add token element
  const handleAddToken = (tokenType: TokenType) => {
    const isQr = tokenType === "qr";
    const newEl: TokenElement = {
      id: `token-${tokenType}-${Date.now()}`,
      type: "token",
      tokenType,
      x: isQr ? 450 : 140,
      y: isQr ? 800 : 500,
      w: isQr ? 180 : 800,
      h: isQr ? 180 : 70,
      rotation: 0,
      opacity: 1,
      locked: false,
      fontFamily: isQr ? undefined : "Instrument Serif",
      fontSize: isQr ? undefined : 48,
      color: "#2B1B14",
      align: "center",
      qrPadding: isQr ? 10 : undefined,
    };
    onAddElement(newEl);
  };

  // Helper to add shape element
  const handleAddShape = (shapeType: ShapeType) => {
    const newEl: ShapeElement = {
      id: `shape-${shapeType}-${Date.now()}`,
      type: "shape",
      shapeType,
      x: 200,
      y: 300,
      w: shapeType === "line" ? 600 : shapeType === "arch" ? 600 : 400,
      h: shapeType === "line" ? 4 : shapeType === "arch" ? 700 : 400,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: shapeType === "line" ? undefined : "#FFFFFF",
      stroke: "#C9A24B",
      strokeWidth: 2,
      rx: shapeType === "rectangle" ? 16 : undefined,
    };
    onAddElement(newEl);
  };

  // Helper to add sticker element
  const handleAddSticker = (stickerType: StickerType) => {
    const newEl: StickerElement = {
      id: `sticker-${stickerType}-${Date.now()}`,
      type: "sticker",
      stickerType,
      x: 440,
      y: 350,
      w: 200,
      h: 200,
      rotation: 0,
      opacity: 1,
      locked: false,
      color: "#C9A24B",
      secondaryColor: "#E07A1F",
      seed: Math.floor(Math.random() * 1000),
    };
    onAddElement(newEl);
  };

  return (
    <div
      className={`shadow-xs flex flex-col rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] ${className}`}
      role="region"
      aria-label="Studio tools panel"
    >
      {/* Tab Navigation */}
      <div
        className="flex border-b border-[#E8DCC8] bg-[#FAF2E6]/50"
        role="tablist"
        aria-label="Toolbox categories"
      >
        {(
          [
            { id: "templates", label: "Templates", icon: "🎨" },
            { id: "text", label: "Text", icon: "🔤" },
            { id: "shapes", label: "Shapes", icon: "📐" },
            { id: "stickers", label: "Stickers", icon: "🌸" },
            { id: "background", label: "Backdrop", icon: "🖼️" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "templates") refreshMyDesigns();
            }}
            className={`flex-1 py-2.5 text-center text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-[#5B1A2B] ${
              activeTab === tab.id
                ? "border-b-2 border-[#5B1A2B] bg-[#FFFDF8] text-[#5B1A2B]"
                : "text-[#6B5848] hover:bg-white hover:text-[#2B1B14]"
            }`}
          >
            <span className="block text-sm" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 text-xs">
        {/* TAB 1: TEMPLATES */}
        {activeTab === "templates" && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
                Starter Designs
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    key: "royal-wedding",
                    title: "Royal Wedding",
                    preview: "👑 Maroon & Gold",
                  },
                  {
                    key: "floral-wedding",
                    title: "Floral Wedding",
                    preview: "🌸 Marigolds & Arch",
                  },
                  {
                    key: "modern-minimal",
                    title: "Modern Minimal",
                    preview: "✨ Clean Lines",
                  },
                  {
                    key: "playful-birthday",
                    title: "Playful Birthday",
                    preview: "🎈 Confetti & Joy",
                  },
                  {
                    key: "diwali-community",
                    title: "Diwali Community",
                    preview: "🪔 Diyas & Lanterns",
                  },
                  {
                    key: "blank",
                    title: "Blank Canvas",
                    preview: "⬜ Fresh Start",
                  },
                ].map((tmpl) => (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => onApplyTemplate(templates[tmpl.key])}
                    className="hover:shadow-xs flex flex-col items-start rounded-lg border border-[#E8DCC8] bg-white p-2.5 text-left transition-all hover:border-[#5B1A2B] focus:outline-none focus:ring-1 focus:ring-[#5B1A2B]"
                  >
                    <span className="font-semibold text-[#2B1B14]">
                      {tmpl.title}
                    </span>
                    <span className="text-[11px] text-[#6B5848]">
                      {tmpl.preview}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* My Designs Section */}
            {savedDesigns.length > 0 && (
              <div className="border-t border-[#E8DCC8] pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
                    My Designs ({savedDesigns.length}/10)
                  </h4>
                  <button
                    type="button"
                    onClick={refreshMyDesigns}
                    className="text-[11px] text-[#5B1A2B] underline"
                  >
                    Refresh
                  </button>
                </div>
                <div className="space-y-1.5">
                  {savedDesigns.map((sd) => (
                    <button
                      key={sd.id}
                      type="button"
                      onClick={() => {
                        const loaded = loadFromMyDesigns(sd.id);
                        if (loaded) onApplyTemplate(loaded);
                      }}
                      className="flex w-full items-center justify-between rounded border border-[#E8DCC8] bg-white px-2.5 py-1.5 text-left transition-colors hover:bg-[#FCEBD3]"
                    >
                      <span className="truncate font-medium text-[#2B1B14]">
                        {sd.name}
                      </span>
                      <span className="text-[10px] text-[#6B5848]">
                        {sd.elementsCount} layers
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEXT */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
                Add Text Box
              </h4>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    handleAddText("Grand Celebration", 72, "Instrument Serif")
                  }
                  className="flex w-full items-center justify-between rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-left hover:border-[#5B1A2B]"
                >
                  <span className="font-serif text-lg text-[#2B1B14]">
                    Add Heading
                  </span>
                  <span className="text-[11px] text-[#6B5848]">72px Serif</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAddText(
                      "Saturday, December 12",
                      36,
                      "DM Serif Display"
                    )
                  }
                  className="flex w-full items-center justify-between rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-left hover:border-[#5B1A2B]"
                >
                  <span className="text-sm font-semibold text-[#2B1B14]">
                    Add Subheading
                  </span>
                  <span className="text-[11px] text-[#6B5848]">36px</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAddText(
                      "Request the honour of your presence to celebrate with us.",
                      20,
                      "Hanken Grotesk"
                    )
                  }
                  className="flex w-full items-center justify-between rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-left hover:border-[#5B1A2B]"
                >
                  <span className="text-xs text-[#2B1B14]">
                    Add Body Paragraph
                  </span>
                  <span className="text-[11px] text-[#6B5848]">20px Sans</span>
                </button>
              </div>
            </div>

            {/* Smart Placeholders / Tokens */}
            <div className="border-t border-[#E8DCC8] pt-3">
              <h4 className="mb-1 font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
                Plan Tokens (Filled per guest)
              </h4>
              <p className="mb-2 text-[11px] text-[#6B5848]">
                These placeholders update automatically when exporting cards for
                guests.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  {
                    token: "guestName" as TokenType,
                    label: "Guest Name",
                    icon: "👤",
                  },
                  {
                    token: "qr" as TokenType,
                    label: "RSVP QR Code",
                    icon: "📱",
                  },
                  {
                    token: "hostNames" as TokenType,
                    label: "Host Names",
                    icon: "👥",
                  },
                  {
                    token: "eventTitle" as TokenType,
                    label: "Event Title",
                    icon: "🎉",
                  },
                  {
                    token: "date" as TokenType,
                    label: "Event Date",
                    icon: "📅",
                  },
                  { token: "venue" as TokenType, label: "Venue", icon: "🏛️" },
                  { token: "city" as TokenType, label: "City", icon: "📍" },
                ].map((item) => (
                  <button
                    key={item.token}
                    type="button"
                    onClick={() => handleAddToken(item.token)}
                    className="flex items-center gap-1.5 rounded border border-[#E8DCC8] bg-white px-2 py-1.5 text-left text-[11px] font-medium text-[#2B1B14] hover:bg-[#FCEBD3]"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SHAPES */}
        {activeTab === "shapes" && (
          <div className="space-y-4">
            <h4 className="font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
              Geometric Shapes & Frames
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAddShape("rectangle")}
                className="flex flex-col items-center justify-center rounded-lg border border-[#E8DCC8] bg-white p-3 hover:border-[#5B1A2B]"
              >
                <div className="mb-1 h-8 w-12 rounded border-2 border-[#C9A24B]" />
                <span className="font-medium text-[#2B1B14]">
                  Rectangle / Card
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAddShape("arch")}
                className="flex flex-col items-center justify-center rounded-lg border border-[#E8DCC8] bg-white p-3 hover:border-[#5B1A2B]"
              >
                <div className="mb-1 h-10 w-8 rounded-t-full border-2 border-[#C9A24B]" />
                <span className="font-medium text-[#2B1B14]">
                  Arch / Vellum
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAddShape("circle")}
                className="flex flex-col items-center justify-center rounded-lg border border-[#E8DCC8] bg-white p-3 hover:border-[#5B1A2B]"
              >
                <div className="mb-1 h-9 w-9 rounded-full border-2 border-[#C9A24B]" />
                <span className="font-medium text-[#2B1B14]">
                  Circle / Badge
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAddShape("line")}
                className="flex flex-col items-center justify-center rounded-lg border border-[#E8DCC8] bg-white p-3 hover:border-[#5B1A2B]"
              >
                <div className="my-4 h-0.5 w-12 bg-[#C9A24B]" />
                <span className="font-medium text-[#2B1B14]">Divider Line</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: STICKERS */}
        {activeTab === "stickers" && (
          <div className="space-y-4">
            <h4 className="font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
              Botanicals & Cultural Motifs
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  type: "marigold" as StickerType,
                  label: "Marigold",
                  icon: "🌼",
                },
                {
                  type: "jasmine" as StickerType,
                  label: "Jasmine",
                  icon: "🌸",
                },
                { type: "rose" as StickerType, label: "Rose", icon: "🌹" },
                {
                  type: "diya" as StickerType,
                  label: "Diya Flame",
                  icon: "🪔",
                },
                {
                  type: "lantern" as StickerType,
                  label: "Lantern",
                  icon: "🏮",
                },
                {
                  type: "balloon" as StickerType,
                  label: "Balloon",
                  icon: "🎈",
                },
                {
                  type: "confetti" as StickerType,
                  label: "Confetti",
                  icon: "🎉",
                },
                {
                  type: "mandala" as StickerType,
                  label: "Mandala",
                  icon: "☸️",
                },
                {
                  type: "paisley" as StickerType,
                  label: "Paisley",
                  icon: "🍃",
                },
                {
                  type: "frame" as StickerType,
                  label: "Border Frame",
                  icon: "🖼️",
                },
              ].map((stk) => (
                <button
                  key={stk.type}
                  type="button"
                  onClick={() => handleAddSticker(stk.type)}
                  className="flex items-center gap-2 rounded-lg border border-[#E8DCC8] bg-white p-2.5 text-left transition-colors hover:bg-[#FCEBD3]"
                >
                  <span className="text-xl" aria-hidden="true">
                    {stk.icon}
                  </span>
                  <span className="font-medium text-[#2B1B14]">
                    {stk.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: BACKGROUND */}
        {activeTab === "background" && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
                Solid Colors
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { color: "#FFFDF8", label: "Ivory" },
                  { color: "#3A0F1C", label: "Deep Maroon" },
                  { color: "#24100E", label: "Espresso" },
                  { color: "#F8EFE4", label: "Warm Sand" },
                  { color: "#1B3B30", label: "Emerald" },
                  { color: "#182A4A", label: "Midnight Blue" },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() =>
                      onSetBackground({ type: "solid", color: c.color })
                    }
                    className="flex items-center gap-1.5 rounded-full border border-[#E8DCC8] bg-white px-2.5 py-1 text-xs text-[#2B1B14] hover:border-[#5B1A2B]"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E8DCC8] pt-3">
              <h4 className="mb-2 font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
                Gradients
              </h4>
              <div className="space-y-1.5">
                {[
                  {
                    from: "#FFFDF8",
                    to: "#F2E2CE",
                    label: "Ivory to Soft Saffron",
                  },
                  {
                    from: "#4A0E17",
                    to: "#1A0307",
                    label: "Royal Maroon Vignette",
                  },
                  { from: "#2B1B14", to: "#0F0605", label: "Espresso Night" },
                  { from: "#FFFDF8", to: "#E0EFF5", label: "Porcelain Dawn" },
                ].map((g) => (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() =>
                      onSetBackground({
                        type: "gradient",
                        gradient: {
                          from: g.from,
                          to: g.to,
                          direction: "vertical",
                        },
                      })
                    }
                    className="flex w-full items-center gap-2 rounded-lg border border-[#E8DCC8] bg-white p-2 text-left hover:border-[#5B1A2B]"
                  >
                    <div
                      className="h-6 w-12 rounded border border-black/10"
                      style={{
                        background: `linear-gradient(to right, ${g.from}, ${g.to})`,
                      }}
                    />
                    <span className="font-medium text-[#2B1B14]">
                      {g.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E8DCC8] pt-3">
              <h4 className="mb-2 font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
                Procedural Patterns
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { pattern: "rangoli-dots", label: "Rangoli Dots" },
                  { pattern: "damask", label: "Damask Trellis" },
                  { pattern: "confetti", label: "Confetti" },
                  { pattern: "none", label: "None" },
                ].map((p) => (
                  <button
                    key={p.pattern}
                    type="button"
                    onClick={() =>
                      onSetBackground({
                        type: "pattern",
                        color: "#FFFDF8",
                        pattern: p.pattern as BackgroundConfig["pattern"],
                        patternColor: "#C9A24B",
                        patternScale: 1,
                      })
                    }
                    className="rounded border border-[#E8DCC8] bg-white p-2 text-center font-medium text-[#2B1B14] hover:bg-[#FCEBD3]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
