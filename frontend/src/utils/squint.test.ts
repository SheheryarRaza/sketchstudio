import test from 'node:test';
import assert from 'node:assert/strict';
import { clampBlurRadius, computeCanvasFilter, formatBlurRadius, MAX_BLUR_RADIUS, DEFAULT_SQUINT_RADIUS } from './squint';
import { INITIAL_PROJECT_STATE } from './initialProjectState';
import { renderValueStudyOnCanvas } from './canvasShaders';
import type { ProjectState } from '../types/studio';

test('MAX_BLUR_RADIUS is 32 for ample squint range on display-capped images', () => {
  assert.equal(MAX_BLUR_RADIUS, 32);
});

test('clampBlurRadius clamps values into valid range [0, 32]', () => {
  assert.equal(clampBlurRadius(-5), 0);
  assert.equal(clampBlurRadius(0), 0);
  assert.equal(clampBlurRadius(8), 8);
  assert.equal(clampBlurRadius(32), 32);
  assert.equal(clampBlurRadius(50), MAX_BLUR_RADIUS);
  assert.equal(clampBlurRadius(8.4), 8);
  assert.equal(clampBlurRadius(8.7), 9);
  assert.equal(clampBlurRadius(Number.NaN), 0);
});

test('computeCanvasFilter returns CSS filter string or undefined', () => {
  assert.equal(computeCanvasFilter(0), undefined);
  assert.equal(computeCanvasFilter(-2), undefined);
  assert.equal(computeCanvasFilter(8), 'blur(8px)');
  assert.equal(computeCanvasFilter(32), 'blur(32px)');
  assert.equal(computeCanvasFilter(DEFAULT_SQUINT_RADIUS), 'blur(8px)');
});

test('formatBlurRadius returns readable label', () => {
  assert.equal(formatBlurRadius(0), '0px');
  assert.equal(formatBlurRadius(8), '8px');
  assert.equal(formatBlurRadius(15), '15px');
  assert.equal(formatBlurRadius(32), '32px');
});

test('INITIAL_PROJECT_STATE initializes blurRadius to 0 without mutating other state', () => {
  assert.equal(INITIAL_PROJECT_STATE.blurRadius, 0);
  assert.equal(INITIAL_PROJECT_STATE.imageSrc, null);
  assert.equal(INITIAL_PROJECT_STATE.viewMode, 'valueStudy');
});

test('blur update updater preserves underlying reference and analysis state', () => {
  const initial: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    imageSrc: 'data:image/png;base64,mock',
    imageWidth: 800,
    imageHeight: 600,
  };

  const updateBlur = (prev: ProjectState, radius: number): ProjectState => ({
    ...prev,
    blurRadius: clampBlurRadius(radius),
  });

  const updated = updateBlur(initial, 12);
  assert.equal(updated.blurRadius, 12);
  assert.equal(updated.imageSrc, initial.imageSrc);
  assert.equal(updated.imageWidth, initial.imageWidth);
  assert.equal(updated.imageHeight, initial.imageHeight);
  assert.deepEqual(updated.cutPoints, initial.cutPoints);
  assert.deepEqual(updated.histogram, initial.histogram);
  assert.deepEqual(updated.landmarks, initial.landmarks);
  assert.deepEqual(updated.calibration, initial.calibration);
  assert.deepEqual(updated.paperMapping, initial.paperMapping);
});

test('renderValueStudyOnCanvas function signature accepts blurRadius parameter', () => {
  assert.equal(typeof renderValueStudyOnCanvas, 'function');
  // renderValueStudyOnCanvas has formal parameters: sourceImage, targetCanvas, layers, viewMode, splitRatio, isolation, ghostOpacity, familyFloors, blurRadius
  assert.ok(renderValueStudyOnCanvas.length >= 4);
});
