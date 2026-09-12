export type LightDirectionSource = 'default' | 'estimated' | 'manual';

export interface Point2D {
  x: number;
  y: number;
}

export interface TerminatorLine {
  p1: Point2D;
  p2: Point2D;
}

export interface LightDirectionResult {
  angleDeg: number;
  directionLabel: string;
  source: LightDirectionSource;
  threshold?: number;
  terminatorLine: TerminatorLine;
  shadowCentroid?: Point2D;
  litCentroid?: Point2D;
  confidence?: number;
}
