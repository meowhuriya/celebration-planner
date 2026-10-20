"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { EventInput } from "@/lib/schemas";
import { formatINR } from "@/lib/utils";
import SectionLabel from "./editorial/SectionLabel";

interface WhatIfSlidersProps {
  eventInput: EventInput;
  onBudgetChange: (newBudget: number) => void;
  onGuestCountChange: (newGuestCount: number) => void;
}

export default function WhatIfSliders({
  eventInput,
  onBudgetChange,
  onGuestCountChange,
}: WhatIfSlidersProps) {
  const [budgetValue, setBudgetValue] = useState(eventInput.totalBudget);
  const [guestValue, setGuestValue] = useState(eventInput.guestCount);

  useEffect(() => {
    setBudgetValue(eventInput.totalBudget);
  }, [eventInput.totalBudget]);

  useEffect(() => {
    setGuestValue(eventInput.guestCount);
  }, [eventInput.guestCount]);

  const budgetDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const budgetMin = Math.max(1000, Math.floor(eventInput.totalBudget * 0.25));
  const budgetMax = Math.ceil(eventInput.totalBudget * 3);
  const guestMin = Math.max(1, Math.floor(eventInput.guestCount * 0.25));
  const guestMax = Math.min(10000, Math.ceil(eventInput.guestCount * 3));

  const budgetStep = useMemo(() => {
    if (eventInput.totalBudget > 1000000) return 50000;
    if (eventInput.totalBudget > 100000) return 10000;
    return 1000;
  }, [eventInput.totalBudget]);

  const handleBudgetChange = useCallback(
    (value: number) => {
      setBudgetValue(value);
      if (budgetDebounceRef.current) clearTimeout(budgetDebounceRef.current);
      budgetDebounceRef.current = setTimeout(() => {
        onBudgetChange(value);
      }, 50);
    },
    [onBudgetChange]
  );

  const handleGuestChange = useCallback(
    (value: number) => {
      setGuestValue(value);
      if (guestDebounceRef.current) clearTimeout(guestDebounceRef.current);
      guestDebounceRef.current = setTimeout(() => {
        onGuestCountChange(value);
      }, 50);
    },
    [onGuestCountChange]
  );

  useEffect(() => {
    return () => {
      if (budgetDebounceRef.current) clearTimeout(budgetDebounceRef.current);
      if (guestDebounceRef.current) clearTimeout(guestDebounceRef.current);
    };
  }, []);

  const budgetDiff = budgetValue - eventInput.totalBudget;
  const guestDiff = guestValue - eventInput.guestCount;

  return (
    <section
      className="mb-8 rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 transition-all duration-300 sm:p-7 print:hidden"
      aria-labelledby="whatif-heading"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DCC8] pb-4">
        <div>
          <SectionLabel label="Adjustments" />
          <h3
            id="whatif-heading"
            className="mt-1 font-serif text-2xl font-normal tracking-tight text-[#2B1B14] sm:text-3xl"
          >
            Adjust budget and <span className="italic">guests</span>
          </h3>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848]">
          Updates in real time
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Budget Slider */}
        <div className="rounded-xl border border-[#E8DCC8] bg-[#FBF6EE] p-5">
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="budget-slider"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
            >
              Total Budget
            </label>
            <output
              htmlFor="budget-slider"
              className="font-serif text-lg font-normal text-[#2B1B14]"
              aria-live="polite"
            >
              {formatINR(budgetValue)}
            </output>
          </div>
          <input
            id="budget-slider"
            type="range"
            min={budgetMin}
            max={budgetMax}
            step={budgetStep}
            value={budgetValue}
            onChange={(e) => handleBudgetChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E8DCC8] accent-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            aria-valuemin={budgetMin}
            aria-valuemax={budgetMax}
            aria-valuenow={budgetValue}
            aria-valuetext={formatINR(budgetValue)}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-[#6B5848]">
            <span>Min {formatINR(budgetMin)}</span>
            {budgetDiff !== 0 && (
              <span
                className={`font-semibold ${budgetDiff > 0 ? "text-[#5B1A2B]" : "text-[#6B5848]"}`}
              >
                {budgetDiff > 0 ? "+" : ""}
                {formatINR(budgetDiff)}
              </span>
            )}
            <span>Max {formatINR(budgetMax)}</span>
          </div>
        </div>

        {/* Guest Count Slider */}
        <div className="rounded-xl border border-[#E8DCC8] bg-[#FBF6EE] p-5">
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="guest-slider"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
            >
              Guest Count
            </label>
            <output
              htmlFor="guest-slider"
              className="font-serif text-lg font-normal text-[#2B1B14]"
              aria-live="polite"
            >
              {guestValue.toLocaleString("en-IN")} guests
            </output>
          </div>
          <input
            id="guest-slider"
            type="range"
            min={guestMin}
            max={guestMax}
            step={1}
            value={guestValue}
            onChange={(e) => handleGuestChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E8DCC8] accent-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            aria-valuemin={guestMin}
            aria-valuemax={guestMax}
            aria-valuenow={guestValue}
            aria-valuetext={`${guestValue} guests`}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-[#6B5848]">
            <span>Min {guestMin}</span>
            {guestDiff !== 0 && (
              <span
                className={`font-semibold ${guestDiff > 0 ? "text-[#5B1A2B]" : "text-[#6B5848]"}`}
              >
                {guestDiff > 0 ? "+" : ""}
                {guestDiff} guests
              </span>
            )}
            <span>Max {guestMax}</span>
          </div>
        </div>
      </div>

      {(budgetDiff !== 0 || guestDiff !== 0) && (
        <p className="mt-3 text-xs text-[#5A5A5A]" aria-live="polite">
          Budget categories recalculate proportionally on your device.
        </p>
      )}
    </section>
  );
}
