import { z } from "zod";

export const eventEssentialsSchema = z.object({
  h: z.string().max(300).optional().default(""),
  t: z.string().max(100).optional().default("celebration"),
  d: z.string().max(100).optional().default(""),
  c: z.string().max(200).optional().default(""),
  v: z.string().max(500).optional().or(z.literal("")),
  th: z.string().max(1000).optional().or(z.literal("")),
  dc: z.string().max(300).optional().or(z.literal("")),
  p: z.array(z.string()).optional(),
  s: z.enum(["royal", "modern", "floral"]).optional().default("royal"),
  ph: z.string().max(40).optional().or(z.literal("")),
});

export const guestEssentialsSchema = z.object({
  id: z.string().min(1).max(128),
  n: z.string().min(1).max(160),
  grp: z.string().max(128).optional().or(z.literal("")),
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
