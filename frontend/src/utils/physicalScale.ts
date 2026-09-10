import type { PaperPreset } from '../types/studio';

export const STANDARD_CREDIT_CARD_WIDTH_MM = 85.60;
export const STANDARD_CREDIT_CARD_HEIGHT_MM = 53.98;

export interface PaperDimension {
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export const PAPER_PRESETS: Record<PaperPreset, PaperDimension> = {
  'A5': { name: 'A5', widthMm: 148, heightMm: 210, description: '148 × 210 mm (Small Sketchbook)' },
  'A4': { name: 'A4', widthMm: 210, heightMm: 297, description: '210 × 297 mm (Standard Atelier Sheet)' },
  'A3': { name: 'A3', widthMm: 297, heightMm: 420, description: '297 × 420 mm (Large Portrait Pad)' },
  'A2': { name: 'A2', widthMm: 420, heightMm: 594, description: '420 × 594 mm (Full Poster Size)' },
  'Letter': { name: 'US Letter', widthMm: 215.9, heightMm: 279.4, description: '8.5 × 11 in (US Standard)' },
  '8x10': { name: '8 × 10 in', widthMm: 203.2, heightMm: 254.0, description: '203 × 254 mm (Classic Portrait Frame)' },
  '9x12': { name: '9 × 12 in', widthMm: 228.6, heightMm: 304.8, description: '228 × 305 mm (Popular Sketch Pad)' },
  '11x14': { name: '11 × 14 in', widthMm: 279.4, heightMm: 355.6, description: '279 × 356 mm (Medium Canvas)' },
  'Custom': { name: 'Custom Size', widthMm: 210, heightMm: 297, description: 'Custom physical dimensions' },
};

/**
 * Calculate Screen DPI from an on-screen pixel measurement of an 85.60mm credit card width
 */
export function calculateDpiFromCardPixels(cardPixelWidth: number): { dpi: number; pixelsPerMm: number } {
  const mm = STANDARD_CREDIT_CARD_WIDTH_MM;
  const pixelsPerMm = cardPixelWidth / mm;
  const dpi = pixelsPerMm * 25.4;
  return {
    dpi: Math.round(dpi * 10) / 10,
    pixelsPerMm: Math.round(pixelsPerMm * 100) / 100,
  };
}

/**
 * Calculate Screen DPI from an on-screen pixel measurement of a known physical ruler length
 */
export function calculateDpiFromRulerPixels(rulerPixelLength: number, physicalLengthMm: number): { dpi: number; pixelsPerMm: number } {
  const pixelsPerMm = rulerPixelLength / Math.max(1, physicalLengthMm);
  const dpi = pixelsPerMm * 25.4;
  return {
    dpi: Math.round(dpi * 10) / 10,
    pixelsPerMm: Math.round(pixelsPerMm * 100) / 100,
  };
}

/**
 * Convert pixels to millimeters given DPI
 */
export function pxToMm(pixels: number, dpi: number = 96): number {
  return (pixels / dpi) * 25.4;
}

/**
 * Convert millimeters to on-screen pixels given DPI
 */
export function mmToPx(mm: number, dpi: number = 96): number {
  return (mm / 25.4) * dpi;
}

/**
 * Convert millimeters to inches
 */
export function mmToInches(mm: number): number {
  return mm / 25.4;
}
