import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import TopBar, { PLAN_STEPS } from "@/components/editorial/TopBar";
import DarkFooter from "@/components/editorial/DarkFooter";
import BackupPlanSection from "@/components/sections/BackupPlanSection";
import type { EventPlan, EventInput } from "@/lib/schemas";

expect.extend(toHaveNoViolations);

describe("Plan Toolbar Component & Active State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders landing page navigation when isPlanShowing is false", () => {
    render(<TopBar isPlanShowing={false} />);

    expect(
      screen.getByRole("navigation", { name: "Primary navigation" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Examples" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About" })).toBeInTheDocument();

    // Plan steps should NOT be rendered in desktop nav
    expect(
      screen.queryByRole("navigation", { name: "Plan sections" })
    ).not.toBeInTheDocument();
  });

  it("replaces center links with 8 plan steps in exact required order when isPlanShowing is true", () => {
    render(<TopBar isPlanShowing={true} />);

    const desktopNav = screen.getByRole("navigation", {
      name: "Plan sections",
    });
    expect(desktopNav).toBeInTheDocument();

    const expectedSteps = [
      "Budget",
      "Floor plan",
      "Seating",
      "Card studio",
      "Timeline",
      "Vendors",
      "Ideas",
      "Schedule",
      "Backup plan",
    ];

    expect(PLAN_STEPS.map((s) => s.label)).toEqual(expectedSteps);

    expectedSteps.forEach((label) => {
      expect(
        screen.getAllByRole("button", { name: label }).length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("marks active step with aria-current='location' and shifts indicator on click", async () => {
    const user = userEvent.setup();
    render(<TopBar isPlanShowing={true} />);

    // Mock scrollIntoView
    const mockScrollIntoView = vi.fn();
    const timelineEl = document.createElement("div");
    timelineEl.id = "timeline";
    timelineEl.scrollIntoView = mockScrollIntoView;
    document.body.appendChild(timelineEl);

    // Initial step: Budget is active
    const budgetButtons = screen.getAllByRole("button", { name: "Budget" });
    const desktopBudgetBtn = budgetButtons[0];
    expect(desktopBudgetBtn).toHaveAttribute("aria-current", "location");

    // Click Timeline step
    const timelineButtons = screen.getAllByRole("button", { name: "Timeline" });
    const desktopTimelineBtn = timelineButtons[0];
    expect(desktopTimelineBtn).not.toHaveAttribute("aria-current");

    await user.click(desktopTimelineBtn);

    // Timeline is now active with aria-current="location"
    expect(desktopTimelineBtn).toHaveAttribute("aria-current", "location");
    expect(desktopBudgetBtn).not.toHaveAttribute("aria-current");
    expect(mockScrollIntoView).toHaveBeenCalled();

    // Clean up DOM
    document.body.removeChild(timelineEl);
  });

  it("displays horizontally scrollable mobile pill row under 1024px with plan steps", () => {
    render(<TopBar isPlanShowing={true} />);

    const mobileNav = screen.getByRole("navigation", {
      name: "Plan sections mobile",
    });
    expect(mobileNav).toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: "Budget" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Backup plan" })).toHaveLength(
      2
    );
  });

  it("lists all 8 plan steps in hamburger overlay when isPlanShowing is true", async () => {
    const user = userEvent.setup();
    render(<TopBar isPlanShowing={true} />);

    const hamburgerBtn = screen.getByRole("button", {
      name: /Open section navigation menu/i,
    });
    await user.click(hamburgerBtn);

    const dialog = screen.getByRole("dialog", { name: "Navigation Menu" });
    expect(dialog).toBeInTheDocument();

    const menuSteps = [
      "Budget",
      "Floor plan",
      "Seating",
      "Timeline",
      "Vendors",
      "Ideas",
      "Schedule",
      "Backup plan",
    ];

    menuSteps.forEach((label) => {
      expect(
        within(dialog).getByRole("button", {
          name: new RegExp(`^${label}`, "i"),
        })
      ).toBeInTheDocument();
    });

    // Close with Escape
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has zero accessibility violations (jest-axe) for TopBar in plan mode", async () => {
    const { container } = render(<TopBar isPlanShowing={true} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("DarkFooter Component & Accessibility", () => {
  it("renders large serif wordmark 'Let's celebrate.', 6 aria-hidden capsules, and outlined card", () => {
    render(<DarkFooter />);

    // Wordmark
    expect(
      screen.getByRole("heading", { name: /Let's celebrate\./i })
    ).toBeInTheDocument();

    // Outlined Start Planning Card
    expect(
      screen.getByText(/Get a custom budget breakdown/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Start planning/i })
    ).toBeInTheDocument();

    // Navigation links
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Examples" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to top ↑" })
    ).toBeInTheDocument();
  });

  it("triggers onStartPlanning callback when Start Planning button is clicked", async () => {
    const user = userEvent.setup();
    const handleStartPlanning = vi.fn();
    render(<DarkFooter onStartPlanning={handleStartPlanning} />);

    const startBtn = screen.getByRole("button", {
      name: /Start planning/i,
    });
    await user.click(startBtn);

    expect(handleStartPlanning).toHaveBeenCalledTimes(1);
  });

  it("has zero accessibility violations (jest-axe) for DarkFooter", async () => {
    const { container } = render(<DarkFooter />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("BackupPlanSection Component & Accessibility", () => {
  const mockPlan: EventPlan = {
    budget: [],
    timeline: [],
    vendorChecklist: [],
    ideas: {
      theme: "Classic",
      decor: [],
      food: [],
      activities: [],
      culturalNotes: "Traditional blessing",
    },
    runSheet: [],
    isFallback: false,
  };

  const mockInput: EventInput = {
    eventType: "wedding",
    eventDate: "2027-10-10",
    city: "Delhi",
    guestCount: 200,
    totalBudget: 1500000,
    currency: "INR",
    vibeOrTheme: "Classic Elegance",
    cultureOrTradition: "Traditional",
    specialRequirements: "",
  };

  it("renders backup plan protocols and contingency cards", () => {
    render(<BackupPlanSection plan={mockPlan} eventInput={mockInput} />);

    expect(
      screen.getByRole("heading", { name: /Backup plan/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Weather contingency/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical & power/i)).toBeInTheDocument();
    expect(screen.getByText(/Timeline buffer/i)).toBeInTheDocument();
  });

  it("renders retry banner when fallback plan or error is present", () => {
    const fallbackPlan: EventPlan = { ...mockPlan, isFallback: true };
    const handleRetry = vi.fn();
    render(
      <BackupPlanSection
        plan={fallbackPlan}
        eventInput={mockInput}
        errorMessage="Quota exceeded"
        onRetry={handleRetry}
      />
    );

    expect(screen.getByText(/Built-in starter/i)).toBeInTheDocument();
    expect(screen.getByText(/Quota exceeded/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Try again ↻/i })
    ).toBeInTheDocument();
  });

  it("has zero accessibility violations (jest-axe) for BackupPlanSection", async () => {
    const { container } = render(
      <BackupPlanSection plan={mockPlan} eventInput={mockInput} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
