import type { SeatPosition, TableCircleInput } from "./types";

/**
 * Calculates evenly distributed coordinates for seats placed around a circular table.
 * Starts from top (-PI / 2) and rotates clockwise.
 *
 * @param table Table circle descriptor (supports x/cx, y/cy, radius/r, tableNumber)
 * @param seatsPerTable Number of seats around this table
 */
export function seatPositions(
  table: TableCircleInput,
  seatsPerTable: number
): SeatPosition[] {
  const tableNum = table.tableNumber ?? 1;
  const cx = table.x ?? table.cx ?? 0;
  const cy = table.y ?? table.cy ?? 0;
  const r = table.radius ?? table.r ?? 17;

  // Space chair centers slightly outside the table edge
  const orbitDistance = r + 9;
  const count = Math.max(0, seatsPerTable);
  const positions: SeatPosition[] = [];

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    const x = Math.round((cx + Math.cos(angle) * orbitDistance) * 100) / 100;
    const y = Math.round((cy + Math.sin(angle) * orbitDistance) * 100) / 100;

    positions.push({
      tableNumber: tableNum,
      seatIndex: i,
      seatKey: `${tableNum}-${i}`,
      x,
      y,
    });
  }

  return positions;
}
