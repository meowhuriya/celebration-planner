import type { StickerType } from "./types";
import { createSeededRandom } from "@/lib/hero-decoration";

export interface PathDescriptor {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface StickerRenderData {
  paths: PathDescriptor[];
  viewBox: { w: number; h: number };
}

/**
 * Standard vector definitions for the studio stickers.
 * Scaled cleanly to a 100x100 canonical viewBox.
 */
export const STICKER_CATALOG: Record<
  StickerType,
  (
    primaryColor?: string,
    secondaryColor?: string,
    seed?: number
  ) => StickerRenderData
> = {
  marigold: (primary = "#E07A1F", secondary = "#FFB300", seed = 42) => {
    const rng = createSeededRandom(seed);
    const paths: PathDescriptor[] = [];
    const cx = 50;
    const cy = 50;

    // Outer Petal Ring
    const outerCount = 12;
    for (let i = 0; i < outerCount; i++) {
      const angle = (i * 2 * Math.PI) / outerCount + (rng() - 0.5) * 0.1;
      const r = 36 + rng() * 4;
      const x1 = cx + Math.cos(angle - 0.25) * r;
      const y1 = cy + Math.sin(angle - 0.25) * r;
      const x2 = cx + Math.cos(angle + 0.25) * r;
      const y2 = cy + Math.sin(angle + 0.25) * r;
      const tipX = cx + Math.cos(angle) * (r + 8);
      const tipY = cy + Math.sin(angle) * (r + 8);

      paths.push({
        d: `M ${cx},${cy} L ${x1.toFixed(1)},${y1.toFixed(1)} Q ${tipX.toFixed(1)},${tipY.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} Z`,
        fill: primary,
        stroke: "#B25E15",
        strokeWidth: 0.8,
      });
    }

    // Inner Petal Ring
    const innerCount = 8;
    for (let i = 0; i < innerCount; i++) {
      const angle = (i * 2 * Math.PI) / innerCount + 0.2;
      const r = 24;
      const x1 = cx + Math.cos(angle - 0.3) * r;
      const y1 = cy + Math.sin(angle - 0.3) * r;
      const x2 = cx + Math.cos(angle + 0.3) * r;
      const y2 = cy + Math.sin(angle + 0.3) * r;
      const tipX = cx + Math.cos(angle) * (r + 6);
      const tipY = cy + Math.sin(angle) * (r + 6);

      paths.push({
        d: `M ${cx},${cy} L ${x1.toFixed(1)},${y1.toFixed(1)} Q ${tipX.toFixed(1)},${tipY.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} Z`,
        fill: secondary,
        stroke: primary,
        strokeWidth: 0.6,
      });
    }

    // Core
    paths.push({
      d: `M ${cx - 7},${cy} a 7,7 0 1,0 14,0 a 7,7 0 1,0 -14,0`,
      fill: "#C9A24B",
      stroke: "#8A6920",
      strokeWidth: 1,
    });

    return { paths, viewBox: { w: 100, h: 100 } };
  },

  jasmine: (primary = "#FFFDF8", secondary = "#C9A24B") => {
    const paths: PathDescriptor[] = [];
    const cx = 50;
    const cy = 50;
    const count = 5;

    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
      const tipR = 40;
      const sideR = 18;
      const tipX = cx + Math.cos(angle) * tipR;
      const tipY = cy + Math.sin(angle) * tipR;
      const leftX = cx + Math.cos(angle - 0.45) * sideR;
      const leftY = cy + Math.sin(angle - 0.45) * sideR;
      const rightX = cx + Math.cos(angle + 0.45) * sideR;
      const rightY = cy + Math.sin(angle + 0.45) * sideR;

      paths.push({
        d: `M ${cx},${cy} Q ${leftX.toFixed(1)},${leftY.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} Q ${rightX.toFixed(1)},${rightY.toFixed(1)} ${cx},${cy} Z`,
        fill: primary,
        stroke: "#E8DCC8",
        strokeWidth: 1.2,
      });
    }

    // Golden pistil center
    paths.push({
      d: `M ${cx - 6},${cy} a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0`,
      fill: secondary,
    });

    return { paths, viewBox: { w: 100, h: 100 } };
  },

  rose: (primary = "#C2185B", secondary = "#E91E63") => {
    return {
      paths: [
        {
          d: "M 50,20 C 35,20 20,32 20,50 C 20,68 35,80 50,80 C 65,80 80,68 80,50 C 80,32 65,20 50,20 Z",
          fill: primary,
        },
        {
          d: "M 50,28 C 38,28 28,38 28,50 C 28,62 38,72 50,72 C 62,72 72,62 72,50",
          stroke: secondary,
          strokeWidth: 3,
        },
        {
          d: "M 50,36 C 42,36 36,42 36,50 C 36,58 42,64 50,64 C 58,64 64,58 64,50",
          stroke: "#FAF9F6",
          strokeWidth: 2,
        },
      ],
      viewBox: { w: 100, h: 100 },
    };
  },

  diya: (primary = "#C9A24B", secondary = "#FFB300") => {
    return {
      paths: [
        // Clay bowl
        {
          d: "M 15,65 C 15,85 85,85 85,65 C 80,60 20,60 15,65 Z",
          fill: primary,
          stroke: "#5B1A2B",
          strokeWidth: 1.5,
        },
        // Rim
        {
          d: "M 12,65 Q 50,61 88,65 Q 50,69 12,65 Z",
          fill: "#D4AF37",
        },
        // Flame
        {
          d: "M 50,60 C 38,48 50,20 50,15 C 50,20 62,48 50,60 Z",
          fill: secondary,
        },
        // Inner core of flame
        {
          d: "M 50,56 C 44,48 50,30 50,26 C 50,30 56,48 50,56 Z",
          fill: "#FFFDF8",
        },
      ],
      viewBox: { w: 100, h: 100 },
    };
  },

  lantern: (primary = "#E65100", secondary = "#C9A24B") => {
    return {
      paths: [
        // Hanging line
        { d: "M 50,5 L 50,20", stroke: secondary, strokeWidth: 2 },
        // Top cap
        { d: "M 35,20 L 65,20 L 58,26 L 42,26 Z", fill: secondary },
        // Lantern body
        {
          d: "M 40,26 L 60,26 L 70,55 L 50,75 L 30,55 Z",
          fill: primary,
          stroke: secondary,
          strokeWidth: 1.5,
        },
        // Ribs
        { d: "M 50,26 L 50,75", stroke: secondary, strokeWidth: 1 },
        { d: "M 30,55 L 70,55", stroke: secondary, strokeWidth: 1 },
        // Bottom tassel
        { d: "M 50,75 L 50,95", stroke: secondary, strokeWidth: 2 },
      ],
      viewBox: { w: 100, h: 100 },
    };
  },

  balloon: (primary = "#E91E63", secondary = "#C9A24B") => {
    return {
      paths: [
        // Balloon egg shape
        {
          d: "M 50,15 C 25,15 25,60 46,68 L 44,72 L 56,72 L 54,68 C 75,60 75,15 50,15 Z",
          fill: primary,
          stroke: "#FAF9F6",
          strokeWidth: 1.2,
        },
        // Highlight reflection
        {
          d: "M 36,25 C 33,33 33,45 37,52",
          stroke: "#FFFFFF",
          strokeWidth: 2.5,
        },
        // String
        {
          d: "M 50,72 Q 45,82 52,90 Q 48,96 50,100",
          stroke: secondary,
          strokeWidth: 1.2,
        },
      ],
      viewBox: { w: 100, h: 100 },
    };
  },

  confetti: (primary = "#E07A1F", secondary = "#C2185B") => {
    return {
      paths: [
        {
          d: "M 20,20 L 30,15 L 25,32 Z",
          fill: primary,
        },
        {
          d: "M 70,25 L 85,28 L 78,40 Z",
          fill: secondary,
        },
        {
          d: "M 45,70 L 60,65 L 55,80 Z",
          fill: "#C9A24B",
        },
        {
          d: "M 25,75 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0",
          fill: "#34D399",
        },
        {
          d: "M 75,70 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0",
          fill: "#60A5FA",
        },
        {
          d: "M 48,15 L 52,22 L 48,29 L 44,22 Z",
          fill: "#C9A24B",
        },
      ],
      viewBox: { w: 100, h: 100 },
    };
  },

  mandala: (primary = "#C9A24B", secondary = "#5B1A2B") => {
    const cx = 50;
    const cy = 50;
    const paths: PathDescriptor[] = [
      {
        d: `M ${cx - 45},${cy} a 45,45 0 1,0 90,0 a 45,45 0 1,0 -90,0`,
        stroke: primary,
        strokeWidth: 1.2,
      },
      {
        d: `M ${cx - 35},${cy} a 35,35 0 1,0 70,0 a 35,35 0 1,0 -70,0`,
        stroke: primary,
        strokeWidth: 0.8,
      },
      {
        d: `M ${cx - 20},${cy} a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0`,
        stroke: secondary,
        strokeWidth: 1,
      },
    ];

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x1 = cx + Math.cos(angle) * 20;
      const y1 = cy + Math.sin(angle) * 20;
      const x2 = cx + Math.cos(angle) * 45;
      const y2 = cy + Math.sin(angle) * 45;
      paths.push({
        d: `M ${x1},${y1} L ${x2},${y2}`,
        stroke: primary,
        strokeWidth: 0.8,
      });
    }

    return { paths, viewBox: { w: 100, h: 100 } };
  },

  paisley: (primary = "#C9A24B", secondary = "#5B1A2B") => {
    return {
      paths: [
        {
          d: "M 20,20 C 40,10 70,15 75,40 C 80,65 60,80 40,80 C 20,80 15,60 25,45 C 32,35 50,35 48,25 C 46,18 35,22 20,20 Z",
          fill: primary,
          stroke: secondary,
          strokeWidth: 1.5,
        },
        {
          d: "M 32,48 C 30,55 35,62 42,62 C 48,62 55,56 52,48 C 50,42 42,42 38,44",
          stroke: "#FFFDF8",
          strokeWidth: 1.5,
        },
      ],
      viewBox: { w: 100, h: 100 },
    };
  },

  frame: (primary = "#C9A24B") => {
    return {
      paths: [
        {
          d: "M 5,5 L 95,5 L 95,95 L 5,95 Z",
          stroke: primary,
          strokeWidth: 2,
        },
        {
          d: "M 10,10 L 90,10 L 90,90 L 10,90 Z",
          stroke: primary,
          strokeWidth: 0.8,
        },
        { d: "M 5,5 L 15,15", stroke: primary, strokeWidth: 1.5 },
        { d: "M 95,5 L 85,15", stroke: primary, strokeWidth: 1.5 },
        { d: "M 95,95 L 85,85", stroke: primary, strokeWidth: 1.5 },
        { d: "M 5,95 L 15,85", stroke: primary, strokeWidth: 1.5 },
      ],
      viewBox: { w: 100, h: 100 },
    };
  },
};
