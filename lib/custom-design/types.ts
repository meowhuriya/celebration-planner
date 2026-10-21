import type { Guest } from "@/lib/seating";

export interface CustomDesignBox {
  x: number; // in px relative to base image width
  y: number; // in px relative to base image height
  width: number;
  height: number;
}

export type FontFamilyOption =
  | "serif"
  | "sans-serif"
  | "Playfair Display, serif"
  | "Cormorant Garamond, serif"
  | "Inter, sans-serif"
  | "Cinzel, serif";

export interface CustomDesignState {
  imageSrc: string; // Data URL of the downscaled, sanitized image
  imageWidth: number; // Width after downscaling (max 2000px)
  imageHeight: number; // Height after downscaling (max 2000px)
  originalFileName: string;
  nameBox: CustomDesignBox;
  qrBox: CustomDesignBox;
  nameFontFamily: FontFamilyOption;
  nameFontSize: number; // In px
  nameColor: string; // Hex color
  nameAlign: "left" | "center" | "right";
  namePill: boolean; // Optional pill background
  namePillColor: string; // e.g. "rgba(255, 255, 255, 0.88)"
  nameTemplate: string; // e.g. "Dear {name}"
  qrHasQuietZone: boolean; // White rounded padding for scanning (ON by default)
  updatedAt: number;
}

export interface ValidationSuccess {
  valid: true;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  buffer: ArrayBuffer;
}

export interface ValidationFailure {
  valid: false;
  error: string;
}

export type FileValidationResult = ValidationSuccess | ValidationFailure;

export interface ExportProgress {
  current: number;
  total: number;
  percentage: number;
  isComplete: boolean;
}

export interface RenderedGuestCard {
  guest: Guest;
  dataUrl: string;
}
