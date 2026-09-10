'use client';

import React, { useState } from 'react';
import type { PencilHardness } from '../../types/studio';
import { PENCIL_DATABASE } from '../../utils/pencilGrades';
import { Edit3 } from 'lucide-react';

export const PencilGradePanel: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<PencilHardness>('2B');
  const activeInfo = PENCIL_DATABASE[selectedGrade];

  const hardPencils: PencilHardness[] = ['9H', '6H', '4H', '2H', 'H', 'F'];
  const midPencils: PencilHardness[] = ['HB', 'B', '2B', '3B'];
  const darkPencils: PencilHardness[] = ['4B', '5B', '6B', '8B', '9B', 'Charcoal', 'White_Chalk'];

  return (
    <div className="flex flex-col gap-4 p-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
          <Edit3 className="w-4 h-4 text-amber-400" />
          <span>Graphite & Pencil Hardness Scale</span>
        </div>
        <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded">
          9H → 9B
        </span>
      </div>

      <div className="bg-studio-900 border border-studio-800 rounded-xl p-3 flex flex-col gap-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg border border-white/20 shadow-inner flex items-center justify-center font-mono font-black text-xs text-white"
              style={{ backgroundColor: activeInfo.hexPreview }}
            >
              {selectedGrade.includes('White') ? 'W' : selectedGrade.slice(0, 2)}
            </div>
            <div>
              <div className="font-bold text-slate-100 text-sm">{activeInfo.name}</div>
              <div className="text-[10px] text-amber-400 font-medium">{activeInfo.category}</div>
            </div>
          </div>
          <div className="text-right font-mono text-[10px] text-slate-400">
            Tone: {activeInfo.toneValue}/255
          </div>
        </div>

        <div className="bg-studio-950 p-2.5 rounded-lg border border-studio-850 flex flex-col gap-1.5">
          <div className="flex items-start gap-1.5 text-slate-300">
            <span className="font-bold text-studio-accent shrink-0">Usage:</span>
            <span>{activeInfo.recommendedFor}</span>
          </div>
          <div className="flex items-start gap-1.5 text-slate-300">
            <span className="font-bold text-emerald-400 shrink-0">Technique:</span>
            <span>{activeInfo.strokeAdvice}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Hard Graphite (Construction & Light Halftones)
          </span>
          <div className="grid grid-cols-6 gap-1">
            {hardPencils.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedGrade(p)}
                className={`py-1.5 rounded-lg font-mono font-bold text-center border transition-all ${
                  selectedGrade === p
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-1 ring-amber-300/30'
                    : 'bg-studio-900 hover:bg-studio-850 text-slate-300 border-studio-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Medium (Facial Form Turns & Base Values)
          </span>
          <div className="grid grid-cols-4 gap-1">
            {midPencils.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedGrade(p)}
                className={`py-1.5 rounded-lg font-mono font-bold text-center border transition-all ${
                  selectedGrade === p
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-1 ring-amber-300/30'
                    : 'bg-studio-900 hover:bg-studio-850 text-slate-300 border-studio-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Soft / Matte (Core Shadows & Deep Occlusion)
          </span>
          <div className="grid grid-cols-4 gap-1">
            {darkPencils.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedGrade(p)}
                className={`py-1.5 rounded-lg font-mono font-bold text-center border transition-all truncate text-[11px] ${
                  selectedGrade === p
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-1 ring-amber-300/30'
                    : 'bg-studio-900 hover:bg-studio-850 text-slate-300 border-studio-800'
                }`}
              >
                {p === 'White_Chalk' ? 'White' : p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
