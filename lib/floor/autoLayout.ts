import type { FloorItem, Room, VenueType } from "./types";
import {
  SEATS_PER_TABLE_WEDDING,
  SEATS_PER_TABLE_BIRTHDAY,
  SEATS_PER_TABLE_COMMUNITY,
  SEATS_PER_TABLE_DEFAULT,
} from "../floorplan";

export function getAutoSeatsPerTable(eventType: string): number {
  const norm = (eventType || "").toLowerCase();
  if (norm.includes("wedding")) return SEATS_PER_TABLE_WEDDING;
  if (norm.includes("birthday")) return SEATS_PER_TABLE_BIRTHDAY;
  if (norm.includes("community")) return SEATS_PER_TABLE_COMMUNITY;
  return SEATS_PER_TABLE_DEFAULT;
}

export function createDefaultRoom(
  guestCount: number,
  venueType: VenueType = "banquet hall"
): Room {
  // Compute comfortable room size: ~2.0 m² per guest plus feature buffers
  const guests = Math.max(10, guestCount || 50);
  const targetArea = Math.max(180, guests * 2.0);

  // Maintain ~1.4 : 1 aspect ratio
  let widthM = Math.round(Math.sqrt(targetArea * 1.4));
  let heightM = Math.round(targetArea / widthM);

  // Clamp within 6m to 80m
  widthM = Math.min(80, Math.max(14, widthM));
  heightM = Math.min(80, Math.max(10, heightM));

  return {
    widthM,
    heightM,
    venueType,
  };
}

export function generateAutoLayoutItems(
  guestCount: number,
  eventType: string,
  room: Room
): FloorItem[] {
  const normType = (eventType || "").toLowerCase();
  const seatsPerTable = getAutoSeatsPerTable(normType);
  const validGuestCount = Math.max(0, Math.floor(guestCount || 0));
  const tableCount =
    validGuestCount > 0 ? Math.ceil(validGuestCount / seatsPerTable) : 0;
  // Cap for layout cleanliness at 48 tables max
  const displayedTables = Math.min(tableCount, 48);

  const items: FloorItem[] = [];

  // 1. Stage / Mandap
  const isWedding = normType.includes("wedding");
  const stageWidth = Math.min(room.widthM * 0.45, 8.0);
  const stageHeight = 2.4;
  const stageX = (room.widthM - stageWidth) / 2;

  items.push({
    id: "stage_main",
    type: isWedding ? "mandap" : "stage",
    label: isWedding ? "Mandap / Wedding Dais" : "Event Stage",
    x: stageX,
    y: 0.8,
    w: stageWidth,
    h: stageHeight,
    rotation: 0,
    locked: false,
  });

  // 2. Dance Floor
  const danceWidth = Math.min(room.widthM * 0.35, 5.5);
  const danceHeight = 3.6;
  items.push({
    id: "dance_floor_main",
    type: "danceFloor",
    label: isWedding ? "Sangeet Dance Floor" : "Dance & Activity Floor",
    x: (room.widthM - danceWidth) / 2,
    y: stageHeight + 1.4,
    w: danceWidth,
    h: danceHeight,
    rotation: 0,
    locked: false,
  });

  // 3. Buffet Counter
  const buffetHeight = Math.min(room.heightM * 0.45, 6.0);
  items.push({
    id: "buffet_main",
    type: "buffet",
    label: "Banquet Buffet Station",
    x: room.widthM - 2.8,
    y: 2.0,
    w: 1.8,
    h: buffetHeight,
    rotation: 0,
    locked: false,
  });

  // 4. Main Entrance
  const entranceWidth = 3.2;
  items.push({
    id: "entrance_main",
    type: "entrance",
    label: "Main Guest Entrance",
    x: (room.widthM - entranceWidth) / 2,
    y: room.heightM - 1.2,
    w: entranceWidth,
    h: 0.8,
    rotation: 0,
    locked: true,
  });

  // 5. Tables grid in seating zone
  if (displayedTables > 0) {
    const tableDiameter = 1.8;
    const minX = 2.2;
    const maxX = room.widthM - 4.0;
    const minY = stageHeight + danceHeight + 2.0;
    const maxY = room.heightM - 2.6;

    let cols = 4;
    if (displayedTables <= 4) cols = displayedTables;
    else if (displayedTables <= 8) cols = 4;
    else if (displayedTables <= 16) cols = 4;
    else if (displayedTables <= 24) cols = 6;
    else cols = 8;

    const rows = Math.ceil(displayedTables / cols);
    const colStep = (maxX - minX) / Math.max(1, cols - 1);
    const rowStep = (maxY - minY) / Math.max(1, rows - 1);

    for (let i = 0; i < displayedTables; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cols === 1 ? (minX + maxX) / 2 : minX + col * colStep;
      const y = rows === 1 ? (minY + maxY) / 2 : minY + row * rowStep;

      items.push({
        id: `table_${i + 1}`,
        type: "roundTable",
        label: `Table ${i + 1}`,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        w: tableDiameter,
        h: tableDiameter,
        rotation: 0,
        locked: false,
        seats: seatsPerTable,
      });
    }
  }

  return items;
}
