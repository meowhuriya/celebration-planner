import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "./axe-helper";
import LiveCountdown from "@/components/editorial/LiveCountdown";

expect.extend(toHaveNoViolations);

describe("LiveCountdown Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders remaining days, hours, and minutes for future event dates", () => {
    // 30 days in future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split("T")[0];

    render(<LiveCountdown eventDate={dateStr} />);

    expect(screen.getByText(/Countdown to the/i)).toBeInTheDocument();
    expect(screen.getByText(/Updates every minute/i)).toBeInTheDocument();
    expect(screen.getByText(/day/i)).toBeInTheDocument();
  });

  it("renders 'Today is the day' when event date is today", () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    render(<LiveCountdown eventDate={todayStr} />);

    expect(screen.getByText(/Today is the/i)).toBeInTheDocument();
    expect(screen.getByText("day")).toBeInTheDocument();
  });

  it("renders 'This event has passed' for past event dates", () => {
    const pastDate = "2020-01-01";
    render(<LiveCountdown eventDate={pastDate} />);

    expect(screen.getByText(/This event has/i)).toBeInTheDocument();
    expect(screen.getByText("passed")).toBeInTheDocument();
  });

  it("has zero accessibility violations (jest-axe) for future, today, and passed states", async () => {
    // Future state
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45);
    const { container, rerender } = render(
      <LiveCountdown eventDate={futureDate.toISOString().split("T")[0]} />
    );
    let results = await axe(container);
    expect(results).toHaveNoViolations();

    // Today state
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    rerender(<LiveCountdown eventDate={todayStr} />);
    results = await axe(container);
    expect(results).toHaveNoViolations();

    // Passed state
    rerender(<LiveCountdown eventDate="2018-05-10" />);
    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
