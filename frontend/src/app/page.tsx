'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ProjectState, AtelierStage, DrawingMethodType, HistogramStats, LandmarkStats } from '@/types/studio';
import { generateDefaultLayerMeta } from '@/utils/pencilGrades';
import { generateDefaultCutPoints } from '@/utils/cutPoints';
import { DEFAULT_VALUE_FAMILY_FLOORS } from '@/utils/tonalDecision';
import { capRenderSize } from '@/utils/renderScale';
import { CONSTRUCTION_INK, TRANSFER_GRID_INK } from '@/utils/inkColors';
import { fetchHistogram, fetchLandmarks, scaleLandmarksToImageSpace } from '@/utils/analysisApi';
import { StudioCanvas } from '@/components/canvas/StudioCanvas';
import { TopStrip } from '@/components/studio/TopStrip';
import { ValueStudyPanel } from '@/components/studio/ValueStudyPanel';
import { GridConfigPanel } from '@/components/studio/GridConfigPanel';
import { MethodSelectorPanel } from '@/components/studio/MethodSelectorPanel';
import { MediumFooterSelector } from '@/components/studio/MediumFooterSelector';
import { PhysicalCaliperModal } from '@/components/studio/PhysicalCaliperModal';
import { PaperMappingModal } from '@/components/studio/PaperMappingModal';
import { TeachingModeDrawer } from '@/components/studio/TeachingModeDrawer';
import { ExportModal } from '@/components/studio/ExportModal';

const INITIAL_PROJECT_STATE: ProjectState = {
  title: 'Classical Portrait Study',
  imageSrc: null,
  imageWidth: 600,
  imageHeight: 800,
  medium: 'graphite',
  stage: 1,
  isSandbox: false,
  numValueLayers: 5,
  layerMeta: generateDefaultLayerMeta(5),
  cutPoints: generateDefaultCutPoints(5),
  grid: {
    enabled: true,
    type: 'squares',
    cellSizeMm: 15,
    lineColor: TRANSFER_GRID_INK,
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
  },
  paperMapping: {
    isDeclared: false,
    paperPreset: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    fillMode: 'fillWidth',
  },
  methods: {
    activeMethod: 'loomis',
    opacity: 0.85,
    color: CONSTRUCTION_INK,
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
  isolation: { kind: 'none' },
  ghostOpacity: 0.18,
  valueFamilyFloors: DEFAULT_VALUE_FAMILY_FLOORS,
  cutPointSource: 'default',
  histogram: { status: 'idle' },
  landmarks: { status: 'idle' },
};

// Sidebar section shown for each Atelier Workflow stage (issue #39): stage 1 is
// Paper Mapping + Transfer Grid, stage 2 is Drawing Method + Anchor Placement,
// stages 3-5 are all the Value Study (Cut Points, Value Family isolation).
type SidebarSection = 'grid' | 'methods' | 'values';

const SIDEBAR_SECTION_BY_STAGE: Record<AtelierStage, SidebarSection> = {
  1: 'grid',
  2: 'methods',
  3: 'values',
  4: 'values',
  5: 'values',
};

export default function StudioHomePage() {
  const [project, setProject] = useState<ProjectState>(INITIAL_PROJECT_STATE);
  // Sandbox Mode owns View Mode, Drawing Method, and Grid directly rather than
  // having the stage set them, so the artist needs a manual way to pick which
  // sidebar section to see while it's active.
  const [sandboxSection, setSandboxSection] = useState<SidebarSection>('values');

  const [isCaliperOpen, setIsCaliperOpen] = useState<boolean>(false);
  const [isPaperMappingOpen, setIsPaperMappingOpen] = useState<boolean>(false);
  const [isTeachingOpen, setIsTeachingOpen] = useState<boolean>(false);
  const [teachingMethod, setTeachingMethod] = useState<DrawingMethodType>('loomis');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // The authoritative luminance histogram is a one-shot backend analysis, fetched
  // whenever the Reference Image changes. Cached per image so unrelated project
  // state (layers, isolation, view mode, ...) never triggers a re-fetch.
  const [loadedImageEl, setLoadedImageEl] = useState<HTMLImageElement | null>(null);
  const histogramCacheRef = useRef<{ src: string; data: HistogramStats } | null>(null);
  const [histogramRetryTick, setHistogramRetryTick] = useState(0);

  useEffect(() => {
    // loadedImageEl can briefly lag project.imageSrc while the new Image element is
    // still decoding — only proceed once it actually holds the current photograph.
    if (!project.imageSrc || !loadedImageEl || loadedImageEl.src !== project.imageSrc) return;

    const cached = histogramCacheRef.current;
    if (cached && cached.src === project.imageSrc) {
      setProject((prev) => ({ ...prev, histogram: { status: 'ready', data: cached.data } }));
      return;
    }

    let cancelled = false;
    const src = project.imageSrc;
    const size = capRenderSize(loadedImageEl.naturalWidth, loadedImageEl.naturalHeight);
    setProject((prev) => ({ ...prev, histogram: { status: 'loading' } }));

    fetchHistogram(loadedImageEl, size)
      .then((data) => {
        if (cancelled) return;
        histogramCacheRef.current = { src, data };
        setProject((prev) => ({ ...prev, histogram: { status: 'ready', data } }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProject((prev) => ({
          ...prev,
          histogram: {
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to analyze the photograph',
          },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [project.imageSrc, loadedImageEl, histogramRetryTick]);

  // Landmark Auto-Snap: seeds Anchor Placement from the detected face, or the declared
  // proportional fallback when none is found. Same one-shot-per-image pattern as the
  // histogram above; applying it merges into methods.loomis/reilly, which the artist can
  // still drag afterwards since this only runs again on a new image or an explicit retry.
  const landmarksCacheRef = useRef<{ src: string; data: LandmarkStats } | null>(null);
  const [landmarksRetryTick, setLandmarksRetryTick] = useState(0);

  useEffect(() => {
    if (!project.imageSrc || !loadedImageEl || loadedImageEl.src !== project.imageSrc) return;

    const cached = landmarksCacheRef.current;
    if (cached && cached.src === project.imageSrc) {
      setProject((prev) => ({ ...prev, landmarks: { status: 'ready', data: cached.data } }));
      return;
    }

    let cancelled = false;
    const src = project.imageSrc;
    const size = capRenderSize(loadedImageEl.naturalWidth, loadedImageEl.naturalHeight);
    setProject((prev) => ({ ...prev, landmarks: { status: 'loading' } }));

    fetchLandmarks(loadedImageEl, size)
      .then((data) => {
        if (cancelled) return;
        landmarksCacheRef.current = { src, data };
        const { loomis, reilly } = scaleLandmarksToImageSpace(data, size);
        setProject((prev) => ({
          ...prev,
          landmarks: { status: 'ready', data },
          methods: { ...prev.methods, loomis, reilly },
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProject((prev) => ({
          ...prev,
          landmarks: {
            status: 'error',
            message: err instanceof Error ? err.message : 'Landmark Auto-Snap failed',
          },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [project.imageSrc, loadedImageEl, landmarksRetryTick]);

  // Restore calibration, grid, and paper mapping preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedCalib = localStorage.getItem('sketchstudio_calibration_v1');
      const savedGrid = localStorage.getItem('sketchstudio_grid_v1');
      const savedPaperMapping = localStorage.getItem('sketchstudio_paper_mapping_v1');

      if (savedCalib || savedGrid || savedPaperMapping) {
        setProject((prev) => ({
          ...prev,
          calibration: savedCalib ? JSON.parse(savedCalib) : prev.calibration,
          grid: savedGrid ? { ...prev.grid, ...JSON.parse(savedGrid) } : prev.grid,
          paperMapping: savedPaperMapping ? JSON.parse(savedPaperMapping) : prev.paperMapping,
        }));
      }
    } catch (e) {
      console.warn('Failed to load saved studio preferences from localStorage', e);
    }
  }, []);

  // Persist calibration when updated
  const handleSaveCalibration = (calib: typeof INITIAL_PROJECT_STATE.calibration) => {
    try {
      localStorage.setItem('sketchstudio_calibration_v1', JSON.stringify(calib));
    } catch (e) {
      console.warn('Failed to persist calibration', e);
    }
    setProject((prev) => ({ ...prev, calibration: calib }));
  };

  // Persist grid preferences when updated
  const handleUpdateGrid = (updates: Partial<typeof INITIAL_PROJECT_STATE.grid>) => {
    setProject((prev) => {
      const newGrid = { ...prev.grid, ...updates };
      try {
        localStorage.setItem('sketchstudio_grid_v1', JSON.stringify(newGrid));
      } catch (e) {
        console.warn('Failed to persist grid', e);
      }
      return { ...prev, grid: newGrid };
    });
  };

  // Persist Paper Mapping when declared
  const handleSavePaperMapping = (mapping: typeof INITIAL_PROJECT_STATE.paperMapping) => {
    try {
      localStorage.setItem('sketchstudio_paper_mapping_v1', JSON.stringify(mapping));
    } catch (e) {
      console.warn('Failed to persist Paper Mapping', e);
    }
    setProject((prev) => ({ ...prev, paperMapping: mapping }));
  };

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

  // Sample portrait loader (converts to base64 Data URL for zero-CORS instant canvas rendering)
  const handleLoadSamplePortrait = async (url: string, title: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setProject((prev) => ({
          ...prev,
          imageSrc: dataUrl,
          title: title,
        }));
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      setProject((prev) => ({
        ...prev,
        imageSrc: url,
        title: title,
      }));
    }
  };

  const handleStageChange = (newStage: AtelierStage) => {
    setProject((prev) => {
      if (prev.isSandbox) {
        return { ...prev, stage: newStage };
      }

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

  const activeSidebarSection = project.isSandbox ? sandboxSection : SIDEBAR_SECTION_BY_STAGE[project.stage];

  return (
    <main className="flex flex-col h-screen w-screen bg-studio-950 text-slate-100 overflow-hidden font-sans select-none">
      <TopStrip
        project={project}
        onSelectStage={handleStageChange}
        onToggleSandbox={() => setProject((prev) => ({ ...prev, isSandbox: !prev.isSandbox }))}
        onLoadImageFile={handleLoadImageFile}
        onOpenCaliper={() => setIsCaliperOpen(true)}
        onOpenTeaching={() => {
          setTeachingMethod(project.methods.activeMethod === 'none' ? 'loomis' : project.methods.activeMethod);
          setIsTeachingOpen(true);
        }}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center Drawing Canvas Viewport */}
        <StudioCanvas
          project={project}
          onUpdateProject={(updater) => setProject(updater)}
          onLoadImageFile={handleLoadImageFile}
          onLoadSampleImage={handleLoadSamplePortrait}
          onImageLoaded={setLoadedImageEl}
        />

        {/* Progressive workspace: the sidebar stays hidden until a Reference
            Image is loaded, and its content then follows the active stage (#39). */}
        {project.imageSrc && (
          <aside className="w-80 lg:w-96 bg-studio-950 border-l border-studio-800 flex flex-col z-30">
            {project.isSandbox && (
              <div className="flex items-center gap-1 border-b border-studio-800 bg-studio-900 p-1.5">
                {([
                  { section: 'grid', label: 'Grid' },
                  { section: 'methods', label: 'Method' },
                  { section: 'values', label: 'Values' },
                ] as const).map((s) => (
                  <button
                    key={s.section}
                    onClick={() => setSandboxSection(s.section)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      sandboxSection === s.section
                        ? 'bg-studio-800 text-studio-accent'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {activeSidebarSection === 'grid' && (
                <GridConfigPanel
                  grid={project.grid}
                  paperMapping={project.paperMapping}
                  onChange={handleUpdateGrid}
                  onOpenPaperMapping={() => setIsPaperMappingOpen(true)}
                />
              )}

              {activeSidebarSection === 'methods' && (
                <MethodSelectorPanel
                  methods={project.methods}
                  landmarks={project.landmarks}
                  onChange={(updates) =>
                    setProject((prev) => ({ ...prev, methods: { ...prev.methods, ...updates } }))
                  }
                  onOpenTeachingMode={(type) => {
                    setTeachingMethod(type);
                    setIsTeachingOpen(true);
                  }}
                  onRetryLandmarks={() => setLandmarksRetryTick((t) => t + 1)}
                />
              )}

              {activeSidebarSection === 'values' && (
                <ValueStudyPanel
                  project={project}
                  onUpdateProject={(updater) => setProject(updater)}
                  onRetryHistogram={() => setHistogramRetryTick((t) => t + 1)}
                />
              )}
            </div>

            <MediumFooterSelector
              currentMedium={project.medium}
              onChangeMedium={(medium) => setProject((prev) => ({ ...prev, medium }))}
            />
          </aside>
        )}
      </div>

      {/* Interactive Modals & Drawers */}
      <PhysicalCaliperModal
        isOpen={isCaliperOpen}
        calibration={project.calibration}
        onClose={() => setIsCaliperOpen(false)}
        onSaveCalibration={handleSaveCalibration}
      />

      <PaperMappingModal
        isOpen={isPaperMappingOpen}
        paperMapping={project.paperMapping}
        onClose={() => setIsPaperMappingOpen(false)}
        onSavePaperMapping={handleSavePaperMapping}
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
