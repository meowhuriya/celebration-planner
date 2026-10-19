import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { EventInput } from "@/lib/schemas";

// Mock @google/genai before importing lib/ai
const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
  };
});

describe("AI Timeout, Retry & Fallback Plan Tests", () => {
  const sampleInput: EventInput = {
    hostName: "Aisha & Rahul",
    eventType: "wedding",
    eventDate: "2027-08-20",
    city: "Hyderabad",
    guestCount: 300,
    totalBudget: 2500000,
    currency: "INR",
    vibeOrTheme: "Royal Mughal elegance",
    cultureOrTradition: "Nikah & Sangeet",
    specialRequirements: "Vegetarian options",
  };

  const sampleValidAiResponse = {
    text: JSON.stringify({
      budget: [
        {
          category: "Venue",
          amount: 1000000,
          percentage: 40,
          notes: "Grand hall",
        },
        {
          category: "Catering",
          amount: 750000,
          percentage: 30,
          notes: "Dinner banquet",
        },
        {
          category: "Decor",
          amount: 375000,
          percentage: 15,
          notes: "Floral staging",
        },
        {
          category: "Photography",
          amount: 250000,
          percentage: 10,
          notes: "Full team coverage",
        },
        {
          category: "Contingency",
          amount: 125000,
          percentage: 5,
          notes: "Emergency buffer",
        },
      ],
      timeline: [
        {
          title: "Book Venue",
          dueDate: "2027-02-20",
          daysBeforeEvent: 180,
          description: "Confirm venue contract",
          completed: false,
        },
      ],
      vendorChecklist: [
        {
          vendorType: "Caterer",
          questionsToAsk: ["Tasting menu?"],
          estimatedCost: "₹7.5L",
          priority: "high",
          checked: false,
        },
      ],
      ideas: {
        theme: "Royal Mughal Elegance",
        decor: [
          "Jasmine floral arch",
          "Brass lanterns",
          "Velvet drapes",
          "Fountain lights",
        ],
        food: [
          "Dum Biryani",
          "Mirchi Ka Salan",
          "Double Ka Meetha",
          "Shahi Tukda",
        ],
        activities: [
          "Sangeet dance",
          "Live Qawwali",
          "Attar bar",
          "Photo booth",
        ],
        culturalNotes:
          "Include Haldi morning ceremony and prepare rain backup for outdoor courtyard.",
      },
      runSheet: [
        {
          time: "10:00 AM",
          activity: "Haldi Ceremony",
          owner: "Family elders",
          notes: "Courtyard area",
        },
      ],
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "AQ.MockApiKeyForTimeoutTest1234567890";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries on first attempt failure and returns successful plan on second attempt", async () => {
    const { generateEventPlan } = await import("@/lib/ai");

    // Attempt 1 fails with timeout/error, attempt 2 succeeds
    mockGenerateContent
      .mockRejectedValueOnce(new Error("Gemini request timed out after 25s"))
      .mockResolvedValueOnce(sampleValidAiResponse);

    const plan = await generateEventPlan(sampleInput);

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(plan.isFallback).toBe(false);
    expect(plan.budget.length).toBeGreaterThan(0);
    // Budget must sum exactly to sampleInput.totalBudget
    const sum = plan.budget.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(sampleInput.totalBudget);
  });

  it("returns friendly fallback plan after 2 failed/timed-out attempts", async () => {
    const { generateEventPlan } = await import("@/lib/ai");

    // Both attempts fail
    mockGenerateContent
      .mockRejectedValueOnce(new Error("Gemini request timed out after 25s"))
      .mockRejectedValueOnce(new Error("Gemini request timed out after 25s"));

    const plan = await generateEventPlan(sampleInput);

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(plan.isFallback).toBe(true);
    expect(plan.fallbackReason).toBeDefined();
    expect(plan.budget.length).toBeGreaterThanOrEqual(6);
    // Budget sum invariant strictly preserved
    const sum = plan.budget.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(sampleInput.totalBudget);
  });

  it("regenerateSection retries on first failure and falls back cleanly if both fail", async () => {
    const { regenerateSection } = await import("@/lib/ai");

    mockGenerateContent
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockRejectedValueOnce(new Error("Network timeout"));

    const result = await regenerateSection("budget", sampleInput);

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(result.budget).toBeDefined();
    expect(result.budget!.length).toBeGreaterThanOrEqual(6);
    const sum = result.budget!.reduce((acc, c) => acc + c.amount, 0);
    expect(sum).toBe(sampleInput.totalBudget);
  });

  it("never includes API key in error messages or logs", async () => {
    const { generateEventPlan } = await import("@/lib/ai");

    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    mockGenerateContent
      .mockRejectedValueOnce(
        new Error(`Failed with key=${process.env.GEMINI_API_KEY}`)
      )
      .mockRejectedValueOnce(
        new Error(`Failed with key=${process.env.GEMINI_API_KEY}`)
      );

    const plan = await generateEventPlan(sampleInput);

    expect(plan.isFallback).toBe(true);
    expect(plan.fallbackReason).not.toContain(process.env.GEMINI_API_KEY);

    // Check all logged warnings to ensure key is redacted
    for (const call of consoleWarnSpy.mock.calls) {
      const logged = call.join(" ");
      expect(logged).not.toContain("AQ.MockApiKeyForTimeoutTest1234567890");
    }

    consoleWarnSpy.mockRestore();
  });
});
