import type { AtelierStage, DrawingMethodType, ProjectState } from '../types/studio';

export interface AtelierStageConfiguration {
  viewMode: ProjectState['viewMode'];
  activeMethod: DrawingMethodType;
  gridEnabled: boolean;
}

export interface TransitionStageParams {
  currentStage: AtelierStage;
  isSandbox: boolean;
  currentViewMode: ProjectState['viewMode'];
  currentActiveMethod: DrawingMethodType;
  currentGridEnabled: boolean;
  newStage: AtelierStage;
}

export interface TransitionStageResult {
  stage: AtelierStage;
  viewMode: ProjectState['viewMode'];
  activeMethod: DrawingMethodType;
  gridEnabled: boolean;
}

/**
 * Declarative configuration lookup table for each Atelier Workflow stage.
 * Per CONTEXT.md and Issue #11 glossary alignment:
 * - Stage 1 (Calibration & Envelope): Reference Image ('original'), Bargue envelope, Grid enabled
 * - Stage 2 (Construction & Proportion): Reference Image ('original'), Loomis head, Grid enabled
 * - Stage 3 (Shadow Block-In): Value Study ('valueStudy' - discrete decomposition into distinct steps), no method, Grid enabled
 * - Stage 4 (Halftone Modeling): Tonal Mask ('tonalMask' - continuous photographic gradient), Asaro planar, Grid disabled
 * - Stage 5 (Deep Accents): Tonal Mask ('tonalMask' - continuous photographic gradient to place deep accents / sharp speculars), no method, Grid disabled
 */
export const ATELIER_STAGE_DEFAULTS: Record<AtelierStage, AtelierStageConfiguration> = {
  1: {
    viewMode: 'original',
    activeMethod: 'bargue',
    gridEnabled: true,
  },
  2: {
    viewMode: 'original',
    activeMethod: 'loomis',
    gridEnabled: true,
  },
  3: {
    viewMode: 'valueStudy',
    activeMethod: 'none',
    gridEnabled: true,
  },
  4: {
    viewMode: 'tonalMask',
    activeMethod: 'asaro',
    gridEnabled: false,
  },
  5: {
    viewMode: 'tonalMask',
    activeMethod: 'none',
    gridEnabled: false,
  },
};

/**
 * Returns canonical configuration for each Atelier Workflow stage.
 */
export function getAtelierStageDefaults(stage: AtelierStage): AtelierStageConfiguration {
  return ATELIER_STAGE_DEFAULTS[stage];
}

/**
 * Pure transition function for Atelier Workflow stages.
 * If in sandbox mode, preserves user tool/view configurations and only updates stage.
 * If not in sandbox mode, applies the canonical stage defaults.
 */
export function transitionAtelierStage(params: TransitionStageParams): TransitionStageResult {
  const { isSandbox, currentViewMode, currentActiveMethod, currentGridEnabled, newStage } = params;

  if (isSandbox) {
    return {
      stage: newStage,
      viewMode: currentViewMode,
      activeMethod: currentActiveMethod,
      gridEnabled: currentGridEnabled,
    };
  }

  const defaults = getAtelierStageDefaults(newStage);
  return {
    stage: newStage,
    viewMode: defaults.viewMode,
    activeMethod: defaults.activeMethod,
    gridEnabled: defaults.gridEnabled,
  };
}
