'use client';

import React, { useState } from 'react';
import type { DrawingMethodType } from '../../types/studio';
import { DRAWING_METHODS_DATABASE } from '../../types/methods';
import { X, BookOpen, AlertTriangle, CheckCircle2, Sparkles, GraduationCap } from 'lucide-react';

interface TeachingModeDrawerProps {
  isOpen: boolean;
  initialMethod: DrawingMethodType;
  onClose: () => void;
  onApplyMethod: (methodType: DrawingMethodType) => void;
}

export const TeachingModeDrawer: React.FC<TeachingModeDrawerProps> = ({
  isOpen,
  initialMethod,
  onClose,
  onApplyMethod,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<DrawingMethodType>(
    initialMethod === 'none' ? 'loomis' : initialMethod
  );

  if (!isOpen) return null;

  const info = DRAWING_METHODS_DATABASE[selectedMethod] || DRAWING_METHODS_DATABASE.loomis;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-end transition-opacity">
      <div className="bg-studio-950 w-full max-w-2xl h-full border-l border-studio-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        <div className="bg-studio-900 border-b border-studio-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-studio-accent/20 rounded-xl text-studio-accent">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base">Atelier Teaching Academy</h2>
              <p className="text-xs text-slate-400">Classical Portrait & Drawing Construction Theory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 p-3 bg-studio-900/60 border-b border-studio-850 overflow-x-auto scrollbar-none">
          {(['loomis', 'reilly', 'bargue', 'asaro', 'triangulation', 'harmonic'] as DrawingMethodType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedMethod(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedMethod === type
                  ? 'bg-studio-accent text-slate-950 shadow-md font-bold'
                  : 'bg-studio-850 text-slate-400 hover:text-slate-200 hover:bg-studio-800'
              }`}
            >
              {DRAWING_METHODS_DATABASE[type].title.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 text-sm">
          <div className="bg-studio-900 border border-studio-800 p-5 rounded-2xl flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{info.title}</h3>
                <span className="text-xs text-amber-400 font-medium">
                  {info.creator} • {info.era}
                </span>
              </div>
              <button
                onClick={() => {
                  onApplyMethod(selectedMethod);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-studio-accent text-slate-950 font-bold text-xs shadow-md hover:bg-studio-accent/90 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply Overlay to Canvas</span>
              </button>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">{info.shortSummary}</p>
            <div className="bg-studio-950 p-3 rounded-xl border border-studio-850 text-xs text-slate-300">
              <span className="font-bold text-studio-accent">Core Principle: </span>
              {info.corePrinciple}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Anatomical Rules & Construction Laws</span>
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {info.anatomicalRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-studio-900/80 border border-studio-800/80 p-3 rounded-xl text-xs text-slate-300 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-rose-300 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Common Beginner Mistakes to Avoid</span>
            </h4>
            <div className="flex flex-col gap-2">
              {info.commonMistakes.map((mistake, idx) => (
                <div
                  key={idx}
                  className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl text-xs text-rose-200 flex items-start gap-2.5"
                >
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span className="leading-relaxed">{mistake}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-studio-accent" />
              <span>Step-by-Step Execution Sequence</span>
            </h4>
            <div className="flex flex-col gap-3">
              {info.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="bg-studio-900 border border-studio-800 p-4 rounded-xl flex flex-col gap-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-studio-800 text-studio-accent font-mono font-bold text-xs">
                        Step {step.stepNumber}
                      </span>
                      <span className="font-bold text-slate-100 text-xs">{step.title}</span>
                    </div>
                    <span className="font-mono text-xs text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded">
                      Pencil: {step.pencilRecommendation}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{step.description}</p>
                  <div className="bg-studio-950 p-2 rounded-lg border border-studio-850 text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold shrink-0">Master Tip:</span>
                    <span>{step.artistTip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
