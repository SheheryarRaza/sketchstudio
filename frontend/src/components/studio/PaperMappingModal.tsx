'use client';

import React, { useState } from 'react';
import type { PaperFillMode, PaperMappingConfig, PaperPreset } from '../../types/studio';
import { PAPER_PRESETS } from '../../utils/physicalScale';
import { X, FileStack, Check } from 'lucide-react';

interface PaperMappingModalProps {
  isOpen: boolean;
  paperMapping: PaperMappingConfig;
  onClose: () => void;
  onSavePaperMapping: (mapping: PaperMappingConfig) => void;
}

interface FillModeOption {
  mode: PaperFillMode;
  label: string;
  description: string;
}

const FILL_MODES: FillModeOption[] = [
  { mode: 'fillWidth', label: 'Fills Paper Width', description: 'The photo spans the full paper width, top to bottom may run past or short of the paper height' },
  { mode: 'fillHeight', label: 'Fills Paper Height', description: 'The photo spans the full paper height, left to right may run past or short of the paper width' },
  { mode: 'fitWithin', label: 'Fits Within Paper', description: 'The photo fits entirely inside the paper on both dimensions, whichever side is tighter' },
];

export const PaperMappingModal: React.FC<PaperMappingModalProps> = ({
  isOpen,
  paperMapping,
  onClose,
  onSavePaperMapping,
}) => {
  const [selectedPaper, setSelectedPaper] = useState<PaperPreset>(paperMapping.paperPreset);
  const [fillMode, setFillMode] = useState<PaperFillMode>(paperMapping.fillMode);
  const [customWidthMm, setCustomWidthMm] = useState<number>(
    paperMapping.paperPreset === 'Custom' ? paperMapping.paperWidthMm : PAPER_PRESETS.Custom.widthMm,
  );
  const [customHeightMm, setCustomHeightMm] = useState<number>(
    paperMapping.paperPreset === 'Custom' ? paperMapping.paperHeightMm : PAPER_PRESETS.Custom.heightMm,
  );

  if (!isOpen) return null;

  const isCustom = selectedPaper === 'Custom';

  const handleApply = () => {
    const { widthMm, heightMm } = isCustom
      ? { widthMm: customWidthMm, heightMm: customHeightMm }
      : PAPER_PRESETS[selectedPaper];
    onSavePaperMapping({
      isDeclared: true,
      paperPreset: selectedPaper,
      paperWidthMm: widthMm,
      paperHeightMm: heightMm,
      fillMode,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-studio-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-studio-accent/20 rounded-xl text-studio-accent">
              <FileStack className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Paper Mapping</h3>
              <p className="text-xs text-slate-400">Declare how the Reference Image lands on physical paper</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 text-xs">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-slate-300">Target Paper Size:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(PAPER_PRESETS) as PaperPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSelectedPaper(preset)}
                  className={`p-2 rounded-xl text-center border font-medium transition-all ${
                    selectedPaper === preset
                      ? 'bg-studio-accent text-slate-950 font-bold border-studio-accent shadow'
                      : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div>{preset}</div>
                  <div className="text-xs opacity-75 font-mono">
                    {preset === 'Custom'
                      ? 'Enter dimensions'
                      : `${PAPER_PRESETS[preset].widthMm}×${PAPER_PRESETS[preset].heightMm}`}
                  </div>
                </button>
              ))}
            </div>

            {isCustom && (
              <div className="flex items-center gap-3 bg-studio-950 border border-studio-800 p-3 rounded-xl">
                <label className="flex-1 flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Width (mm)</span>
                  <input
                    type="number"
                    min={50}
                    max={1200}
                    value={customWidthMm}
                    onChange={(e) => setCustomWidthMm(parseFloat(e.target.value) || 0)}
                    className="bg-studio-900 border border-studio-800 rounded-lg px-2 py-1.5 text-slate-100 font-mono"
                  />
                </label>
                <label className="flex-1 flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Height (mm)</span>
                  <input
                    type="number"
                    min={50}
                    max={1200}
                    value={customHeightMm}
                    onChange={(e) => setCustomHeightMm(parseFloat(e.target.value) || 0)}
                    className="bg-studio-900 border border-studio-800 rounded-lg px-2 py-1.5 text-slate-100 font-mono"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold text-slate-300">How the Reference Image Fills the Paper:</span>
            <div className="flex flex-col gap-1.5">
              {FILL_MODES.map((option) => (
                <button
                  key={option.mode}
                  onClick={() => setFillMode(option.mode)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    fillMode === option.mode
                      ? 'bg-studio-850 border-studio-accent text-white shadow-md ring-1 ring-studio-accent/30'
                      : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-slate-200 hover:bg-studio-850'
                  }`}
                >
                  <span className="font-bold text-xs text-slate-200 block">{option.label}</span>
                  <span className="text-xs text-slate-400 leading-tight">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-studio-800 bg-studio-950/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isCustom && (customWidthMm <= 0 || customHeightMm <= 0)}
            className="px-5 py-2 rounded-xl bg-studio-accent text-slate-950 font-bold shadow-lg hover:bg-studio-accent/90 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Apply Paper Mapping</span>
          </button>
        </div>
      </div>
    </div>
  );
};
