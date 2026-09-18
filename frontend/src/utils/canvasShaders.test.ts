import test from 'node:test';
import assert from 'node:assert/strict';
import { renderValueStudyOnCanvas } from './canvasShaders';
import { generateDefaultCutPoints, buildValueLayers } from './cutPoints';
import { generateDefaultLayerMeta } from './pencilGrades';

const testLayers = buildValueLayers(generateDefaultLayerMeta(4, 'graphite'), generateDefaultCutPoints(4));

test('renderValueStudyOnCanvas throws when destination context is unavailable', () => {
  const fakeTargetCanvas = {
    width: 100,
    height: 100,
    getContext: () => null,
  } as unknown as HTMLCanvasElement;

  const fakeImg = {} as HTMLImageElement;

  assert.throws(
    () => renderValueStudyOnCanvas(fakeImg, fakeTargetCanvas, testLayers, 'valueStudy'),
    (err: Error) => {
      assert.match(err.message, /destination canvas 2D rendering context/);
      return true;
    },
  );
});

test('renderValueStudyOnCanvas does not catch or fabricate CSS filters when canvas reading is tainted', () => {
  const originalDocument = globalThis.document;
  try {
    const mockOffscreenCtx = {
      filter: '',
      drawImage: () => {},
      getImageData: () => {
        throw new Error(
          'Failed to execute getImageData on CanvasRenderingContext2D: The canvas has been tainted by cross-origin data.',
        );
      },
    };

    const mockTargetCtx = {
      createImageData: () => ({ data: new Uint8ClampedArray(400) }),
      putImageData: () => {},
      drawImage: () => {},
    };

    const mockOffscreenCanvas = {
      width: 100,
      height: 100,
      getContext: () => mockOffscreenCtx,
    };

    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') return mockOffscreenCanvas;
        return {};
      },
    };

    const fakeTargetCanvas = {
      width: 100,
      height: 100,
      getContext: () => mockTargetCtx,
    } as unknown as HTMLCanvasElement;

    const fakeImg = {} as HTMLImageElement;

    assert.throws(
      () => renderValueStudyOnCanvas(fakeImg, fakeTargetCanvas, testLayers, 'valueStudy'),
      (err: Error) => {
        assert.match(err.message, /tainted by cross-origin data/);
        return true;
      },
    );
  } finally {
    globalThis.document = originalDocument;
  }
});

test('renderValueStudyOnCanvas reuses a single offscreen canvas across consecutive recomputes', () => {
  const originalDocument = globalThis.document;
  try {
    let createElementCallCount = 0;
    const mockOffscreenCtx = {
      filter: '',
      drawImage: () => {},
      getImageData: () => ({
        data: new Uint8ClampedArray(400), // 10x10 = 100 pixels * 4 = 400 bytes
      }),
    };

    const mockOffscreenCanvas = {
      width: 10,
      height: 10,
      getContext: () => mockOffscreenCtx,
    };

    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          createElementCallCount++;
          return mockOffscreenCanvas;
        }
        return {};
      },
    };

    const mockTargetCtx = {
      createImageData: () => ({ data: new Uint8ClampedArray(400) }),
      putImageData: () => {},
      drawImage: () => {},
    };

    const fakeTargetCanvas = {
      width: 10,
      height: 10,
      getContext: () => mockTargetCtx,
    } as unknown as HTMLCanvasElement;

    const fakeImg = {} as HTMLImageElement;

    // Call 1
    renderValueStudyOnCanvas(fakeImg, fakeTargetCanvas, testLayers, 'valueStudy');
    assert.equal(createElementCallCount, 1, 'First render should allocate the offscreen canvas');

    // Call 2 (slider tick 1)
    renderValueStudyOnCanvas(fakeImg, fakeTargetCanvas, testLayers, 'valueStudy');
    assert.equal(createElementCallCount, 1, 'Second render must reuse the cached offscreen canvas');

    // Call 3 (slider tick 2)
    renderValueStudyOnCanvas(fakeImg, fakeTargetCanvas, testLayers, 'valueStudy');
    assert.equal(createElementCallCount, 1, 'Third render must reuse the cached offscreen canvas');

    // Call 4 with different dimensions
    const resizedTargetCanvas = {
      width: 20,
      height: 30,
      getContext: () => mockTargetCtx,
    } as unknown as HTMLCanvasElement;
    renderValueStudyOnCanvas(fakeImg, resizedTargetCanvas, testLayers, 'valueStudy');
    assert.equal(createElementCallCount, 1, 'Resize should update existing canvas width/height without reallocating');
    assert.equal(mockOffscreenCanvas.width, 20);
    assert.equal(mockOffscreenCanvas.height, 30);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('computeTonalPixels executes pure pixel shader calculations accurately', async () => {
  const { computeTonalPixels } = await import('./canvasShaders');
  // 2 pixels: pixel 0 is bright (200, 200, 200, 255), pixel 1 is dark (30, 30, 30, 255)
  const input = new Uint8ClampedArray([
    200, 200, 200, 255,
    30, 30, 30, 255,
  ]);

  const output = computeTonalPixels(
    input,
    2, // width
    1, // height
    testLayers,
    'valueStudy',
    [], // no isolated layers
    0.18,
    -1, // no split
  );

  assert.equal(output.length, 8);
  // Pixel 0 (bright) should have high luminance / mapped tone
  assert.ok(output[0] > output[4], 'Bright pixel should be lighter than dark pixel in output');
  assert.equal(output[3], 255, 'Alpha channel should be 255');
  assert.equal(output[7], 255, 'Alpha channel should be 255');
});

test('comparing valueStudy and tonalMask on same continuous gradient image confirms discrete quantization vs continuous tones', async () => {
  const { computeTonalPixels } = await import('./canvasShaders');

  // Create a continuous ramp image of 10 pixels with luminances 10, 30, 50, 70, 90, 110, 130, 150, 170, 190
  const width = 10;
  const height = 1;
  const input = new Uint8ClampedArray(width * 4);
  for (let x = 0; x < width; x++) {
    const val = 10 + x * 20;
    input[x * 4] = val;
    input[x * 4 + 1] = val;
    input[x * 4 + 2] = val;
    input[x * 4 + 3] = 255;
  }

  // Render with valueStudy (quantized stepped view)
  const studyOutput = computeTonalPixels(
    input,
    width,
    height,
    testLayers,
    'valueStudy',
    [],
    0.18,
    -1,
  );

  // Render with tonalMask (continuous-tone view)
  const maskOutput = computeTonalPixels(
    input,
    width,
    height,
    testLayers,
    'tonalMask',
    [],
    0.18,
    -1,
  );

  // In tonalMask: each pixel must match its continuous input luminance exactly
  for (let x = 0; x < width; x++) {
    const expectedLum = 10 + x * 20;
    assert.equal(maskOutput[x * 4], expectedLum, `tonalMask pixel ${x} must equal continuous luminance`);
  }

  // In valueStudy: adjacent pixels within the same band are quantized to the exact same midpoint
  // Check unique values: testLayers has 4 bands, so output must have <= 4 distinct values (discrete steps)
  const uniqueStudyValues = new Set<number>();
  for (let x = 0; x < width; x++) {
    uniqueStudyValues.add(studyOutput[x * 4]);
  }
  assert.ok(uniqueStudyValues.size <= testLayers.length, 'valueStudy should produce discrete steps, not continuous gradients');
  assert.ok(uniqueStudyValues.size < width, 'valueStudy must compress 10 distinct gradient values into fewer discrete steps');

  // Verify split compare on the same image
  const splitOutput = computeTonalPixels(
    input,
    width,
    height,
    testLayers,
    'valueStudy',
    [],
    0.18,
    width / 2, // split down the middle at x = 5
  );

  // Left of split (x < 5): original values preserved
  for (let x = 0; x < 5; x++) {
    const origVal = 10 + x * 20;
    assert.equal(splitOutput[x * 4], origVal, `Split left pixel ${x} must match original RGB`);
  }

  // Right of split (x >= 5): valueStudy tonal values rendered
  for (let x = 5; x < width; x++) {
    assert.equal(splitOutput[x * 4], studyOutput[x * 4], `Split right pixel ${x} must match valueStudy`);
  }
});


