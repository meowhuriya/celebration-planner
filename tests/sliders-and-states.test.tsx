import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import WhatIfSliders from "@/components/WhatIfSliders";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import ExampleScenarios from "@/components/ExampleScenarios";

expect.extend(toHaveNoViolations);

describe("WhatIfSliders", () => {
  const defaultProps = {
    eventInput: {
      eventType: "wedding" as const,
      eventDate: "2027-06-15",
      city: "Hyderabad",
      guestCount: 500,
      totalBudget: 3000000,
      currency: "INR" as const,
      vibeOrTheme: "",
      cultureOrTradition: "",
      specialRequirements: "",
    },
    onBudgetChange: vi.fn(),
    onGuestCountChange: vi.fn(),
  };

  it("renders budget and guest sliders", () => {
    render(<WhatIfSliders {...defaultProps} />);

    expect(screen.getByLabelText("Total Budget")).toBeInTheDocument();
    expect(screen.getByLabelText("Guest Count")).toBeInTheDocument();
  });

  it("displays current budget value", () => {
    render(<WhatIfSliders {...defaultProps} />);
    expect(screen.getByText(/30,00,000/)).toBeInTheDocument();
  });

  it("displays current guest count", () => {
    render(<WhatIfSliders {...defaultProps} />);
    expect(screen.getByText(/500 guests/)).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<WhatIfSliders {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("LoadingState", () => {
  it("renders loading message", () => {
    render(<LoadingState />);
    expect(
      screen.getByRole("heading", { name: /Planning your celebration/i })
    ).toBeInTheDocument();
  });

  it("has role=status", () => {
    render(<LoadingState />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<LoadingState />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("ErrorState", () => {
  it("renders error message", () => {
    render(<ErrorState message="Test error" onRetry={vi.fn()} />);
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("has role=alert", () => {
    render(<ErrorState message="Test error" onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("calls onRetry when button clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Test error" onRetry={onRetry} />);

    await userEvent.click(screen.getByText(/Try again/i));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ErrorState message="Test error" onRetry={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("ExampleScenarios", () => {
  it("renders all three example scenarios", () => {
    render(<ExampleScenarios onSelect={vi.fn()} />);

    expect(screen.getByText("Royal Indian Wedding")).toBeInTheDocument();
    expect(screen.getByText("Kids Birthday Bash")).toBeInTheDocument();
    expect(screen.getByText("Diwali Community Meetup")).toBeInTheDocument();
  });

  it("calls onSelect when scenario is clicked", async () => {
    const onSelect = vi.fn();
    render(<ExampleScenarios onSelect={onSelect} />);

    await userEvent.click(screen.getByText("Royal Indian Wedding"));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "wedding",
        city: "Hyderabad",
      })
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ExampleScenarios onSelect={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
