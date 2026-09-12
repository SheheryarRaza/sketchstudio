import type {
  DrawingMethodType,
  GridType,
  HistogramStats,
  IsolationTarget,
  MediumType,
  ProjectState,
  WorkflowPresetId,
} from '../types/studio';
import { generateDefaultLayerMeta } from './pencilGrades';

export type { WorkflowPresetId };

export interface WorkflowPresetDefinition {
  id: WorkflowPresetId;
  name: string;
  description: string;
  viewMode: ProjectState['viewMode'];
  activeMethod: DrawingMethodType;
  grid: {
    enabled: boolean;
    type?: GridType;
  };
  medium: MediumType;
  isolation?: IsolationTarget;
}

export const HIGH_CONTRAST_THRESHOLD = 130;

export const WORKFLOW_PRESETS: Record<WorkflowPresetId, WorkflowPresetDefinition> = {
  'portrait-static': {
    id: 'portrait-static',
    name: 'Portrait — Static',
    description: 'Loomis head construction, 5-band value study, rule-of-thirds grid, and graphite pencil grades.',
    viewMode: 'valueStudy',
    activeMethod: 'loomis',
    grid: {
      enabled: true,
      type: 'goldenRatio',
    },
    medium: 'graphite',
    isolation: { kind: 'none' },
  },
  'portrait-dramatic': {
    id: 'portrait-dramatic',
    name: 'Portrait — Dramatic Light',
    description: 'Asaro planar head, high-contrast value study with shadow isolation, and graphite pencil grades.',
    viewMode: 'valueStudy',
    activeMethod: 'asaro',
    grid: {
      enabled: false,
    },
    medium: 'graphite',
    isolation: { kind: 'family', family: 'shadows' },
  },
  'expressive-dynamic': {
    id: 'expressive-dynamic',
    name: 'Expressive/Dynamic Pose',
    description: 'Reilly rhythm lines, simplified value masses, and clean open canvas without grid.',
    viewMode: 'valueStudy',
    activeMethod: 'reilly',
    grid: {
      enabled: false,
    },
    medium: 'graphite',
    isolation: { kind: 'none' },
  },
  'classical-cast': {
    id: 'classical-cast',
    name: 'Classical/Cast Study',
    description: 'Bargue envelope, edge quality map (hard/soft/lost), and golden ratio grid transfer.',
    viewMode: 'edges',
    activeMethod: 'bargue',
    grid: {
      enabled: true,
      type: 'goldenRatio',
    },
    medium: 'graphite',
    isolation: { kind: 'none' },
  },
  'scene-composition': {
    id: 'scene-composition',
    name: 'Full Scene/Composition',
    description: 'Harmonic Armature diagonal composition lines, photo view, and diagonal transfer grid.',
    viewMode: 'original',
    activeMethod: 'harmonic',
    grid: {
      enabled: true,
      type: 'diagonals',
    },
    medium: 'graphite',
    isolation: { kind: 'none' },
  },
};

/**
 * Pure function to apply a curated Workflow Preset to the studio's ProjectState.
 * Unconditionally sets `isSandbox: true` because a preset and the Atelier Workflow
 * cannot both drive View Mode, Method, and Grid at the same time (ADR-0007).
 */
export function applyWorkflowPreset(prev: ProjectState, presetId: WorkflowPresetId): ProjectState {
  const preset = WORKFLOW_PRESETS[presetId];
  if (!preset) return prev;

  const nextMedium = preset.medium;
  const layerMeta =
    prev.medium !== nextMedium
      ? generateDefaultLayerMeta(prev.numValueLayers, nextMedium)
      : prev.layerMeta;

  return {
    ...prev,
    isSandbox: true,
    appliedPreset: presetId,
    viewMode: preset.viewMode,
    medium: nextMedium,
    layerMeta,
    methods: {
      ...prev.methods,
      activeMethod: preset.activeMethod,
    },
    grid: {
      ...prev.grid,
      enabled: preset.grid.enabled,
      ...(preset.grid.type ? { type: preset.grid.type } : {}),
    },
    isolation: preset.isolation || { kind: 'none' },
  };
}

/**
 * Pure heuristic function recommending a starting Workflow Preset from the Reference Image's
 * measured luminance histogram (ADR-0006). Contrast spread (highlightThreshold - deepDarkThreshold)
 * above HIGH_CONTRAST_THRESHOLD recommends 'portrait-dramatic'; otherwise recommends 'portrait-static'.
 * Returns null if stats are unavailable or invalid so the picker degrades gracefully.
 */
export function suggestPresetId(stats: HistogramStats | null | undefined): WorkflowPresetId | null {
  if (!stats) return null;
  if (
    typeof stats.highlightThreshold !== 'number' ||
    typeof stats.deepDarkThreshold !== 'number' ||
    Number.isNaN(stats.highlightThreshold) ||
    Number.isNaN(stats.deepDarkThreshold)
  ) {
    return null;
  }

  const contrastSpread = stats.highlightThreshold - stats.deepDarkThreshold;
  if (contrastSpread >= HIGH_CONTRAST_THRESHOLD) {
    return 'portrait-dramatic';
  }

  return 'portrait-static';
}
