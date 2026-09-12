import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudyLogModal } from './StudyLogModal';
import type { StudyLogEntry } from '../../types/gesture';

const noop = () => {};

test('StudyLogModal renders nothing when isOpen is false', () => {
  const html = renderToStaticMarkup(
    <StudyLogModal
      isOpen={false}
      entries={[]}
      onClose={noop}
      onStartSession={noop}
      onDeleteEntry={noop}
      onUpdateNotes={noop}
      onClearLog={noop}
    />
  );

  assert.equal(html, '');
});

test('StudyLogModal renders empty state when entries list is empty', () => {
  const html = renderToStaticMarkup(
    <StudyLogModal
      isOpen={true}
      entries={[]}
      onClose={noop}
      onStartSession={noop}
      onDeleteEntry={noop}
      onUpdateNotes={noop}
      onClearLog={noop}
    />
  );

  assert.match(html, /Gesture Study Log/);
  assert.match(html, /No study sessions logged yet/i);
  assert.match(html, /30s/);
  assert.match(html, /2 min/);
  assert.match(html, /5 min/);
});

test('StudyLogModal renders sessions history and summary stats when entries exist', () => {
  const sampleEntries: StudyLogEntry[] = [
    {
      id: 'entry-1',
      date: '2026-09-12T10:00:00.000Z',
      durationSeconds: 30,
      referenceTitle: 'Classical Atelier Portrait',
      notes: 'Focused on line of action',
    },
    {
      id: 'entry-2',
      date: '2026-09-12T10:05:00.000Z',
      durationSeconds: 120,
      referenceTitle: 'Asaro Head',
    },
  ];

  const html = renderToStaticMarkup(
    <StudyLogModal
      isOpen={true}
      entries={sampleEntries}
      onClose={noop}
      onStartSession={noop}
      onDeleteEntry={noop}
      onUpdateNotes={noop}
      onClearLog={noop}
    />
  );

  // Summary stats
  assert.match(html, /2\s*Sessions/i);
  assert.match(html, /Classical Atelier Portrait/);
  assert.match(html, /Asaro Head/);
  assert.match(html, /Focused on line of action/);
  assert.match(html, /30s/);
  assert.match(html, /2m/);
});

test('StudyLogModal disables preset buttons when hasReferenceImage is false', () => {
  const html = renderToStaticMarkup(
    <StudyLogModal
      isOpen={true}
      entries={[]}
      onClose={noop}
      onStartSession={noop}
      onDeleteEntry={noop}
      onUpdateNotes={noop}
      onClearLog={noop}
      hasReferenceImage={false}
    />
  );

  assert.match(html, /disabled=""/);
  assert.match(html, /Upload a Reference Image first/);
});

