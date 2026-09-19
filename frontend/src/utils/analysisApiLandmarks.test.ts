import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleLandmarksToImageSpace } from './analysisApi';
import type { LandmarkStats } from '../types/studio';
import type { RenderSize } from './renderScale';

test('scaleLandmarksToImageSpace rescales detected response and preserves per-anchor Declared Source', () => {
  const cappedLandmarks: LandmarkStats = {
    loomis: {
      center: { x: 200, y: 150, source: 'detected' },
      radius: { value: 80, source: 'estimated' },
      browLineY: { value: 140, source: 'detected' },
      noseLineY: { value: 170, source: 'detected' },
      chinY: { value: 230, source: 'detected' },
      jawWidth: { value: 90, source: 'detected' },
      tiltAngle: { value: 5.5, source: 'detected' },
    },
    reilly: {
      browCenter: { x: 200, y: 130, source: 'detected' },
      noseTip: { x: 200, y: 170, source: 'detected' },
      mouthCenter: { x: 200, y: 200, source: 'detected' },
      chinBottom: { x: 200, y: 230, source: 'detected' },
      leftEye: { x: 170, y: 145, source: 'detected' },
      rightEye: { x: 230, y: 145, source: 'detected' },
      leftJaw: { x: 155, y: 210, source: 'detected' },
      rightJaw: { x: 245, y: 210, source: 'detected' },
      leftTemple: { x: 150, y: 140, source: 'detected' },
      rightTemple: { x: 250, y: 140, source: 'detected' },
    },
  };

  const renderSize: RenderSize = {
    width: 400,
    height: 500,
    scale: 0.5, // Native size is 800x1000, so scale factor is 0.5 (coordinates double)
  };

  const rescaled = scaleLandmarksToImageSpace(cappedLandmarks, renderSize);

  // Check coordinates rescaled (doubled)
  assert.equal(rescaled.loomis.center.x, 400);
  assert.equal(rescaled.loomis.center.y, 300);
  assert.equal(rescaled.loomis.radius, 160);
  assert.equal(rescaled.loomis.browLineY, 280);
  assert.equal(rescaled.loomis.noseLineY, 340);
  assert.equal(rescaled.loomis.chinY, 460);
  assert.equal(rescaled.loomis.jawWidth, 180);
  assert.equal(rescaled.loomis.tiltAngle, 5.5);

  // Check Declared Sources
  assert.equal(rescaled.loomis.center.source, 'detected');
  assert.equal(rescaled.loomis.sources?.radius, 'estimated');
  assert.equal(rescaled.loomis.sources?.center, 'detected');
  assert.equal(rescaled.loomis.sources?.browLineY, 'detected');
  assert.equal(rescaled.loomis.sources?.chinY, 'detected');
  assert.equal(rescaled.loomis.sources?.jawWidth, 'detected');
  assert.equal(rescaled.loomis.sources?.tiltAngle, 'detected');

  // Check Reilly points rescaled and sources preserved
  assert.equal(rescaled.reilly.leftEye.x, 340);
  assert.equal(rescaled.reilly.leftEye.y, 290);
  assert.equal(rescaled.reilly.leftEye.source, 'detected');

  assert.equal(rescaled.reilly.rightEye.x, 460);
  assert.equal(rescaled.reilly.rightEye.y, 290);
  assert.equal(rescaled.reilly.rightEye.source, 'detected');

  assert.equal(rescaled.reilly.noseTip.x, 400);
  assert.equal(rescaled.reilly.noseTip.y, 340);
  assert.equal(rescaled.reilly.noseTip.source, 'detected');

  assert.equal(rescaled.reilly.chinBottom.x, 400);
  assert.equal(rescaled.reilly.chinBottom.y, 460);
  assert.equal(rescaled.reilly.chinBottom.source, 'detected');
});

test('scaleLandmarksToImageSpace rescales fallback response and preserves fallback Declared Source', () => {
  const fallbackLandmarks: LandmarkStats = {
    loomis: {
      center: { x: 300, y: 270, source: 'fallback' },
      radius: { value: 120, source: 'fallback' },
      browLineY: { value: 270, source: 'fallback' },
      noseLineY: { value: 340, source: 'fallback' },
      chinY: { value: 420, source: 'fallback' },
      jawWidth: { value: 110, source: 'fallback' },
      tiltAngle: 0,
    },
    reilly: {
      browCenter: { x: 300, y: 260, source: 'fallback' },
      noseTip: { x: 300, y: 340, source: 'fallback' },
      mouthCenter: { x: 300, y: 380, source: 'fallback' },
      chinBottom: { x: 300, y: 420, source: 'fallback' },
      leftEye: { x: 250, y: 270, source: 'fallback' },
      rightEye: { x: 350, y: 270, source: 'fallback' },
      leftJaw: { x: 220, y: 350, source: 'fallback' },
      rightJaw: { x: 380, y: 350, source: 'fallback' },
      leftTemple: { x: 210, y: 220, source: 'fallback' },
      rightTemple: { x: 390, y: 220, source: 'fallback' },
    },
  };

  const renderSize: RenderSize = {
    width: 600,
    height: 800,
    scale: 1.0,
  };

  const rescaled = scaleLandmarksToImageSpace(fallbackLandmarks, renderSize);

  assert.equal(rescaled.loomis.center.source, 'fallback');
  assert.equal(rescaled.loomis.sources?.radius, 'fallback');
  assert.equal(rescaled.loomis.sources?.browLineY, 'fallback');
  assert.equal(rescaled.loomis.sources?.tiltAngle, 'fallback');

  for (const [key, pt] of Object.entries(rescaled.reilly)) {
    assert.equal(pt.source, 'fallback', `Expected reilly.${key} to have source 'fallback'`);
  }
});
