"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import NavigationMenu from "./NavigationMenu";

export interface PlanStepItem {
  id: string;
  label: string;
}

export const PLAN_STEPS: PlanStepItem[] = [
  { id: "budget", label: "Budget" },
  { id: "floor-plan", label: "Floor plan" },
  { id: "seating", label: "Seating" },
  { id: "card-studio", label: "Card studio" },
  { id: "timeline", label: "Timeline" },
  { id: "vendors", label: "Vendors" },
  { id: "ideas", label: "Ideas" },
  { id: "schedule", label: "Schedule" },
  { id: "backup-plan", label: "Backup plan" },
];

interface TopBarProps {
  isPlanShowing?: boolean;
}

export default function TopBar({ isPlanShowing = false }: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<string>("budget");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const desktopNavRef = useRef<HTMLElement>(null);
  const stepButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const isUserScrollingRef = useRef(false);

  // Measure and update the sliding underline position
  const updateIndicator = useCallback((stepId: string) => {
    const btn = stepButtonRefs.current[stepId];
    if (btn) {
      setIndicatorStyle({
        left: btn.offsetLeft,
        width: btn.offsetWidth,
        opacity: 1,
      });
    }
  }, []);

  useEffect(() => {
    if (isPlanShowing) {
      updateIndicator(activeStep);
    }
  }, [activeStep, isPlanShowing, updateIndicator]);

  // Hairline scroll progress
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const progress = Math.min(
          100,
          Math.max(0, (window.scrollY / scrollHeight) * 100)
        );
        setScrollProgress(progress);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver to highlight active step as user scrolls
  useEffect(() => {
    if (!isPlanShowing || typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isUserScrollingRef.current) return;

        // Find intersecting entries
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length > 0) {
          // Sort by visibility ratio and proximity to top
          const topEntry = intersecting.sort((a, b) => {
            const topA = a.boundingClientRect.top;
            const topB = b.boundingClientRect.top;
            return Math.abs(topA) - Math.abs(topB);
          })[0];

          if (topEntry?.target.id) {
            setActiveStep(topEntry.target.id);
          }
        }
      },
      {
        rootMargin: "-15% 0px -40% 0px",
        threshold: [0, 0.2, 0.5, 0.8],
      }
    );

    PLAN_STEPS.forEach((step) => {
      const el = document.getElementById(step.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isPlanShowing]);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    }
  };

  const handleStepClick = (stepId: string) => {
    setActiveStep(stepId);
    updateIndicator(stepId);

    isUserScrollingRef.current = true;
    handleScrollTo(stepId);

    // Reset lock after scroll settles
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 600);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E8DCC8] bg-[#FBF6EE]/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleScrollTo("home")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B1A2B] font-serif text-xl italic text-[#FBF6EE] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B] focus-visible:ring-offset-2"
              aria-label="Celebrate Home"
            >
              C
            </button>
            <div>
              <span className="font-serif text-xl tracking-tight text-[#2B1B14]">
                Celebrate
              </span>
              <span className="block text-xs font-medium text-[#6B5848]">
                Event planning, made easy
              </span>
            </div>
          </div>

          {/* Center Links: Plan Steps or Landing Links */}
          {isPlanShowing ? (
            <nav
              ref={desktopNavRef}
              aria-label="Plan sections"
              className="relative hidden items-center gap-1 font-sans text-xs font-semibold uppercase tracking-[0.1em] lg:flex"
            >
              {PLAN_STEPS.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    ref={(el) => {
                      stepButtonRefs.current[step.id] = el;
                    }}
                    type="button"
                    onClick={() => handleStepClick(step.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={`rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B] ${
                      isActive
                        ? "font-bold text-[#5B1A2B]"
                        : "text-[#6B5848] hover:text-[#2B1B14]"
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}

              {/* Sliding 300ms Underline Indicator */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 h-[2px] bg-[#5B1A2B] transition-all duration-300 ease-out motion-reduce:transition-none"
                style={{
                  transform: `translateX(${indicatorStyle.left}px)`,
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity,
                }}
              />
            </nav>
          ) : (
            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-8 font-sans text-sm font-medium text-[#2B1B14] md:flex"
            >
              <button
                type="button"
                onClick={() => handleScrollTo("home")}
                className="transition-colors hover:text-[#5B1A2B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B]"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => handleScrollTo("intake")}
                className="transition-colors hover:text-[#5B1A2B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B]"
              >
                Plan
              </button>
              <button
                type="button"
                onClick={() => handleScrollTo("examples")}
                className="transition-colors hover:text-[#5B1A2B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B]"
              >
                Examples
              </button>
              <button
                type="button"
                onClick={() => handleScrollTo("about")}
                className="transition-colors hover:text-[#5B1A2B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B]"
              >
                About
              </button>
            </nav>
          )}

          {/* Right: Hamburger button & status */}
          <div className="flex items-center gap-4">
            <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848] xl:inline-block">
              Free to use
            </span>
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] text-[#2B1B14] transition-colors hover:bg-[#5B1A2B] hover:text-[#FBF6EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B] focus-visible:ring-offset-2"
              aria-label="Open section navigation menu"
              aria-expanded={isMenuOpen}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="17" y2="6" strokeLinecap="round" />
                <line x1="3" y1="14" x2="17" y2="14" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet (<1024px) Horizontally Scrollable Pill Row with Faded Edges */}
        {isPlanShowing && (
          <div className="relative border-t border-[#E8DCC8]/80 bg-[#FBF6EE]/95 px-4 py-2 lg:hidden">
            {/* Left faded edge */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-6 bg-gradient-to-r from-[#FBF6EE] to-transparent"
              aria-hidden="true"
            />
            {/* Right faded edge */}
            <div
              className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-6 bg-gradient-to-l from-[#FBF6EE] to-transparent"
              aria-hidden="true"
            />
            <nav
              aria-label="Plan sections mobile"
              className="no-scrollbar flex items-center gap-2 overflow-x-auto scroll-smooth px-1 py-0.5"
            >
              {PLAN_STEPS.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepClick(step.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B] ${
                      isActive
                        ? "bg-[#5B1A2B] text-[#FBF6EE] shadow-sm"
                        : "border border-[#E8DCC8] bg-[#FFFDF8] text-[#6B5848] hover:border-[#5B1A2B] hover:text-[#2B1B14]"
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Hairline Scroll Progress Bar */}
        <div
          className="h-[2px] w-full overflow-hidden bg-transparent"
          aria-hidden="true"
        >
          <div
            className="h-full bg-[#5B1A2B] transition-[width] duration-150 ease-out motion-reduce:transition-none"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </header>

      {/* Navigation Overlay Dialog */}
      <NavigationMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        triggerRef={hamburgerRef}
        isPlanShowing={isPlanShowing}
      />
    </>
  );
}
