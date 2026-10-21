import { describe, it, expect } from "vitest";
import {
  layoutTables,
  SEATS_PER_TABLE_WEDDING,
  SEATS_PER_TABLE_BIRTHDAY,
  SEATS_PER_TABLE_COMMUNITY,
  MAX_DISPLAYED_TABLES,
} from "@/lib/floorplan";

describe("layoutTables pure function", () => {
  it("exports named constants for seats per table", () => {
    expect(SEATS_PER_TABLE_WEDDING).toBe(10);
    expect(SEATS_PER_TABLE_BIRTHDAY).toBe(8);
    expect(SEATS_PER_TABLE_COMMUNITY).toBe(8);
    expect(MAX_DISPLAYED_TABLES).toBe(48);
  });

  it("handles 0 guests: returns 0 tables and empty tables array", () => {
    const layout = layoutTables(0, "wedding");
    expect(layout.totalGuests).toBe(0);
    expect(layout.totalTables).toBe(0);
    expect(layout.displayedTables).toBe(0);
    expect(layout.tables).toEqual([]);
    expect(layout.summaryText).toBe("0 guests, 0 tables");
    expect(layout.isCapped).toBe(false);
  });

  it("handles 1 guest: returns 1 table", () => {
    const layout = layoutTables(1, "wedding");
    expect(layout.totalGuests).toBe(1);
    expect(layout.totalTables).toBe(1);
    expect(layout.displayedTables).toBe(1);
    expect(layout.tables).toHaveLength(1);
    expect(layout.summaryText).toBe("1 guest, 1 table");
    expect(layout.tables[0].seats).toBe(10);
  });

  it("computes exact tables for 50 guests: 7 tables for birthday, 5 for wedding", () => {
    // 50 guests at 8 seats/table = Math.ceil(50/8) = 7 tables
    const birthdayLayout = layoutTables(50, "birthday");
    expect(birthdayLayout.seatsPerTable).toBe(8);
    expect(birthdayLayout.totalTables).toBe(7);
    expect(birthdayLayout.summaryText).toBe("50 guests, 7 tables");
    expect(birthdayLayout.tables).toHaveLength(7);

    // 50 guests at 10 seats/table = Math.ceil(50/10) = 5 tables
    const weddingLayout = layoutTables(50, "wedding");
    expect(weddingLayout.seatsPerTable).toBe(10);
    expect(weddingLayout.totalTables).toBe(5);
    expect(weddingLayout.summaryText).toBe("50 guests, 5 tables");
    expect(weddingLayout.tables).toHaveLength(5);
  });

  it("handles 500 guests: caps displayed tables at MAX_DISPLAYED_TABLES (48)", () => {
    // 500 guests wedding: 50 total tables, capped at 48 for SVG performance
    const layout = layoutTables(500, "wedding");
    expect(layout.totalGuests).toBe(500);
    expect(layout.totalTables).toBe(50);
    expect(layout.isCapped).toBe(true);
    expect(layout.displayedTables).toBe(48);
    expect(layout.tables).toHaveLength(48);
    expect(layout.summaryText).toBe("500 guests, 50 tables");
  });

  it("places architectural features (stage, dance floor, buffet, entrance) by event type", () => {
    const weddingLayout = layoutTables(100, "wedding");
    const weddingFeatureTypes = weddingLayout.features.map((f) => f.type);
    expect(weddingFeatureTypes).toContain("stage");
    expect(weddingFeatureTypes).toContain("danceFloor");
    expect(weddingFeatureTypes).toContain("buffet");
    expect(weddingFeatureTypes).toContain("entrance");

    const stage = weddingLayout.features.find((f) => f.type === "stage");
    expect(stage?.label).toContain("Mandap");

    const birthdayLayout = layoutTables(40, "birthday");
    const birthdayStage = birthdayLayout.features.find(
      (f) => f.type === "stage"
    );
    expect(birthdayStage?.label).toContain("Cake Cutting");

    const communityLayout = layoutTables(60, "community");
    const commStage = communityLayout.features.find((f) => f.type === "stage");
    expect(commStage?.label).toContain("Speaker Podium");
  });
});
