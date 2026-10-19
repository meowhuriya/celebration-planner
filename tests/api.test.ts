import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the AI module before importing the route
vi.mock("@/lib/ai", () => ({
  generateEventPlan: vi.fn(),
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

// Import after mock
import { POST } from "@/app/api/generate/route";
import { generateEventPlan, checkRateLimit } from "@/lib/ai";

const mockGenerateEventPlan = vi.mocked(generateEventPlan);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

const validBody = {
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

const validPlan = {
  budget: [
    { category: "Venue", amount: 1500000, percentage: 50, notes: "Main hall" },
    {
      category: "Catering",
      amount: 1500000,
      percentage: 50,
      notes: "Full service",
    },
  ],
  timeline: [
    {
      title: "Book venue",
      dueDate: "2027-03-15",
      daysBeforeEvent: 90,
      description: "Finalize venue",
      completed: false,
    },
  ],
  vendorChecklist: [
    {
      vendorType: "Photographer",
      questionsToAsk: ["Portfolio?"],
      estimatedCost: "50,000 INR",
      priority: "high" as const,
      checked: false,
    },
  ],
  ideas: {
    theme: "Royal wedding",
    decor: ["Flowers"],
    food: ["Biryani"],
    activities: ["Dance"],
    culturalNotes: "Nikah customs",
  },
  runSheet: [
    {
      time: "09:00",
      activity: "Setup",
      owner: "Coordinator",
      notes: "",
    },
  ],
};

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
  });

  it("returns a valid plan for valid input", async () => {
    mockGenerateEventPlan.mockResolvedValue(validPlan);

    const req = createRequest(validBody);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.plan).toBeDefined();
    expect(data.plan.budget).toHaveLength(2);
  });

  it("returns 400 for invalid input", async () => {
    const req = createRequest({ eventType: "invalid" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue(false);

    const req = createRequest(validBody);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toContain("Too many requests");
  });

  it("handles AI returning invalid JSON gracefully with fallback plan", async () => {
    // When AI returns invalid JSON, generateEventPlan resolves with fallback plan
    const fallbackPlan = {
      ...validPlan,
      ideas: { ...validPlan.ideas, theme: "Fallback Celebration Theme" },
    };
    mockGenerateEventPlan.mockResolvedValue(fallbackPlan);

    const req = createRequest(validBody);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.plan).toBeDefined();
    expect(data.plan.ideas.theme).toBe("Fallback Celebration Theme");
  });

  it("serves friendly fallback plan when AI generation throws an error", async () => {
    mockGenerateEventPlan.mockRejectedValue(
      new Error("AI service temporary outage")
    );

    const req = createRequest(validBody);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.plan).toBeDefined();
    expect(data.plan.isFallback).toBe(true);
    expect(data.plan.budget.length).toBeGreaterThan(0);
  });

  it("never leaks API key in error messages on bad request body", async () => {
    // Malformed request that fails outer try block
    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json{",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).not.toContain("GEMINI_API_KEY");
    expect(data.error).toBe("Failed to generate event plan. Please try again.");
  });

  it("rejects oversized input", async () => {
    const req = createRequest({
      ...validBody,
      specialRequirements: "a".repeat(501),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("rejects prompt injection in city field", async () => {
    const req = createRequest({
      ...validBody,
      city: "DROP TABLE users;--",
    });
    const res = await POST(req);

    // The city field regex rejects non-letter characters like semicolons
    expect(res.status).toBe(400);
  });
});
