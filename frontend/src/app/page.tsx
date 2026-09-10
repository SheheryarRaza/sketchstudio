'use client';

import React, { useState, useRef } from 'react';
import type { ProjectState, AtelierStage, DrawingMethodType } from '@/types/studio';
import { generateDefaultValueLayers } from '@/utils/pencilGrades';
import { StudioCanvas } from '@/components/canvas/StudioCanvas';
import { StageProgressionBar } from '@/components/studio/StageProgressionBar';
import { ValueStudyPanel } from '@/components/studio/ValueStudyPanel';
import { GridConfigPanel } from '@/components/studio/GridConfigPanel';
import { MethodSelectorPanel } from '@/components/studio/MethodSelectorPanel';
import { PencilGradePanel } from '@/components/studio/PencilGradePanel';
import { MediumSelector } from '@/components/studio/MediumSelector';
import { PhysicalCaliperModal } from '@/components/studio/PhysicalCaliperModal';
import { TeachingModeDrawer } from '@/components/studio/TeachingModeDrawer';
import { ExportModal } from '@/components/studio/ExportModal';
import {
  Upload,
  Layers,
  Grid,
  Edit3,
  BookOpen,
  Ruler,
  Download,
  Palette,
  Sparkles,
  Compass,
  CheckCircle2,
} from 'lucide-react';

const INITIAL_PROJECT_STATE: ProjectState = {
  title: 'Classical Portrait Study',
  imageSrc: null,
  imageWidth: 600,
  imageHeight: 800,
  medium: 'graphite',
  stage: 1,
  isSandbox: false,
  numValueLayers: 5,
  layers: generateDefaultValueLayers(5),
  grid: {
    enabled: true,
    type: 'squares',
    cellSizeMm: 15,
    lineColor: '#38bdf8',
    lineWidth: 1,
    opacity: 0.75,
    showLabels: true,
    showSubdivisions: false,
    subdivisions: 2,
    showDiagonalsInCells: false,
    dotRadius: 2,
  },
  calibration: {
    isCalibrated: false,
    screenDpi: 96,
    pixelsPerMm: 3.78,
    paperPreset: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    paperOrientation: 'portrait',
  },
  methods: {
    activeMethod: 'loomis',
    opacity: 0.85,
    color: '#f59e0b',
    showAnchorPoints: true,
    loomis: {
      center: { x: 300, y: 340 },
      radius: 170,
      browLineY: 340,
      noseLineY: 440,
      chinY: 550,
      jawWidth: 150,
      tiltAngle: 0,
    },
    reilly: {
      browCenter: { x: 300, y: 330 },
      noseTip: { x: 300, y: 440 },
      mouthCenter: { x: 300, y: 500 },
      chinBottom: { x: 300, y: 550 },
      leftEye: { x: 235, y: 345 },
      rightEye: { x: 365, y: 345 },
      leftJaw: { x: 190, y: 460 },
      rightJaw: { x: 410, y: 460 },
      leftTemple: { x: 180, y: 280 },
      rightTemple: { x: 420, y: 280 },
    },
    bargue: {
      points: [
        { id: 'p1', x: 300, y: 140 },
        { id: 'p2', x: 450, y: 280 },
        { id: 'p3', x: 430, y: 500 },
        { id: 'p4', x: 350, y: 600 },
        { id: 'p5', x: 250, y: 600 },
        { id: 'p6', x: 170, y: 500 },
        { id: 'p7', x: 150, y: 280 },
      ],
      plumbLines: [{ x: 235 }, { x: 300 }, { x: 365 }],
      levelBars: [{ y: 345 }, { y: 440 }, { y: 500 }, { y: 550 }],
    },
    triangulation: {
      measurements: [
        { id: 'm1', start: { x: 215, y: 345 }, end: { x: 255, y: 345 }, label: 'Eye Width (Base Unit)', color: '#38bdf8', ratioToBaseUnit: 1.0 },
        { id: 'm2', start: { x: 255, y: 345 }, end: { x: 345, y: 345 }, label: 'Inter-Eye Gap', color: '#f59e0b', ratioToBaseUnit: 2.25 },
        { id: 'm3', start: { x: 300, y: 345 }, end: { x: 300, y: 440 }, label: 'Nose Height', color: '#10b981', ratioToBaseUnit: 2.37 },
      ],
      baseUnitDistance: 40,
    },
    asaro: {
      planesOpacity: 0.7,
      lightAngleDeg: 45,
    },
  },
  viewMode: 'valueStudy',
  splitPosition: 50,
};

type ActiveSidebarTab = 'values' | 'grid' | 'methods' | 'pencils' | 'mediums';

export default function StudioHomePage() {
  const [project, setProject] = useState<ProjectState>(INITIAL_PROJECT_STATE);
  const [activeTab, setActiveTab] = useState<ActiveSidebarTab>('values');

  const [isCaliperOpen, setIsCaliperOpen] = useState<boolean>(false);
  const [isTeachingOpen, setIsTeachingOpen] = useState<boolean>(false);
  const [teachingMethod, setTeachingMethod] = useState<DrawingMethodType>('loomis');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reliable file loading for local uploads & drag-drop
  const handleLoadImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setProject((prev) => ({
        ...prev,
        imageSrc: src,
        title: file.name.replace(/\.[^/.]+$/, ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  // Sample portrait loader
  const handleLoadSamplePortrait = (url: string, title: string) => {
    setProject((prev) => ({
      ...prev,
      imageSrc: url,
      title: title,
    }));
  };

  const handleStageChange = (newStage: AtelierStage) => {
    setProject((prev) => {
      let nextViewMode = prev.viewMode;
      let nextActiveMethod = prev.methods.activeMethod;
      let nextGridEnabled = prev.grid.enabled;

      if (newStage === 1) {
        nextViewMode = 'original';
        nextActiveMethod = 'bargue';
        nextGridEnabled = true;
      } else if (newStage === 2) {
        nextViewMode = 'original';
        nextActiveMethod = 'loomis';
        nextGridEnabled = true;
      } else if (newStage === 3) {
        nextViewMode = 'posterized';
        nextActiveMethod = 'none';
        nextGridEnabled = true;
      } else if (newStage === 4) {
        nextViewMode = 'valueStudy';
        nextActiveMethod = 'asaro';
        nextGridEnabled = false;
      } else if (newStage === 5) {
        nextViewMode = 'valueStudy';
        nextActiveMethod = 'none';
        nextGridEnabled = false;
      }

      return {
        ...prev,
        stage: newStage,
        viewMode: nextViewMode,
        grid: { ...prev.grid, enabled: nextGridEnabled },
        methods: { ...prev.methods, activeMethod: nextActiveMethod },
      };
    });
  };

  return (
    <main className="flex flex-col h-screen w-screen bg-studio-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Luxury Application Header */}
      <header className="bg-studio-900/95 backdrop-blur-xl border-b border-studio-800/90 px-5 py-3 flex items-center justify-between z-40 shadow-xl">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-studio-accent via-indigo-500 to-studio-gold flex items-center justify-center shadow-lg shadow-studio-accent/20 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm text-slate-100 tracking-tight">
                SketchStudio
              </h1>
              <span className="text-[10px] font-mono font-bold text-studio-accent bg-studio-accent/10 border border-studio-accent/30 px-2 py-0.5 rounded-full">
                Atelier Pro
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {project.imageSrc ? project.title : 'Classical Drafting, Real-World Scale & Tonal Separation'}
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          {/* File Input Uploader */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleLoadImageFile(file);
                e.target.value = '';
              }
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-xl bg-studio-850 hover:bg-studio-800 text-slate-100 border border-studio-700/80 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:border-studio-accent/50"
          >
            <Upload className="w-3.5 h-3.5 text-studio-accent" />
            <span>{project.imageSrc ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          <div className="w-[1px] h-4 bg-studio-800 mx-1" />

          {/* Scale Calibrate Button */}
          <button
            onClick={() => setIsCaliperOpen(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              project.calibration.isCalibrated
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-950/60 shadow-sm'
                : 'bg-studio-gold/10 text-studio-gold border-studio-gold/30 hover:bg-studio-gold/20 animate-pulse'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>{project.calibration.isCalibrated ? '1:1 Scale Calibrated' : 'Calibrate Scale'}</span>
          </button>

          {/* Teaching Academy Button */}
          <button
            onClick={() => {
              setTeachingMethod(project.methods.activeMethod === 'none' ? 'loomis' : project.methods.activeMethod);
              setIsTeachingOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-studio-850 hover:bg-studio-800 text-slate-200 border border-studio-700/80 text-xs font-semibold flex items-center gap-2 transition-all hover:border-studio-accent/50"
          >
            <BookOpen className="w-3.5 h-3.5 text-studio-accent" />
            <span>Teaching Academy</span>
          </button>

          {/* Export & Print Button */}
          <button
            onClick={() => setIsExportOpen(true)}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-studio-accent to-indigo-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-studio-accent/20 hover:shadow-studio-accent/40 hover:scale-[1.02] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export & Print</span>
          </button>
        </div>
      </header>

      {/* 5-Stage Guided Atelier Progression Bar */}
      <StageProgressionBar
        currentStage={project.stage}
        isSandbox={project.isSandbox}
        onSelectStage={handleStageChange}
        onToggleSandbox={() => setProject((prev) => ({ ...prev, isSandbox: !prev.isSandbox }))}
      />

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center Drawing Canvas Viewport */}
        <StudioCanvas
          project={project}
          onUpdateProject={(updater) => setProject(updater)}
          onLoadImageFile={handleLoadImageFile}
          onLoadSampleImage={handleLoadSamplePortrait}
        />

        {/* Right Tabbed Studio Control Panel */}
        <aside className="w-80 lg:w-96 bg-studio-950/95 backdrop-blur-xl border-l border-studio-800 flex flex-col z-30 shadow-2xl">
          {/* Tab Navigation Strip */}
          <div className="flex items-center justify-between border-b border-studio-800 bg-studio-900/90 p-1.5">
            <button
              onClick={() => setActiveTab('values')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                activeTab === 'values'
                  ? 'bg-studio-800 text-studio-accent shadow-md ring-1 ring-studio-accent/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850'
              }`}
              title="Tonal Value Study"
            >
              <Layers className="w-4 h-4" />
              <span className="text-[10px]">Values</span>
            </button>

            <button
              onClick={() => setActiveTab('grid')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                activeTab === 'grid'
                  ? 'bg-studio-800 text-studio-accent shadow-md ring-1 ring-studio-accent/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850'
              }`}
              title="Grid & Armatures"
            >
              <Grid className="w-4 h-4" />
              <span className="text-[10px]">Grids</span>
            </button>

            <button
              onClick={() => setActiveTab('methods')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                activeTab === 'methods'
                  ? 'bg-studio-800 text-studio-accent shadow-md ring-1 ring-studio-accent/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850'
              }`}
              title="Drawing Construction Methods"
            >
              <Compass className="w-4 h-4" />
              <span className="text-[10px]">Methods</span>
            </button>

            <button
              onClick={() => setActiveTab('pencils')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                activeTab === 'pencils'
                  ? 'bg-studio-800 text-studio-gold shadow-md ring-1 ring-studio-gold/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850'
              }`}
              title="Pencil Hardness Scale"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-[10px]">Pencils</span>
            </button>

            <button
              onClick={() => setActiveTab('mediums')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                activeTab === 'mediums'
                  ? 'bg-studio-800 text-studio-accent shadow-md ring-1 ring-studio-accent/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850'
              }`}
              title="Medium Presets (Oil/Watercolor)"
            >
              <Palette className="w-4 h-4" />
              <span className="text-[10px]">Mediums</span>
            </button>
          </div>

          {/* Active Tab Panel Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'values' && (
              <ValueStudyPanel
                project={project}
                onUpdateProject={(updater) => setProject(updater)}
              />
            )}

            {activeTab === 'grid' && (
              <GridConfigPanel
                grid={project.grid}
                calibration={project.calibration}
                onChange={(updates) =>
                  setProject((prev) => ({ ...prev, grid: { ...prev.grid, ...updates } }))
                }
                onOpenCalibration={() => setIsCaliperOpen(true)}
              />
            )}

            {activeTab === 'methods' && (
              <MethodSelectorPanel
                methods={project.methods}
                onChange={(updates) =>
                  setProject((prev) => ({ ...prev, methods: { ...prev.methods, ...updates } }))
                }
                onOpenTeachingMode={(type) => {
                  setTeachingMethod(type);
                  setIsTeachingOpen(true);
                }}
              />
            )}

            {activeTab === 'pencils' && <PencilGradePanel />}

            {activeTab === 'mediums' && (
              <MediumSelector
                currentMedium={project.medium}
                onChangeMedium={(med) => setProject((prev) => ({ ...prev, medium: med }))}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Interactive Modals & Drawers */}
      <PhysicalCaliperModal
        isOpen={isCaliperOpen}
        calibration={project.calibration}
        onClose={() => setIsCaliperOpen(false)}
        onSaveCalibration={(calib) => setProject((prev) => ({ ...prev, calibration: calib }))}
      />

      <TeachingModeDrawer
        isOpen={isTeachingOpen}
        initialMethod={teachingMethod}
        onClose={() => setIsTeachingOpen(false)}
        onApplyMethod={(type) => {
          setProject((prev) => ({
            ...prev,
            methods: { ...prev.methods, activeMethod: type },
          }));
        }}
      />

      <ExportModal
        isOpen={isExportOpen}
        project={project}
        onClose={() => setIsExportOpen(false)}
      />
    </main>
  );
}
