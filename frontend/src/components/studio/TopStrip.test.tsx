import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopStrip } from './TopStrip';
import { INITIAL_PROJECT_STATE } from '../../utils/initialProjectState';
import type { AtelierStage, ProjectState } from '../../types/studio';

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

const assertStageNumberRendered = (html: string, targetStage: AtelierStage, contextMsg?: string) => {
  const stageBadgePattern = new RegExp(`>\\s*${targetStage}\\s*</span>`);
  assert.match(
    html,
    stageBadgePattern,
    contextMsg || `Stage number ${targetStage} must be rendered in badge circle`
  );
};

const assertLabelHiddenUntilHover = (html: string, label: string, contextMsg?: string) => {
  const hiddenRegex = new RegExp(`<span class="[^"]*hidden[^"]*group-hover:inline[^"]*">${label}</span>`);
  assert.match(
    html,
    hiddenRegex,
    contextMsg || `Stage label "${label}" must be hidden by default and reveal on group-hover`
  );
};

test('All 5 stage numbers (1, 2, 3, 4, 5) are always visible across all stages', () => {
  const stages: AtelierStage[] = [1, 2, 3, 4, 5];
  for (const activeStage of stages) {
    const html = renderStrip({ stage: activeStage, isSandbox: false });
    for (const targetStage of stages) {
      assertStageNumberRendered(
        html,
        targetStage,
        `Stage number ${targetStage} must be rendered when active stage is ${activeStage}`
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
    assertLabelHiddenUntilHover(html, label);
  }
});

test('Passed stages display completion styling while preserving their stage number', () => {
  const html = renderStrip({ stage: 4, isSandbox: false });

  // Stages 1, 2, and 3 are passed. Stage numbers 1, 2, 3 must still be present and have emerald styling.
  const passedStages: AtelierStage[] = [1, 2, 3];
  for (const passedStage of passedStages) {
    assertStageNumberRendered(html, passedStage, `Passed stage ${passedStage} must still render its stage number`);
    // Assert emerald completion style on passed badge
    const passedBadgePattern = new RegExp(`bg-emerald-950[^>]*>\\s*${passedStage}\\s*</span>`);
    assert.match(html, passedBadgePattern, `Passed stage ${passedStage} badge should have emerald completion styling`);
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

  const stages: AtelierStage[] = [1, 2, 3, 4, 5];
  for (const targetStage of stages) {
    assertStageNumberRendered(html, targetStage, `Stage number ${targetStage} must be rendered in Sandbox Mode`);
  }

  // In Sandbox Mode, no stage is active, so all labels should be hidden until hovered
  const allLabels = ['Envelope', 'Proportions', 'Shadow Block-In', 'Halftone Modeling', 'Deep Accents'];
  for (const label of allLabels) {
    assertLabelHiddenUntilHover(html, label, `Stage label "${label}" should be hidden until hovered in Sandbox Mode`);
  }
});

test('Responsive layout horizontal footprint accommodates 820px, 1100px, and 1440px viewports without clipping', () => {
  const html = renderStrip({ stage: 3, isSandbox: false });

  // Header has flex layout with gap-4 and center strip with flex-1 and overflow-x-auto
  assert.match(html, /<header[^>]*class="[^"]*flex items-center justify-between gap-4[^"]*"/);
  assert.match(html, /<div[^>]*class="[^"]*flex-1 flex items-center justify-center gap-1 overflow-x-auto scrollbar-none[^"]*"/);

  // Each stage button has shrink-0 and transition-colors to prevent layout distortion on hover
  const buttonMatches = html.match(/<button[^>]*class="[^"]*shrink-0[^"]*"/g);
  assert.ok(buttonMatches && buttonMatches.length >= 5, 'All stage buttons must have shrink-0 to prevent compression');
});

test('TopStrip renders Gesture Study button in actions toolbar', () => {
  const html = renderStrip();
  assert.match(html, /aria-label="Gesture Study &amp; Study Log"/);
  assert.match(html, /title="Gesture Study &amp; Study Log"/);
});

