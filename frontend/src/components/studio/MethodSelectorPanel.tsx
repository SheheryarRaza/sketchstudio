'use client';

import React from 'react';
import type { DrawingMethodState, DrawingMethodType, LandmarkAnalysisState } from '../../types/studio';
import { DRAWING_METHODS_DATABASE } from '../../types/methods';
import { BookOpen, Move, GraduationCap, ScanFace, AlertTriangle, Sun, Compass, Eye, EyeOff, Sparkles } from 'lucide-react';
import {
  directionLabelFromAngle,
  declaredSourceLabel,
  setLightAngle,
  toggleTerminator,
} from '../../utils/lightDirection';

interface MethodSelectorPanelProps {
  methods: DrawingMethodState;
  landmarks: LandmarkAnalysisState;
  onChange: (updated: Partial<DrawingMethodState>) => void;
  onOpenTeachingMode: (methodType: DrawingMethodType) => void;
  onRetryLandmarks: () => void;
  onEstimateLightDirection?: () => void;
  isEstimatingLight?: boolean;
}

const METHODS_LIST: Array<{ type: DrawingMethodType; name: string; creator: string; badge: string }> = [
  { type: 'none', name: 'Freehand Mode', creator: 'Direct Observation', badge: 'Unobstructed' },
  { type: 'loomis', name: 'Loomis Method', creator: 'Andrew Loomis', badge: '3D Sphere & Thirds' },
  { type: 'reilly', name: 'Reilly Abstraction', creator: 'Frank J. Reilly', badge: 'Harmonic Rhythms' },
  { type: 'bargue', name: 'Bargue Block-In', creator: 'French Académie', badge: 'Sight-Size Plumb' },
  { type: 'asaro', name: 'Asaro Head Planes', creator: 'John Asaro', badge: 'Facets & Lighting' },
  { type: 'triangulation', name: 'Triangulation & Caliper', creator: 'Atelier Academies', badge: 'Ratio Calipers' },
  { type: 'harmonic', name: 'Harmonic Armature', creator: 'Jay Hambidge', badge: 'Dynamic Symmetry' },
];

export const MethodSelectorPanel: React.FC<MethodSelectorPanelProps> = ({
  methods,
  landmarks,
  onChange,
  onOpenTeachingMode,
  onRetryLandmarks,
  onEstimateLightDirection,
  isEstimatingLight = false,
}) => {
  const activeMethodInfo = DRAWING_METHODS_DATABASE[methods.activeMethod];
  const usesLandmarkAutoSnap = methods.activeMethod === 'loomis' || methods.activeMethod === 'reilly';

  return (
    <div className="flex flex-col gap-4 p-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
          <GraduationCap className="w-4 h-4 text-studio-accent" />
          <span>Classical Drawing Methods</span>
        </div>
        <button
          onClick={() => onOpenTeachingMode(methods.activeMethod)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-studio-accent/20 text-studio-accent border border-studio-accent/40 hover:bg-studio-accent/30 transition-all shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Teaching Academy</span>
        </button>
      </div>

      {methods.activeMethod !== 'none' && (
        <div className="bg-studio-900 border border-studio-800 p-3 rounded-xl flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-100 text-sm">{activeMethodInfo.title}</span>
              <div className="text-xs text-slate-400">{activeMethodInfo.creator} • {activeMethodInfo.era}</div>
            </div>
            <button
              onClick={() => onChange({ showAnchorPoints: !methods.showAnchorPoints })}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
                methods.showAnchorPoints
                  ? 'bg-studio-accent/20 text-studio-accent border-studio-accent/40'
                  : 'bg-studio-800 text-slate-400 border-studio-700'
              }`}
              title="Toggle Draggable Anchor Points"
            >
              <Move className="w-3.5 h-3.5" />
              <span>{methods.showAnchorPoints ? 'Anchors Visible' : 'Anchors Hidden'}</span>
            </button>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            {activeMethodInfo.shortSummary}
          </p>
        </div>
      )}

      {usesLandmarkAutoSnap && landmarks.status !== 'idle' && (
        <div className="bg-studio-900 border border-studio-800 p-2.5 rounded-xl flex items-center justify-between gap-2">
          {landmarks.status === 'loading' && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <ScanFace className="w-3.5 h-3.5 animate-pulse" />
              Landmark Auto-Snap scanning for a face…
            </span>
          )}
          {landmarks.status === 'ready' && landmarks.data.source === 'detected' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <ScanFace className="w-3.5 h-3.5" />
              Anchors seeded from the detected face
            </span>
          )}
          {landmarks.status === 'ready' && landmarks.data.source === 'fallback' && (
            <span className="flex items-center gap-1.5 text-xs text-studio-gold">
              <AlertTriangle className="w-3.5 h-3.5" />
              No face detected — anchors are a proportional starting point
            </span>
          )}
          {landmarks.status === 'error' && (
            <>
              <span className="flex items-center gap-1.5 text-xs text-red-400 truncate">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{landmarks.message}</span>
              </span>
              <button
                onClick={onRetryLandmarks}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-studio-800 text-slate-200 hover:bg-studio-850 border border-studio-700 shrink-0"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {methods.activeMethod === 'asaro' && (
        <div className="bg-studio-900 border border-studio-800 p-3 rounded-xl flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-200 text-xs">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Direction & Terminator</span>
            </div>
            <button
              onClick={() => {
                onChange({
                  asaro: toggleTerminator(methods.asaro),
                });
              }}
              className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                methods.asaro.showTerminator
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-studio-800 text-slate-400 border-studio-700'
              }`}
              title="Toggle Terminator (Core Shadow Boundary)"
            >
              {methods.asaro.showTerminator ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{methods.asaro.showTerminator ? 'Terminator Visible' : 'Terminator Hidden'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-studio-950 border border-studio-800/80">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400">Source:</span>
              <span
                className={`font-medium ${
                  methods.asaro.terminatorSource === 'estimated'
                    ? 'text-emerald-400'
                    : methods.asaro.terminatorSource === 'manual'
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {declaredSourceLabel(methods.asaro.terminatorSource)}
              </span>
            </div>
            {onEstimateLightDirection && (
              <button
                onClick={onEstimateLightDirection}
                disabled={isEstimatingLight}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-studio-accent/20 text-studio-accent border border-studio-accent/40 hover:bg-studio-accent/30 disabled:opacity-50 transition-all"
                title="Estimate light direction from luminance histogram and shadow shape"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isEstimatingLight ? 'Estimating…' : 'Estimate from Photo'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Light Direction Angle</span>
              <span className="font-mono text-studio-accent font-semibold">
                {directionLabelFromAngle(methods.asaro.lightAngleDeg)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              step="5"
              value={methods.asaro.lightAngleDeg}
              onChange={(e) => {
                const angle = parseInt(e.target.value, 10);
                onChange({
                  asaro: setLightAngle(methods.asaro, angle, 800, 1000, 'manual'),
                });
              }}
              className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer accent-studio-accent"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0° (R)</span>
              <span>90° (Top)</span>
              <span>135° (TL)</span>
              <span>180° (L)</span>
              <span>270° (B)</span>
              <span>355°</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1 border-t border-studio-800">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Planar Facets Opacity</span>
              <span className="font-mono text-slate-400">{Math.round(methods.asaro.planesOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={methods.asaro.planesOpacity}
              onChange={(e) =>
                onChange({
                  asaro: { ...methods.asaro, planesOpacity: parseFloat(e.target.value) },
                })
              }
              className="w-full h-1 bg-studio-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Select Active Method Overlay
        </span>
        <div className="flex flex-col gap-1.5">
          {METHODS_LIST.map((m) => {
            const isSelected = methods.activeMethod === m.type;

            return (
              <div
                key={m.type}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-studio-850 border-studio-accent shadow-md ring-1 ring-studio-accent/30'
                    : 'bg-studio-900 border-studio-800 hover:bg-studio-850'
                }`}
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onChange({ activeMethod: m.type })}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{m.name}</span>
                    <span className="text-xs font-mono bg-studio-950 text-slate-400 px-1.5 py-0.5 rounded">
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{m.creator}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenTeachingMode(m.type)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-studio-accent hover:bg-studio-800 transition-colors"
                    title={`Open ${m.name} Master Guide`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {methods.activeMethod !== 'none' && (
        <div className="bg-studio-900 border border-studio-800 p-3 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Method Guide Opacity</span>
            <span className="font-mono text-slate-400">{Math.round(methods.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={methods.opacity}
            onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
            className="w-full h-1 bg-studio-800 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
