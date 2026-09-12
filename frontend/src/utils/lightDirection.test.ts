import test from 'node:test';
import assert from 'node:assert/strict';
import {
  directionLabelFromAngle,
  normalizeAngle,
  calculateTerminatorLine,
  setLightAngle,
  toggleTerminator,
  applyEstimatedLightDirection,
  estimateLightDirectionFromCentroids,
  declaredSourceLabel,
} from './lightDirection';
import type { DrawingMethodState } from '../types/studio';
import type { LightDirectionResult } from '../types/lightDirection';

const mockAsaroState = (): DrawingMethodState['asaro'] => ({
  planesOpacity: 0.7,
  lightAngleDeg: 45,
  showTerminator: true,
  terminatorSource: 'default',
});

test('normalizeAngle wraps angles into [0, 360) range', () => {
  assert.equal(normalizeAngle(0), 0);
  assert.equal(normalizeAngle(360), 0);
  assert.equal(normalizeAngle(720), 0);
  assert.equal(normalizeAngle(-90), 270);
  assert.equal(normalizeAngle(405), 45);
  assert.equal(normalizeAngle(-45), 315);
});

test('directionLabelFromAngle formats human-readable quadrant labels', () => {
  assert.equal(directionLabelFromAngle(0), 'Right (0°)');
  assert.equal(directionLabelFromAngle(45), 'Top-Right (45°)');
  assert.equal(directionLabelFromAngle(90), 'Top (90°)');
  assert.equal(directionLabelFromAngle(135), 'Top-Left (135°)');
  assert.equal(directionLabelFromAngle(180), 'Left (180°)');
  assert.equal(directionLabelFromAngle(225), 'Bottom-Left (225°)');
  assert.equal(directionLabelFromAngle(270), 'Bottom (270°)');
  assert.equal(directionLabelFromAngle(315), 'Bottom-Right (315°)');
});

test('calculateTerminatorLine generates perpendicular line dividing lit and shadow sides', () => {
  const width = 800;
  const height = 1000;
  const angleDeg = 135; // Top-Left light

  const line = calculateTerminatorLine(width, height, angleDeg);

  assert.ok(line.p1);
  assert.ok(line.p2);

  // Line should span across the center (400, 500)
  const midX = (line.p1.x + line.p2.x) / 2;
  const midY = (line.p1.y + line.p2.y) / 2;
  assert.ok(Math.abs(midX - 400) < 1e-3);
  assert.ok(Math.abs(midY - 500) < 1e-3);

  // For 135 deg light (dx < 0, dy > 0 in cartesian; up is negative y in screen),
  // the perpendicular vector (sin, cos) in screen space creates a line from
  // bottom-left to top-right:
  // p1 = center - halfLen * (sin(135), cos(135)) -> x decreases, y increases (bottom-left)
  // p2 = center + halfLen * (sin(135), cos(135)) -> x increases, y decreases (top-right)
  assert.ok(line.p1.x < line.p2.x);
  assert.ok(line.p1.y > line.p2.y);
});

test('calculateTerminatorLine respects custom centerPoint and lineLength', () => {
  const line = calculateTerminatorLine(600, 800, 90, { x: 300, y: 350 }, 200);

  // 90 deg light is straight Top (light comes from top, normal points up)
  // Perpendicular tangent runs purely horizontally: sin(90) = 1, cos(90) = 0
  assert.equal(line.p1.y, 350);
  assert.equal(line.p2.y, 350);
  assert.equal(line.p1.x, 200);
  assert.equal(line.p2.x, 400);
});

test('setLightAngle updates angle, marks source as manual, and recalculates line', () => {
  const initial = mockAsaroState();
  const updated = setLightAngle(initial, 135, 800, 1000, 'manual');

  assert.equal(updated.lightAngleDeg, 135);
  assert.equal(updated.terminatorSource, 'manual');
  assert.ok(updated.terminatorLine);
  assert.notEqual(updated.terminatorLine, initial.terminatorLine);
});

test('toggleTerminator toggles showTerminator boolean flag', () => {
  const initial = mockAsaroState();
  assert.equal(initial.showTerminator, true);

  const toggledOff = toggleTerminator(initial, false);
  assert.equal(toggledOff.showTerminator, false);

  const toggledOn = toggleTerminator(toggledOff);
  assert.equal(toggledOn.showTerminator, true);
});

test('applyEstimatedLightDirection merges estimated angle, terminatorLine, and sets estimated source', () => {
  const initial = mockAsaroState();
  const estimation: LightDirectionResult = {
    angleDeg: 125,
    directionLabel: 'Top-Left (125°)',
    source: 'estimated',
    terminatorLine: {
      p1: { x: 250, y: 600 },
      p2: { x: 450, y: 300 },
    },
    shadowCentroid: { x: 480, y: 550 },
    litCentroid: { x: 310, y: 320 },
  };

  const applied = applyEstimatedLightDirection(initial, estimation);

  assert.equal(applied.lightAngleDeg, 125);
  assert.equal(applied.terminatorSource, 'estimated');
  assert.deepEqual(applied.terminatorLine, estimation.terminatorLine);
  assert.equal(applied.showTerminator, true);
});

test('estimateLightDirectionFromCentroids accurately computes light direction and terminator', () => {
  // Lit mass is at top-left (300, 250), shadow mass is at bottom-right (450, 500) on an 800x1000 portrait
  const litCentroid = { x: 300, y: 250 };
  const shadowCentroid = { x: 450, y: 500 };

  const result = estimateLightDirectionFromCentroids(800, 1000, shadowCentroid, litCentroid);

  assert.equal(result.source, 'estimated');
  // dx = 300 - 450 = -150; dy = 500 - 250 = +250 (upwards)
  // atan2(250, -150) in deg is ~121 deg (Top-Left)
  assert.ok(result.angleDeg >= 115 && result.angleDeg <= 130);
  assert.ok(result.directionLabel.includes('Top-Left'));

  // The terminator line center sits halfway between centroids (375, 375)
  const lineMidX = (result.terminatorLine.p1.x + result.terminatorLine.p2.x) / 2;
  const lineMidY = (result.terminatorLine.p1.y + result.terminatorLine.p2.y) / 2;
  assert.ok(Math.abs(lineMidX - 375) < 1);
  assert.ok(Math.abs(lineMidY - 375) < 1);
});

test('declaredSourceLabel follows CONTEXT.md Declared Source rules', () => {
  // Never presents an estimate as a measured fact
  assert.equal(declaredSourceLabel('estimated'), 'Estimated from histogram & shadow shape');
  assert.equal(declaredSourceLabel('manual'), 'Manually adjusted');
  assert.equal(declaredSourceLabel('default'), 'Default estimate (45°)');
});
