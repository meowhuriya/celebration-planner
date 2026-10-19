import { describe, it, expect } from "vitest";
import { generateFallbackPlan } from "@/lib/fallback";
import { eventPlanSchema } from "@/lib/schemas";
import type { EventInput } from "@/lib/schemas";

describe("generateFallbackPlan", () => {
  const weddingInput: EventInput = {
    eventType: "wedding",
    eventDate: "2027-08-15",
    city: "Jaipur",
    guestCount: 350,
    totalBudget: 2500000,
    currency: "INR",
    vibeOrTheme: "Royal Heritage",
    cultureOrTradition: "Sangeet & Haldi",
    specialRequirements: "Vegetarian only",
  };

  const birthdayInput: EventInput = {
    eventType: "birthday",
    eventDate: "2027-04-10",
    city: "Bengaluru",
    guestCount: 60,
    totalBudget: 120000,
    currency: "INR",
    vibeOrTheme: "Space Astronaut",
    cultureOrTradition: "",
    specialRequirements: "",
  };

  const communityInput: EventInput = {
    eventType: "community",
    eventDate: "2027-10-20",
    city: "Kolkata",
    guestCount: 400,
    totalBudget: 600000,
    currency: "INR",
    vibeOrTheme: "Durga Puja cultural evening",
    cultureOrTradition: "Traditional cultural celebration",
    specialRequirements: "",
  };

  it("produces schema-valid plan for wedding input", () => {
    const plan = generateFallbackPlan(weddingInput);
    const parsed = eventPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);

    const budgetSum = plan.budget.reduce((acc, cat) => acc + cat.amount, 0);
    expect(budgetSum).toBe(weddingInput.totalBudget);
    expect(plan.ideas.theme).toContain("Royal Heritage");
  });

  it("produces schema-valid plan for birthday input", () => {
    const plan = generateFallbackPlan(birthdayInput);
    const parsed = eventPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);

    const budgetSum = plan.budget.reduce((acc, cat) => acc + cat.amount, 0);
    expect(budgetSum).toBe(birthdayInput.totalBudget);
    expect(plan.timeline.length).toBeGreaterThan(5);
  });

  it("produces schema-valid plan for community input", () => {
    const plan = generateFallbackPlan(communityInput);
    const parsed = eventPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);

    const budgetSum = plan.budget.reduce((acc, cat) => acc + cat.amount, 0);
    expect(budgetSum).toBe(communityInput.totalBudget);
    expect(plan.runSheet.length).toBeGreaterThan(5);
  });

  it("correctly sets all checklist and milestone checkboxes to false initially", () => {
    const plan = generateFallbackPlan(weddingInput);
    expect(plan.timeline.every((m) => !m.completed)).toBe(true);
    expect(plan.vendorChecklist.every((v) => !v.checked)).toBe(true);
  });
});
