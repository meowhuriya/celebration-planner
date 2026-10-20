"use client";

import { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  "Setting your budget",
  "Building your timeline",
  "Finding the right vendors",
  "Gathering creative ideas",
  "Adding the finishing touches",
];

interface LoadingStateProps {
  onCancel?: () => void;
}

export default function LoadingState({ onCancel }: LoadingStateProps) {
  const [index, setIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const statusInterval = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2400);

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(timerInterval);
    };
  }, []);

  return (
    <div
      className="mx-auto max-w-lg rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-8 text-center sm:p-12"
      role="status"
      aria-live="polite"
    >
      {/* Quiet, calm spinner */}
      <div className="mx-auto mb-6 flex items-center justify-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-[#E8DCC8] border-t-[#5B1A2B] motion-reduce:animate-none"
            aria-hidden="true"
            style={{ animationDuration: "1.2s" }}
          />
          <span
            className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#5B1A2B] motion-reduce:animate-none"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848]">
          Please wait a moment
        </p>
        <h2 className="font-serif text-3xl font-normal tracking-tight text-[#2B1B14] sm:text-4xl">
          Planning your <span className="italic">celebration</span>
        </h2>
        <p className="text-sm font-medium text-[#2B1B14]">
          {STATUS_MESSAGES[index]}…
        </p>
        <p className="mx-auto max-w-sm text-sm text-[#6B5848]">
          Creating your budget breakdown, timeline, vendor guide, and day-of
          schedule.
        </p>

        {/* Elapsed seconds counter */}
        <div
          className="pt-2 text-xs text-[#6B5848]"
          aria-label={`Elapsed time: ${elapsedSeconds} seconds`}
        >
          <span>{elapsedSeconds}s elapsed</span>
        </div>
      </div>

      {/* Cancel button */}
      {onCancel && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-full border border-[#E8DCC8] bg-[#FBF6EE] px-5 py-2 text-sm font-medium text-[#2B1B14] transition-all hover:border-[#5B1A2B] hover:bg-[#5B1A2B] hover:text-[#FBF6EE] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
