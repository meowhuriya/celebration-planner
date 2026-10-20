"use client";

import { memo } from "react";
import TiltCard from "../editorial/TiltCard";
import SectionLabel from "../editorial/SectionLabel";
import type { EventPlan, EventInput } from "@/lib/schemas";

interface BackupPlanSectionProps {
  plan: EventPlan;
  eventInput: EventInput;
  errorMessage?: string;
  onRetry?: () => void;
}

function BackupPlanSectionComponent({
  plan,
  errorMessage,
  onRetry,
}: BackupPlanSectionProps) {
  const isFallbackActive = Boolean(plan.isFallback || errorMessage);

  return (
    <section
      id="backup-plan"
      className="scroll-mt-28 rounded-2xl border border-[#D9D9D9] bg-[#F7F7F7] p-6 transition-all duration-300 sm:scroll-mt-32 sm:p-8"
      aria-labelledby="heading-backup-plan"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D9D9] pb-4">
        <div>
          <SectionLabel label="Backup plan" />
          <h3
            id="heading-backup-plan"
            className="mt-1 font-serif text-2xl font-normal tracking-tight text-[#111111] sm:text-3xl"
          >
            Backup <span className="italic">plan</span>
          </h3>
          <div
            className="mt-2.5 h-0.5 w-10 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--palette-1, #111111), var(--palette-2, #888888))",
            }}
            aria-hidden="true"
          />
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
          Contingency protocols
        </span>
      </div>

      <div className="space-y-6">
        {/* If fallback or error is active, show the starter plan banner with retry button */}
        {isFallbackActive && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-[#111111] bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
                  Active safety net
                </span>
                <h4 className="mt-1 font-serif text-xl font-normal text-[#111111]">
                  Built-in starter <span className="italic">template</span>
                </h4>
                <p className="mt-1 max-w-2xl text-xs text-[#5A5A5A]">
                  {errorMessage
                    ? `We loaded a starter plan because the live service returned: "${errorMessage}". You can customize everything below, or try generating again.`
                    : "We created this starter plan from your details while the live connection was taking longer than expected. You can customize everything below, or try generating again."}
                </p>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-full bg-[#111111] px-5 py-2.5 text-xs font-semibold text-[#F7F7F7] transition-all hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#111111]"
                >
                  Try again ↻
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3 Core Contingency Cards */}
        <div className="grid gap-5 sm:grid-cols-3">
          {/* Weather Contingency */}
          <TiltCard
            className="flex flex-col rounded-2xl border border-[#D9D9D9] bg-white p-5"
            style={{ borderTop: "3px solid var(--palette-1, #111111)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]">
                Weather contingency
              </h4>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--palette-1, #111111)" }}
                aria-hidden="true"
              />
            </div>
            <p className="text-xs leading-relaxed text-[#5A5A5A]">
              Indoor transition protocol on standby 48 hours prior. Rain
              marquees and air circulation units pre-reserved with venue
              management.
            </p>
            <div className="mt-4 border-t border-[#D9D9D9] pt-3 text-[11px] font-medium text-[#111111]">
              ✓ Indoor backup hall locked
            </div>
          </TiltCard>

          {/* Technical & Power */}
          <TiltCard
            className="flex flex-col rounded-2xl border border-[#D9D9D9] bg-white p-5"
            style={{ borderTop: "3px solid var(--palette-2, #800020)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]">
                Technical &amp; power
              </h4>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--palette-2, #800020)" }}
                aria-hidden="true"
              />
            </div>
            <p className="text-xs leading-relaxed text-[#5A5A5A]">
              Dedicated auxiliary generator on site for sound stage and
              catering. Battery-powered backup microphones and offline music
              playlists ready.
            </p>
            <div className="mt-4 border-t border-[#D9D9D9] pt-3 text-[11px] font-medium text-[#111111]">
              ✓ Dual power supply verified
            </div>
          </TiltCard>

          {/* Vendor Buffer Protocol */}
          <TiltCard
            className="flex flex-col rounded-2xl border border-[#D9D9D9] bg-white p-5"
            style={{ borderTop: "3px solid var(--palette-3, #D4AF37)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]">
                Timeline buffer
              </h4>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--palette-3, #D4AF37)" }}
                aria-hidden="true"
              />
            </div>
            <p className="text-xs leading-relaxed text-[#5A5A5A]">
              30-minute flex buffer between ceremony and dinner service.
              Secondary standby caterer and photographer contact sheet held by
              event lead.
            </p>
            <div className="mt-4 border-t border-[#D9D9D9] pt-3 text-[11px] font-medium text-[#111111]">
              ✓ Contact sheet shared with host
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}

const BackupPlanSection = memo(BackupPlanSectionComponent);
export default BackupPlanSection;
