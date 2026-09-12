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
