import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bandFor,
  buildValueFamilies,
  capRenderSize,
  createTonalPixel,
  decideTonalPixel,
  DEFAULT_RENDER_CAP_PX,
  DEFAULT_VALUE_FAMILY_FLOORS,
  familyOfLayer,
  isolatedLayerIds,
  layersInFamily,
} from './tonalDecision';
import { generateDefaultLayerMeta, PENCIL_DATABASE } from './pencilGrades';
import { buildValueLayers, generateDefaultCutPoints } from './cutPoints';
import type { IsolationTarget, ValueFamilyFloors } from '../types/studio';

function createTestLayers(count: number) {
  const meta = generateDefaultLayerMeta(count, 'graphite');
  const cutPoints = generateDefaultCutPoints(count);
  return buildValueLayers(meta, cutPoints);
}

test('luminance falling inside a band is attributed to that band', () => {
  const layers = createTestLayers(5);

  for (const layer of layers) {
    const midpoint = Math.round((layer.minThreshold + layer.maxThreshold) / 2);
    const band = bandFor(midpoint, layers);
    assert.ok(band, `Expected band for midpoint ${midpoint}`);
    assert.equal(band.id, layer.id, `Midpoint ${midpoint} should attribute to layer ${layer.id}`);
  }
});

test('boundary luminances are attributed consistently', () => {
  const layers = createTestLayers(5);

  // Top boundary: 255 must belong to the brightest layer (index 0)
  const topBand = bandFor(255, layers);
  assert.ok(topBand);
  assert.equal(topBand.id, layers[0].id);

  // Bottom boundary: 0 must belong to the darkest layer (last index)
  const bottomBand = bandFor(0, layers);
  assert.ok(bottomBand);
  assert.equal(bottomBand.id, layers[layers.length - 1].id);

  // Internal cut point boundaries: must attribute consistently to the first matching layer
  for (let i = 0; i < layers.length - 1; i++) {
    const boundary = layers[i].minThreshold; // which equals layers[i + 1].maxThreshold
    const attributed = bandFor(boundary, layers);
    assert.ok(attributed);
    assert.equal(
      attributed.id,
      layers[i].id,
      `Boundary ${boundary} between layer ${i} and ${i + 1} must attribute consistently to layer ${i}`
    );
  }
});

test('isolating a band produces a flat fill at the mapped pencil grade tone', () => {
  const layers = createTestLayers(5);
  const targetLayer = layers[2];
  const targetTone = PENCIL_DATABASE[targetLayer.pencilGrade].toneValue;
  const floors = DEFAULT_VALUE_FAMILY_FLOORS;
  const isolated = isolatedLayerIds(layers, { kind: 'layer', layerId: targetLayer.id }, floors);

  const out = createTonalPixel();

  // Test across multiple luminance values attributed to targetLayer
  const testLuminances = [
    targetLayer.minThreshold,
    Math.round((targetLayer.minThreshold + targetLayer.maxThreshold) / 2),
    targetLayer.maxThreshold - 1,
  ];

  for (const lum of testLuminances) {
    decideTonalPixel(lum, 255, layers, 'valueStudy', isolated, 0.18, out);
    assert.equal(out.r, targetTone, `Luminance ${lum} should produce flat fill tone ${targetTone}`);
    assert.equal(out.g, targetTone);
    assert.equal(out.b, targetTone);
    assert.equal(out.a, Math.round(255 * targetLayer.opacity));
  }
});

test('isolating a Value Family includes every band in range', () => {
  const layers = createTestLayers(5);
  const floors: ValueFamilyFloors = { halftoneFloor: 85, lightFloor: 170 };
  const shadowLayers = layersInFamily(layers, 'shadows', floors);
  assert.ok(shadowLayers.length > 0, 'Must have at least one shadow layer');

  const isolated = isolatedLayerIds(layers, { kind: 'family', family: 'shadows' }, floors);

  for (const shadowLayer of shadowLayers) {
    assert.ok(isolated.has(shadowLayer.id), `Layer ${shadowLayer.id} must be in isolated shadows`);
    const tone = PENCIL_DATABASE[shadowLayer.pencilGrade].toneValue;
    const mid = Math.round((shadowLayer.minThreshold + shadowLayer.maxThreshold) / 2);
    const out = createTonalPixel();
    decideTonalPixel(mid, 255, layers, 'valueStudy', isolated, 0.18, out);
    assert.equal(out.r, tone);
    assert.equal(out.g, tone);
    assert.equal(out.b, tone);
  }
});

test('pixels outside an isolated selection receive the underlay treatment at the configured opacity', () => {
  const layers = createTestLayers(5);
  const floors = DEFAULT_VALUE_FAMILY_FLOORS;
  // Isolate only the brightest layer
  const isolated = isolatedLayerIds(layers, { kind: 'layer', layerId: layers[0].id }, floors);

  const outsideLuminance = 40; // In darkest layer
  const ghostOpacity = 0.22;
  const out = createTonalPixel();

  decideTonalPixel(outsideLuminance, 255, layers, 'valueStudy', isolated, ghostOpacity, out);

  // Unselected pixels render as faint underlay of reference image (preserving luminance)
  assert.equal(out.r, outsideLuminance);
  assert.equal(out.g, outsideLuminance);
  assert.equal(out.b, outsideLuminance);
  assert.equal(out.a, Math.round(255 * ghostOpacity));
});

test('Value Family membership stays correct across layer counts from three to nine', () => {
  const floors: ValueFamilyFloors = { halftoneFloor: 85, lightFloor: 170 };

  for (let count = 3; count <= 9; count++) {
    const layers = createTestLayers(count);
    const shadows = layersInFamily(layers, 'shadows', floors);
    const halftones = layersInFamily(layers, 'halftones', floors);
    const lights = layersInFamily(layers, 'lights', floors);

    // All layers must be partitioned among shadows, halftones, and lights
    assert.equal(
      shadows.length + halftones.length + lights.length,
      count,
      `Layer count ${count}: sum of family memberships must equal total count`
    );

    // Each family must have at least one layer
    assert.ok(shadows.length > 0, `Layer count ${count} must have shadow layers`);
    assert.ok(halftones.length > 0, `Layer count ${count} must have halftone layers`);
    assert.ok(lights.length > 0, `Layer count ${count} must have light layers`);

    // Verify midpoint ranges for each family
    for (const layer of shadows) {
      const mid = (layer.minThreshold + layer.maxThreshold) / 2;
      assert.ok(mid < floors.halftoneFloor, `Shadow layer mid ${mid} must be below halftoneFloor ${floors.halftoneFloor}`);
      assert.equal(familyOfLayer(layer, floors), 'shadows');
    }

    for (const layer of halftones) {
      const mid = (layer.minThreshold + layer.maxThreshold) / 2;
      assert.ok(
        mid >= floors.halftoneFloor && mid < floors.lightFloor,
        `Halftone layer mid ${mid} must be between ${floors.halftoneFloor} and ${floors.lightFloor}`
      );
      assert.equal(familyOfLayer(layer, floors), 'halftones');
    }

    for (const layer of lights) {
      const mid = (layer.minThreshold + layer.maxThreshold) / 2;
      assert.ok(mid >= floors.lightFloor, `Light layer mid ${mid} must be >= lightFloor ${floors.lightFloor}`);
      assert.equal(familyOfLayer(layer, floors), 'lights');
    }
  }
});

test('resolution cap preserves aspect ratio and leaves images below the cap untouched', () => {
  assert.equal(DEFAULT_RENDER_CAP_PX, 1800);

  // Image smaller than cap: must remain untouched with scale = 1
  const small = capRenderSize(1200, 800, 1800);
  assert.equal(small.width, 1200);
  assert.equal(small.height, 800);
  assert.equal(small.scale, 1);

  // Image with longEdge exactly at cap: untouched with scale = 1
  const exact = capRenderSize(1800, 1200, 1800);
  assert.equal(exact.width, 1800);
  assert.equal(exact.height, 1200);
  assert.equal(exact.scale, 1);

  // Image larger than cap (landscape): scaled so long edge equals cap, aspect ratio preserved
  const largeLandscape = capRenderSize(3600, 2400, 1800);
  assert.equal(largeLandscape.width, 1800);
  assert.equal(largeLandscape.height, 1200);
  assert.equal(largeLandscape.scale, 0.5);
  assert.equal(largeLandscape.width / largeLandscape.height, 3600 / 2400);

  // Image larger than cap (portrait): scaled so height equals cap, aspect ratio preserved
  const largePortrait = capRenderSize(2000, 4000, 1800);
  assert.equal(largePortrait.height, 1800);
  assert.equal(largePortrait.width, 900);
  assert.equal(largePortrait.scale, 1800 / 4000);
  assert.equal(largePortrait.width / largePortrait.height, 2000 / 4000);
});

test('decideTonalPixel respects valueStudy quantisation vs tonalMask continuous gradient', () => {
  const layers = createTestLayers(5);
  const targetLayer = layers[1];
  const mid = Math.round((targetLayer.minThreshold + targetLayer.maxThreshold) / 2);
  const nonMidLuminance = targetLayer.minThreshold + 2;
  const noIsolation = new Set<string>();

  const outStudy = createTonalPixel();
  decideTonalPixel(nonMidLuminance, 255, layers, 'valueStudy', noIsolation, 0.18, outStudy);
  // Value Study quantises to band midpoint
  assert.equal(outStudy.r, mid);
  assert.equal(outStudy.g, mid);
  assert.equal(outStudy.b, mid);

  const outMask = createTonalPixel();
  decideTonalPixel(nonMidLuminance, 255, layers, 'tonalMask', noIsolation, 0.18, outMask);
  // Tonal Mask emits continuous luminance
  assert.equal(outMask.r, nonMidLuminance);
  assert.equal(outMask.g, nonMidLuminance);
  assert.equal(outMask.b, nonMidLuminance);
});
