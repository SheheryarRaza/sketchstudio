import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDY_LOG_STORAGE_KEY,
  loadStudyLog,
  saveStudyLog,
  appendStudyLogEntry,
  updateStudyLogEntryNotes,
  deleteStudyLogEntry,
  clearStudyLog,
  computeStudyLogSummary,
  computeStudyLogStats,
  formatStudyDuration,
  type StorageLike,
} from './studyLog';
import type { StudyLogEntry } from '../types/gesture';

class MockStorage implements StorageLike {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

test('loadStudyLog returns empty array when storage is empty or key is missing', () => {
  const storage = new MockStorage();
  const result = loadStudyLog(storage);
  assert.deepEqual(result, []);
});

test('loadStudyLog returns empty array safely when storage contains malformed JSON', () => {
  const storage = new MockStorage();
  storage.setItem(STUDY_LOG_STORAGE_KEY, '{ invalid json');
  const result = loadStudyLog(storage);
  assert.deepEqual(result, []);
});

test('loadStudyLog correctly deserializes stored entries', () => {
  const storage = new MockStorage();
  const sampleEntries: StudyLogEntry[] = [
    {
      id: 'entry-1',
      date: '2026-09-12T10:00:00.000Z',
      durationSeconds: 30,
      referenceTitle: 'Classical Portrait',
      notes: 'Initial warm-up',
    },
    {
      id: 'entry-2',
      date: '2026-09-12T10:05:00.000Z',
      durationSeconds: 120,
      referenceTitle: 'Asaro Head',
    },
  ];
  storage.setItem(STUDY_LOG_STORAGE_KEY, JSON.stringify(sampleEntries));

  const result = loadStudyLog(storage);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'entry-1');
  assert.equal(result[0].durationSeconds, 30);
  assert.equal(result[1].referenceTitle, 'Asaro Head');
});

test('saveStudyLog serializes entries to storage under STUDY_LOG_STORAGE_KEY', () => {
  const storage = new MockStorage();
  const sampleEntries: StudyLogEntry[] = [
    {
      id: 'entry-1',
      date: '2026-09-12T10:00:00.000Z',
      durationSeconds: 300,
      referenceTitle: 'Rembrandt Study',
    },
  ];

  saveStudyLog(sampleEntries, storage);
  const raw = storage.getItem(STUDY_LOG_STORAGE_KEY);
  assert.ok(raw);
  assert.deepEqual(JSON.parse(raw), sampleEntries);
});

test('saveStudyLog handles storage exceptions gracefully without crashing', () => {
  const throwingStorage: StorageLike = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => {},
  };

  assert.doesNotThrow(() => {
    saveStudyLog([{ id: '1', date: 'now', durationSeconds: 30, referenceTitle: 'Test' }], throwingStorage);
  });
});

test('appendStudyLogEntry creates a new entry with generated id and date and updates storage', () => {
  const storage = new MockStorage();
  const { entry, log } = appendStudyLogEntry(
    {
      durationSeconds: 120,
      referenceTitle: 'Loomis Profile',
      notes: 'Focused on brow line and nose tilt',
    },
    storage,
  );

  assert.ok(entry.id);
  assert.ok(entry.date);
  assert.equal(entry.durationSeconds, 120);
  assert.equal(entry.referenceTitle, 'Loomis Profile');
  assert.equal(entry.notes, 'Focused on brow line and nose tilt');

  assert.equal(log.length, 1);
  assert.equal(log[0].id, entry.id);

  // Second append prepends newest first
  const { entry: entry2, log: log2 } = appendStudyLogEntry(
    {
      durationSeconds: 30,
      referenceTitle: 'Classical Portrait',
    },
    storage,
  );

  assert.equal(log2.length, 2);
  assert.equal(log2[0].id, entry2.id);
  assert.equal(log2[1].id, entry.id);
});

test('updateStudyLogEntryNotes modifies note on existing entry and persists', () => {
  const storage = new MockStorage();
  const { entry } = appendStudyLogEntry({ durationSeconds: 30, referenceTitle: 'Ref 1' }, storage);

  const updatedLog = updateStudyLogEntryNotes(entry.id, 'Heads got rounder after thirty sessions', storage);
  assert.equal(updatedLog[0].notes, 'Heads got rounder after thirty sessions');

  const reloaded = loadStudyLog(storage);
  assert.equal(reloaded[0].notes, 'Heads got rounder after thirty sessions');
});

test('deleteStudyLogEntry removes entry by id and persists updated log', () => {
  const storage = new MockStorage();
  const { entry: e1 } = appendStudyLogEntry({ durationSeconds: 30, referenceTitle: 'Ref 1' }, storage);
  const { entry: e2 } = appendStudyLogEntry({ durationSeconds: 120, referenceTitle: 'Ref 2' }, storage);

  assert.equal(loadStudyLog(storage).length, 2);
  const afterDelete = deleteStudyLogEntry(e1.id, storage);
  assert.equal(afterDelete.length, 1);
  assert.equal(afterDelete[0].id, e2.id);
  assert.equal(loadStudyLog(storage).length, 1);
});

test('clearStudyLog removes study log key from storage', () => {
  const storage = new MockStorage();
  appendStudyLogEntry({ durationSeconds: 30, referenceTitle: 'Ref 1' }, storage);
  assert.equal(loadStudyLog(storage).length, 1);

  clearStudyLog(storage);
  assert.equal(loadStudyLog(storage).length, 0);
  assert.equal(storage.getItem(STUDY_LOG_STORAGE_KEY), null);
});

test('computeStudyLogSummary calculates totals, duration breakdowns, and unique reference count', () => {
  const entries: StudyLogEntry[] = [
    { id: '1', date: '2026-09-10T10:00:00Z', durationSeconds: 30, referenceTitle: 'Ref A' },
    { id: '2', date: '2026-09-11T10:00:00Z', durationSeconds: 30, referenceTitle: 'Ref B' },
    { id: '3', date: '2026-09-12T10:00:00Z', durationSeconds: 120, referenceTitle: 'Ref A' },
    { id: '4', date: '2026-09-12T11:00:00Z', durationSeconds: 300, referenceTitle: 'Ref C' },
  ];

  const summary = computeStudyLogSummary(entries);
  assert.equal(summary.totalSessions, 4);
  assert.equal(summary.totalDurationSeconds, 480);
  assert.equal(summary.sessionsByDuration[30], 2);
  assert.equal(summary.sessionsByDuration[120], 1);
  assert.equal(summary.sessionsByDuration[300], 1);
  assert.equal(summary.uniqueReferencesCount, 3);
  assert.equal(summary.lastSessionDate, '2026-09-10T10:00:00Z');
});

test('computeStudyLogSummary handles empty log gracefully', () => {
  const summary = computeStudyLogSummary([]);
  assert.equal(summary.totalSessions, 0);
  assert.equal(summary.totalDurationSeconds, 0);
  assert.equal(summary.uniqueReferencesCount, 0);
  assert.equal(summary.lastSessionDate, null);
});

test('formatStudyDuration converts seconds to readable human strings', () => {
  assert.equal(formatStudyDuration(30), '30s');
  assert.equal(formatStudyDuration(60), '1m');
  assert.equal(formatStudyDuration(120), '2m');
  assert.equal(formatStudyDuration(300), '5m');
  assert.equal(formatStudyDuration(90), '1m 30s');
  assert.equal(formatStudyDuration(3600), '1h');
  assert.equal(formatStudyDuration(3660), '1h 1m');
});
