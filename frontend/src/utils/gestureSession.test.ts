import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GESTURE_PRESETS,
  createInitialGestureState,
  startGestureSession,
  tickGestureSession,
  pauseGestureSession,
  resumeGestureSession,
  cancelGestureSession,
  setReferenceHidden,
  formatTimeRemaining,
} from './gestureSession';

test('GESTURE_PRESETS contains 30s, 2min, and 5min presets', () => {
  const durations = GESTURE_PRESETS.map((p) => p.seconds);
  assert.ok(durations.includes(30));
  assert.ok(durations.includes(120));
  assert.ok(durations.includes(300));
});

test('createInitialGestureState initializes to idle with reference visible', () => {
  const state = createInitialGestureState();
  assert.equal(state.status, 'idle');
  assert.equal(state.remainingSeconds, 0);
  assert.equal(state.isReferenceHidden, false);
  assert.equal(state.completedEntryId, null);
});

test('startGestureSession sets running status, target duration, and ensures reference is visible', () => {
  const initial = createInitialGestureState();
  const started = startGestureSession(initial, 120, 'Classical Atelier Portrait');

  assert.equal(started.status, 'running');
  assert.equal(started.targetDuration, 120);
  assert.equal(started.remainingSeconds, 120);
  assert.equal(started.referenceTitle, 'Classical Atelier Portrait');
  assert.equal(started.isReferenceHidden, false);
  assert.equal(started.completedEntryId, null);
});

test('tickGestureSession decrements remaining seconds while running', () => {
  const initial = createInitialGestureState();
  const started = startGestureSession(initial, 30, 'Test Ref');

  const { state: t1, justCompleted: jc1 } = tickGestureSession(started, 1);
  assert.equal(t1.remainingSeconds, 29);
  assert.equal(t1.status, 'running');
  assert.equal(t1.isReferenceHidden, false);
  assert.equal(jc1, false);

  const { state: t2, justCompleted: jc2 } = tickGestureSession(t1, 10);
  assert.equal(t2.remainingSeconds, 19);
  assert.equal(t2.status, 'running');
  assert.equal(jc2, false);
});

test('tickGestureSession transitions to completed and automatically hides reference image when time runs out', () => {
  const initial = createInitialGestureState();
  const started = startGestureSession(initial, 30, 'Test Ref');

  // Fast forward to 1 second remaining
  const { state: nearEnd } = tickGestureSession(started, 29);
  assert.equal(nearEnd.remainingSeconds, 1);
  assert.equal(nearEnd.isReferenceHidden, false);

  // Elapse final second
  const { state: ended, justCompleted } = tickGestureSession(nearEnd, 1);
  assert.equal(ended.status, 'completed');
  assert.equal(ended.remainingSeconds, 0);
  assert.equal(ended.isReferenceHidden, true); // Acceptance criteria: hidden automatically!
  assert.equal(justCompleted, true);

  // Subsequent ticks on completed state do nothing
  const { state: afterEnded, justCompleted: jcAfter } = tickGestureSession(ended, 1);
  assert.equal(afterEnded.status, 'completed');
  assert.equal(afterEnded.remainingSeconds, 0);
  assert.equal(jcAfter, false);
});

test('tickGestureSession is a no-op when status is not running', () => {
  const idle = createInitialGestureState();
  const { state: idleTick } = tickGestureSession(idle, 1);
  assert.equal(idleTick.status, 'idle');
  assert.equal(idleTick.remainingSeconds, 0);

  const running = startGestureSession(idle, 30, 'Ref');
  const paused = pauseGestureSession(running);
  const { state: pausedTick } = tickGestureSession(paused, 1);
  assert.equal(pausedTick.status, 'paused');
  assert.equal(pausedTick.remainingSeconds, 30);
});

test('pauseGestureSession and resumeGestureSession toggle between paused and running', () => {
  const initial = createInitialGestureState();
  const running = startGestureSession(initial, 120, 'Ref');

  const paused = pauseGestureSession(running);
  assert.equal(paused.status, 'paused');
  assert.equal(paused.remainingSeconds, 120);

  const resumed = resumeGestureSession(paused);
  assert.equal(resumed.status, 'running');
  assert.equal(resumed.remainingSeconds, 120);
});

test('cancelGestureSession resets session back to idle and unhides reference', () => {
  const initial = createInitialGestureState();
  const running = startGestureSession(initial, 120, 'Ref');
  const { state: completed } = tickGestureSession(running, 120);
  assert.equal(completed.isReferenceHidden, true);

  const cancelled = cancelGestureSession(completed);
  assert.equal(cancelled.status, 'idle');
  assert.equal(cancelled.remainingSeconds, 0);
  assert.equal(cancelled.isReferenceHidden, false);
});

test('setReferenceHidden allows artist to peek/unhide reference or re-hide it after session completion', () => {
  const initial = createInitialGestureState();
  const running = startGestureSession(initial, 30, 'Ref');
  const { state: completed } = tickGestureSession(running, 30);
  assert.equal(completed.isReferenceHidden, true);

  // Artist unhides to review their drawing against reference
  const revealed = setReferenceHidden(completed, false);
  assert.equal(revealed.isReferenceHidden, false);

  // Artist re-hides reference
  const rehidden = setReferenceHidden(revealed, true);
  assert.equal(rehidden.isReferenceHidden, true);
});

test('formatTimeRemaining formats mm:ss correctly', () => {
  assert.equal(formatTimeRemaining(0), '00:00');
  assert.equal(formatTimeRemaining(9), '00:09');
  assert.equal(formatTimeRemaining(30), '00:30');
  assert.equal(formatTimeRemaining(65), '01:05');
  assert.equal(formatTimeRemaining(120), '02:00');
  assert.equal(formatTimeRemaining(300), '05:00');
});
