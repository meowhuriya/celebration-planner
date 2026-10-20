import type { BudgetCategory } from "./schemas";
import { formatINR } from "./utils";

export interface TreemapNode {
  category: string;
  amount: number;
  percentage: number;
  x: number;
  y: number;
  width: number;
  height: number;
  formattedAmount: string;
  colorVar: string;
  textColorVar: string;
  isSmall: boolean;
  notes?: string;
}

const PALETTE_VARS = [
  "var(--palette-1, #111111)",
  "var(--palette-2, #800020)",
  "var(--palette-3, #D4AF37)",
  "var(--palette-4, #2E7D32)",
];

const TEXT_VARS = [
  "var(--palette-text-1, #FFFFFF)",
  "var(--palette-text-2, #FFFFFF)",
  "var(--palette-text-3, #111111)",
  "var(--palette-text-4, #FFFFFF)",
];

export interface BudgetCategoryItem {
  category: string;
  amount?: number;
  allocated?: number;
  percentage?: number;
  description?: string;
  notes?: string;
}

interface PartitionItem {
  category: BudgetCategoryItem;
  originalIndex: number;
  amount: number;
}

/**
 * Recursive binary partition algorithm.
 * Guarantees that the sum of the areas of all produced rectangles
 * exactly equals containerWidth * containerHeight.
 */
function partitionBox(
  items: PartitionItem[],
  x: number,
  y: number,
  w: number,
  h: number,
  result: TreemapNode[],
  overallTotal = 0
): void {
  if (items.length === 0) return;

  if (items.length === 1) {
    const item = items[0];
    const isSmall = w < 85 || h < 45;
    const computedPercentage =
      item.category.percentage ??
      (overallTotal > 0 ? Math.round((item.amount / overallTotal) * 100) : 100);

    result.push({
      category: item.category.category,
      amount: item.amount,
      percentage: computedPercentage,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      width: Number(w.toFixed(2)),
      height: Number(h.toFixed(2)),
      formattedAmount: formatINR(item.amount),
      colorVar: PALETTE_VARS[item.originalIndex % PALETTE_VARS.length],
      textColorVar: TEXT_VARS[item.originalIndex % TEXT_VARS.length],
      isSmall,
      notes: item.category.notes || item.category.description,
    });
    return;
  }

  const totalAmount = items.reduce((sum, it) => sum + it.amount, 0);
  if (totalAmount <= 0) return;

  // Find the split point that divides the sum most evenly
  const half = totalAmount / 2;
  let runningSum = 0;
  let splitIndex = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < items.length - 1; i++) {
    runningSum += items[i].amount;
    const diff = Math.abs(runningSum - half);
    if (diff < bestDiff) {
      bestDiff = diff;
      splitIndex = i + 1;
    }
  }

  const groupA = items.slice(0, splitIndex);
  const groupB = items.slice(splitIndex);

  const sumA = groupA.reduce((sum, it) => sum + it.amount, 0);
  const ratioA = totalAmount > 0 ? sumA / totalAmount : 0.5;

  // Split along the longer dimension to maintain optimal aspect ratios
  if (w >= h) {
    const wA = w * ratioA;
    const wB = w - wA;
    partitionBox(groupA, x, y, wA, h, result, overallTotal || totalAmount);
    partitionBox(groupB, x + wA, y, wB, h, result, overallTotal || totalAmount);
  } else {
    const hA = h * ratioA;
    const hB = h - hA;
    partitionBox(groupA, x, y, w, hA, result, overallTotal || totalAmount);
    partitionBox(groupB, x, y + hA, w, hB, result, overallTotal || totalAmount);
  }
}

/**
 * Pure function that calculates squarified / binary-partitioned treemap layout
 * for budget categories inside a given bounding box.
 */
export function calculateTreemap(
  categories: (BudgetCategory | BudgetCategoryItem)[],
  containerWidth = 1000,
  containerHeight = 260
): TreemapNode[] {
  if (!categories || categories.length === 0) return [];
  if (containerWidth <= 0 || containerHeight <= 0) return [];

  // Sort descending by amount for best packing aesthetics
  const mapped: PartitionItem[] = categories
    .map((cat, originalIndex) => {
      const amt =
        "allocated" in cat && cat.allocated !== undefined
          ? (cat.allocated as number)
          : (cat.amount ?? 0);
      return {
        category: cat,
        originalIndex,
        amount: Math.max(0, amt),
      };
    })
    .filter((it) => it.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (mapped.length === 0) return [];

  const totalAmount = mapped.reduce((sum, it) => sum + it.amount, 0);
  if (totalAmount <= 0) return [];

  const result: TreemapNode[] = [];
  partitionBox(
    mapped,
    0,
    0,
    containerWidth,
    containerHeight,
    result,
    totalAmount
  );

  return result;
}
