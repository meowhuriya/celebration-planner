import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import EventForm from "@/components/EventForm";

expect.extend(toHaveNoViolations);

describe("EventForm", () => {
  const mockSubmit = vi.fn();

  it("renders all form fields", () => {
    render(<EventForm onSubmit={mockSubmit} />);

    expect(
      screen.getByRole("heading", { name: /Event details/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Host Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Guest Count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Theme or Vibe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Culture or Tradition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Special Requirements/i)).toBeInTheDocument();
  });

  it("shows event type buttons", () => {
    render(<EventForm onSubmit={mockSubmit} />);

    expect(
      screen.getByRole("button", { name: /wedding/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /birthday/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /community/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /other/i })).toBeInTheDocument();
  });

  it("highlights selected event type", async () => {
    render(<EventForm onSubmit={mockSubmit} />);

    const weddingBtn = screen.getByRole("button", { name: /wedding/i });
    await userEvent.click(weddingBtn);

    expect(weddingBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("shows validation errors on empty submit", async () => {
    render(<EventForm onSubmit={mockSubmit} />);

    const submitBtn = screen.getByRole("button", { name: /generate.*plan/i });
    await userEvent.click(submitBtn);

    expect(screen.getByText("Please select an event type")).toBeInTheDocument();
    expect(screen.getByText("Event date is required")).toBeInTheDocument();
    expect(screen.getByText("City is required")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<EventForm onSubmit={mockSubmit} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("shows character count for special requirements", () => {
    render(<EventForm onSubmit={mockSubmit} />);
    expect(screen.getByText("0/500 characters")).toBeInTheDocument();
  });

  it("defaults currency to INR", () => {
    render(<EventForm onSubmit={mockSubmit} />);
    const currencySelect = screen.getByLabelText(
      /Currency/i
    ) as HTMLSelectElement;
    expect(currencySelect.value).toBe("INR");
  });
});
