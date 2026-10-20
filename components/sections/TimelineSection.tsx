"use client";

import { memo, useRef, useState, useEffect, useMemo } from "react";
import type { TimelineMilestone } from "@/lib/schemas";
import {
  formatDate,
  daysUntil,
  scaleTimelineMilestones,
  getTimelineTimingInfo,
} from "@/lib/utils";

interface TimelineSectionProps {
  milestones: TimelineMilestone[];
  eventDate?: string;
  onUpdate: (milestones: TimelineMilestone[]) => void;
}

function TimelineComponent({
  milestones,
  eventDate,
  onUpdate,
}: TimelineSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0.4);

  // Guarantee scaled milestones fitting between today and event date
  const scaledMilestones = useMemo(() => {
    if (!eventDate) return milestones;
    return scaleTimelineMilestones(milestones, eventDate);
  }, [milestones, eventDate]);

  const timingInfo = useMemo(() => {
    return getTimelineTimingInfo(scaledMilestones, eventDate || "");
  }, [scaledMilestones, eventDate]);

  useEffect(() => {
    const isReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (isReduced) {
      setScrollProgress(1);
      return;
    }

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const total = rect.height;
      const visible = windowHeight - rect.top;
      const progress = Math.max(
        0,
        Math.min(1, visible / (total + windowHeight * 0.4))
      );
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleComplete = (index: number) => {
    const updated = scaledMilestones.map((m, i) =>
      i === index ? { ...m, completed: !m.completed } : m
    );
    onUpdate(updated);
  };

  const completedCount = scaledMilestones.filter((m) => m.completed).length;

  const sorted = [...scaledMilestones].sort(
    (a, b) => b.daysBeforeEvent - a.daysBeforeEvent
  );

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Timing Notice Banner (Compressed, Express, or Past) */}
      {timingInfo.noticeMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 text-xs font-medium ${
            timingInfo.isPast
              ? "border-red-300 bg-red-50 text-red-900"
              : timingInfo.isExpress
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-[#111111] bg-white text-[#111111]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true">
              {timingInfo.isPast ? "⚠" : timingInfo.isExpress ? "⚡" : "ℹ"}
            </span>
            <span>{timingInfo.noticeMessage}</span>
          </div>
        </div>
      )}

      {/* Progress header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D9D9D9] bg-white p-4">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]">
          {completedCount} of {scaledMilestones.length} milestones completed
        </span>
        <span className="font-serif text-lg font-normal text-[#111111]">
          {scaledMilestones.length > 0
            ? Math.round((completedCount / scaledMilestones.length) * 100)
            : 0}
          %
        </span>
      </div>

      {/* Timeline hairline & items */}
      <div className="relative pl-6 sm:pl-8">
        {/* Vertical background hairline */}
        <div
          className="absolute bottom-2 left-2.5 top-2 w-[1px] bg-[#D9D9D9] sm:left-3"
          aria-hidden="true"
        />
        {/* Scroll-driven active hairline fill */}
        <div
          className="absolute left-2.5 top-2 w-[2px] bg-[#111111] transition-all duration-150 sm:left-3"
          style={{ height: `${Math.round(scrollProgress * 100)}%` }}
          aria-hidden="true"
        />

        <ol className="space-y-6">
          {sorted.map((milestone, index) => {
            const days = daysUntil(milestone.dueDate);
            const isOverdue =
              days < 0 && !milestone.completed && !timingInfo.isPast;
            const isDueSoon = days >= 0 && days <= 7 && !milestone.completed;
            const originalIndex = scaledMilestones.indexOf(milestone);
            const isUrgent =
              timingInfo.urgentTaskIndices.has(originalIndex) &&
              !milestone.completed;

            return (
              <li
                key={`${milestone.title}-${index}`}
                className="relative flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6"
              >
                {/* Node dot on hairline */}
                <div
                  className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 transition-colors sm:-left-8 ${
                    milestone.completed
                      ? "border-[#111111] bg-[#111111]"
                      : "border-[#111111] bg-white"
                  }`}
                  aria-hidden="true"
                />

                {/* Left side: Date & days countdown */}
                <div className="min-w-[130px] flex-shrink-0 pt-0.5">
                  <div className="text-sm font-semibold text-[#111111]">
                    {formatDate(milestone.dueDate)}
                  </div>
                  <div className="text-xs text-[#5A5A5A]">
                    {milestone.daysBeforeEvent} days before
                  </div>
                </div>

                {/* Right side: Event card */}
                <div
                  className={`flex-1 rounded-xl border p-4 transition-all duration-300 ${
                    milestone.completed
                      ? "border-[#D9D9D9] bg-[#F7F7F7] opacity-80"
                      : "border-[#D9D9D9] bg-white shadow-sm hover:border-[#111111]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={milestone.completed}
                      onChange={() => toggleComplete(originalIndex)}
                      className="mt-0.5 h-4 w-4 rounded border-[#D9D9D9] text-[#111111] accent-[#111111] focus:ring-2 focus:ring-[#111111]"
                      aria-label={`Mark "${milestone.title}" as ${milestone.completed ? "incomplete" : "complete"}`}
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-sm font-semibold ${
                            milestone.completed
                              ? "text-[#5A5A5A] line-through"
                              : "text-[#111111]"
                          }`}
                        >
                          {milestone.title}
                        </h4>
                        {isUrgent && (
                          <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                            Start this week
                          </span>
                        )}
                        {isOverdue && (
                          <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Overdue
                          </span>
                        )}
                        {isDueSoon && !isUrgent && (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Due soon
                          </span>
                        )}
                        {milestone.completed && (
                          <span className="rounded-full border border-[#111111] bg-[#111111] px-2 py-0.5 text-[11px] font-semibold text-[#F7F7F7]">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#5A5A5A]">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

const TimelineSection = memo(TimelineComponent);
export default TimelineSection;
