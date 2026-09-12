import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EdgeQualityOverlay } from './EdgeQualityOverlay';
import { createInitialEdgeQualityState, addSegment } from '../../utils/edgeQuality';
import type { EdgeQualityState } from '../../types/edgeQuality';

const noop = () => {};

test('EdgeQualityOverlay returns null when enabled is false', () => {
  const state: EdgeQualityState = {
    ...createInitialEdgeQualityState(),
    enabled: false,
  };

  const html = renderToStaticMarkup(
    <EdgeQualityOverlay
      width={800}
      height={1000}
      state={state}
      onChange={noop}
    />
  );

  assert.equal(html, '');
});

test('EdgeQualityOverlay renders Hard, Soft, and Lost edges with visually distinct styles', () => {
  let state = createInitialEdgeQualityState();
  state = { ...state, enabled: true };

  state = addSegment(state, {
    quality: 'hard',
    points: [{ id: 'p1', x: 50, y: 50 }, { id: 'p2', x: 150, y: 150 }],
    label: 'Cast shadow',
  });

  state = addSegment(state, {
    quality: 'soft',
    points: [{ id: 'p3', x: 200, y: 100 }, { id: 'p4', x: 300, y: 200 }],
    label: 'Cheek turning form',
  });

  state = addSegment(state, {
    quality: 'lost',
    points: [{ id: 'p5', x: 350, y: 300 }, { id: 'p6', x: 450, y: 400 }],
    label: 'Hair merge',
  });

  const html = renderToStaticMarkup(
    <EdgeQualityOverlay
      width={800}
      height={1000}
      state={state}
      onChange={noop}
    />
  );

  // SVG element present
  assert.match(html, /<svg/);

  // Hard edge: solid crimson/rose
  assert.match(html, /stroke="#f43f5e"/i);
  assert.match(html, /stroke-dasharray="none"/i);

  // Soft edge: dashed amber + soft halo
  assert.match(html, /stroke="#f59e0b"/i);
  assert.match(html, /stroke-dasharray="8,5"/i);

  // Lost edge: dotted violet
  assert.match(html, /stroke="#a855f7"/i);
  assert.match(html, /stroke-dasharray="2,6"/i);
});

test('EdgeQualityOverlay respects active quality filter', () => {
  let state = createInitialEdgeQualityState();
  state = { ...state, enabled: true };

  state = addSegment(state, {
    quality: 'hard',
    points: [{ id: 'p1', x: 50, y: 50 }, { id: 'p2', x: 150, y: 150 }],
  });

  state = addSegment(state, {
    quality: 'soft',
    points: [{ id: 'p3', x: 200, y: 100 }, { id: 'p4', x: 300, y: 200 }],
  });

  // Filter for only 'hard'
  const hardOnlyState = { ...state, filter: 'hard' as const };
  const html = renderToStaticMarkup(
    <EdgeQualityOverlay
      width={800}
      height={1000}
      state={hardOnlyState}
      onChange={noop}
    />
  );

  assert.match(html, /#f43f5e/i); // Hard edge present
  assert.doesNotMatch(html, /#f59e0b/i); // Soft edge excluded
});

test('EdgeQualityOverlay counter-mirrors label text when isFlippedHorizontal is true', () => {
  let state = createInitialEdgeQualityState();
  state = {
    ...state,
    enabled: true,
    segments: [
      {
        id: 'seg-1',
        quality: 'hard',
        points: [{ id: 'p1', x: 100, y: 100 }, { id: 'p2', x: 200, y: 200 }],
        label: 'Cast Edge',
      },
    ],
  };

  const htmlFlipped = renderToStaticMarkup(
    <EdgeQualityOverlay
      width={800}
      height={1000}
      state={state}
      onChange={noop}
      isFlippedHorizontal={true}
    />
  );

  assert.match(htmlFlipped, /transform:scaleX\(-1\)/);
});
