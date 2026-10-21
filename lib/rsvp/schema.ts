import { z } from "zod";

export const eventEssentialsSchema = z.object({
  h: z.string().max(100).optional().default(""),
  t: z.string().max(40),
  d: z.string().max(30).optional().default(""),
  c: z.string().max(100).optional().default(""),
  v: z.string().max(80).optional(),
  th: z.string().max(200).optional(),
  dc: z.string().max(60).optional(),
  p: z
    .array(
      z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colors must be 6-digit hex format")
    )
    .length(4)
    .optional(),
  s: z.enum(["royal", "modern", "floral"]).optional().default("royal"),
  ph: z
    .string()
    .regex(/^\d{8,15}$/, "Phone must be 8 to 15 digits")
    .optional(),
});

export const guestEssentialsSchema = z.object({
  id: z.string().min(1).max(64),
  n: z.string().min(1).max(80),
  grp: z.string().max(80).optional(),
});

export const invitePayloadSchema = z.object({
  v: z.literal(1),
  e: eventEssentialsSchema,
  g: guestEssentialsSchema,
});

export const hostPhoneSchema = z
  .string()
  .regex(/^\d{8,15}$/, "Host WhatsApp number must be 8 to 15 digits only");

export const replyCodeLineSchema = z.object({
  prefix: z.literal("RSVP1"),
  guestId: z.string().min(1).max(64),
  status: z.enum(["Y", "N", "M"]),
  partySize: z.number().int().min(0).max(5),
  foodChoice: z.enum(["veg", "nonveg", "either", "none"]),
  note: z.string().max(140).optional(),
});
