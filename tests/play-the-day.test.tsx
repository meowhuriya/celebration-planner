import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "./axe-helper";
import PlayTheDay from "@/components/editorial/PlayTheDay";
import FloorPlanCard from "@/components/sections/FloorPlanCard";
import type { RunSheetItem } from "@/lib/schemas";

expect.extend(toHaveNoViolations);

describe("PlayTheDay Component", () => {
  const sampleRunSheet: RunSheetItem[] = [
    {
      time: "09:00 AM",
      activity: "Vendor load-in & stage setup",
      owner: "Venue Coordinator",
      notes: "Verify floral arch",
    },
    {
      time: "11:30 AM",
      activity: "Audio check & mic tests",
      owner: "AV Technician",
      notes: "Sound balance",
    },
    {
      time: "02:00 PM",
      activity: "Guest arrival & welcome drinks",
      owner: "Hospitality Lead",
      notes: "Registration open",
    },
    {
      time: "06:00 PM",
      activity: "Ceremony & cultural rituals",
      owner: "Ceremony Master",
      notes: "Main event",
    },
    {
      time: "10:00 PM",
      activity: "Guest farewell & wrap up",
      owner: "Host Family",
      notes: "Favors distributed",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with native input range slider and big NOW / NEXT strip", () => {
    render(<PlayTheDay runSheet={sampleRunSheet} />);

    expect(screen.getByText(/Play the day/i)).toBeInTheDocument();
    expect(screen.getByText(/Day-of schedule/i)).toBeInTheDocument();

    const slider = screen.getByRole("slider", {
      name: /Day-of schedule timeline scrubber/i,
    });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("min", "540"); // 09:00 AM = 540 min
    expect(slider).toHaveAttribute("max", "1320"); // 10:00 PM = 1320 min

    // Big NOW and NEXT cards
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(
      screen.getByText("Vendor load-in & stage setup")
    ).toBeInTheDocument();
    expect(screen.getByText("Audio check & mic tests")).toBeInTheDocument();
  });

  it("updates NOW / NEXT cards when the slider is scrubbed", () => {
    render(<PlayTheDay runSheet={sampleRunSheet} />);

    const slider = screen.getByRole("slider", {
      name: /Day-of schedule timeline scrubber/i,
    });

    // Scrub forward to 02:30 PM (870 minutes)
    fireEvent.change(slider, { target: { value: "870" } });

    // NOW should now be Guest arrival & welcome drinks (started at 02:00 PM = 840)
    expect(
      screen.getByText("Guest arrival & welcome drinks")
    ).toBeInTheDocument();
    // NEXT should now be Ceremony & cultural rituals (starts at 06:00 PM)
    expect(screen.getByText("Ceremony & cultural rituals")).toBeInTheDocument();
  });

  it("notifies onActiveItemChange when the current activity changes", () => {
    const handleActiveChange = vi.fn();
    render(
      <PlayTheDay
        runSheet={sampleRunSheet}
        onActiveItemChange={handleActiveChange}
      />
    );

    expect(handleActiveChange).toHaveBeenCalled();
  });

  it("toggles play/pause playback and advances time", () => {
    vi.useFakeTimers();

    render(<PlayTheDay runSheet={sampleRunSheet} />);

    const playButton = screen.getByRole("button", {
      name: /Play schedule playback/i,
    });
    expect(playButton).toBeInTheDocument();

    // Click play
    fireEvent.click(playButton);
    expect(screen.getByText("Pause")).toBeInTheDocument();

    // Advance timer by 1 second (should advance schedule by 5 minutes)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Click pause
    fireEvent.click(
      screen.getByRole("button", { name: /Pause schedule playback/i })
    );
    expect(screen.getByText("Play")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("has zero accessibility violations (jest-axe)", async () => {
    const { container } = render(<PlayTheDay runSheet={sampleRunSheet} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("FloorPlanCard Component", () => {
  it("renders venue designer and capacity summary", () => {
    render(<FloorPlanCard />);

    expect(screen.getByText(/Event floor plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Capacity summary/i)).toBeInTheDocument();
  });

  it("has zero accessibility violations (jest-axe)", async () => {
    const { container } = render(<FloorPlanCard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
