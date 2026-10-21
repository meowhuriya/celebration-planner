export type RsvpStatus = "pending" | "yes" | "no" | "maybe";

export type FoodChoice = "vegetarian" | "non-vegetarian" | "either";

export interface EventEssentials {
  h?: string; // Host name(s)
  t: string; // Event type (e.g. wedding, birthday, community)
  d?: string; // Event date YYYY-MM-DD
  c?: string; // City
  v?: string; // Venue name
  th?: string; // Theme / vibe / tradition
  dc?: string; // Dress code
  p?: [string, string, string, string]; // 4 hex colors
  s?: "royal" | "modern" | "floral"; // Card style
  ph?: string; // Optional host WhatsApp phone number (digits only, 8-15)
}

export interface GuestEssentials {
  id: string; // Guest ID
  n: string; // Guest name
  grp?: string; // Optional group
}

export interface InvitePayload {
  v: 1;
  e: EventEssentials;
  g: GuestEssentials;
}

export interface ParsedReply {
  guestId: string;
  status: RsvpStatus;
  partySize: number;
  foodChoice?: FoodChoice;
  note?: string;
  rawLine: string;
}

export interface ParseResult {
  appliedCount: number;
  ignoredCount: number;
  errors: string[];
  summaryMessage: string;
}

export interface RsvpSummary {
  confirmedSeats: number;
  confirmedGuestsCount: number;
  declinedCount: number;
  maybeCount: number;
  pendingCount: number;
  vegetarianCount: number;
  nonVegetarianCount: number;
  eitherCount: number;
  totalGuests: number;
}

export interface SiteUrlInfo {
  siteUrl: string;
  isLocalOrPrivate: boolean;
  warningMessage?: string;
}
