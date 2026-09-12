import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MediumFooterSelector } from './MediumFooterSelector';
import type { MediumType } from '../../types/studio';

test('MediumFooterSelector renders distinct, active selector buttons for Graphite and Charcoal', () => {
  const html = renderToStaticMarkup(
    <MediumFooterSelector currentMedium="graphite" onChangeMedium={() => {}} />
  );

  // Must NOT be the old combined static label
  assert.ok(!html.includes('Graphite &amp; Charcoal'), 'Must not render combined "Graphite & Charcoal" label');

  // Must render Graphite button
  assert.match(html, /Graphite/i);

  // Must render Charcoal button
  assert.match(html, /Charcoal/i);
});

test('MediumFooterSelector marks oil and watercolor as disabled planned extensions', () => {
  const html = renderToStaticMarkup(
    <MediumFooterSelector currentMedium="graphite" onChangeMedium={() => {}} />
  );

  // Oil and Watercolor must remain disabled per ADR-0005
  assert.match(html, /disabled=""[^>]*title="Oil Painting \(planned extension\)"/i);
  assert.match(html, /disabled=""[^>]*title="Watercolor \(planned extension\)"/i);
});

test('MediumFooterSelector indicates current active medium with aria-pressed', () => {
  const graphiteHtml = renderToStaticMarkup(
    <MediumFooterSelector currentMedium="graphite" onChangeMedium={() => {}} />
  );
  assert.match(graphiteHtml, /aria-label="Graphite"[^>]*aria-pressed="true"/);
  assert.match(graphiteHtml, /aria-label="Charcoal"[^>]*aria-pressed="false"/);

  const charcoalHtml = renderToStaticMarkup(
    <MediumFooterSelector currentMedium="charcoal" onChangeMedium={() => {}} />
  );
  assert.match(charcoalHtml, /aria-label="Charcoal"[^>]*aria-pressed="true"/);
  assert.match(charcoalHtml, /aria-label="Graphite"[^>]*aria-pressed="false"/);
});
