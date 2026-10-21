export type RsvpStatus = "pending" | "yes" | "no" | "maybe";
export type FoodChoice = "vegetarian" | "non-vegetarian" | "either";

export interface Guest {
  id: string;
  name: string;
  group?: string;
  rsvpStatus?: RsvpStatus;
  partySize?: number;
  foodChoice?: FoodChoice;
  note?: string;
}

export type SeatKey = string; // e.g. "1-0", "1-1" formatted as `${tableNumber}-${seatIndex}`

export interface SeatPosition {
  tableNumber: number;
  seatIndex: number;
  seatKey: SeatKey;
  x: number;
  y: number;
}

export interface TableCircleInput {
  tableNumber?: number;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  radius?: number;
  r?: number;
  seats?: number;
}

export interface SeatingState {
  guests: Guest[];
  assignments: Record<SeatKey, string>; // seatKey -> guestId
  seatsPerTable: number; // 6, 8, 10, 12
}

export interface AutoSeatResult {
  assignments: Record<SeatKey, string>;
  unseatedGuests: Guest[];
  seatedCount: number;
  totalCapacity: number;
}
