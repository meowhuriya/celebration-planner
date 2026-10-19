"use client";

import { useEffect, useState } from "react";
import { getReadinessStatus } from "@/lib/editorial";

interface ReadinessScoreProps {
  score: number;
  className?: string;
}

export default function ReadinessScore({
  score,
  className = "",
}: ReadinessScoreProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (reduced) {
      setCurrent(score);
      return;
    }

    const start = 0;
    const duration = 850; // ms
    const startTime = performance.now();
    let rafId: number | null = null;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + (score - start) * eased));

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [score]);

  const statusLabel = getReadinessStatus(current);

  return (
    <div
      role="region"
      aria-label={`Event readiness score: ${score}% - ${statusLabel}`}
      className={`rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 sm:p-7 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-[#E8DCC8] pb-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848]">
          Planning progress
        </span>
        <span className="text-xs font-medium text-[#6B5848]">
          {statusLabel}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-serif text-6xl font-normal tracking-tight text-[#2B1B14] sm:text-7xl">
          {current}%
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848]">
          complete · {statusLabel}
        </span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full border border-[#E8DCC8] bg-[#E8DCC8]/40">
        <div
          className="h-full bg-[#5B1A2B] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${current}%` }}
        />
      </div>
    </div>
  );
}
