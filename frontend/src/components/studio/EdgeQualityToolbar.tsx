'use client';

import React, { useEffect, useCallback } from 'react';
import type { EdgeQualityState, EdgeQuality, EdgeQualityFilter } from '../../types/edgeQuality';
import {
  setActiveQuality,
  setInteractionMode,
  setFilterQuality,
  updateSegmentQuality,
  updatePointQuality,
  splitSegmentAtPoint,
  deleteSegment,
  clearSegments,
  countSegmentsByQuality,
  EDGE_QUALITY_CONFIG,
} from '../../utils/edgeQuality';
import {
  PenTool,
  MousePointer,
  Sparkles,
  Scissors,
  Trash2,
  Eye,
  EyeOff,
  Sliders,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';

interface EdgeQualityToolbarProps {
  state: EdgeQualityState;
  onChange: (newState: EdgeQualityState) => void;
  onSuggestEdges: () => void;
  isLoadingSuggestions?: boolean;
  onClose?: () => void;
}

export const EdgeQualityToolbar: React.FC<EdgeQualityToolbarProps> = ({
  state,
  onChange,
  onSuggestEdges,
  isLoadingSuggestions = false,
  onClose,
}) => {
  const counts = countSegmentsByQuality(state.segments);
  const selectedSegment = state.segments.find((s) => s.id === state.selectedSegmentId);

  const handleQualitySelect = useCallback(
    (quality: EdgeQuality) => {
      if (selectedSegment) {
        if (state.selectedPointId) {
          // Reclassify individual selected point
          const updated = updatePointQuality(state, selectedSegment.id, state.selectedPointId, quality);
          onChange(setActiveQuality(updated, quality));
        } else {
          // Reclassify entire selected segment
          const updated = updateSegmentQuality(state, selectedSegment.id, quality);
          onChange(setActiveQuality(updated, quality));
        }
      } else {
        onChange(setActiveQuality(state, quality));
      }
    },
    [state, selectedSegment, onChange]
  );

  useEffect(() => {
    if (!state.enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === '1') {
        handleQualitySelect('hard');
      } else if (e.key === '2') {
        handleQualitySelect('soft');
      } else if (e.key === '3') {
        handleQualitySelect('lost');
      } else if (e.key === 'd' || e.key === 'D') {
        onChange(setInteractionMode(state, 'draw'));
      } else if (e.key === 's' || e.key === 'S') {
        onChange(setInteractionMode(state, 'select'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, onChange, handleQualitySelect]);

  if (!state.enabled) return null;

  const handleSplitSelected = () => {
    if (!selectedSegment) return;
    const ptIndex = state.selectedPointId
      ? selectedSegment.points.findIndex((p) => p.id === state.selectedPointId)
      : undefined;
    const next = splitSegmentAtPoint(state, selectedSegment.id, ptIndex);
    onChange(next);
  };

  const handleDeleteSelected = () => {
    if (!selectedSegment) return;
    const next = deleteSegment(state, selectedSegment.id);
    onChange(next);
  };

  const handleClearAll = () => {
    if (state.segments.length === 0) return;
    if (window.confirm('Clear all marked edge qualities?')) {
      onChange(clearSegments(state));
    }
  };

  const FILTERS: Array<{ id: EdgeQualityFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'hard', label: 'Hard', count: counts.hard },
    { id: 'soft', label: 'Soft', count: counts.soft },
    { id: 'lost', label: 'Lost', count: counts.lost },
  ];

  return (
    <div
      className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[94%] sm:w-auto bg-studio-900/95 backdrop-blur-md border border-studio-750 shadow-2xl rounded-2xl p-2.5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
      role="region"
      aria-label="Edge Quality Map Controls"
    >
      {/* Top Bar: Title, Counts, Close */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-studio-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-bold text-slate-100 tracking-wide">Edge Quality Map</span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({counts.hard} Hard · {counts.soft} Soft · {counts.lost} Lost)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Atelier Edge Instruction Tooltip */}
          <div className="group relative">
            <button
              type="button"
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
              title="Edge control principles"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <div className="hidden group-hover:block absolute top-full right-0 mt-1.5 w-64 p-2.5 bg-studio-950 border border-studio-800 rounded-xl shadow-xl z-50 text-[11px] text-slate-300 leading-relaxed pointer-events-none">
              <strong className="text-white block mb-1">Academic Edge Control:</strong>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-0.5 bg-rose-500 rounded" />
                <span className="text-rose-400 font-semibold">Hard:</span> Cast shadows & sharp silhouettes
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-0.5 bg-amber-500 rounded border-dashed" />
                <span className="text-amber-400 font-semibold">Soft:</span> Form shadows turning into halftones
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-purple-500 rounded border-dotted" />
                <span className="text-purple-400 font-semibold">Lost:</span> Adjacent values merge completely
              </div>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
              title="Close edge quality toolbar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Center Controls: Qualities, Modes, Suggestion, Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quality Selectors (Hard, Soft, Lost) */}
        <div className="flex items-center bg-studio-950/80 p-0.5 rounded-xl border border-studio-800">
          {(['hard', 'soft', 'lost'] as EdgeQuality[]).map((q, idx) => {
            const cfg = EDGE_QUALITY_CONFIG[q];
            const isActive = state.activeQuality === q;
            const isSegSelected = selectedSegment && selectedSegment.quality === q;

            return (
              <button
                key={q}
                onClick={() => handleQualitySelect(q)}
                aria-pressed={isActive || isSegSelected}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  isActive || isSegSelected
                    ? 'bg-studio-800 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`${cfg.description} (Key ${idx + 1})`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: cfg.color,
                    boxShadow: isActive ? `0 0 6px ${cfg.color}` : undefined,
                  }}
                />
                <span>{cfg.label}</span>
                <span className="text-[10px] opacity-40 font-mono">[{idx + 1}]</span>
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-studio-800" />

        {/* Interaction Modes: Draw vs Select */}
        <div className="flex items-center bg-studio-950/80 p-0.5 rounded-xl border border-studio-800">
          <button
            onClick={() => onChange(setInteractionMode(state, 'draw'))}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-semibold transition-all ${
              state.mode === 'draw'
                ? 'bg-studio-accent text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Draw new edge segments on canvas (D)"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            onClick={() => onChange(setInteractionMode(state, 'select'))}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-semibold transition-all ${
              state.mode === 'select'
                ? 'bg-studio-accent text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Select, move points, and reclassify edges (S)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>
        </div>

        <div className="w-px h-5 bg-studio-800" />

        {/* Suggest Edges Action */}
        <button
          onClick={onSuggestEdges}
          disabled={isLoadingSuggestions}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-700/60 font-semibold text-slate-200 transition-all hover:border-studio-accent/40 disabled:opacity-50"
          title="Detect contour edges from Reference Image"
        >
          {isLoadingSuggestions ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-studio-accent" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{isLoadingSuggestions ? 'Detecting…' : 'Suggest Edges'}</span>
        </button>

        {/* Segment Manipulation Actions when Selected */}
        {selectedSegment && (
          <div className="flex items-center gap-1 bg-studio-950/80 p-0.5 rounded-xl border border-studio-800">
            <button
              onClick={handleSplitSelected}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-300 hover:bg-studio-800 transition-colors font-medium"
              title="Split segment into two at selected or midpoint"
            >
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              <span>Split</span>
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-rose-400 hover:bg-rose-950/40 transition-colors font-medium"
              title="Delete selected edge segment"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}

        {/* Clear All */}
        {state.segments.length > 0 && !selectedSegment && (
          <button
            onClick={handleClearAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-studio-800 transition-colors"
            title="Clear all marked edges"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Row: Quality Filter Pills & Display Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-studio-800/80 text-[11px]">
        <div className="flex items-center gap-1">
          <span className="text-slate-500 font-medium mr-1">Filter:</span>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onChange(setFilterQuality(state, f.id))}
              className={`px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                state.filter === f.id
                  ? 'bg-studio-800 text-studio-accent font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Opacity slider */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>Opacity:</span>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={state.opacity}
            onChange={(e) => onChange({ ...state, opacity: parseFloat(e.target.value) })}
            className="w-16 h-1 accent-studio-accent bg-studio-800 rounded appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
