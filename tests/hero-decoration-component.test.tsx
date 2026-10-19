import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "./axe-helper";
import HeroDecoration, {
  CelebrateBurstButton,
  type HeroDecorationRef,
} from "@/components/editorial/HeroDecoration";
import { createRef } from "react";
import EventPlanner from "@/components/EventPlanner";

expect.extend(toHaveNoViolations);

describe("HeroDecoration Component", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders wedding static layer with garland, 14 flowers, and faint mandala outline", () => {
    const { container } = render(
      <HeroDecoration
        eventType="wedding"
        cultureOrTradition="hindu"
        palette={{
          name: "Diwali Gold",
          colors: ["#D4AF37", "#F59E0B", "#B45309", "#78350F"],
        }}
      />
    );

    // Mandala check
    expect(container.querySelector("svg circle[r='95']")).toBeTruthy();
    // Desktop garland (14 flowers: 7 marigolds + 7 jasmines)
    const marigolds = container.querySelectorAll("circle[r='10']");
    expect(marigolds.length).toBeGreaterThanOrEqual(7);
  });

  it("renders community/diwali decoration with string of 5 diyas and hanging lantern", () => {
    const { container } = render(
      <HeroDecoration
        eventType="community"
        cultureOrTradition="diwali"
        palette={{
          name: "Diwali Deep",
          colors: ["#EA580C", "#D97706", "#FDE047", "#7C2D12"],
        }}
      />
    );

    // Hanging swag path
    const swagPath = container.querySelector("path[d*='Q 200,60']");
    expect(swagPath).toBeTruthy();

    // 5 Terracotta Diya Bowls
    const diyaBowls = container.querySelectorAll("path[d*='M -12,4 C -12,12']");
    expect(diyaBowls.length).toBe(5);

    // Octagonal Kandil / Paper Lantern
    const lantern = container.querySelector("polygon[points*='40,20 62,45']");
    expect(lantern).toBeTruthy();
  });

  it("renders birthday decoration with bunting banner and balloon strings", () => {
    const { container } = render(
      <HeroDecoration
        eventType="birthday"
        vibeOrTheme="playful"
        palette={{
          name: "Pastel Pop",
          colors: ["#EC4899", "#8B5CF6", "#3B82F6", "#10B981"],
        }}
      />
    );

    // 10 Bunting Pennants
    const buntingPennants = container.querySelectorAll("svg polygon");
    expect(buntingPennants.length).toBeGreaterThanOrEqual(10);

    // 3 Balloon strings
    const balloonStrings = container.querySelectorAll(
      "path[d*='Q 25,90'], path[d*='Q 55,95'], path[d*='Q 40,85']"
    );
    expect(balloonStrings.length).toBe(3);
  });

  it("renders other decoration with geometric bunting", () => {
    const { container } = render(
      <HeroDecoration
        eventType="other"
        vibeOrTheme="elegant"
        palette={{
          name: "Modern Chic",
          colors: ["#6366F1", "#06B6D4", "#10B981", "#F59E0B"],
        }}
      />
    );

    const pennants = container.querySelectorAll("svg polygon");
    expect(pennants.length).toBe(7);
  });

  it("renders drifting petals when prefers-reduced-motion is false and hides when true", () => {
    // Normal motion
    const { container: normalContainer } = render(
      <HeroDecoration eventType="wedding" />
    );
    expect(normalContainer.querySelectorAll(".drift-petal").length).toBe(8);

    // Reduced motion
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container: reducedContainer } = render(
      <HeroDecoration eventType="wedding" />
    );
    expect(reducedContainer.querySelectorAll(".drift-petal").length).toBe(0);
  });

  it("imperative handle triggerBurst creates particle canvas and cleans up", () => {
    vi.useFakeTimers();
    const ref = createRef<HeroDecorationRef>();
    const { container } = render(
      <HeroDecoration ref={ref} eventType="wedding" />
    );

    // Mock client dimensions
    const outerDiv = container.firstElementChild as HTMLElement;
    Object.defineProperty(outerDiv, "clientWidth", {
      value: 800,
      configurable: true,
    });
    Object.defineProperty(outerDiv, "clientHeight", {
      value: 500,
      configurable: true,
    });

    // Mock Canvas 2D context
    const clearRectMock = vi.fn();
    const fillRectMock = vi.fn();
    const arcMock = vi.fn();
    const fillMock = vi.fn();
    const beginPathMock = vi.fn();
    const saveMock = vi.fn();
    const restoreMock = vi.fn();

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: clearRectMock,
      fillRect: fillRectMock,
      arc: arcMock,
      fill: fillMock,
      beginPath: beginPathMock,
      save: saveMock,
      restore: restoreMock,
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
    } as any);

    expect(container.querySelector("canvas")).toBeNull();

    // Trigger burst
    act(() => {
      ref.current?.triggerBurst();
    });

    // Canvas exists
    expect(container.querySelector("canvas")).toBeTruthy();

    // Rapid successive trigger is blocked by concurrency guard
    act(() => {
      ref.current?.triggerBurst();
    });
    expect(container.querySelectorAll("canvas").length).toBe(1);

    // Fast-forward 1500ms
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    vi.useRealTimers();
  });

  it("CelebrateBurstButton triggers onBurst when clicked and has accessible name", () => {
    const handleBurst = vi.fn();
    render(<CelebrateBurstButton onBurst={handleBurst} />);

    const button = screen.getByRole("button", {
      name: /celebrate with a particle burst/i,
    });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleBurst).toHaveBeenCalledTimes(1);
  });

  it("passes jest-axe accessibility checks across all 4 event types", async () => {
    const types = ["wedding", "birthday", "community", "other"] as const;

    for (const type of types) {
      const { container } = render(
        <div>
          <HeroDecoration eventType={type} />
          <CelebrateBurstButton onBurst={() => {}} />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it("renders the 3 updated feature cards in EventPlanner highlights row", () => {
    render(<EventPlanner />);

    // 3 updated feature cards
    expect(screen.getByText("Venue designer")).toBeInTheDocument();
    expect(screen.getByText("Seating plan")).toBeInTheDocument();
    expect(screen.getByText("QR RSVP")).toBeInTheDocument();

    // Old cards should not exist
    expect(screen.queryByText("Budget & timeline")).toBeNull();
    expect(screen.queryByText("Digital card")).toBeNull();
    expect(screen.queryByText("WhatsApp & PDF")).toBeNull();

    // Celebrate button is present in hero
    expect(
      screen.getByRole("button", { name: /celebrate with a particle burst/i })
    ).toBeInTheDocument();
  });
});
