export interface CountdownResult {
  status: "future" | "today" | "passed";
  days: number;
  hours: number;
  minutes: number;
  displayText: string;
}

/**
 * Pure countdown calculation function.
 * Compares the target event date with the current date/time.
 * - Same calendar day: status "today", "Today is the day"
 * - Past calendar day: status "passed", "This event has passed"
 * - Future: status "future", calculates remaining days, hours, and minutes
 */
export function calculateCountdown(
  eventDateStr: string,
  now: Date = new Date()
): CountdownResult {
  if (!eventDateStr) {
    return {
      status: "passed",
      days: 0,
      hours: 0,
      minutes: 0,
      displayText: "This event has passed",
    };
  }

  // Parse YYYY-MM-DD components
  const parts = eventDateStr.split("-").map(Number);
  const targetYear = parts[0];
  const targetMonth = parts[1] - 1; // 0-indexed
  const targetDay = parts[2];

  if (isNaN(targetYear) || isNaN(targetMonth) || isNaN(targetDay)) {
    return {
      status: "passed",
      days: 0,
      hours: 0,
      minutes: 0,
      displayText: "This event has passed",
    };
  }

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDay = now.getDate();

  // Compare calendar dates (midnight to midnight)
  const nowDateOnly = new Date(nowYear, nowMonth, nowDay).getTime();
  const targetDateOnly = new Date(targetYear, targetMonth, targetDay).getTime();

  // 1. Same calendar day -> "Today is the day"
  if (nowDateOnly === targetDateOnly) {
    return {
      status: "today",
      days: 0,
      hours: 0,
      minutes: 0,
      displayText: "Today is the day",
    };
  }

  // 2. Past calendar day -> "This event has passed"
  if (nowDateOnly > targetDateOnly) {
    return {
      status: "passed",
      days: 0,
      hours: 0,
      minutes: 0,
      displayText: "This event has passed",
    };
  }

  // 3. Future event: target is the start of the event day (00:00) or calculate remaining time
  const targetInstant = new Date(targetYear, targetMonth, targetDay, 0, 0, 0);
  const diffMs = targetInstant.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      status: "today",
      days: 0,
      hours: 0,
      minutes: 0,
      displayText: "Today is the day",
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  const daysLabel = `${days} ${days === 1 ? "day" : "days"}`;
  const hoursLabel = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const minutesLabel = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;

  const displayText = `${daysLabel} · ${hoursLabel} · ${minutesLabel}`;

  return {
    status: "future",
    days,
    hours,
    minutes,
    displayText,
  };
}
