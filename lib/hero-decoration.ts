import type { EventPalette } from "./schemas";

export type HeroDecorationType =
  "wedding" | "birthday" | "community" | "diwali" | "other";

export interface HeroDecorationConfig {
  type: HeroDecorationType;
  title: string;
  hasGarland: boolean;
  hasMandala: boolean;
  hasDiyas: boolean;
  hasLantern: boolean;
  hasBunting: boolean;
  hasBalloons: boolean;
  burstType: "sparkler" | "confetti";
  particleStyle: "petals" | "confetti";
  petalsCount: number;
  paletteColors: [string, string, string, string];
  primaryColor: string;
  secondaryColor: string;
}

/**
 * Normalizes input event type and cultural tradition to determine decoration set.
 */
export function resolveDecorationType(
  eventType?: string,
  cultureOrTradition?: string,
  vibeOrTheme?: string
): HeroDecorationType {
  const normType = (eventType || "").toLowerCase().trim();
  const text = `${cultureOrTradition || ""} ${vibeOrTheme || ""}`.toLowerCase();

  // Check for Diwali / Deepavali / Festival of lights
  if (
    text.includes("diwali") ||
    text.includes("deepavali") ||
    text.includes("festival of light") ||
    text.includes("diya")
  ) {
    return "diwali";
  }

  if (normType === "wedding") {
    return "wedding";
  }

  if (normType === "birthday") {
    return "birthday";
  }

  if (normType === "community") {
    return "community";
  }

  return "other";
}

/**
 * Pure function returning event-aware hero decoration specification.
 */
export function getHeroDecoration(
  eventType?: string,
  cultureOrTradition?: string,
  vibeOrTheme?: string,
  palette?: EventPalette | null
): HeroDecorationConfig {
  const resolvedType = resolveDecorationType(
    eventType,
    cultureOrTradition,
    vibeOrTheme
  );

  // Warm theme default color fallbacks per decoration theme
  const defaultColors: Record<
    HeroDecorationType,
    [string, string, string, string]
  > = {
    wedding: ["#E07A1F", "#5B1A2B", "#C9A24B", "#2E5D4B"], // Saffron, Maroon, Gold, Henna Green
    diwali: ["#E07A1F", "#C9A24B", "#EA580C", "#5B1A2B"], // Saffron, Gold, Flame Orange, Deep Maroon
    community: ["#E07A1F", "#C9A24B", "#5B1A2B", "#2E5D4B"], // Saffron, Gold, Maroon, Green
    birthday: ["#E25B7B", "#8B5CF6", "#E07A1F", "#06B6D4"], // Rose, Violet, Saffron, Cyan
    other: ["#C9A24B", "#5B1A2B", "#E07A1F", "#6B5848"], // Gold, Maroon, Saffron, Espresso
  };

  const paletteColors: [string, string, string, string] =
    palette && palette.colors && palette.colors.length === 4
      ? [
          palette.colors[0],
          palette.colors[1],
          palette.colors[2],
          palette.colors[3],
        ]
      : defaultColors[resolvedType];

  const primaryColor = paletteColors[0];
  const secondaryColor = paletteColors[1];

  switch (resolvedType) {
    case "wedding":
      return {
        type: "wedding",
        title: "Marigold & Jasmine Garland with Sacred Mandala",
        hasGarland: true,
        hasMandala: true,
        hasDiyas: false,
        hasLantern: false,
        hasBunting: false,
        hasBalloons: false,
        burstType: "sparkler",
        particleStyle: "petals",
        petalsCount: 8,
        paletteColors,
        primaryColor,
        secondaryColor,
      };

    case "diwali":
    case "community":
      return {
        type: resolvedType,
        title:
          resolvedType === "diwali"
            ? "Festive Diyas and Paper Lantern (Kandil)"
            : "Community Lanterns and Festive Diyas",
        hasGarland: false,
        hasMandala: false,
        hasDiyas: true,
        hasLantern: true,
        hasBunting: false,
        hasBalloons: false,
        burstType: resolvedType === "diwali" ? "sparkler" : "confetti",
        particleStyle: "confetti",
        petalsCount: 8,
        paletteColors,
        primaryColor,
        secondaryColor,
      };

    case "birthday":
      return {
        type: "birthday",
        title: "Festive Bunting and Balloon Strings",
        hasGarland: false,
        hasMandala: false,
        hasDiyas: false,
        hasLantern: false,
        hasBunting: true,
        hasBalloons: true,
        burstType: "confetti",
        particleStyle: "confetti",
        petalsCount: 8,
        paletteColors,
        primaryColor,
        secondaryColor,
      };

    case "other":
    default:
      return {
        type: "other",
        title: "Celebratory Pennant Bunting",
        hasGarland: false,
        hasMandala: false,
        hasDiyas: false,
        hasLantern: false,
        hasBunting: true,
        hasBalloons: false,
        burstType: "confetti",
        particleStyle: "confetti",
        petalsCount: 8,
        paletteColors,
        primaryColor,
        secondaryColor,
      };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROCEDURAL FLORAL ENGINE (Pure, Deterministic, Mathematical SVG Generation)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * 32-bit Mulberry32 seeded pseudorandom number generator.
 * Guarantees identical output across SSR, Node, and browser environments.
 */
export function createSeededRandom(seed: number = 42): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ProceduralPetal {
  path: string;
  transform: string;
  fill: string;
  stroke: string;
}

export interface ProceduralMarigold {
  cx: number;
  cy: number;
  radius: number;
  rings: Array<{
    ringIndex: number;
    petals: ProceduralPetal[];
  }>;
  center: {
    cx: number;
    cy: number;
    r: number;
    fill: string;
    stamenR: number;
    stamenFill: string;
  };
}

export interface ProceduralRose {
  cx: number;
  cy: number;
  radius: number;
  petals: Array<{
    path: string;
    fill: string;
    stroke: string;
  }>;
  center: {
    cx: number;
    cy: number;
    r: number;
    fill: string;
  };
}

export interface ProceduralJasmine {
  cx: number;
  cy: number;
  radius: number;
  petals: Array<{
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rot: number;
    fill: string;
    stroke: string;
  }>;
  center: {
    cx: number;
    cy: number;
    r: number;
    fill: string;
  };
}

export interface ProceduralLeaf {
  path: string;
  vein: string;
  transform: string;
  fill: string;
  stroke: string;
}

export interface ProceduralPaisley {
  path: string;
  innerPath: string;
  transform: string;
  fill: string;
  stroke: string;
}

/**
 * Procedural Marigold: 3 concentric rings of 12 to 16 ruffled petals with slight color variation.
 * Uses 2-tone fills and thin gold outlines.
 */
export function generateMarigold(
  cx: number,
  cy: number,
  radius: number,
  colors: {
    outer?: string;
    mid?: string;
    inner?: string;
    gold?: string;
  } = {},
  seed: number = 42
): ProceduralMarigold {
  const rng = createSeededRandom(seed);
  const outerColor = colors.outer || "#E07A1F"; // Warm Saffron
  const midColor = colors.mid || "#F59E0B"; // Warm Marigold
  const innerColor = colors.inner || "#FFD54F"; // Luminous Gold
  const goldStroke = colors.gold || "#C9A24B";

  // 3 rings: outer 16 petals, middle 14 petals, inner 12 petals
  const ringDefs = [
    {
      count: 16,
      distFactor: 0.58,
      petalW: 0.44,
      petalH: 0.54,
      color: outerColor,
    },
    {
      count: 14,
      distFactor: 0.38,
      petalW: 0.36,
      petalH: 0.44,
      color: midColor,
    },
    {
      count: 12,
      distFactor: 0.18,
      petalW: 0.28,
      petalH: 0.34,
      color: innerColor,
    },
  ];

  const rings = ringDefs.map((def, ringIdx) => {
    const petals: ProceduralPetal[] = [];
    const step = (Math.PI * 2) / def.count;
    const baseOffset = ringIdx * (step / 2);

    for (let i = 0; i < def.count; i++) {
      const angle = baseOffset + i * step + (rng() - 0.5) * 0.08;
      const dist = radius * def.distFactor * (0.95 + rng() * 0.1);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const pw = radius * def.petalW * (0.9 + rng() * 0.2);
      const ph = radius * def.petalH * (0.9 + rng() * 0.2);

      const rotDeg = (angle * 180) / Math.PI + 90;

      // Scalloped ruffled petal path
      const path = `M 0,0 C -${(pw * 0.55).toFixed(1)},-${(ph * 0.35).toFixed(1)} -${(pw * 0.45).toFixed(1)},-${(ph * 0.85).toFixed(1)} 0,-${ph.toFixed(1)} C ${(pw * 0.45).toFixed(1)},-${(ph * 0.85).toFixed(1)} ${(pw * 0.55).toFixed(1)},-${(ph * 0.35).toFixed(1)} 0,0 Z`;

      petals.push({
        path,
        transform: `translate(${px.toFixed(1)}, ${py.toFixed(1)}) rotate(${rotDeg.toFixed(1)})`,
        fill: def.color,
        stroke: goldStroke,
      });
    }

    return { ringIndex: ringIdx, petals };
  });

  return {
    cx,
    cy,
    radius,
    rings,
    center: {
      cx,
      cy,
      r: radius * 0.16,
      fill: "#B45309",
      stamenR: radius * 0.08,
      stamenFill: "#78350F",
    },
  };
}

/**
 * Procedural Rose: Concentric spiral of curved petals from center outward.
 */
export function generateRose(
  cx: number,
  cy: number,
  radius: number,
  baseColor: string = "#5B1A2B", // Deep Maroon
  seed: number = 101
): ProceduralRose {
  const rng = createSeededRandom(seed);
  const petals: Array<{ path: string; fill: string; stroke: string }> = [];

  // 4 Concentric layers from outside inward
  const layers = [
    {
      count: 6,
      r: radius * 0.88,
      spanDeg: 84,
      fill: baseColor,
      stroke: "#3A0F1C",
    },
    {
      count: 5,
      r: radius * 0.66,
      spanDeg: 78,
      fill: "#7B2239",
      stroke: "#5B1A2B",
    },
    {
      count: 4,
      r: radius * 0.44,
      spanDeg: 72,
      fill: "#9B2C47",
      stroke: "#7B2239",
    },
    {
      count: 3,
      r: radius * 0.25,
      spanDeg: 92,
      fill: "#B83A58",
      stroke: "#9B2C47",
    },
  ];

  layers.forEach((layer, layerIdx) => {
    const step = (Math.PI * 2) / layer.count;
    const offset = layerIdx * 0.6;

    for (let i = 0; i < layer.count; i++) {
      const angle = offset + i * step + (rng() - 0.5) * 0.09;
      const arcR = layer.r * (0.95 + rng() * 0.1);
      const halfSpan = (layer.spanDeg * Math.PI) / 360;

      const a1 = angle - halfSpan;
      const a2 = angle + halfSpan;

      const x1 = cx + Math.cos(a1) * arcR;
      const y1 = cy + Math.sin(a1) * arcR;
      const x2 = cx + Math.cos(a2) * arcR;
      const y2 = cy + Math.sin(a2) * arcR;

      // Outer bulge control point
      const cpx = cx + Math.cos(angle) * (arcR * 1.3);
      const cpy = cy + Math.sin(angle) * (arcR * 1.3);

      // Inner cup curve control point
      const inCpx = cx + Math.cos(angle) * (arcR * 0.55);
      const inCpy = cy + Math.sin(angle) * (arcR * 0.55);

      const path = `M ${x1.toFixed(1)},${y1.toFixed(1)} Q ${cpx.toFixed(1)},${cpy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} Q ${inCpx.toFixed(1)},${inCpy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} Z`;

      petals.push({
        path,
        fill: layer.fill,
        stroke: layer.stroke,
      });
    }
  });

  return {
    cx,
    cy,
    radius,
    petals,
    center: {
      cx,
      cy,
      r: radius * 0.12,
      fill: "#C9A24B",
    },
  };
}

/**
 * Procedural Jasmine: Small 5-petal white flower with a gold centre.
 */
export function generateJasmine(
  cx: number,
  cy: number,
  radius: number = 10,
  centerColor: string = "#C9A24B",
  seed: number = 77
): ProceduralJasmine {
  const rng = createSeededRandom(seed);
  const petals: Array<{
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rot: number;
    fill: string;
    stroke: string;
  }> = [];

  const count = 5;
  for (let i = 0; i < count; i++) {
    const rot = (i * 360) / count + (rng() - 0.5) * 4;
    petals.push({
      cx,
      cy: cy - radius * 0.5,
      rx: radius * 0.34,
      ry: radius * 0.58,
      rot,
      fill: "#FFFDF8",
      stroke: "#E8DCC8",
    });
  }

  return {
    cx,
    cy,
    radius,
    petals,
    center: {
      cx,
      cy,
      r: radius * 0.24,
      fill: centerColor,
    },
  };
}

/**
 * Procedural Mango/Peepal Leaf with center vein.
 */
export function generateLeaf(
  x: number,
  y: number,
  length: number,
  angleDeg: number,
  color: string = "#2E5D4B"
): ProceduralLeaf {
  const w = length * 0.42;
  return {
    path: `M 0,0 C -${(w * 0.8).toFixed(1)},-${(length * 0.35).toFixed(1)} -${(w * 0.55).toFixed(1)},-${(length * 0.8).toFixed(1)} 0,-${length.toFixed(1)} C ${(w * 0.55).toFixed(1)},-${(length * 0.8).toFixed(1)} ${(w * 0.8).toFixed(1)},-${(length * 0.35).toFixed(1)} 0,0 Z`,
    vein: `M 0,0 L 0,-${(length * 0.85).toFixed(1)}`,
    transform: `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${angleDeg.toFixed(1)})`,
    fill: color,
    stroke: "#1C3D31",
  };
}

/**
 * Procedural Paisley motif (mango / boteh) with decorative interior curve.
 */
export function generatePaisley(
  x: number,
  y: number,
  scale: number,
  rotDeg: number,
  color: string = "#C9A24B"
): ProceduralPaisley {
  return {
    path: `M 0,0 C -12,-16 -22,-32 -14,-48 C -6,-64 16,-68 24,-56 C 32,-44 28,-32 20,-24 C 12,-16 8,-8 0,0 Z`,
    innerPath: `M 0,-4 C -8,-14 -14,-28 -8,-40 C -2,-52 12,-56 18,-46 C 24,-36 20,-28 14,-20 Z`,
    transform: `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${rotDeg.toFixed(1)}) scale(${scale.toFixed(2)})`,
    fill: color,
    stroke: "#A07E30",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO SCENE COMPOSITION (Deterministic, Rich Layered SVG Scene)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface HeroSceneData {
  type: HeroDecorationType;
  width: number;
  height: number;
  marigolds: ProceduralMarigold[];
  roses: ProceduralRose[];
  jasmines: ProceduralJasmine[];
  leaves: ProceduralLeaf[];
  paisleys: ProceduralPaisley[];
  toranPoints: Array<{ x: number; y: number; isMarigold: boolean; id: number }>;
  diyas: Array<{ x: number; y: number; id: number }>;
}

/**
 * Builds the complete procedural scene for the hero empty area.
 * Completely deterministic and hydration safe.
 */
export function generateHeroScene(
  eventType?: string,
  cultureOrTradition?: string,
  vibeOrTheme?: string,
  palette?: EventPalette | null,
  seed: number = 42
): HeroSceneData {
  const resolved = resolveDecorationType(
    eventType,
    cultureOrTradition,
    vibeOrTheme
  );
  const colors = palette?.colors || [
    "#E07A1F",
    "#5B1A2B",
    "#C9A24B",
    "#2E5D4B",
  ];
  const width = 640;
  const height = 360;

  // Toran hanging garland points across the top (x: 20 to 620, y: 15 to 65)
  const toranPoints: Array<{
    x: number;
    y: number;
    isMarigold: boolean;
    id: number;
  }> = [];
  const flowerCount = 14;
  for (let i = 0; i < flowerCount; i++) {
    const t = (i + 0.5) / flowerCount;
    // Parabolic hanging swag
    const x = 20 + t * 600;
    const y = 20 + Math.sin(t * Math.PI) * 45;
    toranPoints.push({ x, y, isMarigold: i % 2 === 0, id: i });
  }

  // Bouquet cluster rising from bottom-left (x: 20-220, y: 220-340)
  const marigolds: ProceduralMarigold[] = [
    generateMarigold(
      65,
      300,
      32,
      { outer: colors[0], mid: "#F59E0B", inner: "#FFD54F", gold: "#C9A24B" },
      seed + 1
    ),
    generateMarigold(
      135,
      275,
      28,
      { outer: "#F59E0B", mid: colors[0], inner: "#FFD54F", gold: "#C9A24B" },
      seed + 2
    ),
    generateMarigold(
      90,
      240,
      26,
      { outer: colors[0], mid: "#F59E0B", inner: "#FFE082", gold: "#C9A24B" },
      seed + 3
    ),
    generateMarigold(
      180,
      305,
      24,
      { outer: "#F59E0B", mid: colors[0], inner: "#FFD54F", gold: "#C9A24B" },
      seed + 4
    ),
  ];

  const roses: ProceduralRose[] = [
    generateRose(120, 315, 26, colors[1] || "#5B1A2B", seed + 5),
    generateRose(40, 255, 22, "#7B2239", seed + 6),
    generateRose(160, 250, 20, colors[1] || "#5B1A2B", seed + 7),
  ];

  const jasmines: ProceduralJasmine[] = [
    generateJasmine(95, 200, 11, colors[2] || "#C9A24B", seed + 8),
    generateJasmine(150, 220, 10, colors[2] || "#C9A24B", seed + 9),
    generateJasmine(35, 315, 11, colors[2] || "#C9A24B", seed + 10),
    generateJasmine(195, 280, 10, colors[2] || "#C9A24B", seed + 11),
    generateJasmine(70, 345, 9, colors[2] || "#C9A24B", seed + 12),
    generateJasmine(220, 320, 10, colors[2] || "#C9A24B", seed + 13),
  ];

  const leaves: ProceduralLeaf[] = [
    generateLeaf(50, 290, 42, -45, "#2E5D4B"),
    generateLeaf(110, 260, 48, -25, "#2E5D4B"),
    generateLeaf(150, 290, 44, 35, "#3D7A64"),
    generateLeaf(80, 220, 38, -60, "#2E5D4B"),
    generateLeaf(175, 240, 40, 50, "#3D7A64"),
    generateLeaf(30, 270, 36, -80, "#2E5D4B"),
    generateLeaf(200, 310, 36, 65, "#3D7A64"),
  ];

  const paisleys: ProceduralPaisley[] = [
    generatePaisley(155, 190, 0.45, 25, colors[2] || "#C9A24B"),
    generatePaisley(210, 245, 0.4, 55, colors[0] || "#E07A1F"),
  ];

  // 4 Terracotta lit diyas along the bottom perimeter
  const diyas = [
    { x: 30, y: 345, id: 1 },
    { x: 105, y: 350, id: 2 },
    { x: 175, y: 345, id: 3 },
    { x: 245, y: 348, id: 4 },
  ];

  return {
    type: resolved,
    width,
    height,
    marigolds,
    roses,
    jasmines,
    leaves,
    paisleys,
    toranPoints,
    diyas,
  };
}
