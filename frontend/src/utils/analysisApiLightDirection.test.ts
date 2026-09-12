import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleLightDirectionToImageSpace } from './analysisApi';
import type { LightDirectionResult } from '../types/lightDirection';

test('scaleLightDirectionToImageSpace scales terminator line and centroids to native dimensions', () => {
  const cappedResult: LightDirectionResult = {
    angleDeg: 135,
    directionLabel: 'Top-Left (135°)',
    source: 'estimated',
    terminatorLine: {
      p1: { x: 100, y: 150 },
      p2: { x: 300, y: 350 },
    },
    shadowCentroid: { x: 250, y: 280 },
    litCentroid: { x: 150, y: 180 },
  };

  const size = {
    width: 400,
    height: 500,
    scale: 0.5,
  };

  const nativeWidth = 800;
  const nativeHeight = 1000;

  const scaled = scaleLightDirectionToImageSpace(cappedResult, size, nativeWidth, nativeHeight);

  assert.equal(scaled.angleDeg, 135);
  assert.equal(scaled.directionLabel, 'Top-Left (135°)');
  assert.equal(scaled.source, 'estimated');

  assert.equal(scaled.terminatorLine.p1.x, 200);
  assert.equal(scaled.terminatorLine.p1.y, 300);
  assert.equal(scaled.terminatorLine.p2.x, 600);
  assert.equal(scaled.terminatorLine.p2.y, 700);

  assert.equal(scaled.shadowCentroid?.x, 500);
  assert.equal(scaled.shadowCentroid?.y, 560);
  assert.equal(scaled.litCentroid?.x, 300);
  assert.equal(scaled.litCentroid?.y, 360);
});
