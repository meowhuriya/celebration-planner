"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  calculateCapsuleTransform,
  createSplashDroplets,
  createSplashRipples,
  createWaterState,
  disturbWater,
  getIdleWave,
  stepDroplets,
  stepRipples,
  stepWaterColumns,
  WaterColumn,
  WaterDroplet,
  WaterRippleRing,
} from "@/lib/physics/water";

interface CapsuleConfig {
  id: number;
  label: string;
  gradient: string;
  shadow: string;
  primaryColor: string;
  heightClass: string;
  widthClass: string;
}

const CAPSULES: CapsuleConfig[] = [
  {
    id: 1,
    label: "Saffron Marigold",
    gradient: "linear-gradient(180deg, #FDBA74 0%, #EA580C 100%)",
    shadow: "0 8px 24px -4px rgba(234, 88, 12, 0.45)",
    primaryColor: "#EA580C",
    heightClass: "h-[75px] sm:h-[110px]",
    widthClass: "w-6 sm:w-7.5 md:w-8",
  },
  {
    id: 2,
    label: "Rose Coral",
    gradient: "linear-gradient(180deg, #FDA4AF 0%, #E11D48 100%)",
    shadow: "0 10px 26px -4px rgba(225, 29, 72, 0.45)",
    primaryColor: "#E11D48",
    heightClass: "h-[110px] sm:h-[155px]",
    widthClass: "w-6 sm:w-7.5 md:w-8",
  },
  {
    id: 3,
    label: "Radiant Gold",
    gradient: "linear-gradient(180deg, #FEF08A 0%, #D97706 100%)",
    shadow: "0 12px 28px -4px rgba(217, 119, 6, 0.5)",
    primaryColor: "#D97706",
    heightClass: "h-[145px] sm:h-[200px]",
    widthClass: "w-6 sm:w-7.5 md:w-8",
  },
  {
    id: 4,
    label: "Festive Emerald",
    gradient: "linear-gradient(180deg, #6EE7B7 0%, #059669 100%)",
    shadow: "0 10px 26px -4px rgba(5, 150, 105, 0.45)",
    primaryColor: "#059669",
    heightClass: "h-[130px] sm:h-[180px]",
    widthClass: "w-6 sm:w-7.5 md:w-8",
  },
  {
    id: 5,
    label: "Azure Sky",
    gradient: "linear-gradient(180deg, #7DD3FC 0%, #0284C7 100%)",
    shadow: "0 8px 24px -4px rgba(2, 132, 199, 0.45)",
    primaryColor: "#0284C7",
    heightClass: "h-[95px] sm:h-[135px]",
    widthClass: "w-6 sm:w-7.5 md:w-8",
  },
  {
    id: 6,
    label: "Royal Amethyst",
    gradient: "linear-gradient(180deg, #D8B4FE 0%, #7E22CE 100%)",
    shadow: "0 8px 20px -4px rgba(126, 34, 206, 0.45)",
    primaryColor: "#7E22CE",
    heightClass: "h-[65px] sm:h-[95px]",
    widthClass: "w-6 sm:w-7.5 md:w-8",
  },
];

export default function WaterCapsules() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capsuleRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Simulation state stored in refs to allow direct 60fps RAF mutations without React re-render overhead
  const columnsRef = useRef<WaterColumn[]>(createWaterState(CAPSULES.length));
  const ripplesRef = useRef<WaterRippleRing[]>([]);
  const dropletsRef = useRef<WaterDroplet[]>([]);
  const lastPointerXRef = useRef<number | null>(null);
  const lastPointerYRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const rafIdRef = useRef<number | null>(null);

  // Checks prefers-reduced-motion
  const prefersReducedMotionRef = useRef<boolean>(false);

  // Setup observer and media query
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    // IntersectionObserver to pause loop when off-screen
    const el = containerRef.current;
    let observer: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            isVisibleRef.current = entry.isIntersecting;
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(el);
    }

    return () => {
      mediaQuery.removeEventListener("change", handleMotionChange);
      if (observer && el) observer.unobserve(el);
    };
  }, []);

  // Main 60fps animation & physics loop
  useEffect(() => {
    const loop = (now: number) => {
      rafIdRef.current = requestAnimationFrame(loop);

      if (prefersReducedMotionRef.current || !isVisibleRef.current) {
        return;
      }

      // 1. Advance coupled water columns
      columnsRef.current = stepWaterColumns(columnsRef.current);

      // 2. Direct DOM transform application to each capsule
      const cols = columnsRef.current;
      for (let i = 0; i < CAPSULES.length; i++) {
        const domEl = capsuleRefs.current[i];
        if (!domEl) continue;

        const idle = getIdleWave(i, now, CAPSULES.length);
        const transform = calculateCapsuleTransform(cols[i], idle);

        domEl.style.transform = `translate3d(0, ${transform.translateY.toFixed(2)}px, 0) rotate(${transform.rotateDeg.toFixed(2)}deg) scale(${transform.scaleX.toFixed(3)}, ${transform.scaleY.toFixed(3)})`;
      }

      // 3. Render Canvas ripples & splash droplets
      const canvas = canvasRef.current;
      if (canvas && typeof canvas.getContext === "function") {
        try {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Step & draw ripples
            ripplesRef.current = stepRipples(ripplesRef.current);
            for (const r of ripplesRef.current) {
              ctx.beginPath();
              ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, r.alpha).toFixed(3)})`;
              ctx.lineWidth = 1.6;
              ctx.stroke();

              // Inner harmonic ring
              if (r.radius > 16) {
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius * 0.65, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 240, 200, ${(Math.max(0, r.alpha) * 0.45).toFixed(3)})`;
                ctx.lineWidth = 1.0;
                ctx.stroke();
              }
            }

            // Step & draw splash droplets
            dropletsRef.current = stepDroplets(dropletsRef.current);
            for (const d of dropletsRef.current) {
              ctx.beginPath();
              ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
              ctx.fillStyle = d.color;
              ctx.globalAlpha = Math.max(0, d.alpha);
              ctx.fill();
              ctx.globalAlpha = 1.0;
            }
          }
        } catch {
          // Non-standard canvas or test environment
        }
      }
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Update canvas internal dimensions matching container
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, []);

  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener("resize", updateCanvasDimensions);
    return () => window.removeEventListener("resize", updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  // Find which capsule index is closest to a given relative X coordinate
  const findClosestCapsuleIndex = (relX: number): number => {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < CAPSULES.length; i++) {
      const el = capsuleRefs.current[i];
      if (!el) continue;
      const colCenterX = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(relX - colCenterX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  // Pointer move: brush across water creates gentle wake and waves
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotionRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    if (lastPointerXRef.current !== null && lastPointerYRef.current !== null) {
      const dx = relX - lastPointerXRef.current;
      const dy = relY - lastPointerYRef.current;
      const speed = Math.hypot(dx, dy);

      if (speed > 3) {
        const closestIdx = findClosestCapsuleIndex(relX);
        // Plunge / lift proportional to speed
        const impulse = Math.min(Math.max(dy * 0.45, -12), 14);
        columnsRef.current = disturbWater(
          columnsRef.current,
          closestIdx,
          impulse !== 0 ? impulse : 6
        );
      }
    }

    lastPointerXRef.current = relX;
    lastPointerYRef.current = relY;
  };

  const handlePointerLeave = () => {
    lastPointerXRef.current = null;
    lastPointerYRef.current = null;
  };

  // Click/Tap: splash! Plunges the capsule, spawns expanding concentric ripples and droplets
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickedIdx = findClosestCapsuleIndex(clickX);
    const targetCapsule = CAPSULES[clickedIdx];

    // Sharp water plunge
    columnsRef.current = disturbWater(columnsRef.current, clickedIdx, 20);

    // Spawns ripple rings
    const newRipples = createSplashRipples(clickX, clickY, 130);
    ripplesRef.current = [...ripplesRef.current, ...newRipples];

    // Spawns celebratory glowing water droplets
    const newDroplets = createSplashDroplets(
      clickX,
      clickY,
      targetCapsule?.primaryColor || "#FEF08A",
      6
    );
    dropletsRef.current = [...dropletsRef.current, ...newDroplets];
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      className="relative flex cursor-pointer select-none items-end justify-center gap-2 sm:gap-3 lg:col-span-4"
      aria-hidden="true"
      title="Interactive water capsules — hover or tap to ripple"
    >
      {/* Overlay Canvas for Water Ripples & Splash Droplets */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      />

      {/* Render 6 Buoyant Water Capsules */}
      {CAPSULES.map((capsule, index) => (
        <div
          key={capsule.id}
          ref={(el) => {
            capsuleRefs.current[index] = el;
          }}
          className={`relative ${capsule.widthClass} ${capsule.heightClass} overflow-hidden rounded-full border border-white/25 transition-shadow duration-300 will-change-transform hover:shadow-2xl`}
          style={{
            background: capsule.gradient,
            boxShadow: capsule.shadow,
          }}
        >
          {/* Glass Specular Sheen (Translucent Water Highlight) */}
          <div
            className="pointer-events-none absolute left-1 top-2 h-[55%] w-1.5 rounded-full bg-gradient-to-b from-white/70 via-white/25 to-transparent sm:left-1.5 sm:w-2"
            aria-hidden="true"
          />

          {/* Liquid Meniscus & Ambient Shimmer */}
          <div
            className="pointer-events-none absolute -bottom-2 -left-2 -right-2 h-1/2 rounded-full bg-white/10 opacity-70 blur-[2px]"
            aria-hidden="true"
          />
        </div>
      ))}

      {/* Ambient Water Surface Reflection Glow Underneath */}
      <div
        className="pointer-events-none absolute -bottom-3 left-1/2 h-4 w-4/5 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#C9A24B]/20 to-transparent blur-md"
        aria-hidden="true"
      />
    </div>
  );
}
