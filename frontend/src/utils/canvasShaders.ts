import type { IsolationTarget, ValueFamilyFloors, ValueLayer } from '../types/studio';
import { createTonalPixel, decideTonalPixel, DEFAULT_VALUE_FAMILY_FLOORS, isolatedLayerIds } from './tonalDecision';

/**
 * Calculates perceived luminance using Rec. 709 HDTV ITU standard
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Renders a decomposed Value Study onto a destination 2D Canvas context
 */
export function renderValueStudyOnCanvas(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  layers: ValueLayer[],
  viewMode: 'original' | 'valueStudy' | 'tonalMask',
  splitRatio?: number, // if split view (0 to 1)
  isolation: IsolationTarget = { kind: 'none' },
  ghostOpacity: number = 0.18,
  familyFloors: ValueFamilyFloors = DEFAULT_VALUE_FAMILY_FLOORS,
  blurRadius: number = 0,
) {
  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to acquire destination canvas 2D rendering context');
  }

  const width = targetCanvas.width;
  const height = targetCanvas.height;

  // Draw original image first to offscreen canvas to get raw pixel buffer
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    throw new Error('Failed to acquire offscreen canvas 2D rendering context');
  }

  if (blurRadius > 0) {
    tempCtx.filter = `blur(${blurRadius}px)`;
  }
  tempCtx.drawImage(sourceImage, 0, 0, width, height);

  if (viewMode === 'original') {
    ctx.drawImage(tempCanvas, 0, 0);
    return;
  }

  // Pure pixel shader: extract pixel buffer and decide each tonal pixel.
  // Failures (such as tainted canvas) are surfaced rather than fabricated with a fake CSS filter.
  const imgData = tempCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const outputData = ctx.createImageData(width, height);
  const out = outputData.data;

  const isolated = isolatedLayerIds(layers, isolation, familyFloors);
  const decided = createTonalPixel();
  const renderMode = viewMode === 'tonalMask' ? 'tonalMask' : 'valueStudy';

  const splitX = splitRatio !== undefined ? Math.floor(width * splitRatio) : -1;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const px = pixelIndex % width;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // If in split mode and to the left of split, keep original
    if (splitX >= 0 && px < splitX) {
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = a;
      continue;
    }

    const lum = getLuminance(r, g, b);

    decideTonalPixel(lum, a, layers, renderMode, isolated, ghostOpacity, decided);
    out[i] = decided.r;
    out[i + 1] = decided.g;
    out[i + 2] = decided.b;
    out[i + 3] = decided.a;
  }

  ctx.putImageData(outputData, 0, 0);
}
