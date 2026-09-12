'use client';

import React from 'react';
import type { GestureSessionState } from '../../types/gesture';
import { formatTimeRemaining } from '../../utils/gestureSession';
import { formatStudyDuration } from '../../utils/studyLog';
import { Timer, Pause, Play, X } from 'lucide-react';

interface GestureTimerBarProps {
  session: GestureSessionState;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export const GestureTimerBar: React.FC<GestureTimerBarProps> = ({
  session,
  onPause,
  onResume,
  onCancel,
}) => {
  if (session.status !== 'running' && session.status !== 'paused') {
    return null;
  }

  const isPaused = session.status === 'paused';
  const progressRatio = session.targetDuration > 0
    ? Math.max(0, Math.min(1, session.remainingSeconds / session.targetDuration))
    : 0;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-studio-900/95 border border-studio-700/80 shadow-2xl backdrop-blur-md select-none min-w-[320px] max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left: Status & Duration Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`p-1.5 rounded-lg ${
              isPaused
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-studio-accent/20 text-studio-accent animate-pulse'
            }`}
          >
            <Timer className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-300 truncate">
              {formatStudyDuration(session.targetDuration)} Gesture Study
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
              {session.referenceTitle}
            </span>
          </div>
        </div>

        {/* Center: Countdown Display */}
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-black text-white tracking-wider">
            {formatTimeRemaining(session.remainingSeconds)}
          </span>
          {isPaused && (
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
              (Paused)
            </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          {isPaused ? (
            <button
              onClick={onResume}
              className="p-1.5 rounded-lg bg-studio-800 text-emerald-400 hover:bg-studio-750 hover:text-emerald-300 transition-colors"
              title="Resume timer"
              aria-label="Resume timer"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={onPause}
              className="p-1.5 rounded-lg bg-studio-800 text-amber-400 hover:bg-studio-750 hover:text-amber-300 transition-colors"
              title="Pause timer"
              aria-label="Pause timer"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg bg-studio-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
            title="Cancel session"
            aria-label="Cancel session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-1 bg-studio-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            session.remainingSeconds <= 5
              ? 'bg-rose-500'
              : isPaused
              ? 'bg-amber-400'
              : 'bg-studio-accent'
          }`}
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>
    </div>
  );
};
