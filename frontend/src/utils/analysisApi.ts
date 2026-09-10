import type { RenderSize } from './renderScale';
import type { HistogramStats, LandmarkStats, LoomisAnchorPoints, ReillyAnchorPoints } from '../types/studio';

/**
 * Re-draws the source image at the given (display-capped) size and encodes it as PNG.
 * Analysis calls post this instead of the original — see ADR-0004.
 */
export async function toDisplayCappedBlob(
  image: HTMLImageElement | HTMLCanvasElement,
  size: RenderSize,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(image, 0, 0, size.width, size.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode Reference Image for analysis'));
    }, 'image/png');
  });
}

/**
 * Posts the display-capped Reference Image to the edge-extraction endpoint and
 * returns the resulting contour PNG.
 */
export async function fetchEdgeContours(
  image: HTMLImageElement | HTMLCanvasElement,
  size: RenderSize,
): Promise<Blob> {
  const capped = await toDisplayCappedBlob(image, size);

  const form = new FormData();
  form.append('file', capped, 'reference.png');

  let res: Response;
  try {
    res = await fetch('/api/cv/edges', { method: 'POST', body: form });
  } catch {
    throw new Error('Could not reach the analysis backend');
  }

  if (!res.ok) {
    throw new Error(`Contour extraction failed (${res.status})`);
  }

  return res.blob();
}

/**
 * Posts the display-capped Reference Image to the luminance-histogram endpoint and
 * returns the authoritative histogram and percentile thresholds measured from it.
 */
export async function fetchHistogram(
  image: HTMLImageElement | HTMLCanvasElement,
  size: RenderSize,
): Promise<HistogramStats> {
  const capped = await toDisplayCappedBlob(image, size);

  const form = new FormData();
  form.append('file', capped, 'reference.png');

  let res: Response;
  try {
    res = await fetch('/api/cv/histogram', { method: 'POST', body: form });
  } catch {
    throw new Error('Could not reach the analysis backend');
  }

  if (!res.ok) {
    throw new Error(`Histogram analysis failed (${res.status})`);
  }

  return res.json();
}

/**
 * Posts the display-capped Reference Image to the Landmark Auto-Snap endpoint and
 * returns the detected (or declared-fallback) Loomis/Reilly anchor positions, still
 * in the capped-image pixel space they were measured in — see scaleLandmarksToImageSpace.
 */
export async function fetchLandmarks(
  image: HTMLImageElement | HTMLCanvasElement,
  size: RenderSize,
): Promise<LandmarkStats> {
  const capped = await toDisplayCappedBlob(image, size);

  const form = new FormData();
  form.append('file', capped, 'reference.png');

  let res: Response;
  try {
    res = await fetch('/api/cv/landmarks', { method: 'POST', body: form });
  } catch {
    throw new Error('Could not reach the analysis backend');
  }

  if (!res.ok) {
    throw new Error(`Landmark Auto-Snap failed (${res.status})`);
  }

  return res.json();
}

const scalePoint = (point: { x: number; y: number }, scale: number) => ({
  x: point.x / scale,
  y: point.y / scale,
});

/**
 * Rescales Landmark Auto-Snap anchors from the capped-image space they were detected in
 * onto the native Reference Image pixel space that DrawingMethodState is stored in.
 */
export function scaleLandmarksToImageSpace(
  data: LandmarkStats,
  size: RenderSize,
): { loomis: LoomisAnchorPoints; reilly: ReillyAnchorPoints } {
  const { loomis, reilly } = data;

  return {
    loomis: {
      ...loomis,
      center: scalePoint(loomis.center, size.scale),
      radius: loomis.radius / size.scale,
      browLineY: loomis.browLineY / size.scale,
      noseLineY: loomis.noseLineY / size.scale,
      chinY: loomis.chinY / size.scale,
      jawWidth: loomis.jawWidth / size.scale,
    },
    reilly: {
      browCenter: scalePoint(reilly.browCenter, size.scale),
      noseTip: scalePoint(reilly.noseTip, size.scale),
      mouthCenter: scalePoint(reilly.mouthCenter, size.scale),
      chinBottom: scalePoint(reilly.chinBottom, size.scale),
      leftEye: scalePoint(reilly.leftEye, size.scale),
      rightEye: scalePoint(reilly.rightEye, size.scale),
      leftJaw: scalePoint(reilly.leftJaw, size.scale),
      rightJaw: scalePoint(reilly.rightJaw, size.scale),
      leftTemple: scalePoint(reilly.leftTemple, size.scale),
      rightTemple: scalePoint(reilly.rightTemple, size.scale),
    },
  };
}
