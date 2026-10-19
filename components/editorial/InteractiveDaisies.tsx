"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  calculateStemGeometry,
  createDaisyField,
  createPollenBurst,
  DaisyStem,
  disturbDaisyStem,
  PollenParticle,
  stepDaisyStems,
  stepPollenParticles,
} from "@/lib/physics/daisy";

export default function InteractiveDaisies() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stems physics state kept in ref to ensure 60fps RAF without React re-renders
  const stemsRef = useRef<DaisyStem[]>(createDaisyField());
  const pollenRef = useRef<PollenParticle[]>([]);
  const isVisibleRef = useRef<boolean>(true);
  const prefersReducedMotionRef = useRef<boolean>(false);
  const lastPointerXRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Direct SVG element refs for maximum 60fps performance
  const stemPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const leafGroupRefs = useRef<(SVGGElement | null)[]>([]);
  const flowerheadRefs = useRef<(SVGGElement | null)[]>([]);

  // Setup observer & reduced motion check
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mediaQuery.addEventListener("change", handleMotionChange);

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

  // Main 60fps Animation Loop
  useEffect(() => {
    const loop = (now: number) => {
      rafIdRef.current = requestAnimationFrame(loop);

      if (prefersReducedMotionRef.current || !isVisibleRef.current) {
        return;
      }

      // Step physics
      stemsRef.current = stepDaisyStems(stemsRef.current, now);
      const stems = stemsRef.current;

      // Update SVG geometry directly via DOM element refs
      for (let i = 0; i < stems.length; i++) {
        const stem = stems[i];
        const geom = calculateStemGeometry(stem);

        const pathEl = stemPathRefs.current[i];
        if (pathEl) {
          pathEl.setAttribute("d", geom.pathD);
        }

        const leafEl = leafGroupRefs.current[i];
        if (leafEl) {
          leafEl.setAttribute(
            "transform",
            `translate(${geom.leafX.toFixed(2)}, ${geom.leafY.toFixed(2)}) rotate(${geom.leafRotationDeg.toFixed(2)})`
          );
        }

        const flowerEl = flowerheadRefs.current[i];
        if (flowerEl) {
          flowerEl.setAttribute(
            "transform",
            `translate(${geom.tipX.toFixed(2)}, ${geom.tipY.toFixed(2)}) rotate(${geom.tipAngle.toFixed(2)})`
          );
        }
      }

      // Render Canvas Pollen Sparkles
      const canvas = canvasRef.current;
      if (canvas && typeof canvas.getContext === "function") {
        try {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            pollenRef.current = stepPollenParticles(pollenRef.current);
            for (const p of pollenRef.current) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.globalAlpha = Math.max(0, p.alpha);
              ctx.shadowColor = "#FDE047";
              ctx.shadowBlur = 4;
              ctx.fill();
              ctx.shadowBlur = 0;
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

  // Update canvas dimensions matching container
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

  // Convert client pointer event into SVG coordinate (380x240 viewBox)
  const getSvgCoordinates = (
    e: React.PointerEvent<HTMLDivElement>
  ): { svgX: number; svgY: number; canvasX: number; canvasY: number } => {
    const container = containerRef.current;
    if (!container) return { svgX: 0, svgY: 0, canvasX: 0, canvasY: 0 };
    const rect = container.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;
    const relX = (e.clientX - rect.left) / width;
    const relY = (e.clientY - rect.top) / height;
    return {
      svgX: relX * 380,
      svgY: relY * 240,
      canvasX: e.clientX - rect.left,
      canvasY: e.clientY - rect.top,
    };
  };

  // Find closest daisy stem by X coordinate
  const findClosestDaisyId = (svgX: number): number => {
    let closestId = 1;
    let minDist = Infinity;
    for (const stem of stemsRef.current) {
      const geom = calculateStemGeometry(stem);
      const dist = Math.abs(svgX - geom.tipX);
      if (dist < minDist) {
        minDist = dist;
        closestId = stem.id;
      }
    }
    return closestId;
  };

  // Pointer move: brushing against flower stems deflects them in direction of motion
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotionRef.current) return;
    const { svgX } = getSvgCoordinates(e);

    if (lastPointerXRef.current !== null) {
      const dx = svgX - lastPointerXRef.current;
      if (Math.abs(dx) > 1.2) {
        const closestId = findClosestDaisyId(svgX);
        const impulse = Math.min(Math.max(dx * 0.014, -0.22), 0.22);
        stemsRef.current = disturbDaisyStem(
          stemsRef.current,
          closestId,
          impulse
        );
      }
    }

    lastPointerXRef.current = svgX;
  };

  const handlePointerLeave = () => {
    lastPointerXRef.current = null;
  };

  // Pointer down (Click/Tap): plucks the stem and scatters golden pollen sparkle dust
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const { svgX, canvasX, canvasY } = getSvgCoordinates(e);
    const closestId = findClosestDaisyId(svgX);

    // Deflect stem with a lively pluck
    const pluckDirection = Math.random() > 0.5 ? 0.22 : -0.22;
    stemsRef.current = disturbDaisyStem(
      stemsRef.current,
      closestId,
      pluckDirection
    );

    // Spawn golden pollen sparkles
    const newPollen = createPollenBurst(canvasX, canvasY, 9);
    pollenRef.current = [...pollenRef.current, ...newPollen];
  };

  const initialStems = stemsRef.current;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      className="relative flex h-[180px] w-full max-w-[420px] cursor-pointer select-none items-end justify-center sm:h-[220px] lg:col-span-4"
      aria-hidden="true"
      title="Interactive swaying daisies — sweep cursor or tap to brush stems and release pollen"
    >
      {/* Overlay Canvas for Golden Pollen Sparkle Particles */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      />

      {/* SVG Daisy Meadow */}
      <svg
        viewBox="0 0 380 240"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          {/* Stem Olive-Gold Gradient */}
          <linearGradient id="pedicelStemGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#4A5424" />
            <stop offset="60%" stopColor="#7E8B48" />
            <stop offset="100%" stopColor="#A89642" />
          </linearGradient>

          {/* Leaf Soft Olive Gradient */}
          <linearGradient id="daisyLeafGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8D9B52" />
            <stop offset="100%" stopColor="#556128" />
          </linearGradient>

          {/* Golden Center Disc Radial Gradient */}
          <radialGradient id="centerFloretGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="85%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </radialGradient>

          {/* Petal Ivory Gradient with Delicate Shading */}
          <linearGradient id="ivoryPetalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#FFFDF8" />
            <stop offset="100%" stopColor="#F4EDE0" />
          </linearGradient>

          {/* Soft Shadow Filter for Blooms */}
          <filter id="daisyGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="2.5"
              floodColor="#000000"
              floodOpacity="0.45"
            />
          </filter>
        </defs>

        {/* Ambient Ground Glow / Earth Line */}
        <ellipse
          cx="190"
          cy="234"
          rx="175"
          ry="6"
          fill="url(#ivoryPetalGrad)"
          opacity="0.08"
        />

        {/* Stems & Leaves */}
        {initialStems.map((stem, index) => {
          const geom = calculateStemGeometry(stem);
          return (
            <g key={`stem-group-${stem.id}`}>
              {/* Slender Flexible Pedicel Stem */}
              <path
                ref={(el) => {
                  stemPathRefs.current[index] = el;
                }}
                d={geom.pathD}
                fill="none"
                stroke="url(#pedicelStemGrad)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Petite Stem Leaf */}
              <g
                ref={(el) => {
                  leafGroupRefs.current[index] = el;
                }}
                transform={`translate(${geom.leafX.toFixed(2)}, ${geom.leafY.toFixed(2)}) rotate(${geom.leafRotationDeg.toFixed(2)})`}
              >
                <path
                  d="M 0 0 C 4 -7, 14 -8, 20 -4 C 15 2, 7 4, 0 0 Z"
                  fill="url(#daisyLeafGrad)"
                  stroke="#3E471C"
                  strokeWidth="0.6"
                  opacity="0.92"
                />
              </g>
            </g>
          );
        })}

        {/* Flowerheads at Pedicel Tips */}
        {initialStems.map((stem, index) => {
          const geom = calculateStemGeometry(stem);
          const r = stem.flowerRadius;
          const petalLength = r * 0.95;
          const petalWidth = r * 0.28;
          const centerRadius = r * 0.38;

          return (
            <g
              key={`flower-${stem.id}`}
              ref={(el) => {
                flowerheadRefs.current[index] = el;
              }}
              transform={`translate(${geom.tipX.toFixed(2)}, ${geom.tipY.toFixed(2)}) rotate(${geom.tipAngle.toFixed(2)})`}
              filter="url(#daisyGlow)"
              className="transition-transform duration-75"
            >
              {/* Radiating Ivory Petals */}
              {Array.from({ length: stem.petalCount }).map((_, pIdx) => {
                const angleDeg = (pIdx * 360) / stem.petalCount;
                return (
                  <ellipse
                    key={`petal-${pIdx}`}
                    cx="0"
                    cy={-petalLength * 0.65}
                    rx={petalWidth}
                    ry={petalLength * 0.58}
                    transform={`rotate(${angleDeg})`}
                    fill="url(#ivoryPetalGrad)"
                    stroke="#E8DCC8"
                    strokeWidth="0.5"
                    strokeOpacity="0.8"
                  />
                );
              })}

              {/* Calyx / Receptacle Ambient Shadow */}
              <circle
                cx="0"
                cy="0"
                r={centerRadius + 0.8}
                fill="#24100E"
                opacity="0.4"
              />

              {/* Rich Warm Golden-Amber Center Seed Disc */}
              <circle
                cx="0"
                cy="0"
                r={centerRadius}
                fill="url(#centerFloretGrad)"
                stroke="#C9A24B"
                strokeWidth="0.8"
              />

              {/* Concentric Seed Dots / Floret Texture */}
              <circle
                cx="-1"
                cy="-1"
                r={centerRadius * 0.45}
                fill="none"
                stroke="#FFFDF8"
                strokeWidth="0.6"
                strokeDasharray="1.2 1.8"
                opacity="0.65"
              />
              <circle
                cx="0"
                cy="0"
                r={centerRadius * 0.72}
                fill="none"
                stroke="#78350F"
                strokeWidth="0.7"
                strokeDasharray="1.5 2.2"
                opacity="0.55"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
