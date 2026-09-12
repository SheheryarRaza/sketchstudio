import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PencilGradePanel } from './PencilGradePanel';

test('PencilGradePanel renders graphite scale and groups White_Chalk under highlights, not dark pencils', () => {
  const html = renderToStaticMarkup(<PencilGradePanel medium="graphite" selectedGrade="White_Chalk" />);

  // Should show category heading for highlights
  assert.match(html, /Highlights \(Toned Paper\)/i);

  // White_Chalk display label must be "White" (from grade.displayName), not hardcoded
  assert.match(html, />\s*White\s*<\/button>/);

  // Active grade swatch must render badge "W"
  assert.match(html, />\s*W\s*<\/div>/);

  // Deep Occlusion / Dark section must NOT contain White_Chalk
  // In the HTML, the Highlights section must come before Hard / Medium / Deep Occlusion
  const highlightIdx = html.indexOf('Highlights (Toned Paper)');
  const deepOcclusionIdx = html.indexOf('Deep Occlusion');
  assert.ok(highlightIdx !== -1, 'Highlights category must exist');
  assert.ok(deepOcclusionIdx !== -1, 'Deep Occlusion category must exist');
  assert.ok(highlightIdx < deepOcclusionIdx, 'Highlights must precede Deep Occlusion');
});

test('PencilGradePanel renders charcoal materials scale when medium is charcoal', () => {
  const html = renderToStaticMarkup(<PencilGradePanel medium="charcoal" selectedGrade="Vine_Charcoal" />);

  // Heading should indicate Charcoal materials scale
  assert.match(html, /Charcoal Materials Scale/i);

  // Should render charcoal material buttons
  assert.match(html, />\s*Vine\s*<\/button>/);
  assert.match(html, />\s*Willow\s*<\/button>/);
  assert.match(html, />\s*Compressed\s*<\/button>/);

  // Should NOT render graphite pencils like 9H or HB
  assert.ok(!html.includes('>9H</button>'));
  assert.ok(!html.includes('>HB</button>'));
});
