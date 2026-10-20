import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import SavedPlans from "@/components/SavedPlans";
import * as storage from "@/lib/storage";
import type { EventInput, EventPlan } from "@/lib/schemas";

expect.extend(toHaveNoViolations);

describe("SavedPlans", () => {
  const sampleInput: EventInput = {
    eventType: "wedding",
    eventDate: "2027-06-15",
    city: "Hyderabad",
    guestCount: 500,
    totalBudget: 3000000,
    currency: "INR",
    vibeOrTheme: "Royal",
    cultureOrTradition: "Nikah",
    specialRequirements: "None",
  };

  const samplePlan: EventPlan = {
    budget: [
      { category: "Venue", amount: 3000000, percentage: 100, notes: "" },
    ],
    timeline: [
      {
        title: "Book Venue",
        dueDate: "2027-05-01",
        daysBeforeEvent: 45,
        description: "Contract",
        completed: false,
      },
    ],
    vendorChecklist: [
      {
        vendorType: "Caterer",
        questionsToAsk: ["Deposit?"],
        estimatedCost: "₹1,00,000",
        priority: "high",
        checked: false,
      },
    ],
    ideas: {
      theme: "Royal",
      decor: ["Roses"],
      food: ["Biryani"],
      activities: ["Qawwali"],
      culturalNotes: "Traditional",
    },
    runSheet: [{ time: "09:00", activity: "Setup", owner: "Lead", notes: "" }],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty state guidance when no plans are saved", () => {
    render(<SavedPlans onLoad={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: /Saved plans/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/No saved plans yet/i)).toBeInTheDocument();
  });

  it("renders saved plans when present in storage", () => {
    storage.savePlan(sampleInput, samplePlan, "Hyderabad Royal Wedding");

    render(<SavedPlans onLoad={vi.fn()} />);
    expect(screen.getByText("Hyderabad Royal Wedding")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Load plan: Hyderabad Royal Wedding/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Delete plan: Hyderabad Royal Wedding/i,
      })
    ).toBeInTheDocument();
  });

  it("triggers onLoad when load button is clicked", async () => {
    const handleLoad = vi.fn();
    storage.savePlan(sampleInput, samplePlan, "Hyderabad Royal Wedding");

    render(<SavedPlans onLoad={handleLoad} />);
    const loadButton = screen.getByRole("button", {
      name: /Load plan: Hyderabad Royal Wedding/i,
    });
    await userEvent.click(loadButton);

    expect(handleLoad).toHaveBeenCalledOnce();
  });

  it("deletes a saved plan when delete button is clicked", async () => {
    storage.savePlan(sampleInput, samplePlan, "To Be Deleted");

    render(<SavedPlans onLoad={vi.fn()} />);
    expect(screen.getByText("To Be Deleted")).toBeInTheDocument();

    const deleteButton = screen.getByRole("button", {
      name: /Delete plan: To Be Deleted/i,
    });
    await userEvent.click(deleteButton);

    expect(screen.queryByText("To Be Deleted")).not.toBeInTheDocument();
  });

  it("has no accessibility violations in empty state", async () => {
    const { container } = render(<SavedPlans onLoad={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations with saved plans", async () => {
    storage.savePlan(sampleInput, samplePlan, "Accessible Plan");
    const { container } = render(<SavedPlans onLoad={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
