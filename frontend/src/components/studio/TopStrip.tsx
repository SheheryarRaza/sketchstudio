'use client';

import React, { useRef } from 'react';
import type { AtelierStage, ProjectState } from '../../types/studio';
import { Upload, Ruler, BookOpen, Download, Compass, Timer, HelpCircle } from 'lucide-react';

interface TopStripProps {
  project: ProjectState;
  onSelectStage: (stage: AtelierStage) => void;
  onToggleSandbox: () => void;
  onLoadImageFile: (file: File) => void;
  onOpenCaliper: () => void;
  onOpenTeaching: () => void;
  onOpenExport: () => void;
  onOpenGestureStudy?: () => void;
  onOpenTour?: () => void;
  isGestureActive?: boolean;
}

interface StageMeta {
  stage: AtelierStage;
  label: string;
  goal: string;
  pencils: string[];
}

// Short labels for the centered strip; full goal/pencils surface as a hover tooltip
// so the strip stays a single compact row at every stage.
const STAGES: StageMeta[] = [
  { stage: 1, label: 'Envelope', goal: 'Align physical scale with your paper size and box in outer facial bounds.', pencils: ['4H', '6H'] },
  { stage: 2, label: 'Proportions', goal: 'Establish cranial ball, symmetry axis, eye line, and facial thirds.', pencils: ['4H', '2H'] },
  { stage: 3, label: 'Shadow Block-In', goal: 'Unify all core shadows and cast shadows into a single flat dark tone.', pencils: ['HB', '2B'] },
  { stage: 4, label: 'Halftone Modeling', goal: 'Model subtle turning planes on cheeks, nose bridge, and forehead.', pencils: ['2B', '4B'] },
  { stage: 5, label: 'Deep Accents', goal: 'Place deepest dark accents in nostrils/pupils and lift sharp specular highlights.', pencils: ['6B', '8B'] },
];

export const TopStrip: React.FC<TopStripProps> = ({
  project,
  onSelectStage,
  onToggleSandbox,
  onLoadImageFile,
  onOpenCaliper,
  onOpenTeaching,
  onOpenExport,
  onOpenGestureStudy,
  onOpenTour,
  isGestureActive,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="bg-studio-900 border-b border-studio-800 px-4 py-2 flex items-center justify-between gap-4 z-40">
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-wordmark text-lg text-slate-100 leading-none">SketchStudio</span>
      </div>

      <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto scrollbar-none">
        {STAGES.map((s) => {
          const isActive = project.stage === s.stage && !project.isSandbox;
          const isPassed = project.stage > s.stage && !project.isSandbox;

          return (
            <button
              key={s.stage}
              onClick={() => onSelectStage(s.stage)}
              title={`${s.label} — ${s.goal} Pencils: ${s.pencils.join(', ')}`}
              aria-label={`Stage ${s.stage}: ${s.label}`}
              className={`group flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium shrink-0 transition-colors ${
                isActive
                  ? 'bg-studio-accent text-slate-950 font-bold'
                  : isPassed
                  ? 'text-slate-300 hover:bg-studio-850'
                  : 'text-slate-400 hover:bg-studio-850'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-xs leading-none shrink-0 ${
                  isActive
                    ? 'bg-slate-950 text-white font-bold'
                    : isPassed
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 font-semibold'
                    : 'bg-studio-800 text-slate-400'
                }`}
              >
                {s.stage}
              </span>
              <span
                className={
                  isActive
                    ? 'inline'
                    : 'hidden group-hover:inline group-focus-visible:inline'
                }
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onLoadImageFile(file);
              e.target.value = '';
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded text-slate-300 hover:text-white hover:bg-studio-850"
          title={project.imageSrc ? 'Change Reference Image' : 'Upload Reference Image'}
        >
          <Upload className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenCaliper}
          className={`p-2 rounded ${
            project.calibration.isCalibrated ? 'text-emerald-400 hover:bg-studio-850' : 'text-studio-gold hover:bg-studio-850'
          }`}
          title={project.calibration.isCalibrated ? 'Physical Caliper: calibrated' : 'Physical Caliper: not calibrated'}
        >
          <Ruler className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenTeaching}
          className="p-2 rounded text-slate-300 hover:text-white hover:bg-studio-850"
          title="Teaching Mode"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenExport}
          className="p-2 rounded text-slate-300 hover:text-white hover:bg-studio-850"
          title="Export & Print"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenGestureStudy}
          className={`p-2 rounded transition-colors ${
            isGestureActive
              ? 'text-studio-accent bg-studio-accent/20 animate-pulse'
              : 'text-slate-300 hover:text-white hover:bg-studio-850'
          }`}
          title="Gesture Study & Study Log"
          aria-label="Gesture Study & Study Log"
        >
          <Timer className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenTour}
          className="p-2 rounded text-slate-300 hover:text-white hover:bg-studio-850"
          title="Studio Walkthrough"
          aria-label="Studio Walkthrough"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-studio-800 mx-1" />

        <button
          onClick={onToggleSandbox}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
            project.isSandbox ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-studio-850'
          }`}
          title={
            project.isSandbox
              ? 'Sandbox Mode is active — return to the Atelier Workflow'
              : 'Opt out of the Atelier Workflow and control View Mode, Drawing Method, and Grid directly'
          }
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{project.isSandbox ? 'Sandbox Mode' : 'Atelier Workflow'}</span>
        </button>
      </div>
    </header>
  );
};
