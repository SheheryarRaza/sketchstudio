import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchLandmarks,
  fetchLightDirection,
  fetchHistogram,
  fetchEdgeContours,
  fetchSuggestedEdges,
  IMAGE_TOO_LARGE_ERROR_MESSAGE,
  handleAnalysisResponseError,
} from './analysisApi';

test('handleAnalysisResponseError maps HTTP 413 to actionable image-too-large error message', () => {
  assert.throws(
    () => handleAnalysisResponseError(413, 'Landmark Auto-Snap failed'),
    (err: Error) => {
      assert.equal(err.message, IMAGE_TOO_LARGE_ERROR_MESSAGE);
      assert.match(err.message, /Image is too large for analysis/i);
      assert.match(err.message, /resize/i);
      assert.match(err.message, /retry/i);
      return true;
    }
  );
});

test('handleAnalysisResponseError maps other HTTP statuses to default formatted error message', () => {
  assert.throws(
    () => handleAnalysisResponseError(500, 'Landmark Auto-Snap failed'),
    (err: Error) => {
      assert.equal(err.message, 'Landmark Auto-Snap failed (500)');
      return true;
    }
  );
  assert.throws(
    () => handleAnalysisResponseError(422, 'Histogram analysis failed'),
    (err: Error) => {
      assert.equal(err.message, 'Histogram analysis failed (422)');
      return true;
    }
  );
});

async function withMock413Environment(fn: () => Promise<void>) {
  const originalFetch = globalThis.fetch;
  const originalDocument = (globalThis as unknown as { document: unknown }).document;

  try {
    const mockCanvas = {
      width: 100,
      height: 100,
      getContext: () => ({
        drawImage: () => {},
      }),
      toBlob: (cb: (b: Blob | null) => void) => {
        cb(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
      },
    };

    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return {};
      },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ detail: 'Uploaded image exceeds maximum allowed size' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    await fn();
  } finally {
    globalThis.fetch = originalFetch;
    (globalThis as unknown as { document: unknown }).document = originalDocument;
  }
}

test('fetchLandmarks rejects with actionable message when backend returns 413', async () => {
  await withMock413Environment(async () => {
    const fakeImg = {} as HTMLImageElement;
    const renderSize = { width: 100, height: 100, scale: 1 };

    await assert.rejects(
      () => fetchLandmarks(fakeImg, renderSize),
      (err: Error) => {
        assert.equal(err.message, IMAGE_TOO_LARGE_ERROR_MESSAGE);
        return true;
      }
    );
  });
});

test('fetchLightDirection rejects with actionable message when backend returns 413', async () => {
  await withMock413Environment(async () => {
    const fakeImg = {} as HTMLImageElement;
    const renderSize = { width: 100, height: 100, scale: 1 };

    await assert.rejects(
      () => fetchLightDirection(fakeImg, renderSize),
      (err: Error) => {
        assert.equal(err.message, IMAGE_TOO_LARGE_ERROR_MESSAGE);
        return true;
      }
    );
  });
});
