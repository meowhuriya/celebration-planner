"use client";

import { memo } from "react";
import type { Ideas, EventPalette } from "@/lib/schemas";
import TiltCard from "../editorial/TiltCard";
import { getReadableTextColor } from "@/lib/palette";

interface IdeasSectionProps {
  ideas: Ideas;
  palette?: EventPalette;
  guestCount?: number;
  eventType?: string;
}

function IdeasSectionComponent({ ideas, palette }: IdeasSectionProps) {
  const colors = palette?.colors ?? [
    "#D4AF37",
    "#800020",
    "#2E7D32",
    "#FAF9F6",
  ];
  const paletteName = palette?.name ?? "Festive Celebration";

  return (
    <div className="space-y-6">
      {/* Event Palette Showcase */}
      <TiltCard className="rounded-2xl border border-[#D9D9D9] bg-white p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9D9D9] pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5A5A5A]">
              Color harmony
            </span>
            <h4 className="mt-1 font-serif text-xl font-normal text-[#111111] sm:text-2xl">
              {paletteName} <span className="italic">palette</span>
            </h4>
          </div>
          <span className="text-xs text-[#5A5A5A]">
            Curated 4-color festival harmony
          </span>
        </div>

        {/* 4 Swatches */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colors.map((hex, idx) => {
            const textColor = getReadableTextColor(hex);
            return (
              <div
                key={idx}
                className="shadow-2xs flex flex-col justify-between rounded-xl border border-black/10 p-3.5 transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: hex }}
              >
                <span
                  className="font-mono text-xs font-semibold uppercase tracking-wider"
                  style={{ color: textColor }}
                >
                  {hex}
                </span>
                <span
                  className="mt-6 text-[11px] font-medium"
                  style={{ color: textColor, opacity: 0.85 }}
                >
                  Color 0{idx + 1}
                </span>
              </div>
            );
          })}
        </div>
      </TiltCard>

      {/* Theme Card */}
      <TiltCard
        className="rounded-2xl border border-[#D9D9D9] bg-white p-6 sm:p-7"
        style={{
          borderTop: "3px solid var(--palette-1, #111111)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
            Theme &amp; atmosphere
          </span>
          <span
            className="inline-flex rounded-full px-3 py-0.5 text-xs font-medium"
            style={{
              background: "var(--palette-1, #111111)",
              color: "var(--palette-text-1, #FFFFFF)",
            }}
          >
            Signature vibe
          </span>
        </div>
        <p className="mt-3 font-serif text-2xl font-normal text-[#111111] sm:text-3xl">
          {ideas.theme}
        </p>
      </TiltCard>

      {/* Cultural Notes */}
      {ideas.culturalNotes && (
        <TiltCard
          className="rounded-2xl border border-[#D9D9D9] bg-[#F7F7F7] p-6"
          style={{
            borderLeft: "4px solid var(--palette-2, #800020)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
              Traditions &amp; heritage
            </span>
            <span
              className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{
                background: "var(--palette-2, #800020)",
                color: "var(--palette-text-2, #FFFFFF)",
              }}
            >
              Cultural touch
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#5A5A5A]">
            {ideas.culturalNotes}
          </p>
        </TiltCard>
      )}

      {/* Bento 3-column / grid for Decor, Food, Activities */}
      <div className="grid gap-5 sm:grid-cols-3">
        {/* Decor */}
        <TiltCard
          className="flex flex-col rounded-2xl border border-[#D9D9D9] bg-white p-5"
          style={{ borderTop: "3px solid var(--palette-1, #111111)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]">
              Decor ideas
            </h4>
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--palette-1, #111111)" }}
              aria-hidden="true"
            />
          </div>
          <ul className="space-y-2.5">
            {ideas.decor.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border border-[#D9D9D9] bg-[#F7F7F7] p-3 text-xs leading-relaxed text-[#111111]"
              >
                {item}
              </li>
            ))}
          </ul>
        </TiltCard>

        {/* Food */}
        <TiltCard
          className="flex flex-col rounded-2xl border border-[#D9D9D9] bg-white p-5"
          style={{ borderTop: "3px solid var(--palette-2, #800020)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]">
              Food &amp; drinks
            </h4>
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--palette-2, #800020)" }}
              aria-hidden="true"
            />
          </div>
          <ul className="space-y-2.5">
            {ideas.food.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border border-[#D9D9D9] bg-[#F7F7F7] p-3 text-xs leading-relaxed text-[#111111]"
              >
                {item}
              </li>
            ))}
          </ul>
        </TiltCard>

        {/* Activities */}
        <TiltCard
          className="flex flex-col rounded-2xl border border-[#D9D9D9] bg-white p-5"
          style={{ borderTop: "3px solid var(--palette-3, #D4AF37)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]">
              Activities &amp; experiences
            </h4>
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--palette-3, #D4AF37)" }}
              aria-hidden="true"
            />
          </div>
          <ul className="space-y-2.5">
            {ideas.activities.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border border-[#D9D9D9] bg-[#F7F7F7] p-3 text-xs leading-relaxed text-[#111111]"
              >
                {item}
              </li>
            ))}
          </ul>
        </TiltCard>
      </div>
    </div>
  );
}

const IdeasSection = memo(IdeasSectionComponent);
export default IdeasSection;
