import type { PaperMappingConfig } from '../types/studio';

/**
 * Image pixels per physical millimetre, derived solely from the declared Paper
 * Mapping (paper size + how the Reference Image fills it) — never from screen
 * DPI or zoom, per ADR-0008. Returns 0 when no mapping is declared yet.
 */
export function imagePxPerMm(
  paperMapping: PaperMappingConfig,
  imageWidth: number,
  imageHeight: number,
): number {
  if (!paperMapping.isDeclared || imageWidth <= 0 || imageHeight <= 0) return 0;

  const { paperWidthMm, paperHeightMm, fillMode } = paperMapping;
  if (paperWidthMm <= 0 || paperHeightMm <= 0) return 0;

  const widthRatio = imageWidth / paperWidthMm;
  const heightRatio = imageHeight / paperHeightMm;

  switch (fillMode) {
    case 'fillWidth':
      return widthRatio;
    case 'fillHeight':
      return heightRatio;
    case 'fitWithin':
      return Math.min(widthRatio, heightRatio);
  }
}

export function mmToImagePx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm;
}

/**
 * CSS scale factor that renders the Reference Image at literal physical size on
 * this screen: the image's real-world size comes from the Paper Mapping, and how
 * many screen pixels that occupies comes from Physical Caliper's screenDpi. Null
 * when either precondition is missing.
 */
export function computeTrueSizeScale(
  paperMapping: PaperMappingConfig,
  screenDpi: number,
  imageWidth: number,
  imageHeight: number,
): number | null {
  const pxPerMm = imagePxPerMm(paperMapping, imageWidth, imageHeight);
  if (!pxPerMm) return null;

  const screenPxPerMm = screenDpi / 25.4;
  return screenPxPerMm / pxPerMm;
}
