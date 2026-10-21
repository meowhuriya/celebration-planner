import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import VenueDesigner from "@/components/sections/venue-designer/VenueDesigner";

expect.extend(toHaveNoViolations);

describe("VenueDesigner Component (Stage 2)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders toolbar, interactive SVG canvas, inspector, and clearance summary", () => {
    render(<VenueDesigner guestCount={50} eventType="wedding" />);

    // Header & Section Title
    expect(screen.getByText(/Event floor plan/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: /Event floor plan designer/i,
      })
    ).toBeInTheDocument();

    // Toolbar controls
    expect(
      screen.getByRole("combobox", {
        name: /Venue atmosphere and surface type/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Room width/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Room height/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /\+ Add fixture/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Undo last change/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Redo last change/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Toggle grid snap/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Auto layout/i })
    ).toBeInTheDocument();

    // SVG Canvas
    expect(
      screen.getByRole("region", { name: /Interactive venue floor plan/i })
    ).toBeInTheDocument();

    // Clearance & Capacity Summary
    expect(screen.getByText(/Capacity summary/i)).toBeInTheDocument();
    expect(screen.getByText(/square meters per guest/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copy layout summary/i })
    ).toBeInTheDocument();
  });

  it("switches venue surface type and toggles display units (m / ft)", async () => {
    const user = userEvent.setup();
    render(<VenueDesigner guestCount={60} eventType="wedding" />);

    const venueSelect = screen.getByRole("combobox", {
      name: /Venue atmosphere and surface type/i,
    });
    await user.selectOptions(venueSelect, "garden");
    expect(venueSelect).toHaveValue("garden");

    // Toggle unit to feet
    const ftBtn = screen.getByRole("button", {
      name: /Display measurements in feet/i,
    });
    await user.click(ftBtn);

    const mBtn = screen.getByRole("button", {
      name: /Display measurements in meters/i,
    });
    expect(mBtn).toBeInTheDocument();
  });

  it("adds a new fixture to the room via Add menu", async () => {
    const user = userEvent.setup();
    render(<VenueDesigner guestCount={40} eventType="birthday" />);

    const addBtn = screen.getByRole("button", { name: /\+ Add fixture/i });
    await user.click(addBtn);

    const barOption = screen.getByRole("menuitem", { name: /Beverage bar/i });
    expect(barOption).toBeInTheDocument();
    await user.click(barOption);

    // Inspector should now inspect the newly added Beverage Bar
    expect(
      screen.getByLabelText(/Item inspector: Beverage Bar/i)
    ).toBeInTheDocument();
  });

  it("selects item and modifies coordinates and label via inspector panel", async () => {
    const user = userEvent.setup();
    render(<VenueDesigner guestCount={50} eventType="wedding" />);

    // Click on Table 1 (aria-label starts with Table 1,)
    const table1 = screen.getByRole("button", { name: /^Table 1,/i });
    await user.click(table1);

    // Inspector is populated
    const labelInput = screen.getByLabelText("Label");
    expect(labelInput).toHaveValue("Table 1");

    // Rename table
    await user.clear(labelInput);
    await user.type(labelInput, "VIP Bridal Table");
    expect(labelInput).toHaveValue("VIP Bridal Table");

    // Modify X coordinate
    const xInput = screen.getByLabelText(/^X/i);
    fireEvent.change(xInput, { target: { value: "8.5" } });
    expect(xInput).toHaveValue(8.5);
  });

  it("supports keyboard move (Arrow keys) and rotation (R key)", () => {
    render(<VenueDesigner guestCount={50} eventType="wedding" />);

    const table1 = screen.getByRole("button", { name: /^Table 1,/i });
    table1.focus();
    expect(document.activeElement).toBe(table1);

    // Nudge right with ArrowRight
    fireEvent.keyDown(table1, { key: "ArrowRight" });
    // Rotate with R key
    fireEvent.keyDown(table1, { key: "r" });

    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
  });

  it("supports undo and redo interactions", async () => {
    const user = userEvent.setup();
    render(<VenueDesigner guestCount={50} eventType="wedding" />);

    const undoBtn = screen.getByRole("button", { name: /Undo last change/i });
    expect(undoBtn).toBeDisabled();

    // Add an item
    const addBtn = screen.getByRole("button", { name: /\+ Add fixture/i });
    await user.click(addBtn);
    const photoBooth = screen.getByRole("menuitem", { name: /Photo booth/i });
    await user.click(photoBooth);

    expect(undoBtn).toBeEnabled();
    await user.click(undoBtn);

    const redoBtn = screen.getByRole("button", { name: /Redo last change/i });
    expect(redoBtn).toBeEnabled();
    await user.click(redoBtn);
  });

  it("detects and lists clearance overlaps live with text list", async () => {
    const user = userEvent.setup();
    render(<VenueDesigner guestCount={50} eventType="wedding" />);

    // Select Table 1 and place it directly on Table 2
    const table1 = screen.getByRole("button", { name: /^Table 1,/i });
    await user.click(table1);

    const xInput = screen.getByLabelText(/^X/i);
    const yInput = screen.getByLabelText(/^Y/i);

    // Put Table 1 right on top of Table 2's typical position
    fireEvent.change(xInput, { target: { value: "2.2" } });
    fireEvent.change(yInput, { target: { value: "8.0" } });

    // Should flag an overlap or walking clearance issue
    const alerts = screen.getAllByText(
      /clearance alerts? detected|clearance corridor|overlapping/i
    );
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("copies layout summary text to clipboard when copy button clicked", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<VenueDesigner guestCount={50} eventType="wedding" />);

    const copyBtn = screen.getByRole("button", {
      name: /Copy layout summary/i,
    });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("VENUE FLOOR PLAN");
    expect(copiedText).toContain("Dimensions:");
  });

  it("resets layout when Auto layout button is clicked", async () => {
    const user = userEvent.setup();
    render(<VenueDesigner guestCount={50} eventType="wedding" />);

    const autoBtn = screen.getByRole("button", {
      name: /Reset floor plan to smart auto layout/i,
    });
    await user.click(autoBtn);

    expect(screen.getByText(/Capacity summary/i)).toBeInTheDocument();
  });

  it("has zero accessibility violations (jest-axe)", async () => {
    const { container } = render(
      <VenueDesigner guestCount={50} eventType="wedding" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
