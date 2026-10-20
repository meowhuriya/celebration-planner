import { describe, it, expect } from "vitest";
import { calculateCountdown } from "@/lib/countdown";

describe("calculateCountdown", () => {
  it("calculates remaining days, hours, and minutes for a future event date", () => {
    // Current time: June 1, 2027 at 14:00
    const now = new Date(2027, 5, 1, 14, 0, 0); // Month is 0-indexed: 5 = June
    // Target event: June 15, 2027
    const eventDate = "2027-06-15";

    const result = calculateCountdown(eventDate, now);
    expect(result.status).toBe("future");
    // June 1 14:00 to June 15 00:00 = 13 days and 10 hours
    expect(result.days).toBe(13);
    expect(result.hours).toBe(10);
    expect(result.minutes).toBe(0);
    expect(result.displayText).toContain("13 days · 10 hours · 0 minutes");
  });

  it("calculates remaining time down to the exact minutes", () => {
    const now = new Date(2027, 5, 10, 20, 45, 0);
    const eventDate = "2027-06-15";

    const result = calculateCountdown(eventDate, now);
    expect(result.status).toBe("future");
    // From June 10 20:45 to June 15 00:00 = 4 days, 3 hours, 15 minutes
    expect(result.days).toBe(4);
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(15);
  });

  it("returns 'Today is the day' when the current date matches the event date", () => {
    // Current date is June 15, 2027 at any hour of the day
    const morning = new Date(2027, 5, 15, 8, 30, 0);
    const evening = new Date(2027, 5, 15, 19, 0, 0);
    const eventDate = "2027-06-15";

    const morningResult = calculateCountdown(eventDate, morning);
    expect(morningResult.status).toBe("today");
    expect(morningResult.displayText).toBe("Today is the day");

    const eveningResult = calculateCountdown(eventDate, evening);
    expect(eveningResult.status).toBe("today");
    expect(eveningResult.displayText).toBe("Today is the day");
  });

  it("returns 'This event has passed' when the current date is after the event date", () => {
    const after = new Date(2027, 5, 16, 10, 0, 0);
    const eventDate = "2027-06-15";

    const result = calculateCountdown(eventDate, after);
    expect(result.status).toBe("passed");
    expect(result.displayText).toBe("This event has passed");
  });

  it("handles singular vs plural unit labels properly", () => {
    // 1 day, 1 hour, 1 minute before target
    const targetDate = "2027-06-15";
    // 1 day, 1 hour, 1 minute before June 15 00:00 is June 13 at 22:59
    const now = new Date(2027, 5, 13, 22, 59, 0);

    const result = calculateCountdown(targetDate, now);
    expect(result.status).toBe("future");
    expect(result.days).toBe(1);
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(1);
    expect(result.displayText).toBe("1 day · 1 hour · 1 minute");
  });

  it("handles invalid or empty event dates gracefully", () => {
    expect(calculateCountdown("").displayText).toBe("This event has passed");
    expect(calculateCountdown("invalid-date").displayText).toBe(
      "This event has passed"
    );
  });
});
