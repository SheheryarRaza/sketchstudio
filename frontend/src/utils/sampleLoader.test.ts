import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSamplePortraitAsDataUrl } from './sampleLoader';

test('loadSamplePortraitAsDataUrl resolves data URL on successful fetch', async () => {
  const fakeBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' });
  const mockFetch = async () =>
    new Response(fakeBlob, {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    });

  const dataUrl = await loadSamplePortraitAsDataUrl(
    '/samples/charcoal-study.jpg',
    'Charcoal Study',
    mockFetch as typeof fetch,
  );

  assert.ok(dataUrl.startsWith('data:image/jpeg;base64,'));
});

test('loadSamplePortraitAsDataUrl throws actionable error when network fetch rejects', async () => {
  const mockFetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  await assert.rejects(
    () =>
      loadSamplePortraitAsDataUrl(
        '/samples/charcoal-study.jpg',
        'Charcoal Study',
        mockFetch as typeof fetch,
      ),
    (err: Error) => {
      assert.match(err.message, /Could not reach network to load sample image "Charcoal Study"/);
      assert.match(err.message, /Check your connection or upload an image from your device/);
      return true;
    },
  );
});

test('loadSamplePortraitAsDataUrl throws actionable error when HTTP status is not ok (e.g. 404)', async () => {
  const mockFetch = async () =>
    new Response('Not Found', {
      status: 404,
      statusText: 'Not Found',
    });

  await assert.rejects(
    () =>
      loadSamplePortraitAsDataUrl(
        '/samples/missing-study.jpg',
        'Missing Study',
        mockFetch as typeof fetch,
      ),
    (err: Error) => {
      assert.match(err.message, /Failed to load sample image "Missing Study" \(404 Not Found\)/);
      assert.match(err.message, /The reference file could not be retrieved/);
      return true;
    },
  );
});

test('loadSamplePortraitAsDataUrl throws actionable error when returned blob is empty', async () => {
  const emptyBlob = new Blob([]);
  const mockFetch = async () =>
    new Response(emptyBlob, {
      status: 200,
    });

  await assert.rejects(
    () =>
      loadSamplePortraitAsDataUrl(
        '/samples/empty.jpg',
        'Empty Study',
        mockFetch as typeof fetch,
      ),
    (err: Error) => {
      assert.match(err.message, /Sample image "Empty Study" returned an empty file/);
      assert.match(err.message, /Try uploading an image from your device instead/);
      return true;
    },
  );
});
