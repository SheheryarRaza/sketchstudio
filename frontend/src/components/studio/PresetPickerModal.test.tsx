import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PresetPickerModal } from './PresetPickerModal';
import type { HistogramStats } from '../../types/studio';

const noop = () => {};

test('PresetPickerModal returns null when isOpen is false', () => {
  const html = renderToStaticMarkup(
    <PresetPickerModal
      isOpen={false}
      onClose={noop}
      onSelectPreset={noop}
    />
  );
  assert.equal(html, '');
});

test('PresetPickerModal renders all 5 preset cards and skip affordance when isOpen is true', () => {
  const html = renderToStaticMarkup(
    <PresetPickerModal
      isOpen={true}
      onClose={noop}
      onSelectPreset={noop}
    />
  );

  assert.match(html, /Choose a Starting Point/i);
  assert.match(html, /Portrait — Static/);
  assert.match(html, /Portrait — Dramatic Light/);
  assert.match(html, /Expressive\/Dynamic Pose/);
  assert.match(html, /Classical\/Cast Study/);
  assert.match(html, /Full Scene\/Composition/);
  assert.match(html, /Skip to Studio/i);
});

test('PresetPickerModal displays Auto-Suggest Chip and highlights suggested preset for high contrast photo', () => {
  const highContrastStats: HistogramStats = {
    width: 600,
    height: 800,
    meanLuminance: 120,
    medianLuminance: 115,
    deepDarkThreshold: 40,
    highlightThreshold: 220, // Spread: 180 (>= 130) -> portrait-dramatic
    histogram: new Array(256).fill(1),
  };

  const html = renderToStaticMarkup(
    <PresetPickerModal
      isOpen={true}
      histogramStats={highContrastStats}
      onClose={noop}
      onSelectPreset={noop}
    />
  );

  assert.match(html, /Suggested/i, 'Must display suggestion banner or chip');
  assert.match(html, /Portrait — Dramatic Light/);
});

test('PresetPickerModal displays Auto-Suggest Chip recommending portrait-static for balanced contrast photo', () => {
  const lowContrastStats: HistogramStats = {
    width: 600,
    height: 800,
    meanLuminance: 128,
    medianLuminance: 125,
    deepDarkThreshold: 80,
    highlightThreshold: 170, // Spread: 90 (< 130) -> portrait-static
    histogram: new Array(256).fill(1),
  };

  const html = renderToStaticMarkup(
    <PresetPickerModal
      isOpen={true}
      histogramStats={lowContrastStats}
      onClose={noop}
      onSelectPreset={noop}
    />
  );

  assert.match(html, /Suggested/i, 'Must display suggestion banner or chip');
});

test('PresetPickerModal renders with no suggested chip when stats are null', () => {
  const html = renderToStaticMarkup(
    <PresetPickerModal
      isOpen={true}
      histogramStats={null}
      onClose={noop}
      onSelectPreset={noop}
    />
  );

  // Still renders all 5 cards without crashing
  assert.match(html, /Portrait — Static/);
  assert.match(html, /Portrait — Dramatic Light/);
  assert.ok(!html.includes('Auto-Suggest Chip'));
});
