import type {
  GestureDurationPreset,
  GestureSessionState,
} from '../types/gesture';

export interface GesturePresetInfo {
  seconds: GestureDurationPreset;
  label: string;
  shortLabel: string;
  description: string;
}

export const GESTURE_PRESETS: GesturePresetInfo[] = [
  {
    seconds: 30,
    label: '30 seconds',
    shortLabel: '30s',
    description: 'Quick gesture, rhythm, and line of action',
  },
  {
    seconds: 120,
    label: '2 minutes',
    shortLabel: '2 min',
    description: 'Structural block-in and major body masses',
  },
  {
    seconds: 300,
    label: '5 minutes',
    shortLabel: '5 min',
    description: 'Proportional envelope, key planes, and values',
  },
];

export const createInitialGestureState = (): GestureSessionState => ({
  status: 'idle',
  targetDuration: 0,
  remainingSeconds: 0,
  referenceTitle: '',
  isReferenceHidden: false,
  completedEntryId: null,
});

export const startGestureSession = (
  prevState: GestureSessionState,
  durationSeconds: number,
  referenceTitle: string,
): GestureSessionState => ({
  ...prevState,
  status: 'running',
  targetDuration: durationSeconds,
  remainingSeconds: durationSeconds,
  referenceTitle: referenceTitle || 'Untitled Reference',
  isReferenceHidden: false,
  completedEntryId: null,
});

export const tickGestureSession = (
  state: GestureSessionState,
  deltaSeconds: number = 1,
): { state: GestureSessionState; justCompleted: boolean } => {
  if (state.status !== 'running') {
    return { state, justCompleted: false };
  }

  const nextRemaining = Math.max(0, state.remainingSeconds - deltaSeconds);

  if (nextRemaining === 0) {
    return {
      state: {
        ...state,
        status: 'completed',
        remainingSeconds: 0,
        // Acceptance criteria: Reference Image is hidden automatically when timer elapses
        isReferenceHidden: true,
      },
      justCompleted: true,
    };
  }

  return {
    state: {
      ...state,
      remainingSeconds: nextRemaining,
    },
    justCompleted: false,
  };
};

export const pauseGestureSession = (state: GestureSessionState): GestureSessionState => {
  if (state.status !== 'running') return state;
  return {
    ...state,
    status: 'paused',
  };
};

export const resumeGestureSession = (state: GestureSessionState): GestureSessionState => {
  if (state.status !== 'paused') return state;
  return {
    ...state,
    status: 'running',
  };
};

export const cancelGestureSession = (state: GestureSessionState): GestureSessionState => {
  if (state.status === 'idle') return state;
  return createInitialGestureState();
};

export const setReferenceHidden = (
  state: GestureSessionState,
  hidden: boolean,
): GestureSessionState => ({
  ...state,
  isReferenceHidden: hidden,
});

export const formatTimeRemaining = (totalSeconds: number): string => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  const padMin = String(minutes).padStart(2, '0');
  const padSec = String(seconds).padStart(2, '0');
  return `${padMin}:${padSec}`;
};
