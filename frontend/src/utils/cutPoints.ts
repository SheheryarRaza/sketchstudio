import type { ValueLayer, ValueLayerMeta } from '../types/studio';

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
