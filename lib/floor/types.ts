export const VENUE_TYPES = [
  "banquet hall",
  "garden",
  "courtyard",
  "rooftop",
  "community hall",
] as const;

export type VenueType = (typeof VENUE_TYPES)[number];

export const ITEM_TYPES = [
  "roundTable",
  "longTable",
  "stage",
  "danceFloor",
  "buffet",
  "bar",
  "entrance",
  "mandap",
  "photoBooth",
  "pillar",
  "zone",
] as const;

export type FloorItemType = (typeof ITEM_TYPES)[number];

export interface Room {
  widthM: number;
  heightM: number;
  venueType: VenueType;
}

export interface FloorItem {
  id: string;
  type: FloorItemType;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // in degrees, e.g. 0, 15, 45, 90
  locked: boolean;
  seats?: number;
}

export type UnitSystem = "m" | "ft";

export const METERS_TO_FEET = 3.28084;

export interface SeatPosition {
  seatIndex: number;
  x: number;
  y: number;
  angleDeg: number;
}

export interface ClearanceViolation {
  type: "overlap" | "out_of_bounds" | "table_gap" | "entrance_blocked";
  severity: "error" | "warning";
  itemIds: string[];
  message: string;
}

export interface AreaPerGuestResult {
  areaM2: number;
  areaPerGuestM2: number;
  isTight: boolean;
  warning?: string;
}

export type SeatAssignments = Record<string, Record<number, string>>;

export interface FloorEditorSnapshot {
  room: Room;
  items: FloorItem[];
  assignments: SeatAssignments;
  unseatedGuests: string[];
}

export interface FloorEditorState extends FloorEditorSnapshot {
  selectedId: string | null;
  unit: UnitSystem;
  snapEnabled: boolean;
  past: FloorEditorSnapshot[];
  future: FloorEditorSnapshot[];
}
