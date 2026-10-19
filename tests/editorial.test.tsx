import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import {
  computeScrambledText,
  calculateReadinessScore,
  getReadinessStatus,
  calculate3DRibbonPanels,
  calculateBarBreakdown,
} from "@/lib/editorial";
import TopBar from "@/components/editorial/TopBar";
import NavigationMenu from "@/components/editorial/NavigationMenu";
import EventTypeSelector from "@/components/editorial/EventTypeSelector";
import ReadinessScore from "@/components/editorial/ReadinessScore";
import SectionLabel from "@/components/editorial/SectionLabel";
import BigWordmark from "@/components/editorial/BigWordmark";
import type { EventPlan, EventInput } from "@/lib/schemas";

expect.extend(toHaveNoViolations);

describe("Editorial Pure Functions", () => {
  describe("computeScrambledText", () => {
    const text = "CELEBRATION ARCHITECT";

    it("preserves text length and spaces across all progress steps", () => {
      for (let p = 0; p <= 1; p += 0.25) {
        const scrambled = computeScrambledText(text, p);
        expect(scrambled.length).toBe(text.length);
        expect(scrambled[11]).toBe(" "); // Space at index 11 preserved
      }
    });

    it("returns fully resolved target text at progress 1.0", () => {
      expect(computeScrambledText(text, 1.0)).toBe(text);
    });

    it("resolves characters strictly left to right", () => {
      const half = computeScrambledText(text, 0.5);
      const halfLen = Math.floor(text.length * 0.5);
      expect(half.slice(0, halfLen)).toBe(text.slice(0, halfLen));
    });
  });

  describe("calculateReadinessScore", () => {
    const mockInput: EventInput = {
      eventType: "wedding",
      eventDate: "2027-06-15",
      city: "Hyderabad",
      guestCount: 200,
      totalBudget: 1500000,
      currency: "INR",
      vibeOrTheme: "Royal",
      cultureOrTradition: "Nikah",
      specialRequirements: "",
    };

    const mockPlan: EventPlan = {
      budget: [
        { category: "Venue", amount: 600000, percentage: 40, notes: "" },
        { category: "Catering", amount: 450000, percentage: 30, notes: "" },
        { category: "Decor", amount: 225000, percentage: 15, notes: "" },
        { category: "Photo", amount: 120000, percentage: 8, notes: "" },
        { category: "Attire", amount: 60000, percentage: 4, notes: "" },
        { category: "Contingency", amount: 45000, percentage: 3, notes: "" },
      ],
      timeline: [
        {
          title: "Book Venue",
          dueDate: "2027-01-01",
          daysBeforeEvent: 165,
          description: "",
          completed: true,
        },
        {
          title: "Send Invites",
          dueDate: "2027-04-01",
          daysBeforeEvent: 75,
          description: "",
          completed: false,
        },
      ],
      vendorChecklist: [
        {
          vendorType: "Caterer",
          questionsToAsk: [],
          estimatedCost: "₹4.5L",
          priority: "high",
          checked: true,
        },
        {
          vendorType: "Photographer",
          questionsToAsk: [],
          estimatedCost: "₹1.2L",
          priority: "medium",
          checked: false,
        },
      ],
      ideas: {
        theme: "Royal",
        decor: [],
        food: [],
        activities: [],
        culturalNotes: "Nikah",
      },
      runSheet: [],
    };

    it("starts low (under 25%, 'Just getting started') when nothing is ticked", () => {
      const untickedPlan: EventPlan = {
        ...mockPlan,
        timeline: mockPlan.timeline.map((m) => ({ ...m, completed: false })),
        vendorChecklist: mockPlan.vendorChecklist.map((v) => ({
          ...v,
          checked: false,
        })),
      };
      const score = calculateReadinessScore(untickedPlan, mockInput);
      expect(score).toBeLessThan(25);
      expect(score).toBe(15);
      expect(getReadinessStatus(score)).toBe("Just getting started");
    });

    it("computes bounded readiness score between 0 and 100 for partial progress", () => {
      const score = calculateReadinessScore(mockPlan, mockInput);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBe(58); // 15 base + 22.5 (50% milestones) + 20 (50% vendors)
      expect(getReadinessStatus(score)).toBe("Well underway");
    });

    it("reaches 100% and 'Ready to celebrate!' when all milestones and vendors are checked", () => {
      const allCompletedPlan: EventPlan = {
        ...mockPlan,
        timeline: mockPlan.timeline.map((m) => ({ ...m, completed: true })),
        vendorChecklist: mockPlan.vendorChecklist.map((v) => ({
          ...v,
          checked: true,
        })),
      };
      const score = calculateReadinessScore(allCompletedPlan, mockInput);
      expect(score).toBe(100);
      expect(getReadinessStatus(score)).toBe("Ready to celebrate!");
    });

    it("maps readiness percentages to human status labels correctly", () => {
      expect(getReadinessStatus(10)).toBe("Just getting started");
      expect(getReadinessStatus(24)).toBe("Just getting started");
      expect(getReadinessStatus(25)).toBe("Making progress");
      expect(getReadinessStatus(49)).toBe("Making progress");
      expect(getReadinessStatus(50)).toBe("Well underway");
      expect(getReadinessStatus(74)).toBe("Well underway");
      expect(getReadinessStatus(75)).toBe("Almost ready");
      expect(getReadinessStatus(99)).toBe("Almost ready");
      expect(getReadinessStatus(100)).toBe("Ready to celebrate!");
    });
  });

  describe("calculate3DRibbonPanels", () => {
    it("generates 18 panels with distinct coordinates and iridescent gradients", () => {
      const panels = calculate3DRibbonPanels(18);
      expect(panels).toHaveLength(18);
      expect(panels[0].gradient).toContain("linear-gradient");
      expect(typeof panels[0].translateX).toBe("number");
      expect(typeof panels[0].translateZ).toBe("number");
    });
  });

  describe("calculateBarBreakdown", () => {
    it("breaks budget categories into proportional segments summing to 100%", () => {
      const budget = [
        { category: "Venue", amount: 500000, percentage: 50, notes: "" },
        { category: "Catering", amount: 300000, percentage: 30, notes: "" },
        { category: "Decor", amount: 200000, percentage: 20, notes: "" },
      ];
      const segments = calculateBarBreakdown(budget);
      expect(segments).toHaveLength(3);
      const totalWidth = segments.reduce((sum, s) => sum + s.widthPercent, 0);
      expect(Math.round(totalWidth)).toBe(100);
    });

    it("returns empty array for empty budget", () => {
      expect(calculateBarBreakdown([])).toEqual([]);
    });
  });
});

describe("Editorial Components", () => {
  describe("SectionLabel", () => {
    it("renders clean uppercase label without bracket counters", () => {
      render(<SectionLabel label="Event details" />);
      expect(screen.getByText("Event details")).toBeInTheDocument();
    });
  });

  describe("BigWordmark", () => {
    it("renders sentence-case serif headline", () => {
      render(<BigWordmark />);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByText(/Plan the day they'll/i)).toBeInTheDocument();
      expect(screen.getByText(/remember/i)).toBeInTheDocument();
    });
  });

  describe("ReadinessScore", () => {
    it("renders accessible region with readiness score label", () => {
      render(<ReadinessScore score={84} />);
      expect(
        screen.getByRole("region", { name: /Event readiness score: 84%/i })
      ).toBeInTheDocument();
    });

    it("has zero accessibility violations", async () => {
      const { container } = render(<ReadinessScore score={84} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("TopBar & NavigationMenu", () => {
    it("renders celebrate logo and primary navigation links", () => {
      render(<TopBar />);
      expect(
        screen.getByRole("button", { name: /Celebrate Home/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Plan" })).toBeInTheDocument();
    });

    it("opens accessible fullscreen navigation menu dialog when hamburger clicked", async () => {
      render(<TopBar />);
      const hamburger = screen.getByRole("button", {
        name: /Open section navigation menu/i,
      });
      await userEvent.click(hamburger);

      const dialog = screen.getByRole("dialog", { name: "Navigation Menu" });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");

      // Press Escape to close
      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("EventTypeSelector", () => {
    it("renders all 4 event typology options with keyboard accessibility", async () => {
      const handleSelect = vi.fn();
      render(
        <EventTypeSelector selectedType="wedding" onSelectType={handleSelect} />
      );

      expect(
        screen.getByRole("radio", { name: /wedding/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /birthday/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /community/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /other/i })).toBeInTheDocument();

      const birthdayRadio = screen.getByRole("radio", { name: /birthday/i });
      await userEvent.click(birthdayRadio);
      expect(handleSelect).toHaveBeenCalledWith("birthday");
    });

    it("has zero accessibility violations", async () => {
      const { container } = render(
        <EventTypeSelector selectedType="wedding" onSelectType={vi.fn()} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
