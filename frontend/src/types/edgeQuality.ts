export type EdgeQuality = 'hard' | 'soft' | 'lost';

export interface EdgePoint {
  id: string;
  x: number;
  y: number;
  quality?: EdgeQuality;
}

export type EdgeSegmentSource = 'detected' | 'drawn' | 'fallback';

export interface EdgeQualitySegment {
  id: string;
  quality: EdgeQuality;
  points: EdgePoint[];
  label?: string;
  source?: EdgeSegmentSource;
}

export type EdgeQualityFilter = 'all' | 'hard' | 'soft' | 'lost';

export type EdgeInteractionMode = 'draw' | 'select';

export interface EdgeQualityState {
  enabled: boolean;
  activeQuality: EdgeQuality;
  mode: EdgeInteractionMode;
  segments: EdgeQualitySegment[];
  selectedSegmentId: string | null;
  selectedPointId: string | null;
  filter: EdgeQualityFilter;
  opacity: number;
  lineWidth: number;
}

export interface EdgeQualityConfig {
  quality: EdgeQuality;
  label: string;
  description: string;
  color: string;
  strokeDasharray: string;
}
