import type { IsolationTarget, TonalRenderMode, ValueFamily, ValueLayer } from '../types/studio';
import { PENCIL_DATABASE } from './pencilGrades';

export interface ValueFamilyInfo {
  id: ValueFamily;
  name: string;
  minThreshold: number;
  maxThreshold: number;
  description: string;
}

const HALFTONE_FLOOR = 85;
const LIGHT_FLOOR = 170;

/**
 * Value Families are defined by tonal range, never by layer index, so they stay
 * coherent as the Tonal Layer count varies between 3 and 9.
 */
export const VALUE_FAMILIES: ValueFamilyInfo[] = [
  { id: 'shadows', name: 'Shadows', minThreshold: 0, maxThreshold: HALFTONE_FLOOR - 1, description: 'Core shadow, cast shadow and occlusion' },
  { id: 'halftones', name: 'Halftones', minThreshold: HALFTONE_FLOOR, maxThreshold: LIGHT_FLOOR - 1, description: 'The turning form between light and shadow' },
  { id: 'lights', name: 'Lights', minThreshold: LIGHT_FLOOR, maxThreshold: 255, description: 'Light planes and specular highlights' },
];

/**
 * Classifies on the two floors rather than on VALUE_FAMILIES' inclusive ranges:
 * a band whose bounds the artist has dragged can have a midpoint of 84.5, which
 * falls between those ranges and would otherwise need a fabricated fallback.
 */
export function familyOfLayer(layer: ValueLayer): ValueFamily {
  const midpoint = (layer.minThreshold + layer.maxThreshold) / 2;
  if (midpoint < HALFTONE_FLOOR) return 'shadows';
  if (midpoint < LIGHT_FLOOR) return 'halftones';
  return 'lights';
}

export function layersInFamily(layers: ValueLayer[], family: ValueFamily): ValueLayer[] {
  return layers.filter(layer => familyOfLayer(layer) === family);
}

/**
 * The set of Tonal Layers an isolation targets. An empty set means nothing is
 * isolated and the canvas renders normally.
 */
export function isolatedLayerIds(layers: ValueLayer[], isolation: IsolationTarget): Set<string> {
  if (isolation.kind === 'layer') {
    return new Set(layers.filter(l => l.id === isolation.layerId).map(l => l.id));
  }
  if (isolation.kind === 'family') {
    return new Set(layersInFamily(layers, isolation.family).map(l => l.id));
  }
  return new Set();
}

export interface TonalPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function createTonalPixel(): TonalPixel {
  return { r: 0, g: 0, b: 0, a: 0 };
}

function bandFor(luminance: number, layers: ValueLayer[]): ValueLayer | undefined {
  for (const layer of layers) {
    if (luminance >= layer.minThreshold && luminance <= layer.maxThreshold) return layer;
  }
  return undefined;
}

/**
 * Decides what a single luminance becomes on the canvas. Writes into `out` rather
 * than allocating, because this runs once per pixel; the result still depends only
 * on the arguments.
 *
 * When a selection is isolated it renders as a flat mask filled at the mapped
 * pencil grade tone, over a faint Reference Image underlay, so the artist sees a
 * shape to fill rather than a gradient.
 */
export function decideTonalPixel(
  luminance: number,
  sourceAlpha: number,
  layers: ValueLayer[],
  mode: TonalRenderMode,
  isolated: ReadonlySet<string>,
  ghostOpacity: number,
  out: TonalPixel,
): void {
  const band = bandFor(luminance, layers);

  if (isolated.size > 0) {
    if (band && isolated.has(band.id)) {
      const tone = PENCIL_DATABASE[band.pencilGrade].toneValue;
      out.r = tone;
      out.g = tone;
      out.b = tone;
      out.a = Math.round(sourceAlpha * band.opacity);
      return;
    }
    out.r = luminance;
    out.g = luminance;
    out.b = luminance;
    out.a = Math.round(sourceAlpha * ghostOpacity);
    return;
  }

  if (!band || !band.visible) {
    out.r = 245;
    out.g = 245;
    out.b = 245;
    out.a = 40;
    return;
  }

  const value = mode === 'posterized'
    ? Math.round((band.minThreshold + band.maxThreshold) / 2)
    : luminance;

  out.r = value;
  out.g = value;
  out.b = value;
  out.a = Math.round(sourceAlpha * band.opacity);
}
