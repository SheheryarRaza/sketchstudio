import type {
  EdgeQuality,
  EdgePoint,
  EdgeQualitySegment,
  EdgeSegmentSource,
  EdgeQualityFilter,
  EdgeInteractionMode,
  EdgeQualityState,
  EdgeQualityConfig,
} from '../types/edgeQuality';

export const EDGE_QUALITY_CONFIG: Record<EdgeQuality, EdgeQualityConfig> = {
  hard: {
    quality: 'hard',
    label: 'Hard',
    description: 'Sharp, abrupt value boundary (cast shadows, sharp silhouettes)',
    color: '#f43f5e', // Vibrant rose / crimson
    strokeDasharray: 'none',
  },
  soft: {
    quality: 'soft',
    label: 'Soft',
    description: 'Gradual, smooth transition across turning form',
    color: '#f59e0b', // Warm amber / orange
    strokeDasharray: '8,5',
  },
  lost: {
    quality: 'lost',
    label: 'Lost',
    description: 'Disappearing boundary where adjacent values merge',
    color: '#a855f7', // Vivid purple / violet
    strokeDasharray: '2,6',
  },
};

export const INITIAL_EDGE_QUALITY_STATE: EdgeQualityState = {
  enabled: false,
  activeQuality: 'hard',
  mode: 'draw',
  segments: [],
  selectedSegmentId: null,
  selectedPointId: null,
  filter: 'all',
  opacity: 0.9,
  lineWidth: 3,
};

export function createInitialEdgeQualityState(): EdgeQualityState {
  return { ...INITIAL_EDGE_QUALITY_STATE, segments: [] };
}

export function toggleEdgeQualityEnabled(state: EdgeQualityState): EdgeQualityState {
  return {
    ...state,
    enabled: !state.enabled,
  };
}

export function setActiveQuality(state: EdgeQualityState, quality: EdgeQuality): EdgeQualityState {
  return {
    ...state,
    activeQuality: quality,
  };
}

export function setInteractionMode(state: EdgeQualityState, mode: EdgeInteractionMode): EdgeQualityState {
  return {
    ...state,
    mode,
  };
}

export function setFilterQuality(state: EdgeQualityState, filter: EdgeQualityFilter): EdgeQualityState {
  return {
    ...state,
    filter,
  };
}

export function addSegment(
  state: EdgeQualityState,
  params: {
    quality?: EdgeQuality;
    points: EdgePoint[];
    label?: string;
    source?: EdgeSegmentSource;
  }
): EdgeQualityState {
  const id = `edge-seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newSegment: EdgeQualitySegment = {
    id,
    quality: params.quality || state.activeQuality,
    points: params.points,
    label: params.label,
    source: params.source || 'drawn',
  };

  return {
    ...state,
    segments: [...state.segments, newSegment],
    selectedSegmentId: id,
    selectedPointId: null,
  };
}

export function addPointToSegment(
  state: EdgeQualityState,
  segmentId: string,
  point: EdgePoint
): EdgeQualityState {
  return {
    ...state,
    segments: state.segments.map((seg) => {
      if (seg.id !== segmentId) return seg;
      return {
        ...seg,
        points: [...seg.points, point],
      };
    }),
  };
}

export function updatePointPosition(
  state: EdgeQualityState,
  segmentId: string,
  pointId: string,
  x: number,
  y: number
): EdgeQualityState {
  return {
    ...state,
    segments: state.segments.map((seg) => {
      if (seg.id !== segmentId) return seg;
      return {
        ...seg,
        points: seg.points.map((p) => (p.id === pointId ? { ...p, x, y } : p)),
      };
    }),
  };
}

export function updateSegmentQuality(
  state: EdgeQualityState,
  segmentId: string,
  quality: EdgeQuality
): EdgeQualityState {
  return {
    ...state,
    segments: state.segments.map((seg) => {
      if (seg.id !== segmentId) return seg;
      return {
        ...seg,
        quality,
      };
    }),
  };
}

export function updatePointQuality(
  state: EdgeQualityState,
  segmentId: string,
  pointId: string,
  quality: EdgeQuality
): EdgeQualityState {
  return {
    ...state,
    segments: state.segments.map((seg) => {
      if (seg.id !== segmentId) return seg;
      return {
        ...seg,
        points: seg.points.map((p) => (p.id === pointId ? { ...p, quality } : p)),
      };
    }),
  };
}

export function splitSegmentAtPoint(
  state: EdgeQualityState,
  segmentId: string,
  pointIndex?: number
): EdgeQualityState {
  const targetSeg = state.segments.find((s) => s.id === segmentId);
  if (!targetSeg || targetSeg.points.length < 3) return state;

  const actualIndex =
    typeof pointIndex === 'number' && pointIndex > 0 && pointIndex < targetSeg.points.length - 1
      ? pointIndex
      : pointIndex === undefined
        ? Math.floor(targetSeg.points.length / 2)
        : -1;

  if (actualIndex <= 0 || actualIndex >= targetSeg.points.length - 1) {
    return state;
  }

  const firstHalfPoints = targetSeg.points.slice(0, actualIndex + 1);
  const secondHalfPoints = targetSeg.points.slice(actualIndex);

  const firstSeg: EdgeQualitySegment = {
    ...targetSeg,
    points: firstHalfPoints,
  };

  const newId = `edge-seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const secondSeg: EdgeQualitySegment = {
    id: newId,
    quality: targetSeg.quality,
    points: secondHalfPoints,
    label: targetSeg.label ? `${targetSeg.label} (part 2)` : undefined,
  };

  const nextSegments: EdgeQualitySegment[] = [];
  for (const seg of state.segments) {
    if (seg.id === segmentId) {
      nextSegments.push(firstSeg, secondSeg);
    } else {
      nextSegments.push(seg);
    }
  }

  return {
    ...state,
    segments: nextSegments,
    selectedSegmentId: secondSeg.id,
  };
}

export function deleteSegment(state: EdgeQualityState, segmentId: string): EdgeQualityState {
  return {
    ...state,
    segments: state.segments.filter((s) => s.id !== segmentId),
    selectedSegmentId: state.selectedSegmentId === segmentId ? null : state.selectedSegmentId,
    selectedPointId: null,
  };
}

export function deletePoint(
  state: EdgeQualityState,
  segmentId: string,
  pointId: string
): EdgeQualityState {
  const targetSeg = state.segments.find((s) => s.id === segmentId);
  if (!targetSeg) return state;

  const nextPoints = targetSeg.points.filter((p) => p.id !== pointId);
  if (nextPoints.length < 2) {
    return deleteSegment(state, segmentId);
  }

  return {
    ...state,
    segments: state.segments.map((seg) => {
      if (seg.id !== segmentId) return seg;
      return {
        ...seg,
        points: nextPoints,
      };
    }),
    selectedPointId: state.selectedPointId === pointId ? null : state.selectedPointId,
  };
}

export function clearSegments(state: EdgeQualityState): EdgeQualityState {
  return {
    ...state,
    segments: [],
    selectedSegmentId: null,
    selectedPointId: null,
  };
}

export function filterSegments(
  segments: EdgeQualitySegment[],
  filter: EdgeQualityFilter
): EdgeQualitySegment[] {
  if (filter === 'all') return segments;
  return segments.filter((s) => s.quality === filter);
}

export function countSegmentsByQuality(segments: EdgeQualitySegment[]): {
  all: number;
  hard: number;
  soft: number;
  lost: number;
} {
  let hard = 0;
  let soft = 0;
  let lost = 0;

  for (const s of segments) {
    if (s.quality === 'hard') hard++;
    else if (s.quality === 'soft') soft++;
    else if (s.quality === 'lost') lost++;
  }

  return {
    all: segments.length,
    hard,
    soft,
    lost,
  };
}

export const EDGE_QUALITY_STORAGE_KEY = 'sketchstudio_edge_quality_v1';

export function serializeEdgeQuality(state: EdgeQualityState): string {
  return JSON.stringify({
    version: 1,
    enabled: state.enabled,
    activeQuality: state.activeQuality,
    mode: state.mode,
    segments: state.segments,
    filter: state.filter,
    opacity: state.opacity,
    lineWidth: state.lineWidth,
  });
}

export function deserializeEdgeQuality(raw: string | null): EdgeQualityState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.segments)) {
      return null;
    }

    return {
      enabled: Boolean(parsed.enabled),
      activeQuality: ['hard', 'soft', 'lost'].includes(parsed.activeQuality)
        ? parsed.activeQuality
        : 'hard',
      mode: ['draw', 'select'].includes(parsed.mode) ? parsed.mode : 'draw',
      segments: parsed.segments.map((s: any) => ({
        id: String(s.id || `seg-${Math.random().toString(36).slice(2, 7)}`),
        quality: ['hard', 'soft', 'lost'].includes(s.quality) ? s.quality : 'hard',
        points: Array.isArray(s.points)
          ? s.points.map((p: any, idx: number) => ({
              id: String(p.id || `p-${idx}`),
              x: Number(p.x) || 0,
              y: Number(p.y) || 0,
              quality: ['hard', 'soft', 'lost'].includes(p.quality) ? p.quality : undefined,
            }))
          : [],
        label: typeof s.label === 'string' ? s.label : undefined,
        source: ['detected', 'drawn', 'fallback'].includes(s.source) ? s.source : undefined,
      })),
      selectedSegmentId: null,
      selectedPointId: null,
      filter: ['all', 'hard', 'soft', 'lost'].includes(parsed.filter) ? parsed.filter : 'all',
      opacity: typeof parsed.opacity === 'number' ? parsed.opacity : 0.9,
      lineWidth: typeof parsed.lineWidth === 'number' ? parsed.lineWidth : 3,
    };
  } catch {
    return null;
  }
}
