import type { HistogramStats, ValueLayer, ValueLayerMeta } from '../types/studio';

const MIN_GAP = 1;

/**
 * Evenly spaced default Cut Points for `count` Tonal Layers, ordered to match
 * the brightest-to-darkest layer order (index 0 is the boundary nearest 255).
 */
export function generateDefaultCutPoints(count: number): number[] {
  const stepSize = 255 / count;
  const cutPoints: number[] = [];
  for (let i = 1; i < count; i++) {
    cutPoints.push(Math.round(255 - i * stepSize));
  }
  return cutPoints;
}

/**
 * Cut Points seeded from this photo's measured luminance percentiles, replacing
 * the fixed 85/170 floors every photo used to share. The measured 10th/90th
 * percentile become the outermost Cut Points (this photo's black and white
 * points); any remaining Cut Points are spaced evenly between them, in the
 * same brightest-to-darkest order generateDefaultCutPoints uses.
 */
export function generateCutPointsFromHistogram(count: number, histogram: HistogramStats): number[] {
  const lightFloor = Math.round(histogram.highlightThreshold);
  const halftoneFloor = Math.round(histogram.deepDarkThreshold);
  const innerCount = count - 3;
  const step = (lightFloor - halftoneFloor) / (innerCount + 1);

  const cutPoints = [lightFloor];
  for (let i = 1; i <= innerCount; i++) {
    cutPoints.push(Math.round(lightFloor - i * step));
  }
  cutPoints.push(halftoneFloor);

  return enforceDescendingGap(cutPoints);
}

/**
 * Clamps a candidate Cut Points array to the same invariant moveCutPoint
 * enforces one point at a time: strictly descending, at least MIN_GAP apart,
 * within [0, 255]. A photo whose measured percentiles sit close together
 * (e.g. a flat, low-contrast reference image) would otherwise produce
 * colliding or out-of-range points.
 */
function enforceDescendingGap(cutPoints: number[]): number[] {
  const clamped = cutPoints.map(v => Math.max(0, Math.min(255, v)));
  for (let i = 1; i < clamped.length; i++) {
    clamped[i] = Math.min(clamped[i], clamped[i - 1] - MIN_GAP);
  }
  for (let i = clamped.length - 2; i >= 0; i--) {
    clamped[i] = Math.max(clamped[i], clamped[i + 1] + MIN_GAP);
  }
  return clamped.map(v => Math.max(0, Math.min(255, v)));
}

/**
 * Derives each Tonal Layer's min/max threshold and swatch color from the
 * shared Cut Points. This is the only place threshold ranges are computed, so
 * an overlapping or gapped Tonal Layer can't be constructed independently of it.
 */
export function buildValueLayers(meta: ValueLayerMeta[], cutPoints: number[]): ValueLayer[] {
  return meta.map((layerMeta, i) => {
    const maxThreshold = i === 0 ? 255 : cutPoints[i - 1];
    const minThreshold = i === meta.length - 1 ? 0 : cutPoints[i];
    const grayVal = Math.round((minThreshold + maxThreshold) / 2);

    return {
      ...layerMeta,
      minThreshold,
      maxThreshold,
      color: `rgb(${grayVal}, ${grayVal}, ${grayVal})`,
    };
  });
}

/**
 * Moves one Cut Point, clamped so it can never cross its neighboring Cut
 * Points (or 0/255 at the ends). This is what makes it structurally
 * impossible to drag a Tonal Layer's boundary into an overlap or a gap.
 */
export function moveCutPoint(cutPoints: number[], index: number, value: number): number[] {
  const lowerBound = index === cutPoints.length - 1 ? 0 : cutPoints[index + 1] + MIN_GAP;
  const upperBound = index === 0 ? 255 : cutPoints[index - 1] - MIN_GAP;
  const clamped = Math.min(upperBound, Math.max(lowerBound, value));

  const next = [...cutPoints];
  next[index] = clamped;
  return next;
}
