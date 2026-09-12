import test from 'node:test';
import assert from 'node:assert/strict';
import type { MediumType, PencilHardness } from '../types/studio';
import {
  PENCIL_DATABASE,
  generateDefaultLayerMeta,
  getPencilGradesForMedium,
} from './pencilGrades';

test('MediumType includes charcoal', () => {
  const charcoalMedium: MediumType = 'charcoal';
  assert.equal(charcoalMedium, 'charcoal');
});

test('PENCIL_DATABASE entries define displayName, category, and mediums metadata', () => {
  const allGrades = Object.keys(PENCIL_DATABASE) as PencilHardness[];
  assert.ok(allGrades.length > 0);

  for (const grade of allGrades) {
    const info = PENCIL_DATABASE[grade];
    assert.ok(info.displayName && typeof info.displayName === 'string', `${grade} must have a valid displayName`);
    assert.ok(info.category && typeof info.category === 'string', `${grade} must have a valid category`);
    assert.ok(Array.isArray(info.mediums) && info.mediums.length > 0, `${grade} must specify associated mediums`);
    assert.ok(typeof info.toneValue === 'number', `${grade} must have a numerical toneValue`);
  }
});

test('White_Chalk has displayName "White" and is classified as highlight, not dark/shadow', () => {
  const whiteChalk = PENCIL_DATABASE['White_Chalk'];
  assert.ok(whiteChalk);
  assert.equal(whiteChalk.displayName, 'White');
  assert.equal(whiteChalk.category, 'Highlights (Toned Paper)');
  assert.ok(whiteChalk.toneValue >= 250, 'White chalk must have a highlight tone value');
  assert.ok(whiteChalk.mediums.includes('graphite'));
  assert.ok(whiteChalk.mediums.includes('charcoal'));
});

test('getPencilGradesForMedium returns distinct material scales for graphite and charcoal', () => {
  const graphiteGrades = getPencilGradesForMedium('graphite');
  const charcoalGrades = getPencilGradesForMedium('charcoal');

  // Graphite scale must include standard graphite hardnesses
  assert.ok(graphiteGrades.includes('HB'));
  assert.ok(graphiteGrades.includes('2B'));
  assert.ok(graphiteGrades.includes('4H'));
  assert.ok(graphiteGrades.includes('White_Chalk'));

  // Charcoal scale must include distinct charcoal materials per ADR-0005
  assert.ok(charcoalGrades.includes('Vine_Charcoal'));
  assert.ok(charcoalGrades.includes('Willow_Charcoal'));
  assert.ok(charcoalGrades.includes('Compressed_Charcoal'));
  assert.ok(charcoalGrades.includes('White_Chalk'));

  // Graphite scale should not contain charcoal-only materials like Vine or Willow
  assert.ok(!graphiteGrades.includes('Vine_Charcoal'));
  assert.ok(!graphiteGrades.includes('Willow_Charcoal'));

  // Charcoal scale should not contain graphite-only pencils like 9H or HB
  assert.ok(!charcoalGrades.includes('9H'));
  assert.ok(!charcoalGrades.includes('HB'));
});

test('generateDefaultLayerMeta respects medium parameter and assigns medium-scoped materials', () => {
  const levels = 5;

  const graphiteLayers = generateDefaultLayerMeta(levels, 'graphite');
  assert.equal(graphiteLayers.length, levels);
  // Graphite layers should use graphite grades
  const graphitePencils = graphiteLayers.map((l) => l.pencilGrade);
  assert.ok(graphitePencils.includes('HB'));
  assert.ok(!graphitePencils.includes('Vine_Charcoal'));

  const charcoalLayers = generateDefaultLayerMeta(levels, 'charcoal');
  assert.equal(charcoalLayers.length, levels);
  // Charcoal layers must use charcoal materials scale per ADR-0005
  const charcoalPencils = charcoalLayers.map((l) => l.pencilGrade);
  assert.ok(
    charcoalPencils.some((p) => p.includes('Charcoal') || p === 'White_Chalk'),
    'Charcoal layers must use charcoal materials'
  );
  assert.ok(!charcoalPencils.includes('HB'), 'Charcoal layers must not use graphite HB');
});

test('generateDefaultLayerMeta for graphite does not end with Charcoal at 9 levels', () => {
  const graphite9 = generateDefaultLayerMeta(9, 'graphite');
  const darkest = graphite9[graphite9.length - 1].pencilGrade;
  assert.notEqual(darkest, 'Charcoal', 'Graphite scale per ADR-0005 must not collapse to Charcoal at 9 levels');
  assert.equal(darkest, '9B');
});
