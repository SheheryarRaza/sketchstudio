import test from 'node:test';
import assert from 'node:assert/strict';
import { isLoadedImageSynchronized } from './edgesView';

test('isLoadedImageSynchronized returns false when loadedImage is null or undefined', () => {
  assert.equal(isLoadedImageSynchronized(null, 'reference-1.png'), false);
  assert.equal(isLoadedImageSynchronized(undefined, 'reference-1.png'), false);
});

test('isLoadedImageSynchronized returns false when current imageSrc is null, undefined, or empty', () => {
  const img = { src: 'reference-1.png' };
  assert.equal(isLoadedImageSynchronized(img, null), false);
  assert.equal(isLoadedImageSynchronized(img, undefined), false);
  assert.equal(isLoadedImageSynchronized(img, ''), false);
});

test('isLoadedImageSynchronized returns false when loadedImage.src does not match current Reference Image src (Issue #14 race condition)', () => {
  // Simulates the moment when project.imageSrc has updated to reference-2,
  // but loadedImage is still holding reference-1 because reference-2 is decoding.
  const staleLoadedImage = { src: 'reference-1.png' };
  const newReferenceImageSrc = 'reference-2.png';

  assert.equal(isLoadedImageSynchronized(staleLoadedImage, newReferenceImageSrc), false);
});

test('isLoadedImageSynchronized returns true when loadedImage.src matches current Reference Image src', () => {
  const syncedImage = { src: 'data:image/svg+xml;base64,mockReference' };
  assert.equal(
    isLoadedImageSynchronized(syncedImage, 'data:image/svg+xml;base64,mockReference'),
    true
  );
});

test('switching Reference Image while parked on edges view prevents caching contours under wrong key (Issue #14 lifecycle)', () => {
  let edgesCache: { src: string; bitmap: string } | null = null;

  // 1. Initial Reference Image A is loaded and cached
  const refImageA = 'reference-a.png';
  let loadedImage: { src: string } | null = { src: refImageA };
  let currentImageSrc = refImageA;

  assert.equal(isLoadedImageSynchronized(loadedImage, currentImageSrc), true);
  edgesCache = { src: refImageA, bitmap: 'contours-a' };

  // 2. Artist selects Reference Image B while parked on edges view
  currentImageSrc = 'reference-b.png';
  // loadedImage still holds Reference Image A during asynchronous decoding
  assert.equal(loadedImage.src, refImageA);

  // Synchronization check fails during decode window:
  const isSynchronizedDuringDecode = isLoadedImageSynchronized(loadedImage, currentImageSrc);
  assert.equal(isSynchronizedDuringDecode, false);

  // Stale contours from Reference Image A are NOT cached under Reference Image B key:
  const cachedForB = edgesCache.src === currentImageSrc ? edgesCache : null;
  assert.equal(cachedForB, null);

  // 3. Reference Image B finishes decoding
  loadedImage = { src: 'reference-b.png' };
  assert.equal(isLoadedImageSynchronized(loadedImage, currentImageSrc), true);

  // Now contour extraction runs for Reference Image B and safely caches the result
  edgesCache = { src: currentImageSrc, bitmap: 'contours-b' };

  // Verify cached result for Reference Image B
  assert.equal(edgesCache.src === currentImageSrc ? edgesCache.bitmap : null, 'contours-b');
  assert.notEqual(edgesCache.src, refImageA);
});
