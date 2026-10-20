import { describe, it, expect } from "vitest";
import {
  parseTimeToMinutes,
  formatMinutesToTime,
  getNowAndNext,
} from "@/lib/run-sheet";
import type { RunSheetItem } from "@/lib/schemas";

describe("parseTimeToMinutes and formatMinutesToTime", () => {
  it("parses AM/PM and 24-hour time strings correctly into minutes", () => {
    expect(parseTimeToMinutes("08:00 AM")).toBe(480);
    expect(parseTimeToMinutes("9:30 AM")).toBe(570);
    expect(parseTimeToMinutes("12:00 PM")).toBe(720);
    expect(parseTimeToMinutes("1:15 PM")).toBe(795);
    expect(parseTimeToMinutes("15:30")).toBe(930);
    expect(parseTimeToMinutes("11:00 PM")).toBe(1380);
    expect(parseTimeToMinutes("12:00 AM")).toBe(0);
  });

  it("formats minutes from midnight into 12-hour formatted time strings", () => {
    expect(formatMinutesToTime(480)).toBe("8:00 AM");
    expect(formatMinutesToTime(570)).toBe("9:30 AM");
    expect(formatMinutesToTime(720)).toBe("12:00 PM");
    expect(formatMinutesToTime(795)).toBe("1:15 PM");
    expect(formatMinutesToTime(930)).toBe("3:30 PM");
    expect(formatMinutesToTime(1380)).toBe("11:00 PM");
    expect(formatMinutesToTime(0)).toBe("12:00 AM");
  });
});

describe("getNowAndNext Pure Function", () => {
  const sampleRunSheet: RunSheetItem[] = [
    {
      time: "09:00 AM",
      activity: "Vendor load-in & stage setup",
      owner: "Venue Coordinator",
      notes: "Stage backdrop",
    },
    {
      time: "11:30 AM",
      activity: "Audio check & mic tests",
      owner: "AV Technician",
      notes: "Soundboard balance",
    },
    {
      time: "02:00 PM",
      activity: "Guest arrival & welcome refreshments",
      owner: "Hospitality Lead",
      notes: "Welcome desk open",
    },
    {
      time: "05:00 PM",
      activity: "Ceremony & cultural rituals",
      owner: "Ceremony Master",
      notes: "Main event",
    },
    {
      time: "08:00 PM",
      activity: "Dinner banquet & musical performance",
      owner: "Catering Lead",
      notes: "Buffet lines open",
    },
    {
      time: "10:30 PM",
      activity: "Guest farewell & vendor teardown",
      owner: "Event Lead",
      notes: "Wrap up",
    },
  ];

  it("handles time BEFORE the first scheduled item", () => {
    // 08:00 AM is 60 minutes before 09:00 AM (first item)
    const result = getNowAndNext(sampleRunSheet, "08:00 AM");

    expect(result.now).toBeNull();
    expect(result.next).not.toBeNull();
    expect(result.next?.time).toBe("09:00 AM");
    expect(result.next?.activity).toBe("Vendor load-in & stage setup");
    expect(result.minutesUntilNext).toBe(60);
    expect(result.progressPercent).toBe(0);
    expect(result.currentTimeFormatted).toBe("8:00 AM");
  });

  it("handles time BETWEEN scheduled items", () => {
    // 12:00 PM is between 11:30 AM and 02:00 PM (14:00)
    // Minutes: 11:30 AM is 690, 12:00 PM is 720, 02:00 PM is 840
    // Minutes until next (840 - 720) = 120 minutes (2 hours)
    const result = getNowAndNext(sampleRunSheet, "12:00 PM");

    expect(result.now).not.toBeNull();
    expect(result.now?.time).toBe("11:30 AM");
    expect(result.now?.activity).toBe("Audio check & mic tests");
    expect(result.now?.owner).toBe("AV Technician");

    expect(result.next).not.toBeNull();
    expect(result.next?.time).toBe("02:00 PM");
    expect(result.next?.activity).toBe("Guest arrival & welcome refreshments");
    expect(result.minutesUntilNext).toBe(120);

    // Progress percent should be between 0% and 100%
    expect(result.progressPercent).toBeGreaterThan(0);
    expect(result.progressPercent).toBeLessThan(100);
  });

  it("handles time exactly matching an item's start time", () => {
    // Exactly at 02:00 PM (840 minutes)
    const result = getNowAndNext(sampleRunSheet, "02:00 PM");

    expect(result.now?.time).toBe("02:00 PM");
    expect(result.now?.activity).toBe("Guest arrival & welcome refreshments");
    expect(result.next?.time).toBe("05:00 PM");
    // 05:00 PM (1020 mins) - 02:00 PM (840 mins) = 180 mins
    expect(result.minutesUntilNext).toBe(180);
  });

  it("handles the LAST item and times after the last item", () => {
    // Exactly at last item 10:30 PM
    const exactLast = getNowAndNext(sampleRunSheet, "10:30 PM");
    expect(exactLast.now?.time).toBe("10:30 PM");
    expect(exactLast.now?.activity).toBe("Guest farewell & vendor teardown");
    expect(exactLast.next).toBeNull();
    expect(exactLast.minutesUntilNext).toBeNull();
    expect(exactLast.progressPercent).toBe(100);

    // 11:30 PM (after the last item)
    const afterLast = getNowAndNext(sampleRunSheet, "11:30 PM");
    expect(afterLast.now?.time).toBe("10:30 PM");
    expect(afterLast.next).toBeNull();
    expect(afterLast.minutesUntilNext).toBeNull();
    expect(afterLast.progressPercent).toBe(100);
  });

  it("accepts numeric minutes as time argument", () => {
    // 540 minutes = 09:00 AM
    const result = getNowAndNext(sampleRunSheet, 540);
    expect(result.now?.time).toBe("09:00 AM");
    expect(result.currentTimeFormatted).toBe("9:00 AM");
  });

  it("handles empty run sheets safely", () => {
    const result = getNowAndNext([], "10:00 AM");
    expect(result.now).toBeNull();
    expect(result.next).toBeNull();
    expect(result.minutesUntilNext).toBeNull();
    expect(result.progressPercent).toBe(0);
  });
});
