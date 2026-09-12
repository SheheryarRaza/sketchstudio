import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EdgeQualityToolbar } from './EdgeQualityToolbar';
import { createInitialEdgeQualityState, addSegment } from '../../utils/edgeQuality';
import type { EdgeQualityState } from '../../types/edgeQuality';

const noop = () => {};

test('EdgeQualityToolbar returns null when state.enabled is false', () => {
  const state: EdgeQualityState = {
    ...createInitialEdgeQualityState(),
    enabled: false,
  };

  const html = renderToStaticMarkup(
    <EdgeQualityToolbar
      state={state}
      onChange={noop}
      onSuggestEdges={noop}
      isLoadingSuggestions={false}
    />
  );

  assert.equal(html, '');
});

test('EdgeQualityToolbar renders Hard, Soft, and Lost quality buttons when enabled', () => {
  let state = createInitialEdgeQualityState();
  state = { ...state, enabled: true, activeQuality: 'soft' };

  const html = renderToStaticMarkup(
    <EdgeQualityToolbar
      state={state}
      onChange={noop}
      onSuggestEdges={noop}
      isLoadingSuggestions={false}
    />
  );

  // Quality buttons
  assert.match(html, /Hard/);
  assert.match(html, /Soft/);
  assert.match(html, /Lost/);

  // Soft button is marked active
  assert.match(html, /aria-pressed="true"[^>]*>[\s\S]*?Soft/);

  // Mode buttons (Draw, Select)
  assert.match(html, /Draw/);
  assert.match(html, /Select/);

  // Suggest Edges button
  assert.match(html, /Suggest Edges/);
});

test('EdgeQualityToolbar renders edge quality tallies accurately', () => {
  let state = createInitialEdgeQualityState();
  state = { ...state, enabled: true };
  state = addSegment(state, { quality: 'hard', points: [{ id: 'p1', x: 0, y: 0 }, { id: 'p2', x: 10, y: 10 }] });
  state = addSegment(state, { quality: 'hard', points: [{ id: 'p3', x: 20, y: 20 }, { id: 'p4', x: 30, y: 30 }] });
  state = addSegment(state, { quality: 'lost', points: [{ id: 'p5', x: 40, y: 40 }, { id: 'p6', x: 50, y: 50 }] });

  const html = renderToStaticMarkup(
    <EdgeQualityToolbar
      state={state}
      onChange={noop}
      onSuggestEdges={noop}
      isLoadingSuggestions={false}
    />
  );

  // Count tallies present
  assert.match(html, /2\s*Hard/i);
  assert.match(html, /1\s*Lost/i);
});

test('EdgeQualityToolbar shows loading spinner when suggestions are fetching', () => {
  const state: EdgeQualityState = {
    ...createInitialEdgeQualityState(),
    enabled: true,
  };

  const html = renderToStaticMarkup(
    <EdgeQualityToolbar
      state={state}
      onChange={noop}
      onSuggestEdges={noop}
      isLoadingSuggestions={true}
    />
  );

  assert.match(html, /Detecting…|Detecting/);
});
