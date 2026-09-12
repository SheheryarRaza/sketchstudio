import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudioCanvas } from './StudioCanvas';
import { INITIAL_PROJECT_STATE } from '../../utils/initialProjectState';
import type { ProjectState } from '../../types/studio';

const noop = () => {};

const renderCanvas = (state: Partial<ProjectState> = {}) => {
  const project: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    ...state,
  };
  return renderToStaticMarkup(
    <StudioCanvas
      project={project}
      onUpdateProject={noop}
      onLoadImageFile={noop}
      onLoadSampleImage={noop}
    />
  );
};

test('StudioCanvas renders Flip button in floating canvas toolbar when reference image is loaded', () => {
  const html = renderCanvas({
    imageSrc: 'data:image/svg+xml;base64,mock',
    imageWidth: 800,
    imageHeight: 1000,
    isFlippedHorizontal: false,
  });

  // Flip button must exist with accessible label and keyboard hint
  assert.match(html, /aria-label="Flip horizontal"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /title="[^"]*Flip horizontal[^"]*\(H\)/i);
  assert.match(html, />\s*Flip\s*<\/span>/);
});

test('StudioCanvas applies scaleX(-1) transform to canvas viewport container when isFlippedHorizontal is true', () => {
  const htmlFlipped = renderCanvas({
    imageSrc: 'data:image/svg+xml;base64,mock',
    imageWidth: 800,
    imageHeight: 1000,
    isFlippedHorizontal: true,
  });

  assert.match(htmlFlipped, /aria-pressed="true"/);
  assert.match(htmlFlipped, /transform:[^"]*scaleX\(-1\)/);
});

test('StudioCanvas does not apply scaleX(-1) when isFlippedHorizontal is false', () => {
  const htmlUnflipped = renderCanvas({
    imageSrc: 'data:image/svg+xml;base64,mock',
    imageWidth: 800,
    imageHeight: 1000,
    isFlippedHorizontal: false,
  });

  assert.match(htmlUnflipped, /aria-pressed="false"/);
  assert.doesNotMatch(htmlUnflipped, /scaleX\(-1\)/);
});

test('Overlays remain mounted inside canvas viewport container regardless of flip state', () => {
  const customLoomisState = {
    imageSrc: 'data:image/svg+xml;base64,mock',
    imageWidth: 800,
    imageHeight: 1000,
    methods: {
      ...INITIAL_PROJECT_STATE.methods,
      activeMethod: 'loomis' as const,
    },
    grid: {
      ...INITIAL_PROJECT_STATE.grid,
      enabled: true,
    },
    paperMapping: {
      ...INITIAL_PROJECT_STATE.paperMapping,
      isDeclared: true,
    },
  };

  const htmlUnflipped = renderCanvas({ ...customLoomisState, isFlippedHorizontal: false });
  const htmlFlipped = renderCanvas({ ...customLoomisState, isFlippedHorizontal: true });

  // Both have Loomis circle and Grid svg mounted
  assert.match(htmlUnflipped, /stroke-dasharray="4,2"/);
  assert.match(htmlFlipped, /stroke-dasharray="4,2"/);
});

test('Overlay text labels counter-mirror when isFlippedHorizontal is true to prevent backwards glyphs', () => {
  const stateWithLabels = {
    imageSrc: 'data:image/svg+xml;base64,mock',
    imageWidth: 800,
    imageHeight: 1000,
    grid: {
      ...INITIAL_PROJECT_STATE.grid,
      enabled: true,
      showLabels: true,
      type: 'squares' as const,
    },
    paperMapping: {
      ...INITIAL_PROJECT_STATE.paperMapping,
      isDeclared: true,
    },
    methods: {
      ...INITIAL_PROJECT_STATE.methods,
      activeMethod: 'triangulation' as const,
    },
    isFlippedHorizontal: true,
  };

  const html = renderCanvas(stateWithLabels);

  // GridOverlay text elements counter-mirror
  assert.match(html, /<text[^>]*style="[^"]*transform:scaleX\(-1\)[^"]*"[^>]*>A<\/text>/);

  // CaliperOverlay text elements counter-mirror
  assert.match(html, /<text[^>]*style="transform:scaleX\(-1\)"[^>]*>/);
});
