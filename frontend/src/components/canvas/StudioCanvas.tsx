'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ProjectState } from '../../types/studio';
import { renderValueStudyOnCanvas } from '../../utils/canvasShaders';
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
  Ruler,
  Compass,
} from 'lucide-react';

interface StudioCanvasProps {
  project: ProjectState;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
  onLoadImageFile: (file: File) => void;
  onLoadSampleImage: (url: string, title: string) => void;
}

const SAMPLE_PORTRAITS = [
  {
    title: 'Classical Atelier Portrait',
    category: 'High Dynamic Range',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'Dramatic Rembrandt Lighting',
    category: 'Core Shadow Study',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'Greek Classical Sculpture',
    category: 'Asaro Planes / Facets',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=85',
  },
  {
    title: 'Side Profile Structure',
    category: 'Loomis Thirds & Ear Box',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
  },
];

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  project,
  onUpdateProject,
  onLoadImageFile,
  onLoadSampleImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [bgTheme, setBgTheme] = useState<'obsidian' | 'neutral' | 'toned' | 'white'>('obsidian');

  // Load and fit image automatically
  useEffect(() => {
    if (!project.imageSrc) {
      imgRef.current = null;
      return;
    }

    const img = new Image();
    if (project.imageSrc.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = project.imageSrc;

    img.onload = () => {
      imgRef.current = img;
      const naturalW = img.naturalWidth || 600;
      const naturalH = img.naturalHeight || 800;

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

      renderScene();
    };
  }, [project.imageSrc]);

  // Re-render canvas shader
  const renderScene = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    const splitRatio = project.viewMode === 'split' ? project.splitPosition / 100 : undefined;
    renderValueStudyOnCanvas(
      img,
      canvas,
      project.layers,
      project.viewMode === 'split' ? 'valueStudy' : project.viewMode,
      splitRatio
    );
  }, [project.layers, project.viewMode, project.splitPosition]);

  useEffect(() => {
    renderScene();
  }, [renderScene]);

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
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
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
      {/* Drag & Drop Highlight Glow Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-studio-accent/20 border-4 border-dashed border-studio-accent backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-pulse">
          <Upload className="w-16 h-16 text-studio-accent drop-shadow-lg" />
          <span className="text-xl font-black text-white tracking-wide">
            Drop Reference Image Here
          </span>
          <span className="text-xs text-studio-accent/90">Instant Tonal Separation & Scale Calibration</span>
        </div>
      )}

      {/* Floating Canvas Top Bar Controls */}
      {project.imageSrc && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-studio-900/90 backdrop-blur-xl border border-studio-800/90 px-3 py-1.5 rounded-2xl shadow-2xl text-xs">
          <button
            onClick={() => setScale(s => Math.min(8, s * 1.2))}
            className="p-1.5 hover:bg-studio-800 rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="font-mono text-studio-accent font-bold min-w-[45px] text-center text-[11px]">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.max(0.08, s / 1.2))}
            className="p-1.5 hover:bg-studio-800 rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-studio-800 mx-1" />

          <button
            onClick={handleResetFit}
            className="px-2.5 py-1 hover:bg-studio-800 rounded-xl text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
            title="Fit to Viewport"
          >
            <Maximize className="w-3.5 h-3.5 text-studio-accent" />
            <span>Fit</span>
          </button>

          <button
            onClick={() => {
              setScale(1.0);
              setPan({ x: 0, y: 0 });
            }}
            className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold transition-all ${
              project.calibration.isCalibrated
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-studio-800 text-slate-300 hover:bg-studio-750'
            }`}
            title="1:1 Real-World Physical Scale (Calibrated)"
          >
            1:1 Scale
          </button>

          <div className="w-[1px] h-4 bg-studio-800 mx-1" />

          <button
            onClick={() =>
              onUpdateProject(prev => ({
                ...prev,
                viewMode: prev.viewMode === 'split' ? 'valueStudy' : 'split',
              }))
            }
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 font-semibold ${
              project.viewMode === 'split'
                ? 'bg-studio-accent text-slate-950 shadow-md font-bold'
                : 'hover:bg-studio-800 text-slate-300'
            }`}
            title="Split-Screen Comparison Slider"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>

          <div className="w-[1px] h-4 bg-studio-800 mx-1" />

          {/* Canvas Background Theme Selector */}
          <div className="flex items-center gap-1">
            {[
              { id: 'obsidian', color: '#070a11', title: 'Obsidian Black' },
              { id: 'neutral', color: '#2b2f38', title: '18% Neutral Grey' },
              { id: 'toned', color: '#29221b', title: 'Toned Charcoal Paper' },
              { id: 'white', color: '#f4f4f5', title: 'Drafting Light' },
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setBgTheme(b.id as any)}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  bgTheme === b.id ? 'border-studio-accent scale-125 shadow-md' : 'border-studio-700'
                }`}
                style={{ backgroundColor: b.color }}
                title={b.title}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Drawing Canvas when Image is Loaded */}
      {project.imageSrc ? (
        <div
          className="relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-transform duration-75 origin-center rounded-lg overflow-hidden border border-studio-800/80"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: project.imageWidth || 600,
            height: project.imageHeight || 800,
          }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block rounded"
            width={project.imageWidth || 600}
            height={project.imageHeight || 800}
          />

          {/* Split Screen Slider Bar */}
          {project.viewMode === 'split' && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-studio-accent cursor-ew-resize z-10 shadow-[0_0_15px_rgba(56,189,248,0.9)]"
              style={{ left: `${project.splitPosition}%` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDraggingSplit(true);
              }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-studio-accent text-slate-950 flex items-center justify-center text-xs font-black shadow-2xl border-2 border-white">
                ↔
              </div>
            </div>
          )}

          <GridOverlay
            width={project.imageWidth || 600}
            height={project.imageHeight || 800}
            grid={project.grid}
            calibration={project.calibration}
          />

          <MethodOverlays
            width={project.imageWidth || 600}
            height={project.imageHeight || 800}
            methodState={project.methods}
            onChange={(methods) => onUpdateProject(prev => ({ ...prev, methods }))}
          />

          <CaliperOverlay
            width={project.imageWidth || 600}
            height={project.imageHeight || 800}
            measurements={project.methods.triangulation.measurements}
            baseUnitDistance={project.methods.triangulation.baseUnitDistance}
            calibration={project.calibration}
            active={project.methods.activeMethod === 'triangulation'}
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
        </div>
      ) : (
        /* Empty State Hero & Drag Drop Uploader */
        <div className="flex flex-col items-center max-w-2xl px-6 py-10 z-10 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-studio-accent/20 via-studio-gold/20 to-indigo-500/20 border border-studio-accent/40 flex items-center justify-center shadow-2xl shadow-studio-accent/10 mb-6 animate-pulse">
            <Upload className="w-8 h-8 text-studio-accent" />
          </div>

          <h2 className="text-2xl lg:text-3xl font-black text-slate-100 tracking-tight mb-2">
            Upload Your Reference Photo
          </h2>
          <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
            Drag & drop any image here, paste from clipboard (<kbd className="px-1.5 py-0.5 rounded bg-studio-850 border border-studio-700 font-mono text-xs text-studio-accent">Ctrl+V</kbd>), or select one of the classical study references below.
          </p>

          {/* Upload CTA Card */}
          <label className="cursor-pointer group relative flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-studio-accent to-indigo-500 text-slate-950 font-black text-sm shadow-xl shadow-studio-accent/25 hover:shadow-studio-accent/40 hover:scale-[1.02] transition-all mb-10">
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
                    <span className="text-[10px] font-mono text-studio-gold block">
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
