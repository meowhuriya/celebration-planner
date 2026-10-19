import type { BudgetCategory, EventPlan, EventInput } from "./schemas";

export const SCRAMBLE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789!@#$%^&*";

/**
 * Resolves characters from left to right as progress increases from 0 to 1.
 * Pure function: deterministic or seed-based for testing.
 */
export function computeScrambledText(
  targetText: string,
  progress: number,
  seed = 42
): string {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const resolvedLength = Math.floor(targetText.length * clampedProgress);

  let result = "";
  for (let i = 0; i < targetText.length; i++) {
    const char = targetText[i];
    if (char === " ") {
      result += " ";
      continue;
    }

    if (i < resolvedLength) {
      result += char;
    } else {
      // Pick a pseudo-random character based on index, seed, and progress
      const pseudoRandomIndex =
        Math.abs(Math.sin((i + 1) * 997 + seed * 13 + progress * 53)) *
        SCRAMBLE_CHARS.length;
      result +=
        SCRAMBLE_CHARS[Math.floor(pseudoRandomIndex) % SCRAMBLE_CHARS.length];
    }
  }

  return result;
}

/**
 * Returns human label corresponding to current readiness percentage.
 * Under 25%: "Just getting started"
 */
export function getReadinessStatus(score: number): string {
  if (score < 25) return "Just getting started";
  if (score < 50) return "Making progress";
  if (score < 75) return "Well underway";
  if (score < 100) return "Almost ready";
  return "Ready to celebrate!";
}

/**
 * Computes readiness score (0 - 100%) from plan state.
 * Guaranteed to start low (under 25%, "Just getting started") when nothing is ticked.
 */
export function calculateReadinessScore(
  plan: EventPlan,
  input?: EventInput
): number {
  void input;
  // Base score is 15% (strictly under 25%) when nothing is ticked
  const baseScore = 15;

  // Milestone completion contributes up to 45%
  const totalMilestones = plan.timeline?.length ?? 0;
  const completedMilestones =
    plan.timeline?.filter((m) => m.completed).length ?? 0;
  const milestoneProgress =
    totalMilestones > 0 ? (completedMilestones / totalMilestones) * 45 : 0;

  // Vendor checklist completion contributes up to 40%
  const totalVendors = plan.vendorChecklist?.length ?? 0;
  const checkedVendors =
    plan.vendorChecklist?.filter((v) => v.checked).length ?? 0;
  const vendorProgress =
    totalVendors > 0 ? (checkedVendors / totalVendors) * 40 : 0;

  const total = Math.round(baseScore + milestoneProgress + vendorProgress);
  return Math.min(100, Math.max(0, total));
}

/**
 * Appends a tradition chip to a comma-separated list of traditions without duplicates
 * and respecting the character limit (default 200).
 */
export function addTraditionChip(
  current: string,
  chip: string,
  maxLength = 200
): string {
  const trimmed = current.trim();
  const items = trimmed
    ? trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // Deduplicate case-insensitively
  if (items.some((item) => item.toLowerCase() === chip.toLowerCase())) {
    return current;
  }

  const updated = items.length > 0 ? `${trimmed}, ${chip}` : chip;
  if (updated.length > maxLength) {
    return current;
  }

  return updated;
}

/**
 * Iridescent palette used for panels, gradient art, and accents.
 */
export const IRIDESCENT_GRADIENTS = [
  "linear-gradient(135deg, #a5b4fc 0%, #f472b6 100%)",
  "linear-gradient(135deg, #f472b6 0%, #fb923c 100%)",
  "linear-gradient(135deg, #fb923c 0%, #c084fc 100%)",
  "linear-gradient(135deg, #c084fc 0%, #60a5fa 100%)",
  "linear-gradient(135deg, #60a5fa 0%, #34d399 100%)",
  "linear-gradient(135deg, #34d399 0%, #f472b6 100%)",
];

export interface RibbonPanelConfig {
  id: number;
  rotateY: number;
  translateX: number;
  translateY: number;
  translateZ: number;
  rotateX: number;
  rotateZ: number;
  gradient: string;
}

/**
 * Computes pure geometric coordinates for the 3D twisting ribbon helix.
 */
export function calculate3DRibbonPanels(count = 18): RibbonPanelConfig[] {
  const panels: RibbonPanelConfig[] = [];
  const radius = 260; // px
  const spreadX = 42; // px per panel horizontally

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0 to 1
    const angleRad = t * Math.PI * 2.2 - Math.PI * 1.1; // -198deg to +198deg
    const angleDeg = (angleRad * 180) / Math.PI;

    const x = (i - count / 2) * spreadX;
    const y = Math.sin(angleRad * 1.5) * 35;
    const z = Math.cos(angleRad) * radius;

    panels.push({
      id: i,
      rotateY: -angleDeg,
      translateX: Math.round(x),
      translateY: Math.round(y),
      translateZ: Math.round(z),
      rotateX: Math.round(Math.sin(angleRad) * 12),
      rotateZ: Math.round(Math.cos(angleRad) * 8),
      gradient: IRIDESCENT_GRADIENTS[i % IRIDESCENT_GRADIENTS.length],
    });
  }

  return panels;
}

export interface BarCategory {
  category: string;
  amount: number;
  percentage: number;
  widthPercent: number;
  color: string;
}

const BAR_COLORS = [
  "#111111",
  "#444444",
  "#777777",
  "#999999",
  "#BBBBBB",
  "#5A5A5A",
  "#2A2A2A",
  "#888888",
];

/**
 * Calculates SVG proportional thin-bar breakdown.
 */
export function calculateBarBreakdown(budget: BudgetCategory[]): BarCategory[] {
  if (!budget || budget.length === 0) return [];
  const total = budget.reduce((sum, b) => sum + b.amount, 0) || 1;

  return budget.map((b, idx) => ({
    category: b.category,
    amount: b.amount,
    percentage: Math.round((b.amount / total) * 100),
    widthPercent: (b.amount / total) * 100,
    color: BAR_COLORS[idx % BAR_COLORS.length],
  }));
}
