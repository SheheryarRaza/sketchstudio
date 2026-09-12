import test from 'node:test';
import assert from 'node:assert/strict';
import type { HistogramStats, ProjectState } from '../types/studio';
import { INITIAL_PROJECT_STATE } from './initialProjectState';
import {
  WORKFLOW_PRESETS,
  applyWorkflowPreset,
  suggestPresetId,
  HIGH_CONTRAST_THRESHOLD,
  type WorkflowPresetId,
} from './workflowPresets';

test('WORKFLOW_PRESETS contains all 5 curated v1 lineup presets', () => {
  const expectedIds: WorkflowPresetId[] = [
    'portrait-static',
    'portrait-dramatic',
    'expressive-dynamic',
    'classical-cast',
    'scene-composition',
  ];

  for (const id of expectedIds) {
    const preset = WORKFLOW_PRESETS[id];
    assert.ok(preset, `Preset "${id}" must exist in WORKFLOW_PRESETS`);
    assert.equal(preset.id, id);
    assert.ok(preset.name.length > 0, `Preset "${id}" must have a non-empty name`);
    assert.ok(preset.description.length > 0, `Preset "${id}" must have a non-empty description`);
  }
});

test('applyWorkflowPreset: portrait-static bundles Loomis + Value Study + rule-of-thirds grid + Graphite', () => {
  const base: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    isSandbox: false,
    viewMode: 'original',
    methods: { ...INITIAL_PROJECT_STATE.methods, activeMethod: 'bargue' },
    grid: { ...INITIAL_PROJECT_STATE.grid, enabled: false, type: 'squares' },
    appliedPreset: null,
  };

  const next = applyWorkflowPreset(base, 'portrait-static');

  assert.equal(next.viewMode, 'valueStudy');
  assert.equal(next.methods.activeMethod, 'loomis');
  assert.equal(next.grid.enabled, true);
  assert.equal(next.grid.type, 'goldenRatio');
  assert.equal(next.medium, 'graphite');
  assert.deepEqual(next.isolation, { kind: 'none' });
  assert.equal(next.isSandbox, true);
  assert.equal(next.appliedPreset, 'portrait-static');
});

test('applyWorkflowPreset: portrait-dramatic bundles Asaro + Value Study + Isolate shadows + Graphite', () => {
  const base: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    isSandbox: false,
    viewMode: 'original',
    methods: { ...INITIAL_PROJECT_STATE.methods, activeMethod: 'loomis' },
    grid: { ...INITIAL_PROJECT_STATE.grid, enabled: true },
    isolation: { kind: 'none' },
    appliedPreset: null,
  };

  const next = applyWorkflowPreset(base, 'portrait-dramatic');

  assert.equal(next.viewMode, 'valueStudy');
  assert.equal(next.methods.activeMethod, 'asaro');
  assert.equal(next.grid.enabled, false);
  assert.equal(next.medium, 'graphite');
  assert.deepEqual(next.isolation, { kind: 'family', family: 'shadows' });
  assert.equal(next.isSandbox, true);
  assert.equal(next.appliedPreset, 'portrait-dramatic');
});

test('applyWorkflowPreset: expressive-dynamic bundles Reilly + Value Study + no grid + Graphite', () => {
  const base: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    isSandbox: false,
    viewMode: 'original',
    methods: { ...INITIAL_PROJECT_STATE.methods, activeMethod: 'bargue' },
    grid: { ...INITIAL_PROJECT_STATE.grid, enabled: true },
    appliedPreset: null,
  };

  const next = applyWorkflowPreset(base, 'expressive-dynamic');

  assert.equal(next.viewMode, 'valueStudy');
  assert.equal(next.methods.activeMethod, 'reilly');
  assert.equal(next.grid.enabled, false);
  assert.equal(next.medium, 'graphite');
  assert.deepEqual(next.isolation, { kind: 'none' });
  assert.equal(next.isSandbox, true);
  assert.equal(next.appliedPreset, 'expressive-dynamic');
});

test('applyWorkflowPreset: classical-cast bundles Bargue + Edges + goldenRatio grid + Graphite', () => {
  const base: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    isSandbox: false,
    viewMode: 'valueStudy',
    methods: { ...INITIAL_PROJECT_STATE.methods, activeMethod: 'loomis' },
    grid: { ...INITIAL_PROJECT_STATE.grid, enabled: false, type: 'squares' },
    appliedPreset: null,
  };

  const next = applyWorkflowPreset(base, 'classical-cast');

  assert.equal(next.viewMode, 'edges');
  assert.equal(next.methods.activeMethod, 'bargue');
  assert.equal(next.grid.enabled, true);
  assert.equal(next.grid.type, 'goldenRatio');
  assert.equal(next.medium, 'graphite');
  assert.deepEqual(next.isolation, { kind: 'none' });
  assert.equal(next.isSandbox, true);
  assert.equal(next.appliedPreset, 'classical-cast');
});

test('applyWorkflowPreset: scene-composition bundles Harmonic Armature + Photo view + diagonal grid + Graphite', () => {
  const base: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    isSandbox: false,
    viewMode: 'valueStudy',
    methods: { ...INITIAL_PROJECT_STATE.methods, activeMethod: 'loomis' },
    grid: { ...INITIAL_PROJECT_STATE.grid, enabled: false, type: 'squares' },
    appliedPreset: null,
  };

  const next = applyWorkflowPreset(base, 'scene-composition');

  assert.equal(next.viewMode, 'original');
  assert.equal(next.methods.activeMethod, 'harmonic');
  assert.equal(next.grid.enabled, true);
  assert.equal(next.grid.type, 'diagonals');
  assert.equal(next.medium, 'graphite');
  assert.deepEqual(next.isolation, { kind: 'none' });
  assert.equal(next.isSandbox, true);
  assert.equal(next.appliedPreset, 'scene-composition');
});

test('applyWorkflowPreset unconditionally sets isSandbox to true even if already true or false', () => {
  const fromFalse = applyWorkflowPreset({ ...INITIAL_PROJECT_STATE, isSandbox: false }, 'portrait-static');
  assert.equal(fromFalse.isSandbox, true);

  const fromTrue = applyWorkflowPreset({ ...INITIAL_PROJECT_STATE, isSandbox: true }, 'portrait-static');
  assert.equal(fromTrue.isSandbox, true);
});

test('applyWorkflowPreset preserves unrelated project state (imageSrc, calibration, paperMapping, etc.)', () => {
  const base: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    imageSrc: 'data:image/png;base64,sample',
    imageWidth: 1024,
    imageHeight: 768,
    title: 'Custom User Upload',
    calibration: { isCalibrated: true, screenDpi: 110, pixelsPerMm: 4.33 },
    paperMapping: {
      isDeclared: true,
      paperPreset: 'A3',
      paperWidthMm: 297,
      paperHeightMm: 420,
      fillMode: 'fillHeight',
    },
  };

  const next = applyWorkflowPreset(base, 'portrait-dramatic');

  assert.equal(next.imageSrc, 'data:image/png;base64,sample');
  assert.equal(next.imageWidth, 1024);
  assert.equal(next.imageHeight, 768);
  assert.equal(next.title, 'Custom User Upload');
  assert.deepEqual(next.calibration, base.calibration);
  assert.deepEqual(next.paperMapping, base.paperMapping);
});

test('suggestPresetId recommends portrait-dramatic for high-contrast spread', () => {
  const highContrastStats: HistogramStats = {
    width: 600,
    height: 800,
    meanLuminance: 120,
    medianLuminance: 115,
    deepDarkThreshold: 40,
    highlightThreshold: 210, // Spread: 210 - 40 = 170 (>= 130)
    histogram: new Array(256).fill(1),
  };

  const suggestion = suggestPresetId(highContrastStats);
  assert.equal(suggestion, 'portrait-dramatic');
});

test('suggestPresetId recommends portrait-static for balanced or low-contrast spread', () => {
  const lowContrastStats: HistogramStats = {
    width: 600,
    height: 800,
    meanLuminance: 128,
    medianLuminance: 125,
    deepDarkThreshold: 75,
    highlightThreshold: 175, // Spread: 175 - 75 = 100 (< 130)
    histogram: new Array(256).fill(1),
  };

  const suggestion = suggestPresetId(lowContrastStats);
  assert.equal(suggestion, 'portrait-static');
});

test('suggestPresetId returns null when stats are null, undefined, or missing thresholds', () => {
  assert.equal(suggestPresetId(null), null);
  assert.equal(suggestPresetId(undefined), null);
  assert.equal(
    suggestPresetId({
      width: 100,
      height: 100,
      meanLuminance: 120,
      medianLuminance: 120,
      deepDarkThreshold: NaN,
      highlightThreshold: 200,
      histogram: [],
    }),
    null
  );
});
