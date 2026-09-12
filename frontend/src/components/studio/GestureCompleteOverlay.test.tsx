import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GestureCompleteOverlay } from './GestureCompleteOverlay';
import type { GestureSessionState } from '../../types/gesture';

const noop = () => {};

test('GestureCompleteOverlay renders full concealment screen when session is completed and reference is hidden', () => {
  const session: GestureSessionState = {
    status: 'completed',
    targetDuration: 30,
    remainingSeconds: 0,
    referenceTitle: 'Classical Portrait',
    isReferenceHidden: true,
    completedEntryId: 'entry-123',
  };

  const html = renderToStaticMarkup(
    <GestureCompleteOverlay
      session={session}
      onToggleReferenceHidden={noop}
      onStartSession={noop}
      onOpenStudyLog={noop}
      onSaveNote={noop}
    />
  );

  assert.match(html, /Time&#x27;s Up!|Time's Up!/);
  assert.match(html, /30s/);
  assert.match(html, /Classical Portrait/);
  assert.match(html, /Show Reference Image/);
  assert.match(html, /View Study Log/);
});

test('GestureCompleteOverlay renders comparison banner when reference is revealed after completion', () => {
  const session: GestureSessionState = {
    status: 'completed',
    targetDuration: 120,
    remainingSeconds: 0,
    referenceTitle: 'Classical Portrait',
    isReferenceHidden: false, // Revealed for review
    completedEntryId: 'entry-123',
  };

  const html = renderToStaticMarkup(
    <GestureCompleteOverlay
      session={session}
      onToggleReferenceHidden={noop}
      onStartSession={noop}
      onOpenStudyLog={noop}
      onSaveNote={noop}
    />
  );

  assert.match(html, /Hide Reference Image/);
  assert.match(html, /View Study Log/);
});

test('GestureCompleteOverlay returns null when session status is not completed', () => {
  const session: GestureSessionState = {
    status: 'running',
    targetDuration: 30,
    remainingSeconds: 15,
    referenceTitle: 'Classical Portrait',
    isReferenceHidden: false,
    completedEntryId: null,
  };

  const html = renderToStaticMarkup(
    <GestureCompleteOverlay
      session={session}
      onToggleReferenceHidden={noop}
      onStartSession={noop}
      onOpenStudyLog={noop}
      onSaveNote={noop}
    />
  );

  assert.equal(html, '');
});
