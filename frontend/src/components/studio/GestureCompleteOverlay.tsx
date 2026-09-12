'use client';

import React, { useState } from 'react';
import type { GestureSessionState } from '../../types/gesture';
import { formatStudyDuration } from '../../utils/studyLog';
import { GESTURE_PRESETS } from '../../utils/gestureSession';
import { CheckCircle2, Eye, EyeOff, BookOpen, RotateCcw, MessageSquarePlus, Check } from 'lucide-react';

interface GestureCompleteOverlayProps {
  session: GestureSessionState;
  onToggleReferenceHidden: (hidden: boolean) => void;
  onStartSession: (durationSeconds: number) => void;
  onOpenStudyLog: () => void;
  onSaveNote: (notes: string) => void;
  onDismiss?: () => void;
}

export const GestureCompleteOverlay: React.FC<GestureCompleteOverlayProps> = ({
  session,
  onToggleReferenceHidden,
  onStartSession,
  onOpenStudyLog,
  onSaveNote,
  onDismiss,
}) => {
  const [noteText, setNoteText] = useState('');
  const [isNoteSaved, setIsNoteSaved] = useState(false);

  if (session.status !== 'completed') {
    return null;
  }

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onSaveNote(noteText);
    setIsNoteSaved(true);
  };

  // State 1: Reference image is hidden (full curtain screen)
  if (session.isReferenceHidden) {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-studio-950/95 backdrop-blur-md text-center select-none animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-950/50">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h3 className="text-2xl font-black text-white tracking-tight mb-1">
          Time&apos;s Up!
        </h3>

        <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-4 leading-relaxed">
          Completed <span className="font-bold text-studio-accent">{formatStudyDuration(session.targetDuration)}</span> gesture study for <span className="text-slate-100 font-semibold">{session.referenceTitle}</span>. Recorded in your study log.
        </p>

        {/* Note addition */}
        <form onSubmit={handleSaveNote} className="w-full max-w-sm mb-5">
          <div className="flex items-center gap-1.5 bg-studio-900 border border-studio-800 rounded-xl p-1 focus-within:border-studio-accent transition-colors">
            <MessageSquarePlus className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
            <input
              type="text"
              value={noteText}
              onChange={(e) => {
                setNoteText(e.target.value);
                setIsNoteSaved(false);
              }}
              placeholder="Add study reflection (e.g. rhythm, rounded head)..."
              className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
            />
            <button
              type="submit"
              disabled={!noteText.trim() || isNoteSaved}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                isNoteSaved
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-studio-accent text-slate-950 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {isNoteSaved ? <Check className="w-3.5 h-3.5" /> : 'Save'}
            </button>
          </div>
        </form>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <button
            onClick={() => onToggleReferenceHidden(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-studio-800 hover:bg-studio-750 text-slate-200 hover:text-white text-xs font-bold border border-studio-700/60 shadow transition-all"
            title="Reveal Reference Image to compare with your sketch"
          >
            <Eye className="w-4 h-4 text-studio-accent" />
            <span>Show Reference Image</span>
          </button>

          <button
            onClick={onOpenStudyLog}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-studio-800 hover:bg-studio-750 text-slate-200 hover:text-white text-xs font-bold border border-studio-700/60 shadow transition-all"
            title="Open study log history and stats"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>View Study Log</span>
          </button>
        </div>

        {/* Quick Start Next Preset */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Start Next Session
          </span>
          <div className="flex items-center gap-2">
            {GESTURE_PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                onClick={() => onStartSession(preset.seconds)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-900 border border-studio-800 hover:border-studio-accent hover:bg-studio-850 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                title={preset.description}
              >
                <RotateCcw className="w-3 h-3 text-studio-accent" />
                <span>{preset.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 transition-colors"
          >
            Finish Study Session
          </button>
        )}
      </div>
    );
  }

  // State 2: Reference image was revealed for comparison
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-2xl bg-studio-900/95 border border-studio-700/80 shadow-2xl backdrop-blur-md select-none animate-in fade-in duration-150">
      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
        Session Complete
      </span>

      <div className="w-px h-4 bg-studio-800 mx-1" />

      <button
        onClick={() => onToggleReferenceHidden(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-studio-800 hover:bg-studio-750 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
        title="Hide reference image again"
      >
        <EyeOff className="w-3.5 h-3.5 text-studio-accent" />
        <span>Hide Reference Image</span>
      </button>

      <button
        onClick={onOpenStudyLog}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-studio-800 hover:bg-studio-750 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
        title="View study history"
      >
        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
        <span>View Study Log</span>
      </button>

      <div className="w-px h-4 bg-studio-800 mx-1" />

      <button
        onClick={() => onStartSession(session.targetDuration || 30)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-studio-accent text-slate-950 font-bold text-xs hover:brightness-110 transition-all"
        title="Start another session"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Repeat ({formatStudyDuration(session.targetDuration || 30)})</span>
      </button>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition-colors ml-1"
          title="Done"
        >
          ✕
        </button>
      )}
    </div>
  );
};
