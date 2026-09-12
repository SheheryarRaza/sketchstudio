'use client';

import React, { useState } from 'react';
import type { StudyLogEntry } from '../../types/gesture';
import { computeStudyLogSummary, formatStudyDuration } from '../../utils/studyLog';
import { GESTURE_PRESETS } from '../../utils/gestureSession';
import {
  Timer,
  Clock,
  Trash2,
  X,
  Play,
  Flame,
  Images,
  Edit2,
  Check,
} from 'lucide-react';

interface StudyLogModalProps {
  isOpen: boolean;
  entries: StudyLogEntry[];
  onClose: () => void;
  onStartSession: (durationSeconds: number) => void;
  onDeleteEntry: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onClearLog: () => void;
  currentReferenceTitle?: string;
  hasReferenceImage?: boolean;
}

export const StudyLogModal: React.FC<StudyLogModalProps> = ({
  isOpen,
  entries,
  onClose,
  onStartSession,
  onDeleteEntry,
  onUpdateNotes,
  onClearLog,
  currentReferenceTitle,
  hasReferenceImage = true,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

  if (!isOpen) return null;

  const summary = computeStudyLogSummary(entries);

  const handleStartEditing = (entry: StudyLogEntry) => {
    setEditingId(entry.id);
    setEditingText(entry.notes || '');
  };

  const handleSaveEditing = (id: string) => {
    onUpdateNotes(id, editingText);
    setEditingId(null);
  };

  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-studio-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl bg-studio-900 border border-studio-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-studio-800 flex items-center justify-between bg-studio-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-studio-accent/15 border border-studio-accent/30 text-studio-accent flex items-center justify-center">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Gesture Study Log
                <span className="text-xs px-2 py-0.5 rounded-full bg-studio-800 text-slate-300 font-mono font-medium">
                  {summary.totalSessions} {summary.totalSessions === 1 ? 'Session' : 'Sessions'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Track timed gesture practice and study habits over time.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
            title="Close modal"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Start New Session Quick Bar */}
        <div className="px-6 py-3 bg-studio-950/50 border-b border-studio-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-300">
            Start Gesture Practice
            {currentReferenceTitle && (
              <span className="text-slate-400 font-normal"> · {currentReferenceTitle}</span>
            )}:
          </div>
          <div className="flex items-center gap-2">
            {GESTURE_PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                onClick={() => {
                  if (!hasReferenceImage) return;
                  onStartSession(preset.seconds);
                  onClose();
                }}
                disabled={!hasReferenceImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-slate-200 hover:text-white text-xs font-bold border border-studio-700/60 hover:border-studio-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title={hasReferenceImage ? preset.description : 'Upload a Reference Image first to start timed gesture practice'}
              >
                <Play className="w-3 h-3 text-studio-accent fill-current" />
                <span>{preset.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary Overview */}
        <div className="px-6 py-3.5 border-b border-studio-800 grid grid-cols-3 gap-3 bg-studio-900/30">
          <div className="p-2.5 rounded-xl bg-studio-850/60 border border-studio-800 flex items-center gap-3">
            <Flame className="w-4 h-4 text-studio-accent shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Total Sessions
              </div>
              <div className="text-sm font-black text-slate-100">
                {summary.totalSessions}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-studio-850/60 border border-studio-800 flex items-center gap-3">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Practice Time
              </div>
              <div className="text-sm font-black text-slate-100">
                {formatStudyDuration(summary.totalDurationSeconds)}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-studio-850/60 border border-studio-800 flex items-center gap-3">
            <Images className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Unique References
              </div>
              <div className="text-sm font-black text-slate-100">
                {summary.uniqueReferencesCount}
              </div>
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-studio-800/60">
          {entries.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-studio-800/60 text-slate-500 flex items-center justify-center mb-3">
                <Timer className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">
                No study sessions logged yet
              </h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Pick a duration above (30s, 2 min, or 5 min) to begin your gesture practice. When time runs out, the Reference Image is automatically hidden and the completed session will appear here.
              </p>
            </div>
          ) : (
            entries.map((entry) => {
              const isEditing = editingId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-studio-800 text-studio-accent font-mono text-xs font-bold shrink-0">
                        {formatStudyDuration(entry.durationSeconds)}
                      </span>
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {entry.referenceTitle}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        · {formatDate(entry.date)}
                      </span>
                    </div>

                    {/* Note display or inline edit */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          placeholder="Add notes e.g. thirty sessions later, heads got rounder..."
                          className="flex-1 bg-studio-950 border border-studio-700 rounded-lg px-2 py-1 text-xs text-slate-100 placeholder-slate-500 outline-none"
                        />
                        <button
                          onClick={() => handleSaveEditing(entry.id)}
                          className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                          title="Save note"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded-md text-slate-400 hover:text-white"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400 italic">
                          {entry.notes ? `"${entry.notes}"` : 'No reflection note.'}
                        </p>
                        <button
                          onClick={() => handleStartEditing(entry)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity p-0.5"
                          title="Edit note"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete study session entry"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-studio-800 bg-studio-900/60 flex items-center justify-between">
          {entries.length > 0 ? (
            isConfirmingClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-300 font-medium">Clear all study sessions?</span>
                <button
                  onClick={() => {
                    onClearLog();
                    setIsConfirmingClear(false);
                  }}
                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setIsConfirmingClear(false)}
                  className="px-2 py-1 rounded bg-studio-800 text-slate-300 hover:text-white text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
              >
                Clear Study Log
              </button>
            )
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-studio-800 hover:bg-studio-750 text-slate-200 text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
