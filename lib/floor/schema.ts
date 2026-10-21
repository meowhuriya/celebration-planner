import { z } from "zod";
import { VENUE_TYPES, ITEM_TYPES } from "./types";

export const venueTypeSchema = z.enum(VENUE_TYPES);

export const roomSchema = z.object({
  widthM: z
    .number()
    .min(6, "Room width must be at least 6 meters")
    .max(80, "Room width must be at most 80 meters"),
  heightM: z
    .number()
    .min(6, "Room height must be at least 6 meters")
    .max(80, "Room height must be at most 80 meters"),
  venueType: venueTypeSchema,
});

export const floorItemTypeSchema = z.enum(ITEM_TYPES);

export const floorItemSchema = z.object({
  id: z.string().min(1, "Item ID is required"),
  type: floorItemTypeSchema,
  label: z.string().max(30, "Label must be 30 characters or fewer"),
  x: z.number(),
  y: z.number(),
  w: z.number().positive("Width must be positive"),
  h: z.number().positive("Height must be positive"),
  rotation: z.number(),
  locked: z.boolean().default(false),
  seats: z.number().int().min(1).optional(),
});

export const seatAssignmentsSchema = z.record(
  z.string(),
  z.record(z.coerce.number(), z.string())
);

export const floorPlanStorageSchema = z.object({
  version: z.number().default(1),
  room: roomSchema,
  items: z.array(floorItemSchema).max(150, "Maximum of 150 items allowed"),
  assignments: seatAssignmentsSchema.default({}),
  unseatedGuests: z.array(z.string()).default([]),
});

export type FloorPlanStoragePayload = z.infer<typeof floorPlanStorageSchema>;
