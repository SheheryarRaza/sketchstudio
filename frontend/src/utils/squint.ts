export const MIN_BLUR_RADIUS = 0;
export const DEFAULT_SQUINT_RADIUS = 8;
export const MAX_BLUR_RADIUS = 32;

/**
 * Clamps a blur radius in pixels into the valid range [MIN_BLUR_RADIUS, MAX_BLUR_RADIUS].
 * Handles NaN and rounds fractional values.
 */
export function clampBlurRadius(radius: number): number {
  if (Number.isNaN(radius)) return MIN_BLUR_RADIUS;
  const rounded = Math.round(radius);
  return Math.max(MIN_BLUR_RADIUS, Math.min(MAX_BLUR_RADIUS, rounded));
}

/**
 * Computes the CSS filter style for the canvas view based on squint blur radius.
 * Returns undefined when blur radius is 0 or less to avoid unnecessary style overhead.
 */
export function computeCanvasFilter(radius: number): string | undefined {
  const clamped = clampBlurRadius(radius);
  if (clamped <= 0) return undefined;
  return `blur(${clamped}px)`;
}

/**
 * Formats a blur radius for UI readout (e.g. '0px', '8px').
 */
export function formatBlurRadius(radius: number): string {
  const clamped = clampBlurRadius(radius);
  return `${clamped}px`;
}
