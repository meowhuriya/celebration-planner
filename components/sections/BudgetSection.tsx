"use client";

import { useState, useRef, memo, useMemo } from "react";
import type { BudgetCategory, CurrencyCode } from "@/lib/schemas";
import { formatINR, adjustSingleCategoryBudget } from "@/lib/utils";
import BudgetTreemap from "../editorial/BudgetTreemap";

const PALETTE_VARS = [
  "var(--palette-1, #111111)",
  "var(--palette-2, #5A5A5A)",
  "var(--palette-3, #888888)",
  "var(--palette-4, #BBBBBB)",
];

interface BudgetSectionProps {
  categories: BudgetCategory[];
  currency: CurrencyCode;
  totalBudget: number;
  guestCount?: number;
  onUpdate: (categories: BudgetCategory[]) => void;
}

function BudgetSectionComponent({
  categories,
  currency,
  totalBudget,
  guestCount,
  onUpdate,
}: BudgetSectionProps) {
  void currency;
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const editButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentTotal = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.amount, 0),
    [categories]
  );

  const largestCategory = useMemo(() => {
    if (categories.length === 0) return null;
    return categories.reduce(
      (max, c) => (c.amount > max.amount ? c : max),
      categories[0]
    );
  }, [categories]);

  const perGuest = useMemo(() => {
    if (!guestCount || guestCount <= 0) return null;
    return Math.round(currentTotal / guestCount);
  }, [currentTotal, guestCount]);

  const handleEditStart = (index: number, amount: number) => {
    setEditingIndex(index);
    setEditValue(amount.toString());
  };

  const handleEditSave = (index: number) => {
    const newAmount = parseInt(editValue, 10);
    if (isNaN(newAmount) || newAmount < 0) {
      setEditingIndex(null);
      editButtonRefs.current[index]?.focus();
      return;
    }

    const normalized = adjustSingleCategoryBudget(
      categories,
      index,
      newAmount,
      totalBudget
    );
    onUpdate(normalized);
    setEditingIndex(null);

    setTimeout(() => {
      editButtonRefs.current[index]?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") handleEditSave(index);
    if (e.key === "Escape") {
      setEditingIndex(null);
      editButtonRefs.current[index]?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#D9D9D9] bg-white p-5 sm:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
            Total budget
          </span>
          <span className="mt-1 block font-serif text-3xl font-normal tracking-tight text-[#111111]">
            {formatINR(currentTotal)}
          </span>
        </div>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
            Per guest
          </span>
          <span className="mt-1 block font-serif text-3xl font-normal tracking-tight text-[#111111]">
            {perGuest !== null ? formatINR(perGuest) : "—"}
          </span>
        </div>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
            Largest share
          </span>
          <span className="mt-1 block text-base font-semibold text-[#111111]">
            {largestCategory
              ? `${largestCategory.category} (${largestCategory.percentage.toFixed(0)}%)`
              : "—"}
          </span>
        </div>
      </div>

      {/* Animated Budget Treemap */}
      <BudgetTreemap categories={categories} totalBudget={totalBudget} />

      {/* Budget Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D9D9D9] bg-white">
        <table className="w-full text-left text-sm" role="table">
          <thead>
            <tr className="border-b border-[#D9D9D9] bg-[#F7F7F7]">
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]"
              >
                Category
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]"
              >
                Amount
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]"
              >
                Share
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111] md:table-cell"
              >
                Notes
              </th>
              <th scope="col" className="px-4 py-3 print:hidden">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D9D9]">
            {categories.map((cat, index) => (
              <tr
                key={`${cat.category}-${index}`}
                className="transition-colors hover:bg-[#F7F7F7]"
              >
                <td className="px-4 py-3 text-sm font-semibold text-[#111111]">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background: PALETTE_VARS[index % PALETTE_VARS.length],
                      }}
                      aria-hidden="true"
                    />
                    {cat.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingIndex === index ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleEditSave(index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="w-28 rounded-md border border-[#111111] bg-white px-2 py-1 text-right text-sm font-semibold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      aria-label={`Edit amount for ${cat.category}`}
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[#111111]">
                      {formatINR(cat.amount)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm text-[#5A5A5A]">
                  {cat.percentage.toFixed(1)}%
                </td>
                <td className="hidden px-4 py-3 text-sm text-[#5A5A5A] md:table-cell">
                  {cat.notes}
                </td>
                <td className="px-4 py-3 text-right print:hidden">
                  <button
                    ref={(el) => {
                      editButtonRefs.current[index] = el;
                    }}
                    onClick={() => handleEditStart(index, cat.amount)}
                    className="rounded-md border border-[#D9D9D9] px-2.5 py-1 text-xs font-medium text-[#111111] transition-colors hover:bg-[#111111] hover:text-[#F7F7F7] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                    aria-label={`Edit ${cat.category} amount`}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const BudgetSection = memo(BudgetSectionComponent);
export default BudgetSection;
