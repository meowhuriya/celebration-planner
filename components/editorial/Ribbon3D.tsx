"use client";

import React, { useEffect, useRef, useMemo } from "react";
import {
  computeRibbonPanels,
  getEventMotif,
  getRibbonGradients,
  type RibbonMotif,
} from "@/lib/ribbon";
import type { EventPalette } from "@/lib/schemas";

interface Ribbon3DProps {
  eventType?: string;
  cultureOrTradition?: string;
  vibeOrTheme?: string;
  palette?: EventPalette | null;
  className?: string;
}

/**
 * Inline vector SVG motifs: diya, ring, balloon, flower, confetti, cake.
 * 100% self-contained vectors — no remote images.
 */
function RibbonMotifIcon({
  motif,
  className = "w-6 h-6",
}: {
  motif: RibbonMotif;
  className?: string;
}) {
  switch (motif) {
    case "diya":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          {/* Bowl base */}
          <path d="M4 14C4 18 20 18 20 14H4Z" />
          {/* Stand */}
          <path d="M9 18H15L14 20H10L9 18Z" opacity="0.8" />
          {/* Teardrop flame outer */}
          <path
            d="M12 3C10.2 7 9 9 9 11C9 12.65 10.35 14 12 14C13.65 14 15 12.65 15 11C15 9 13.8 7 12 3Z"
            fill="#FFF9C4"
          />
          {/* Flame inner core */}
          <path
            d="M12 6C11 8.5 10.5 9.8 10.5 11C10.5 11.8 11.2 12.5 12 12.5C12.8 12.5 13.5 11.8 13.5 11C13.5 9.8 13 8.5 12 6Z"
            fill="#FFD54F"
          />
        </svg>
      );

    case "ring":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="15" r="5.5" />
          {/* Faceted gemstone */}
          <path
            d="M9 5L12 2L15 5L12 7L9 5Z"
            fill="currentColor"
            strokeWidth="1.5"
          />
          <path d="M12 7L12 9.5" />
        </svg>
      );

    case "balloon":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <ellipse cx="12" cy="10" rx="6.5" ry="7.5" />
          <polygon points="12,17.5 10,20 14,20" opacity="0.9" />
          <path
            d="M12 20Q13.5 22 11.5 23.5"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Gloss highlight */}
          <path
            d="M9 6C8 7.5 8 9 9 10.5"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </svg>
      );

    case "flower":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          {/* Petals */}
          <circle cx="12" cy="7" r="2.8" opacity="0.9" />
          <circle cx="12" cy="17" r="2.8" opacity="0.9" />
          <circle cx="7" cy="12" r="2.8" opacity="0.9" />
          <circle cx="17" cy="12" r="2.8" opacity="0.9" />
          <circle cx="8.5" cy="8.5" r="2.6" opacity="0.85" />
          <circle cx="15.5" cy="8.5" r="2.6" opacity="0.85" />
          <circle cx="8.5" cy="15.5" r="2.6" opacity="0.85" />
          <circle cx="15.5" cy="15.5" r="2.6" opacity="0.85" />
          {/* Core */}
          <circle cx="12" cy="12" r="2.5" fill="#FFF9C4" />
        </svg>
      );

    case "cake":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          {/* Tier 1 base */}
          <rect x="4" y="14.5" width="16" height="6" rx="2" />
          {/* Tier 2 top */}
          <rect x="7" y="10" width="10" height="5" rx="1.5" opacity="0.9" />
          {/* Candles */}
          <line
            x1="9"
            y1="7"
            x2="9"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="12"
            y1="7"
            x2="12"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="15"
            y1="7"
            x2="15"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Flames */}
          <circle cx="9" cy="5.5" r="0.9" fill="#FFF176" />
          <circle cx="12" cy="5.5" r="0.9" fill="#FFF176" />
          <circle cx="15" cy="5.5" r="0.9" fill="#FFF176" />
        </svg>
      );

    case "confetti":
    default:
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          {/* Sparkle star */}
          <path d="M12 4L13.5 9.5L19 11L13.5 12.5L12 18L10.5 12.5L5 11L10.5 9.5Z" />
          {/* Tiny sparkles & festive dots */}
          <circle cx="5" cy="5" r="1.4" opacity="0.8" />
          <circle cx="19" cy="6" r="1.2" opacity="0.8" />
          <circle cx="18" cy="18" r="1.4" opacity="0.8" />
          <circle cx="6" cy="18" r="1.2" opacity="0.8" />
          <rect
            x="8"
            y="2"
            width="1.4"
            height="1.4"
            transform="rotate(45 8 2)"
            opacity="0.7"
          />
        </svg>
      );
  }
}

const PANEL_COUNT = 16;

/**
 * 3D Twisting Ribbon
 *
 * 16 slim rounded capsule panels (width 58px, height 142px) placed along
 * a diagonal sine wave from top-left to top-right in CSS 3D (perspective: 1200px).
 *
 * Performance features:
 * - Direct DOM style mutation via ref (0 React re-renders in RAF loop)
 * - Single requestAnimationFrame loop keeping 60fps
 * - Parallax tilt toward mouse cursor with lerp smoothing
 * - Pauses automatically when off-screen (IntersectionObserver) or tab is hidden
 * - Static arrangement under prefers-reduced-motion, on touch devices, and under 768px
 * - aria-hidden and pointer-events-none; never covers headline text
 */
export default function Ribbon3D({
  eventType,
  cultureOrTradition,
  vibeOrTheme,
  palette,
  className = "",
}: Ribbon3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Animation state refs (not React state per frame)
  const rafIdRef = useRef<number | null>(null);
  const isIntersectingRef = useRef(true);
  const isTabVisibleRef = useRef(true);
  const isStaticModeRef = useRef(false);

  const rotationRef = useRef(0);
  const targetParallaxRef = useRef({ x: 0, y: 0 });
  const currentParallaxRef = useRef({ x: 0, y: 0 });
  const widthRef = useRef(1000);

  // Determine motif and gradients
  const motif = useMemo(
    () => getEventMotif(eventType, cultureOrTradition, vibeOrTheme),
    [eventType, cultureOrTradition, vibeOrTheme]
  );

  const gradients = useMemo(
    () => getRibbonGradients(palette, PANEL_COUNT),
    [palette]
  );

  // Initial panel transforms for SSR and initial render
  const initialPanels = useMemo(
    () =>
      computeRibbonPanels({
        count: PANEL_COUNT,
        containerWidth: 1000,
        rotation: 0,
        parallaxX: 0,
        parallaxY: 0,
      }),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect static conditions: prefers-reduced-motion, touch device, or screen < 768px
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isTouch =
      window.matchMedia("(hover: none)").matches ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
    const isSmallScreen =
      window.innerWidth < 768 ||
      window.matchMedia("(max-width: 767px)").matches;

    const shouldBeStatic = prefersReduced || isTouch || isSmallScreen;
    isStaticModeRef.current = shouldBeStatic;

    const measureWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          widthRef.current = rect.width;
        }
      }
    };
    measureWidth();

    // Direct DOM updater
    const applyTransforms = (rotationDeg: number, pX: number, pY: number) => {
      const panels = computeRibbonPanels({
        count: PANEL_COUNT,
        containerWidth: widthRef.current,
        rotation: rotationDeg,
        parallaxX: pX,
        parallaxY: pY,
      });

      for (let i = 0; i < PANEL_COUNT; i++) {
        const el = panelRefs.current[i];
        if (el) {
          el.style.transform = panels[i].transform;
          el.style.opacity = String(panels[i].opacity);
        }
      }
    };

    // If static mode: calculate static arrangement once and do not start RAF loop
    if (shouldBeStatic) {
      applyTransforms(0, 0, 0);

      const handleResize = () => {
        measureWidth();
        applyTransforms(0, 0, 0);
      };
      window.addEventListener("resize", handleResize, { passive: true });
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    // Interactive Animated Mode
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (!isIntersectingRef.current || !isTabVisibleRef.current) {
        rafIdRef.current = null;
        return;
      }

      const delta = Math.min(32, now - lastTime);
      lastTime = now;

      // Slow, luxurious continuous rotation (~12 degrees per second)
      rotationRef.current = (rotationRef.current + delta * 0.012) % 360;

      // Smooth lerp for parallax tilt toward cursor
      currentParallaxRef.current.x +=
        (targetParallaxRef.current.x - currentParallaxRef.current.x) * 0.06;
      currentParallaxRef.current.y +=
        (targetParallaxRef.current.y - currentParallaxRef.current.y) * 0.06;

      // Directly update panel transforms in DOM (no React state per frame)
      applyTransforms(
        rotationRef.current,
        currentParallaxRef.current.x,
        currentParallaxRef.current.y
      );

      rafIdRef.current = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (rafIdRef.current === null && !isStaticModeRef.current) {
        lastTime = performance.now();
        rafIdRef.current = requestAnimationFrame(loop);
      }
    };

    const stopLoop = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    // Parallax mouse move listener
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Normalized offset from -1 to 1
      const nx = (e.clientX - centerX) / (window.innerWidth / 2 || 1);
      const ny = (e.clientY - centerY) / (window.innerHeight / 2 || 1);

      targetParallaxRef.current.x = Math.max(-1, Math.min(1, nx));
      targetParallaxRef.current.y = Math.max(-1, Math.min(1, ny));
    };

    // Pause when off-screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersectingRef.current = entry.isIntersecting;
        if (entry.isIntersecting && isTabVisibleRef.current) {
          startLoop();
        } else {
          stopLoop();
        }
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Pause when tab is hidden
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
      if (!document.hidden && isIntersectingRef.current) {
        startLoop();
      } else {
        stopLoop();
      }
    };

    const handleResize = () => {
      measureWidth();
      const nowSmall =
        window.innerWidth < 768 ||
        window.matchMedia("(max-width: 767px)").matches;
      if (nowSmall && !isStaticModeRef.current) {
        isStaticModeRef.current = true;
        stopLoop();
        applyTransforms(0, 0, 0);
      } else if (
        !nowSmall &&
        isStaticModeRef.current &&
        !prefersReduced &&
        !isTouch
      ) {
        isStaticModeRef.current = false;
        startLoop();
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    startLoop();

    // Cleanup on unmount
    return () => {
      stopLoop();
      observer.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none relative h-[180px] w-full select-none overflow-hidden sm:h-[210px] md:h-[230px] ${className}`}
      aria-hidden="true"
      style={{
        perspective: "1200px",
        contain: "layout paint style",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 72%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, black 72%, transparent 100%)",
      }}
    >
      {/* 3D Preserved Stage */}
      <div
        ref={stageRef}
        className="relative flex h-full w-full items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {initialPanels.map((panel, idx) => {
          const bgGradient = gradients[idx % gradients.length];

          return (
            <div
              key={panel.id}
              ref={(el) => {
                panelRefs.current[idx] = el;
              }}
              className="absolute flex h-[142px] w-[58px] flex-col items-center justify-between rounded-full p-3 transition-shadow duration-300"
              style={{
                background: bgGradient,
                transform: panel.transform,
                opacity: panel.opacity,
                boxShadow:
                  "0 14px 28px -8px rgba(91, 26, 43, 0.16), 0 4px 10px -4px rgba(43, 27, 20, 0.10), inset 0 1px 1.5px rgba(255, 255, 255, 0.45)",
                border: "1px solid rgba(232, 220, 200, 0.45)",
                backfaceVisibility: "visible",
                willChange: "transform, opacity",
              }}
            >
              {/* Glass pill gloss highlight at top */}
              <div
                className="mt-0.5 h-1 w-4 rounded-full bg-white/45"
                style={{ filter: "blur(0.2px)" }}
              />

              {/* Matched event SVG motif */}
              <div
                className="my-auto flex items-center justify-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-200"
                style={{
                  filter: "drop-shadow(0 2px 4px rgba(43, 27, 20, 0.28))",
                }}
              >
                <RibbonMotifIcon motif={motif} className="h-5 w-5" />
              </div>

              {/* Tiny gold dot at 40% opacity */}
              <div className="mb-0.5 h-1 w-1 rounded-full bg-[#C9A24B]/40" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
