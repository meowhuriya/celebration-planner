import { z } from "zod";
import { MAX_GUESTS, MAX_NAME_LENGTH } from "./sanitize";

export const guestSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(
      MAX_NAME_LENGTH,
      `Name must be ${MAX_NAME_LENGTH} characters or fewer`
    ),
  group: z.string().max(MAX_NAME_LENGTH).optional(),
  rsvpStatus: z.enum(["pending", "yes", "no", "maybe"]).optional(),
  partySize: z.number().int().min(0).max(5).optional(),
  foodChoice: z.enum(["vegetarian", "non-vegetarian", "either"]).optional(),
  note: z.string().max(140).optional(),
});

export const seatingPlanSchema = z.object({
  version: z.literal(1).default(1),
  seatsPerTable: z
    .union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)])
    .default(8),
  guests: z
    .array(guestSchema)
    .max(MAX_GUESTS, `Maximum of ${MAX_GUESTS} guests supported`),
  assignments: z.record(z.string(), z.string()).default({}),
});

export type SeatingPlanSchemaType = z.infer<typeof seatingPlanSchema>;
