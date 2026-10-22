import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventPlanner from "@/components/EventPlanner";
import SafeBoundary from "@/components/editorial/SafeBoundary";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockSuccessPlan = {
  budget: [
    {
      category: "Venue & Staging",
      amount: 1000000,
      percentage: 50,
      notes: "Main hall",
    },
    { category: "Catering", amount: 1000000, percentage: 50, notes: "Buffet" },
  ],
  timeline: [
    {
      title: "Book Venue",
      dueDate: "2027-01-01",
      daysBeforeEvent: 90,
      description: "Confirm booking",
      completed: false,
    },
  ],
  vendorChecklist: [
    {
      vendorType: "Caterer",
      questionsToAsk: ["Tasting menu?"],
      estimatedCost: "₹10L",
      priority: "high",
      checked: false,
    },
  ],
  ideas: {
    theme: "Royal Elegance",
    decor: ["Marigold garlands"],
    food: ["Biryani station"],
    activities: ["Live qawwali"],
    culturalNotes: "Traditional wedding rituals",
  },
  runSheet: [
    {
      time: "18:00",
      activity: "Guest arrival",
      owner: "Host",
      notes: "Welcome drinks",
    },
  ],
};

describe("EventPlanner Component Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders EventPlanner and triggers plan generation on each of the 3 example scenario clicks", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ plan: mockSuccessPlan }),
    });

    render(<EventPlanner />);

    // 1. Royal Indian Wedding example button
    const weddingBtn = screen.getByRole("button", {
      name: /Royal Indian Wedding/i,
    });
    expect(weddingBtn).toBeInTheDocument();

    // 2. Kids Birthday Bash example button
    const birthdayBtn = screen.getByRole("button", {
      name: /Kids Birthday Bash/i,
    });
    expect(birthdayBtn).toBeInTheDocument();

    // 3. Diwali Community Meetup example button
    const diwaliBtn = screen.getByRole("button", {
      name: /Diwali Community Meetup/i,
    });
    expect(diwaliBtn).toBeInTheDocument();

    // Click Kids Birthday Bash
    await userEvent.click(birthdayBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("The Sharma Family"),
        })
      );
    });

    // Verify all 3 new features are rendered in the generated plan view:
    // 1. Live Countdown
    await waitFor(() => {
      expect(screen.getByText(/Countdown to the/i)).toBeInTheDocument();
    });

    // 2. Event Palette and Floor Plan
    expect(screen.getByText(/Color harmony/i)).toBeInTheDocument();
    expect(screen.getByText(/Event floor plan/i)).toBeInTheDocument();

    // 3. Play the Day Schedule Scrubber
    expect(screen.getByText(/Play the day/i)).toBeInTheDocument();
    expect(
      screen.getByRole("slider", {
        name: /Day-of schedule timeline scrubber/i,
      })
    ).toBeInTheDocument();
  });

  it("loads Royal Indian Wedding example and renders countdown, palette, and play-the-day", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: mockSuccessPlan }),
    });

    render(<EventPlanner />);

    const weddingBtn = screen.getByRole("button", {
      name: /Royal Indian Wedding/i,
    });
    await userEvent.click(weddingBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Royal Mughal elegance"),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Countdown to the/i)).toBeInTheDocument();
      expect(screen.getByText(/Color harmony/i)).toBeInTheDocument();
      expect(screen.getByText(/Play the day/i)).toBeInTheDocument();
    });
  });

  it("loads Diwali Community Meetup example and renders countdown, palette, and play-the-day", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: mockSuccessPlan }),
    });

    render(<EventPlanner />);

    const diwaliBtn = screen.getByRole("button", {
      name: /Diwali Community Meetup/i,
    });
    await userEvent.click(diwaliBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Diwali"),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Countdown to the/i)).toBeInTheDocument();
      expect(screen.getByText(/Color harmony/i)).toBeInTheDocument();
      expect(screen.getByText(/Play the day/i)).toBeInTheDocument();
    });
  });

  it("submits intake form directly with defaults when clicking 'Generate celebration plan'", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: mockSuccessPlan }),
    });

    render(<EventPlanner />);

    const generateBtn = screen.getByRole("button", {
      name: /Generate event plan/i,
    });
    expect(generateBtn).toBeInTheDocument();

    await userEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Aisha & Rahul"),
        })
      );
    });

    // Check that success screen appears
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Wedding celebration plan/i })
      ).toBeInTheDocument();
    });
  });

  it("shows fallback plan and error message with retry button when API call fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network connection failed"));

    render(<EventPlanner />);

    const generateBtn = screen.getByRole("button", {
      name: /Generate event plan/i,
    });
    await userEvent.click(generateBtn);

    // Fallback template and visible error alert must be rendered
    await waitFor(() => {
      expect(screen.getByText(/Built-in starter/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Network connection failed/i)
      ).toBeInTheDocument();
    });

    // Try again button should be present
    expect(
      screen.getByRole("button", { name: /Try again ↻/i })
    ).toBeInTheDocument();
  });

  it("SafeBoundary catches child error and renders fallback without crashing DOM", () => {
    const ProblemChild = () => {
      throw new Error("Decorative animation crashed");
    };

    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <SafeBoundary name="TestDecorator" fallback={<div>Safe fallback</div>}>
        <ProblemChild />
      </SafeBoundary>
    );

    expect(screen.getByText("Safe fallback")).toBeInTheDocument();
    spy.mockRestore();
  });
});
