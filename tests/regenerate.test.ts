import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/ai", () => ({
  regenerateSection: vi.fn(),
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

import { POST } from "@/app/api/regenerate/route";
import { regenerateSection, checkRateLimit } from "@/lib/ai";

const mockRegenerateSection = vi.mocked(regenerateSection);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

const validEventInput = {
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

function createRegenRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
  });

  it("regenerates budget section successfully", async () => {
    const mockBudgetSection = {
      budget: [
        {
          category: "Venue",
          amount: 1500000,
          percentage: 50,
          notes: "New venue",
        },
        {
          category: "Catering",
          amount: 1500000,
          percentage: 50,
          notes: "New catering",
        },
      ],
    };
    mockRegenerateSection.mockResolvedValue(mockBudgetSection);

    const req = createRegenRequest({
      section: "budget",
      eventInput: validEventInput,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.section.budget).toHaveLength(2);
  });

  it("returns 400 for invalid section name", async () => {
    const req = createRegenRequest({
      section: "invalid_section",
      eventInput: validEventInput,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue(false);

    const req = createRegenRequest({
      section: "timeline",
      eventInput: validEventInput,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toContain("Too many requests");
  });

  it("returns 500 with safe error message when AI call fails", async () => {
    mockRegenerateSection.mockRejectedValue(new Error("AI generation failure"));

    const req = createRegenRequest({
      section: "ideas",
      eventInput: validEventInput,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to regenerate section. Please try again.");
  });
});
