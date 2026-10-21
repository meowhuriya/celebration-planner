import { z } from "zod";
import type { Design } from "./types";
import { SIZE_PRESETS } from "./types";

export const sizePresetSchema = z.enum(["whatsapp", "story", "square", "a5"]);

export const backgroundConfigSchema = z.object({
  type: z.enum(["solid", "gradient", "pattern"]),
  color: z.string().optional(),
  gradient: z
    .object({
      from: z.string(),
      to: z.string(),
      direction: z.enum(["vertical", "horizontal", "radial"]),
    })
    .optional(),
  pattern: z
    .enum(["none", "rangoli-dots", "damask", "confetti", "stripes"])
    .optional(),
  patternColor: z.string().optional(),
  patternScale: z.number().min(0.1).max(10).optional(),
});

const baseElementSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  w: z.number().min(1),
  h: z.number().min(1),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
  name: z.string().optional(),
});

export const textElementSchema = baseElementSchema.extend({
  type: z.literal("text"),
  text: z.string().max(300, "Text must be 300 characters or fewer"),
  fontFamily: z.string().default("Instrument Serif"),
  fontSize: z.number().min(8).max(300).default(36),
  color: z.string().default("#2B1B14"),
  align: z.enum(["left", "center", "right"]).default("center"),
  letterSpacing: z.number().default(0),
  lineHeight: z.number().default(1.2),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
});

export const shapeElementSchema = baseElementSchema.extend({
  type: z.literal("shape"),
  shapeType: z.enum(["rectangle", "circle", "arch", "line"]),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().min(0).max(100).optional(),
  rx: z.number().min(0).max(1000).optional(),
});

export const stickerElementSchema = baseElementSchema.extend({
  type: z.literal("sticker"),
  stickerType: z.enum([
    "marigold",
    "jasmine",
    "rose",
    "diya",
    "lantern",
    "balloon",
    "confetti",
    "mandala",
    "paisley",
    "frame",
  ]),
  color: z.string().optional(),
  secondaryColor: z.string().optional(),
  seed: z.number().optional(),
});

export const tokenElementSchema = baseElementSchema.extend({
  type: z.literal("token"),
  tokenType: z.enum([
    "hostNames",
    "eventTitle",
    "date",
    "city",
    "venue",
    "guestName",
    "qr",
  ]),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(8).max(300).optional(),
  color: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  qrPadding: z.number().min(0).max(100).optional(),
});

export const studioElementSchema = z.discriminatedUnion("type", [
  textElementSchema,
  shapeElementSchema,
  stickerElementSchema,
  tokenElementSchema,
]);

export const designSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().max(80),
  sizePreset: sizePresetSchema,
  width: z.number().positive(),
  height: z.number().positive(),
  background: backgroundConfigSchema,
  elements: z
    .array(studioElementSchema)
    .max(60, "Designs cannot exceed 60 elements"),
  updatedAt: z.string().optional(),
});

/**
 * Validates and safely parses a design object.
 * Returns null if invalid or corrupted.
 */
export function validateDesign(raw: unknown): Design | null {
  const result = designSchema.safeParse(raw);
  if (!result.success) {
    return null;
  }
  return result.data as Design;
}

/**
 * Creates a clean default blank design.
 */
export function createBlankDesign(
  sizePreset: "whatsapp" | "story" | "square" | "a5" = "whatsapp"
): Design {
  const preset = SIZE_PRESETS[sizePreset];
  return {
    version: 1,
    id: `design-${Date.now()}`,
    name: "Blank Canvas",
    sizePreset,
    width: preset.width,
    height: preset.height,
    background: {
      type: "solid",
      color: "#FFFDF8",
    },
    elements: [],
    updatedAt: new Date().toISOString(),
  };
}
