import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MethodSelectorPanel } from './MethodSelectorPanel';
import { INITIAL_PROJECT_STATE } from '../../utils/initialProjectState';
import type { DrawingMethodState, LandmarkAnalysisState } from '../../types/studio';

const noop = () => {};
const mockLandmarks: LandmarkAnalysisState = { status: 'idle' };

test('MethodSelectorPanel renders Asaro Light Direction and Declared Source when asaro is active', () => {
  const methods: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'asaro',
    asaro: {
      planesOpacity: 0.7,
      lightAngleDeg: 135,
      showTerminator: true,
      terminatorSource: 'estimated',
      terminatorLine: {
        p1: { x: 200, y: 600 },
        p2: { x: 400, y: 300 },
      },
    },
  };

  const html = renderToStaticMarkup(
    <MethodSelectorPanel
      methods={methods}
      landmarks={mockLandmarks}
      onChange={noop}
      onOpenTeachingMode={noop}
      onRetryLandmarks={noop}
      onEstimateLightDirection={noop}
    />
  );

  // Section title
  assert.ok(html.includes('Light Direction &amp; Terminator') || html.includes('Light Direction & Terminator'));
  // Declared Source requirement
  assert.ok(html.includes('Estimated from histogram &amp; shadow shape') || html.includes('Estimated from histogram & shadow shape'));
  // Direction label
  assert.ok(html.includes('Top-Left'));
  assert.ok(html.includes('135°'));
  // Action button
  assert.ok(html.includes('Estimate from Photo'));
  // Toggle
  assert.ok(html.includes('Terminator Line Visible') || html.includes('Terminator Visible'));
});

test('MethodSelectorPanel renders manual source label when light angle was adjusted', () => {
  const methods: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'asaro',
    asaro: {
      planesOpacity: 0.7,
      lightAngleDeg: 90,
      showTerminator: true,
      terminatorSource: 'manual',
    },
  };

  const html = renderToStaticMarkup(
    <MethodSelectorPanel
      methods={methods}
      landmarks={mockLandmarks}
      onChange={noop}
      onOpenTeachingMode={noop}
      onRetryLandmarks={noop}
    />
  );

  assert.ok(html.includes('Manually adjusted'));
  assert.ok(html.includes('Top (90°)'));
});

test('MethodSelectorPanel does not render Asaro lighting controls when another method is active', () => {
  const methods: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'loomis',
  };

  const html = renderToStaticMarkup(
    <MethodSelectorPanel
      methods={methods}
      landmarks={mockLandmarks}
      onChange={noop}
      onOpenTeachingMode={noop}
      onRetryLandmarks={noop}
    />
  );

  assert.ok(!html.includes('Estimate from Photo'));
  assert.ok(!html.includes('Light Direction &amp; Terminator'));
});
