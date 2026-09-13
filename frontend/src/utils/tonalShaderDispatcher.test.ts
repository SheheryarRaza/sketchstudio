import test from 'node:test';
import assert from 'node:assert/strict';
import { TonalShaderDispatcher, type TonalRenderJob } from './tonalShaderDispatcher';
import { generateDefaultCutPoints, buildValueLayers } from './cutPoints';
import { generateDefaultLayerMeta } from './pencilGrades';

const testLayers = buildValueLayers(generateDefaultLayerMeta(4, 'graphite'), generateDefaultCutPoints(4));

test('TonalShaderDispatcher batches rapid calls onto requestAnimationFrame and only renders latest parameters', async () => {
  let rafCallback: FrameRequestCallback | null = null;
  let rafIdCounter = 0;
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCaf = globalThis.cancelAnimationFrame;

  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafCallback = cb;
    return ++rafIdCounter;
  };
  globalThis.cancelAnimationFrame = () => {
    rafCallback = null;
  };

  try {
    let rendersCount = 0;
    let lastGhostOpacity = -1;

    const fakeWorkerClient = {
      isAvailable: false,
      compute: async () => {
        throw new Error('Worker not used in fallback test');
      },
      terminate: () => {},
    };

    const dispatcher = new TonalShaderDispatcher({ workerClient: fakeWorkerClient });

    const mockPutImageData = () => {
      rendersCount++;
    };

    const targetCanvas = {
      width: 4,
      height: 4,
      getContext: () => ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: mockPutImageData,
      }),
    } as unknown as HTMLCanvasElement;

    const offscreenCanvas = {
      width: 4,
      height: 4,
      getContext: () => ({
        filter: '',
        drawImage: () => {},
        getImageData: () => ({
          data: new Uint8ClampedArray(4 * 4 * 4).fill(128),
        }),
      }),
    } as unknown as HTMLCanvasElement;

    const sourceImage = {} as HTMLImageElement;

    const createJob = (ghostOpacity: number): TonalRenderJob => ({
      sourceImage,
      targetCanvas,
      offscreenCanvas,
      layers: testLayers,
      viewMode: 'valueStudy',
      ghostOpacity,
      isolation: { kind: 'none' },
      familyFloors: { halftoneFloor: 85, lightFloor: 170 },
      blurRadius: 0,
      onComplete: () => {
        lastGhostOpacity = ghostOpacity;
      },
    });

    // Rapidly fire 3 slider ticks before any animation frame runs
    dispatcher.dispatch(createJob(0.1));
    dispatcher.dispatch(createJob(0.2));
    dispatcher.dispatch(createJob(0.3));

    // At this point, no render has executed yet because it is batched on RAF
    assert.equal(rendersCount, 0, 'No renders should run synchronously during rapid dispatch calls');
    assert.ok(rafCallback !== null, 'RAF callback must be scheduled');

    // Simulate the browser rendering the animation frame
    (rafCallback as unknown as (time: number) => void)(16);

    assert.equal(rendersCount, 1, 'Only exactly 1 render should execute for the batch');
    assert.equal(lastGhostOpacity, 0.3, 'The latest parameters (0.3) should be the ones rendered');

    dispatcher.dispose();
  } finally {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
  }
});

test('TonalShaderDispatcher offloads per-pixel processing when worker is available', async () => {
  let rafCallback: FrameRequestCallback | null = null;
  const originalRaf = globalThis.requestAnimationFrame;

  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafCallback = cb;
    return 1;
  };

  try {
    let workerComputeCalled = false;
    let putImageDataCalled = false;

    const fakeWorkerClient = {
      isAvailable: true,
      compute: async () => {
        workerComputeCalled = true;
        return new Uint8ClampedArray(4 * 4 * 4).fill(200);
      },
      terminate: () => {},
    };

    const dispatcher = new TonalShaderDispatcher({ workerClient: fakeWorkerClient });

    const targetCanvas = {
      width: 4,
      height: 4,
      getContext: () => ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {
          putImageDataCalled = true;
        },
      }),
    } as unknown as HTMLCanvasElement;

    const offscreenCanvas = {
      width: 4,
      height: 4,
      getContext: () => ({
        filter: '',
        drawImage: () => {},
        getImageData: () => ({
          data: new Uint8ClampedArray(4 * 4 * 4).fill(128),
        }),
      }),
    } as unknown as HTMLCanvasElement;

    let completed = false;
    dispatcher.dispatch({
      sourceImage: {} as HTMLImageElement,
      targetCanvas,
      offscreenCanvas,
      layers: testLayers,
      viewMode: 'valueStudy',
      ghostOpacity: 0.18,
      isolation: { kind: 'none' },
      familyFloors: { halftoneFloor: 85, lightFloor: 170 },
      blurRadius: 0,
      onComplete: () => {
        completed = true;
      },
    });

    (rafCallback as unknown as (time: number) => void)(16);
    // Allow async worker promise resolution
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.ok(workerComputeCalled, 'Worker compute should be called');
    assert.ok(putImageDataCalled, 'Target canvas putImageData should be called with worker result');
    assert.ok(completed, 'onComplete should be invoked');

    dispatcher.dispose();
  } finally {
    globalThis.requestAnimationFrame = originalRaf;
  }
});

test('TonalShaderDispatcher cancel() cancels pending RAF and pending job', () => {
  let rafCancelled = false;
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCaf = globalThis.cancelAnimationFrame;

  globalThis.requestAnimationFrame = () => 42;
  globalThis.cancelAnimationFrame = (id: number) => {
    if (id === 42) rafCancelled = true;
  };

  try {
    const dispatcher = new TonalShaderDispatcher({
      workerClient: { isAvailable: false, compute: async () => new Uint8ClampedArray(), terminate: () => {} },
    });

    let rendered = false;
    dispatcher.dispatch({
      sourceImage: {} as HTMLImageElement,
      targetCanvas: {} as HTMLCanvasElement,
      layers: testLayers,
      viewMode: 'valueStudy',
      onComplete: () => {
        rendered = true;
      },
    });

    dispatcher.cancel();
    assert.equal(rafCancelled, true, 'cancelAnimationFrame should be called with pending RAF id');
    dispatcher.dispose();
    assert.equal(rendered, false, 'Cancelled job should not execute');
  } finally {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
  }
});

test('TonalShaderDispatcher dispatch with immediate: true executes synchronously without waiting for RAF', () => {
  let putImageDataCalled = false;

  const targetCanvas = {
    width: 4,
    height: 4,
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => {
        putImageDataCalled = true;
      },
    }),
  } as unknown as HTMLCanvasElement;

  const offscreenCanvas = {
    width: 4,
    height: 4,
    getContext: () => ({
      filter: '',
      drawImage: () => {},
      getImageData: () => ({
        data: new Uint8ClampedArray(4 * 4 * 4).fill(128),
      }),
    }),
  } as unknown as HTMLCanvasElement;

  const dispatcher = new TonalShaderDispatcher({
    workerClient: { isAvailable: false, compute: async () => new Uint8ClampedArray(), terminate: () => {} },
  });

  let completed = false;
  dispatcher.dispatch(
    {
      sourceImage: {} as HTMLImageElement,
      targetCanvas,
      offscreenCanvas,
      layers: testLayers,
      viewMode: 'valueStudy',
      onComplete: () => {
        completed = true;
      },
    },
    { immediate: true }
  );

  assert.equal(putImageDataCalled, true, 'Immediate dispatch should run synchronously');
  assert.equal(completed, true, 'onComplete should be invoked immediately');
  dispatcher.dispose();
});

