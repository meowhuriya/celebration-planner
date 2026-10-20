"use client";

import { useState, memo } from "react";
import type { RunSheetItem } from "@/lib/schemas";
import PlayTheDay from "../editorial/PlayTheDay";

interface RunSheetSectionProps {
  items: RunSheetItem[];
}

function RunSheetSectionComponent({ items }: RunSheetSectionProps) {
  const [activeItem, setActiveItem] = useState<RunSheetItem | null>(null);

  return (
    <div className="space-y-6">
      {/* Interactive Day-of scrubber */}
      <PlayTheDay runSheet={items} onActiveItemChange={setActiveItem} />

      {/* Full Schedule Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D9D9D9] bg-white">
        <table className="w-full text-left text-sm" role="table">
          <thead>
            <tr className="border-b border-[#D9D9D9] bg-[#F7F7F7]">
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]"
              >
                Time
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]"
              >
                Scheduled activity
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]"
              >
                Lead / Owner
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111] sm:table-cell"
              >
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D9D9]">
            {items.map((item, index) => {
              const isCurrent =
                activeItem &&
                activeItem.time === item.time &&
                activeItem.activity === item.activity;

              return (
                <tr
                  key={`${item.time}-${index}`}
                  className={`transition-colors ${
                    isCurrent
                      ? "bg-[#F7F7F7] font-medium"
                      : "hover:bg-[#FAFAFA]"
                  }`}
                  style={
                    isCurrent
                      ? {
                          borderLeft: "4px solid var(--palette-1, #111111)",
                        }
                      : undefined
                  }
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-[#111111]">
                    <span className="flex items-center gap-1.5">
                      {isCurrent && (
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: "var(--palette-1, #111111)" }}
                          aria-hidden="true"
                        />
                      )}
                      {item.time}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#111111]">
                    {item.activity}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[#5A5A5A]">
                    {item.owner}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-[#5A5A5A] sm:table-cell">
                    {item.notes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const RunSheetSection = memo(RunSheetSectionComponent);
export default RunSheetSection;
