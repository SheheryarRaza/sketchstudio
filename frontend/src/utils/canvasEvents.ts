/**
 * Studio canvas gesture and event handling utilities.
 * Handles unified pointer events (mouse, touch, pen) and zoom factor calculations.
 */

export interface Point {
  x: number;
  y: number;
}

export type PointerInputType = 'mouse' | 'touch' | 'pen' | (string & {});

export const MIN_CANVAS_SCALE = 0.08;
export const MAX_CANVAS_SCALE = 8.0;
export const ZOOM_IN_FACTOR = 1.12;
export const ZOOM_OUT_FACTOR = 0.88;

/**
 * Calculates the next zoom scale from a wheel deltaY value, clamping
 * between minScale and maxScale.
 */
export function calculateZoomScale(
  currentScale: number,
  deltaY: number,
  minScale = MIN_CANVAS_SCALE,
  maxScale = MAX_CANVAS_SCALE
): number {
  if (deltaY === 0) {
    return currentScale;
  }
  const factor = deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
  const nextScale = currentScale * factor;
  return Math.min(maxScale, Math.max(minScale, Number(nextScale.toFixed(4))));
}

export interface ShouldStartPanParams {
  button: number;
  pointerType?: PointerInputType;
  hasModifierKey?: boolean;
  targetTagName?: string;
  isInteractiveTarget?: boolean;
}

/**
 * Determines whether an incoming pointerdown event should initiate viewport panning.
 *
 * Supports unified pointer interactions across touch, pen, and mouse:
 * - Rejects non-primary buttons (button !== 0).
 * - Rejects clicks/taps on interactive controls (buttons, inputs, labels, overlay handles, sliders).
 * - Accepts primary touches/clicks on the canvas or surrounding background workspace.
 */
export function shouldStartPan(params: ShouldStartPanParams): boolean {
  if (params.button !== 0) {
    return false;
  }

  if (params.isInteractiveTarget) {
    return false;
  }

  return true;
}

/**
 * Computes the 2D subtraction between two coordinate points (a - b).
 */
export function subtractPoints(a: Point, b: Point): Point {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

/**
 * Computes the initial pan anchor position relative to the client click/touch point.
 */
export function computeInitialPan(currentPan: Point, clientPoint: Point): Point {
  return subtractPoints(clientPoint, currentPan);
}

/**
 * Computes the updated pan translation from the anchor position and new client coordinates.
 */
export function computePanPoint(startPan: Point, clientPoint: Point): Point {
  return subtractPoints(clientPoint, startPan);
}

/**
 * Attaches a non-passive wheel event listener to the canvas container element
 * so that e.preventDefault() takes effect and browser-level zoom/scroll is prevented.
 * Returns a cleanup function that removes the listener.
 */
export function registerNonPassiveWheelListener(
  container: HTMLElement | null,
  onZoom: (deltaY: number) => void
): () => void {
  if (!container) {
    return () => {};
  }

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    onZoom(e.deltaY);
  };

  container.addEventListener('wheel', handleWheel, { passive: false });
  return () => {
    container.removeEventListener('wheel', handleWheel);
  };
}
