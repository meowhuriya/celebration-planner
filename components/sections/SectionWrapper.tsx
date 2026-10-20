"use client";

import type { ReactNode } from "react";
import type { PlanSection } from "@/lib/schemas";
import SectionLabel from "../editorial/SectionLabel";

interface SectionWrapperProps {
  id?: string;
  title: string;
  emoji?: string;
  section?: PlanSection;
  onRegenerate?: (section: PlanSection) => void;
  isRegenerating?: boolean;
  children: ReactNode;
}

const SECTION_LABELS: Record<string, string> = {
  budget: "Budget",
  timeline: "Timeline",
  vendorChecklist: "Vendors",
  ideas: "Ideas",
  runSheet: "Day-of schedule",
};

export default function SectionWrapper({
  id,
  title,
  section,
  onRegenerate,
  isRegenerating = false,
  children,
}: SectionWrapperProps) {
  const containerId =
    id ?? (section ? `section-${section}-container` : undefined);
  const headingId = section
    ? `section-${section}`
    : id
      ? `heading-${id}`
      : undefined;
  const labelText =
    section && SECTION_LABELS[section] ? SECTION_LABELS[section] : title;

  return (
    <section
      id={containerId}
      className="scroll-mt-28 rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 transition-all duration-300 sm:scroll-mt-32 sm:p-8"
      aria-labelledby={headingId}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DCC8] pb-4">
        <div>
          <SectionLabel label={labelText} />
          <h3
            id={headingId}
            className="mt-1 font-serif text-2xl font-normal tracking-tight text-[#2B1B14] sm:text-3xl"
          >
            {title}
          </h3>
          <div
            className="mt-2.5 h-0.5 w-10 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--palette-1, #5B1A2B), var(--palette-2, #E07A1F))",
            }}
            aria-hidden="true"
          />
        </div>
        {section && onRegenerate && (
          <button
            onClick={() => onRegenerate(section)}
            disabled={isRegenerating}
            className="rounded-full border border-[#E8DCC8] bg-[#FBF6EE] px-4 py-2 text-xs font-semibold text-[#2B1B14] transition-all hover:border-[#5B1A2B] hover:bg-[#5B1A2B] hover:text-[#FBF6EE] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 print:hidden"
            aria-label={`Regenerate ${title}`}
          >
            {isRegenerating ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#E8DCC8] border-t-[#5B1A2B] motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Regenerating…
              </span>
            ) : (
              "Regenerate ↻"
            )}
          </button>
        )}
      </div>

      <div>
        {isRegenerating ? (
          <div className="py-12 text-center" role="status" aria-live="polite">
            <span
              className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#E8DCC8] border-t-[#5B1A2B] motion-reduce:animate-none"
              aria-hidden="true"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848]">
              Updating {labelText.toLowerCase()}…
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
