import type { RenderSize } from './renderScale';

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
