"use client";

import { useState, useEffect } from "react";
import { computeScrambledText } from "@/lib/editorial";

interface ScrambleTextProps {
  targetText?: string;
  durationMs?: number;
  className?: string;
}

export default function ScrambleText({
  targetText = "Event planning, made easy",
  durationMs = 1200,
  className = "",
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState(targetText);
  const [, setIsResolved] = useState(false);

  useEffect(() => {
    // Check reduced motion
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (reduced) {
      setDisplayText(targetText);
      setIsResolved(true);
      return;
    }

    const startTime = performance.now();
    let rafId: number | null = null;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      setDisplayText(computeScrambledText(targetText, progress));

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplayText(targetText);
        setIsResolved(true);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [targetText, durationMs]);

  return (
    <div
      role="text"
      aria-label={targetText}
      className={`font-sans text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A] ${className}`}
    >
      <span aria-hidden="true">{displayText}</span>
    </div>
  );
}
