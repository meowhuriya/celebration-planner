"use client";

import { useEffect, useRef } from "react";

interface NavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isPlanShowing?: boolean;
}

const LANDING_LINKS = [
  { label: "Event details", href: "#intake" },
  { label: "Budget", href: "#budget" },
  { label: "Timeline", href: "#timeline" },
  { label: "Vendors", href: "#vendors" },
  { label: "Ideas", href: "#ideas" },
  { label: "Day-of schedule", href: "#runsheet" },
  { label: "About", href: "#about" },
];

const PLAN_LINKS = [
  { label: "Budget", href: "#budget" },
  { label: "Floor plan", href: "#floor-plan" },
  { label: "Seating", href: "#seating" },
  { label: "Card studio", href: "#card-studio" },
  { label: "Timeline", href: "#timeline" },
  { label: "Vendors", href: "#vendors" },
  { label: "Ideas", href: "#ideas" },
  { label: "Schedule", href: "#schedule" },
  { label: "Backup plan", href: "#backup-plan" },
  { label: "About", href: "#about" },
];

export default function NavigationMenu({
  isOpen,
  onClose,
  triggerRef,
  isPlanShowing = false,
}: NavigationMenuProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const menuLinks = isPlanShowing ? PLAN_LINKS : LANDING_LINKS;

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    firstFocusableRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleLinkClick = (href: string) => {
    onClose();
    triggerRef.current?.focus();
    const target = document.querySelector(href);
    if (target) {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-[#FBF6EE] p-6 transition-all duration-300 sm:p-12"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E8DCC8] pb-6">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848]">
          {isPlanShowing ? "Plan navigation" : "Jump to section"}
        </span>
        <button
          ref={firstFocusableRef}
          type="button"
          onClick={() => {
            onClose();
            triggerRef.current?.focus();
          }}
          className="rounded-full border border-[#E8DCC8] bg-[#FFFDF8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14] transition-colors hover:bg-[#5B1A2B] hover:text-[#FBF6EE] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          aria-label="Close navigation menu"
        >
          Close [Esc]
        </button>
      </div>

      {/* Main Nav Links */}
      <nav aria-label="Section shortcuts" className="my-auto py-8">
        <ul className="space-y-4 sm:space-y-6">
          {menuLinks.map((item) => (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => handleLinkClick(item.href)}
                className="group flex w-full items-baseline justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B]"
              >
                <span className="font-serif text-3xl font-normal tracking-tight text-[#2B1B14] transition-all group-hover:translate-x-2 group-hover:italic group-hover:text-[#5B1A2B] sm:text-5xl md:text-6xl">
                  {item.label}
                </span>
                <span className="text-sm font-semibold tracking-wide text-[#6B5848] group-hover:text-[#5B1A2B]">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer Info */}
      <div className="border-t border-[#E8DCC8] pt-6 text-xs text-[#6B5848]">
        Celebrate · Free to use · Your plans stay on your device
      </div>
    </div>
  );
}
