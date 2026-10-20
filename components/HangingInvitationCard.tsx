"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { EventInput, EventPalette } from "@/lib/schemas";
import {
  createRope,
  stepRope,
  wakeRope,
  pullLastPoint,
  applyFlick,
  addImpulse,
  settleRope,
  calculateCardTransform,
  buildRopeSvgPath,
  calculateDynamicShadow,
  FIXED_TIMESTEP,
  type RopeState,
} from "@/lib/physics/rope";
import { type InviteCardData, type CardStyle } from "@/lib/invitation";
import {
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
  buildLocalizedInviteText,
} from "@/lib/languages";
import DesignerCard from "@/components/invitation/DesignerCard";
import CustomDesignEditor from "@/components/invitation/CustomDesignEditor";
import { loadSeatingPlan, type Guest } from "@/lib/seating";
import { getSiteUrlInfo } from "@/lib/rsvp/site";
import type { EventEssentials } from "@/lib/rsvp/types";

interface HangingInvitationCardProps {
  input?: Partial<EventInput> | null;
  palette?: EventPalette | null;
  guests?: Guest[];
  className?: string;
  initialMode?: "designer" | "custom";
}

export default function HangingInvitationCard({
  input,
  palette,
  guests: providedGuests,
  className = "",
  initialMode = "designer",
}: HangingInvitationCardProps) {
  const [invitationMode, setInvitationMode] = useState<"designer" | "custom">(
    initialMode
  );
  // ── Debounced Form Input (200ms) ──
  const [debouncedInput, setDebouncedInput] = useState<Partial<EventInput>>(
    input ?? {}
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input ?? {});
    }, 200);
    return () => clearTimeout(timer);
  }, [input]);

  // ── DOM Refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  // ── Physics State in Ref (No re-renders per physics tick) ──
  const isDraggingRef = useRef(false);
  const pointerTargetRef = useRef<{ x: number; y: number }>({ x: 150, y: 220 });
  const pointerHistoryRef = useRef<
    Array<{ x: number; y: number; time: number }>
  >([]);
  const smoothedTiltRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef(0);

  // Multilingual & Style state
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("en");
  const [cardStyle, setCardStyle] = useState<CardStyle>("royal");

  // Layout measurements
  const [containerWidth, setContainerWidth] = useState(340);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Copy status announcement
  const [copied, setCopied] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  // ── Rope Initialization ──
  const ropeLength = isMobile ? 160 : 220;
  const ropeRef = useRef<RopeState>(
    createRope(containerWidth / 2, 0, ropeLength, 7, true)
  );

  // Update rope dimensions on resize
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth || 340;
      const mobile = width < 500 || window.innerWidth < 768;
      setContainerWidth(width);
      setIsMobile(mobile);

      const newRopeLen = mobile ? 160 : 220;
      const anchorX = width / 2;
      const currentRope = ropeRef.current;
      currentRope.points[0].x = anchorX;
      currentRope.points[0].oldX = anchorX;
      currentRope.totalLength = newRopeLen;
      currentRope.segmentLength = newRopeLen / (currentRope.points.length - 1);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Map input to InviteCardData
  const cardData: InviteCardData = useMemo(
    () => ({
      hostName: debouncedInput.hostName ?? "",
      eventType: debouncedInput.eventType ?? "celebration",
      eventDate: debouncedInput.eventDate ?? "",
      city: debouncedInput.city ?? "",
      guestCount: debouncedInput.guestCount,
      vibeOrTheme: debouncedInput.vibeOrTheme ?? "",
      cultureOrTradition: debouncedInput.cultureOrTradition ?? "",
      specialRequirements: debouncedInput.specialRequirements ?? "",
      venueName: debouncedInput.venueName ?? "",
      dressCode: debouncedInput.dressCode ?? "",
    }),
    [debouncedInput]
  );

  const inviteText = useMemo(
    () => buildLocalizedInviteText(cardData, selectedLang),
    [cardData, selectedLang]
  );

  const eventEssentials: EventEssentials = useMemo(
    () => ({
      t: debouncedInput.eventType || "celebration",
      h: debouncedInput.hostName || "Host",
      d: debouncedInput.eventDate || new Date().toISOString().split("T")[0],
      c: debouncedInput.city || "City",
      v: debouncedInput.venueName || "Venue",
      th: debouncedInput.vibeOrTheme || "Festive",
      dc: debouncedInput.dressCode,
    }),
    [debouncedInput]
  );

  const effectiveGuests = useMemo(() => {
    if (providedGuests && providedGuests.length > 0) return providedGuests;
    if (typeof window !== "undefined") {
      try {
        const plan = loadSeatingPlan();
        if (plan.guests && plan.guests.length > 0) return plan.guests;
      } catch {
        // Fallback
      }
    }
    return [];
  }, [providedGuests]);

  const siteInfo = useMemo(() => {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    return getSiteUrlInfo(envUrl);
  }, []);

  // Wake rope when input props change
  useEffect(() => {
    if (prefersReducedMotion) return;
    wakeRope(ropeRef.current);
    addImpulse(ropeRef.current, (Math.random() - 0.5) * 8);
  }, [debouncedInput, prefersReducedMotion]);

  // ── Physics Simulation Loop (RAF) ──
  useEffect(() => {
    if (prefersReducedMotion) {
      settleRope(ropeRef.current);
      return;
    }

    const svgPathEl = containerRef.current?.querySelector(
      "path.rope-path"
    ) as SVGPathElement | null;
    const cardEl = cardRef.current;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      const frameTime = Math.min(
        (currentTime - lastTimeRef.current) / 1000,
        0.1
      );
      lastTimeRef.current = currentTime;
      accumulatorRef.current += frameTime;

      const rope = ropeRef.current;

      while (accumulatorRef.current >= FIXED_TIMESTEP) {
        if (isDraggingRef.current) {
          pullLastPoint(
            rope,
            pointerTargetRef.current.x,
            pointerTargetRef.current.y
          );
        }

        stepRope(rope, FIXED_TIMESTEP);
        accumulatorRef.current -= FIXED_TIMESTEP;
      }

      // Update DOM directly via ref
      if (svgPathEl) {
        svgPathEl.setAttribute("d", buildRopeSvgPath(rope.points));
      }

      if (cardEl) {
        const { x, y, rotation, smoothedTilt } = calculateCardTransform(
          rope,
          smoothedTiltRef.current,
          frameTime
        );
        smoothedTiltRef.current = smoothedTilt;

        cardEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, 0) rotate(${rotation.toFixed(2)}deg)`;
        cardEl.style.boxShadow = calculateDynamicShadow(rotation);
      }

      if (!rope.isSleeping || isDraggingRef.current) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
      }
    };

    if (rafIdRef.current === null) {
      lastTimeRef.current = 0;
      rafIdRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [containerWidth, prefersReducedMotion]);

  // Restart loop helper
  const ensureLoopRunning = useCallback(() => {
    if (prefersReducedMotion) return;
    wakeRope(ropeRef.current);
    if (rafIdRef.current === null) {
      lastTimeRef.current = 0;
      rafIdRef.current = requestAnimationFrame((now) => {
        lastTimeRef.current = now;
      });
    }
  }, [prefersReducedMotion]);

  // ── Drag & Touch Handlers ──
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    if ((e.target as HTMLElement).closest("button, a, input, [role='radio']")) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    pointerTargetRef.current = { x: relX, y: relY };
    pointerHistoryRef.current = [{ x: relX, y: relY, time: performance.now() }];

    ensureLoopRunning();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    pointerTargetRef.current = { x: relX, y: relY };
    pointerHistoryRef.current.push({
      x: relX,
      y: relY,
      time: performance.now(),
    });

    if (pointerHistoryRef.current.length > 5) {
      pointerHistoryRef.current.shift();
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const history = pointerHistoryRef.current;
    if (history.length >= 2) {
      const oldest = history[0];
      const newest = history[history.length - 1];
      const dt = Math.max((newest.time - oldest.time) / 1000, 0.016);
      const vx = ((newest.x - oldest.x) / dt) * 0.12;
      const vy = ((newest.y - oldest.y) / dt) * 0.12;
      applyFlick(ropeRef.current, vx, vy);
    }

    pointerHistoryRef.current = [];
    ensureLoopRunning();
  };

  // ── Keyboard Navigation (Nudging) ──
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rope = ropeRef.current;
    let handled = true;

    switch (e.key) {
      case "ArrowLeft":
        addImpulse(rope, -14);
        break;
      case "ArrowRight":
        addImpulse(rope, 14);
        break;
      case "ArrowUp":
        addImpulse(rope, 0, -12);
        break;
      case "ArrowDown":
        addImpulse(rope, 0, 12);
        break;
      case " ":
      case "Enter":
        addImpulse(rope, (Math.random() - 0.5) * 20);
        break;
      case "Escape":
      case "Home":
        settleRope(rope);
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      ensureLoopRunning();
    }
  };

  // ── Action Handlers ──
  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteText);
      }
      setCopied(true);
      setLiveAnnouncement("Invite text copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        setLiveAnnouncement("");
      }, 2500);
    } catch {
      setLiveAnnouncement("Failed to copy invite text");
      setTimeout(() => setLiveAnnouncement(""), 2000);
    }
  }, [inviteText]);

  const handlePrint = useCallback(() => {
    if (typeof document === "undefined" || typeof window === "undefined")
      return;
    document.body.classList.add("print-card-mode");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-card-mode");
    }, 500);
  }, []);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;

  const stageHeight = isMobile ? 540 : 620;
  const initialAnchorX = containerWidth / 2;
  const restingY = ropeLength;

  return (
    <div
      className={`relative mx-auto flex w-full flex-col items-center transition-all ${
        invitationMode === "custom" ? "max-w-4xl" : "max-w-[380px]"
      } ${className}`}
    >
      {/* Mode Switcher: Designer Card vs Use My Own Design */}
      <div
        role="tablist"
        aria-label="Invitation design mode"
        className="mx-auto mb-5 flex w-fit items-center rounded-full border border-[#E8DCC8] bg-[#FBF6EE] p-1 print:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={invitationMode === "designer"}
          onClick={() => setInvitationMode("designer")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            invitationMode === "designer"
              ? "bg-[#5B1A2B] text-[#FBF6EE] shadow-sm"
              : "text-[#6B5848] hover:text-[#2B1B14]"
          }`}
        >
          <span>👑 Designer Card</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={invitationMode === "custom"}
          onClick={() => setInvitationMode("custom")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            invitationMode === "custom"
              ? "bg-[#5B1A2B] text-[#FBF6EE] shadow-sm"
              : "text-[#6B5848] hover:text-[#2B1B14]"
          }`}
        >
          <span>🎨 Use my own design</span>
        </button>
      </div>

      {invitationMode === "custom" ? (
        <CustomDesignEditor
          guests={effectiveGuests}
          eventEssentials={eventEssentials}
          siteUrl={siteInfo.siteUrl}
          className="w-full"
        />
      ) : (
        <>
          {/* Live announcement region */}
          <div role="status" aria-live="polite" className="sr-only">
            {liveAnnouncement}
          </div>

          {/* Physics Hanging Stage */}
          <div
            ref={containerRef}
            role="region"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label="Interactive digital invitation card (drag with pointer or use arrow keys to swing)"
            className="relative w-full overflow-visible rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-4"
            style={{
              height: stageHeight,
              touchAction: "none",
            }}
          >
            {/* SVG Hanging Rope */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible print:hidden"
              aria-hidden="true"
            >
              {/* Top Anchor Pin */}
              <circle
                cx={initialAnchorX}
                cy="4"
                r="6"
                fill="#111111"
                stroke="#D4AF37"
                strokeWidth="1.5"
              />
              {/* Swinging Rope Path */}
              <path
                className="rope-path"
                d={
                  prefersReducedMotion
                    ? `M ${initialAnchorX} 0 L ${initialAnchorX} ${restingY}`
                    : buildRopeSvgPath(ropeRef.current.points)
                }
                fill="none"
                stroke="#8C7335"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="3 1"
              />
            </svg>

            {/* Hanging Card Element */}
            <div
              ref={cardRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transformOrigin: "50% 0px",
                transform: prefersReducedMotion
                  ? `translate3d(${initialAnchorX}px, ${restingY}px, 0) translate(-50%, 0) rotate(0deg)`
                  : undefined,
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
              className="hanging-card-print-target group w-[310px] cursor-grab focus:outline-none active:cursor-grabbing sm:w-[330px]"
            >
              {/* Punched Hanging Ring at top-center */}
              <div
                className="pointer-events-none absolute -top-1.5 left-1/2 z-30 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-stone-800 bg-[#D4AF37] shadow-sm print:hidden"
                aria-hidden="true"
              />

              {/* Designer Card Content */}
              <DesignerCard
                data={cardData}
                cardStyle={cardStyle}
                selectedLang={selectedLang}
                palette={palette}
                defaultHostText="You are invited"
              />
            </div>
          </div>

          {/* ── CONTROLS BELOW THE HANGING CARD ── */}
          <div className="mt-4 w-full space-y-3 print:hidden">
            {/* Card Style Selector: Royal, Modern, Floral */}
            <div
              role="radiogroup"
              aria-label="Select card style"
              className="flex flex-wrap items-center justify-center gap-1.5"
            >
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
                Style:
              </span>
              {[
                { id: "royal", label: "Royal", icon: "👑" },
                { id: "modern", label: "Modern", icon: "🏛️" },
                { id: "floral", label: "Floral", icon: "🌸" },
              ].map((style) => {
                const isSelected = cardStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setCardStyle(style.id as CardStyle)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-[#111111] text-[#F7F7F7] shadow-sm ring-1 ring-[#111111]"
                        : "border border-stone-300 bg-white/90 text-stone-700 hover:bg-white"
                    }`}
                  >
                    <span aria-hidden="true">{style.icon}</span>
                    <span>{style.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Language Selector: English, हिन्दी, اردو, తెలుగు */}
            <div
              role="radiogroup"
              aria-label="Select invitation language"
              className="flex flex-wrap items-center justify-center gap-1.5"
            >
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
                Language:
              </span>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedLang(lang.code)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? "shadow-xs bg-[#111111] text-[#F7F7F7] ring-1 ring-[#111111]"
                        : "border border-stone-300 bg-white/90 text-stone-700 hover:bg-white"
                    } ${lang.fontClass}`}
                  >
                    {lang.nativeLabel}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons: Copy, WhatsApp, Print */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] px-4 py-2 text-xs font-semibold text-[#F7F7F7] shadow-sm transition-all hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#111111]"
                aria-label="Copy invite text"
              >
                {copied ? (
                  <>
                    <span aria-hidden="true">✓</span>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">📋</span>
                    <span>Copy invite text</span>
                  </>
                )}
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#20ba5a] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Share on WhatsApp"
              >
                <span aria-hidden="true">💬</span>
                <span>Share on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-sm transition-all hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400"
                aria-label="Print or save as PDF"
              >
                <span aria-hidden="true">🖨️</span>
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
