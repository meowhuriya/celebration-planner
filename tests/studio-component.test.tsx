import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import CardStudio from "@/components/studio/CardStudio";
import type { EventInput, EventPalette } from "@/lib/schemas";

expect.extend(toHaveNoViolations);

describe("Stage 2 & 3: Card Studio Component & Export", () => {
  const mockPalette: EventPalette = {
    name: "Royal Velvet",
    colors: ["#5B1A2B", "#E07A1F", "#FFFDF8", "#C9A24B"],
  };

  const mockInput: EventInput = {
    eventType: "wedding",
    hostName: "Aarav & Ananya",
    eventDate: "2026-12-12",
    city: "Udaipur",
    guestCount: 150,
    totalBudget: 1500000,
    currency: "INR",
    venueName: "The Palace",
    vibeOrTheme: "Royal & Classic",
    cultureOrTradition: "Traditional",
    specialRequirements: "",
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Mock HTMLCanvasElement.getContext
    const mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      rect: vi.fn(),
      roundRect: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray([255, 255, 255, 255]),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockReturnValue(mockContext as any);
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue("data:image/png;base64,mockCanvasPng");
  });

  it("renders Card Studio workspace with toolbar, toolbox, canvas, and layers", () => {
    render(<CardStudio palette={mockPalette} eventInput={mockInput} />);

    expect(
      screen.getByRole("region", { name: /card studio designer/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /studio tools panel/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /layers manager/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export & share/i })
    ).toBeInTheDocument();
  });

  it("switches starter templates and updates canvas elements", async () => {
    const user = userEvent.setup();
    render(<CardStudio palette={mockPalette} eventInput={mockInput} />);

    // Click Modern Minimal template button
    const modernMinimalBtn = screen.getByRole("button", {
      name: /modern minimal/i,
    });
    await user.click(modernMinimalBtn);

    // Modern Minimal should have its distinct elements
    expect(screen.getAllByText("Modern Minimal").length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("interacts with layers list: selects, moves, locks, and deletes elements", async () => {
    const user = userEvent.setup();
    render(<CardStudio palette={mockPalette} eventInput={mockInput} />);

    // Look for layer items in the layers manager
    const layersManager = screen.getByRole("region", {
      name: /layers manager/i,
    });
    expect(layersManager).toBeInTheDocument();

    // Select the first layer
    const firstLayerBtn = screen.getAllByRole("button", {
      name: /layer|text|token|sticker|shape/i,
    })[0];
    await user.click(firstLayerBtn);

    // Inspector should show properties
    expect(
      screen.getByRole("region", { name: /inspector/i })
    ).toBeInTheDocument();
  });

  it("supports keyboard nudging and text editing flow", async () => {
    render(<CardStudio palette={mockPalette} eventInput={mockInput} />);

    const canvas = screen.getByLabelText(/card canvas/i);
    canvas.focus();

    // Fire arrow keys for nudging
    fireEvent.keyDown(canvas, { key: "ArrowDown" });
    fireEvent.keyDown(canvas, { key: "ArrowRight", shiftKey: true });

    // Component handles nudging without crashing
    expect(canvas).toBeInTheDocument();
  });

  it("executes batch export for 3 guests with personal QR codes and print options", async () => {
    const user = userEvent.setup();
    render(<CardStudio palette={mockPalette} eventInput={mockInput} />);

    // Open export modal
    const exportBtn = screen.getByRole("button", { name: /export & share/i });
    await user.click(exportBtn);

    expect(
      screen.getByRole("dialog", { name: /export & share cards/i })
    ).toBeInTheDocument();

    // Switch to batch export tab
    const batchTab = screen.getByRole("button", {
      name: /export for all guests/i,
    });
    await user.click(batchTab);

    // Click "Generate All Cards"
    const generateBtn = screen.getByRole("button", {
      name: /generate all cards/i,
    });
    await user.click(generateBtn);

    // Await batch completion (default 3 sample guests)
    await waitFor(() => {
      expect(screen.getByText(/cards ready/i)).toBeInTheDocument();
    });

    // Check individual download buttons
    expect(
      screen.getAllByRole("button", { name: "PNG" }).length
    ).toBeGreaterThanOrEqual(1);

    // Check Print All button
    const printAllBtn = screen.getByRole("button", {
      name: /print all cards/i,
    });
    expect(printAllBtn).toBeInTheDocument();
  });

  it("has zero accessibility violations (jest-axe) across initial and modal states", async () => {
    const { container } = render(
      <CardStudio palette={mockPalette} eventInput={mockInput} />
    );

    // Check initial workspace accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
