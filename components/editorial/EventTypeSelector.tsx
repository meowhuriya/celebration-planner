"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type { EventType } from "@/lib/schemas";
import DesignerCard from "@/components/invitation/DesignerCard";
import { FALLBACK_PALETTES } from "@/lib/palette";
import { addTraditionChip } from "@/lib/editorial";
import type { InviteCardData, CardStyle } from "@/lib/invitation";

export interface EventTypeOption {
  id: EventType;
  title: string;
  description: string;
  chips: string[];
  cardStyle: CardStyle;
  sampleData: InviteCardData;
}

export const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  {
    id: "wedding",
    title: "Wedding",
    description: "Haldi, Sangeet, Nikah, Reception",
    chips: ["Mehndi", "Haldi", "Sangeet", "Nikah", "Reception"],
    cardStyle: "royal",
    sampleData: {
      hostName: "Aarav & Diya",
      eventType: "wedding",
      eventDate: "2026-11-20",
      city: "Udaipur",
      venueName: "The Palace",
      vibeOrTheme: "Royal Grandeur",
      cultureOrTradition: "Sangeet & Haldi",
    },
  },
  {
    id: "birthday",
    title: "Birthday",
    description: "Milestone, theme party, kids bash",
    chips: ["Kids", "Milestone", "Surprise", "Theme party"],
    cardStyle: "modern",
    sampleData: {
      hostName: "Kabir",
      eventType: "birthday",
      eventDate: "2026-12-15",
      city: "Mumbai",
      venueName: "The Loft",
      vibeOrTheme: "Milestone Celebration",
      cultureOrTradition: "Milestone",
    },
  },
  {
    id: "community",
    title: "Community",
    description: "Diwali, festival, cultural gathering",
    chips: ["Diwali", "Eid", "Christmas", "Onam", "Pongal"],
    cardStyle: "floral",
    sampleData: {
      hostName: "Community Sabha",
      eventType: "community",
      eventDate: "2026-11-05",
      city: "Jaipur",
      venueName: "Town Hall",
      vibeOrTheme: "Diwali Festival",
      cultureOrTradition: "Diwali",
    },
  },
  {
    id: "other",
    title: "Other",
    description: "Anniversary, baby shower, bespoke",
    chips: ["Anniversary", "Baby shower", "Housewarming", "Farewell"],
    cardStyle: "modern",
    sampleData: {
      hostName: "The Mehtas",
      eventType: "other",
      eventDate: "2026-10-30",
      city: "Bangalore",
      venueName: "Botanical Pavilion",
      vibeOrTheme: "Golden Anniversary",
      cultureOrTradition: "Anniversary",
    },
  },
];

interface EventTypeSelectorProps {
  selectedType: string;
  onSelectType: (type: EventType) => void;
  onHoverType?: (type: EventType | null) => void;
  cultureOrTradition?: string;
  onSelectTradition?: (fullTradition: string, clickedChip: string) => void;
  className?: string;
}

/**
 * Line-art SVG Motifs in gold and palette colors.
 * Static by default; animates with pure transforms on hover or focus.
 */
function EventMotif({
  type,
  isSelected,
}: {
  type: EventType;
  isSelected: boolean;
}) {
  const goldColor = isSelected ? "#C9A24B" : "#C9A24B";

  switch (type) {
    case "wedding":
      return (
        <svg
          viewBox="0 0 320 44"
          fill="none"
          className="pointer-events-none h-8 w-full max-w-[280px] select-none sm:h-9"
          aria-hidden="true"
        >
          <g className="garland-sway origin-top">
            <path
              d="M 20,10 Q 160,34 300,10"
              stroke={goldColor}
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* Clustered Marigolds */}
            <circle cx="50" cy="16" r="6" fill="#E07A1F" />
            <circle cx="50" cy="16" r="3.5" fill="#FFB300" />
            <circle cx="105" cy="22" r="6.5" fill="#E07A1F" />
            <circle cx="105" cy="22" r="4" fill="#FFB300" />
            <circle cx="160" cy="24" r="7.5" fill="#E07A1F" />
            <circle cx="160" cy="24" r="4.5" fill="#FFB300" />
            <circle cx="215" cy="22" r="6.5" fill="#E07A1F" />
            <circle cx="215" cy="22" r="4" fill="#FFB300" />
            <circle cx="270" cy="16" r="6" fill="#E07A1F" />
            <circle cx="270" cy="16" r="3.5" fill="#FFB300" />
            {/* Jasmine buds */}
            <path
              d="M 75,19 l 2,2 l -2,2 l -2,-2 Z"
              fill="#FFFDF8"
              stroke={goldColor}
              strokeWidth="0.8"
            />
            <path
              d="M 132,24 l 2,2 l -2,2 l -2,-2 Z"
              fill="#FFFDF8"
              stroke={goldColor}
              strokeWidth="0.8"
            />
            <path
              d="M 188,24 l 2,2 l -2,2 l -2,-2 Z"
              fill="#FFFDF8"
              stroke={goldColor}
              strokeWidth="0.8"
            />
            <path
              d="M 243,19 l 2,2 l -2,2 l -2,-2 Z"
              fill="#FFFDF8"
              stroke={goldColor}
              strokeWidth="0.8"
            />
            {/* Leaf accents */}
            <path
              d="M 44,14 Q 40,8 48,10"
              stroke="#4A6B42"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M 152,24 Q 146,30 156,30"
              stroke="#4A6B42"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M 276,14 Q 280,8 272,10"
              stroke="#4A6B42"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>
        </svg>
      );
    case "birthday":
      return (
        <svg
          viewBox="0 0 320 44"
          fill="none"
          className="pointer-events-none h-8 w-full max-w-[280px] select-none sm:h-9"
          aria-hidden="true"
        >
          {/* Bunting String */}
          <path
            d="M 20,12 Q 160,26 300,12"
            stroke={goldColor}
            strokeWidth="1.2"
          />
          {/* Pennants */}
          <polygon points="35,13 47,14 41,26" fill="#E91E63" />
          <polygon points="65,15 77,17 71,28" fill="#FF9800" />
          <polygon points="95,18 107,20 101,31" fill="#00ACC1" />
          <polygon points="125,20 137,21 131,33" fill="#D4AF37" />
          <polygon points="155,21 167,21 161,34" fill="#E91E63" />
          <polygon points="185,21 197,20 191,33" fill="#4CAF50" />
          <polygon points="215,20 227,18 221,31" fill="#FF9800" />
          <polygon points="245,17 257,15 251,28" fill="#00ACC1" />
          <polygon points="275,14 287,13 281,26" fill="#D4AF37" />
          {/* Floating Balloons */}
          <g className="balloon-float">
            <ellipse cx="80" cy="14" rx="7" ry="9" fill="#E91E63" />
            <path
              d="M 80,23 Q 83,28 81,32"
              stroke={goldColor}
              strokeWidth="0.8"
              fill="none"
            />
            <ellipse cx="160" cy="10" rx="8" ry="10" fill="#FF9800" />
            <path
              d="M 160,20 Q 158,26 160,30"
              stroke={goldColor}
              strokeWidth="0.8"
              fill="none"
            />
            <ellipse cx="240" cy="14" rx="7" ry="9" fill="#00ACC1" />
            <path
              d="M 240,23 Q 237,28 239,32"
              stroke={goldColor}
              strokeWidth="0.8"
              fill="none"
            />
          </g>
        </svg>
      );
    case "community":
      return (
        <svg
          viewBox="0 0 320 44"
          fill="none"
          className="pointer-events-none h-8 w-full max-w-[280px] select-none sm:h-9"
          aria-hidden="true"
        >
          {/* Rangoli flourish baseline */}
          <path
            d="M 25,28 Q 160,34 295,28"
            stroke={goldColor}
            strokeWidth="1"
            strokeOpacity="0.6"
          />
          {/* Diyas */}
          <path
            d="M 50,28 C 50,34 74,34 74,28 Z"
            fill="#C9A24B"
            stroke="#800020"
            strokeWidth="0.8"
          />
          <path
            d="M 148,28 C 148,34 172,34 172,28 Z"
            fill="#C9A24B"
            stroke="#800020"
            strokeWidth="0.8"
          />
          <path
            d="M 246,28 C 246,34 270,34 270,28 Z"
            fill="#C9A24B"
            stroke="#800020"
            strokeWidth="0.8"
          />
          {/* Flickering Flames */}
          <g className="flame-flicker origin-bottom">
            <path
              d="M 62,28 C 58,22 62,14 62,14 C 62,14 66,22 62,28 Z"
              fill="#FFB300"
            />
            <circle cx="62" cy="24" r="1.5" fill="#FFF3E0" />
            <path
              d="M 160,28 C 156,21 160,12 160,12 C 160,12 164,21 160,28 Z"
              fill="#FFB300"
            />
            <circle cx="160" cy="23" r="1.8" fill="#FFF3E0" />
            <path
              d="M 258,28 C 254,22 258,14 258,14 C 258,14 262,22 258,28 Z"
              fill="#FFB300"
            />
            <circle cx="258" cy="24" r="1.5" fill="#FFF3E0" />
          </g>
          {/* Hanging lanterns */}
          <polygon
            points="108,12 116,18 108,24 100,18"
            fill="#E65100"
            stroke={goldColor}
            strokeWidth="0.8"
          />
          <line
            x1="108"
            y1="6"
            x2="108"
            y2="12"
            stroke={goldColor}
            strokeWidth="0.8"
          />
          <line
            x1="108"
            y1="24"
            x2="108"
            y2="28"
            stroke={goldColor}
            strokeWidth="0.8"
          />
          <polygon
            points="212,12 220,18 212,24 204,18"
            fill="#E65100"
            stroke={goldColor}
            strokeWidth="0.8"
          />
          <line
            x1="212"
            y1="6"
            x2="212"
            y2="12"
            stroke={goldColor}
            strokeWidth="0.8"
          />
          <line
            x1="212"
            y1="24"
            x2="212"
            y2="28"
            stroke={goldColor}
            strokeWidth="0.8"
          />
        </svg>
      );
    case "other":
    default:
      return (
        <svg
          viewBox="0 0 320 44"
          fill="none"
          className="pointer-events-none h-8 w-full max-w-[280px] select-none sm:h-9"
          aria-hidden="true"
        >
          <g className="confetti-drift">
            {/* Flowers */}
            <circle
              cx="45"
              cy="20"
              r="5"
              stroke="#C2185B"
              strokeWidth="1"
              fill="#FFFDF8"
            />
            <circle cx="45" cy="20" r="2" fill={goldColor} />
            <circle
              cx="160"
              cy="18"
              r="6"
              stroke={goldColor}
              strokeWidth="1.2"
              fill="#FAF9F6"
            />
            <circle cx="160" cy="18" r="2.5" fill="#E07A1F" />
            <circle
              cx="275"
              cy="22"
              r="5"
              stroke="#34D399"
              strokeWidth="1"
              fill="#FFFDF8"
            />
            <circle cx="275" cy="22" r="2" fill={goldColor} />
            {/* Confetti pieces */}
            <rect
              x="80"
              y="14"
              width="5"
              height="5"
              transform="rotate(25 82 16)"
              fill="#E07A1F"
            />
            <rect
              x="120"
              y="24"
              width="4"
              height="4"
              transform="rotate(45 122 26)"
              fill={goldColor}
            />
            <rect
              x="200"
              y="12"
              width="6"
              height="3"
              transform="rotate(15 203 13)"
              fill="#C2185B"
            />
            <rect
              x="235"
              y="24"
              width="4"
              height="4"
              transform="rotate(30 237 26)"
              fill="#60A5FA"
            />
            <circle cx="100" cy="16" r="1.5" fill={goldColor} />
            <circle cx="180" cy="26" r="1.5" fill="#34D399" />
            <circle cx="218" cy="18" r="1.5" fill="#FFB300" />
          </g>
        </svg>
      );
  }
}

export default function EventTypeSelector({
  selectedType,
  onSelectType,
  onHoverType,
  cultureOrTradition = "",
  onSelectTradition,
  className = "",
}: EventTypeSelectorProps) {
  const [hoveredOption, setHoveredOption] = useState<EventTypeOption | null>(
    null
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isPointerFine, setIsPointerFine] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Check pointer fine & reduced motion (mouse only preview)
  useEffect(() => {
    const fine =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsPointerFine(fine && !reduced);
  }, []);

  // Keyboard navigation for radiogroup
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>, index: number) => {
      let nextIndex: number | null = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        nextIndex = (index + 1) % EVENT_TYPE_OPTIONS.length;
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        nextIndex =
          (index - 1 + EVENT_TYPE_OPTIONS.length) % EVENT_TYPE_OPTIONS.length;
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectType(EVENT_TYPE_OPTIONS[index].id);
        return;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextType = EVENT_TYPE_OPTIONS[nextIndex];
        onSelectType(nextType.id);
        setFocusedIndex(nextIndex);
        const radioEls =
          containerRef.current?.querySelectorAll<HTMLElement>('[role="radio"]');
        radioEls?.[nextIndex]?.focus();
      }
    },
    [onSelectType]
  );

  // Handle clicking a tradition chip
  const handleChipClick = (
    e: MouseEvent<HTMLButtonElement>,
    optionId: EventType,
    chip: string
  ) => {
    e.stopPropagation();
    onSelectType(optionId);

    const updated = addTraditionChip(cultureOrTradition, chip, 200);
    onSelectTradition?.(updated, chip);
  };

  // Determine if a chip is currently included in cultureOrTradition
  const isChipActive = (chip: string): boolean => {
    if (!cultureOrTradition) return false;
    const items = cultureOrTradition
      .split(",")
      .map((s) => s.trim().toLowerCase());
    return items.includes(chip.toLowerCase());
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] shadow-sm ${className}`}
    >
      {/* Inline styles for motif animation keyframes */}
      <style>{`
        @keyframes garlandSway {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(1.8deg) translateY(-1px); }
          75% { transform: rotate(-1.8deg) translateY(1px); }
        }
        @keyframes balloonFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.15, 1.08) translateY(-1.5px); }
        }
        @keyframes confettiDrift {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(3deg) scale(1.04) translateY(-1px); }
        }
        .group:hover .garland-sway, .group:focus-within .garland-sway {
          animation: garlandSway 3s ease-in-out infinite;
        }
        .group:hover .balloon-float, .group:focus-within .balloon-float {
          animation: balloonFloat 2.5s ease-in-out infinite;
        }
        .group:hover .flame-flicker, .group:focus-within .flame-flicker {
          animation: flameFlicker 1.8s ease-in-out infinite;
        }
        .group:hover .confetti-drift, .group:focus-within .confetti-drift {
          animation: confettiDrift 3s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .garland-sway, .balloon-float, .flame-flicker, .confetti-drift {
            animation: none !important;
          }
        }
      `}</style>

      {/* Radiogroup Container */}
      <div
        role="radiogroup"
        aria-label="Event Type Selection"
        className="divide-y divide-[#E8DCC8]"
      >
        {EVENT_TYPE_OPTIONS.map((option, idx) => {
          const isSelected = selectedType === option.id;
          const isHovered = hoveredOption?.id === option.id;
          const isFocused = focusedIndex === idx;
          const palette =
            FALLBACK_PALETTES[option.id] || FALLBACK_PALETTES.wedding;

          return (
            <div
              key={option.id}
              data-testid={`event-type-row-${option.id}`}
              onPointerEnter={() => {
                setHoveredOption(option);
                onHoverType?.(option.id);
              }}
              onPointerLeave={() => {
                setHoveredOption(null);
                onHoverType?.(null);
              }}
              onClick={() => onSelectType(option.id)}
              className={`duration-250 group relative flex cursor-pointer flex-col justify-between gap-3 p-4 transition-colors md:h-[150px] md:min-h-[148px] md:flex-row md:items-center md:gap-4 md:px-6 md:py-3 ${
                isSelected
                  ? "bg-[#3A0F1C] text-[#FBF6EE]"
                  : isHovered
                    ? "bg-[#FCEBD3] text-[#2B1B14]"
                    : "bg-[#FFFDF8] text-[#2B1B14] hover:bg-[#FCEBD3]"
              }`}
            >
              {/* Left Column: Title with Display Serif (acting as keyboard-accessible radio control) */}
              <div
                role="radio"
                aria-checked={isSelected}
                aria-label={`${option.title}: ${option.description}`}
                tabIndex={isSelected || (!selectedType && idx === 0) ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onFocus={() => setFocusedIndex(idx)}
                onBlur={() => setFocusedIndex(null)}
                className="flex shrink-0 items-center rounded-lg p-1 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B] focus-visible:ring-offset-2 md:w-[170px] lg:w-[190px]"
              >
                <span className="font-serif text-3xl font-normal leading-tight tracking-tight sm:text-4xl md:text-5xl">
                  {option.title}
                </span>
              </div>

              {/* Middle Column: SVG Motif + Tradition Chips */}
              <div className="flex flex-1 flex-col items-center justify-center px-1 py-1 md:px-4">
                {/* 1. Line-Art Motif */}
                <div className="mb-1 flex h-7 w-full items-center justify-center sm:h-8 md:h-9">
                  <EventMotif type={option.id} isSelected={isSelected} />
                </div>

                {/* 2. Tradition Chips */}
                <div
                  className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
                  role="group"
                  aria-label={`${option.title} tradition chips`}
                >
                  {option.chips.map((chip) => {
                    const active = isChipActive(chip);

                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={(e) => handleChipClick(e, option.id, chip)}
                        aria-pressed={active}
                        className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] md:min-h-[32px] md:px-2.5 md:py-1 ${
                          isSelected
                            ? active
                              ? "border border-[#C9A24B] bg-[#C9A24B] font-semibold text-[#2B1B14] shadow-sm"
                              : "border border-[#C9A24B]/40 bg-[#4D1826] text-[#FBF6EE] hover:bg-[#5E1E30]"
                            : active
                              ? "border border-[#5B1A2B] bg-[#5B1A2B] font-semibold text-[#FBF6EE] shadow-sm"
                              : isHovered
                                ? "border border-[#E8DCC8] bg-white text-[#2B1B14] hover:border-[#5B1A2B]"
                                : "border border-[#E8DCC8] bg-[#FAF2E6] text-[#2B1B14] hover:border-[#5B1A2B]"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Mini Invitation Preview on Hover/Focus (Desktop mouse only, aria-hidden, hidden on touch & reduced-motion) */}
              {isPointerFine && (
                <div
                  data-testid={`mini-card-${option.id}`}
                  aria-hidden="true"
                  className={`duration-250 pointer-events-none absolute right-[180px] top-1/2 z-20 hidden h-[180px] w-[150px] -translate-y-1/2 overflow-hidden rounded-xl border border-[#E8DCC8] bg-white shadow-2xl transition-all lg:right-[220px] lg:block ${
                    isHovered || isFocused
                      ? "scale-100 opacity-100"
                      : "scale-95 opacity-0"
                  }`}
                >
                  <div
                    className="w-[340px] origin-top-left"
                    style={{ transform: "scale(0.44117)" }}
                  >
                    <DesignerCard
                      data={option.sampleData}
                      cardStyle={option.cardStyle}
                      palette={palette}
                      showActions={false}
                    />
                  </div>
                </div>
              )}

              {/* Right Column: Description + Radio Dot */}
              <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end md:w-[170px] lg:w-[200px]">
                <span
                  id={`desc-${option.id}`}
                  className={`text-xs font-medium leading-relaxed transition-colors ${
                    isSelected
                      ? "text-[#FBF6EE]/85"
                      : isHovered
                        ? "text-[#2B1B14]/85"
                        : "text-[#6B5848]"
                  }`}
                >
                  {option.description}
                </span>

                <span
                  className={`inline-flex h-3.5 w-3.5 shrink-0 rounded-full border transition-all ${
                    isSelected
                      ? "border-[#FBF6EE] bg-[#FBF6EE]"
                      : isHovered
                        ? "border-[#2B1B14] bg-transparent"
                        : "border-[#6B5848] bg-transparent group-hover:border-[#2B1B14]"
                  }`}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
