export type GestureDurationPreset = 30 | 120 | 300;

export type GestureSessionStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface StudyLogEntry {
  id: string;
  date: string; // ISO 8601 string
  durationSeconds: number;
  referenceTitle: string;
  notes?: string;
}

export interface StudyLogSummary {
  totalSessions: number;
  totalDurationSeconds: number;
  sessionsByDuration: Record<number, number>;
  uniqueReferencesCount: number;
  lastSessionDate: string | null;
}

export interface GestureSessionState {
  status: GestureSessionStatus;
  targetDuration: number;
  remainingSeconds: number;
  referenceTitle: string;
  isReferenceHidden: boolean;
  completedEntryId: string | null;
}

export interface GestureActions {
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onToggleReferenceHidden: (hidden: boolean) => void;
  onStartSession: (durationSeconds: number) => void;
  onOpenStudyLog: () => void;
  onSaveNote: (notes: string) => void;
  onDismissOverlay?: () => void;
}

