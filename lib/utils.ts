import type {
  BudgetCategory,
  CurrencyCode,
  EventInput,
  TimelineMilestone,
} from "./schemas";
import { CURRENCIES } from "./schemas";

/**
 * Formats a number or string as Indian Rupees (INR) using Indian number grouping (e.g. ₹45,000, ₹1,50,000, ₹30,00,000).
 * Handles numbers, formatted strings, and raw estimate strings (e.g. "Est. 45000 INR").
 */
export function formatINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "₹0";
  }

  let numeric: number;
  if (typeof value === "number") {
    numeric = isNaN(value) ? 0 : Math.round(value);
  } else {
    // If it's a string, strip commas and find first sequence of digits/decimals
    const str = String(value).replace(/,/g, "");
    const match = str.match(/(\d+(?:\.\d+)?)/);
    numeric = match ? Math.round(parseFloat(match[0])) : 0;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

/**
 * Formats a number as currency using the specified currency code.
 * Uses formatINR for INR, or Intl.NumberFormat for other currencies.
 */
export function formatCurrency(
  amount: number | string,
  currencyCode: CurrencyCode = "INR"
): string {
  if (currencyCode === "INR") {
    return formatINR(amount);
  }
  const numeric =
    typeof amount === "number" ? amount : parseFloat(String(amount)) || 0;
  const locale =
    currencyCode === "EUR"
      ? "de-DE"
      : currencyCode === "GBP"
        ? "en-GB"
        : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
}

/**
 * Gets the symbol for a currency code.
 */
export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  return currency?.symbol ?? "₹";
}

/**
 * Round budget categories to the nearest ₹1,000 (₹500 if the total is under ₹1,00,000),
 * put the remainder in the largest category so the sum is exact.
 */
export function roundBudgetCategories(
  categories: BudgetCategory[],
  totalBudget: number
): BudgetCategory[] {
  if (categories.length === 0) return [];
  if (totalBudget <= 0) {
    return categories.map((c) => ({ ...c, amount: 0, percentage: 0 }));
  }

  const step = totalBudget < 100000 ? 500 : 1000;

  // Proportional allocation if current total differs from totalBudget
  const currentTotal = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const rawAmounts =
    currentTotal > 0
      ? categories.map((cat) => (cat.amount / currentTotal) * totalBudget)
      : categories.map(() => totalBudget / categories.length);

  // Round each category to nearest step
  const rounded = rawAmounts.map((amt, i) => {
    const rawRounded = Math.round(amt / step) * step;
    return categories[i].amount > 0 ? Math.max(step, rawRounded) : 0;
  });

  // Find index of the largest category
  let largestIdx = 0;
  let maxAmt = -1;
  for (let i = 0; i < rounded.length; i++) {
    if (rounded[i] > maxAmt) {
      maxAmt = rounded[i];
      largestIdx = i;
    }
  }

  // Put remainder in the largest category so the sum is exact
  const currentSum = rounded.reduce((sum, a) => sum + a, 0);
  const remainder = totalBudget - currentSum;
  rounded[largestIdx] += remainder;

  return categories.map((cat, i) => ({
    ...cat,
    amount: rounded[i],
    percentage: Number(((rounded[i] / totalBudget) * 100).toFixed(1)),
  }));
}

/**
 * Recalculates budget categories proportionally when the total budget changes.
 * Rounds to nearest ₹1,000 (or ₹500 if under ₹1,00,000) and places remainder in largest category.
 * Guarantees that the sum of all categories equals newTotal exactly.
 */
export function recalculateBudget(
  categories: BudgetCategory[],
  newTotal: number
): BudgetCategory[] {
  return roundBudgetCategories(categories, newTotal);
}

/**
 * Recalculates budget when guest count changes.
 * Scales categories that are per-guest sensitive (venue, food, decor).
 */
export function recalculateBudgetForGuests(
  categories: BudgetCategory[],
  originalGuestCount: number,
  newGuestCount: number,
  totalBudget: number
): BudgetCategory[] {
  if (originalGuestCount === newGuestCount) return categories;
  if (originalGuestCount <= 0 || newGuestCount <= 0) return categories;

  const guestSensitive = new Set([
    "venue",
    "food",
    "catering",
    "food & beverages",
    "food and beverages",
    "seating",
    "decor",
    "decoration",
    "decorations",
    "favors",
    "party favors",
    "return gifts",
    "invitations",
  ]);

  const ratio = newGuestCount / originalGuestCount;

  const adjusted = categories.map((cat) => {
    const isGuestSensitive = guestSensitive.has(cat.category.toLowerCase());
    const newAmount = isGuestSensitive
      ? Math.round(cat.amount * ratio)
      : cat.amount;
    return { ...cat, amount: newAmount };
  });

  // Normalize and round to maintain the same total budget exactly
  return roundBudgetCategories(adjusted, totalBudget);
}

/**
 * Corrects budget category amounts so they sum exactly to the target total.
 * Rounds to nearest ₹1,000 (₹500 under ₹1,00,000) and puts remainder in largest category.
 */
export function correctBudgetSum(
  categories: BudgetCategory[],
  targetTotal: number
): BudgetCategory[] {
  return roundBudgetCategories(categories, targetTotal);
}

/**
 * Scales all milestone due dates proportionally to fit strictly between today and the event date.
 * Guarantees that freshly generated plans NEVER show any milestone as "Overdue".
 */
export function scaleTimelineMilestones(
  milestones: TimelineMilestone[],
  eventDate: string
): TimelineMilestone[] {
  if (!milestones || milestones.length === 0) return [];

  const daysLeft = daysUntil(eventDate);

  // If event is in the past (daysLeft < 0) or today (daysLeft === 0)
  if (daysLeft <= 0) {
    return milestones.map((m) => ({
      ...m,
      daysBeforeEvent: 0,
      dueDate: eventDate,
    }));
  }

  // If event is tomorrow (daysLeft === 1)
  if (daysLeft === 1) {
    return milestones.map((m, index) => {
      const daysBefore = index === milestones.length - 1 ? 0 : 1;
      return {
        ...m,
        daysBeforeEvent: daysBefore,
        dueDate: calculateMilestoneDate(eventDate, daysBefore),
      };
    });
  }

  // Find the maximum daysBeforeEvent across all milestones
  const maxOriginalDays = Math.max(
    ...milestones.map((m) => Math.max(0, m.daysBeforeEvent))
  );

  // Maximum allowed days before event is (daysLeft - 1) so earliest task is scheduled for tomorrow/today
  const maxAllowed = Math.max(1, daysLeft - 1);

  // If any milestone is >= daysLeft, or maxOriginalDays >= daysLeft, scale all
  const needsScaling =
    maxOriginalDays >= daysLeft ||
    milestones.some((m) => m.daysBeforeEvent >= daysLeft);

  if (!needsScaling) {
    return milestones.map((m) => ({
      ...m,
      dueDate: calculateMilestoneDate(eventDate, m.daysBeforeEvent),
    }));
  }

  return milestones.map((m) => {
    const ratio = maxOriginalDays > 0 ? m.daysBeforeEvent / maxOriginalDays : 0;
    const scaledDays = Math.min(
      maxAllowed,
      Math.max(0, Math.round(ratio * maxAllowed))
    );
    return {
      ...m,
      daysBeforeEvent: scaledDays,
      dueDate: calculateMilestoneDate(eventDate, scaledDays),
    };
  });
}

export interface TimelineTimingInfo {
  daysUntilEvent: number;
  isPast: boolean;
  isExpress: boolean;
  isCompressed: boolean;
  noticeMessage: string | null;
  urgentTaskIndices: Set<number>;
}

/**
 * Computes timeline timing notices and tags.
 * - Handles event in the past (< 0 days)
 * - Handles express timeline within 7 days (0-7 days)
 * - Detects tight timeline (8-45 days) with compressed notice:
 *   "Your event is 30 days away, so we compressed this plan"
 * - Identifies top 3 most urgent tasks to tag "Start this week"
 */
export function getTimelineTimingInfo(
  milestones: TimelineMilestone[],
  eventDate: string
): TimelineTimingInfo {
  const daysUntilEvent = daysUntil(eventDate);
  const isPast = daysUntilEvent < 0;
  const isExpress = daysUntilEvent >= 0 && daysUntilEvent <= 7;
  const isCompressed = daysUntilEvent > 7 && daysUntilEvent <= 45;

  let noticeMessage: string | null = null;
  if (isPast) {
    noticeMessage =
      "This event date has already passed. Please select a future date to plan your timeline.";
  } else if (isExpress) {
    noticeMessage = `Your event is just ${
      daysUntilEvent === 0
        ? "today"
        : `${daysUntilEvent} day${daysUntilEvent === 1 ? "" : "s"} away`
    }! This is an express timeline focused only on critical day-of essentials.`;
  } else if (isCompressed) {
    noticeMessage = `Your event is ${daysUntilEvent} days away, so we compressed this plan`;
  }

  // Tag 3 most urgent tasks when time is tight or express
  const urgentTaskIndices = new Set<number>();
  if ((isCompressed || isExpress) && milestones.length > 0) {
    // Sort milestones by daysBeforeEvent descending (earliest due date / closest to today)
    const sorted = milestones
      .map((m, originalIndex) => ({ m, originalIndex }))
      .sort((a, b) => b.m.daysBeforeEvent - a.m.daysBeforeEvent);

    const count = Math.min(3, sorted.length);
    for (let i = 0; i < count; i++) {
      urgentTaskIndices.add(sorted[i].originalIndex);
    }
  }

  return {
    daysUntilEvent,
    isPast,
    isExpress,
    isCompressed,
    noticeMessage,
    urgentTaskIndices,
  };
}

/**
 * Calculates milestone due dates counting backward from the event date.
 */
export function calculateMilestoneDate(
  eventDate: string,
  daysBeforeEvent: number
): string {
  const event = new Date(eventDate);
  const milestone = new Date(event);
  milestone.setDate(milestone.getDate() - daysBeforeEvent);
  return milestone.toISOString().split("T")[0];
}

/**
 * Formats a date for display.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns the number of days between now and a target date.
 */
export function daysUntil(dateString: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Adjusts a single budget category to a user-specified amount and redistributes
 * the remaining balance across all other categories proportionally.
 * Guarantees:
 * 1. The edited category receives the requested amount (clamped between 0 and totalBudget).
 * 2. The remaining categories adjust proportionally based on their prior share.
 * 3. The sum of all categories ALWAYS equals totalBudget exactly.
 */
export function adjustSingleCategoryBudget(
  categories: BudgetCategory[],
  editIndex: number,
  newAmount: number,
  totalBudget: number
): BudgetCategory[] {
  if (categories.length === 0) return [];
  if (editIndex < 0 || editIndex >= categories.length) {
    return roundBudgetCategories(categories, totalBudget);
  }

  const step = totalBudget < 100000 ? 500 : 1000;
  const roundedNew = Math.round(newAmount / step) * step;
  const clampedAmount = Math.max(0, Math.min(roundedNew, totalBudget));

  if (categories.length === 1) {
    return [
      {
        ...categories[0],
        amount: totalBudget,
        percentage: 100,
      },
    ];
  }

  const remainingBudget = totalBudget - clampedAmount;
  const otherCategories = categories.filter((_, i) => i !== editIndex);
  const adjustedOthers = roundBudgetCategories(
    otherCategories,
    remainingBudget
  );

  let otherIdx = 0;
  return categories.map((cat, i) => {
    if (i === editIndex) {
      return {
        ...cat,
        amount: clampedAmount,
        percentage: Number(((clampedAmount / totalBudget) * 100).toFixed(1)),
      };
    }
    return adjustedOthers[otherIdx++];
  });
}

/**
 * Sanitizes user text to prevent prompt injection.
 * Strips control characters, XML/HTML tags, angle brackets, and limits length.
 */
export function sanitizeUserText(text: string, maxLength: number): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control characters
    .replace(/[<>]/g, "") // strip angle brackets to prevent XML escape
    .replace(/<\/?event_data>/gi, "") // strip delimiter tag attempts
    .trim()
    .slice(0, maxLength);
}

/**
 * Generates a deterministic cache key from event input.
 */
export function generateCacheKey(input: EventInput): string {
  const normalized = {
    eventType: input.eventType,
    eventDate: input.eventDate,
    city: input.city.toLowerCase().trim(),
    guestCount: input.guestCount,
    totalBudget: input.totalBudget,
    currency: input.currency,
    vibeOrTheme: (input.vibeOrTheme ?? "").toLowerCase().trim(),
    cultureOrTradition: (input.cultureOrTradition ?? "").toLowerCase().trim(),
    specialRequirements: (input.specialRequirements ?? "").toLowerCase().trim(),
  };
  return btoa(JSON.stringify(normalized));
}

/**
 * Debounce helper for slider inputs.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Cleans raw LLM response text by removing markdown code fences
 * and extracting the outermost JSON object or array.
 */
export function cleanJsonPayload(rawText: string): string {
  let text = rawText.trim();
  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = text.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = text.lastIndexOf("]");
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    text = text.substring(startIdx, endIdx + 1);
  }
  return text.trim();
}

/**
 * Escapes HTML entities to prevent XSS when rendering text.
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] ?? char);
}
