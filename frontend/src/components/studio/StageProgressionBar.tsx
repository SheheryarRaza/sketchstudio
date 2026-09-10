'use client';

import React from 'react';
import type { AtelierStage } from '../../types/studio';
import { Compass, Sparkles, CheckCircle2 } from 'lucide-react';

interface StageProgressionBarProps {
  currentStage: AtelierStage;
  isSandbox: boolean;
  onSelectStage: (stage: AtelierStage) => void;
  onToggleSandbox: () => void;
}

interface StageMeta {
  stage: AtelierStage;
  title: string;
  subtitle: string;
  recommendedPencils: string[];
  goal: string;
}

const STAGES: StageMeta[] = [
  {
    stage: 1,
    title: '1. Setup & Envelope',
    subtitle: 'Scale Calibration & Bounding Box',
    recommendedPencils: ['4H', '6H'],
    goal: 'Align physical scale with your paper size and box in outer facial bounds.',
  },
  {
    stage: 2,
    title: '2. Proportions & Loomis',
    subtitle: 'Cranium, Brow, Thirds & Rhythms',
    recommendedPencils: ['4H', '2H'],
    goal: 'Establish cranial ball, symmetry axis, eye line, and facial thirds.',
  },
  {
    stage: 3,
    title: '3. Shadow Block-In',
    subtitle: '2-Value Light vs Dark Separation',
    recommendedPencils: ['HB', '2B'],
    goal: 'Unify all core shadows and cast shadows into a single flat dark tone.',
  },
  {
    stage: 4,
    title: '4. Halftone Modeling',
    subtitle: 'Form Turns & 5-Value Rendering',
    recommendedPencils: ['2B', '4B'],
    goal: 'Model subtle turning planes on cheeks, nose bridge, and forehead.',
  },
  {
    stage: 5,
    title: '5. Accents & Highlights',
    subtitle: 'Deep Occlusions & Cornea Spark',
    recommendedPencils: ['6B', '8B', 'Eraser'],
    goal: 'Place deepest dark accents in nostrils/pupils and lift sharp specular highlights.',
  },
];

export const StageProgressionBar: React.FC<StageProgressionBarProps> = ({
  currentStage,
  isSandbox,
  onSelectStage,
  onToggleSandbox,
}) => {
  const activeMeta = STAGES.find(s => s.stage === currentStage) || STAGES[0];

  return (
    <div className="bg-studio-900 border-b border-studio-800 px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg z-30">
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none">
        {STAGES.map((s) => {
          const isActive = currentStage === s.stage && !isSandbox;
          const isPassed = currentStage > s.stage && !isSandbox;

          return (
            <button
              key={s.stage}
              onClick={() => onSelectStage(s.stage)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-studio-accent text-slate-950 shadow-md font-bold'
                  : isPassed
                  ? 'bg-studio-850 text-slate-300 hover:bg-studio-800'
                  : 'bg-studio-900 text-slate-400 hover:bg-studio-850'
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isActive ? 'bg-slate-950 text-white font-bold' : 'bg-studio-800 text-slate-400'
                }`}>
                  {s.stage}
                </span>
              )}
              <span>{s.title}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
        {!isSandbox ? (
          <div className="hidden lg:flex items-center gap-2 text-xs bg-studio-950/70 border border-studio-800/80 px-3 py-1 rounded-lg">
            <span className="text-studio-accent font-semibold">Goal:</span>
            <span className="text-slate-300 max-w-[320px] truncate">{activeMeta.goal}</span>
            <div className="w-[1px] h-3 bg-studio-800 mx-1" />
            <span className="text-amber-400 font-mono font-medium">
              Pencils: {activeMeta.recommendedPencils.join(', ')}
            </span>
          </div>
        ) : (
          <div className="text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-3 py-1 rounded-lg flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sandbox Mode Active (Freeform Drafting)</span>
          </div>
        )}

        <button
          onClick={onToggleSandbox}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isSandbox
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-studio-850 text-slate-300 border-studio-700 hover:bg-studio-800 hover:text-white'
          }`}
          title="Toggle Freeform Sandbox Studio"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{isSandbox ? 'Guided Mode' : 'Sandbox Mode'}</span>
        </button>
      </div>
    </div>
  );
};
