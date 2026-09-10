export const DEFAULT_RENDER_CAP_PX = 1800;

export interface RenderSize {
  width: number;
  height: number;
  scale: number;
}

/**
 * Working resolution for the canvas backing store (ADR-0004). The Reference Image
 * is retained at native resolution for export; only the interactive render is capped.
 */
export function capRenderSize(
  naturalWidth: number,
  naturalHeight: number,
  capPx: number = DEFAULT_RENDER_CAP_PX,
): RenderSize {
  const width = Math.max(1, Math.round(naturalWidth) || 1);
  const height = Math.max(1, Math.round(naturalHeight) || 1);
  const longEdge = Math.max(width, height);

  if (longEdge <= capPx) {
    return { width, height, scale: 1 };
  }

  const scale = capPx / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}
