"use client";

import { memo } from "react";

function VenuePatternsComponent() {
  return (
    <defs>
      {/* 1. Base Meter Grid (1.0m major, 0.25m minor) */}
      <pattern
        id="meter-grid-minor"
        width="0.25"
        height="0.25"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 0.25 0 L 0 0 0 0.25"
          fill="none"
          stroke="#E2E2E2"
          strokeWidth="0.02"
        />
      </pattern>

      <pattern
        id="meter-grid-major"
        width="1.0"
        height="1.0"
        patternUnits="userSpaceOnUse"
      >
        <rect width="1.0" height="1.0" fill="url(#meter-grid-minor)" />
        <path
          d="M 1.0 0 L 0 0 0 1.0"
          fill="none"
          stroke="#CCCCCC"
          strokeWidth="0.04"
        />
      </pattern>

      {/* 2. Banquet Hall: Polished Marble Texture */}
      <pattern
        id="venue-pattern-banquet-hall"
        width="4"
        height="4"
        patternUnits="userSpaceOnUse"
      >
        <rect width="4" height="4" fill="#F8F8F6" />
        <path
          d="M 0 1 Q 1 0.5 2 1.5 T 4 1"
          fill="none"
          stroke="#EAEAEA"
          strokeWidth="0.06"
        />
        <path
          d="M 1 4 Q 2.5 3 3 2 T 4 3.5"
          fill="none"
          stroke="#EDEDEB"
          strokeWidth="0.04"
        />
        <rect
          width="4"
          height="4"
          fill="url(#meter-grid-major)"
          opacity="0.4"
        />
      </pattern>

      {/* 3. Garden: Natural Lawn Stipple */}
      <pattern
        id="venue-pattern-garden"
        width="3"
        height="3"
        patternUnits="userSpaceOnUse"
      >
        <rect width="3" height="3" fill="#EEF5EB" />
        <circle cx="0.6" cy="0.6" r="0.06" fill="#BED9B8" />
        <circle cx="1.8" cy="1.2" r="0.07" fill="#BED9B8" />
        <circle cx="2.4" cy="2.5" r="0.05" fill="#BED9B8" />
        <circle cx="1.0" cy="2.2" r="0.06" fill="#BED9B8" />
        <rect
          width="3"
          height="3"
          fill="url(#meter-grid-major)"
          opacity="0.35"
        />
      </pattern>

      {/* 4. Courtyard: Paved Terracotta Stone Tiles */}
      <pattern
        id="venue-pattern-courtyard"
        width="2"
        height="2"
        patternUnits="userSpaceOnUse"
      >
        <rect width="2" height="2" fill="#F7F1EB" />
        <path
          d="M 0 1 L 2 1 M 1 0 L 1 2"
          fill="none"
          stroke="#DFD3C7"
          strokeWidth="0.05"
        />
        <rect
          width="2"
          height="2"
          fill="url(#meter-grid-major)"
          opacity="0.35"
        />
      </pattern>

      {/* 5. Rooftop: Wood Decking Planks */}
      <pattern
        id="venue-pattern-rooftop"
        width="1"
        height="4"
        patternUnits="userSpaceOnUse"
      >
        <rect width="1" height="4" fill="#F0EBE3" />
        <line x1="0" y1="1" x2="1" y2="1" stroke="#D8CFC3" strokeWidth="0.05" />
        <line x1="0" y1="2" x2="1" y2="2" stroke="#D8CFC3" strokeWidth="0.05" />
        <line x1="0" y1="3" x2="1" y2="3" stroke="#D8CFC3" strokeWidth="0.05" />
        <rect
          width="1"
          height="4"
          fill="url(#meter-grid-major)"
          opacity="0.35"
        />
      </pattern>

      {/* 6. Community Hall: Parquet Wooden Flooring */}
      <pattern
        id="venue-pattern-community-hall"
        width="2"
        height="2"
        patternUnits="userSpaceOnUse"
      >
        <rect width="2" height="2" fill="#F5EEE4" />
        <path
          d="M 0 0 L 1 1 M 1 1 L 2 0 M 0 2 L 1 1 M 1 1 L 2 2"
          fill="none"
          stroke="#DFD2C0"
          strokeWidth="0.04"
        />
        <rect
          width="2"
          height="2"
          fill="url(#meter-grid-major)"
          opacity="0.35"
        />
      </pattern>
    </defs>
  );
}

export const VenuePatterns = memo(VenuePatternsComponent);
