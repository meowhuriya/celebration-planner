export const SEATS_PER_TABLE_WEDDING = 10;
export const SEATS_PER_TABLE_BIRTHDAY = 8;
export const SEATS_PER_TABLE_COMMUNITY = 8;
export const SEATS_PER_TABLE_DEFAULT = 8;

export const MAX_DISPLAYED_TABLES = 48;

export interface TableItem {
  id: number;
  tableNumber: number;
  x: number;
  y: number;
  radius: number;
  seats: number;
}

export interface VenueFeature {
  type: "stage" | "danceFloor" | "buffet" | "entrance";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloorPlanLayout {
  totalGuests: number;
  totalTables: number;
  displayedTables: number;
  seatsPerTable: number;
  summaryText: string;
  isCapped: boolean;
  tables: TableItem[];
  features: VenueFeature[];
  roomWidth: number;
  roomHeight: number;
}

/**
 * Pure function that calculates table and venue feature positions
 * based on guest count and event type.
 */
export function layoutTables(
  guestCount: number,
  eventType: string
): FloorPlanLayout {
  const normType = (eventType || "").toLowerCase();

  let seatsPerTable = SEATS_PER_TABLE_DEFAULT;
  if (normType === "wedding") {
    seatsPerTable = SEATS_PER_TABLE_WEDDING;
  } else if (normType === "birthday") {
    seatsPerTable = SEATS_PER_TABLE_BIRTHDAY;
  } else if (normType === "community") {
    seatsPerTable = SEATS_PER_TABLE_COMMUNITY;
  }

  const validGuestCount = Math.max(0, Math.floor(guestCount || 0));
  const totalTables =
    validGuestCount > 0 ? Math.ceil(validGuestCount / seatsPerTable) : 0;
  const isCapped = totalTables > MAX_DISPLAYED_TABLES;
  const displayedCount = Math.min(totalTables, MAX_DISPLAYED_TABLES);

  const guestLabel =
    validGuestCount === 1 ? "1 guest" : `${validGuestCount} guests`;
  const tableLabel = totalTables === 1 ? "1 table" : `${totalTables} tables`;
  const summaryText = `${guestLabel}, ${tableLabel}`;

  // Room geometry constants
  const ROOM_WIDTH = 800;
  const ROOM_HEIGHT = 520;

  // Key Venue Features placed thoughtfully by event type
  const stageLabel =
    normType === "wedding"
      ? "Mandap / Wedding Stage"
      : normType === "birthday"
        ? "Cake Cutting & Stage"
        : "Speaker Podium & Stage";

  const danceLabel =
    normType === "wedding"
      ? "Dance Floor & Sangeet"
      : normType === "birthday"
        ? "Kids Play & Activity Floor"
        : "Central Gathering Space";

  const features: VenueFeature[] = [
    {
      type: "stage",
      label: stageLabel,
      x: 290,
      y: 20,
      width: 220,
      height: 52,
    },
    {
      type: "danceFloor",
      label: danceLabel,
      x: 310,
      y: 88,
      width: 180,
      height: 62,
    },
    {
      type: "buffet",
      label: "Buffet & Refreshment Bar",
      x: 675,
      y: 80,
      width: 95,
      height: 270,
    },
    {
      type: "entrance",
      label: "Main Entrance",
      x: 335,
      y: 475,
      width: 130,
      height: 28,
    },
  ];

  // Grid distribution for tables in seating area
  const minX = 65;
  const maxX = 645;
  const minY = 175;
  const maxY = 450;

  const tables: TableItem[] = [];

  if (displayedCount > 0) {
    let cols = 4;
    let rows = 1;

    if (displayedCount <= 4) {
      cols = displayedCount;
      rows = 1;
    } else if (displayedCount <= 8) {
      cols = 4;
      rows = 2;
    } else if (displayedCount <= 12) {
      cols = 4;
      rows = 3;
    } else if (displayedCount <= 16) {
      cols = 4;
      rows = 4;
    } else if (displayedCount <= 24) {
      cols = 6;
      rows = 4;
    } else if (displayedCount <= 32) {
      cols = 8;
      rows = 4;
    } else {
      cols = 8;
      rows = 6;
    }

    const colStep = (maxX - minX) / (cols + 1);
    const rowStep = (maxY - minY) / (rows + 1);

    for (let i = 0; i < displayedCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = Math.round(minX + (col + 1) * colStep);
      const y = Math.round(minY + (row + 1) * rowStep);

      tables.push({
        id: i + 1,
        tableNumber: i + 1,
        x,
        y,
        radius: 17,
        seats: seatsPerTable,
      });
    }
  }

  return {
    totalGuests: validGuestCount,
    totalTables,
    displayedTables: displayedCount,
    seatsPerTable,
    summaryText,
    isCapped,
    tables,
    features,
    roomWidth: ROOM_WIDTH,
    roomHeight: ROOM_HEIGHT,
  };
}
