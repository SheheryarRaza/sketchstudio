import type { ValueLayer } from '../types/studio';

/**
 * Calculates perceived luminance using Rec. 709 HDTV ITU standard
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Renders a decomposed Value Study onto a destination 2D Canvas context
 */
export function renderValueStudyOnCanvas(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  layers: ValueLayer[],
  viewMode: 'original' | 'valueStudy' | 'edges' | 'posterized',
  splitRatio?: number // if split view (0 to 1)
) {
  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const width = targetCanvas.width;
  const height = targetCanvas.height;

  // Draw original image first to offscreen canvas to get raw pixel buffer
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCtx.drawImage(sourceImage, 0, 0, width, height);

  if (viewMode === 'original') {
    ctx.drawImage(tempCanvas, 0, 0);
    return;
  }

  const imgData = tempCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const outputData = ctx.createImageData(width, height);
  const out = outputData.data;

  const hasSolo = layers.some(l => l.isSolo);
  const activeLayers = layers.filter(l => hasSolo ? l.isSolo : l.visible);

  const splitX = splitRatio !== undefined ? Math.floor(width * splitRatio) : -1;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const px = pixelIndex % width;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // If in split mode and to the left of split, keep original
    if (splitX >= 0 && px < splitX) {
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = a;
      continue;
    }

    const lum = getLuminance(r, g, b);

    if (viewMode === 'edges') {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = a;
      continue;
    }

    // Match layer
    let matched = false;
    for (const layer of activeLayers) {
      if (lum >= layer.minThreshold && lum <= layer.maxThreshold) {
        matched = true;
        if (viewMode === 'posterized') {
          // Quantize to layer midpoint
          const mid = (layer.minThreshold + layer.maxThreshold) / 2;
          out[i] = mid;
          out[i + 1] = mid;
          out[i + 2] = mid;
          out[i + 3] = Math.round(a * layer.opacity);
        } else {
          // Value study - grayscale tone
          out[i] = lum;
          out[i + 1] = lum;
          out[i + 2] = lum;
          out[i + 3] = Math.round(a * layer.opacity);
        }
        break;
      }
    }

    if (!matched) {
      // Outside active/visible layers -> transparent or dim white paper
      out[i] = 245;
      out[i + 1] = 245;
      out[i + 2] = 245;
      out[i + 3] = 40; // faint watermark
    }
  }

  ctx.putImageData(outputData, 0, 0);
}

/**
 * Calculates a 256-bin luminance histogram of an image
 */
export function computeImageHistogram(img: HTMLImageElement | HTMLCanvasElement): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(400, img.width || 400);
  canvas.height = Math.min(400, img.height || 400);
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Array(256).fill(0);

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const hist = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(getLuminance(data[i], data[i + 1], data[i + 2]));
    hist[lum] = (hist[lum] || 0) + 1;
  }

  // Normalize to 0..100
  const max = Math.max(...hist, 1);
  return hist.map(v => Math.round((v / max) * 100));
}
