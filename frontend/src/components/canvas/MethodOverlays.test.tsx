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
