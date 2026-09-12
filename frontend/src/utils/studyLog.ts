import type { StudyLogEntry, StudyLogSummary } from '../types/gesture';

export const STUDY_LOG_STORAGE_KEY = 'sketchstudio_study_log_v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const getGlobalStorage = (): StorageLike | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

const generateEntryId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `study_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Loads and parses the study log from persistent storage.
 * Gracefully returns an empty array on storage error or malformed JSON.
 */
export const loadStudyLog = (storage?: StorageLike): StudyLogEntry[] => {
  const store = storage ?? getGlobalStorage();
  if (!store) return [];

  try {
    const raw = store.getItem(STUDY_LOG_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is StudyLogEntry => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.date === 'string' &&
        typeof item.durationSeconds === 'number' &&
        typeof item.referenceTitle === 'string'
      );
    });
  } catch (err) {
    console.warn('Failed to load study log from storage', err);
    return [];
  }
};

/**
 * Persists the study log entries array to storage.
 */
export const saveStudyLog = (entries: StudyLogEntry[], storage?: StorageLike): void => {
  const store = storage ?? getGlobalStorage();
  if (!store) return;

  try {
    store.setItem(STUDY_LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('Failed to persist study log to storage', err);
  }
};

/**
 * Appends a new completed study session to the log (newest first) and persists it.
 */
export const appendStudyLogEntry = (
  entryData: {
    durationSeconds: number;
    referenceTitle: string;
    notes?: string;
    date?: string;
    id?: string;
  },
  storage?: StorageLike,
): { entry: StudyLogEntry; log: StudyLogEntry[] } => {
  const currentLog = loadStudyLog(storage);

  const newEntry: StudyLogEntry = {
    id: entryData.id || generateEntryId(),
    date: entryData.date || new Date().toISOString(),
    durationSeconds: entryData.durationSeconds,
    referenceTitle: entryData.referenceTitle || 'Untitled Reference',
    ...(entryData.notes ? { notes: entryData.notes.trim() } : {}),
  };

  // Prepend newest session first
  const updatedLog = [newEntry, ...currentLog];
  saveStudyLog(updatedLog, storage);

  return { entry: newEntry, log: updatedLog };
};

/**
 * Updates the notes on a specific study log entry and persists.
 */
export const updateStudyLogEntryNotes = (
  id: string,
  notes: string,
  storage?: StorageLike,
): StudyLogEntry[] => {
  const currentLog = loadStudyLog(storage);
  const updatedLog = currentLog.map((item) => {
    if (item.id === id) {
      const trimmed = notes.trim();
      return {
        ...item,
        notes: trimmed || undefined,
      };
    }
    return item;
  });

  saveStudyLog(updatedLog, storage);
  return updatedLog;
};

/**
 * Removes an entry from the study log by ID and persists.
 */
export const deleteStudyLogEntry = (id: string, storage?: StorageLike): StudyLogEntry[] => {
  const currentLog = loadStudyLog(storage);
  const updatedLog = currentLog.filter((item) => item.id !== id);
  saveStudyLog(updatedLog, storage);
  return updatedLog;
};

/**
 * Clears the study log from storage.
 */
export const clearStudyLog = (storage?: StorageLike): void => {
  const store = storage ?? getGlobalStorage();
  if (!store) return;

  try {
    store.removeItem(STUDY_LOG_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear study log', err);
  }
};

/**
 * Computes aggregate summary metrics for the study log.
 */
export const computeStudyLogSummary = (entries: StudyLogEntry[]): StudyLogSummary => {
  const sessionsByDuration: Record<number, number> = {};
  const referenceTitles = new Set<string>();
  let totalDurationSeconds = 0;

  for (const item of entries) {
    totalDurationSeconds += item.durationSeconds;
    sessionsByDuration[item.durationSeconds] = (sessionsByDuration[item.durationSeconds] || 0) + 1;
    if (item.referenceTitle) {
      referenceTitles.add(item.referenceTitle);
    }
  }

  return {
    totalSessions: entries.length,
    totalDurationSeconds,
    sessionsByDuration,
    uniqueReferencesCount: referenceTitles.size,
    lastSessionDate: entries.length > 0 ? entries[0].date : null,
  };
};

/** @deprecated alias for computeStudyLogSummary */
export const computeStudyLogStats = computeStudyLogSummary;


/**
 * Formats a duration in seconds into a clean human label (e.g. "30s", "2m", "1h 15m").
 */
export const formatStudyDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const remainingAfterHours = seconds % 3600;
  const minutes = Math.floor(remainingAfterHours / 60);
  const remainingSeconds = remainingAfterHours % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  if (remainingSeconds > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m`;
};
