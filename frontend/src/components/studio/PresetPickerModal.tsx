'use client';

import React, { useState } from 'react';
import type { DrawingMethodType, GridType, HistogramStats, ProjectState, WorkflowPresetId } from '../../types/studio';
import {
  WORKFLOW_PRESETS,
  suggestPresetId,
  type WorkflowPresetDefinition,
} from '../../utils/workflowPresets';
import { Sparkles, X, Compass, Check, ArrowRight } from 'lucide-react';

interface PresetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: WorkflowPresetId) => void;
  histogramStats?: HistogramStats | null;
  currentPresetId?: WorkflowPresetId | null;
}

const VIEW_MODE_LABELS: Record<ProjectState['viewMode'], string> = {
  valueStudy: 'Value Study',
  tonalMask: 'Tonal Mask',
  original: 'Photo View',
  edges: 'Edge Quality',
  split: 'Split View',
};

const METHOD_LABELS: Record<DrawingMethodType, string> = {
  loomis: 'Loomis Head',
  asaro: 'Asaro Planar',
  reilly: 'Reilly Rhythms',
  bargue: 'Bargue Envelope',
  harmonic: 'Harmonic Armature',
  triangulation: 'Triangulation',
  none: 'None',
};

const GRID_LABELS: Record<GridType, string> = {
  goldenRatio: 'Golden Ratio / Thirds',
  diagonals: 'Diagonal Grid',
  squares: 'Square Grid',
  harmonic: 'Harmonic Grid',
  triangles: 'Triangular Grid',
  dots: 'Dot Grid',
};

export const PresetPickerModal: React.FC<PresetPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  histogramStats,
  currentPresetId,
}) => {
  const [isSuggestionDismissed, setIsSuggestionDismissed] = useState(false);

  if (!isOpen) return null;

  const suggestedId = suggestPresetId(histogramStats);
  const showSuggestionChip = Boolean(suggestedId && !isSuggestionDismissed);
  const suggestedPreset = suggestedId ? WORKFLOW_PRESETS[suggestedId] : null;

  const presetsList: WorkflowPresetDefinition[] = Object.values(WORKFLOW_PRESETS);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preset-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-studio-900 border border-studio-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 md:p-6 border-b border-studio-800 bg-studio-950/40">
          <div className="flex flex-col gap-1 pr-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-studio-accent" />
              <h2 id="preset-modal-title" className="text-lg font-bold text-slate-100">
                Choose a Starting Point
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Select a curated workflow preset configured for your Reference Image, or skip to enter the studio with default settings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-studio-800 rounded-lg transition-colors shrink-0"
            title="Close"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto flex flex-col gap-5">
          {/* Auto-Suggest Chip */}
          {showSuggestionChip && suggestedPreset && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-studio-accent/10 border border-studio-accent/30 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="w-4 h-4 text-studio-accent shrink-0" />
                <div className="text-slate-200 min-w-0 truncate">
                  <span className="font-semibold text-studio-accent">Auto-Suggest Chip: </span>
                  <span>
                    Based on your Reference Image&apos;s contrast analysis,{' '}
                    <strong className="text-white font-bold">{suggestedPreset.name}</strong> is recommended.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSuggestionDismissed(true)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-studio-800/60 transition-colors shrink-0"
                title="Dismiss suggestion"
                aria-label="Dismiss suggestion"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Presets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {presetsList.map((preset) => {
              const isSuggested = showSuggestionChip && suggestedId === preset.id;
              const isActive = currentPresetId === preset.id;

              const gridLabel = preset.grid.enabled
                ? GRID_LABELS[preset.grid.type || 'squares'] || 'Grid Enabled'
                : 'No Grid';

              return (
                <div
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectPreset(preset.id);
                    }
                  }}
                  className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer text-left transition-all group select-none ${
                    isSuggested
                      ? 'bg-studio-850/90 border-studio-accent ring-2 ring-studio-accent/30 hover:border-studio-accent'
                      : isActive
                      ? 'bg-studio-850/80 border-emerald-500/50 hover:border-emerald-500'
                      : 'bg-studio-950/70 border-studio-800 hover:border-studio-700 hover:bg-studio-850/50'
                  }`}
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Card Title & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-studio-accent transition-colors">
                        {preset.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSuggested && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-studio-accent/20 text-studio-accent border border-studio-accent/40">
                            <Sparkles className="w-3 h-3" />
                            Suggested
                          </span>
                        )}
                        {isActive && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Bundle Configuration Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-studio-800 text-slate-300">
                        {VIEW_MODE_LABELS[preset.viewMode] || preset.viewMode}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-studio-800 text-slate-300">
                        {METHOD_LABELS[preset.activeMethod] || preset.activeMethod}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-studio-800 text-slate-300">
                        {gridLabel}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-studio-800 text-slate-300 capitalize">
                        {preset.medium}
                      </span>
                      {preset.isolation && preset.isolation.kind !== 'none' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 capitalize">
                          Isolate {preset.isolation.kind === 'family' ? preset.isolation.family : preset.isolation.layerId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-studio-800/60 flex items-center justify-between text-xs text-slate-400 group-hover:text-studio-accent transition-colors">
                    <span>Apply this starting point</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 md:px-6 border-t border-studio-800 bg-studio-950/60 text-xs">
          <span className="text-slate-500 text-[11px] text-center sm:text-left">
            Choosing a preset switches the studio into Sandbox Mode so you can freely adjust all settings.
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white underline underline-offset-4 hover:no-underline font-medium transition-colors shrink-0"
          >
            Skip to Studio with defaults
          </button>
        </div>
      </div>
    </div>
  );
};
