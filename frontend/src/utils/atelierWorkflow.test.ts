import test from 'node:test';
import assert from 'node:assert/strict';
import { getAtelierStageDefaults, transitionAtelierStage } from './atelierWorkflow';
import type { AtelierStage, StudioViewState } from '../types/studio';
import { INITIAL_VIEW_STATE } from './initialProjectState';

test('getAtelierStageDefaults returns correct viewMode, method, and grid for all 5 stages', () => {
  // Stage 1: Calibration & Envelope -> Reference Image view, Bargue envelope, Grid enabled
  const stage1 = getAtelierStageDefaults(1);
  assert.equal(stage1.viewMode, 'original');
  assert.equal(stage1.activeMethod, 'bargue');
  assert.equal(stage1.gridEnabled, true);

  // Stage 2: Construction & Proportion -> Reference Image view, Loomis head, Grid enabled
  const stage2 = getAtelierStageDefaults(2);
  assert.equal(stage2.viewMode, 'original');
  assert.equal(stage2.activeMethod, 'loomis');
  assert.equal(stage2.gridEnabled, true);

  // Stage 3: Shadow Block-In -> Value Study (quantized discrete steps), no method, Grid enabled
  const stage3 = getAtelierStageDefaults(3);
  assert.equal(stage3.viewMode, 'valueStudy');
  assert.equal(stage3.activeMethod, 'none');
  assert.equal(stage3.gridEnabled, true);

  // Stage 4: Halftone Modeling -> Tonal Mask (continuous photographic gradient), Asaro planar, Grid disabled
  const stage4 = getAtelierStageDefaults(4);
  assert.equal(stage4.viewMode, 'tonalMask');
  assert.equal(stage4.activeMethod, 'asaro');
  assert.equal(stage4.gridEnabled, false);

  // Stage 5: Deep Accents -> Tonal Mask (continuous photographic gradient to locate speculars/accents), no method, Grid disabled
  // Note: Before the glossary rename, Stage 5 used the continuous view (then named valueStudy).
  // Under the glossary alignment, continuous view is Tonal Mask, so Stage 5 selects tonalMask.
  const stage5 = getAtelierStageDefaults(5);
  assert.equal(stage5.viewMode, 'tonalMask');
  assert.equal(stage5.activeMethod, 'none');
  assert.equal(stage5.gridEnabled, false);
});

test('transitionAtelierStage applies stage defaults when not in sandbox mode', () => {
  const currentView: StudioViewState = {
    ...INITIAL_VIEW_STATE,
    stage: 1,
    isSandbox: false,
    viewMode: 'original',
  };

  const next = transitionAtelierStage({
    currentStage: currentView.stage,
    isSandbox: currentView.isSandbox,
    currentViewMode: currentView.viewMode,
    currentActiveMethod: 'bargue',
    currentGridEnabled: true,
    newStage: 5,
  });

  assert.equal(next.stage, 5);
  assert.equal(next.viewMode, 'tonalMask');
  assert.equal(next.activeMethod, 'none');
  assert.equal(next.gridEnabled, false);
});

test('transitionAtelierStage preserves user viewMode, method, and grid when in sandbox mode', () => {
  const currentView: StudioViewState = {
    ...INITIAL_VIEW_STATE,
    stage: 1,
    isSandbox: true,
    viewMode: 'edges',
  };

  const next = transitionAtelierStage({
    currentStage: currentView.stage,
    isSandbox: true,
    currentViewMode: 'edges',
    currentActiveMethod: 'reilly',
    currentGridEnabled: false,
    newStage: 3,
  });

  assert.equal(next.stage, 3);
  assert.equal(next.viewMode, 'edges');
  assert.equal(next.activeMethod, 'reilly');
  assert.equal(next.gridEnabled, false);
});
