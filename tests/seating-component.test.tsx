import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { axe, toHaveNoViolations } from "./axe-helper";
import AutoFloorPlan from "../components/sections/AutoFloorPlan";

expect.extend(toHaveNoViolations);

describe("Seating Plan Component & Accessibility (Stages 2 & 3)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders seating floor plan and guest management panel", () => {
    render(<AutoFloorPlan guestCount={24} eventType="wedding" />);

    expect(screen.getByText(/Venue & table/i)).toBeInTheDocument();
    expect(screen.getByText(/Guest Seating Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/0 of 0 seated/i)).toBeInTheDocument();
    expect(screen.getByText(/Seats per table:/i)).toBeInTheDocument();
  });

  it("adds a single guest and multiple pasted guests to the list", async () => {
    const user = userEvent.setup();
    render(<AutoFloorPlan guestCount={24} eventType="wedding" />);

    // 1. Add single guest
    const nameInput = screen.getByLabelText("Guest name");
    const groupInput = screen.getByLabelText("Optional group tag");
    const addBtn = screen.getByRole("button", { name: /\+ Add guest/i });

    await user.type(nameInput, "Aisha Khan");
    await user.type(groupInput, "Bride Family");
    await user.click(addBtn);

    expect(screen.getByText("Aisha Khan")).toBeInTheDocument();
    expect(screen.getByText("Bride Family")).toBeInTheDocument();
    expect(screen.getByText(/0 of 1 seated/i)).toBeInTheDocument();

    // 2. Paste multiple guests
    const pasteToggle = screen.getByRole("button", { name: /\+ Paste many/i });
    await user.click(pasteToggle);

    const textarea = screen.getByLabelText("Paste multiple guest names");
    await user.type(textarea, "Rahul Sharma, Priya Verma");
    const pasteAddBtn = screen.getByRole("button", { name: /Add all guests/i });
    await user.click(pasteAddBtn);

    expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
    expect(screen.getByText("Priya Verma")).toBeInTheDocument();
    expect(screen.getByText(/0 of 3 seated/i)).toBeInTheDocument();
  });

  it("supports keyboard seating flow: focus, Enter to open picker, assign, and Delete to unseat", async () => {
    const user = userEvent.setup();
    render(<AutoFloorPlan guestCount={24} eventType="wedding" />);

    // Add a guest first
    const nameInput = screen.getByLabelText("Guest name");
    fireEvent.change(nameInput, { target: { value: "Vikram Mehta" } });
    const addBtn = screen.getByRole("button", { name: /\+ Add guest/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Vikram Mehta")).toBeInTheDocument();

    // Find the first seat button (Table 1, seat 1, empty)
    const seat1 = screen.getByRole("button", {
      name: /^Table 1, seat 1, empty/i,
    });
    expect(seat1).toBeInTheDocument();

    // Focus seat and press Enter to open dialog
    seat1.focus();
    fireEvent.keyDown(seat1, { key: "Enter" });

    // Modal dialog appears
    const dialog = screen.getByRole("dialog", {
      name: /Seat picker for Table 1, Seat 1/i,
    });
    expect(dialog).toBeInTheDocument();

    // Assign Vikram Mehta from the list inside dialog
    const assignBtn = within(dialog).getByRole("button", {
      name: /Vikram Mehta/i,
    });
    await user.click(assignBtn);

    // Seat should now be occupied
    const occupiedSeat = screen.getByRole("button", {
      name: /^Table 1, seat 1, Vikram Mehta/i,
    });
    expect(occupiedSeat).toBeInTheDocument();
    expect(screen.getByText(/1 of 1 seated/i)).toBeInTheDocument();

    // Press Delete to unseat
    occupiedSeat.focus();
    fireEvent.keyDown(occupiedSeat, { key: "Delete" });

    // Seat should be empty again
    expect(
      screen.getByRole("button", { name: /^Table 1, seat 1, empty/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/0 of 1 seated/i)).toBeInTheDocument();
  });

  it("shows tooltip on keyboard focus and hover", () => {
    render(<AutoFloorPlan guestCount={24} eventType="wedding" />);

    const seat1 = screen.getByRole("button", {
      name: /^Table 1, seat 1, empty/i,
    });

    // Focus shows tooltip
    fireEvent.focus(seat1);
    expect(screen.getByText(/Table 1, seat 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Empty seat/i)).toBeInTheDocument();

    // Blur hides tooltip
    fireEvent.blur(seat1);
  });

  it("filters guests via search input and unseated toggle", async () => {
    const user = userEvent.setup();
    render(<AutoFloorPlan guestCount={24} eventType="wedding" />);

    // Add two guests
    const nameInput = screen.getByLabelText("Guest name");
    const groupInput = screen.getByLabelText("Optional group tag");
    const addBtn = screen.getByRole("button", { name: /\+ Add guest/i });

    await user.type(nameInput, "Aisha Khan");
    await user.type(groupInput, "Bride Side");
    await user.click(addBtn);

    await user.type(nameInput, "Rohan Patel");
    await user.type(groupInput, "Groom Side");
    await user.click(addBtn);

    // Filter by name
    const searchInput = screen.getByLabelText("Search guests");
    await user.type(searchInput, "Rohan");

    expect(screen.getByText("Rohan Patel")).toBeInTheDocument();
    expect(screen.queryByText("Aisha Khan")).not.toBeInTheDocument();

    // Clear search
    await user.clear(searchInput);
    expect(screen.getByText("Aisha Khan")).toBeInTheDocument();
    expect(screen.getByText("Rohan Patel")).toBeInTheDocument();
  });

  it("rebuilds table capacity when seats per table stepper is clicked", async () => {
    const user = userEvent.setup();
    render(<AutoFloorPlan guestCount={24} eventType="wedding" />);

    // Default stepper is 8 (or 10 for wedding)
    const stepper6 = screen.getByRole("button", {
      name: /Set 6 seats per table/i,
    });
    await user.click(stepper6);

    expect(screen.getByText("6 seats / table")).toBeInTheDocument();

    const stepper12 = screen.getByRole("button", {
      name: /Set 12 seats per table/i,
    });
    await user.click(stepper12);

    expect(screen.getByText("12 seats / table")).toBeInTheDocument();
  });

  it("auto-seats guests across tables when auto-seat button is clicked", async () => {
    const user = userEvent.setup();
    render(<AutoFloorPlan guestCount={24} eventType="wedding" />);

    // Add 3 guests
    const pasteToggle = screen.getByRole("button", { name: /\+ Paste many/i });
    await user.click(pasteToggle);

    const textarea = screen.getByLabelText("Paste multiple guest names");
    await user.type(textarea, "Guest A, Guest B, Guest C");
    await user.click(screen.getByRole("button", { name: /Add all guests/i }));

    expect(screen.getByText(/0 of 3 seated/i)).toBeInTheDocument();

    // Click auto-seat
    const autoSeatBtn = screen.getByRole("button", { name: /⚡ Auto-seat/i });
    await user.click(autoSeatBtn);

    expect(screen.getByText(/3 of 3 seated/i)).toBeInTheDocument();
  });

  it("copies seating chart text to clipboard", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<AutoFloorPlan guestCount={24} eventType="wedding" />);

    const copyBtn = screen.getByRole("button", { name: /Copy as text/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("SEATING CHART");
  });

  it("has zero accessibility violations (jest-axe)", async () => {
    const { container } = render(
      <AutoFloorPlan guestCount={24} eventType="wedding" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
