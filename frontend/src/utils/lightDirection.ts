import type { DrawingMethodState } from '../types/studio';
import type { LightDirectionResult, LightDirectionSource, Point2D, TerminatorLine } from '../types/lightDirection';

/**
 * Normalizes an angle in degrees into the [0, 360) range.
 */
export function normalizeAngle(angleDeg: number): number {
  const mod = angleDeg % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Returns human-readable lighting direction quadrant label from Cartesian angle in degrees.
 * 0° is Right (+X), 90° is Top (-Y in screen), 180° is Left (-X), 270° is Bottom (+Y in screen).
 */
export function directionLabelFromAngle(angleDeg: number): string {
  const norm = normalizeAngle(angleDeg);
  const rounded = Math.round(norm);

  if (norm >= 22.5 && norm < 67.5) {
    return `Top-Right (${rounded}°)`;
  } else if (norm >= 67.5 && norm < 112.5) {
    return `Top (${rounded}°)`;
  } else if (norm >= 112.5 && norm < 157.5) {
    return `Top-Left (${rounded}°)`;
  } else if (norm >= 157.5 && norm < 202.5) {
    return `Left (${rounded}°)`;
  } else if (norm >= 202.5 && norm < 247.5) {
    return `Bottom-Left (${rounded}°)`;
  } else if (norm >= 247.5 && norm < 292.5) {
    return `Bottom (${rounded}°)`;
  } else if (norm >= 292.5 && norm < 337.5) {
    return `Bottom-Right (${rounded}°)`;
  } else {
    return `Right (${rounded}°)`;
  }
}

/**
 * Returns the visible Declared Source statement for light direction & terminator.
 * Per CONTEXT.md Declared Source rules, never presents an estimate as a measured fact.
 */
export function declaredSourceLabel(source: LightDirectionSource): string {
  switch (source) {
    case 'estimated':
      return 'Estimated from histogram & shadow shape';
    case 'manual':
      return 'Manually adjusted';
    case 'default':
    default:
      return 'Default estimate (45°)';
  }
}

/**
 * Computes the perpendicular terminator line passing through `center` (or form center).
 * The terminator separates lit hemisphere from shadow hemisphere.
 * In screen coordinates (where Y grows downwards):
 * - Light unit vector: u_light = (cos(ang), -sin(ang))
 * - Perpendicular tangent along terminator: u_perp = (sin(ang), cos(ang))
 */
export function calculateTerminatorLine(
  width: number,
  height: number,
  angleDeg: number,
  centerPoint?: Point2D,
  lineLength?: number,
): TerminatorLine {
  const center: Point2D = centerPoint ?? {
    x: width / 2,
    y: height / 2,
  };

  const len = lineLength ?? Math.min(width, height) * 0.7;
  const halfLen = len / 2;

  const rad = (normalizeAngle(angleDeg) * Math.PI) / 180;
  const perpX = Math.sin(rad);
  const perpY = Math.cos(rad);

  const p1: Point2D = {
    x: Math.round((center.x - halfLen * perpX) * 10) / 10,
    y: Math.round((center.y - halfLen * perpY) * 10) / 10,
  };

  const p2: Point2D = {
    x: Math.round((center.x + halfLen * perpX) * 10) / 10,
    y: Math.round((center.y + halfLen * perpY) * 10) / 10,
  };

  return { p1, p2 };
}

/**
 * Updates Asaro lighting angle and updates terminator line.
 */
export function setLightAngle(
  asaro: DrawingMethodState['asaro'],
  angleDeg: number,
  width: number = 800,
  height: number = 1000,
  source: LightDirectionSource = 'manual',
  centerPoint?: Point2D,
): DrawingMethodState['asaro'] {
  const normAngle = normalizeAngle(angleDeg);
  const newLine = calculateTerminatorLine(width, height, normAngle, centerPoint);

  return {
    ...asaro,
    lightAngleDeg: normAngle,
    terminatorSource: source,
    terminatorLine: newLine,
  };
}

/**
 * Toggles visibility of the terminator line on canvas.
 */
export function toggleTerminator(
  asaro: DrawingMethodState['asaro'],
  show?: boolean,
): DrawingMethodState['asaro'] {
  return {
    ...asaro,
    showTerminator: show !== undefined ? show : !asaro.showTerminator,
  };
}

/**
 * Merges estimated light direction results into Asaro Drawing Method state.
 */
export function applyEstimatedLightDirection(
  asaro: DrawingMethodState['asaro'],
  estimation: LightDirectionResult,
): DrawingMethodState['asaro'] {
  return {
    ...asaro,
    lightAngleDeg: estimation.angleDeg,
    terminatorSource: estimation.source,
    terminatorLine: estimation.terminatorLine,
    showTerminator: true,
  };
}

/**
 * Estimates light direction angle and terminator line from lit and shadow centroids.
 */
export function estimateLightDirectionFromCentroids(
  width: number,
  height: number,
  shadowCentroid: Point2D,
  litCentroid: Point2D,
): LightDirectionResult {
  const dx = litCentroid.x - shadowCentroid.x;
  const dy = shadowCentroid.y - litCentroid.y; // Cartesian positive Y is up

  const dist = Math.hypot(dx, dy);
  let angleDeg = 45;
  if (dist >= 1e-4) {
    const rad = Math.atan2(dy, dx);
    angleDeg = (Math.round((rad * 180) / Math.PI) + 360) % 360;
  }

  const center: Point2D = {
    x: (litCentroid.x + shadowCentroid.x) / 2,
    y: (litCentroid.y + shadowCentroid.y) / 2,
  };

  const terminatorLine = calculateTerminatorLine(width, height, angleDeg, center);

  return {
    angleDeg,
    directionLabel: directionLabelFromAngle(angleDeg),
    source: 'estimated',
    terminatorLine,
    shadowCentroid,
    litCentroid,
  };
}
