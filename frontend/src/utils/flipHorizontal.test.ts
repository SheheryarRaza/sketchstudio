import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCanvasTransform,
  toggleFlipHorizontal,
  mapPointerToNativeX,
} from './flipHorizontal';
import { INITIAL_PROJECT_STATE } from './initialProjectState';
import type { ProjectState } from '../types/studio';

test('INITIAL_PROJECT_STATE initializes isFlippedHorizontal to false', () => {
  assert.equal(INITIAL_PROJECT_STATE.isFlippedHorizontal, false);
});

test('toggleFlipHorizontal toggles isFlippedHorizontal boolean state', () => {
  const initial = { ...INITIAL_PROJECT_STATE, isFlippedHorizontal: false };
  const flipped = toggleFlipHorizontal(initial);
  assert.equal(flipped.isFlippedHorizontal, true);

  const unflipped = toggleFlipHorizontal(flipped);
  assert.equal(unflipped.isFlippedHorizontal, false);
});

test('toggleFlipHorizontal is view-only and strictly preserves underlying measurements, anchors, and configuration', () => {
  const customState: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    imageSrc: 'data:image/svg+xml;base64,mock',
    imageWidth: 800,
    imageHeight: 1000,
    isFlippedHorizontal: false,
    methods: {
      ...INITIAL_PROJECT_STATE.methods,
      loomis: {
        center: { x: 400, y: 420 },
        radius: 200,
        browLineY: 420,
        noseLineY: 550,
        chinY: 680,
        jawWidth: 180,
        tiltAngle: 5,
      },
      triangulation: {
        measurements: [
          {
            id: 'm1',
            start: { x: 300, y: 400 },
            end: { x: 500, y: 400 },
            label: 'Eye Span',
            color: '#38bdf8',
            ratioToBaseUnit: 1.0,
          },
        ],
        baseUnitDistance: 200,
      },
    },
  };

  const flipped = toggleFlipHorizontal(customState);

  // View state changed
  assert.equal(flipped.isFlippedHorizontal, true);

  // Stored measurements and anchors remain unaltered in native coordinates
  assert.deepEqual(flipped.methods.loomis, customState.methods.loomis);
  assert.deepEqual(flipped.methods.reilly, customState.methods.reilly);
  assert.deepEqual(flipped.methods.bargue, customState.methods.bargue);
  assert.deepEqual(flipped.methods.triangulation, customState.methods.triangulation);
  assert.deepEqual(flipped.grid, customState.grid);
  assert.deepEqual(flipped.calibration, customState.calibration);
  assert.deepEqual(flipped.paperMapping, customState.paperMapping);
  assert.deepEqual(flipped.cutPoints, customState.cutPoints);
  assert.equal(flipped.imageSrc, customState.imageSrc);
  assert.equal(flipped.imageWidth, customState.imageWidth);
  assert.equal(flipped.imageHeight, customState.imageHeight);
});

test('computeCanvasTransform generates valid CSS transform string', () => {
  assert.equal(
    computeCanvasTransform({ x: 0, y: 0 }, 1, false),
    'translate(0px, 0px) scale(1)'
  );
  assert.equal(
    computeCanvasTransform({ x: 45, y: -20 }, 1.25, false),
    'translate(45px, -20px) scale(1.25)'
  );
  assert.equal(
    computeCanvasTransform({ x: 45, y: -20 }, 1.25, true),
    'translate(45px, -20px) scale(1.25) scaleX(-1)'
  );
});

test('mapPointerToNativeX calculates native coordinate space for unflipped and flipped views', () => {
  const width = 1000;
  const rect = { left: 100, width: 500 }; // 0.5x zoom or smaller bounding client rect

  // Pointer at 25% across the screen box (clientX = 100 + 125 = 225)
  // Unflipped: 25% of 1000 = 250
  assert.equal(
    mapPointerToNativeX(225, rect, width, false),
    250
  );

  // Flipped: 25% from left of screen corresponds to 75% in native image coordinates = 750
  assert.equal(
    mapPointerToNativeX(225, rect, width, true),
    750
  );

  // Clamps to [0, width]
  assert.equal(
    mapPointerToNativeX(50, rect, width, false),
    0
  );
  assert.equal(
    mapPointerToNativeX(700, rect, width, false),
    1000
  );
  assert.equal(
    mapPointerToNativeX(50, rect, width, true),
    1000
  );
  assert.equal(
    mapPointerToNativeX(700, rect, width, true),
    0
  );
});
