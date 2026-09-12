import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialEdgeQualityState,
  toggleEdgeQualityEnabled,
  setActiveQuality,
  setInteractionMode,
  setFilterQuality,
  addSegment,
  addPointToSegment,
  updatePointPosition,
  updateSegmentQuality,
  splitSegmentAtPoint,
  deleteSegment,
  deletePoint,
  clearSegments,
  filterSegments,
  countSegmentsByQuality,
  EDGE_QUALITY_CONFIG,
  serializeEdgeQuality,
  deserializeEdgeQuality,
} from './edgeQuality';
import type { EdgePoint } from '../types/edgeQuality';

test('createInitialEdgeQualityState initializes with sensible defaults', () => {
  const state = createInitialEdgeQualityState();
  assert.equal(state.enabled, false);
  assert.equal(state.activeQuality, 'hard');
  assert.equal(state.mode, 'draw');
  assert.deepEqual(state.segments, []);
  assert.equal(state.selectedSegmentId, null);
  assert.equal(state.selectedPointId, null);
  assert.equal(state.filter, 'all');
  assert.equal(state.opacity, 0.9);
  assert.equal(state.lineWidth, 3);
});

test('toggleEdgeQualityEnabled toggles enabled state', () => {
  const initial = createInitialEdgeQualityState();
  const enabled = toggleEdgeQualityEnabled(initial);
  assert.equal(enabled.enabled, true);
  const disabled = toggleEdgeQualityEnabled(enabled);
  assert.equal(disabled.enabled, false);
});

test('setActiveQuality updates the active quality for drawing', () => {
  const initial = createInitialEdgeQualityState();
  const soft = setActiveQuality(initial, 'soft');
  assert.equal(soft.activeQuality, 'soft');
  const lost = setActiveQuality(soft, 'lost');
  assert.equal(lost.activeQuality, 'lost');
});

test('setInteractionMode updates draw and select modes', () => {
  const initial = createInitialEdgeQualityState();
  const selectMode = setInteractionMode(initial, 'select');
  assert.equal(selectMode.mode, 'select');
  const drawMode = setInteractionMode(selectMode, 'draw');
  assert.equal(drawMode.mode, 'draw');
});

test('setFilterQuality updates edge quality filter', () => {
  const initial = createInitialEdgeQualityState();
  const filtered = setFilterQuality(initial, 'hard');
  assert.equal(filtered.filter, 'hard');
});

test('addSegment appends a new segment and selects it', () => {
  const initial = createInitialEdgeQualityState();
  const points: EdgePoint[] = [
    { id: 'p1', x: 100, y: 150 },
    { id: 'p2', x: 140, y: 200 },
  ];

  const next = addSegment(initial, {
    quality: 'soft',
    points,
    label: 'Cheek shadow edge',
  });

  assert.equal(next.segments.length, 1);
  assert.equal(next.segments[0].quality, 'soft');
  assert.equal(next.segments[0].label, 'Cheek shadow edge');
  assert.deepEqual(next.segments[0].points, points);
  assert.equal(next.selectedSegmentId, next.segments[0].id);
});

test('addPointToSegment appends point to target segment', () => {
  const initial = createInitialEdgeQualityState();
  const withSeg = addSegment(initial, {
    quality: 'hard',
    points: [{ id: 'p1', x: 50, y: 50 }],
  });
  const segId = withSeg.segments[0].id;

  const withSecondPoint = addPointToSegment(withSeg, segId, { id: 'p2', x: 70, y: 90 });
  assert.equal(withSecondPoint.segments[0].points.length, 2);
  assert.equal(withSecondPoint.segments[0].points[1].x, 70);
  assert.equal(withSecondPoint.segments[0].points[1].y, 90);
});

test('updatePointPosition updates coordinate in native image space', () => {
  const initial = createInitialEdgeQualityState();
  const withSeg = addSegment(initial, {
    quality: 'lost',
    points: [
      { id: 'p1', x: 10, y: 20 },
      { id: 'p2', x: 30, y: 40 },
    ],
  });
  const segId = withSeg.segments[0].id;

  const moved = updatePointPosition(withSeg, segId, 'p2', 35, 48);
  assert.equal(moved.segments[0].points[1].x, 35);
  assert.equal(moved.segments[0].points[1].y, 48);
});

test('updateSegmentQuality modifies quality between hard, soft, and lost', () => {
  const initial = createInitialEdgeQualityState();
  const withSeg = addSegment(initial, {
    quality: 'hard',
    points: [
      { id: 'p1', x: 10, y: 20 },
      { id: 'p2', x: 30, y: 40 },
    ],
  });
  const segId = withSeg.segments[0].id;

  const madeSoft = updateSegmentQuality(withSeg, segId, 'soft');
  assert.equal(madeSoft.segments[0].quality, 'soft');

  const madeLost = updateSegmentQuality(madeSoft, segId, 'lost');
  assert.equal(madeLost.segments[0].quality, 'lost');

  const madeHard = updateSegmentQuality(madeLost, segId, 'hard');
  assert.equal(madeHard.segments[0].quality, 'hard');
});

test('splitSegmentAtPoint divides a segment at point index into two segments', () => {
  const initial = createInitialEdgeQualityState();
  const withSeg = addSegment(initial, {
    quality: 'hard',
    points: [
      { id: 'p1', x: 10, y: 10 },
      { id: 'p2', x: 20, y: 20 },
      { id: 'p3', x: 30, y: 30 },
      { id: 'p4', x: 40, y: 40 },
    ],
    label: 'Jawline',
  });
  const segId = withSeg.segments[0].id;

  // Split at index 2 (point p3)
  const splitState = splitSegmentAtPoint(withSeg, segId, 2);
  assert.equal(splitState.segments.length, 2);

  // First segment has p1, p2, p3
  assert.equal(splitState.segments[0].points.length, 3);
  assert.equal(splitState.segments[0].points[0].id, 'p1');
  assert.equal(splitState.segments[0].points[2].id, 'p3');

  // Second segment has p3, p4 (continuous seam)
  assert.equal(splitState.segments[1].points.length, 2);
  assert.equal(splitState.segments[1].points[0].id, 'p3');
  assert.equal(splitState.segments[1].points[1].id, 'p4');

  // Artist can now reclassify the second segment to soft
  const reclassified = updateSegmentQuality(splitState, splitState.segments[1].id, 'soft');
  assert.equal(reclassified.segments[0].quality, 'hard');
  assert.equal(reclassified.segments[1].quality, 'soft');
});

test('splitSegmentAtPoint ignores split if index is at extremities', () => {
  const initial = createInitialEdgeQualityState();
  const withSeg = addSegment(initial, {
    quality: 'hard',
    points: [
      { id: 'p1', x: 10, y: 10 },
      { id: 'p2', x: 20, y: 20 },
    ],
  });
  const segId = withSeg.segments[0].id;

  const noop0 = splitSegmentAtPoint(withSeg, segId, 0);
  assert.equal(noop0.segments.length, 1);

  const noopLast = splitSegmentAtPoint(withSeg, segId, 1);
  assert.equal(noopLast.segments.length, 1);
});

test('deleteSegment removes segment and clears selection if matching', () => {
  const initial = createInitialEdgeQualityState();
  const s1 = addSegment(initial, { quality: 'hard', points: [{ id: 'p1', x: 0, y: 0 }] });
  const s2 = addSegment(s1, { quality: 'soft', points: [{ id: 'p2', x: 1, y: 1 }] });
  assert.equal(s2.segments.length, 2);
  const idToDelete = s2.segments[1].id;

  const afterDelete = deleteSegment(s2, idToDelete);
  assert.equal(afterDelete.segments.length, 1);
  assert.equal(afterDelete.selectedSegmentId, null);
});

test('deletePoint removes point and deletes segment if fewer than 2 points remain', () => {
  const initial = createInitialEdgeQualityState();
  const s1 = addSegment(initial, {
    quality: 'hard',
    points: [
      { id: 'p1', x: 0, y: 0 },
      { id: 'p2', x: 1, y: 1 },
      { id: 'p3', x: 2, y: 2 },
    ],
  });
  const segId = s1.segments[0].id;

  const with2Points = deletePoint(s1, segId, 'p2');
  assert.equal(with2Points.segments[0].points.length, 2);
  assert.equal(with2Points.segments[0].points[0].id, 'p1');
  assert.equal(with2Points.segments[0].points[1].id, 'p3');

  // Deleting one more point leaves only 1 point, so the segment is pruned
  const pruned = deletePoint(with2Points, segId, 'p3');
  assert.equal(pruned.segments.length, 0);
});

test('clearSegments empties all segments and resets selection', () => {
  const initial = createInitialEdgeQualityState();
  const s1 = addSegment(initial, { quality: 'hard', points: [{ id: 'p1', x: 0, y: 0 }] });
  const cleared = clearSegments(s1);
  assert.deepEqual(cleared.segments, []);
  assert.equal(cleared.selectedSegmentId, null);
  assert.equal(cleared.selectedPointId, null);
});

test('filterSegments filters list by quality', () => {
  const segments = [
    { id: 's1', quality: 'hard' as const, points: [] },
    { id: 's2', quality: 'soft' as const, points: [] },
    { id: 's3', quality: 'hard' as const, points: [] },
    { id: 's4', quality: 'lost' as const, points: [] },
  ];

  assert.equal(filterSegments(segments, 'all').length, 4);
  assert.equal(filterSegments(segments, 'hard').length, 2);
  assert.equal(filterSegments(segments, 'soft').length, 1);
  assert.equal(filterSegments(segments, 'lost').length, 1);
});

test('countSegmentsByQuality tallies segments accurately', () => {
  const segments = [
    { id: 's1', quality: 'hard' as const, points: [] },
    { id: 's2', quality: 'soft' as const, points: [] },
    { id: 's3', quality: 'hard' as const, points: [] },
    { id: 's4', quality: 'lost' as const, points: [] },
  ];

  const counts = countSegmentsByQuality(segments);
  assert.equal(counts.all, 4);
  assert.equal(counts.hard, 2);
  assert.equal(counts.soft, 1);
  assert.equal(counts.lost, 1);
});

test('EDGE_QUALITY_CONFIG defines visually distinct rendering styles', () => {
  const hard = EDGE_QUALITY_CONFIG.hard;
  const soft = EDGE_QUALITY_CONFIG.soft;
  const lost = EDGE_QUALITY_CONFIG.lost;

  // Colors must be distinct
  assert.notEqual(hard.color, soft.color);
  assert.notEqual(hard.color, lost.color);
  assert.notEqual(soft.color, lost.color);

  // Stroke dash styles must be distinct: hard is solid (none), soft is dashed, lost is dotted
  assert.equal(hard.strokeDasharray, 'none');
  assert.match(soft.strokeDasharray, /\d+,\d+/);
  assert.match(lost.strokeDasharray, /\d+,\d+/);
  assert.notEqual(soft.strokeDasharray, lost.strokeDasharray);
});

test('serializeEdgeQuality and deserializeEdgeQuality safely round-trip state', () => {
  const state = createInitialEdgeQualityState();
  const withSeg = addSegment(state, {
    quality: 'soft',
    points: [
      { id: 'p1', x: 120, y: 150 },
      { id: 'p2', x: 160, y: 220 },
    ],
    label: 'Test segment',
  });

  const serialized = serializeEdgeQuality(withSeg);
  const deserialized = deserializeEdgeQuality(serialized);

  assert.ok(deserialized);
  assert.equal(deserialized.segments.length, 1);
  assert.equal(deserialized.segments[0].quality, 'soft');
  assert.equal(deserialized.segments[0].points[0].x, 120);
  assert.equal(deserialized.segments[0].points[1].y, 220);
});

test('deserializeEdgeQuality handles malformed or invalid JSON gracefully', () => {
  assert.equal(deserializeEdgeQuality('not json'), null);
  assert.equal(deserializeEdgeQuality('{"random": 123}'), null);
  assert.equal(deserializeEdgeQuality('null'), null);
});
