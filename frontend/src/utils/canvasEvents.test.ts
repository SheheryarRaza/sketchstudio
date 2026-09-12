import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateZoomScale,
  shouldStartPan,
  subtractPoints,
  computePanPoint,
  computeInitialPan,
  registerNonPassiveWheelListener,
  MIN_CANVAS_SCALE,
  MAX_CANVAS_SCALE,
} from './canvasEvents';

test('calculateZoomScale zooms in when deltaY is negative', () => {
  const current = 1.0;
  const next = calculateZoomScale(current, -100);
  assert.equal(next, 1.12);
});

test('calculateZoomScale zooms out when deltaY is positive', () => {
  const current = 1.0;
  const next = calculateZoomScale(current, 100);
  assert.equal(next, 0.88);
});

test('calculateZoomScale clamps zoom to MIN_CANVAS_SCALE and MAX_CANVAS_SCALE', () => {
  const clampedMax = calculateZoomScale(7.5, -500);
  assert.equal(clampedMax, MAX_CANVAS_SCALE);

  const clampedMin = calculateZoomScale(0.09, 500);
  assert.equal(clampedMin, MIN_CANVAS_SCALE);
});

test('calculateZoomScale returns current scale when deltaY is zero', () => {
  assert.equal(calculateZoomScale(1.5, 0), 1.5);
});

test('shouldStartPan rejects non-primary pointer button', () => {
  assert.equal(
    shouldStartPan({
      button: 1, // middle button
      pointerType: 'mouse',
      targetTagName: 'CANVAS',
    }),
    false
  );

  assert.equal(
    shouldStartPan({
      button: 2, // context menu button
      pointerType: 'touch',
    }),
    false
  );
});

test('shouldStartPan rejects interactive targets like buttons and inputs', () => {
  assert.equal(
    shouldStartPan({
      button: 0,
      pointerType: 'touch',
      isInteractiveTarget: true,
    }),
    false
  );

  assert.equal(
    shouldStartPan({
      button: 0,
      pointerType: 'mouse',
      isInteractiveTarget: true,
      targetTagName: 'CANVAS',
    }),
    false
  );
});

test('shouldStartPan accepts primary pointer across touch, pen, and mouse', () => {
  // Touch panning works directly on the canvas or container background
  assert.equal(
    shouldStartPan({
      button: 0,
      pointerType: 'touch',
      targetTagName: 'CANVAS',
    }),
    true
  );

  assert.equal(
    shouldStartPan({
      button: 0,
      pointerType: 'touch',
      targetTagName: 'DIV',
    }),
    true
  );

  // Pen/stylus input
  assert.equal(
    shouldStartPan({
      button: 0,
      pointerType: 'pen',
      targetTagName: 'CANVAS',
    }),
    true
  );

  // Mouse input on canvas or workspace background
  assert.equal(
    shouldStartPan({
      button: 0,
      pointerType: 'mouse',
      targetTagName: 'CANVAS',
    }),
    true
  );

  assert.equal(
    shouldStartPan({
      button: 0,
      pointerType: 'mouse',
      targetTagName: 'DIV',
    }),
    true
  );
});

test('subtractPoints computes coordinate differences', () => {
  assert.deepEqual(subtractPoints({ x: 300, y: 200 }, { x: 100, y: 50 }), { x: 200, y: 150 });
  assert.deepEqual(subtractPoints({ x: 50, y: 20 }, { x: 100, y: 50 }), { x: -50, y: -30 });
});

test('computeInitialPan and computePanPoint calculate correct panning coordinates', () => {
  const currentPan = { x: 100, y: 50 };
  const clientPoint = { x: 300, y: 200 };

  const startPan = computeInitialPan(currentPan, clientPoint);
  assert.deepEqual(startPan, { x: 200, y: 150 });

  const nextPan = computePanPoint(startPan, { x: 350, y: 220 });
  assert.deepEqual(nextPan, { x: 150, y: 70 });
});

test('registerNonPassiveWheelListener returns no-op when container is null', () => {
  const cleanup = registerNonPassiveWheelListener(null, () => {});
  assert.equal(typeof cleanup, 'function');
  assert.doesNotThrow(() => cleanup());
});

test('registerNonPassiveWheelListener registers non-passive wheel listener and intercepts events', () => {
  let registeredEvent = '';
  let registeredOptions: AddEventListenerOptions | boolean | undefined;
  let registeredHandler: ((e: any) => void) | undefined;
  let removedEvent = '';
  let removedHandler: any;

  const mockElement = {
    addEventListener: (event: string, handler: any, options?: any) => {
      registeredEvent = event;
      registeredHandler = handler;
      registeredOptions = options;
    },
    removeEventListener: (event: string, handler: any) => {
      removedEvent = event;
      removedHandler = handler;
    },
  };

  let receivedDeltaY = 0;
  const cleanup = registerNonPassiveWheelListener(mockElement as unknown as HTMLElement, (deltaY) => {
    receivedDeltaY = deltaY;
  });

  // Verify non-passive listener registration
  assert.equal(registeredEvent, 'wheel');
  assert.deepEqual(registeredOptions, { passive: false });
  assert.ok(registeredHandler);

  // Trigger wheel event with preventDefault spy
  let prevented = false;
  const mockWheelEvent = {
    deltaY: -120,
    preventDefault: () => {
      prevented = true;
    },
  };

  registeredHandler!(mockWheelEvent);
  assert.equal(prevented, true, 'e.preventDefault() must be invoked on wheel event');
  assert.equal(receivedDeltaY, -120, 'deltaY must be delivered to zoom callback');

  // Verify cleanup
  cleanup();
  assert.equal(removedEvent, 'wheel');
  assert.equal(removedHandler, registeredHandler);
});
