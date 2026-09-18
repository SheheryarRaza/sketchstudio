'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type {
  ProjectState,
  ImageProjectState,
  ValueStudyState,
  StudioViewState,
  DrawingMethodState,
  GridConfig,
  AtelierStage,
  DrawingMethodType,
  HistogramStats,
  LandmarkStats,
} from '@/types/studio';
import type { LightDirectionResult } from '@/types/lightDirection';
import { capRenderSize } from '@/utils/renderScale';
import {
  fetchHistogram,
  fetchLandmarks,
  scaleLandmarksToImageSpace,
  fetchLightDirection,
  scaleLightDirectionToImageSpace,
} from '@/utils/analysisApi';
import { applyEstimatedLightDirection, estimateLightDirectionFromCentroids } from '@/utils/lightDirection';
import { loadSamplePortraitAsDataUrl, type SampleLoadError } from '@/utils/sampleLoader';
import {
  INITIAL_IMAGE_STATE,
  INITIAL_VALUE_STUDY_STATE,
  INITIAL_METHODS_STATE,
  INITIAL_GRID_STATE,
  INITIAL_VIEW_STATE,
  assembleProjectState,
} from '@/utils/initialProjectState';
import { generateDefaultLayerMeta } from '@/utils/pencilGrades';
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
import { PresetPickerModal } from '@/components/studio/PresetPickerModal';
import { FirstRunTourModal, TOUR_STORAGE_KEY } from '@/components/studio/FirstRunTourModal';
import { applyWorkflowPreset, type WorkflowPresetId } from '@/utils/workflowPresets';
import { transitionAtelierStage } from '@/utils/atelierWorkflow';
import { Compass, X } from 'lucide-react';
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
import {
  deserializeEdgeQuality,
  serializeEdgeQuality,
  createInitialEdgeQualityState,
  EDGE_QUALITY_STORAGE_KEY,
} from '@/utils/edgeQuality';

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
  // Concern-scoped studio states (Issue #36): split project state by concern
  // so unrelated updates (e.g. dragging Cut Points or zooming) do not force
  // unrelated re-renders of anchor detection, analysis effects, or other panels.
  const [imageState, setImageState] = useState<ImageProjectState>(INITIAL_IMAGE_STATE);
  const [valuesState, setValuesState] = useState<ValueStudyState>(INITIAL_VALUE_STUDY_STATE);
  const [methodsState, setMethodsState] = useState<DrawingMethodState>(INITIAL_METHODS_STATE);
  const [gridState, setGridState] = useState<GridConfig>(INITIAL_GRID_STATE);
  const [viewState, setViewState] = useState<StudioViewState>(INITIAL_VIEW_STATE);

  // Composite project view with backward-compatible flat accessors
  const project = useMemo(
    () => assembleProjectState(imageState, valuesState, methodsState, gridState, viewState),
    [imageState, valuesState, methodsState, gridState, viewState]
  );

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
  const [sampleLoadError, setSampleLoadError] = useState<SampleLoadError | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);
  const [isPresetPickerOpen, setIsPresetPickerOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [sandboxNoticeToast, setSandboxNoticeToast] = useState<string | null>(null);

  // The authoritative luminance histogram is a one-shot backend analysis, fetched
  // whenever the Reference Image changes. Cached per image so unrelated project
  // state (layers, isolation, view mode, ...) never triggers a re-fetch.
  const [loadedImageEl, setLoadedImageEl] = useState<HTMLImageElement | null>(null);
  const histogramCacheRef = useRef<{ src: string; data: HistogramStats } | null>(null);
  const [histogramRetryTick, setHistogramRetryTick] = useState(0);

  useEffect(() => {
    // loadedImageEl can briefly lag imageState.imageSrc while the new Image element is
    // still decoding — only proceed once it actually holds the current photograph.
    if (!imageState.imageSrc || !loadedImageEl || loadedImageEl.src !== imageState.imageSrc) return;

    const cached = histogramCacheRef.current;
    if (cached && cached.src === imageState.imageSrc) {
      setImageState((prev) => ({ ...prev, histogram: { status: 'ready', data: cached.data } }));
      return;
    }

    let cancelled = false;
    const src = imageState.imageSrc;
    const size = capRenderSize(loadedImageEl.naturalWidth, loadedImageEl.naturalHeight);
    setImageState((prev) => ({ ...prev, histogram: { status: 'loading' } }));

    fetchHistogram(loadedImageEl, size)
      .then((data) => {
        if (cancelled) return;
        histogramCacheRef.current = { src, data };
        setImageState((prev) => ({ ...prev, histogram: { status: 'ready', data } }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setImageState((prev) => ({
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
  }, [imageState.imageSrc, loadedImageEl, histogramRetryTick]);

  // Landmark Auto-Snap: seeds Anchor Placement from the detected face, or the declared
  // proportional fallback when none is found. Same one-shot-per-image pattern as the
  // histogram above; applying it merges into methods.loomis/reilly, which the artist can
  // still drag afterwards since this only runs again on a new image or an explicit retry.
  const landmarksCacheRef = useRef<{ src: string; data: LandmarkStats } | null>(null);
  const [landmarksRetryTick, setLandmarksRetryTick] = useState(0);

  useEffect(() => {
    if (!imageState.imageSrc || !loadedImageEl || loadedImageEl.src !== imageState.imageSrc) return;

    const cached = landmarksCacheRef.current;
    if (cached && cached.src === imageState.imageSrc) {
      setImageState((prev) => ({ ...prev, landmarks: { status: 'ready', data: cached.data } }));
      return;
    }

    let cancelled = false;
    const src = imageState.imageSrc;
    const size = capRenderSize(loadedImageEl.naturalWidth, loadedImageEl.naturalHeight);
    setImageState((prev) => ({ ...prev, landmarks: { status: 'loading' } }));

    fetchLandmarks(loadedImageEl, size)
      .then((data) => {
        if (cancelled) return;
        landmarksCacheRef.current = { src, data };
        const { loomis, reilly } = scaleLandmarksToImageSpace(data, size);
        setImageState((prev) => ({
          ...prev,
          landmarks: { status: 'ready', data },
        }));
        setMethodsState((prev) => ({
          ...prev,
          loomis,
          reilly,
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setImageState((prev) => ({
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
  }, [imageState.imageSrc, loadedImageEl, landmarksRetryTick]);

  // Light Direction & Terminator Diagnosis: estimates lighting angle and core-shadow
  // terminator boundary from the Reference Image's histogram and shadow Value Family shape.
  const [isEstimatingLight, setIsEstimatingLight] = useState(false);
  const lightDirectionCacheRef = useRef<{ src: string; data: LightDirectionResult } | null>(null);

  const handleEstimateLightDirection = useCallback(async () => {
    if (!imageState.imageSrc || !loadedImageEl) return;
    setIsEstimatingLight(true);
    try {
      const src = imageState.imageSrc;
      const size = capRenderSize(loadedImageEl.naturalWidth, loadedImageEl.naturalHeight);
      const shadowThresh = valuesState.valueFamilyFloors?.halftoneFloor;
      const data = await fetchLightDirection(loadedImageEl, size, shadowThresh);
      lightDirectionCacheRef.current = { src, data };
      const scaled = scaleLightDirectionToImageSpace(
        data,
        size,
        imageState.imageWidth || loadedImageEl.naturalWidth,
        imageState.imageHeight || loadedImageEl.naturalHeight,
      );
      setMethodsState((prev) => ({
        ...prev,
        asaro: applyEstimatedLightDirection(prev.asaro, scaled),
      }));
    } catch {
      const w = imageState.imageWidth || loadedImageEl.naturalWidth || 800;
      const h = imageState.imageHeight || loadedImageEl.naturalHeight || 1000;
      const fallback = estimateLightDirectionFromCentroids(
        w,
        h,
        { x: w * 0.6, y: h * 0.6 },
        { x: w * 0.4, y: h * 0.35 },
      );
      setMethodsState((prev) => ({
        ...prev,
        asaro: applyEstimatedLightDirection(prev.asaro, fallback),
      }));
    } finally {
      setIsEstimatingLight(false);
    }
  }, [
    imageState.imageSrc,
    imageState.imageWidth,
    imageState.imageHeight,
    valuesState.valueFamilyFloors?.halftoneFloor,
    loadedImageEl,
  ]);

  useEffect(() => {
    if (!imageState.imageSrc || !loadedImageEl || loadedImageEl.src !== imageState.imageSrc) return;
    if (imageState.histogram.status !== 'ready') return;

    const cached = lightDirectionCacheRef.current;
    if (cached && cached.src === imageState.imageSrc) {
      const size = capRenderSize(loadedImageEl.naturalWidth, loadedImageEl.naturalHeight);
      const scaled = scaleLightDirectionToImageSpace(
        cached.data,
        size,
        imageState.imageWidth || loadedImageEl.naturalWidth,
        imageState.imageHeight || loadedImageEl.naturalHeight,
      );
      setMethodsState((prev) => ({
        ...prev,
        asaro: applyEstimatedLightDirection(prev.asaro, scaled),
      }));
      return;
    }

    handleEstimateLightDirection();
  }, [
    imageState.imageSrc,
    imageState.imageWidth,
    imageState.imageHeight,
    loadedImageEl,
    imageState.histogram.status,
    handleEstimateLightDirection,
  ]);

  // Restore calibration, grid, and paper mapping preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedCalib = localStorage.getItem('sketchstudio_calibration_v1');
      const savedGrid = localStorage.getItem('sketchstudio_grid_v1');
      const savedPaperMapping = localStorage.getItem('sketchstudio_paper_mapping_v1');
      const savedEdgeQuality = localStorage.getItem(EDGE_QUALITY_STORAGE_KEY);

      const parsedEdgeQuality = savedEdgeQuality ? deserializeEdgeQuality(savedEdgeQuality) : null;

      if (savedCalib) {
        setImageState((prev) => ({ ...prev, calibration: JSON.parse(savedCalib) }));
      }
      if (savedPaperMapping) {
        setImageState((prev) => ({ ...prev, paperMapping: JSON.parse(savedPaperMapping) }));
      }
      if (savedGrid) {
        setGridState((prev) => ({ ...prev, ...JSON.parse(savedGrid) }));
      }
      if (parsedEdgeQuality) {
        setViewState((prev) => ({ ...prev, edgeQuality: parsedEdgeQuality }));
      }
    } catch (e) {
      console.warn('Failed to load saved studio preferences from localStorage', e);
    }
  }, []);

  // Persist edge quality marks to localStorage when updated (#47)
  useEffect(() => {
    if (!viewState.edgeQuality) return;
    try {
      localStorage.setItem(EDGE_QUALITY_STORAGE_KEY, serializeEdgeQuality(viewState.edgeQuality));
    } catch (e) {
      console.warn('Failed to persist edge quality to localStorage', e);
    }
  }, [viewState.edgeQuality]);

  // Persist calibration when updated
  const handleSaveCalibration = (calib: typeof INITIAL_IMAGE_STATE.calibration) => {
    try {
      localStorage.setItem('sketchstudio_calibration_v1', JSON.stringify(calib));
    } catch (e) {
      console.warn('Failed to persist calibration', e);
    }
    setImageState((prev) => ({ ...prev, calibration: calib }));
  };

  // Persist grid preferences when updated
  const handleUpdateGrid = (updates: Partial<typeof INITIAL_GRID_STATE>) => {
    setGridState((prev) => {
      const newGrid = { ...prev, ...updates };
      try {
        localStorage.setItem('sketchstudio_grid_v1', JSON.stringify(newGrid));
      } catch (e) {
        console.warn('Failed to persist grid', e);
      }
      return newGrid;
    });
  };

  // Persist Paper Mapping when declared
  const handleSavePaperMapping = (mapping: typeof INITIAL_IMAGE_STATE.paperMapping) => {
    try {
      localStorage.setItem('sketchstudio_paper_mapping_v1', JSON.stringify(mapping));
    } catch (e) {
      console.warn('Failed to persist Paper Mapping', e);
    }
    setImageState((prev) => ({ ...prev, paperMapping: mapping }));
  };

  // Restore study log from localStorage on mount
  useEffect(() => {
    setStudyLog(loadStudyLog());
  }, []);

  // Auto-dismiss sandbox switch notice toast after 6 seconds
  useEffect(() => {
    if (!sandboxNoticeToast) return;
    const timer = setTimeout(() => {
      setSandboxNoticeToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [sandboxNoticeToast]);

  // Active gesture study timer ticker (#46)
  useEffect(() => {
    if (gestureState.status !== 'running') return;

    const interval = setInterval(() => {
      setGestureState((prev) => {
        const { state: nextState } = tickGestureSession(prev, 1);
        return nextState;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gestureState.status]);

  // Persist completed gesture study session cleanly without impure updater side effects
  useEffect(() => {
    if (gestureState.status === 'completed' && !gestureState.completedEntryId) {
      const { entry, log } = appendStudyLogEntry({
        durationSeconds: gestureState.targetDuration,
        referenceTitle: gestureState.referenceTitle || imageState.title || 'Untitled Reference',
      });
      setStudyLog(log);
      setGestureState((prev) => ({
        ...prev,
        completedEntryId: entry.id,
      }));
    }
  }, [
    gestureState.status,
    gestureState.completedEntryId,
    gestureState.targetDuration,
    gestureState.referenceTitle,
    imageState.title,
  ]);

  const handleStartGestureSession = (durationSeconds: number) => {
    setGestureState((prev) =>
      startGestureSession(prev, durationSeconds, imageState.title || 'Untitled Reference')
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
    setSampleLoadError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setImageState((prev) => ({
        ...prev,
        imageSrc: src,
        title: file.name.replace(/\.[^/.]+$/, ''),
      }));
      setViewState((prev) => ({
        ...prev,
        appliedPreset: null,
        edgeQuality: createInitialEdgeQualityState(),
      }));
      try {
        const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
        if (!hasSeenTour) {
          setIsTourOpen(true);
        }
      } catch {
        // Ignore storage errors
      }
      setIsPresetPickerOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Sample portrait loader (converts to base64 Data URL for zero-CORS instant canvas rendering)
  const handleLoadSamplePortrait = async (url: string, title: string) => {
    setIsLoadingSample(true);
    setSampleLoadError(null);
    try {
      const dataUrl = await loadSamplePortraitAsDataUrl(url, title);
      setImageState((prev) => ({
        ...prev,
        imageSrc: dataUrl,
        title: title,
      }));
      setViewState((prev) => ({
        ...prev,
        appliedPreset: null,
        edgeQuality: createInitialEdgeQualityState(),
      }));
      try {
        const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
        if (!hasSeenTour) {
          setIsTourOpen(true);
        }
      } catch {
        // Ignore storage errors
      }
      setIsPresetPickerOpen(true);
    } catch (err) {
      setSampleLoadError({
        url,
        title,
        message: err instanceof Error ? err.message : `Failed to load sample image "${title}"`,
      });
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleSelectWorkflowPreset = (presetId: WorkflowPresetId) => {
    if (!viewState.isSandbox) {
      try {
        const seenNotice = sessionStorage.getItem('sketchstudio_sandbox_preset_toast_seen');
        if (!seenNotice) {
          setSandboxNoticeToast(
            'Switched to Sandbox Mode — Workflow presets configure View Mode, Drawing Method, and Grid directly, exiting the guided Atelier stages.'
          );
          sessionStorage.setItem('sketchstudio_sandbox_preset_toast_seen', 'true');
        }
      } catch {
        // Ignore storage errors
      }
    }

    const applied = applyWorkflowPreset(project, presetId);
    if (applied.view) {
      setViewState(applied.view);
    } else {
      setViewState((prev) => ({
        ...prev,
        isSandbox: true,
        appliedPreset: presetId,
        viewMode: applied.viewMode,
        isolation: applied.isolation,
      }));
    }

    if (applied.values) {
      setValuesState(applied.values);
    } else {
      setValuesState((prev) => ({
        ...prev,
        medium: applied.medium,
        layerMeta: applied.layerMeta,
      }));
    }

    setMethodsState(applied.methods);
    setGridState(applied.grid);
    setIsPresetPickerOpen(false);
  };

  const handleStageChange = (newStage: AtelierStage) => {
    const next = transitionAtelierStage({
      currentStage: viewState.stage,
      isSandbox: viewState.isSandbox,
      currentViewMode: viewState.viewMode,
      currentActiveMethod: methodsState.activeMethod,
      currentGridEnabled: gridState.enabled,
      newStage,
    });

    setViewState((prev) => ({
      ...prev,
      stage: next.stage,
      viewMode: next.viewMode,
    }));
    setGridState((prev) => ({
      ...prev,
      enabled: next.gridEnabled,
    }));
    setMethodsState((prev) => ({
      ...prev,
      activeMethod: next.activeMethod,
    }));
  };

  // Central project updater adapter ensuring backward compatibility for legacy callbacks
  const handleUpdateProject = useCallback(
    (updater: (prev: ProjectState) => ProjectState) => {
      const current = assembleProjectState(imageState, valuesState, methodsState, gridState, viewState);
      const next = updater(current);

      if (next.image && next.image !== imageState) {
        setImageState(next.image);
      } else if (
        next.imageSrc !== imageState.imageSrc ||
        next.title !== imageState.title ||
        next.imageWidth !== imageState.imageWidth ||
        next.imageHeight !== imageState.imageHeight ||
        next.calibration !== imageState.calibration ||
        next.paperMapping !== imageState.paperMapping ||
        next.histogram !== imageState.histogram ||
        next.landmarks !== imageState.landmarks
      ) {
        setImageState((prev) => ({
          ...prev,
          id: next.id ?? prev.id,
          title: next.title ?? prev.title,
          imageSrc: next.imageSrc !== undefined ? next.imageSrc : prev.imageSrc,
          imageWidth: next.imageWidth ?? prev.imageWidth,
          imageHeight: next.imageHeight ?? prev.imageHeight,
          calibration: next.calibration ?? prev.calibration,
          paperMapping: next.paperMapping ?? prev.paperMapping,
          histogram: next.histogram ?? prev.histogram,
          landmarks: next.landmarks ?? prev.landmarks,
        }));
      }

      if (next.values && next.values !== valuesState) {
        setValuesState(next.values);
      } else if (
        next.cutPoints !== valuesState.cutPoints ||
        next.numValueLayers !== valuesState.numValueLayers ||
        next.medium !== valuesState.medium ||
        next.layerMeta !== valuesState.layerMeta ||
        next.valueFamilyFloors !== valuesState.valueFamilyFloors ||
        next.cutPointSource !== valuesState.cutPointSource
      ) {
        setValuesState((prev) => ({
          ...prev,
          medium: next.medium ?? prev.medium,
          numValueLayers: next.numValueLayers ?? prev.numValueLayers,
          layerMeta: next.layerMeta ?? prev.layerMeta,
          cutPoints: next.cutPoints ?? prev.cutPoints,
          cutPointSource: next.cutPointSource ?? prev.cutPointSource,
          valueFamilyFloors: next.valueFamilyFloors ?? prev.valueFamilyFloors,
        }));
      }

      if (next.methods && next.methods !== methodsState) {
        setMethodsState(next.methods);
      }

      if (next.grid && next.grid !== gridState) {
        setGridState(next.grid);
      }

      if (next.view && next.view !== viewState) {
        setViewState(next.view);
      } else if (
        next.stage !== viewState.stage ||
        next.isSandbox !== viewState.isSandbox ||
        next.viewMode !== viewState.viewMode ||
        next.splitPosition !== viewState.splitPosition ||
        next.blurRadius !== viewState.blurRadius ||
        next.isFlippedHorizontal !== viewState.isFlippedHorizontal ||
        next.isolation !== viewState.isolation ||
        next.ghostOpacity !== viewState.ghostOpacity ||
        next.appliedPreset !== viewState.appliedPreset ||
        next.edgeQuality !== viewState.edgeQuality
      ) {
        setViewState((prev) => ({
          ...prev,
          stage: next.stage ?? prev.stage,
          isSandbox: next.isSandbox ?? prev.isSandbox,
          viewMode: next.viewMode ?? prev.viewMode,
          splitPosition: next.splitPosition ?? prev.splitPosition,
          blurRadius: next.blurRadius ?? prev.blurRadius,
          isFlippedHorizontal: next.isFlippedHorizontal ?? prev.isFlippedHorizontal,
          isolation: next.isolation ?? prev.isolation,
          ghostOpacity: next.ghostOpacity ?? prev.ghostOpacity,
          appliedPreset: next.appliedPreset !== undefined ? next.appliedPreset : prev.appliedPreset,
          edgeQuality: next.edgeQuality !== undefined ? next.edgeQuality : prev.edgeQuality,
        }));
      }
    },
    [imageState, valuesState, methodsState, gridState, viewState]
  );

  const activeSidebarSection = viewState.isSandbox ? sandboxSection : SIDEBAR_SECTION_BY_STAGE[viewState.stage];

  return (
    <main className="flex flex-col h-screen w-screen bg-studio-950 text-slate-100 overflow-hidden font-sans select-none">
      <TopStrip
        project={project}
        onSelectStage={handleStageChange}
        onToggleSandbox={() => setViewState((prev) => ({ ...prev, isSandbox: !prev.isSandbox }))}
        onLoadImageFile={handleLoadImageFile}
        onOpenCaliper={() => setIsCaliperOpen(true)}
        onOpenTeaching={() => {
          setTeachingMethod(methodsState.activeMethod === 'none' ? 'loomis' : methodsState.activeMethod);
          setIsTeachingOpen(true);
        }}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenGestureStudy={() => setIsStudyLogOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
        isGestureActive={gestureState.status === 'running' || gestureState.status === 'paused'}
      />

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center Drawing Canvas Viewport */}
        <StudioCanvas
          project={project}
          onUpdateProject={handleUpdateProject}
          onLoadImageFile={handleLoadImageFile}
          onLoadSampleImage={handleLoadSamplePortrait}
          sampleLoadError={sampleLoadError}
          isLoadingSample={isLoadingSample}
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
        {imageState.imageSrc && (
          <aside className="w-80 lg:w-96 bg-studio-950 border-l border-studio-800 flex flex-col z-30">
            {viewState.isSandbox && (
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
                  grid={gridState}
                  paperMapping={imageState.paperMapping}
                  onChange={handleUpdateGrid}
                  onOpenPaperMapping={() => setIsPaperMappingOpen(true)}
                />
              )}

              {activeSidebarSection === 'methods' && (
                <MethodSelectorPanel
                  methods={methodsState}
                  landmarks={imageState.landmarks}
                  onChange={(updates) =>
                    setMethodsState((prev) => ({ ...prev, ...updates }))
                  }
                  onOpenTeachingMode={(type) => {
                    setTeachingMethod(type);
                    setIsTeachingOpen(true);
                  }}
                  onRetryLandmarks={() => setLandmarksRetryTick((t) => t + 1)}
                  onEstimateLightDirection={handleEstimateLightDirection}
                  isEstimatingLight={isEstimatingLight}
                  imageWidth={imageState.imageWidth}
                  imageHeight={imageState.imageHeight}
                />
              )}

              {activeSidebarSection === 'values' && (
                <ValueStudyPanel
                  project={project}
                  onUpdateProject={handleUpdateProject}
                  onRetryHistogram={() => setHistogramRetryTick((t) => t + 1)}
                  onOpenPresetPicker={() => setIsPresetPickerOpen(true)}
                />
              )}
            </div>

            <MediumFooterSelector
              currentMedium={valuesState.medium}
              onChangeMedium={(medium) =>
                setValuesState((prev) => {
                  if (prev.medium === medium) return prev;
                  return {
                    ...prev,
                    medium,
                    layerMeta: generateDefaultLayerMeta(prev.numValueLayers, medium),
                  };
                })
              }
            />
          </aside>
        )}
      </div>

      {/* Interactive Modals & Drawers */}
      <PhysicalCaliperModal
        isOpen={isCaliperOpen}
        calibration={imageState.calibration}
        onClose={() => setIsCaliperOpen(false)}
        onSaveCalibration={handleSaveCalibration}
      />

      <PaperMappingModal
        isOpen={isPaperMappingOpen}
        paperMapping={imageState.paperMapping}
        onClose={() => setIsPaperMappingOpen(false)}
        onSavePaperMapping={handleSavePaperMapping}
      />

      <TeachingModeDrawer
        isOpen={isTeachingOpen}
        initialMethod={teachingMethod}
        onClose={() => setIsTeachingOpen(false)}
        onApplyMethod={(type) => {
          setMethodsState((prev) => ({
            ...prev,
            activeMethod: type,
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
        currentReferenceTitle={imageState.title}
        hasReferenceImage={Boolean(imageState.imageSrc)}
      />

      <PresetPickerModal
        isOpen={isPresetPickerOpen}
        onClose={() => setIsPresetPickerOpen(false)}
        onSelectPreset={handleSelectWorkflowPreset}
        histogramStats={imageState.histogram.status === 'ready' ? imageState.histogram.data : null}
        currentPresetId={viewState.appliedPreset}
      />

      <FirstRunTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      {sandboxNoticeToast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-studio-900 border border-studio-accent/40 rounded-xl shadow-2xl text-xs max-w-md animate-in slide-in-from-bottom-2 text-slate-100"
        >
          <Compass className="w-4 h-4 text-studio-accent shrink-0" />
          <p className="leading-relaxed flex-1">{sandboxNoticeToast}</p>
          <button
            onClick={() => setSandboxNoticeToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-studio-800 transition-colors shrink-0"
            title="Dismiss notice"
            aria-label="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </main>
  );
}
