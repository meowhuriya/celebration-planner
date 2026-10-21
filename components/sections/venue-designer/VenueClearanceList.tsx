"use client";

import { useState, memo } from "react";
import type { ClearanceViolation, AreaPerGuestResult } from "@/lib/floor";

interface VenueClearanceListProps {
  violations: ClearanceViolation[];
  tablesCount: number;
  seatsCount: number;
  areaInfo: AreaPerGuestResult;
  announcementText: string;
  onSelectItem?: (id: string) => void;
  onCopySummary?: () => void;
}

function VenueClearanceListComponent({
  violations,
  tablesCount,
  seatsCount,
  areaInfo,
  announcementText,
  onSelectItem,
  onCopySummary,
}: VenueClearanceListProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopy = () => {
    if (onCopySummary) {
      onCopySummary();
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const errorViolations = violations.filter((v) => v.severity === "error");
  const warningViolations = violations.filter((v) => v.severity === "warning");

  return (
    <div className="space-y-4 border-t border-[#D9D9D9] bg-white p-4 sm:p-5">
      {/* Live Accessibility Announcer */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcementText}
      </div>

      {/* Summary Line: "11 tables, 83 seats, 2.1 square meters per guest." */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D9D9D9] bg-[#F7F7F7] p-3.5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#111111]">
          <span className="rounded-full bg-[#111111] px-2.5 py-0.5 text-xs text-[#F7F7F7]">
            Capacity summary
          </span>
          <span>{tablesCount} tables</span>
          <span className="text-[#5A5A5A]">·</span>
          <span>{seatsCount} seats</span>
          <span className="text-[#5A5A5A]">·</span>
          <span>{areaInfo.areaPerGuestM2} square meters per guest</span>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {onCopySummary && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full border border-[#D9D9D9] bg-white px-3 py-1 text-xs font-semibold text-[#111111] transition-colors hover:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
              aria-label="Copy layout summary to clipboard"
            >
              {copyFeedback ? "✓ Copied" : "Copy layout summary"}
            </button>
          )}
        </div>
      </div>

      {/* Area per guest warning */}
      {areaInfo.isTight && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <span className="text-base" aria-hidden="true">
            ⚠️
          </span>
          <div className="leading-relaxed">
            <span className="font-semibold">Tight venue space:</span>{" "}
            {areaInfo.warning}
          </div>
        </div>
      )}

      {/* Clearance Status & Violations List */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5A5A5A]">
            Clearance &amp; safety checks
          </span>
          <span
            className={`text-xs font-medium ${
              violations.length === 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {violations.length === 0
              ? "✓ All walking corridors clear"
              : `${violations.length} clearance ${
                  violations.length === 1 ? "alert" : "alerts"
                } detected`}
          </span>
        </div>

        {violations.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
            ✓ 0 clearance issues: All tables have $\ge 0.9$m walking space,
            entrance buffer is unblocked, and all fixtures are inside the room.
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Clearance issues list">
            {errorViolations.map((v, i) => (
              <li
                key={`err_${i}`}
                className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-900"
              >
                <div className="flex items-center gap-2 print:hidden">
                  <span className="text-base" aria-hidden="true">
                    🚫
                  </span>
                  <span className="font-medium">{v.message}</span>
                </div>
                {onSelectItem && v.itemIds[0] && (
                  <button
                    type="button"
                    onClick={() => onSelectItem(v.itemIds[0])}
                    className="shrink-0 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 hover:bg-red-200 focus:outline-none focus:ring-1 focus:ring-red-600"
                    aria-label={`Select item to fix ${v.message}`}
                  >
                    Select
                  </button>
                )}
              </li>
            ))}

            {warningViolations.map((v, i) => (
              <li
                key={`warn_${i}`}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900"
              >
                <div className="flex items-center gap-2 print:hidden">
                  <span className="text-base" aria-hidden="true">
                    ⚠️
                  </span>
                  <span className="font-medium">{v.message}</span>
                </div>
                {onSelectItem && v.itemIds[0] && (
                  <button
                    type="button"
                    onClick={() => onSelectItem(v.itemIds[0])}
                    className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    aria-label={`Select item to fix ${v.message}`}
                  >
                    Select
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const VenueClearanceList = memo(VenueClearanceListComponent);
