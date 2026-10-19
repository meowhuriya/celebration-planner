import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import Ribbon3D from "@/components/editorial/Ribbon3D";
import { axe, toHaveNoViolations } from "./axe-helper";

expect.extend(toHaveNoViolations);

describe("Ribbon3D Component", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    // Mock IntersectionObserver
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn().mockImplementation((callback) => ({
        observe: vi.fn((el) => {
          callback([{ isIntersecting: true, target: el }]);
        }),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with aria-hidden, pointer-events none, and perspective 1200px", () => {
    const { container } = render(
      <Ribbon3D
        eventType="wedding"
        palette={{
          name: "Test Palette",
          colors: ["#D4AF37", "#800020", "#2E7D32", "#FAF9F6"],
        }}
      />
    );

    const ribbonEl = container.firstElementChild as HTMLElement;
    expect(ribbonEl).toHaveAttribute("aria-hidden", "true");
    expect(ribbonEl.className).toContain("pointer-events-none");
    expect(ribbonEl.style.perspective).toBe("1200px");
  });

  it("renders exactly 16 slim rounded capsule panels with 58px width and 142px height", () => {
    const { container } = render(
      <Ribbon3D
        eventType="wedding"
        palette={{
          name: "Test Palette",
          colors: ["#D4AF37", "#800020", "#2E7D32", "#FAF9F6"],
        }}
      />
    );

    const panels = container.querySelectorAll(".rounded-full.absolute");
    expect(panels).toHaveLength(16);

    panels.forEach((panel) => {
      expect(panel.className).toContain("w-[58px]");
      expect(panel.className).toContain("h-[142px]");
      expect(panel.className).toContain("rounded-full");
    });
  });

  it("applies soft palette gradients to capsule panels", () => {
    const { container } = render(
      <Ribbon3D
        eventType="wedding"
        palette={{
          name: "Test Palette",
          colors: ["#D4AF37", "#800020", "#2E7D32", "#FAF9F6"],
        }}
      />
    );

    const panels = container.querySelectorAll(".rounded-full.absolute");
    const styleAttr = (panels[0] as HTMLElement).style.background;
    expect(styleAttr).toContain("linear-gradient(");
  });

  it("renders the matched motif SVG icon for different event types", () => {
    // Wedding -> ring motif
    const { container: weddingContainer } = render(
      <Ribbon3D eventType="wedding" />
    );
    expect(
      weddingContainer.querySelector("circle[cx='12'][cy='15']")
    ).toBeInTheDocument();

    // Diwali -> diya motif
    const { container: diwaliContainer } = render(
      <Ribbon3D eventType="other" cultureOrTradition="Diwali celebration" />
    );
    expect(
      diwaliContainer.querySelector("path[d='M4 14C4 18 20 18 20 14H4Z']")
    ).toBeInTheDocument();

    // Birthday -> cake motif
    const { container: birthdayContainer } = render(
      <Ribbon3D eventType="birthday" />
    );
    expect(
      birthdayContainer.querySelector("rect[x='4'][y='14.5']")
    ).toBeInTheDocument();
  });

  it("cleans up smoothly on unmount without throwing errors", () => {
    const { unmount } = render(<Ribbon3D eventType="wedding" />);
    expect(() => unmount()).not.toThrow();
  });

  it("has zero accessibility violations (jest-axe)", async () => {
    const { container } = render(
      <div role="region" aria-label="Hero Section">
        <Ribbon3D eventType="wedding" />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
