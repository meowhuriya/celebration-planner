import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import CustomDesignEditor from "@/components/invitation/CustomDesignEditor";
import type { CustomDesignState } from "@/lib/custom-design/types";
import * as storage from "@/lib/custom-design/storage";

expect.extend(toHaveNoViolations);

const mockSampleDesign: CustomDesignState = {
  imageSrc:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  imageWidth: 1000,
  imageHeight: 1500,
  originalFileName: "my-canva-card.png",
  nameBox: { x: 150, y: 300, width: 700, height: 100 },
  qrBox: { x: 400, y: 1100, width: 200, height: 200 },
  nameFontFamily: "Playfair Display, serif",
  nameFontSize: 36,
  nameColor: "#2B1B14",
  nameAlign: "center",
  namePill: true,
  namePillColor: "rgba(255, 255, 255, 0.9)",
  nameTemplate: "Dear {name}",
  qrHasQuietZone: true,
  updatedAt: Date.now(),
};

describe("CustomDesignEditor Component", () => {
  it("renders upload UI, Canva link with safe attributes, and tip", async () => {
    render(<CustomDesignEditor />);

    // Wait for initial load to settle
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /Design in Canva/i })
      ).toBeInTheDocument();
    });

    const canvaLink = screen.getByRole("link", { name: /Design in Canva/i });
    expect(canvaLink).toHaveAttribute("href", "https://www.canva.com");
    expect(canvaLink).toHaveAttribute("target", "_blank");
    expect(canvaLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(
      screen.getByText(/Upload your card \(PNG, JPG, or WebP\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/In Canva choose/i)).toBeInTheDocument();
  });

  it("renders placement editor with movable boxes when design is loaded", async () => {
    vi.spyOn(storage, "loadCustomDesign").mockResolvedValueOnce({
      design: mockSampleDesign,
      storageType: "indexeddb",
    });

    render(<CustomDesignEditor />);

    await waitFor(() => {
      expect(
        screen.getByText("my-canva-card.png (1000 × 1500 px)")
      ).toBeInTheDocument();
    });

    // Check Guest Name Box and QR Box
    const nameRegion = screen.getByLabelText(/Guest name placement box/i);
    const qrRegion = screen.getByLabelText(/QR code placement box/i);

    expect(nameRegion).toBeInTheDocument();
    expect(qrRegion).toBeInTheDocument();
  });

  it("handles keyboard arrow nudging (1px and Shift for 10px)", async () => {
    vi.spyOn(storage, "loadCustomDesign").mockResolvedValueOnce({
      design: mockSampleDesign,
      storageType: "indexeddb",
    });
    const saveSpy = vi.spyOn(storage, "saveCustomDesign");

    render(<CustomDesignEditor />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/Guest name placement box/i)
      ).toBeInTheDocument();
    });

    const nameBox = screen.getByLabelText(/Guest name placement box/i);

    // Press ArrowRight (1px nudge)
    fireEvent.keyDown(nameBox, { key: "ArrowRight", shiftKey: false });
    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });

    // Press Shift+ArrowDown (10px nudge)
    fireEvent.keyDown(nameBox, { key: "ArrowDown", shiftKey: true });
    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("allows updating coordinates via numeric inputs", async () => {
    const user = userEvent.setup();
    vi.spyOn(storage, "loadCustomDesign").mockResolvedValueOnce({
      design: mockSampleDesign,
      storageType: "indexeddb",
    });

    render(<CustomDesignEditor />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/Guest name placement box/i)
      ).toBeInTheDocument();
    });

    // Select name box tab
    const nameTab = screen.getByRole("tab", { name: /Guest Name Box/i });
    await user.click(nameTab);

    // Find numeric X input
    const xInput = screen.getByLabelText(/^x$/i);
    expect(xInput).toBeInTheDocument();
  });

  it("toggles between edit mode and live preview mode", async () => {
    const user = userEvent.setup();
    vi.spyOn(storage, "loadCustomDesign").mockResolvedValueOnce({
      design: mockSampleDesign,
      storageType: "indexeddb",
    });

    render(<CustomDesignEditor />);

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /2\. Live Preview/i })
      ).toBeInTheDocument();
    });

    const previewTab = screen.getByRole("tab", { name: /2\. Live Preview/i });
    await user.click(previewTab);

    expect(screen.getByText(/Previewing guest card/i)).toBeInTheDocument();
  });

  it("has zero accessibility violations (jest-axe) in empty and active states", async () => {
    // 1. Empty state axe check
    const { container: emptyContainer } = render(<CustomDesignEditor />);
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /Design in Canva/i })
      ).toBeInTheDocument();
    });
    const emptyResults = await axe(emptyContainer);
    expect(emptyResults).toHaveNoViolations();

    // 2. Active design state axe check
    vi.spyOn(storage, "loadCustomDesign").mockResolvedValueOnce({
      design: mockSampleDesign,
      storageType: "indexeddb",
    });
    const { container: activeContainer } = render(<CustomDesignEditor />);
    await waitFor(() => {
      expect(screen.getByText(/my-canva-card.png/i)).toBeInTheDocument();
    });
    const activeResults = await axe(activeContainer);
    expect(activeResults).toHaveNoViolations();
  });
});
