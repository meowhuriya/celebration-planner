import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import VendorChecklistSection from "@/components/sections/VendorChecklistSection";
import TimelineSection from "@/components/sections/TimelineSection";
import type { VendorItem, TimelineMilestone } from "@/lib/schemas";

expect.extend(toHaveNoViolations);

describe("VendorChecklistSection", () => {
  const sampleVendors: VendorItem[] = [
    {
      vendorType: "Photographer",
      questionsToAsk: ["Do you provide raw footage?", "What is the deposit?"],
      estimatedCost: "₹50,000",
      priority: "high",
      checked: false,
    },
    {
      vendorType: "Caterer",
      questionsToAsk: ["Is tasting included?"],
      estimatedCost: "₹1,50,000",
      priority: "medium",
      checked: true,
    },
  ];

  it("renders vendor list with priority and estimated costs", () => {
    const handleUpdate = vi.fn();
    render(
      <VendorChecklistSection vendors={sampleVendors} onUpdate={handleUpdate} />
    );

    expect(screen.getByText("Photographer")).toBeInTheDocument();
    expect(screen.getByText("Caterer")).toBeInTheDocument();
    expect(screen.getByText(/high priority/i)).toBeInTheDocument();
    expect(screen.getByText(/medium priority/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 vendors/i)).toBeInTheDocument();
  });

  it("toggles checklist item on click", async () => {
    const handleUpdate = vi.fn();
    render(
      <VendorChecklistSection vendors={sampleVendors} onUpdate={handleUpdate} />
    );

    const checkbox = screen.getByLabelText('Mark "Photographer" as contacted');
    await userEvent.click(checkbox);

    expect(handleUpdate).toHaveBeenCalledOnce();
    expect(handleUpdate).toHaveBeenCalledWith([
      { ...sampleVendors[0], checked: true },
      sampleVendors[1],
    ]);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <VendorChecklistSection vendors={sampleVendors} onUpdate={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("TimelineSection", () => {
  const sampleMilestones: TimelineMilestone[] = [
    {
      title: "Book Venue",
      dueDate: "2027-05-01",
      daysBeforeEvent: 45,
      description: "Finalize contract and pay deposit",
      completed: false,
    },
    {
      title: "Final Headcount",
      dueDate: "2027-06-08",
      daysBeforeEvent: 7,
      description: "Submit headcount to caterer",
      completed: true,
    },
  ];

  it("renders milestones and progress indicator", () => {
    const handleUpdate = vi.fn();
    render(
      <TimelineSection milestones={sampleMilestones} onUpdate={handleUpdate} />
    );

    expect(screen.getByText("Book Venue")).toBeInTheDocument();
    expect(screen.getByText("Final Headcount")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 milestones completed")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("toggles milestone completion on checkbox click", async () => {
    const handleUpdate = vi.fn();
    render(
      <TimelineSection milestones={sampleMilestones} onUpdate={handleUpdate} />
    );

    const checkbox = screen.getByLabelText('Mark "Book Venue" as complete');
    await userEvent.click(checkbox);

    expect(handleUpdate).toHaveBeenCalledOnce();
    expect(handleUpdate).toHaveBeenCalledWith([
      { ...sampleMilestones[0], completed: true },
      sampleMilestones[1],
    ]);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <TimelineSection milestones={sampleMilestones} onUpdate={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
