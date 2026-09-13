import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_PROJECT_STATE,
  INITIAL_IMAGE_STATE,
  INITIAL_VALUE_STUDY_STATE,
  INITIAL_METHODS_STATE,
  INITIAL_GRID_STATE,
  INITIAL_VIEW_STATE,
  assembleProjectState,
} from './initialProjectState';

test('INITIAL_PROJECT_STATE is structured into concern-scoped sub-states (Issue #36)', () => {
  assert.ok(INITIAL_PROJECT_STATE.image, 'image concern sub-state must exist');
  assert.ok(INITIAL_PROJECT_STATE.values, 'values concern sub-state must exist');
  assert.ok(INITIAL_PROJECT_STATE.methods, 'methods concern sub-state must exist');
  assert.ok(INITIAL_PROJECT_STATE.grid, 'grid concern sub-state must exist');
  assert.ok(INITIAL_PROJECT_STATE.view, 'view concern sub-state must exist');

  // Verify concern segregation
  assert.equal(INITIAL_PROJECT_STATE.image.title, 'Classical Portrait Study');
  assert.equal(INITIAL_PROJECT_STATE.image.imageWidth, 600);
  assert.equal(INITIAL_PROJECT_STATE.values.medium, 'graphite');
  assert.equal(INITIAL_PROJECT_STATE.values.numValueLayers, 5);
  assert.equal(INITIAL_PROJECT_STATE.methods.activeMethod, 'loomis');
  assert.equal(INITIAL_PROJECT_STATE.grid.type, 'squares');
  assert.equal(INITIAL_PROJECT_STATE.view.stage, 1);
  assert.equal(INITIAL_PROJECT_STATE.view.viewMode, 'valueStudy');
});

test('INITIAL_PROJECT_STATE preserves flat accessors for backward compatibility', () => {
  assert.equal(INITIAL_PROJECT_STATE.title, 'Classical Portrait Study');
  assert.equal(INITIAL_PROJECT_STATE.imageWidth, 600);
  assert.equal(INITIAL_PROJECT_STATE.medium, 'graphite');
  assert.equal(INITIAL_PROJECT_STATE.stage, 1);
  assert.equal(INITIAL_PROJECT_STATE.viewMode, 'valueStudy');
  assert.equal(INITIAL_PROJECT_STATE.isSandbox, false);
  assert.deepEqual(INITIAL_PROJECT_STATE.cutPoints, INITIAL_VALUE_STUDY_STATE.cutPoints);
});

test('assembleProjectState updates only the targeted concern without mutating unrelated sub-states', () => {
  const updatedValues = {
    ...INITIAL_VALUE_STUDY_STATE,
    cutPoints: [200, 150, 100, 50],
    cutPointSource: 'manual' as const,
  };

  const nextProject = assembleProjectState(
    INITIAL_IMAGE_STATE,
    updatedValues,
    INITIAL_METHODS_STATE,
    INITIAL_GRID_STATE,
    INITIAL_VIEW_STATE,
  );

  // Values changed
  assert.strictEqual(nextProject.values, updatedValues);
  assert.deepEqual(nextProject.cutPoints, [200, 150, 100, 50]);

  // All unrelated concerns retain strict referential equality
  assert.strictEqual(nextProject.image, INITIAL_IMAGE_STATE);
  assert.strictEqual(nextProject.methods, INITIAL_METHODS_STATE);
  assert.strictEqual(nextProject.grid, INITIAL_GRID_STATE);
  assert.strictEqual(nextProject.view, INITIAL_VIEW_STATE);
});
