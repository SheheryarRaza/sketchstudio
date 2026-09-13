import type { ProjectState } from '../types/studio';

/**
 * Toggle the view-only horizontal flip state for the Reference Image.
 * Preserves all underlying measurements, anchors, cut points, calibration,
 * and configuration intact in native (unflipped) coordinate space.
 */
export function toggleFlipHorizontal(state: ProjectState): ProjectState {
  const isFlipped = state.view ? !state.view.isFlippedHorizontal : !state.isFlippedHorizontal;
  if (state.view) {
    return {
      ...state,
      view: {
        ...state.view,
        isFlippedHorizontal: isFlipped,
      },
      isFlippedHorizontal: isFlipped,
    };
  }
  return {
    ...state,
    isFlippedHorizontal: isFlipped,
  };
}

/**
 * Computes the CSS transform string for the canvas container viewport.
 * When flipped horizontally, appends scaleX(-1) so that the reference image,
 * drawing method overlays, and transfer grid are mirrored horizontally
 * across the container center.
 */
export function computeCanvasTransform(
  pan: { x: number; y: number },
  scale: number,
  isFlippedHorizontal: boolean
): string {
  if (isFlippedHorizontal) {
    return `translate(${pan.x}px, ${pan.y}px) scale(${scale}) scaleX(-1)`;
  }
  return `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
}

/**
 * Maps a screen-space clientX pointer position into native image coordinate space.
 * Accepts a bounding rect object ({ left, width }) to avoid parameter clumps.
 * When the view is horizontally mirrored via scaleX(-1), inverts the normalized X
 * offset so that anchor dragging and interaction follow the pointer naturally and
 * remain stored in native coordinate space.
 */
export function mapPointerToNativeX(
  clientX: number,
  rect: { left: number; width: number },
  nativeWidth: number,
  isFlippedHorizontal: boolean
): number {
  if (rect.width <= 0 || nativeWidth <= 0) return 0;
  const clampedScreenX = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const rawNormalized = clampedScreenX / rect.width;
  const effectiveNormalized = isFlippedHorizontal ? 1 - rawNormalized : rawNormalized;
  return Math.max(0, Math.min(nativeWidth, effectiveNormalized * nativeWidth));
}
