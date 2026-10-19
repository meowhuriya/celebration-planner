"use client";

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import type { RunSheetItem } from "@/lib/schemas";
import {
  getNowAndNext,
  parseTimeToMinutes,
  formatMinutesToTime,
} from "@/lib/run-sheet";

interface PlayTheDayProps {
  runSheet: RunSheetItem[];
  className?: string;
  onActiveItemChange?: (activeItem: RunSheetItem | null) => void;
}

function PlayTheDayComponent({
  runSheet,
  className = "",
  onActiveItemChange,
}: PlayTheDayProps) {
  // Sort and extract time bounds
  const parsedItems = useMemo(() => {
    if (!runSheet || runSheet.length === 0) return [];
    return runSheet
      .map((item) => ({
        item,
        minutes: parseTimeToMinutes(item.time),
      }))
      .sort((a, b) => a.minutes - b.minutes);
  }, [runSheet]);

  const firstMinutes = parsedItems[0]?.minutes ?? 480; // 08:00 AM fallback
  const lastMinutes = parsedItems[parsedItems.length - 1]?.minutes ?? 1380; // 11:00 PM fallback

  const [currentTimeMinutes, setCurrentTimeMinutes] =
    useState<number>(firstMinutes);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check user preference for reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const listener = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  // Compute NOW and NEXT state
  const state = useMemo(
    () => getNowAndNext(runSheet, currentTimeMinutes),
    [runSheet, currentTimeMinutes]
  );

  // Notify parent component of active item for row highlight
  useEffect(() => {
    onActiveItemChange?.(state.now);
  }, [state.now, onActiveItemChange]);

  // Handle Play/Pause playback timer (1 second real time = 5 minutes schedule time)
  useEffect(() => {
    if (isPlaying && !prefersReducedMotion) {
      playTimerRef.current = setInterval(() => {
        setCurrentTimeMinutes((prev) => {
          const next = prev + 5;
          if (next >= lastMinutes) {
            setIsPlaying(false);
            return lastMinutes;
          }
          return next;
        });
      }, 1000);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, lastMinutes, prefersReducedMotion]);

  const togglePlay = useCallback(() => {
    if (prefersReducedMotion) {
      // Reduced motion: Do not autoplay
      return;
    }

    if (currentTimeMinutes >= lastMinutes) {
      setCurrentTimeMinutes(firstMinutes);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentTimeMinutes, lastMinutes, firstMinutes, prefersReducedMotion]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTimeMinutes(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Left/Right arrow jumps to previous/next schedule item if Alt or Shift is held
    if (e.key === "ArrowRight" && (e.shiftKey || e.altKey)) {
      e.preventDefault();
      const nextStep = parsedItems.find((p) => p.minutes > currentTimeMinutes);
      if (nextStep) setCurrentTimeMinutes(nextStep.minutes);
    } else if (e.key === "ArrowLeft" && (e.shiftKey || e.altKey)) {
      e.preventDefault();
      const prevStep = [...parsedItems]
        .reverse()
        .find((p) => p.minutes < currentTimeMinutes);
      if (prevStep) setCurrentTimeMinutes(prevStep.minutes);
    }
  };

  const ariaValueText = `${state.currentTimeFormatted}, ${
    state.now ? state.now.activity : "Day preparation"
  }`;

  return (
    <div
      className={`shadow-xs rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-5 sm:p-7 ${className}`}
      aria-label="Play the day schedule player"
    >
      {/* Header controls: Title + Play/Pause */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DCC8] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--palette-1, #5B1A2B)" }}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
              Play the day
            </span>
          </div>
          <h3 className="mt-1 font-serif text-xl font-normal text-[#2B1B14] sm:text-2xl">
            Day-of schedule <span className="italic">scrubber</span>
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={prefersReducedMotion}
            aria-label={
              prefersReducedMotion
                ? "Autoplay disabled (prefers reduced motion)"
                : isPlaying
                  ? "Pause schedule playback"
                  : "Play schedule playback (1 sec = 5 mins)"
            }
            className="inline-flex items-center gap-2 rounded-full border border-[#5B1A2B] bg-[#5B1A2B] px-4 py-1.5 text-xs font-semibold text-[#FBF6EE] transition-all hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] disabled:cursor-not-allowed disabled:border-[#E8DCC8] disabled:bg-[#FBF6EE] disabled:text-[#6B5848]"
          >
            <span aria-hidden="true">{isPlaying ? "⏸" : "▶"}</span>
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <span className="rounded-full border border-[#E8DCC8] bg-[#FBF6EE] px-3 py-1 font-mono text-xs font-medium text-[#2B1B14]">
            {state.currentTimeFormatted}
          </span>
        </div>
      </div>

      {/* Screen reader live announcement for NOW change */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {state.now
          ? `Current activity at ${state.currentTimeFormatted}: ${state.now.activity}, owner ${state.now.owner}.`
          : `At ${state.currentTimeFormatted}: Before scheduled event start.`}
      </div>

      {/* BIG NOW / NEXT STRIP */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* NOW CARD */}
        <div
          className="p-4.5 rounded-xl border border-[#E8DCC8] transition-all duration-200"
          style={{
            background:
              "linear-gradient(135deg, rgba(251,246,238,0.9) 0%, rgba(255,253,248,1) 100%)",
            borderLeft: "4px solid var(--palette-1, #5B1A2B)",
          }}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className="rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{
                background: "var(--palette-1, #5B1A2B)",
                color: "var(--palette-text-1, #FFFFFF)",
              }}
            >
              Now
            </span>
            <span className="font-mono text-xs text-[#6B5848]">
              {state.now?.time ?? formatMinutesToTime(firstMinutes)}
            </span>
          </div>
          <div className="mt-2.5">
            <h4 className="font-serif text-lg font-normal text-[#2B1B14] sm:text-xl">
              {state.now?.activity ?? "Preparation & pre-event reception"}
            </h4>
            <p className="mt-1 text-xs text-[#6B5848]">
              <span className="font-semibold text-[#2B1B14]">Lead:</span>{" "}
              {state.now?.owner ?? "Event Coordinator"}
            </p>
            {state.now?.notes && (
              <p className="mt-1 text-xs italic text-[#6B5848]">
                &ldquo;{state.now.notes}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* NEXT CARD */}
        <div
          className="p-4.5 rounded-xl border border-[#E8DCC8] bg-[#FBF6EE] transition-all duration-200"
          style={{
            borderLeft: "4px solid var(--palette-2, #E07A1F)",
          }}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  background: "var(--palette-2, #E07A1F)",
                  color: "var(--palette-text-2, #FFFFFF)",
                }}
              >
                Next
              </span>
              {state.minutesUntilNext !== null && (
                <span className="text-[11px] font-medium text-[#6B5848]">
                  in {state.minutesUntilNext}{" "}
                  {state.minutesUntilNext === 1 ? "min" : "mins"}
                </span>
              )}
            </div>
            <span className="font-mono text-xs text-[#6B5848]">
              {state.next?.time ?? "Day concludes"}
            </span>
          </div>
          <div className="mt-2.5">
            <h4 className="font-serif text-lg font-normal text-[#2B1B14] sm:text-xl">
              {state.next?.activity ?? "Grand finale and guest farewell"}
            </h4>
            <p className="mt-1 text-xs text-[#6B5848]">
              <span className="font-semibold text-[#2B1B14]">Lead:</span>{" "}
              {state.next?.owner ?? "Host Family & Vendors"}
            </p>
            {state.next?.notes && (
              <p className="mt-1 text-xs italic text-[#6B5848]">
                &ldquo;{state.next.notes}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SCRUBBER SLIDER */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#6B5848]">
          <span>{formatMinutesToTime(firstMinutes)}</span>
          <span className="font-medium text-[#2B1B14]">
            Scrub through the celebration
          </span>
          <span>{formatMinutesToTime(lastMinutes)}</span>
        </div>

        <input
          type="range"
          min={firstMinutes}
          max={lastMinutes}
          step={5}
          value={currentTimeMinutes}
          onChange={handleSliderChange}
          onKeyDown={handleKeyDown}
          aria-label="Day-of schedule timeline scrubber"
          aria-valuemin={firstMinutes}
          aria-valuemax={lastMinutes}
          aria-valuenow={currentTimeMinutes}
          aria-valuetext={ariaValueText}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E8DCC8] accent-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
        />

        {/* THIN PROGRESS LINE BELOW */}
        <div
          className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E8DCC8]/50"
          role="progressbar"
          aria-valuenow={Math.round(state.progressPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Position in celebration day"
        >
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${state.progressPercent}%`,
              background:
                "linear-gradient(90deg, var(--palette-1, #5B1A2B), var(--palette-2, #E07A1F))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

const PlayTheDay = memo(PlayTheDayComponent);
export default PlayTheDay;
