/**
 * Pure functions and configuration for the 3D Twisting Ribbon.
 *
 * Implements a diagonal sine-wave arrangement of tall capsule panels
 * twisting in 3D perspective space (perspective 1200px).
 */

export type RibbonMotif =
  "diya" | "ring" | "balloon" | "flower" | "confetti" | "cake";

export interface RibbonPanelConfig {
  id: number;
  x: number;
  y: number;
  z: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  opacity: number;
  transform: string;
}

export interface RibbonOptions {
  count?: number; // default 20
  containerWidth?: number; // default 1000
  containerHeight?: number; // default 220
  rotation?: number; // continuous rotation in degrees, default 0
  parallaxX?: number; // cursor parallax offset -1 to 1, default 0
  parallaxY?: number; // cursor parallax offset -1 to 1, default 0
  waveFrequency?: number; // default 1.25
  waveAmplitude?: number; // default 26
  depthAmplitude?: number; // default 85
  twistDegrees?: number; // total helical twist along the ribbon, default 480
}

/**
 * Pure function that calculates position (x, y, z) and 3D rotations (rotateX, rotateY, rotateZ)
 * for each capsule panel along a diagonal sine wave.
 *
 * - x: spans left to right across the container width
 * - y: slopes diagonally from top-left to bottom-right plus a sinusoidal wave
 * - z: undulates along the depth axis (cosine wave) for 3D realism
 * - rotateY: twists incrementally along the ribbon + continuous rotation + parallax
 * - rotateX: tilts with wave tangent and cursor pitch
 * - rotateZ: banks into curve bends
 */
export function computeRibbonPanels(
  options: RibbonOptions = {}
): RibbonPanelConfig[] {
  const count = options.count ?? 20;
  const width = options.containerWidth ?? 1000;
  const rotation = options.rotation ?? 0;
  const parallaxX = options.parallaxX ?? 0;
  const parallaxY = options.parallaxY ?? 0;
  const waveFreq = options.waveFrequency ?? 1.25;
  const waveAmp = options.waveAmplitude ?? 26;
  const depthAmp = options.depthAmplitude ?? 85;
  const twistDeg = options.twistDegrees ?? 480;

  const panels: RibbonPanelConfig[] = [];
  const spanX = Math.max(300, width * 0.92);
  const startX = -spanX / 2;
  const stepX = count > 1 ? spanX / (count - 1) : 0;

  // Diagonal slope: top-left (negative Y in centered coords) to bottom-right (positive Y)
  const diagonalDrop = 46;

  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5; // 0 to 1
    const x = Math.round(startX + i * stepX);

    // Diagonal base line: goes from -diagonalDrop/2 to +diagonalDrop/2
    const diagonalY = (t - 0.5) * diagonalDrop;

    // Sine wave oscillation
    const phase = t * Math.PI * 2 * waveFreq;
    const sineY = Math.sin(phase) * waveAmp;
    const y = Math.round(diagonalY + sineY);

    // 3D Depth (Z) along cosine curve
    const z = Math.round(Math.cos(phase) * depthAmp);

    // Helical twist around Y axis:
    // Base twist increments along the ribbon + continuous rotation + parallax yaw
    const baseTwistY = t * twistDeg;
    // Normalize to [-180, 180] or standard degrees
    const rawRotY = (baseTwistY + rotation + parallaxX * 16) % 360;
    const rotY = Math.round(rawRotY > 180 ? rawRotY - 360 : rawRotY);

    // Pitch around X: sine wave tangent + parallax pitch
    const rotX = Math.round(Math.sin(phase) * 8 + parallaxY * 12);

    // Banking around Z: aligns with sine wave slope and diagonal slant
    const rotZ = Math.round(Math.cos(phase) * 10 - 4);

    // Perspective depth cues: scale and opacity
    // Container perspective is 1200px: scale = 1 + z / 1200
    const scale = Number((1 + z / 1200).toFixed(3));
    // When z is negative (further away), opacity is slightly lower (~0.85), when closer, 1.0
    const normalizedDepth = (z + depthAmp) / (2 * depthAmp || 1);
    const clampedDepth = Math.max(0, Math.min(1, normalizedDepth));
    const opacity = Number((0.85 + clampedDepth * 0.15).toFixed(2));

    const transform = `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`;

    panels.push({
      id: i,
      x,
      y,
      z,
      rotateX: rotX,
      rotateY: rotY,
      rotateZ: rotZ,
      scale,
      opacity,
      transform,
    });
  }

  return panels;
}

/**
 * Maps event type, tradition, and theme to an appropriate SVG motif.
 * No remote images; pure inline vectors.
 */
export function getEventMotif(
  eventType?: string,
  cultureOrTradition?: string,
  vibeOrTheme?: string
): RibbonMotif {
  const combined =
    `${eventType || ""} ${cultureOrTradition || ""} ${vibeOrTheme || ""}`.toLowerCase();

  // 1. Cultural & traditional specific motifs
  if (
    combined.includes("diwali") ||
    combined.includes("deepavali") ||
    combined.includes("pooja") ||
    combined.includes("puja") ||
    combined.includes("aarti")
  ) {
    return "diya";
  }

  if (
    combined.includes("haldi") ||
    combined.includes("mehndi") ||
    combined.includes("mehendi") ||
    combined.includes("henna") ||
    combined.includes("floral") ||
    combined.includes("garden")
  ) {
    return "flower";
  }

  if (
    combined.includes("wedding") ||
    combined.includes("nikah") ||
    combined.includes("shaadi") ||
    combined.includes("engagement") ||
    combined.includes("anniversary")
  ) {
    return "ring";
  }

  if (combined.includes("birthday")) {
    if (
      combined.includes("balloon") ||
      combined.includes("kids") ||
      combined.includes("fun")
    ) {
      return "balloon";
    }
    return "cake";
  }

  if (
    combined.includes("balloon") ||
    combined.includes("baby shower") ||
    combined.includes("carnival")
  ) {
    return "balloon";
  }

  // 2. Event type fallbacks
  if (eventType === "wedding") return "ring";
  if (eventType === "birthday") return "cake";
  if (eventType === "community") return "confetti";

  return "confetti";
}

/**
 * Warm editorial gradients: Saffron to Marigold, Rose to Maroon, Cream to Gold.
 */
export const WARM_RIBBON_GRADIENTS = [
  "linear-gradient(150deg, #E07A1F 0%, #F59E0B 50%, #FFB300 100%)", // Saffron to Marigold
  "linear-gradient(150deg, #E25B7B 0%, #9B2C47 50%, #5B1A2B 100%)", // Rose to Maroon
  "linear-gradient(150deg, #FFFDF8 0%, #F6E6C2 50%, #C9A24B 100%)", // Cream to Gold
  "linear-gradient(150deg, #E07A1F 0%, #C2561A 50%, #5B1A2B 100%)", // Saffron to Maroon
];

/**
 * Generates soft, luminous gradients for each capsule panel.
 * When a plan exists (with custom palette), uses the event palette colors.
 * Otherwise uses the warm theme gradients (saffron to marigold, rose to maroon, cream to gold).
 */
export function getRibbonGradients(
  palette?: { colors: string[] } | null,
  count = 16
): string[] {
  // If a plan's custom palette is active, use it
  if (palette?.colors && palette.colors.length >= 4) {
    const colors = palette.colors;
    const gradients: string[] = [];
    for (let i = 0; i < count; i++) {
      const c1 = colors[i % colors.length];
      const c2 = colors[(i + 1) % colors.length];
      const c3 = colors[(i + 2) % colors.length];
      gradients.push(
        `linear-gradient(150deg, ${c1}f2 0%, ${c2}d9 55%, ${c3}cc 100%)`
      );
    }
    return gradients;
  }

  // Default warm gradients (saffron to marigold, rose to maroon, cream to gold)
  const gradients: string[] = [];
  for (let i = 0; i < count; i++) {
    gradients.push(WARM_RIBBON_GRADIENTS[i % WARM_RIBBON_GRADIENTS.length]);
  }
  return gradients;
}
