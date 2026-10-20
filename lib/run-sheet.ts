import type { RunSheetItem } from "./schemas";

export interface NowAndNextResult {
  now: RunSheetItem | null;
  next: RunSheetItem | null;
  minutesUntilNext: number | null;
  progressPercent: number;
  currentTimeMinutes: number;
  currentTimeFormatted: string;
}

/**
 * Parses time strings like "08:00 AM", "1:30 PM", "15:30", "9:00" into minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const str = timeStr.trim();
  const match = str.match(/(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  } else if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return Math.min(1439, Math.max(0, hours * 60 + minutes));
}

/**
 * Formats minutes from midnight into 12-hour formatted time string, e.g. "3:30 PM", "9:00 AM".
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const clamped = Math.min(1439, Math.max(0, Math.round(totalMinutes)));
  let hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const meridiem = hours >= 12 ? "PM" : "AM";

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }

  const paddedMinutes = String(minutes).padStart(2, "0");
  return `${hours}:${paddedMinutes} ${meridiem}`;
}

/**
 * Pure function that determines the current (NOW) and upcoming (NEXT) activity
 * from a run sheet schedule at any given time.
 * Handles before first item, between items, on boundary, and after last item.
 */
export function getNowAndNext(
  runSheet: RunSheetItem[],
  time: string | number
): NowAndNextResult {
  const currentMinutes =
    typeof time === "number" ? time : parseTimeToMinutes(time);
  const currentTimeFormatted = formatMinutesToTime(currentMinutes);

  if (!runSheet || runSheet.length === 0) {
    return {
      now: null,
      next: null,
      minutesUntilNext: null,
      progressPercent: 0,
      currentTimeMinutes: currentMinutes,
      currentTimeFormatted,
    };
  }

  // Parse and sort items chronologically
  const parsedItems = runSheet
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      minutes: parseTimeToMinutes(item.time),
    }))
    .sort((a, b) => a.minutes - b.minutes);

  const firstMinutes = parsedItems[0].minutes;
  const lastMinutes = parsedItems[parsedItems.length - 1].minutes;

  // Case 1: Before first item
  if (currentMinutes < firstMinutes) {
    const nextItem = parsedItems[0].item;
    return {
      now: null,
      next: nextItem,
      minutesUntilNext: firstMinutes - currentMinutes,
      progressPercent: 0,
      currentTimeMinutes: currentMinutes,
      currentTimeFormatted,
    };
  }

  // Case 2: At or after the last item
  if (currentMinutes >= lastMinutes) {
    const nowItem = parsedItems[parsedItems.length - 1].item;
    return {
      now: nowItem,
      next: null,
      minutesUntilNext: null,
      progressPercent: 100,
      currentTimeMinutes: currentMinutes,
      currentTimeFormatted,
    };
  }

  // Case 3: Between items (find the active item)
  let activeIndex = 0;
  for (let i = 0; i < parsedItems.length - 1; i++) {
    if (
      currentMinutes >= parsedItems[i].minutes &&
      currentMinutes < parsedItems[i + 1].minutes
    ) {
      activeIndex = i;
      break;
    }
  }

  const nowItem = parsedItems[activeIndex].item;
  const nextItem = parsedItems[activeIndex + 1].item;
  const minutesUntilNext =
    parsedItems[activeIndex + 1].minutes - currentMinutes;

  const totalSpan = lastMinutes - firstMinutes;
  const progressPercent =
    totalSpan > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Number(
              (((currentMinutes - firstMinutes) / totalSpan) * 100).toFixed(1)
            )
          )
        )
      : 100;

  return {
    now: nowItem,
    next: nextItem,
    minutesUntilNext,
    progressPercent,
    currentTimeMinutes: currentMinutes,
    currentTimeFormatted,
  };
}
