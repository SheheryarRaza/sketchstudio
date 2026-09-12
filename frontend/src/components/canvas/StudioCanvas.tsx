'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { ProjectState } from '../../types/studio';
import { renderValueStudyOnCanvas } from '../../utils/canvasShaders';
import { buildValueLayers } from '../../utils/cutPoints';
import { capRenderSize } from '../../utils/renderScale';
import { fetchEdgeContours } from '../../utils/analysisApi';
import { computeTrueSizeScale } from '../../utils/paperMapping';
import {
  clampBlurRadius,
  formatBlurRadius,
  MAX_BLUR_RADIUS,
  MIN_BLUR_RADIUS,
} from '../../utils/squint';
import {
  computeCanvasTransform,
  toggleFlipHorizontal,
  mapPointerToNativeX,
} from '../../utils/flipHorizontal';
import { GridOverlay } from './GridOverlay';
import { MethodOverlays } from './MethodOverlays';
import { CaliperOverlay } from './CaliperOverlay';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  SplitSquareVertical,
  Upload,
  Sparkles,
  Image as ImageIcon,
  Layers,
  Eye,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FlipHorizontal,
  Timer,
} from 'lucide-react';
import type { GestureSessionState } from '../../types/gesture';
import { GestureTimerBar } from '../studio/GestureTimerBar';
import { GestureCompleteOverlay } from '../studio/GestureCompleteOverlay';
import { EdgeQualityOverlay } from './EdgeQualityOverlay';
import { EdgeQualityToolbar } from '../studio/EdgeQualityToolbar';
import {
  fetchSuggestedEdges,
  scaleEdgeSegmentsToImageSpace,
  generateFallbackEdgeSegments,
} from '../../utils/analysisApi';
import {
  toggleEdgeQualityEnabled,
  createInitialEdgeQualityState,
} from '../../utils/edgeQuality';
import type { EdgeQualitySegment } from '../../types/edgeQuality';
import { Activity } from 'lucide-react';

interface StudioCanvasProps {
  project: ProjectState;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
  onLoadImageFile: (file: File) => void;
  onLoadSampleImage: (url: string, title: string) => void;
  onImageLoaded?: (img: HTMLImageElement) => void;
  gestureState?: GestureSessionState;
  onPauseGesture?: () => void;
  onResumeGesture?: () => void;
  onCancelGesture?: () => void;
  onToggleReferenceHidden?: (hidden: boolean) => void;
  onStartGestureSession?: (durationSeconds: number) => void;
  onOpenStudyLog?: () => void;
  onSaveGestureNote?: (notes: string) => void;
  onDismissGestureOverlay?: () => void;
}

const SAMPLE_PORTRAITS = [
  {
    title: 'Classical Atelier Portrait',
    category: 'High Dynamic Range',
    url: '/samples/classical-portrait.svg',
  },
  {
    title: 'Dramatic Rembrandt Lighting',
    category: 'Core Shadow Study',
    url: '/samples/rembrandt-lighting.svg',
  },
  {
    title: 'Asaro Planar Head',
    category: 'Planes & Facets',
    url: '/samples/asaro-head.svg',
  },
  {
    title: 'Loomis Profile Study',
    category: 'Thirds & Ear Quadrant',
    url: '/samples/profile-study.svg',
  },
];

const RENDER_MODES: Array<{ mode: ProjectState['viewMode']; label: string; icon: React.ReactNode }> = [
  { mode: 'original', label: 'Photo', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { mode: 'valueStudy', label: 'Value Study', icon: <Layers className="w-3.5 h-3.5" /> },
  { mode: 'posterized', label: 'Posterize', icon: <Layers className="w-3.5 h-3.5" /> },
  { mode: 'edges', label: 'Edges', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { mode: 'split', label: 'Split Compare', icon: <SplitSquareVertical className="w-3.5 h-3.5" /> },
];

const BG_THEMES: Array<{ id: 'obsidian' | 'neutral' | 'toned' | 'white'; color: string; label: string }> = [
  { id: 'obsidian', color: '#070a11', label: 'Obsidian Black' },
  { id: 'neutral', color: '#2b2f38', label: '18% Neutral Grey' },
  { id: 'toned', color: '#29221b', label: 'Toned Charcoal Paper' },
  { id: 'white', color: '#f4f4f5', label: 'Drafting Light' },
];

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  project,
  onUpdateProject,
  onLoadImageFile,
  onLoadSampleImage,
  onImageLoaded,
  gestureState,
  onPauseGesture,
  onResumeGesture,
  onCancelGesture,
  onToggleReferenceHidden,
  onStartGestureSession,
  onOpenStudyLog,
  onSaveGestureNote,
  onDismissGestureOverlay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [bgTheme, setBgTheme] = useState<'obsidian' | 'neutral' | 'toned' | 'white'>('obsidian');
  const [isViewMenuOpen, setIsViewMenuOpen] = useState<boolean>(false);

  // Edges view is backend-rendered (contour extraction), unlike the other shader
  // views which run client-side. Cache the last result per Reference Image so
  // switching views doesn't re-post the image, and track load/error state so a
  // failed call surfaces to the artist instead of a stale or blank canvas.
  const edgesCacheRef = useRef<{ src: string; bitmap: HTMLImageElement } | null>(null);
  const [edgesState, setEdgesState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }
  >({ status: 'idle' });
  const [edgesRetryTick, setEdgesRetryTick] = useState(0);

  // Load and fit image automatically
  useEffect(() => {
    if (!project.imageSrc) {
      setLoadedImage(null);
      return;
    }

    let isMounted = true;
    const img = new Image();
    if (project.imageSrc.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = project.imageSrc;

    img.onload = () => {
      if (!isMounted) return;
      const naturalW = img.naturalWidth || 800;
      const naturalH = img.naturalHeight || 1000;

      setLoadedImage(img);
      onImageLoaded?.(img);

      // Update project dimensions and re-center Loomis / Reilly guides to match image
      onUpdateProject(prev => ({
        ...prev,
        imageWidth: naturalW,
        imageHeight: naturalH,
        methods: {
          ...prev.methods,
          loomis: {
            center: { x: Math.round(naturalW * 0.5), y: Math.round(naturalH * 0.42) },
            radius: Math.round(Math.min(naturalW, naturalH) * 0.28),
            browLineY: Math.round(naturalH * 0.42),
            noseLineY: Math.round(naturalH * 0.55),
            chinY: Math.round(naturalH * 0.68),
            jawWidth: Math.round(Math.min(naturalW, naturalH) * 0.25),
            tiltAngle: 0,
          },
          reilly: {
            browCenter: { x: Math.round(naturalW * 0.5), y: Math.round(naturalH * 0.41) },
            noseTip: { x: Math.round(naturalW * 0.5), y: Math.round(naturalH * 0.55) },
            mouthCenter: { x: Math.round(naturalW * 0.5), y: Math.round(naturalH * 0.62) },
            chinBottom: { x: Math.round(naturalW * 0.5), y: Math.round(naturalH * 0.68) },
            leftEye: { x: Math.round(naturalW * 0.4), y: Math.round(naturalH * 0.43) },
            rightEye: { x: Math.round(naturalW * 0.6), y: Math.round(naturalH * 0.43) },
            leftJaw: { x: Math.round(naturalW * 0.32), y: Math.round(naturalH * 0.58) },
            rightJaw: { x: Math.round(naturalW * 0.68), y: Math.round(naturalH * 0.58) },
            leftTemple: { x: Math.round(naturalW * 0.3), y: Math.round(naturalH * 0.35) },
            rightTemple: { x: Math.round(naturalW * 0.7), y: Math.round(naturalH * 0.35) },
          },
          bargue: {
            ...prev.methods.bargue,
            points: [
              { id: 'p1', x: Math.round(naturalW * 0.5), y: Math.round(naturalH * 0.18) },
              { id: 'p2', x: Math.round(naturalW * 0.75), y: Math.round(naturalH * 0.35) },
              { id: 'p3', x: Math.round(naturalW * 0.72), y: Math.round(naturalH * 0.62) },
              { id: 'p4', x: Math.round(naturalW * 0.58), y: Math.round(naturalH * 0.72) },
              { id: 'p5', x: Math.round(naturalW * 0.42), y: Math.round(naturalH * 0.72) },
              { id: 'p6', x: Math.round(naturalW * 0.28), y: Math.round(naturalH * 0.62) },
              { id: 'p7', x: Math.round(naturalW * 0.25), y: Math.round(naturalH * 0.35) },
            ],
            plumbLines: [{ x: Math.round(naturalW * 0.4) }, { x: Math.round(naturalW * 0.5) }, { x: Math.round(naturalW * 0.6) }],
            levelBars: [{ y: Math.round(naturalH * 0.43) }, { y: Math.round(naturalH * 0.55) }, { y: Math.round(naturalH * 0.62) }, { y: Math.round(naturalH * 0.68) }],
          }
        }
      }));

      // Calculate initial auto-fit zoom
      if (containerRef.current) {
        const cW = containerRef.current.clientWidth || 800;
        const cH = containerRef.current.clientHeight || 700;
        const autoFit = Math.min((cW * 0.82) / naturalW, (cH * 0.82) / naturalH, 1.2);
        setScale(autoFit);
        setPan({ x: 0, y: 0 });
      }
    };

    return () => {
      isMounted = false;
    };
  }, [project.imageSrc]);

  // Working resolution for the canvas backing store (ADR-0004). The wrapper below
  // stays shrink-0 so its box remains the Reference Image's coordinate space; as a
  // flex item it would otherwise collapse and pull the canvas off the overlays.
  const renderSize = useMemo(
    () => capRenderSize(project.imageWidth || 600, project.imageHeight || 800),
    [project.imageWidth, project.imageHeight],
  );

  const layers = useMemo(
    () => buildValueLayers(project.layerMeta, project.cutPoints),
    [project.layerMeta, project.cutPoints],
  );

  // Re-render canvas shader (edges view is handled separately below — it's
  // backend-rendered, not a client-side pixel shader)
  const renderScene = useCallback(() => {
    const canvas = canvasRef.current;
    const img = loadedImage;
    const { viewMode } = project;
    if (!canvas || !img || viewMode === 'edges') return;

    if (canvas.width !== renderSize.width || canvas.height !== renderSize.height) {
      canvas.width = renderSize.width;
      canvas.height = renderSize.height;
    }

    const splitRatio = viewMode === 'split' ? project.splitPosition / 100 : undefined;
    renderValueStudyOnCanvas(
      img,
      canvas,
      layers,
      viewMode === 'split' ? 'valueStudy' : viewMode,
      splitRatio,
      project.isolation,
      project.ghostOpacity,
      project.valueFamilyFloors,
      project.blurRadius
    );
  }, [loadedImage, renderSize, layers, project.viewMode, project.splitPosition, project.isolation, project.ghostOpacity, project.valueFamilyFloors, project.blurRadius]);

  useEffect(() => {
    renderScene();
  }, [renderScene]);

  // Edges view: post the display-capped Reference Image to the backend contour
  // extractor and paint the result. Cached per image so re-entering the view or
  // touching unrelated project state (layers, isolation, ...) doesn't re-fetch.
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = loadedImage;
    if (project.viewMode !== 'edges' || !canvas || !img || !project.imageSrc) return;

    if (canvas.width !== renderSize.width || canvas.height !== renderSize.height) {
      canvas.width = renderSize.width;
      canvas.height = renderSize.height;
    }

    const drawBitmap = (bitmap: HTMLImageElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (project.blurRadius > 0) {
        ctx.save();
        ctx.filter = `blur(${project.blurRadius}px)`;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      }
    };

    const cached = edgesCacheRef.current;
    if (cached && cached.src === project.imageSrc) {
      setEdgesState({ status: 'idle' });
      drawBitmap(cached.bitmap);
      return;
    }

    let cancelled = false;
    setEdgesState({ status: 'loading' });
    // Clear rather than leave the previous view's pixels sitting under the loading overlay.
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);

    fetchEdgeContours(img, renderSize)
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        const bitmap = new Image();
        bitmap.onload = () => {
          URL.revokeObjectURL(objectUrl);
          if (cancelled) return;
          edgesCacheRef.current = { src: project.imageSrc as string, bitmap };
          setEdgesState({ status: 'idle' });
          drawBitmap(bitmap);
        };
        bitmap.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          if (cancelled) return;
          setEdgesState({ status: 'error', message: 'Received an unreadable contour image' });
        };
        bitmap.src = objectUrl;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setEdgesState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to extract contours',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [project.viewMode, project.imageSrc, loadedImage, renderSize, edgesRetryTick, project.blurRadius]);

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onLoadImageFile(file);
    }
  };

  // Clipboard Paste (Ctrl+V) listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            onLoadImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onLoadImageFile]);

  // Toggle flip horizontal view state (#45)
  const handleToggleFlipHorizontal = useCallback(() => {
    onUpdateProject(toggleFlipHorizontal);
  }, [onUpdateProject]);

  // Toggle Edge Quality Map mode (#47)
  const handleToggleEdgeQuality = useCallback(() => {
    onUpdateProject((prev) => ({
      ...prev,
      edgeQuality: toggleEdgeQualityEnabled(prev.edgeQuality || createInitialEdgeQualityState()),
    }));
  }, [onUpdateProject]);

  const [isLoadingEdgeSuggestions, setIsLoadingEdgeSuggestions] = useState(false);

  const handleSuggestEdges = useCallback(async () => {
    if (!loadedImage || !project.imageSrc) return;
    setIsLoadingEdgeSuggestions(true);
    try {
      let suggested: EdgeQualitySegment[];
      try {
        const raw = await fetchSuggestedEdges(loadedImage, renderSize);
        suggested = scaleEdgeSegmentsToImageSpace(raw, renderSize).map((s) => ({
          ...s,
          source: 'detected' as const,
        }));
      } catch {
        suggested = generateFallbackEdgeSegments(
          project.imageWidth || 600,
          project.imageHeight || 800,
          project.landmarks?.status === 'ready' ? project.landmarks.data : undefined
        );
      }

      onUpdateProject((prev) => {
        const currentEq = prev.edgeQuality || createInitialEdgeQualityState();
        return {
          ...prev,
          edgeQuality: {
            ...currentEq,
            segments: [...currentEq.segments, ...suggested],
            selectedSegmentId: suggested[0]?.id || null,
          },
        };
      });
    } finally {
      setIsLoadingEdgeSuggestions(false);
    }
  }, [
    loadedImage,
    project.imageSrc,
    project.imageWidth,
    project.imageHeight,
    project.landmarks,
    renderSize,
    onUpdateProject,
  ]);

  // Keyboard shortcuts: 'h' for flip horizontal, 'e' for edge quality map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      if (e.key === 'h' || e.key === 'H') {
        if (!project.imageSrc) return;
        e.preventDefault();
        handleToggleFlipHorizontal();
      } else if (e.key === 'e' || e.key === 'E') {
        if (!project.imageSrc) return;
        e.preventDefault();
        handleToggleEdgeQuality();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project.imageSrc, handleToggleFlipHorizontal, handleToggleEdgeQuality]);

  // Zoom with Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setScale(prev => Math.min(8, Math.max(0.08, prev * zoomFactor)));
  };

  // Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.altKey || e.shiftKey || e.metaKey || (e.target as HTMLElement).tagName === 'CANVAS')) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    } else if (isDraggingSplit && containerRef.current && project.imageWidth > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      const pct = mapPointerToNativeX(e.clientX, rect, 100, Boolean(project.isFlippedHorizontal));
      onUpdateProject(prev => ({ ...prev, splitPosition: pct }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingSplit(false);
  };

  // Reset Zoom to Fit
  const handleResetFit = () => {
    if (!containerRef.current || !project.imageWidth) return;
    const cW = containerRef.current.clientWidth;
    const cH = containerRef.current.clientHeight;
    const fitScale = Math.min((cW * 0.85) / project.imageWidth, (cH * 0.85) / project.imageHeight, 1.2);
    setScale(fitScale);
    setPan({ x: 0, y: 0 });
  };

  // Background style helper
  const getBgStyle = () => {
    switch (bgTheme) {
      case 'neutral': return 'bg-[#2b2f38]';
      case 'toned': return 'bg-[#29221b]';
      case 'white': return 'bg-[#f4f4f5]';
      default: return 'bg-[#070a11]';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 h-full overflow-hidden select-none flex items-center justify-center transition-colors duration-200 ${getBgStyle()}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Highlight Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-studio-accent/20 border-4 border-dashed border-studio-accent flex flex-col items-center justify-center gap-3">
          <Upload className="w-16 h-16 text-studio-accent" />
          <span className="text-xl font-black text-white tracking-wide">
            Drop Reference Image Here
          </span>
          <span className="text-studio-accent/90">Instant Tonal Separation & Scale Calibration</span>
        </div>
      )}

      {/* Floating Canvas Toolbar: zoom, Fit, True Size, and the View menu only (#39) */}
      {project.imageSrc && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-studio-900 border border-studio-800 px-3 py-1.5 rounded-xl text-xs">
          <button
            onClick={() => setScale(s => Math.min(8, s * 1.2))}
            className="p-1.5 hover:bg-studio-800 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="font-mono text-studio-accent font-bold min-w-[45px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.max(0.08, s / 1.2))}
            className="p-1.5 hover:bg-studio-800 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-studio-800 mx-1" />

          <button
            onClick={handleResetFit}
            className="px-2.5 py-1 hover:bg-studio-800 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
            title="Fit to Viewport"
          >
            <Maximize className="w-3.5 h-3.5 text-studio-accent" />
            <span>Fit</span>
          </button>

          <button
            onClick={() => {
              const trueScale = computeTrueSizeScale(
                project.paperMapping,
                project.calibration.screenDpi,
                project.imageWidth,
                project.imageHeight,
              );
              if (trueScale === null) return;
              setScale(trueScale);
              setPan({ x: 0, y: 0 });
            }}
            disabled={!project.calibration.isCalibrated || !project.paperMapping.isDeclared}
            className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              project.calibration.isCalibrated && project.paperMapping.isDeclared
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-studio-800 text-slate-300'
            }`}
            title={
              project.calibration.isCalibrated && project.paperMapping.isDeclared
                ? 'Render the Reference Image at true physical size on this screen'
                : 'Requires Physical Caliper calibration and a declared Paper Mapping'
            }
          >
            True Size
          </button>

          <div className="w-px h-4 bg-studio-800 mx-1" />

          {/* Squint blur slider to simplify the Reference Image into big masses */}
          <div className="flex items-center gap-1.5 pl-0.5" title="Squint: Gaussian blur slider to simplify the Reference Image into big tonal masses">
            <span className="text-slate-400 font-medium text-[11px]">Squint</span>
            <input
              type="range"
              min={MIN_BLUR_RADIUS}
              max={MAX_BLUR_RADIUS}
              step="1"
              value={project.blurRadius}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateProject((prev) => ({ ...prev, blurRadius: clampBlurRadius(val) }));
              }}
              className="w-16 lg:w-20 h-1.5 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-studio-accent"
              aria-label="Squint blur radius"
            />
            <span className="font-mono text-[11px] text-studio-accent min-w-[28px] text-right">
              {formatBlurRadius(project.blurRadius)}
            </span>
          </div>

          <div className="w-px h-4 bg-studio-800 mx-1" />

          {/* Flip horizontal button to mirror reference image (#45) */}
          <button
            onClick={handleToggleFlipHorizontal}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
              project.isFlippedHorizontal
                ? 'bg-studio-accent text-slate-950 font-bold shadow-sm'
                : 'hover:bg-studio-800 text-slate-300 hover:text-white'
            }`}
            title="Flip horizontal to catch symmetry and tilt errors (H)"
            aria-label="Flip horizontal"
            aria-pressed={Boolean(project.isFlippedHorizontal)}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Flip</span>
          </button>

          <div className="w-px h-4 bg-studio-800 mx-1" />

          {/* Edge Quality Map toggle button (#47) */}
          <button
            onClick={handleToggleEdgeQuality}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
              project.edgeQuality?.enabled
                ? 'bg-rose-500 text-white font-bold shadow-sm'
                : 'hover:bg-studio-800 text-slate-300 hover:text-white'
            }`}
            title="Edge quality map: classify hard, soft, and lost edges (E)"
            aria-label="Edge quality map"
            aria-pressed={Boolean(project.edgeQuality?.enabled)}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Edges</span>
          </button>

          <div className="w-px h-4 bg-studio-800 mx-1" />

          {/* Gesture study timer and study log button (#46) */}
          <button
            onClick={onOpenStudyLog}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
              gestureState && (gestureState.status === 'running' || gestureState.status === 'paused')
                ? 'bg-studio-accent/20 text-studio-accent border border-studio-accent/40 font-bold'
                : 'hover:bg-studio-800 text-slate-300 hover:text-white'
            }`}
            title="Timed gesture study sessions and study log"
            aria-label="Gesture study"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Gesture</span>
          </button>

          <div className="w-px h-4 bg-studio-800 mx-1" />

          {/* View menu: render mode, split-compare, and background color live here (#39) */}
          <div className="relative">
            <button
              onClick={() => setIsViewMenuOpen((v) => !v)}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 font-semibold ${
                isViewMenuOpen ? 'bg-studio-800 text-white' : 'hover:bg-studio-800 text-slate-300'
              }`}
              title="View options"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </button>

            {isViewMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsViewMenuOpen(false)} />
                <div className="absolute top-full left-0 mt-1.5 z-40 w-56 bg-studio-900 border border-studio-800 rounded-xl p-2 flex flex-col gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="px-1.5 text-slate-500 font-semibold uppercase tracking-wide">Render Mode</span>
                    {RENDER_MODES.map((rm) => (
                      <button
                        key={rm.mode}
                        onClick={() => {
                          onUpdateProject((prev) => ({ ...prev, viewMode: rm.mode }));
                          setIsViewMenuOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg flex items-center gap-2 font-medium ${
                          project.viewMode === rm.mode
                            ? 'bg-studio-accent text-slate-950 font-bold'
                            : 'text-slate-300 hover:bg-studio-850'
                        }`}
                      >
                        {rm.icon}
                        <span className="flex-1 text-left">{rm.label}</span>
                        {project.viewMode === rm.mode && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>

                  <div className="h-px bg-studio-800" />

                  <div className="flex flex-col gap-1 px-1.5">
                    <span className="text-slate-500 font-semibold uppercase tracking-wide">Background</span>
                    <div className="flex items-center gap-1.5">
                      {BG_THEMES.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setBgTheme(b.id)}
                          className={`w-5 h-5 rounded-full border transition-transform ${
                            bgTheme === b.id ? 'border-studio-accent scale-110' : 'border-studio-700'
                          }`}
                          style={{ backgroundColor: b.color }}
                          title={b.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Gesture Study Timer Bar (#46) */}
      {gestureState && (
        <GestureTimerBar
          session={gestureState}
          onPause={onPauseGesture || (() => {})}
          onResume={onResumeGesture || (() => {})}
          onCancel={onCancelGesture || (() => {})}
        />
      )}

      {/* Gesture study completed overlay (#46) - rendered at viewport level so pan/zoom does not distort it */}
      {gestureState && gestureState.status === 'completed' && (
        <GestureCompleteOverlay
          session={gestureState}
          onToggleReferenceHidden={onToggleReferenceHidden || (() => {})}
          onStartSession={onStartGestureSession || (() => {})}
          onOpenStudyLog={onOpenStudyLog || (() => {})}
          onSaveNote={onSaveGestureNote || (() => {})}
          onDismiss={onDismissGestureOverlay}
        />
      )}

      {/* Floating Edge Quality Toolbar (#47) */}
      {Boolean(project.imageSrc) && project.edgeQuality?.enabled && (
        <EdgeQualityToolbar
          state={project.edgeQuality}
          onChange={(newEq) => onUpdateProject((prev) => ({ ...prev, edgeQuality: newEq }))}
          onSuggestEdges={handleSuggestEdges}
          isLoadingSuggestions={isLoadingEdgeSuggestions}
          onClose={handleToggleEdgeQuality}
        />
      )}

      {/* Main Drawing Canvas when Image is Loaded */}
      {project.imageSrc ? (
        <div
          className="relative shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-transform duration-75 origin-center rounded-lg overflow-hidden ring-1 ring-studio-800/80"
          style={{
            transform: computeCanvasTransform(pan, scale, Boolean(project.isFlippedHorizontal)),
            width: project.imageWidth || 600,
            height: project.imageHeight || 800,
          }}
        >
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 block rounded w-full h-full ${
              gestureState?.isReferenceHidden ? 'invisible pointer-events-none' : ''
            }`}
            width={renderSize.width}
            height={renderSize.height}
          />

          {/* Overlays are hidden when reference image is hidden */}
          {!gestureState?.isReferenceHidden && (
            <>
              {/* Edges View: Loading / Error States - counter-mirrored so status text and retry button remain upright */}
              {project.viewMode === 'edges' && edgesState.status === 'loading' && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-studio-950/60 backdrop-blur-sm"
                  style={project.isFlippedHorizontal ? { transform: 'scaleX(-1)' } : undefined}
                >
                  <Loader2 className="w-8 h-8 text-studio-accent animate-spin" />
                  <span className="text-xs font-semibold text-slate-200">Extracting contours…</span>
                </div>
              )}
              {project.viewMode === 'edges' && edgesState.status === 'error' && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-studio-950/85 backdrop-blur-sm px-6 text-center"
                  style={project.isFlippedHorizontal ? { transform: 'scaleX(-1)' } : undefined}
                >
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                  <span className="text-sm font-bold text-slate-100">Couldn&apos;t extract contours</span>
                  <span className="text-xs text-slate-400 max-w-xs">{edgesState.message}</span>
                  <button
                    onClick={() => setEdgesRetryTick((t) => t + 1)}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-accent text-slate-950 text-xs font-bold hover:brightness-110 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              )}

              {/* Split Screen Slider Bar */}
              {project.viewMode === 'split' && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-studio-accent cursor-ew-resize z-10"
                  style={{ left: `${project.splitPosition}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingSplit(true);
                  }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-studio-accent text-slate-950 flex items-center justify-center text-xs font-black border-2 border-white">
                    ↔
                  </div>
                </div>
              )}

              <GridOverlay
                width={project.imageWidth || 600}
                height={project.imageHeight || 800}
                grid={project.grid}
                paperMapping={project.paperMapping}
                isDimmed={project.isolation.kind !== 'none'}
                isFlippedHorizontal={Boolean(project.isFlippedHorizontal)}
              />

              <MethodOverlays
                width={project.imageWidth || 600}
                height={project.imageHeight || 800}
                methodState={project.methods}
                onChange={(methods) => onUpdateProject(prev => ({ ...prev, methods }))}
                isDimmed={project.isolation.kind !== 'none'}
                isFlippedHorizontal={Boolean(project.isFlippedHorizontal)}
              />

              <CaliperOverlay
                width={project.imageWidth || 600}
                height={project.imageHeight || 800}
                measurements={project.methods.triangulation.measurements}
                baseUnitDistance={project.methods.triangulation.baseUnitDistance}
                calibration={project.calibration}
                active={project.methods.activeMethod === 'triangulation'}
                isFlippedHorizontal={Boolean(project.isFlippedHorizontal)}
                onChange={(measurements, baseUnit) =>
                  onUpdateProject(prev => ({
                    ...prev,
                    methods: {
                      ...prev.methods,
                      triangulation: { measurements, baseUnitDistance: baseUnit },
                    },
                  }))
                }
              />

              <EdgeQualityOverlay
                width={project.imageWidth || 600}
                height={project.imageHeight || 800}
                state={project.edgeQuality || createInitialEdgeQualityState()}
                onChange={(edgeQuality) => onUpdateProject(prev => ({ ...prev, edgeQuality }))}
                isDimmed={project.isolation.kind !== 'none'}
                isFlippedHorizontal={Boolean(project.isFlippedHorizontal)}
              />
            </>
          )}
        </div>
      ) : (
        /* Empty State Hero & Drag Drop Uploader */
        <div className="flex flex-col items-center max-w-2xl px-6 py-10 z-10 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-3xl bg-studio-accent/15 border border-studio-accent/40 flex items-center justify-center mb-6">
            <Upload className="w-8 h-8 text-studio-accent" />
          </div>

          <h2 className="text-2xl lg:text-3xl font-black text-slate-100 tracking-tight mb-2">
            Upload Your Reference Photo
          </h2>
          <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
            Drag & drop any image here, paste from clipboard (<kbd className="px-1.5 py-0.5 rounded bg-studio-850 border border-studio-700 font-mono text-xs text-studio-accent">Ctrl+V</kbd>), or select one of the classical study references below.
          </p>

          {/* Upload CTA Card */}
          <label className="cursor-pointer group relative flex items-center gap-3 px-8 py-4 rounded-2xl bg-studio-accent text-slate-950 font-black text-sm hover:brightness-110 transition-all mb-10">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onLoadImageFile(f);
                  e.target.value = '';
                }
              }}
            />
            <Upload className="w-5 h-5 text-slate-950" />
            <span>Select Image File from Device</span>
          </label>

          {/* Quick Demo Portraits Grid */}
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center gap-2 justify-center text-xs text-slate-400 font-medium">
              <Sparkles className="w-4 h-4 text-studio-gold" />
              <span>Or begin with a classical atelier reference model:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SAMPLE_PORTRAITS.map((sample) => (
                <button
                  key={sample.title}
                  onClick={() => onLoadSampleImage(sample.url, sample.title)}
                  className="group relative rounded-2xl overflow-hidden border border-studio-800 bg-studio-900/80 hover:border-studio-accent/60 hover:shadow-xl transition-all flex flex-col text-left p-2.5 gap-2"
                >
                  <div className="w-full h-24 rounded-xl overflow-hidden bg-studio-950 relative">
                    <img
                      src={sample.url}
                      alt={sample.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 text-xs line-clamp-1 group-hover:text-studio-accent transition-colors">
                      {sample.title}
                    </span>
                    <span className="text-xs font-mono text-studio-gold block">
                      {sample.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
