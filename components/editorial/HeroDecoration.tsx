"use client";

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from "react";
import type { EventPalette } from "@/lib/schemas";
import {
  getHeroDecoration,
  generateHeroScene,
  type HeroDecorationConfig,
  type HeroSceneData,
} from "@/lib/hero-decoration";

export interface HeroDecorationRef {
  triggerBurst: () => void;
}

export interface HeroDecorationProps {
  eventType?: string;
  cultureOrTradition?: string;
  vibeOrTheme?: string;
  palette?: EventPalette | null;
  hoveredType?: string | null;
  className?: string;
  children?: ReactNode;
}

/**
 * Generates 14 flower points along a smooth draping bezier curve for the wedding garland.
 */
function getGarlandFlowerPoints(count = 14) {
  const points = [];
  // Quadratic bezier curve from top-left (10, 10) to right (820, 140) with control point (340, 120)
  const p0 = { x: 10, y: 15 };
  const p1 = { x: 380, y: 130 };
  const p2 = { x: 800, y: 145 };

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    // B(t) = (1-t)^2 * p0 + 2(1-t)t * p1 + t^2 * p2
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    const isMarigold = i % 2 === 0;
    points.push({ x, y, isMarigold, id: i });
  }
  return points;
}

export const HeroDecoration = forwardRef<
  HeroDecorationRef,
  HeroDecorationProps
>(function HeroDecoration(
  {
    eventType = "wedding",
    cultureOrTradition,
    vibeOrTheme,
    palette,
    hoveredType,
    className = "",
    children,
  },
  ref
) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isBurstActive, setIsBurstActive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Active event type is overridden smoothly when user hovers an option in EventTypeSelector
  const effectiveType = hoveredType || eventType;

  const decoration: HeroDecorationConfig = useMemo(() => {
    return getHeroDecoration(
      effectiveType,
      cultureOrTradition,
      vibeOrTheme,
      palette
    );
  }, [effectiveType, cultureOrTradition, vibeOrTheme, palette]);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Pause animation when tab is hidden or hero is off-screen
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (typeof IntersectionObserver === "undefined") {
      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(
          entry.isIntersecting && document.visibilityState === "visible"
        );
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
    };
  }, []);

  // Flower points for the wedding garland
  const garlandFlowers = useMemo(() => getGarlandFlowerPoints(14), []);
  const compactFlowers = useMemo(() => getGarlandFlowerPoints(8), []);

  // Confetti / Sparkler Canvas Particle Burst (about 60 particles, 1.5 seconds)
  const triggerBurst = useCallback(() => {
    if (prefersReducedMotion || isBurstActive) return;

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.className = "absolute inset-0 pointer-events-none z-20";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);
    canvasRef.current = canvas;
    setIsBurstActive(true);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      setIsBurstActive(false);
      return;
    }

    // Origin: center-left below intro
    const originX = width < 640 ? width / 2 : Math.min(width * 0.28, 300);
    const originY = Math.min(height * 0.45, 240);

    const particleCount = 60;
    const isSparkler = decoration.burstType === "sparkler";
    const colors = decoration.paletteColors;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      alpha: number;
      decay: number;
      gravity: number;
      rotation?: number;
      rotSpeed?: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isSparkler
        ? 2.5 + Math.random() * 5.5
        : 2 + Math.random() * 4.5;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isSparkler ? 1.5 : 2.5),
        color: colors[i % colors.length],
        size: isSparkler ? 2 + Math.random() * 2.5 : 4 + Math.random() * 4,
        alpha: 1,
        decay: isSparkler
          ? 0.018 + Math.random() * 0.015
          : 0.015 + Math.random() * 0.012,
        gravity: isSparkler ? 0.12 : 0.15,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    const startTime = performance.now();
    const durationMs = 1500; // 1.5 seconds

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed > durationMs) {
        // Complete and clean up
        if (canvasRef.current) {
          canvasRef.current.remove();
          canvasRef.current = null;
        }
        setIsBurstActive(false);
        rafRef.current = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98; // air resistance
        p.alpha = Math.max(0, p.alpha - p.decay);

        if (p.alpha <= 0) continue;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (isSparkler) {
          // Sparkler points with subtle glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Small sparkler trail
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
          ctx.stroke();
        } else {
          // Confetti fluttering rectangle
          ctx.translate(p.x, p.y);
          if (p.rotation !== undefined && p.rotSpeed !== undefined) {
            p.rotation += p.rotSpeed;
            ctx.rotate(p.rotation);
          }
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [
    prefersReducedMotion,
    isBurstActive,
    decoration.burstType,
    decoration.paletteColors,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      triggerBurst,
    }),
    [triggerBurst]
  );

  // Clean up canvas RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{
        // Pause CSS animations if hero is offscreen or tab hidden
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--play-state" as any]: isVisible ? "running" : "paused",
      }}
    >
      {/* ── STATIC DECORATION LAYER (Inline SVG, aria-hidden, pointer-events none) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden transition-opacity duration-300 ease-out"
      >
        {/* 1. WEDDING: Hanging Marigold & Jasmine Garland + Faint Mandala */}
        {decoration.hasGarland && (
          <div className="absolute inset-0">
            {/* Very large, faint mandala cropped at left edge (6-8% opacity) */}
            {decoration.hasMandala && (
              <div
                className="pointer-events-none absolute -left-28 top-1/2 h-[340px] w-[340px] -translate-y-1/2 opacity-[0.07] transition-opacity duration-300 sm:-left-36 sm:h-[440px] sm:w-[440px]"
                style={{ color: decoration.primaryColor }}
              >
                <svg
                  viewBox="0 0 200 200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  className="h-full w-full"
                >
                  {/* Concentric rings */}
                  <circle cx="100" cy="100" r="95" strokeDasharray="2 3" />
                  <circle cx="100" cy="100" r="85" />
                  <circle cx="100" cy="100" r="70" strokeDasharray="4 2" />
                  <circle cx="100" cy="100" r="50" />
                  <circle cx="100" cy="100" r="28" />
                  <circle
                    cx="100"
                    cy="100"
                    r="10"
                    fill="currentColor"
                    fillOpacity="0.2"
                  />

                  {/* 8-Petal Lotus Core */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <g key={angle} transform={`rotate(${angle} 100 100)`}>
                      <path d="M100 100 C92 72 92 60 100 48 C108 60 108 72 100 100" />
                      <circle cx="100" cy="48" r="2" fill="currentColor" />
                      {/* Outer lace loop */}
                      <path d="M100 28 C90 15 110 15 100 28" />
                      <path d="M96 85 C94 80 106 80 104 85" />
                    </g>
                  ))}

                  {/* 16 Radial Rays */}
                  {[
                    0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225,
                    247.5, 270, 292.5, 315, 337.5,
                  ].map((angle) => (
                    <line
                      key={angle}
                      x1="100"
                      y1="10"
                      x2="100"
                      y2="15"
                      transform={`rotate(${angle} 100 100)`}
                      strokeWidth="1.2"
                    />
                  ))}
                </svg>
              </div>
            )}

            {/* Desktop Garland: 14 Flowers (hidden under 768px) */}
            <div className="pointer-events-none absolute left-0 right-0 top-0 hidden h-44 md:block">
              <svg
                viewBox="0 0 840 180"
                fill="none"
                preserveAspectRatio="none"
                className="h-full w-full overflow-visible"
              >
                {/* Thin gold hanging string */}
                <path
                  d="M 10,15 C 380,130 540,140 800,145"
                  stroke="#D4AF37"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  strokeOpacity="0.6"
                />

                {/* 14 Marigolds & Jasmines along the curve */}
                {garlandFlowers.map((f) => (
                  <g key={f.id} transform={`translate(${f.x}, ${f.y})`}>
                    {/* Leaf pair */}
                    <path
                      d="M -5,0 C -9,-7 -2,-9 0,-2 C 2,-9 9,-7 5,0"
                      fill="#2E5D4B"
                      fillOpacity="0.45"
                    />

                    {f.isMarigold ? (
                      /* Marigold (layered warm saffron & gold petals) */
                      <g className="transition-transform duration-300">
                        <circle
                          r="10"
                          fill={decoration.paletteColors[0] || "#D4AF37"}
                          fillOpacity="0.85"
                          stroke="#B45309"
                          strokeWidth="0.8"
                        />
                        <circle
                          r="7"
                          fill={decoration.paletteColors[1] || "#F59E0B"}
                          fillOpacity="0.95"
                        />
                        <circle r="4" fill="#FEF08A" fillOpacity="0.9" />
                        <circle r="1.5" fill="#78350F" />
                      </g>
                    ) : (
                      /* Jasmine (starry delicate white/cream flower) */
                      <g className="transition-transform duration-300">
                        {[0, 72, 144, 216, 288].map((rot) => (
                          <ellipse
                            key={rot}
                            cx="0"
                            cy="-5"
                            rx="2.5"
                            ry="4.5"
                            fill="#FFFDF0"
                            stroke="#D4AF37"
                            strokeWidth="0.5"
                            transform={`rotate(${rot})`}
                          />
                        ))}
                        <circle r="2" fill="#FEF08A" />
                      </g>
                    )}
                  </g>
                ))}
              </svg>
            </div>

            {/* Mobile Garland: Smaller compact 8 Flowers (visible under 768px) */}
            <div className="pointer-events-none absolute left-0 right-0 top-0 block h-28 md:hidden">
              <svg
                viewBox="0 0 840 180"
                fill="none"
                preserveAspectRatio="none"
                className="h-full w-full overflow-visible"
              >
                <path
                  d="M 10,15 C 380,130 540,140 800,145"
                  stroke="#D4AF37"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  strokeOpacity="0.5"
                />
                {compactFlowers.map((f) => (
                  <g key={f.id} transform={`translate(${f.x}, ${f.y})`}>
                    {f.isMarigold ? (
                      <circle
                        r="7"
                        fill={decoration.paletteColors[0] || "#D4AF37"}
                        stroke="#B45309"
                        strokeWidth="0.6"
                      />
                    ) : (
                      <circle
                        r="5"
                        fill="#FFFDF0"
                        stroke="#D4AF37"
                        strokeWidth="0.6"
                      />
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* 2. COMMUNITY / DIWALI: String of Diyas and Paper Lantern */}
        {decoration.hasDiyas && (
          <div className="absolute inset-0">
            {/* Top Swag String with 5 hanging Diyas */}
            <div className="absolute left-0 right-0 top-0 h-36">
              <svg
                viewBox="0 0 800 130"
                fill="none"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                {/* Golden Hanging Swag Line */}
                <path
                  d="M 20,10 Q 200,60 400,20 Q 600,60 780,10"
                  stroke="#D97706"
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                  strokeOpacity="0.5"
                />

                {/* 5 Hanging Diyas */}
                {[
                  { x: 120, y: 38 },
                  { x: 260, y: 46 },
                  { x: 400, y: 20 },
                  { x: 540, y: 46 },
                  { x: 680, y: 38 },
                ].map((diya, i) => (
                  <g key={i} transform={`translate(${diya.x}, ${diya.y})`}>
                    {/* Hanging String */}
                    <line
                      x1="0"
                      y1="-20"
                      x2="0"
                      y2="0"
                      stroke="#D97706"
                      strokeWidth="1"
                      strokeOpacity="0.4"
                    />

                    {/* Terracotta Diya Bowl */}
                    <path
                      d="M -12,4 C -12,12 12,12 12,4 C 6,7 -6,7 -12,4 Z"
                      fill="#9A3412"
                      stroke="#EA580C"
                      strokeWidth="0.8"
                    />
                    {/* Diya Rim */}
                    <ellipse
                      cx="0"
                      cy="4"
                      rx="12"
                      ry="2.5"
                      fill="#EA580C"
                      stroke="#F59E0B"
                      strokeWidth="0.6"
                    />

                    {/* Luminous Flame */}
                    <path
                      d="M 0,-6 C -3,-1 -2,2 0,2 C 2,2 3,-1 0,-6 Z"
                      fill="#FDE047"
                    />
                    <circle cx="0" cy="0" r="1.5" fill="#EF4444" />
                    {/* Flame Aura */}
                    <circle
                      cx="0"
                      cy="-2"
                      r="6"
                      fill="#F59E0B"
                      fillOpacity="0.18"
                    />
                  </g>
                ))}
              </svg>
            </div>

            {/* Hanging Paper Lantern (Kandil / Fanoos) on right margin */}
            {decoration.hasLantern && (
              <div className="pointer-events-none absolute right-4 top-2 h-40 w-16 opacity-80 sm:right-10 sm:w-20">
                <svg
                  viewBox="0 0 80 160"
                  fill="none"
                  className="h-full w-full overflow-visible"
                >
                  {/* Suspension String */}
                  <line
                    x1="40"
                    y1="0"
                    x2="40"
                    y2="20"
                    stroke="#D4AF37"
                    strokeWidth="1.2"
                  />
                  {/* Octagonal Diamond Lantern Core */}
                  <polygon
                    points="40,20 62,45 40,70 18,45"
                    fill={decoration.paletteColors[0] || "#EA580C"}
                    fillOpacity="0.85"
                    stroke="#D4AF37"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="40,30 52,45 40,60 28,45"
                    fill="#FEF08A"
                    fillOpacity="0.9"
                  />
                  {/* Inner Lantern Star */}
                  <circle cx="40" cy="45" r="3" fill="#B45309" />

                  {/* Top & Bottom Gold Bands */}
                  <rect
                    x="30"
                    y="18"
                    width="20"
                    height="3"
                    rx="1"
                    fill="#D4AF37"
                  />
                  <rect
                    x="30"
                    y="69"
                    width="20"
                    height="3"
                    rx="1"
                    fill="#D4AF37"
                  />

                  {/* Flowing Silk Tassels */}
                  <line
                    x1="32"
                    y1="72"
                    x2="30"
                    y2="135"
                    stroke="#EA580C"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="36"
                    y1="72"
                    x2="35"
                    y2="150"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="40"
                    y1="72"
                    x2="40"
                    y2="155"
                    stroke="#D4AF37"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <line
                    x1="44"
                    y1="72"
                    x2="45"
                    y2="150"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="48"
                    y1="72"
                    x2="50"
                    y2="135"
                    stroke="#EA580C"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* 3. BIRTHDAY: Festive Bunting & Balloon Strings */}
        {decoration.hasBunting && decoration.hasBalloons && (
          <div className="absolute inset-0">
            {/* Top Bunting Pennants */}
            <div className="absolute left-0 right-0 top-0 h-32">
              <svg
                viewBox="0 0 800 100"
                fill="none"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <path
                  d="M 0,10 Q 200,45 400,20 Q 600,45 800,10"
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  strokeOpacity="0.5"
                />
                {/* Triangular Pennants */}
                {[
                  { x: 60, y: 19, rot: -4, col: decoration.paletteColors[0] },
                  { x: 130, y: 28, rot: 2, col: decoration.paletteColors[1] },
                  { x: 200, y: 34, rot: 6, col: decoration.paletteColors[2] },
                  { x: 270, y: 31, rot: -2, col: decoration.paletteColors[3] },
                  { x: 340, y: 24, rot: -6, col: decoration.paletteColors[0] },
                  { x: 410, y: 22, rot: 3, col: decoration.paletteColors[1] },
                  { x: 480, y: 29, rot: 5, col: decoration.paletteColors[2] },
                  { x: 550, y: 34, rot: -3, col: decoration.paletteColors[3] },
                  { x: 620, y: 31, rot: -5, col: decoration.paletteColors[0] },
                  { x: 690, y: 23, rot: 4, col: decoration.paletteColors[1] },
                ].map((p, i) => (
                  <polygon
                    key={i}
                    points={`${p.x - 12},${p.y} ${p.x + 12},${p.y} ${p.x},${p.y + 24}`}
                    fill={p.col}
                    fillOpacity="0.8"
                    transform={`rotate(${p.rot} ${p.x} ${p.y})`}
                  />
                ))}
              </svg>
            </div>

            {/* Balloon Strings in Top-Left Corner (away from headline) */}
            <div className="pointer-events-none absolute left-2 top-2 h-44 w-20 opacity-85 sm:left-6">
              <svg viewBox="0 0 80 160" fill="none" className="h-full w-full">
                {/* Balloon Strings */}
                <path
                  d="M 30,50 Q 25,90 38,150"
                  stroke="#94A3B8"
                  strokeWidth="0.8"
                />
                <path
                  d="M 50,45 Q 55,95 42,150"
                  stroke="#94A3B8"
                  strokeWidth="0.8"
                />
                <path
                  d="M 40,35 Q 40,85 40,150"
                  stroke="#94A3B8"
                  strokeWidth="0.8"
                />

                {/* Balloon 1 */}
                <ellipse
                  cx="30"
                  cy="35"
                  rx="14"
                  ry="18"
                  fill={decoration.paletteColors[0]}
                  fillOpacity="0.85"
                />
                <path
                  d="M 24,24 A 10 14 0 0 1 34,22"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeOpacity="0.6"
                />
                <polygon
                  points="28,52 32,52 30,55"
                  fill={decoration.paletteColors[0]}
                />

                {/* Balloon 2 */}
                <ellipse
                  cx="50"
                  cy="30"
                  rx="13"
                  ry="17"
                  fill={decoration.paletteColors[1]}
                  fillOpacity="0.85"
                />
                <polygon
                  points="48,46 52,46 50,49"
                  fill={decoration.paletteColors[1]}
                />

                {/* Balloon 3 */}
                <ellipse
                  cx="40"
                  cy="20"
                  rx="15"
                  ry="19"
                  fill={decoration.paletteColors[2]}
                  fillOpacity="0.9"
                />
                <path
                  d="M 34,10 A 10 14 0 0 1 44,8"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeOpacity="0.7"
                />
                <polygon
                  points="38,38 42,38 40,41"
                  fill={decoration.paletteColors[2]}
                />
              </svg>
            </div>
          </div>
        )}

        {/* 4. OTHER: Simple Elegant Bunting */}
        {decoration.hasBunting && !decoration.hasBalloons && (
          <div className="absolute inset-0">
            <div className="absolute left-0 right-0 top-0 h-28">
              <svg
                viewBox="0 0 800 80"
                fill="none"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <path
                  d="M 0,8 Q 200,35 400,16 Q 600,35 800,8"
                  stroke="#64748B"
                  strokeWidth="0.8"
                  strokeDasharray="4 2"
                  strokeOpacity="0.4"
                />
                {[
                  { x: 80, y: 15, col: decoration.paletteColors[0] },
                  { x: 180, y: 25, col: decoration.paletteColors[1] },
                  { x: 280, y: 26, col: decoration.paletteColors[2] },
                  { x: 380, y: 18, col: decoration.paletteColors[3] },
                  { x: 480, y: 20, col: decoration.paletteColors[0] },
                  { x: 580, y: 26, col: decoration.paletteColors[1] },
                  { x: 680, y: 23, col: decoration.paletteColors[2] },
                ].map((p, i) => (
                  <polygon
                    key={i}
                    points={`${p.x - 10},${p.y} ${p.x + 10},${p.y} ${p.x},${p.y + 18}`}
                    fill={p.col}
                    fillOpacity="0.65"
                  />
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* ── LIGHT MOTION: AT MOST 10 DRIFTING PETALS OR CONFETTI (EDGES ONLY) ── */}
        {!prefersReducedMotion && (
          <div
            className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
            style={{
              animationPlayState: isVisible ? "running" : "paused",
            }}
          >
            {/* 4 Particles along the far-left margin */}
            {[
              { id: 1, left: "2%", delay: "-2s", duration: "11s", size: 9 },
              { id: 2, left: "5%", delay: "-7s", duration: "13s", size: 7 },
              { id: 3, left: "8%", delay: "-4s", duration: "10s", size: 8 },
              { id: 4, left: "10%", delay: "-10s", duration: "14s", size: 6 },
            ].map((p, idx) => (
              <div
                key={`left-${p.id}`}
                className="drift-petal absolute top-0"
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                  animationPlayState: "var(--play-state, running)",
                }}
              >
                {decoration.particleStyle === "petals" ? (
                  /* Marigold / Rose Petal */
                  <svg
                    width={p.size}
                    height={p.size * 1.4}
                    viewBox="0 0 10 14"
                    fill="none"
                  >
                    <path
                      d="M5 0 C1 4 0 9 5 14 C10 9 9 4 5 0 Z"
                      fill={decoration.paletteColors[idx % 4]}
                      fillOpacity="0.75"
                    />
                  </svg>
                ) : (
                  /* Confetti Diamond */
                  <div
                    className="rounded-2xs rotate-45"
                    style={{
                      width: p.size,
                      height: p.size,
                      backgroundColor: decoration.paletteColors[idx % 4],
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>
            ))}

            {/* 4 Particles along the far-right margin */}
            {[
              { id: 5, right: "2%", delay: "-3s", duration: "12s", size: 8 },
              { id: 6, right: "4%", delay: "-8s", duration: "14s", size: 7 },
              { id: 7, right: "7%", delay: "-5s", duration: "11s", size: 9 },
              { id: 8, right: "9%", delay: "-11s", duration: "13s", size: 6 },
            ].map((p, idx) => (
              <div
                key={`right-${p.id}`}
                className="drift-petal absolute top-0"
                style={{
                  right: p.right,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                  animationPlayState: "var(--play-state, running)",
                }}
              >
                {decoration.particleStyle === "petals" ? (
                  <svg
                    width={p.size}
                    height={p.size * 1.4}
                    viewBox="0 0 10 14"
                    fill="none"
                  >
                    <path
                      d="M5 0 C1 4 0 9 5 14 C10 9 9 4 5 0 Z"
                      fill={decoration.paletteColors[(idx + 2) % 4]}
                      fillOpacity="0.75"
                    />
                  </svg>
                ) : (
                  <div
                    className="rotate-12 rounded-full"
                    style={{
                      width: p.size,
                      height: p.size,
                      backgroundColor: decoration.paletteColors[(idx + 2) % 4],
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optional Children content */}
      {children && <div className="relative z-10 w-full">{children}</div>}
    </div>
  );
});

HeroDecoration.displayName = "HeroDecoration";

export default HeroDecoration;

/**
 * Rich Procedural Festive Scene rendered below the 3 feature cards in the hero.
 * Features 3-ring ruffled marigolds, spiral roses, 5-petal jasmines, swaying toran garlands,
 * terracotta diyas, and cursor parallax.
 */
export function FestiveHeroScene({
  eventType = "wedding",
  cultureOrTradition,
  vibeOrTheme,
  palette,
  hoveredType,
  className = "",
}: HeroDecorationProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveType = hoveredType || eventType;

  const scene: HeroSceneData = useMemo(() => {
    return generateHeroScene(
      effectiveType,
      cultureOrTradition,
      vibeOrTheme,
      palette
    );
  }, [effectiveType, cultureOrTradition, vibeOrTheme, palette]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const nx =
        (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2 || 1);
      const ny =
        (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2 || 1);
      setParallax({
        x: Math.max(-8, Math.min(8, Math.round(nx * 8))),
        y: Math.max(-6, Math.min(6, Math.round(ny * 6))),
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefersReducedMotion]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (typeof IntersectionObserver === "undefined") {
      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(
          entry.isIntersecting && document.visibilityState === "visible"
        );
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
    };
  }, []);

  const isWedding = scene.type === "wedding";
  const isDiwaliOrCommunity =
    scene.type === "diwali" || scene.type === "community";
  const isBirthday = scene.type === "birthday";

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none relative h-full min-h-[360px] w-full select-none overflow-hidden transition-opacity duration-300 ease-out ${className}`}
      style={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--play-state" as any]: isVisible ? "running" : "paused",
      }}
    >
      <div
        className="h-full w-full transition-transform duration-200 ease-out"
        style={{
          transform: prefersReducedMotion
            ? "none"
            : `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
        }}
      >
        <svg
          viewBox="0 0 640 360"
          fill="none"
          className="h-full w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 1. WEDDING PROCEDURAL FLORAL COMPOSITION */}
          {isWedding && (
            <g className="transition-opacity duration-300">
              {/* Very Faint Background Mandala (7% opacity) */}
              <g
                transform="translate(180, 180)"
                opacity="0.07"
                stroke="#C9A24B"
                strokeWidth="0.8"
              >
                <circle cx="0" cy="0" r="140" strokeDasharray="3 3" />
                <circle cx="0" cy="0" r="115" />
                <circle cx="0" cy="0" r="85" strokeDasharray="4 2" />
                <circle cx="0" cy="0" r="55" />
                <circle cx="0" cy="0" r="25" fill="#C9A24B" fillOpacity="0.2" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
                  <path
                    key={ang}
                    d="M 0,0 C -12,-35 -12,-55 0,-70 C 12,-55 12,-35 0,0"
                    transform={`rotate(${ang})`}
                  />
                ))}
              </g>

              {/* Top Toran Hanging Garland with gentle 1.5deg sway */}
              <g className="animate-garland-sway">
                {/* Thin gold hanging line */}
                <path
                  d="M 20,20 Q 320,80 620,20"
                  stroke="#C9A24B"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  strokeOpacity="0.7"
                />

                {/* Alternating marigold and jasmine flowers along toran curve */}
                {scene.toranPoints.map((pt) => (
                  <g key={pt.id} transform={`translate(${pt.x}, ${pt.y})`}>
                    {/* Leaf pair */}
                    <path
                      d="M -4,0 C -7,-6 -2,-8 0,-2 C 2,-8 7,-6 4,0"
                      fill="#2E5D4B"
                      fillOpacity="0.5"
                    />
                    {pt.isMarigold ? (
                      /* Toran Marigold */
                      <g>
                        <circle
                          r="9"
                          fill="#E07A1F"
                          stroke="#C9A24B"
                          strokeWidth="0.6"
                        />
                        <circle r="6" fill="#F59E0B" />
                        <circle r="3" fill="#FFD54F" />
                        <circle r="1" fill="#78350F" />
                      </g>
                    ) : (
                      /* Toran Jasmine */
                      <g>
                        {[0, 72, 144, 216, 288].map((rot) => (
                          <ellipse
                            key={rot}
                            cx="0"
                            cy="-4"
                            rx="2"
                            ry="3.8"
                            fill="#FFFDF8"
                            stroke="#E8DCC8"
                            strokeWidth="0.5"
                            transform={`rotate(${rot})`}
                          />
                        ))}
                        <circle r="1.8" fill="#C9A24B" />
                      </g>
                    )}
                  </g>
                ))}
              </g>

              {/* Dense Bouquet Cluster Rising from Bottom-Left */}
              <g>
                {/* Layer A: Background Leaves */}
                {scene.leaves.map((l, i) => (
                  <g key={`leaf-${i}`} transform={l.transform}>
                    <path
                      d={l.path}
                      fill={l.fill}
                      stroke={l.stroke}
                      strokeWidth="0.7"
                      fillOpacity="0.85"
                    />
                    <path
                      d={l.vein}
                      stroke="#1C3D31"
                      strokeWidth="0.5"
                      strokeOpacity="0.7"
                    />
                  </g>
                ))}

                {/* Layer B: Paisleys */}
                {scene.paisleys.map((p, i) => (
                  <g key={`paisley-${i}`} transform={p.transform}>
                    <path
                      d={p.path}
                      fill={p.fill}
                      stroke={p.stroke}
                      strokeWidth="0.8"
                      fillOpacity="0.85"
                    />
                    <path
                      d={p.innerPath}
                      fill="none"
                      stroke="#FFFDF8"
                      strokeWidth="0.6"
                      strokeDasharray="2 2"
                      strokeOpacity="0.8"
                    />
                  </g>
                ))}

                {/* Layer C: Procedural Roses */}
                {scene.roses.map((r, i) => (
                  <g key={`rose-${i}`}>
                    {r.petals.map((petal, pIdx) => (
                      <path
                        key={pIdx}
                        d={petal.path}
                        fill={petal.fill}
                        stroke={petal.stroke}
                        strokeWidth="0.6"
                      />
                    ))}
                    <circle
                      cx={r.center.cx}
                      cy={r.center.cy}
                      r={r.center.r}
                      fill={r.center.fill}
                    />
                  </g>
                ))}

                {/* Layer D: Procedural Marigolds (3 rings of ruffled petals) */}
                {scene.marigolds.map((m, i) => (
                  <g key={`marigold-${i}`}>
                    {m.rings.map((ring) =>
                      ring.petals.map((petal, pIdx) => (
                        <path
                          key={`${ring.ringIndex}-${pIdx}`}
                          d={petal.path}
                          transform={petal.transform}
                          fill={petal.fill}
                          stroke={petal.stroke}
                          strokeWidth="0.5"
                        />
                      ))
                    )}
                    <circle
                      cx={m.center.cx}
                      cy={m.center.cy}
                      r={m.center.r}
                      fill={m.center.fill}
                    />
                    <circle
                      cx={m.center.cx}
                      cy={m.center.cy}
                      r={m.center.stamenR}
                      fill={m.center.stamenFill}
                    />
                  </g>
                ))}

                {/* Layer E: Procedural Jasmines (5 white petals with gold center) */}
                {scene.jasmines.map((j, i) => (
                  <g key={`jasmine-${i}`}>
                    {j.petals.map((petal, pIdx) => (
                      <ellipse
                        key={pIdx}
                        cx={petal.cx}
                        cy={petal.cy}
                        rx={petal.rx}
                        ry={petal.ry}
                        transform={`rotate(${petal.rot} ${j.cx} ${j.cy})`}
                        fill={petal.fill}
                        stroke={petal.stroke}
                        strokeWidth="0.5"
                      />
                    ))}
                    <circle
                      cx={j.center.cx}
                      cy={j.center.cy}
                      r={j.center.r}
                      fill={j.center.fill}
                    />
                  </g>
                ))}
              </g>

              {/* Terracotta Lit Diyas along bottom edge */}
              {scene.diyas.map((d) => (
                <g key={`diya-${d.id}`} transform={`translate(${d.x}, ${d.y})`}>
                  {/* Terracotta bowl */}
                  <path
                    d="M -13,4 C -13,13 13,13 13,4 C 7,7 -7,7 -13,4 Z"
                    fill="#9A3412"
                    stroke="#EA580C"
                    strokeWidth="0.8"
                  />
                  <ellipse
                    cx="0"
                    cy="4"
                    rx="13"
                    ry="2.6"
                    fill="#EA580C"
                    stroke="#F59E0B"
                    strokeWidth="0.6"
                  />
                  {/* Flame and glowing aura */}
                  <circle
                    cx="0"
                    cy="-2"
                    r="7"
                    fill="#F59E0B"
                    fillOpacity="0.2"
                  />
                  <path
                    d="M 0,-7 C -3.5,-2 -2.5,2 0,2 C 2.5,2 3.5,-2 0,-7 Z"
                    fill="#FDE047"
                  />
                  <circle cx="0" cy="0" r="1.5" fill="#EF4444" />
                </g>
              ))}
            </g>
          )}

          {/* 2. COMMUNITY / DIWALI PROCEDURAL SCENE */}
          {isDiwaliOrCommunity && (
            <g className="transition-opacity duration-300">
              {/* Floor Rangoli Medallion */}
              <g
                transform="translate(180, 220)"
                opacity="0.14"
                stroke="#C9A24B"
                strokeWidth="1"
              >
                <circle cx="0" cy="0" r="110" />
                <circle cx="0" cy="0" r="80" strokeDasharray="4 2" />
                <circle cx="0" cy="0" r="50" />
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
                  (ang) => (
                    <line
                      key={ang}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="110"
                      transform={`rotate(${ang})`}
                    />
                  )
                )}
              </g>

              {/* 2 Hanging Kandil Paper Lanterns with Tassels */}
              {[
                { x: 120, y: 15, scale: 0.9 },
                { x: 380, y: 25, scale: 0.8 },
              ].map((k, idx) => (
                <g
                  key={idx}
                  transform={`translate(${k.x}, ${k.y}) scale(${k.scale})`}
                  className="animate-garland-sway"
                >
                  <line
                    x1="40"
                    y1="0"
                    x2="40"
                    y2="20"
                    stroke="#C9A24B"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="40,20 62,45 40,70 18,45"
                    fill="#E07A1F"
                    fillOpacity="0.85"
                    stroke="#C9A24B"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="40,30 52,45 40,60 28,45"
                    fill="#FFD54F"
                    fillOpacity="0.9"
                  />
                  {/* Tassels */}
                  <line
                    x1="34"
                    y1="70"
                    x2="32"
                    y2="120"
                    stroke="#E07A1F"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="40"
                    y1="70"
                    x2="40"
                    y2="135"
                    stroke="#C9A24B"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <line
                    x1="46"
                    y1="70"
                    x2="48"
                    y2="120"
                    stroke="#E07A1F"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
              ))}

              {/* Rows of 6 Lit Diyas */}
              {[
                { x: 40, y: 310 },
                { x: 100, y: 320 },
                { x: 160, y: 325 },
                { x: 220, y: 320 },
                { x: 280, y: 310 },
                { x: 340, y: 300 },
              ].map((d, i) => (
                <g
                  key={`comm-diya-${i}`}
                  transform={`translate(${d.x}, ${d.y})`}
                >
                  <path
                    d="M -12,4 C -12,12 12,12 12,4 C 6,7 -6,7 -12,4 Z"
                    fill="#9A3412"
                    stroke="#EA580C"
                    strokeWidth="0.8"
                  />
                  <ellipse
                    cx="0"
                    cy="4"
                    rx="12"
                    ry="2.5"
                    fill="#EA580C"
                    stroke="#F59E0B"
                    strokeWidth="0.6"
                  />
                  <circle
                    cx="0"
                    cy="-2"
                    r="7"
                    fill="#F59E0B"
                    fillOpacity="0.22"
                  />
                  <path
                    d="M 0,-7 C -3.5,-2 -2.5,2 0,2 C 2.5,2 3.5,-2 0,-7 Z"
                    fill="#FDE047"
                  />
                  <circle cx="0" cy="0" r="1.5" fill="#EF4444" />
                </g>
              ))}

              {/* Golden Sparkles */}
              {[
                { x: 70, y: 140, s: 0.8 },
                { x: 220, y: 90, s: 1 },
                { x: 280, y: 170, s: 0.7 },
                { x: 340, y: 120, s: 0.9 },
                { x: 160, y: 60, s: 0.8 },
              ].map((sp, idx) => (
                <path
                  key={`sparkle-${idx}`}
                  d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8 Z"
                  transform={`translate(${sp.x}, ${sp.y}) scale(${sp.s})`}
                  fill="#C9A24B"
                  fillOpacity="0.75"
                />
              ))}
            </g>
          )}

          {/* 3. BIRTHDAY PROCEDURAL SCENE */}
          {isBirthday && (
            <g className="transition-opacity duration-300">
              {/* Bunting Swags */}
              <path
                d="M 10,25 Q 160,65 310,35 Q 460,65 610,25"
                stroke="#E8DCC8"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              {[
                { x: 50, y: 35, rot: -4, col: "#E25B7B" },
                { x: 110, y: 48, rot: 2, col: "#E07A1F" },
                { x: 170, y: 52, rot: 5, col: "#C9A24B" },
                { x: 230, y: 46, rot: -3, col: "#8B5CF6" },
                { x: 290, y: 38, rot: -5, col: "#E25B7B" },
                { x: 350, y: 46, rot: 3, col: "#E07A1F" },
                { x: 410, y: 52, rot: 6, col: "#C9A24B" },
                { x: 470, y: 46, rot: -2, col: "#8B5CF6" },
                { x: 530, y: 36, rot: -4, col: "#E25B7B" },
              ].map((p, i) => (
                <polygon
                  key={i}
                  points={`${p.x - 12},${p.y} ${p.x + 12},${p.y} ${p.x},${p.y + 24}`}
                  fill={p.col}
                  fillOpacity="0.85"
                  stroke="#FFFDF8"
                  strokeWidth="0.8"
                  transform={`rotate(${p.rot} ${p.x} ${p.y})`}
                />
              ))}

              {/* Balloon Cluster */}
              <g transform="translate(60, 160)">
                <path
                  d="M 15,20 Q 5,60 20,110"
                  stroke="#E8DCC8"
                  strokeWidth="0.8"
                />
                <path
                  d="M 45,15 Q 55,65 24,110"
                  stroke="#E8DCC8"
                  strokeWidth="0.8"
                />
                <path
                  d="M 30,5 Q 30,55 22,110"
                  stroke="#E8DCC8"
                  strokeWidth="0.8"
                />

                <ellipse
                  cx="15"
                  cy="15"
                  rx="16"
                  ry="20"
                  fill="#E25B7B"
                  fillOpacity="0.88"
                />
                <ellipse
                  cx="45"
                  cy="10"
                  rx="15"
                  ry="19"
                  fill="#E07A1F"
                  fillOpacity="0.88"
                />
                <ellipse
                  cx="30"
                  cy="-2"
                  rx="17"
                  ry="21"
                  fill="#C9A24B"
                  fillOpacity="0.9"
                />
              </g>

              {/* Confetti diamonds and stars */}
              {[
                { x: 150, y: 160, c: "#E25B7B" },
                { x: 220, y: 220, c: "#E07A1F" },
                { x: 290, y: 140, c: "#C9A24B" },
                { x: 180, y: 270, c: "#8B5CF6" },
                { x: 260, y: 280, c: "#E25B7B" },
              ].map((cf, i) => (
                <rect
                  key={i}
                  x={cf.x}
                  y={cf.y}
                  width="8"
                  height="8"
                  transform={`rotate(45 ${cf.x + 4} ${cf.y + 4})`}
                  fill={cf.c}
                  fillOpacity="0.75"
                />
              ))}
            </g>
          )}

          {/* 4. OTHER PROCEDURAL SCENE */}
          {!isWedding && !isDiwaliOrCommunity && !isBirthday && (
            <g className="transition-opacity duration-300">
              {/* Minimalist Geometric Bunting */}
              <path
                d="M 10,20 Q 320,60 620,20"
                stroke="#E8DCC8"
                strokeWidth="0.8"
                strokeDasharray="4 2"
              />
              {[70, 160, 250, 340, 430, 520].map((x, i) => (
                <polygon
                  key={i}
                  points={`${x - 10},28 ${x + 10},28 ${x},46`}
                  fill={i % 2 === 0 ? "#C9A24B" : "#5B1A2B"}
                  fillOpacity="0.75"
                />
              ))}

              {/* Light mix of procedural flowers */}
              {scene.marigolds.slice(0, 2).map((m, i) => (
                <g key={`other-m-${i}`}>
                  {m.rings.map((ring) =>
                    ring.petals.map((petal, pIdx) => (
                      <path
                        key={`${ring.ringIndex}-${pIdx}`}
                        d={petal.path}
                        transform={petal.transform}
                        fill={petal.fill}
                        stroke={petal.stroke}
                        strokeWidth="0.5"
                      />
                    ))
                  )}
                  <circle
                    cx={m.center.cx}
                    cy={m.center.cy}
                    r={m.center.r}
                    fill={m.center.fill}
                  />
                </g>
              ))}

              {scene.jasmines.slice(0, 4).map((j, i) => (
                <g key={`other-j-${i}`}>
                  {j.petals.map((petal, pIdx) => (
                    <ellipse
                      key={pIdx}
                      cx={petal.cx}
                      cy={petal.cy}
                      rx={petal.rx}
                      ry={petal.ry}
                      transform={`rotate(${petal.rot} ${j.cx} ${j.cy})`}
                      fill={petal.fill}
                      stroke={petal.stroke}
                      strokeWidth="0.5"
                    />
                  ))}
                  <circle
                    cx={j.center.cx}
                    cy={j.center.cy}
                    r={j.center.r}
                    fill={j.center.fill}
                  />
                </g>
              ))}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

/**
 * Small "Celebrate" trigger button component.
 * Dispatches a particle burst on the hero background canvas.
 * High-contrast warm button in espresso, maroon, and ivory.
 */
export function CelebrateBurstButton({
  onBurst,
  className = "",
}: {
  onBurst?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onBurst}
      className={`shadow-2xs backdrop-blur-xs group inline-flex items-center gap-1.5 rounded-full border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-1.5 text-xs font-semibold text-[#2B1B14] transition-all hover:border-[#5B1A2B] hover:bg-white hover:text-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-1 active:scale-95 ${className}`}
      aria-label="Celebrate with a particle burst"
    >
      <span
        className="transition-transform duration-300 group-hover:scale-125"
        aria-hidden="true"
      >
        ✨
      </span>
      <span>Celebrate</span>
    </button>
  );
}
