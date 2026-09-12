'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ProjectState, AtelierStage, DrawingMethodType, HistogramStats, LandmarkStats } from '@/types/studio';
import { capRenderSize } from '@/utils/renderScale';
import { fetchHistogram, fetchLandmarks, scaleLandmarksToImageSpace } from '@/utils/analysisApi';
import { INITIAL_PROJECT_STATE } from '@/utils/initialProjectState';
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
import { StudyLogModal } from '@/components/studio/StudyLogModal';
import type { GestureSessionState, StudyLogEntry } from '@/types/gesture';
import {
  createInitialGestureState,
  startGestureSession,
  tickGestureSession,
  pauseGestureSession,
  resumeGestureSession,
  cancelGestureSession,
  setReferenceHidden,
} from '@/utils/gestureSession';
import {
  loadStudyLog,
  appendStudyLogEntry,
  updateStudyLogEntryNotes,
  deleteStudyLogEntry,
  clearStudyLog,
} from '@/utils/studyLog';

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
  const [isStudyLogOpen, setIsStudyLogOpen] = useState<boolean>(false);
  const [gestureState, setGestureState] = useState<GestureSessionState>(createInitialGestureState);
  const [studyLog, setStudyLog] = useState<StudyLogEntry[]>([]);

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

  // Restore study log from localStorage on mount
  useEffect(() => {
    setStudyLog(loadStudyLog());
  }, []);

  // Active gesture study timer ticker (#46)
  useEffect(() => {
    if (gestureState.status !== 'running') return;

    const interval = setInterval(() => {
      setGestureState((prev) => {
        const { state: nextState, justCompleted } = tickGestureSession(prev, 1);
        if (justCompleted) {
          const { entry, log } = appendStudyLogEntry({
            durationSeconds: prev.targetDuration,
            referenceTitle: prev.referenceTitle || project.title || 'Untitled Reference',
          });
          setStudyLog(log);
          return {
            ...nextState,
            completedEntryId: entry.id,
          };
        }
        return nextState;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gestureState.status, project.title]);

  const handleStartGestureSession = (durationSeconds: number) => {
    setGestureState((prev) =>
      startGestureSession(prev, durationSeconds, project.title || 'Untitled Reference')
    );
  };

  const handlePauseGestureSession = () => {
    setGestureState((prev) => pauseGestureSession(prev));
  };

  const handleResumeGestureSession = () => {
    setGestureState((prev) => resumeGestureSession(prev));
  };

  const handleCancelGestureSession = () => {
    setGestureState((prev) => cancelGestureSession(prev));
  };

  const handleToggleReferenceHidden = (hidden: boolean) => {
    setGestureState((prev) => setReferenceHidden(prev, hidden));
  };

  const handleSaveGestureNote = (notes: string) => {
    if (!gestureState.completedEntryId) return;
    const updated = updateStudyLogEntryNotes(gestureState.completedEntryId, notes);
    setStudyLog(updated);
  };

  const handleDeleteStudyLogEntry = (id: string) => {
    const updated = deleteStudyLogEntry(id);
    setStudyLog(updated);
  };

  const handleUpdateStudyLogNotes = (id: string, notes: string) => {
    const updated = updateStudyLogEntryNotes(id, notes);
    setStudyLog(updated);
  };

  const handleClearStudyLog = () => {
    clearStudyLog();
    setStudyLog([]);
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
        onOpenGestureStudy={() => setIsStudyLogOpen(true)}
        isGestureActive={gestureState.status === 'running' || gestureState.status === 'paused'}
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
          gestureState={gestureState}
          onPauseGesture={handlePauseGestureSession}
          onResumeGesture={handleResumeGestureSession}
          onCancelGesture={handleCancelGestureSession}
          onToggleReferenceHidden={handleToggleReferenceHidden}
          onStartGestureSession={handleStartGestureSession}
          onOpenStudyLog={() => setIsStudyLogOpen(true)}
          onSaveGestureNote={handleSaveGestureNote}
          onDismissGestureOverlay={() => setGestureState(createInitialGestureState())}
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

      <StudyLogModal
        isOpen={isStudyLogOpen}
        entries={studyLog}
        onClose={() => setIsStudyLogOpen(false)}
        onStartSession={handleStartGestureSession}
        onDeleteEntry={handleDeleteStudyLogEntry}
        onUpdateNotes={handleUpdateStudyLogNotes}
        onClearLog={handleClearStudyLog}
        currentReferenceTitle={project.title}
      />
    </main>
  );
}
