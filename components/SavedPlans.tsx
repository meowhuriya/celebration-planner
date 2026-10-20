"use client";

import { useState, useEffect } from "react";
import type { EventInput, EventPlan } from "@/lib/schemas";
import { getSavedPlans, deleteSavedPlan } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import SectionLabel from "./editorial/SectionLabel";

interface SavedPlansProps {
  onLoad: (plan: EventPlan, input: EventInput) => void;
}

interface SavedPlanEntry {
  id: string;
  input: EventInput;
  plan: EventPlan;
  savedAt: string;
  label: string;
}

export default function SavedPlans({ onLoad }: SavedPlansProps) {
  const [plans, setPlans] = useState<SavedPlanEntry[]>([]);

  useEffect(() => {
    setPlans(getSavedPlans());
  }, []);

  const handleDelete = (id: string) => {
    deleteSavedPlan(id);
    setPlans(getSavedPlans());
  };

  if (plans.length === 0) {
    return (
      <section
        aria-labelledby="saved-plans-heading"
        className="rounded-2xl border border-dashed border-[#E8DCC8] bg-[#FFFDF8] p-6 text-center"
      >
        <div className="flex items-center justify-center gap-2">
          <SectionLabel label="Archive" />
        </div>
        <h3
          id="saved-plans-heading"
          className="mt-2 font-serif text-xl font-normal text-[#2B1B14]"
        >
          Saved plans
        </h3>
        <p className="mt-1 text-xs text-[#6B5848]">
          No saved plans yet. Generate a celebration plan and choose &ldquo;Save
          plan&rdquo; to keep it handy on this device.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="saved-plans-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SectionLabel label="Archive" />
          <h3
            id="saved-plans-heading"
            className="font-serif text-xl font-normal text-[#2B1B14]"
          >
            Saved plans ({plans.length})
          </h3>
        </div>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((savedPlan) => (
          <div
            key={savedPlan.id}
            className="flex items-center justify-between rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-4 transition-all hover:border-[#5B1A2B]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#2B1B14]">
                {savedPlan.label}
              </p>
              <p className="text-xs text-[#6B5848]">
                Saved {formatDate(savedPlan.savedAt)}
              </p>
            </div>
            <div className="ml-3 flex gap-2">
              <button
                onClick={() => onLoad(savedPlan.plan, savedPlan.input)}
                className="rounded-lg border border-[#5B1A2B] bg-[#5B1A2B] px-3 py-1.5 text-xs font-semibold text-[#FBF6EE] transition-colors hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
                aria-label={`Load plan: ${savedPlan.label}`}
              >
                Load
              </button>
              <button
                onClick={() => handleDelete(savedPlan.id)}
                className="rounded-lg border border-[#E8DCC8] bg-[#FBF6EE] px-2.5 py-1.5 text-xs font-semibold text-[#6B5848] transition-colors hover:border-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label={`Delete plan: ${savedPlan.label}`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
