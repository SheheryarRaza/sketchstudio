import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopStrip } from './TopStrip';
import { INITIAL_PROJECT_STATE } from '../../utils/initialProjectState';
import type { ProjectState } from '../../types/studio';

const noop = () => {};

const renderStrip = (state: Partial<ProjectState> = {}) => {
  const project: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    ...state,
  };
  return renderToStaticMarkup(
    <TopStrip
      project={project}
      onSelectStage={noop}
      onToggleSandbox={noop}
      onLoadImageFile={noop}
      onOpenCaliper={noop}
      onOpenTeaching={noop}
      onOpenExport={noop}
    />
  );
};

test('All 5 stage numbers (1, 2, 3, 4, 5) are always visible across all stages', () => {
  for (let stageNum = 1; stageNum <= 5; stageNum++) {
    const html = renderStrip({ stage: stageNum as 1 | 2 | 3 | 4 | 5, isSandbox: false });
    for (let s = 1; s <= 5; s++) {
      // Each stage number must appear in a rendered circle badge
      const stageBadgePattern = new RegExp(`>\\s*${s}\\s*</span>`);
      assert.match(
        html,
        stageBadgePattern,
        `Stage number ${s} must be rendered when active stage is ${stageNum}`
      );
    }
  }
});

test('Only the active stage text label is visible by default (inline), other stage labels are hidden until hovered', () => {
  const html = renderStrip({ stage: 3, isSandbox: false });

  // Stage 3 is active: "Shadow Block-In" should have "inline" and NOT "hidden"
  const stage3Regex = /<span class="[^"]*inline[^"]*">Shadow Block-In<\/span>/;
  assert.match(html, stage3Regex, 'Active stage label should be visible (inline)');
  assert.doesNotMatch(html, /<span class="[^"]*hidden[^"]*">Shadow Block-In<\/span>/);

  // Inactive stages (1, 2, 4, 5) should have "hidden" and "group-hover:inline"
  const inactiveLabels = ['Envelope', 'Proportions', 'Halftone Modeling', 'Deep Accents'];
  for (const label of inactiveLabels) {
    const inactiveRegex = new RegExp(`<span class="[^"]*hidden[^"]*group-hover:inline[^"]*">${label}</span>`);
    assert.match(
      html,
      inactiveRegex,
      `Inactive stage label "${label}" must be hidden by default and reveal on group-hover`
    );
  }
});

test('Passed stages display completion indicator alongside their stage number', () => {
  const html = renderStrip({ stage: 4, isSandbox: false });

  // Stages 1, 2, and 3 are passed. Stage numbers 1, 2, 3 must still be present.
  for (const s of [1, 2, 3]) {
    const badgePattern = new RegExp(`>\\s*${s}\\s*</span>`);
    assert.match(html, badgePattern, `Passed stage ${s} must still render its stage number`);
  }

  // Active stage 4 has "Halftone Modeling" visible
  assert.match(html, /<span class="[^"]*inline[^"]*">Halftone Modeling<\/span>/);
});

test('Stage buttons include full goal text and pencil grades in title tooltip to prevent clipping', () => {
  const html = renderStrip({ stage: 1, isSandbox: false });

  // Goals must exist in title attributes
  assert.ok(html.includes('Align physical scale with your paper size and box in outer facial bounds.'));
  assert.ok(html.includes('Establish cranial ball, symmetry axis, eye line, and facial thirds.'));
  assert.ok(html.includes('Unify all core shadows and cast shadows into a single flat dark tone.'));
  assert.ok(html.includes('Model subtle turning planes on cheeks, nose bridge, and forehead.'));
  assert.ok(html.includes('Place deepest dark accents in nostrils/pupils and lift sharp specular highlights.'));
});

test('In Sandbox Mode, all stage numbers remain visible and no stage label is forced visible without hover', () => {
  const html = renderStrip({ stage: 2, isSandbox: true });

  for (let s = 1; s <= 5; s++) {
    const stageBadgePattern = new RegExp(`>\\s*${s}\\s*</span>`);
    assert.match(html, stageBadgePattern, `Stage number ${s} must be rendered in Sandbox Mode`);
  }

  // In Sandbox Mode, no stage is active, so all labels should be hidden until hovered
  const allLabels = ['Envelope', 'Proportions', 'Shadow Block-In', 'Halftone Modeling', 'Deep Accents'];
  for (const label of allLabels) {
    const hiddenRegex = new RegExp(`<span class="[^"]*hidden[^"]*group-hover:inline[^"]*">${label}</span>`);
    assert.match(html, hiddenRegex, `Stage label "${label}" should be hidden until hovered in Sandbox Mode`);
  }
});
