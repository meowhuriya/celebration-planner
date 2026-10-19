"use client";

import { useEffect, useRef, useState } from "react";

export default function CursorRing() {
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const posRef = useRef({ x: -100, y: -100 });
  const targetRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Only enable on desktop devices with fine pointer and no reduced motion
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!hasFinePointer || reducedMotion) return;
    setEnabled(true);

    const onPointerMove = (e: PointerEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };

      // Check if hovering over an interactive element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.closest(
          "a, button, [role='button'], input, textarea, select, [role='radio'], [tabindex='0']"
        ) !== null
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        // Hide ring when navigating via keyboard
        if (ringRef.current) ringRef.current.style.opacity = "0";
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("keydown", onKeyDown, { passive: true });

    const loop = () => {
      const ring = ringRef.current;
      if (ring) {
        // Easing interpolation
        posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.22;
        posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.22;

        ring.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) translate(-50%, -50%)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full border border-[#5B1A2B]/40 transition-[width,height,border-color,background-color] duration-200"
      style={{
        width: isHovered ? "54px" : "36px",
        height: isHovered ? "54px" : "36px",
        backgroundColor: isHovered ? "rgba(91, 26, 43, 0.05)" : "transparent",
        borderColor: isHovered
          ? "rgba(91, 26, 43, 0.75)"
          : "rgba(91, 26, 43, 0.35)",
        willChange: "transform",
      }}
    />
  );
}
