import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MethodOverlays } from './MethodOverlays';
import { INITIAL_PROJECT_STATE } from '../../utils/initialProjectState';
import type { DrawingMethodState } from '../../types/studio';

const noop = () => {};

test('MethodOverlays renders Asaro planar head and terminator line when showTerminator is true', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'asaro',
    asaro: {
      planesOpacity: 0.7,
      lightAngleDeg: 135,
      showTerminator: true,
      terminatorSource: 'estimated',
      terminatorLine: {
        p1: { x: 250, y: 650 },
        p2: { x: 450, y: 350 },
      },
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  // Contains Asaro planar facets
  assert.ok(html.includes('polygon'));
  // Contains Terminator line
  assert.ok(html.includes('terminator-line'));
  assert.ok(html.includes('x1="250"'));
  assert.ok(html.includes('y1="650"'));
  assert.ok(html.includes('x2="450"'));
  assert.ok(html.includes('y2="350"'));
  // Contains label
  assert.ok(html.includes('Terminator'));
  // Contains light direction ray / indicator
  assert.ok(html.includes('light-direction-ray'));
});

test('MethodOverlays suppresses terminator line when showTerminator is false', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'asaro',
    asaro: {
      planesOpacity: 0.7,
      lightAngleDeg: 45,
      showTerminator: false,
      terminatorSource: 'default',
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  // Facets rendered
  assert.ok(html.includes('polygon'));
  // Terminator NOT rendered
  assert.ok(!html.includes('terminator-line'));
  assert.ok(!html.includes('light-direction-ray'));
});

test('MethodOverlays counter-mirrors terminator label when isFlippedHorizontal is true', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'asaro',
    asaro: {
      planesOpacity: 0.7,
      lightAngleDeg: 135,
      showTerminator: true,
      terminatorSource: 'estimated',
      terminatorLine: {
        p1: { x: 250, y: 650 },
        p2: { x: 450, y: 350 },
      },
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
      isFlippedHorizontal={true}
    />
  );

  assert.ok(html.includes('terminator-line'));
  // Counter-mirroring scale(-1, 1) applied to text
  assert.ok(html.includes('scale(-1, 1)'));
});

test('MethodOverlays visibly distinguishes detected, estimated, and fallback anchors in Loomis', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'loomis',
    showAnchorPoints: true,
    loomis: {
      center: { x: 300, y: 340, source: 'detected' },
      radius: 170,
      radiusSource: 'estimated',
      browLineY: 340,
      browSource: 'detected',
      noseLineY: 440,
      chinY: 550,
      chinSource: 'detected',
      jawWidth: 150,
      tiltAngle: 0,
      sources: {
        center: 'detected',
        radius: 'estimated',
        browLineY: 'detected',
        chinY: 'detected',
      },
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  // Center is detected (emerald #10b981)
  assert.ok(html.includes('data-source="detected"'));
  assert.ok(html.includes('fill="#10b981"'));
  assert.ok(html.includes('anchor-detected'));
  assert.ok(html.includes('Loomis Center: detected'));

  // Ball size (radius) is estimated (amber #f59e0b)
  assert.ok(html.includes('data-source="estimated"'));
  assert.ok(html.includes('fill="#f59e0b"'));
  assert.ok(html.includes('anchor-estimated'));
  assert.ok(html.includes('Loomis Ball Size: estimated'));
});

test('MethodOverlays visibly marks fallback anchors in Loomis and Reilly', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'reilly',
    showAnchorPoints: true,
    reilly: {
      browCenter: { x: 300, y: 330, source: 'fallback' },
      noseTip: { x: 300, y: 440, source: 'fallback' },
      mouthCenter: { x: 300, y: 500, source: 'fallback' },
      chinBottom: { x: 300, y: 550, source: 'fallback' },
      leftEye: { x: 235, y: 345, source: 'fallback' },
      rightEye: { x: 365, y: 345, source: 'fallback' },
      leftJaw: { x: 190, y: 460, source: 'fallback' },
      rightJaw: { x: 410, y: 460, source: 'fallback' },
      leftTemple: { x: 180, y: 280, source: 'fallback' },
      rightTemple: { x: 420, y: 280, source: 'fallback' },
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  // Fallback anchors render in rose #f43f5e with dashed stroke and anchor-fallback class
  assert.ok(html.includes('data-source="fallback"'));
  assert.ok(html.includes('fill="#f43f5e"'));
  assert.ok(html.includes('anchor-fallback'));
  assert.ok(html.includes('stroke-dasharray="2,2"'));
  assert.ok(html.includes('leftEye: fallback'));
});

