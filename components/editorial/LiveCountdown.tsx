"use client";

import { useState, useEffect, memo } from "react";
import { calculateCountdown, type CountdownResult } from "@/lib/countdown";
import SectionLabel from "./SectionLabel";

interface LiveCountdownProps {
  eventDate: string;
  className?: string;
}

function LiveCountdownComponent({
  eventDate,
  className = "",
}: LiveCountdownProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Update once per minute (60,000 ms), not every second
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const countdown: CountdownResult = calculateCountdown(eventDate, now);

  return (
    <section
      aria-label="Event countdown"
      className={`rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 sm:p-8 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DCC8] pb-4">
        <div>
          <SectionLabel label="Live countdown" />
          <h2 className="mt-1 font-serif text-2xl font-normal tracking-tight text-[#2B1B14] sm:text-3xl">
            Countdown to the <span className="italic">celebration</span>
          </h2>
        </div>
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2 rounded-full border border-[#E8DCC8] bg-[#FBF6EE] px-3.5 py-1 text-xs font-medium text-[#2B1B14]"
        >
          <span
            className="h-2 w-2 rounded-full bg-[#5B1A2B] motion-safe:animate-pulse"
            aria-hidden="true"
          />
          <span>Updates every minute</span>
        </div>
      </div>

      <div className="mt-6">
        {countdown.status === "today" && (
          <div className="flex items-center gap-3 py-2">
            <span className="text-3xl" aria-hidden="true">
              🎉
            </span>
            <div className="font-serif text-3xl font-normal text-[#2B1B14] sm:text-5xl">
              Today is the <span className="italic">day</span>
            </div>
          </div>
        )}

        {countdown.status === "passed" && (
          <div className="py-2">
            <div className="font-serif text-2xl font-normal text-[#6B5848] sm:text-4xl">
              This event has <span className="italic">passed</span>
            </div>
            <p className="mt-2 text-xs text-[#6B5848]">
              Review past milestones, budgets, and memories from your
              celebration archive.
            </p>
          </div>
        )}

        {countdown.status === "future" && (
          <div
            className="flex flex-wrap items-baseline gap-4 font-serif text-[#2B1B14] sm:gap-8"
            aria-label={countdown.displayText}
          >
            {/* Days */}
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-normal tracking-tight sm:text-7xl">
                {countdown.days}
              </span>
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
                {countdown.days === 1 ? "day" : "days"}
              </span>
            </div>

            <span
              className="hidden font-serif text-3xl font-light text-[#E8DCC8] sm:inline"
              aria-hidden="true"
            >
              ·
            </span>

            {/* Hours */}
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-normal tracking-tight sm:text-7xl">
                {countdown.hours}
              </span>
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
                {countdown.hours === 1 ? "hour" : "hours"}
              </span>
            </div>

            <span
              className="hidden font-serif text-3xl font-light text-[#E8DCC8] sm:inline"
              aria-hidden="true"
            >
              ·
            </span>

            {/* Minutes */}
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-normal tracking-tight sm:text-7xl">
                {countdown.minutes}
              </span>
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#5A5A5A]">
                {countdown.minutes === 1 ? "min" : "minutes"}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const LiveCountdown = memo(LiveCountdownComponent);
export default LiveCountdown;
