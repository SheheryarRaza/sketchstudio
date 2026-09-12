import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TeachingModeDrawer } from './TeachingModeDrawer';
import { DRAWING_METHODS_DATABASE } from '../../types/methods';
import type { DrawingMethodType } from '../../types/studio';

const noop = () => {};

test('Every DrawingMethod entry in DRAWING_METHODS_DATABASE has an explicit shortLabel field', () => {
  const methodKeys: DrawingMethodType[] = ['none', 'loomis', 'reilly', 'bargue', 'asaro', 'triangulation', 'harmonic'];
  for (const key of methodKeys) {
    const entry = DRAWING_METHODS_DATABASE[key];
    assert.ok(
      typeof (entry as { shortLabel?: string }).shortLabel === 'string' &&
        (entry as { shortLabel?: string }).shortLabel!.length > 0,
      `Method ${key} must have a non-empty shortLabel`
    );
  }
});

test('TeachingModeDrawer tabs render method shortLabel and not truncated first word of title', () => {
  const html = renderToStaticMarkup(
    <TeachingModeDrawer
      isOpen={true}
      initialMethod="loomis"
      onClose={noop}
      onApplyMethod={noop}
    />
  );

  // Bargue method must render "Bargue", never "Charles"
  assert.match(html, />\s*Bargue\s*</, 'Bargue tab must read "Bargue"');
  assert.doesNotMatch(html, />\s*Charles\s*</, 'Bargue tab must not read "Charles"');

  // Comparative measurement must render "Comparative"
  assert.match(html, />\s*Comparative\s*</, 'Triangulation tab must read "Comparative"');

  // Other method tabs
  assert.match(html, />\s*Loomis\s*</, 'Loomis tab must read "Loomis"');
  assert.match(html, />\s*Reilly\s*</, 'Reilly tab must read "Reilly"');
  assert.match(html, />\s*Asaro\s*</, 'Asaro tab must read "Asaro"');
  assert.match(html, />\s*Harmonic\s*</, 'Harmonic tab must read "Harmonic"');
});
