"use client";

import { memo } from "react";
import type { VendorItem } from "@/lib/schemas";
import { formatINR } from "@/lib/utils";

interface VendorChecklistSectionProps {
  vendors: VendorItem[];
  onUpdate: (vendors: VendorItem[]) => void;
}

const PRIORITY_TAGS: Record<string, string> = {
  high: "border-[#111111] bg-[#111111] text-[#F7F7F7]",
  medium: "border-[#D9D9D9] bg-white text-[#111111]",
  low: "border-[#D9D9D9] bg-[#F7F7F7] text-[#5A5A5A]",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

function VendorChecklistComponent({
  vendors,
  onUpdate,
}: VendorChecklistSectionProps) {
  const toggleChecked = (index: number) => {
    const updated = vendors.map((v, i) =>
      i === index ? { ...v, checked: !v.checked } : v
    );
    onUpdate(updated);
  };

  const checkedCount = vendors.filter((v) => v.checked).length;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between rounded-xl border border-[#D9D9D9] bg-white p-4">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]">
          {checkedCount} of {vendors.length} vendors confirmed
        </span>
        <span className="font-serif text-lg font-normal text-[#111111]">
          {vendors.length > 0
            ? Math.round((checkedCount / vendors.length) * 100)
            : 0}
          %
        </span>
      </div>

      <ul className="grid gap-3.5 sm:grid-cols-2">
        {vendors.map((vendor, index) => (
          <li
            key={`${vendor.vendorType}-${index}`}
            className={`rounded-xl border p-5 transition-all duration-300 ${
              vendor.checked
                ? "border-[#D9D9D9] bg-[#F7F7F7] opacity-80"
                : "border-[#D9D9D9] bg-white shadow-sm hover:border-[#111111]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 pt-0.5">
                <input
                  type="checkbox"
                  checked={vendor.checked}
                  onChange={() => toggleChecked(index)}
                  className="h-4 w-4 rounded border-[#D9D9D9] text-[#111111] accent-[#111111] focus:ring-2 focus:ring-[#111111]"
                  aria-label={`Mark "${vendor.vendorType}" as ${vendor.checked ? "not contacted" : "contacted"}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-sm font-semibold ${
                      vendor.checked
                        ? "text-[#5A5A5A] line-through"
                        : "text-[#111111]"
                    }`}
                  >
                    {vendor.vendorType}
                  </h4>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      PRIORITY_TAGS[vendor.priority] ?? PRIORITY_TAGS.medium
                    }`}
                  >
                    {PRIORITY_LABELS[vendor.priority] ?? vendor.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#5A5A5A]">
                  {formatINR(vendor.estimatedCost)}
                </p>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-[#111111] hover:underline">
                    Questions to ask ({vendor.questionsToAsk.length})
                  </summary>
                  <ul className="mt-2 space-y-1.5 border-t border-[#D9D9D9] pt-2">
                    {vendor.questionsToAsk.map((q, qi) => (
                      <li key={qi} className="text-xs text-[#5A5A5A]">
                        • {q}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const VendorChecklistSection = memo(VendorChecklistComponent);
export default VendorChecklistSection;
