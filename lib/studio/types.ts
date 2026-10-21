import type { EventPalette, EventInput } from "@/lib/schemas";

export type SizePreset = "whatsapp" | "story" | "square" | "a5";

export interface PresetDimensions {
  width: number;
  height: number;
  label: string;
  aspectRatio: string;
}

export const SIZE_PRESETS: Record<SizePreset, PresetDimensions> = {
  whatsapp: {
    width: 1080,
    height: 1350,
    label: "WhatsApp (4:5)",
    aspectRatio: "4 / 5",
  },
  story: {
    width: 1080,
    height: 1920,
    label: "Story (9:16)",
    aspectRatio: "9 / 16",
  },
  square: {
    width: 1080,
    height: 1080,
    label: "Square (1:1)",
    aspectRatio: "1 / 1",
  },
  a5: {
    width: 1748,
    height: 2480,
    label: "A5 Print (148×210mm)",
    aspectRatio: "1748 / 2480",
  },
};

export type BackgroundPatternType =
  "none" | "rangoli-dots" | "damask" | "confetti" | "stripes";

export interface BackgroundConfig {
  type: "solid" | "gradient" | "pattern";
  color?: string; // hex
  gradient?: {
    from: string;
    to: string;
    direction: "vertical" | "horizontal" | "radial";
  };
  pattern?: BackgroundPatternType;
  patternColor?: string;
  patternScale?: number;
}

export type StudioElementType = "text" | "shape" | "sticker" | "token";

export interface BaseElement {
  id: string;
  type: StudioElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees 0-360
  opacity: number; // 0-1
  locked: boolean;
  name?: string;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string; // max 300 chars
  fontFamily: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number; // px or em
  lineHeight: number; // multiplier e.g. 1.2
  bold?: boolean;
  italic?: boolean;
}

export type ShapeType = "rectangle" | "circle" | "arch" | "line";

export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeType: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number; // corner radius for rectangle
}

export type StickerType =
  | "marigold"
  | "jasmine"
  | "rose"
  | "diya"
  | "lantern"
  | "balloon"
  | "confetti"
  | "mandala"
  | "paisley"
  | "frame";

export interface StickerElement extends BaseElement {
  type: "sticker";
  stickerType: StickerType;
  color?: string;
  secondaryColor?: string;
  seed?: number;
}

export type TokenType =
  "hostNames" | "eventTitle" | "date" | "city" | "venue" | "guestName" | "qr";

export interface TokenElement extends BaseElement {
  type: "token";
  tokenType: TokenType;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  bold?: boolean;
  italic?: boolean;
  qrPadding?: number; // quiet zone padding in px
}

export type StudioElement =
  TextElement | ShapeElement | StickerElement | TokenElement;

export interface Design {
  version: 1;
  id: string;
  name: string;
  sizePreset: SizePreset;
  width: number;
  height: number;
  background: BackgroundConfig;
  elements: StudioElement[]; // maximum 60 elements
  updatedAt?: string;
}

export interface TokenContext {
  hostNames?: string;
  eventTitle?: string;
  date?: string;
  city?: string;
  venue?: string;
  guestName?: string;
  guestId?: string;
  qrDataUrl?: string;
  palette?: EventPalette;
  eventInput?: EventInput;
}

export interface GuideLines {
  x?: number;
  y?: number;
}

export interface StudioState {
  current: Design;
  past: Design[]; // capped at 50
  future: Design[];
  selectedElementId: string | null;
  zoom: number; // 0.2 to 2.0
  guideLines: GuideLines | null;
  announcement: string;
}
