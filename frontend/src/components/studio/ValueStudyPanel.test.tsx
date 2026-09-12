import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ValueStudyPanel } from './ValueStudyPanel';
import { INITIAL_PROJECT_STATE } from '../../utils/initialProjectState';
import type { ProjectState } from '../../types/studio';

const noop = () => {};

test('ValueStudyPanel renders preset badge and Change affordance when appliedPreset is set', () => {
  const project: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    imageSrc: 'data:image/png;base64,mock',
    appliedPreset: 'portrait-static',
  };

  const html = renderToStaticMarkup(
    <ValueStudyPanel
      project={project}
      onUpdateProject={noop}
      onOpenPresetPicker={noop}
    />
  );

  assert.match(html, /Portrait — Static/, 'Must render applied preset name');
  assert.match(html, /Change/, 'Must render Change affordance button');
});

test('ValueStudyPanel suppresses preset badge when appliedPreset is null or undefined', () => {
  const project: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    imageSrc: 'data:image/png;base64,mock',
    appliedPreset: null,
  };

  const html = renderToStaticMarkup(
    <ValueStudyPanel
      project={project}
      onUpdateProject={noop}
      onOpenPresetPicker={noop}
    />
  );

  assert.ok(!html.includes('Portrait — Static'));
  assert.ok(!html.includes('>Change</button>'));
});
