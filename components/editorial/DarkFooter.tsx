"use client";

import InteractiveDaisies from "./InteractiveDaisies";

interface DarkFooterProps {
  onStartPlanning?: () => void;
}

export default function DarkFooter({ onStartPlanning }: DarkFooterProps) {
  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    }
  };

  const handleStartPlanningClick = () => {
    if (onStartPlanning) {
      onStartPlanning();
      return;
    }

    handleScrollTo("intake");
    setTimeout(() => {
      const firstField = document.getElementById("hostName");
      firstField?.focus();
    }, 300);
  };

  const handleBackToTop = () => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  };

  return (
    <footer
      id="about"
      className="mt-28 border-t border-[#3A1B17] bg-[#24100E] text-[#FBF6EE] print:hidden"
      aria-label="Footer and about"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        {/* Top Section: Wordmark + Calm 5 Arch Windows + Outlined Card */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
          {/* Left: Huge Serif Wordmark & Friendly Subtitle */}
          <div className="space-y-4 lg:col-span-5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C9A24B]">
              Celebrate
            </span>
            <h2 className="font-serif text-5xl font-normal tracking-tight text-[#FBF6EE] sm:text-6xl lg:text-7xl">
              Let&apos;s{" "}
              <span className="italic text-[#C9A24B]">celebrate.</span>
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-[#E8DCC8]">
              Plan your celebration with ease — from budgets and seating charts
              to custom invitations and timelines. Everything stays private on
              your device, ready whenever you need it.
            </p>
          </div>

          {/* Center: Interactive Swaying Daisies on Long Pedicels */}
          <InteractiveDaisies />

          {/* Right: Rounded Outlined "Start planning" card with warm maroon button */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-[#C9A24B]/30 bg-[#2D1513]/80 p-6 backdrop-blur-sm sm:p-7">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C9A24B]">
                Begin in seconds
              </span>
              <h3 className="mt-2 font-serif text-2xl font-normal text-[#FBF6EE]">
                Start planning{" "}
                <span className="italic text-[#C9A24B]">today</span>
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#E8DCC8]">
                Get a custom budget breakdown, guest seating map, and timeline
                in moments.
              </p>
              <button
                type="button"
                onClick={handleStartPlanningClick}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#C9A24B]/40 bg-[#5B1A2B] px-5 py-3 text-xs font-semibold text-[#FBF6EE] shadow-sm transition-all hover:border-[#C9A24B] hover:bg-[#3A0F1C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#24100E]"
              >
                <span>Start planning</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Links & Copyright */}
        <div className="mt-16 flex flex-col justify-between gap-6 border-t border-[#3A1B17] pt-8 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#C9A24B]">
            <button
              type="button"
              onClick={() => handleScrollTo("home")}
              className="text-[#E8DCC8] transition-colors hover:text-[#FBF6EE] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo("intake")}
              className="text-[#E8DCC8] transition-colors hover:text-[#FBF6EE] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B]"
            >
              Plan
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo("examples")}
              className="text-[#E8DCC8] transition-colors hover:text-[#FBF6EE] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B]"
            >
              Examples
            </button>
            <button
              type="button"
              onClick={handleBackToTop}
              className="text-[#FBF6EE] transition-colors hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B]"
            >
              Back to top ↑
            </button>
          </div>

          <div className="text-xs text-[#E8DCC8]">
            Celebrate · Free to use · Your plans stay on your device
          </div>
        </div>
      </div>
    </footer>
  );
}
