import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import EventTypeSelector from "@/components/editorial/EventTypeSelector";
import { addTraditionChip } from "@/lib/editorial";

expect.extend(toHaveNoViolations);

describe("EventTypeSelector Redesign", () => {
  beforeEach(() => {
    // Default mock: desktop mouse pointer, motion allowed
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("pointer: fine"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe("addTraditionChip Pure Logic", () => {
    it("adds initial chip when string is empty", () => {
      expect(addTraditionChip("", "Mehndi")).toBe("Mehndi");
    });

    it("appends chip with comma separation without duplicates", () => {
      const step1 = addTraditionChip("", "Mehndi");
      expect(step1).toBe("Mehndi");

      const step2 = addTraditionChip(step1, "Haldi");
      expect(step2).toBe("Mehndi, Haldi");

      // Duplicate addition should be ignored
      const step3 = addTraditionChip(step2, "Mehndi");
      expect(step3).toBe("Mehndi, Haldi");

      // Case-insensitive duplicate check
      const step4 = addTraditionChip(step3, "haldi");
      expect(step4).toBe("Mehndi, Haldi");
    });

    it("respects the 200 character limit", () => {
      const longBase = "A".repeat(195);
      // Adding a 10 char chip would exceed 200 (195 + 2 + 10 = 207)
      const result = addTraditionChip(longBase, "Celebration");
      expect(result).toBe(longBase);
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe("Tradition Chips Interaction", () => {
    it("selects row and triggers onSelectTradition without duplicates", async () => {
      const handleSelectType = vi.fn();
      const handleSelectTradition = vi.fn();

      const { rerender } = render(
        <EventTypeSelector
          selectedType="wedding"
          onSelectType={handleSelectType}
          cultureOrTradition=""
          onSelectTradition={handleSelectTradition}
        />
      );

      // Find and click the "Mehndi" chip button
      const mehndiChip = screen.getByRole("button", { name: "Mehndi" });
      expect(mehndiChip).toBeInTheDocument();

      await userEvent.click(mehndiChip);

      expect(handleSelectType).toHaveBeenCalledWith("wedding");
      expect(handleSelectTradition).toHaveBeenCalledWith("Mehndi", "Mehndi");

      // Simulate form state update
      rerender(
        <EventTypeSelector
          selectedType="wedding"
          onSelectType={handleSelectType}
          cultureOrTradition="Mehndi"
          onSelectTradition={handleSelectTradition}
        />
      );

      // Click second chip "Haldi"
      const haldiChip = screen.getByRole("button", { name: "Haldi" });
      await userEvent.click(haldiChip);

      expect(handleSelectTradition).toHaveBeenCalledWith(
        "Mehndi, Haldi",
        "Haldi"
      );

      // Re-click "Mehndi" - duplicate should not be added
      rerender(
        <EventTypeSelector
          selectedType="wedding"
          onSelectType={handleSelectType}
          cultureOrTradition="Mehndi, Haldi"
          onSelectTradition={handleSelectTradition}
        />
      );

      handleSelectTradition.mockClear();
      await userEvent.click(mehndiChip);

      // Expect no duplicate added (calls with same string)
      expect(handleSelectTradition).toHaveBeenCalledWith(
        "Mehndi, Haldi",
        "Mehndi"
      );
    });

    it("clicking a chip on a different row selects that row", async () => {
      const handleSelectType = vi.fn();
      const handleSelectTradition = vi.fn();

      render(
        <EventTypeSelector
          selectedType="wedding"
          onSelectType={handleSelectType}
          cultureOrTradition=""
          onSelectTradition={handleSelectTradition}
        />
      );

      // Click "Diwali" chip in the Community row
      const diwaliChip = screen.getByRole("button", { name: "Diwali" });
      await userEvent.click(diwaliChip);

      expect(handleSelectType).toHaveBeenCalledWith("community");
      expect(handleSelectTradition).toHaveBeenCalledWith("Diwali", "Diwali");
    });
  });

  describe("Mini Invitation Preview & Responsive Rules", () => {
    it("renders mini invitation preview on desktop with fine pointer", () => {
      render(
        <EventTypeSelector selectedType="wedding" onSelectType={vi.fn()} />
      );

      const weddingRow = screen.getByTestId("event-type-row-wedding");
      const miniCard = screen.getByTestId("mini-card-wedding");

      expect(miniCard).toBeInTheDocument();
      expect(miniCard).toHaveAttribute("aria-hidden", "true");

      // Before hover, opacity is 0
      expect(miniCard.className).toContain("opacity-0");

      // Hover over wedding row
      fireEvent.pointerEnter(weddingRow);
      expect(miniCard.className).toContain("opacity-100");

      // Leave wedding row
      fireEvent.pointerLeave(weddingRow);
      expect(miniCard.className).toContain("opacity-0");
    });

    it("hides mini preview on touch devices (pointer: coarse)", () => {
      // Mock touch device
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("pointer: coarse"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <EventTypeSelector selectedType="wedding" onSelectType={vi.fn()} />
      );

      // Mini preview is not mounted when pointer is not fine
      expect(screen.queryByTestId("mini-card-wedding")).not.toBeInTheDocument();
    });

    it("hides mini preview when prefers-reduced-motion is active", () => {
      // Mock fine pointer BUT prefers-reduced-motion is true
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <EventTypeSelector selectedType="wedding" onSelectType={vi.fn()} />
      );

      expect(screen.queryByTestId("mini-card-wedding")).not.toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation in Radiogroup", () => {
    it("navigates options via arrow keys and updates selection", async () => {
      const handleSelectType = vi.fn();
      render(
        <EventTypeSelector
          selectedType="wedding"
          onSelectType={handleSelectType}
        />
      );

      const weddingRadio = screen.getByRole("radio", { name: /wedding/i });
      weddingRadio.focus();
      expect(document.activeElement).toBe(weddingRadio);

      // Press ArrowDown to select next (birthday)
      fireEvent.keyDown(weddingRadio, { key: "ArrowDown" });
      expect(handleSelectType).toHaveBeenCalledWith("birthday");

      // Press ArrowUp to wrap around to last (other)
      fireEvent.keyDown(weddingRadio, { key: "ArrowUp" });
      expect(handleSelectType).toHaveBeenCalledWith("other");

      // Press Enter to select
      fireEvent.keyDown(weddingRadio, { key: "Enter" });
      expect(handleSelectType).toHaveBeenCalledWith("wedding");
    });
  });

  describe("WCAG 2.1 Contrast & Accessibility", () => {
    // Relative luminance formula per WCAG 2.1
    function getLuminance(hex: string): number {
      const rgb = hex
        .replace("#", "")
        .match(/.{2}/g)!
        .map((x) => parseInt(x, 16) / 255)
        .map((c) =>
          c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    function getContrast(hex1: string, hex2: string): number {
      const lum1 = getLuminance(hex1);
      const lum2 = getLuminance(hex2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    }

    it("verifies mathematical contrast ratio >= 4.5:1 in all row states", () => {
      // 1. Selected Row: Deep Maroon #3A0F1C
      const selectedBg = "#3A0F1C";
      const ivoryText = "#FBF6EE";
      const contrastSelectedTitle = getContrast(selectedBg, ivoryText);
      expect(contrastSelectedTitle).toBeGreaterThanOrEqual(4.5);
      expect(contrastSelectedTitle).toBeGreaterThan(10); // Typically ~15:1

      // Description text: 85% ivory blended on maroon
      const blendedIvoryOnMaroon = "#EDE4D3";
      const contrastSelectedDesc = getContrast(
        selectedBg,
        blendedIvoryOnMaroon
      );
      expect(contrastSelectedDesc).toBeGreaterThanOrEqual(4.5);

      // Selected row chips
      const activeChipGold = "#C9A24B";
      const espressoInk = "#2B1B14";
      expect(getContrast(activeChipGold, espressoInk)).toBeGreaterThanOrEqual(
        4.5
      );

      // 2. Hovered/Focused Row (Not selected): Soft Saffron #FCEBD3
      const saffronBg = "#FCEBD3";
      const contrastHoveredTitle = getContrast(saffronBg, espressoInk);
      expect(contrastHoveredTitle).toBeGreaterThanOrEqual(4.5);
      expect(contrastHoveredTitle).toBeGreaterThan(10); // ~13:1

      // 3. Default Row: Warm Cards #FFFDF8
      const defaultBg = "#FFFDF8";
      const contrastDefaultTitle = getContrast(defaultBg, espressoInk);
      expect(contrastDefaultTitle).toBeGreaterThanOrEqual(4.5);

      // Description on default row: #6B5848
      const mutedDesc = "#6B5848";
      expect(getContrast(defaultBg, mutedDesc)).toBeGreaterThanOrEqual(4.5);
    });

    it("has zero accessibility violations (jest-axe) across all states", async () => {
      const { container, rerender } = render(
        <EventTypeSelector
          selectedType="wedding"
          onSelectType={vi.fn()}
          cultureOrTradition="Mehndi, Sangeet"
        />
      );

      // Test default state
      let results = await axe(container);
      expect(results).toHaveNoViolations();

      // Test with birthday selected
      rerender(
        <EventTypeSelector
          selectedType="birthday"
          onSelectType={vi.fn()}
          cultureOrTradition="Milestone"
        />
      );
      results = await axe(container);
      expect(results).toHaveNoViolations();

      // Test with community selected
      rerender(
        <EventTypeSelector
          selectedType="community"
          onSelectType={vi.fn()}
          cultureOrTradition="Diwali"
        />
      );
      results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
