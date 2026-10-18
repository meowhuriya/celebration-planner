import { z } from "zod";

/* ── Event Input Schema ── */

export const EVENT_TYPES = [
  "wedding",
  "birthday",
  "community",
  "other",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee (₹)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const eventInputSchema = z.object({
  hostName: z
    .string()
    .max(100, "Host name must be 100 characters or fewer")
    .regex(/^[^<>]*$/, "HTML/XML tags and angle brackets are not permitted")
    .optional(),
  eventType: z.enum(EVENT_TYPES, {
    required_error: "Please select an event type",
  }),
  eventDate: z
    .string()
    .min(1, "Event date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date format"),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be 100 characters or fewer")
    .regex(
      /^[a-zA-Z\s\-',.]+$/,
      "City must contain only letters, spaces, hyphens, apostrophes, commas, and periods"
    ),
  guestCount: z
    .number()
    .int("Guest count must be a whole number")
    .min(1, "At least 1 guest is required")
    .max(10000, "Guest count must be 10,000 or fewer"),
  totalBudget: z
    .number()
    .min(1000, "Budget must be at least 1,000")
    .max(100000000, "Budget must be 100,000,000 or fewer"),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  vibeOrTheme: z
    .string()
    .max(200, "Theme must be 200 characters or fewer")
    .regex(/^[^<>]*$/, "HTML/XML tags and angle brackets are not permitted")
    .optional()
    .default(""),
  cultureOrTradition: z
    .string()
    .max(200, "Culture/tradition must be 200 characters or fewer")
    .regex(/^[^<>]*$/, "HTML/XML tags and angle brackets are not permitted")
    .optional()
    .default(""),
  specialRequirements: z
    .string()
    .max(500, "Special requirements must be 500 characters or fewer")
    .regex(/^[^<>]*$/, "HTML/XML tags and angle brackets are not permitted")
    .optional()
    .default(""),
  venueName: z
    .string()
    .max(60, "Venue name must be 60 characters or fewer")
    .regex(/^[^<>]*$/, "HTML/XML tags and angle brackets are not permitted")
    .optional(),
  dressCode: z
    .string()
    .max(60, "Dress code must be 60 characters or fewer")
    .regex(/^[^<>]*$/, "HTML/XML tags and angle brackets are not permitted")
    .optional(),
});

export type EventInput = z.infer<typeof eventInputSchema>;

/* ── AI Response Schema ── */

export const budgetCategorySchema = z.object({
  category: z.string(),
  amount: z.number(),
  percentage: z.number(),
  notes: z.string(),
});

export type BudgetCategory = z.infer<typeof budgetCategorySchema>;

export const timelineMilestoneSchema = z.object({
  title: z.string(),
  dueDate: z.string(),
  daysBeforeEvent: z.number(),
  description: z.string(),
  completed: z.boolean().default(false),
});

export type TimelineMilestone = z.infer<typeof timelineMilestoneSchema>;

export const vendorItemSchema = z.object({
  vendorType: z.string(),
  questionsToAsk: z.array(z.string()),
  estimatedCost: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  checked: z.boolean().default(false),
});

export type VendorItem = z.infer<typeof vendorItemSchema>;

export const ideasSchema = z.object({
  theme: z.string(),
  decor: z.array(z.string()),
  food: z.array(z.string()),
  activities: z.array(z.string()),
  culturalNotes: z.string().optional().default(""),
});

export type Ideas = z.infer<typeof ideasSchema>;

export const runSheetItemSchema = z.object({
  time: z.string(),
  activity: z.string(),
  owner: z.string(),
  notes: z.string().optional().default(""),
});

export type RunSheetItem = z.infer<typeof runSheetItemSchema>;

export const paletteSchema = z.object({
  name: z.string().min(1, "Palette name is required"),
  colors: z
    .array(
      z
        .string()
        .regex(
          /^#[0-9A-Fa-f]{6}$/,
          "Must be a 6-digit hex color (e.g. #FFB300)"
        )
    )
    .length(4, "Palette must have exactly 4 hex colors"),
});

export type EventPalette = z.infer<typeof paletteSchema>;

export const eventPlanSchema = z.object({
  palette: paletteSchema.optional(),
  budget: z.array(budgetCategorySchema),
  timeline: z.array(timelineMilestoneSchema),
  vendorChecklist: z.array(vendorItemSchema),
  ideas: ideasSchema,
  runSheet: z.array(runSheetItemSchema),
  isFallback: z.boolean().optional(),
  fallbackReason: z.string().optional(),
});

export type EventPlan = z.infer<typeof eventPlanSchema>;

/* ── Section Names for Regeneration ── */

export const PLAN_SECTIONS = [
  "budget",
  "timeline",
  "vendorChecklist",
  "ideas",
  "runSheet",
] as const;

export type PlanSection = (typeof PLAN_SECTIONS)[number];

/* ── Regeneration Request Schema ── */

export const regenerateRequestSchema = z.object({
  section: z.enum(PLAN_SECTIONS),
  eventInput: eventInputSchema,
});

export type RegenerateRequest = z.infer<typeof regenerateRequestSchema>;
