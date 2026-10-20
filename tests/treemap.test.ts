import { describe, it, expect } from "vitest";
import { calculateTreemap, type BudgetCategoryItem } from "@/lib/treemap";

describe("Budget Treemap pure algorithm", () => {
  const sampleCategories: BudgetCategoryItem[] = [
    { category: "Venue & Mandap", allocated: 150000 },
    { category: "Catering & Sweets", allocated: 120000 },
    { category: "Photography & Video", allocated: 60000 },
    { category: "Attire & Jewellery", allocated: 50000 },
    { category: "Decor & Floral", allocated: 40000 },
    { category: "Music & Entertainment", allocated: 30000 },
  ];

  it("calculates treemap area sum exactly matching container width * height", () => {
    const width = 800;
    const height = 400;
    const expectedTotalArea = width * height;

    const rects = calculateTreemap(sampleCategories, width, height);

    expect(rects).toHaveLength(sampleCategories.length);

    const calculatedTotalArea = rects.reduce(
      (sum, rect) => sum + rect.width * rect.height,
      0
    );

    // Sum of rectangle areas must equal container area
    expect(calculatedTotalArea).toBeCloseTo(expectedTotalArea, 4);
  });

  it("handles a single budget category by occupying 100% of container area", () => {
    const single = [{ category: "Venue", allocated: 250000 }];
    const width = 600;
    const height = 300;

    const rects = calculateTreemap(single, width, height);

    expect(rects).toHaveLength(1);
    expect(rects[0].x).toBe(0);
    expect(rects[0].y).toBe(0);
    expect(rects[0].width).toBe(600);
    expect(rects[0].height).toBe(300);
    expect(rects[0].percentage).toBe(100);
  });

  it("handles zero total budget or empty list gracefully", () => {
    expect(calculateTreemap([], 800, 400)).toEqual([]);
    expect(
      calculateTreemap([{ category: "Zero", allocated: 0 }], 800, 400)
    ).toEqual([]);
    expect(calculateTreemap(sampleCategories, 0, 400)).toEqual([]);
    expect(calculateTreemap(sampleCategories, 800, 0)).toEqual([]);
  });

  it("keeps all rectangles within container bounding box without negative coords", () => {
    const width = 720;
    const height = 360;

    const rects = calculateTreemap(sampleCategories, width, height);

    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + 0.001);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height + 0.001);
    }
  });

  it("assigns palette color variables and readable contrast text colors", () => {
    const rects = calculateTreemap(sampleCategories, 800, 400);

    for (const rect of rects) {
      expect(rect.colorVar).toMatch(/^var\(--palette-[1-4]/);
      expect(rect.textColorVar).toMatch(/^var\(--palette-text-[1-4]/);
    }
  });
});
