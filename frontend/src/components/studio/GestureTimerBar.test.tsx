import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GestureTimerBar } from './GestureTimerBar';
import type { GestureSessionState } from '../../types/gesture';

const noop = () => {};

test('GestureTimerBar renders remaining time and duration label when running', () => {
  const session: GestureSessionState = {
    status: 'running',
    targetDuration: 120,
    remainingSeconds: 75,
    referenceTitle: 'Classical Portrait',
    isReferenceHidden: false,
    completedEntryId: null,
  };

  const html = renderToStaticMarkup(
    <GestureTimerBar
      session={session}
      onPause={noop}
      onResume={noop}
      onCancel={noop}
    />
  );

  assert.match(html, /01:15/);
  assert.match(html, /2 min/);
  assert.match(html, /Classical Portrait/);
  assert.match(html, /aria-label="Pause timer"/);
});

test('GestureTimerBar renders resume button when paused', () => {
  const session: GestureSessionState = {
    status: 'paused',
    targetDuration: 30,
    remainingSeconds: 15,
    referenceTitle: 'Loomis Profile',
    isReferenceHidden: false,
    completedEntryId: null,
  };

  const html = renderToStaticMarkup(
    <GestureTimerBar
      session={session}
      onPause={noop}
      onResume={noop}
      onCancel={noop}
    />
  );

  assert.match(html, /00:15/);
  assert.match(html, /Paused/);
  assert.match(html, /aria-label="Resume timer"/);
});

test('GestureTimerBar returns null when session is idle or completed', () => {
  const idleSession: GestureSessionState = {
    status: 'idle',
    targetDuration: 0,
    remainingSeconds: 0,
    referenceTitle: '',
    isReferenceHidden: false,
    completedEntryId: null,
  };

  const htmlIdle = renderToStaticMarkup(
    <GestureTimerBar
      session={idleSession}
      onPause={noop}
      onResume={noop}
      onCancel={noop}
    />
  );

  assert.equal(htmlIdle, '');
});
