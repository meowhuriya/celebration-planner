import type {
  FloorItem,
  Room,
  ClearanceViolation,
  AreaPerGuestResult,
} from "./types";
import { getBounds, overlaps, roundFloat } from "./geometry";

/**
 * Calculates minimum distance in meters between two tables.
 */
function tableDistance(itemA: FloorItem, itemB: FloorItem): number {
  const isRoundA = itemA.type === "roundTable";
  const isRoundB = itemB.type === "roundTable";

  const cxA = itemA.x + itemA.w / 2;
  const cyA = itemA.y + itemA.h / 2;
  const cxB = itemB.x + itemB.w / 2;
  const cyB = itemB.y + itemB.h / 2;

  const centerDist = Math.hypot(cxA - cxB, cyA - cyB);

  if (isRoundA && isRoundB) {
    const rA = itemA.w / 2;
    const rB = itemB.w / 2;
    return Math.max(0, centerDist - (rA + rB));
  }

  // Approximation using effective radii
  const effRadiusA = Math.hypot(itemA.w, itemA.h) / 2.2;
  const effRadiusB = Math.hypot(itemB.w, itemB.h) / 2.2;
  return Math.max(0, centerDist - (effRadiusA + effRadiusB));
}

/**
 * Checks all clearance rules across the room and items:
 * 1. Items overlapping
 * 2. Items outside room boundaries
 * 3. Gaps between tables under 0.9 m
 * 4. Entrance blocked
 */
export function clearanceViolations(
  items: FloorItem[],
  room: Room
): ClearanceViolation[] {
  const violations: ClearanceViolation[] = [];
  const reportedOverlapPairs = new Set<string>();
  const reportedTableGaps = new Set<string>();

  // 1. Items outside room bounds
  for (const item of items) {
    const bounds = getBounds(item);
    if (
      bounds.minX < -0.05 ||
      bounds.minY < -0.05 ||
      bounds.maxX > room.widthM + 0.05 ||
      bounds.maxY > room.heightM + 0.05
    ) {
      violations.push({
        type: "out_of_bounds",
        severity: "error",
        itemIds: [item.id],
        message: `${item.label} extends outside the room boundaries.`,
      });
    }
  }

  // 2. Overlaps between any two items
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const itemA = items[i];
      const itemB = items[j];

      if (overlaps(itemA, itemB)) {
        const pairKey = [itemA.id, itemB.id].sort().join("::");
        if (!reportedOverlapPairs.has(pairKey)) {
          reportedOverlapPairs.add(pairKey);
          violations.push({
            type: "overlap",
            severity: "error",
            itemIds: [itemA.id, itemB.id],
            message: `${itemA.label} overlaps with ${itemB.label}.`,
          });
        }
      }
    }
  }

  // 3. Walking gaps between tables under 0.9 m
  const tableItems = items.filter(
    (it) => it.type === "roundTable" || it.type === "longTable"
  );
  for (let i = 0; i < tableItems.length; i++) {
    for (let j = i + 1; j < tableItems.length; j++) {
      const tA = tableItems[i];
      const tB = tableItems[j];

      const pairKey = [tA.id, tB.id].sort().join("::");
      if (reportedOverlapPairs.has(pairKey) || reportedTableGaps.has(pairKey)) {
        continue;
      }

      const dist = tableDistance(tA, tB);
      if (dist < 0.9) {
        reportedTableGaps.add(pairKey);
        violations.push({
          type: "table_gap",
          severity: "warning",
          itemIds: [tA.id, tB.id],
          message: `Walking space between ${tA.label} and ${tB.label} is ${dist.toFixed(2)}m (minimum 0.9m recommended).`,
        });
      }
    }
  }

  // 4. Entrance blocked
  const entrances = items.filter((it) => it.type === "entrance");
  for (const entrance of entrances) {
    // 1.5m clearance corridor in front of entrance
    const inTopHalf = entrance.y + entrance.h / 2 < room.heightM / 2;
    const corridorY = inTopHalf
      ? entrance.y + entrance.h
      : Math.max(0, entrance.y - 1.5);

    const corridor: FloorItem = {
      id: `corridor_${entrance.id}`,
      type: "zone",
      label: "Entrance Clearance",
      x: entrance.x,
      y: corridorY,
      w: entrance.w,
      h: 1.5,
      rotation: 0,
      locked: true,
    };

    for (const other of items) {
      if (other.id === entrance.id) continue;
      if (overlaps(other, corridor)) {
        violations.push({
          type: "entrance_blocked",
          severity: "error",
          itemIds: [entrance.id, other.id],
          message: `${other.label} is blocking the clearance corridor for ${entrance.label}.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Calculates floor area per guest and flags tight venue capacity (< 1.2 m² per guest).
 */
export function areaPerGuest(
  room: Room,
  guestCount: number
): AreaPerGuestResult {
  const areaM2 = roundFloat(room.widthM * room.heightM, 2);
  const count = Math.max(0, guestCount);

  if (count === 0) {
    return {
      areaM2,
      areaPerGuestM2: areaM2,
      isTight: false,
    };
  }

  const perGuest = roundFloat(areaM2 / count, 2);
  const isTight = perGuest < 1.2;

  return {
    areaM2,
    areaPerGuestM2: perGuest,
    isTight,
    warning: isTight
      ? `Tight venue: ${perGuest.toFixed(1)} m² per guest (minimum 1.2 m² recommended for comfortable circulation).`
      : undefined,
  };
}
