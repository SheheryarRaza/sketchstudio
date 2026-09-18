import type { RenderSize } from './renderScale';
import type { HistogramStats, LandmarkStats, LoomisAnchorPoints, ReillyAnchorPoints } from '../types/studio';
import type { LightDirectionResult } from '../types/lightDirection';

export const IMAGE_TOO_LARGE_ERROR_MESSAGE = 'Image is too large for analysis. Please resize and retry.';

/**
 * Throws an actionable error on non-ok HTTP responses, distinguishing
 * 413 Payload Too Large from generic status codes.
 */
export function handleAnalysisResponseError(status: number, defaultMessage: string): never {
  if (status === 413) {
    throw new Error(IMAGE_TOO_LARGE_ERROR_MESSAGE);
  }
  throw new Error(`${defaultMessage} (${status})`);
}

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
    handleAnalysisResponseError(res.status, 'Contour extraction failed');
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
    handleAnalysisResponseError(res.status, 'Histogram analysis failed');
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
    handleAnalysisResponseError(res.status, 'Landmark Auto-Snap failed');
  }

  return res.json();
}

import type { AnchorPoint, DeclaredSource } from '../types/studio';

const scalePointWithSource = (
  point: { x: number; y: number; source?: DeclaredSource },
  scale: number,
): AnchorPoint => ({
  x: point.x / scale,
  y: point.y / scale,
  source: point.source ?? 'fallback',
});

const getScalarVal = (val: { value: number } | number): number =>
  typeof val === 'object' && val !== null ? val.value : val;

const getScalarSource = (val: { source: DeclaredSource } | number, fallback: DeclaredSource): DeclaredSource =>
  typeof val === 'object' && val !== null ? val.source : fallback;

/**
 * Rescales Landmark Auto-Snap anchors from the capped-image space they were detected in
 * onto the native Reference Image pixel space that DrawingMethodState is stored in,
 * preserving each anchor's Declared Source.
 */
export function scaleLandmarksToImageSpace(
  data: LandmarkStats,
  size: RenderSize,
): { loomis: LoomisAnchorPoints; reilly: ReillyAnchorPoints } {
  const { loomis, reilly } = data;

  const radiusVal = getScalarVal(loomis.radius);
  const radiusSource = getScalarSource(loomis.radius, 'estimated');

  const browVal = getScalarVal(loomis.browLineY);
  const browSource = getScalarSource(loomis.browLineY, 'detected');

  const noseVal = getScalarVal(loomis.noseLineY);
  const noseSource = getScalarSource(loomis.noseLineY, 'detected');

  const chinVal = getScalarVal(loomis.chinY);
  const chinSource = getScalarSource(loomis.chinY, 'detected');

  const jawVal = getScalarVal(loomis.jawWidth);
  const jawSource = getScalarSource(loomis.jawWidth, 'detected');

  const tiltVal = typeof loomis.tiltAngle === 'object' && loomis.tiltAngle !== null
    ? (loomis.tiltAngle as any).value
    : (loomis.tiltAngle ?? 0);

  const centerPoint = scalePointWithSource(loomis.center, size.scale);

  return {
    loomis: {
      center: centerPoint,
      radius: radiusVal / size.scale,
      browLineY: browVal / size.scale,
      noseLineY: noseVal / size.scale,
      chinY: chinVal / size.scale,
      jawWidth: jawVal / size.scale,
      tiltAngle: tiltVal,
      radiusSource,
      browSource,
      noseSource,
      chinSource,
      jawSource,
      sources: {
        center: centerPoint.source,
        radius: radiusSource,
        browLineY: browSource,
        noseLineY: noseSource,
        chinY: chinSource,
        jawWidth: jawSource,
      },
    },
    reilly: {
      browCenter: scalePointWithSource(reilly.browCenter, size.scale),
      noseTip: scalePointWithSource(reilly.noseTip, size.scale),
      mouthCenter: scalePointWithSource(reilly.mouthCenter, size.scale),
      chinBottom: scalePointWithSource(reilly.chinBottom, size.scale),
      leftEye: scalePointWithSource(reilly.leftEye, size.scale),
      rightEye: scalePointWithSource(reilly.rightEye, size.scale),
      leftJaw: scalePointWithSource(reilly.leftJaw, size.scale),
      rightJaw: scalePointWithSource(reilly.rightJaw, size.scale),
      leftTemple: scalePointWithSource(reilly.leftTemple, size.scale),
      rightTemple: scalePointWithSource(reilly.rightTemple, size.scale),
    },
  };
}

import type { EdgeQualitySegment } from '../types/edgeQuality';

/**
 * Posts the display-capped Reference Image to the edge suggestion endpoint and
 * returns detected contour polylines for edge quality classification.
 */
export async function fetchSuggestedEdges(
  image: HTMLImageElement | HTMLCanvasElement,
  size: RenderSize,
): Promise<EdgeQualitySegment[]> {
  const capped = await toDisplayCappedBlob(image, size);

  const form = new FormData();
  form.append('file', capped, 'reference.png');

  let res: Response;
  try {
    res = await fetch('/api/cv/suggest-edges', { method: 'POST', body: form });
  } catch {
    throw new Error('Could not reach the analysis backend');
  }

  if (!res.ok) {
    handleAnalysisResponseError(res.status, 'Edge suggestion failed');
  }

  return res.json();
}

/**
 * Rescales suggested edge segments from capped-image space onto native Reference Image pixel space.
 */
export function scaleEdgeSegmentsToImageSpace(
  segments: EdgeQualitySegment[],
  size: RenderSize,
): EdgeQualitySegment[] {
  const scale = size.scale;
  return segments.map((seg) => ({
    ...seg,
    source: seg.source || 'detected',
    points: seg.points.map((pt) => ({
      ...pt,
      x: Math.round(pt.x / scale),
      y: Math.round(pt.y / scale),
    })),
  }));
}

/**
 * Generates initial candidate anatomical edge contours (jawline, cheekbone, chin shadow)
 * anchored by detected landmarks or proportional fallback coordinates.
 */
export function generateFallbackEdgeSegments(
  imageWidth: number,
  imageHeight: number,
  landmarks?: LandmarkStats,
): EdgeQualitySegment[] {
  const w = imageWidth || 600;
  const h = imageHeight || 800;

  if (landmarks && landmarks.reilly) {
    const { leftJaw, rightJaw, chinBottom, leftTemple, rightTemple, noseTip } = landmarks.reilly;
    const midJawX = Math.round((leftJaw.x + chinBottom.x) / 2);
    const midJawY = Math.round((leftJaw.y + chinBottom.y) / 2);

    return [
      {
        id: `fallback-edge-jaw-${Date.now()}-1`,
        quality: 'hard',
        label: 'Jaw contour (hard)',
        source: 'fallback',
        points: [
          { id: 'fb-j1', x: leftJaw.x, y: leftJaw.y },
          { id: 'fb-j2', x: midJawX, y: midJawY },
          { id: 'fb-j3', x: chinBottom.x, y: chinBottom.y },
          { id: 'fb-j4', x: Math.round((rightJaw.x + chinBottom.x) / 2), y: Math.round((rightJaw.y + chinBottom.y) / 2) },
          { id: 'fb-j5', x: rightJaw.x, y: rightJaw.y },
        ],
      },
      {
        id: `fallback-edge-cheek-${Date.now()}-2`,
        quality: 'soft',
        label: 'Cheekbone turn (soft)',
        source: 'fallback',
        points: [
          { id: 'fb-c1', x: leftTemple.x, y: leftTemple.y },
          { id: 'fb-c2', x: Math.round(leftTemple.x + (leftJaw.x - leftTemple.x) * 0.5), y: Math.round((leftTemple.y + leftJaw.y) * 0.5) },
          { id: 'fb-c3', x: Math.round((leftJaw.x + noseTip.x) / 2), y: Math.round((leftJaw.y + noseTip.y) / 2) },
        ],
      },
      {
        id: `fallback-edge-chinshadow-${Date.now()}-3`,
        quality: 'hard',
        label: 'Sub-mandibular cast shadow (hard)',
        source: 'fallback',
        points: [
          { id: 'fb-s1', x: Math.round(chinBottom.x - (rightJaw.x - leftJaw.x) * 0.25), y: Math.round(chinBottom.y + 25) },
          { id: 'fb-s2', x: chinBottom.x, y: Math.round(chinBottom.y + 35) },
          { id: 'fb-s3', x: Math.round(chinBottom.x + (rightJaw.x - leftJaw.x) * 0.25), y: Math.round(chinBottom.y + 25) },
        ],
      },
      {
        id: `fallback-edge-temple-${Date.now()}-4`,
        quality: 'lost',
        label: 'Hairline & temple merge (lost)',
        source: 'fallback',
        points: [
          { id: 'fb-t1', x: rightTemple.x, y: rightTemple.y },
          { id: 'fb-t2', x: Math.round(rightTemple.x + 30), y: Math.round(rightTemple.y - 40) },
          { id: 'fb-t3', x: Math.round(rightTemple.x + 10), y: Math.round(rightTemple.y - 80) },
        ],
      },
    ];
  }

  // Proportional default fallback
  const cx = Math.round(w * 0.5);
  const cy = Math.round(h * 0.45);
  const r = Math.round(Math.min(w, h) * 0.28);

  return [
    {
      id: `fallback-edge-jaw-${Date.now()}-1`,
      quality: 'hard',
      label: 'Jaw contour (hard)',
      source: 'fallback',
      points: [
        { id: 'fb-j1', x: cx - Math.round(r * 0.7), y: cy + Math.round(r * 0.7) },
        { id: 'fb-j2', x: cx - Math.round(r * 0.4), y: cy + Math.round(r * 1.1) },
        { id: 'fb-j3', x: cx, y: cy + Math.round(r * 1.25) },
        { id: 'fb-j4', x: cx + Math.round(r * 0.4), y: cy + Math.round(r * 1.1) },
        { id: 'fb-j5', x: cx + Math.round(r * 0.7), y: cy + Math.round(r * 0.7) },
      ],
    },
    {
      id: `fallback-edge-cheek-${Date.now()}-2`,
      quality: 'soft',
      label: 'Cheekbone turn (soft)',
      source: 'fallback',
      points: [
        { id: 'fb-c1', x: cx - Math.round(r * 0.75), y: cy - Math.round(r * 0.4) },
        { id: 'fb-c2', x: cx - Math.round(r * 0.5), y: cy + Math.round(r * 0.2) },
        { id: 'fb-c3', x: cx - Math.round(r * 0.2), y: cy + Math.round(r * 0.5) },
      ],
    },
    {
      id: `fallback-edge-chinshadow-${Date.now()}-3`,
      quality: 'hard',
      label: 'Cast shadow (hard)',
      source: 'fallback',
      points: [
        { id: 'fb-s1', x: cx - Math.round(r * 0.35), y: cy + Math.round(r * 1.35) },
        { id: 'fb-s2', x: cx, y: cy + Math.round(r * 1.45) },
        { id: 'fb-s3', x: cx + Math.round(r * 0.35), y: cy + Math.round(r * 1.35) },
      ],
    },
    {
      id: `fallback-edge-temple-${Date.now()}-4`,
      quality: 'lost',
      label: 'Hairline merge (lost)',
      source: 'fallback',
      points: [
        { id: 'fb-t1', x: cx + Math.round(r * 0.75), y: cy - Math.round(r * 0.4) },
        { id: 'fb-t2', x: cx + Math.round(r * 0.8), y: cy - Math.round(r * 0.7) },
        { id: 'fb-t3', x: cx + Math.round(r * 0.6), y: cy - Math.round(r * 0.9) },
      ],
    },
  ];
}

/**
 * Rescales light direction terminator line and centroids from display-capped space to native image space.
 */
export function scaleLightDirectionToImageSpace(
  result: LightDirectionResult,
  size: RenderSize,
  nativeWidth: number,
  nativeHeight: number,
): LightDirectionResult {
  const scaleX = nativeWidth / size.width;
  const scaleY = nativeHeight / size.height;

  return {
    ...result,
    terminatorLine: {
      p1: {
        x: Math.round(result.terminatorLine.p1.x * scaleX * 10) / 10,
        y: Math.round(result.terminatorLine.p1.y * scaleY * 10) / 10,
      },
      p2: {
        x: Math.round(result.terminatorLine.p2.x * scaleX * 10) / 10,
        y: Math.round(result.terminatorLine.p2.y * scaleY * 10) / 10,
      },
    },
    shadowCentroid: result.shadowCentroid
      ? {
          x: Math.round(result.shadowCentroid.x * scaleX * 10) / 10,
          y: Math.round(result.shadowCentroid.y * scaleY * 10) / 10,
        }
      : undefined,
    litCentroid: result.litCentroid
      ? {
          x: Math.round(result.litCentroid.x * scaleX * 10) / 10,
          y: Math.round(result.litCentroid.y * scaleY * 10) / 10,
        }
      : undefined,
  };
}

/**
 * Posts the display-capped Reference Image to the light-direction endpoint
 * and returns the estimated light direction and terminator line.
 */
export async function fetchLightDirection(
  image: HTMLImageElement | HTMLCanvasElement,
  size: RenderSize,
  shadowThreshold?: number,
): Promise<LightDirectionResult> {
  const capped = await toDisplayCappedBlob(image, size);

  const form = new FormData();
  form.append('file', capped, 'reference.png');

  let res: Response;
  try {
    const url = shadowThreshold !== undefined
      ? `/api/cv/light-direction?shadow_threshold=${shadowThreshold}`
      : '/api/cv/light-direction';
    res = await fetch(url, { method: 'POST', body: form });
  } catch {
    throw new Error('Could not reach the analysis backend');
  }

  if (!res.ok) {
    handleAnalysisResponseError(res.status, 'Light direction analysis failed');
  }

  return res.json() as Promise<LightDirectionResult>;
}


