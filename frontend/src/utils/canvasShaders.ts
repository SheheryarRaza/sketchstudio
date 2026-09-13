import type { IsolationTarget, ValueFamilyFloors, ValueLayer } from '../types/studio';
import { createTonalPixel, decideTonalPixel, DEFAULT_VALUE_FAMILY_FLOORS, isolatedLayerIds } from './tonalDecision';

/**
 * Calculates perceived luminance using Rec. 709 HDTV ITU standard
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

let sharedOffscreenCanvas: HTMLCanvasElement | null = null;
let sharedCanvasDocument: Document | null = null;

/**
 * Reuses a single offscreen canvas across shader recomputes instead of allocating
 * a brand new temporary canvas DOM element on every slider drag tick.
 */
export function getSharedOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const currentDoc = typeof globalThis.document !== 'undefined' ? globalThis.document : null;
  if (!sharedOffscreenCanvas || sharedCanvasDocument !== currentDoc) {
    if (!currentDoc) {
      throw new Error('Document is not available for offscreen canvas allocation');
    }
    sharedOffscreenCanvas = currentDoc.createElement('canvas');
    sharedCanvasDocument = currentDoc;
  }
  if (sharedOffscreenCanvas.width !== width) {
    sharedOffscreenCanvas.width = width;
  }
  if (sharedOffscreenCanvas.height !== height) {
    sharedOffscreenCanvas.height = height;
  }
  return sharedOffscreenCanvas;
}

export function resetSharedOffscreenCanvas(): void {
  sharedOffscreenCanvas = null;
  sharedCanvasDocument = null;
}

/**
 * Pure per-pixel shader calculation: extracts luminance from input pixel buffer,
 * evaluates quantization / continuous gradient, isolates target layers, and writes
 * results to destination buffer. Can run on main thread or offload to a Web Worker.
 */
export function computeTonalPixels(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  layers: ValueLayer[],
  renderMode: 'valueStudy' | 'tonalMask',
  isolated: ReadonlySet<string> | string[],
  ghostOpacity: number,
  splitX: number,
  out?: Uint8ClampedArray,
): Uint8ClampedArray {
  const output = out || new Uint8ClampedArray(data.length);
  const decided = createTonalPixel();
  const isolatedSet = isolated instanceof Set ? isolated : new Set(isolated);

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const px = pixelIndex % width;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // If in split mode and to the left of split, keep original
    if (splitX >= 0 && px < splitX) {
      output[i] = r;
      output[i + 1] = g;
      output[i + 2] = b;
      output[i + 3] = a;
      continue;
    }

    const lum = getLuminance(r, g, b);

    decideTonalPixel(lum, a, layers, renderMode, isolatedSet, ghostOpacity, decided);
    output[i] = decided.r;
    output[i + 1] = decided.g;
    output[i + 2] = decided.b;
    output[i + 3] = decided.a;
  }

  return output;
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
  offscreenCanvas?: HTMLCanvasElement,
) {
  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to acquire destination canvas 2D rendering context');
  }

  const width = targetCanvas.width;
  const height = targetCanvas.height;

  // Re-use a single offscreen canvas across shader recomputes instead of allocating per call
  const tempCanvas = offscreenCanvas ?? getSharedOffscreenCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    throw new Error('Failed to acquire offscreen canvas 2D rendering context');
  }

  if (blurRadius > 0) {
    tempCtx.filter = `blur(${blurRadius}px)`;
  } else {
    tempCtx.filter = 'none';
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

  const isolated = isolatedLayerIds(layers, isolation, familyFloors);
  const renderMode = viewMode === 'tonalMask' ? 'tonalMask' : 'valueStudy';
  const splitX = splitRatio !== undefined ? Math.floor(width * splitRatio) : -1;

  computeTonalPixels(
    data,
    width,
    height,
    layers,
    renderMode,
    isolated,
    ghostOpacity,
    splitX,
    outputData.data,
  );

  ctx.putImageData(outputData, 0, 0);
}

