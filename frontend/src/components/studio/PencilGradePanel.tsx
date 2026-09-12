'use client';

import React, { useState } from 'react';
import type { PencilHardness, MediumType } from '../../types/studio';
import { PENCIL_DATABASE, getPencilGradesForMedium } from '../../utils/pencilGrades';
import { Edit3 } from 'lucide-react';

interface PencilGradePanelProps {
  medium?: MediumType;
  selectedGrade?: PencilHardness;
  onSelectGrade?: (grade: PencilHardness) => void;
}

interface MediumScaleConfig {
  title: string;
  rangeBadge: string;
  defaultGrade: PencilHardness;
}

const MEDIUM_SCALE_CONFIGS: Record<string, MediumScaleConfig> = {
  charcoal: {
    title: 'Charcoal Materials Scale',
    rangeBadge: 'White Chalk → Compressed',
    defaultGrade: 'Willow_Charcoal',
  },
  graphite: {
    title: 'Graphite & Pencil Hardness Scale',
    rangeBadge: '9H → 9B',
    defaultGrade: '2B',
  },
};

export const PencilGradePanel: React.FC<PencilGradePanelProps> = ({
  medium = 'graphite',
  selectedGrade: externalSelectedGrade,
  onSelectGrade,
}) => {
  const config = MEDIUM_SCALE_CONFIGS[medium] ?? MEDIUM_SCALE_CONFIGS.graphite;
  const [internalSelectedGrade, setInternalSelectedGrade] = useState<PencilHardness>(
    config.defaultGrade
  );

  const selectedGrade = externalSelectedGrade ?? internalSelectedGrade;
  const handleSelectGrade = (grade: PencilHardness) => {
    if (onSelectGrade) {
      onSelectGrade(grade);
    } else {
      setInternalSelectedGrade(grade);
    }
  };

  const activeInfo = PENCIL_DATABASE[selectedGrade] || PENCIL_DATABASE['HB'];
  const availableGrades = getPencilGradesForMedium(medium);

  // Grouping is strictly driven by the category field on PencilGradeInfo,
  // never by hardcoded arrays or string-matching on specific grades.
  const categories = Array.from(
    new Set(availableGrades.map((g) => PENCIL_DATABASE[g]?.category).filter(Boolean))
  );

  return (
    <div className="flex flex-col gap-4 p-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
          <Edit3 className="w-4 h-4 text-amber-400" />
          <span>{config.title}</span>
        </div>
        <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded">
          {config.rangeBadge}
        </span>
      </div>

      <div className="bg-studio-900 border border-studio-800 rounded-xl p-3 flex flex-col gap-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg border border-white/20 shadow-inner flex items-center justify-center font-mono font-black text-xs text-white"
              style={{ backgroundColor: activeInfo.hexPreview }}
            >
              {activeInfo.badge || activeInfo.displayName.slice(0, 2)}
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
        {categories.map((category) => {
          const gradesInCategory = availableGrades.filter(
            (g) => PENCIL_DATABASE[g]?.category === category
          );

          return (
            <div key={category} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {category}
              </span>
              <div className="flex flex-wrap gap-1">
                {gradesInCategory.map((g) => {
                  const info = PENCIL_DATABASE[g];
                  return (
                    <button
                      key={g}
                      onClick={() => handleSelectGrade(g)}
                      className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-center border transition-all text-[11px] ${
                        selectedGrade === g
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-1 ring-amber-300/30'
                          : 'bg-studio-900 hover:bg-studio-850 text-slate-300 border-studio-800'
                      }`}
                    >
                      {info.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
