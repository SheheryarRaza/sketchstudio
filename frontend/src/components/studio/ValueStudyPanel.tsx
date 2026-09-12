'use client';

import React, { useState } from 'react';
import type { ValueLayerMeta, ProjectState, PencilHardness, IsolationTarget } from '../../types/studio';
import { generateDefaultLayerMeta, PENCIL_DATABASE, getPencilGradesForMedium, formatPencilTooltip } from '../../utils/pencilGrades';
import { PencilGradePanel } from './PencilGradePanel';
import { buildValueLayers, generateCutPointsFromHistogram, generateDefaultCutPoints, moveCutPoint } from '../../utils/cutPoints';
import { buildValueFamilies, layersInFamily } from '../../utils/tonalDecision';
import { CONSTRUCTION_INK } from '../../utils/inkColors';
import { Layers, Eye, EyeOff, SlidersHorizontal, Focus, BarChart3, Loader2, AlertTriangle, RefreshCw, Wand2, BookOpen } from 'lucide-react';

interface ValueStudyPanelProps {
  project: ProjectState;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
  onRetryHistogram?: () => void;
}

// Builds a filled area path from the 256-bin luminance histogram (0-100 normalized).
const histogramAreaPath = (bins: number[]): string => {
  if (bins.length === 0) return '';
  const w = 256;
  const h = 40;
  const step = w / bins.length;
  let d = `M0,${h}`;
  bins.forEach((v, i) => {
    const x = i * step;
    const y = h - (Math.max(0, Math.min(100, v)) / 100) * h;
    d += ` L${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `${d} L${w},${h} Z`;
};

export const ValueStudyPanel: React.FC<ValueStudyPanelProps> = ({
  project,
  onUpdateProject,
  onRetryHistogram,
}) => {
  const { layerMeta, cutPoints, numValueLayers, isolation, ghostOpacity, histogram, valueFamilyFloors, cutPointSource, medium } = project;
  const [showScaleReference, setShowScaleReference] = useState(false);
  const layers = buildValueLayers(layerMeta, cutPoints);
  const valueFamilies = buildValueFamilies(valueFamilyFloors);
  const availablePencilOptions = getPencilGradesForMedium(medium);

  const handleLevelCountChange = (count: number) => {
    onUpdateProject(prev => ({
      ...prev,
      numValueLayers: count,
      layerMeta: generateDefaultLayerMeta(count, prev.medium),
      cutPoints: generateDefaultCutPoints(count),
      cutPointSource: 'default',
      // Layer ids encode the layer count, so a layer isolation cannot outlive a
      // recount. A Value Family one can, being defined by tonal range.
      isolation: prev.isolation.kind === 'layer' ? { kind: 'none' } : prev.isolation,
    }));
  };

  const handleLayerMetaChange = (index: number, updates: Partial<ValueLayerMeta>) => {
    onUpdateProject(prev => {
      const updated = [...prev.layerMeta];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, layerMeta: updated };
    });
  };

  const handleCutPointChange = (index: number, value: number) => {
    onUpdateProject(prev => ({
      ...prev,
      cutPoints: moveCutPoint(prev.cutPoints, index, value),
      cutPointSource: 'manual',
    }));
  };

  // Explicit, artist-triggered re-seed — never runs automatically on upload, so
  // it never overwrites Cut Points the artist has already dragged by hand.
  const handleSeedFromHistogram = () => {
    onUpdateProject(prev => {
      if (prev.histogram.status !== 'ready') return prev;
      const seededCutPoints = generateCutPointsFromHistogram(prev.numValueLayers, prev.histogram.data);
      return {
        ...prev,
        cutPoints: seededCutPoints,
        // Read back off the generated Cut Points, not the raw histogram
        // thresholds, so the Value Family floors can never drift from the
        // Cut Points actually in effect after clamping.
        valueFamilyFloors: {
          lightFloor: seededCutPoints[0],
          halftoneFloor: seededCutPoints[seededCutPoints.length - 1],
        },
        cutPointSource: 'seeded',
      };
    });
  };

  const targetsSame = (a: IsolationTarget, b: IsolationTarget): boolean => {
    if (a.kind === 'layer' && b.kind === 'layer') return a.layerId === b.layerId;
    if (a.kind === 'family' && b.kind === 'family') return a.family === b.family;
    return false;
  };

  const toggleIsolation = (target: IsolationTarget) => {
    onUpdateProject(prev => ({
      ...prev,
      isolation: targetsSame(prev.isolation, target) ? { kind: 'none' } : target,
    }));
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
          <Layers className="w-4 h-4 text-studio-accent" />
          <span>Tonal Value Breakdown</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowScaleReference(!showScaleReference)}
            className={`text-[11px] px-2 py-0.5 rounded border transition-all flex items-center gap-1 font-semibold ${
              showScaleReference
                ? 'bg-studio-800 text-studio-accent border-studio-accent/40'
                : 'bg-studio-850 text-slate-400 hover:text-slate-200 border-studio-800'
            }`}
            title="View full materials scale reference for active medium"
          >
            <BookOpen className="w-3 h-3" />
            <span>Materials</span>
          </button>
          <span className="text-xs font-mono text-studio-400 bg-studio-850 px-2 py-0.5 rounded">
            {layers.length} Value Bands
          </span>
        </div>
      </div>

      {showScaleReference && (
        <div className="border border-studio-800 rounded-xl bg-studio-950/80 overflow-hidden shadow-lg">
          <PencilGradePanel medium={medium} />
        </div>
      )}


      {project.imageSrc && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Luminance Histogram</span>
            </span>
          </div>

          {histogram.status === 'loading' && (
            <div className="flex items-center gap-2 h-10 text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Measuring photograph…</span>
            </div>
          )}

          {histogram.status === 'error' && (
            <div className="flex items-center justify-between gap-2 h-10 text-rose-400">
              <span className="flex items-center gap-1.5 truncate">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{histogram.message}</span>
              </span>
              {onRetryHistogram && (
                <button
                  onClick={onRetryHistogram}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-studio-850 hover:bg-studio-800 text-slate-200 font-semibold shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              )}
            </div>
          )}

          {histogram.status === 'ready' && (
            <div className="flex flex-col gap-1">
              <svg viewBox="0 0 256 40" preserveAspectRatio="none" className="w-full h-10 rounded bg-studio-950 border border-studio-800">
                <path d={histogramAreaPath(histogram.data.histogram)} className="fill-studio-accent/60" />
                <line
                  x1={histogram.data.deepDarkThreshold}
                  x2={histogram.data.deepDarkThreshold}
                  y1="0"
                  y2="40"
                  stroke="#fbbf24"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={histogram.data.highlightThreshold}
                  x2={histogram.data.highlightThreshold}
                  y1="0"
                  y2="40"
                  stroke={CONSTRUCTION_INK}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-amber-400">Deep Dark ≤ {histogram.data.deepDarkThreshold}</span>
                <span className="text-slate-500">Median {histogram.data.medianLuminance}</span>
                <span className="text-studio-accent">Highlight ≥ {histogram.data.highlightThreshold}</span>
              </div>
              <button
                onClick={handleSeedFromHistogram}
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-studio-850 hover:bg-studio-800 text-slate-200 font-semibold"
                title="Set Cut Points from this photo's measured dark and light points, overwriting any manual adjustments"
              >
                <Wand2 className="w-3 h-3" />
                Seed Cut Points from Photo
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Value Scale Steps (Munsell Scale)</span>
          </span>
          <span className="font-mono text-studio-accent font-bold">{numValueLayers} Steps</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[3, 4, 5, 6, 7, 8, 9].map((count) => (
            <button
              key={count}
              onClick={() => handleLevelCountChange(count)}
              className={`py-1.5 rounded-lg font-mono font-bold text-center transition-all ${
                numValueLayers === count
                  ? 'bg-studio-accent text-slate-950 shadow-md ring-1 ring-white/20'
                  : 'bg-studio-850 hover:bg-studio-800 text-slate-300'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        {cutPointSource === 'seeded' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Wand2 className="w-3 h-3" />
            Cut Points seeded from this photo
          </span>
        )}
        {cutPointSource === 'manual' && (
          <span className="flex items-center gap-1.5 text-xs text-studio-gold">
            <SlidersHorizontal className="w-3 h-3" />
            Cut Points manually adjusted
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1">
            <Focus className="w-3.5 h-3.5" />
            <span>Isolate to Shade</span>
          </span>
          {isolation.kind !== 'none' && (
            <button
              onClick={() => onUpdateProject(p => ({ ...p, isolation: { kind: 'none' } }))}
              className="text-xs font-bold text-studio-accent hover:text-white uppercase tracking-wide"
            >
              Show All
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {valueFamilies.map((family) => {
            const count = layersInFamily(layers, family.id, valueFamilyFloors).length;
            const target: IsolationTarget = { kind: 'family', family: family.id };
            const active = targetsSame(isolation, target);
            return (
              <button
                key={family.id}
                onClick={() => toggleIsolation(target)}
                disabled={count === 0}
                title={`${family.description} (${count} ${count === 1 ? 'band' : 'bands'})`}
                className={`py-1.5 px-1 rounded-lg font-semibold text-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  active
                    ? 'bg-amber-400 text-slate-950 shadow-md ring-1 ring-white/20'
                    : 'bg-studio-850 hover:bg-studio-800 text-slate-300'
                }`}
              >
                {family.name}
                <span className="block text-xs font-mono opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {isolation.kind !== 'none' && (
          <div className="flex flex-col gap-0.5 pt-1">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Reference underlay</span>
              <span className="text-studio-accent font-bold">{Math.round(ghostOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={Math.round(ghostOpacity * 100)}
              onChange={(e) =>
                onUpdateProject(p => ({ ...p, ghostOpacity: parseInt(e.target.value) / 100 }))
              }
              className="w-full h-1 bg-studio-800 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
        {layers.map((layer, idx) => {
          const target: IsolationTarget = { kind: 'layer', layerId: layer.id };
          const isolated = targetsSame(isolation, target);
          return (
            <React.Fragment key={layer.id}>
            <div
              className={`p-2.5 rounded-xl border transition-all flex flex-col gap-2 ${
                isolated
                  ? 'bg-studio-850/90 border-studio-accent shadow-md ring-1 ring-studio-accent/30'
                  : layer.visible
                  ? 'bg-studio-900/90 border-studio-800'
                  : 'bg-studio-950/60 border-studio-900 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-md border border-white/20 shadow-inner shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="font-semibold text-slate-200 truncate max-w-[120px]">
                    {layer.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleIsolation(target)}
                    className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold uppercase transition-all ${
                      isolated
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-studio-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Isolate this value band as a flat mask to shade"
                  >
                    Isolate
                  </button>

                  <button
                    onClick={() => handleLayerMetaChange(idx, { visible: !layer.visible })}
                    disabled={isolation.kind !== 'none'}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-studio-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    title={
                      isolation.kind !== 'none'
                        ? 'Unavailable while a value band is isolated'
                        : layer.visible ? 'Hide Layer' : 'Show Layer'
                    }
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Min: {layer.minThreshold}</span>
                <span>Max: {layer.maxThreshold}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-studio-800/60">
                <span className="text-slate-400">Pencil Grade:</span>
                <select
                  value={layer.pencilGrade}
                  onChange={(e) => handleLayerMetaChange(idx, { pencilGrade: e.target.value as PencilHardness })}
                  title={formatPencilTooltip(layer.pencilGrade)}
                  className="bg-studio-800 border border-studio-700 text-studio-accent font-mono font-bold px-2 py-0.5 rounded cursor-pointer"
                >
                  {(availablePencilOptions.includes(layer.pencilGrade)
                    ? availablePencilOptions
                    : [layer.pencilGrade, ...availablePencilOptions]
                  ).map((p) => {
                    const info = PENCIL_DATABASE[p];
                    return (
                      <option key={p} value={p}>
                        {info ? `${info.displayName} (${info.name})` : p}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {idx < layers.length - 1 && (
              <div className="flex flex-col gap-0.5 px-1">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Cut Point</span>
                  <span className="text-studio-accent font-bold">{cutPoints[idx]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={cutPoints[idx]}
                  onChange={(e) => handleCutPointChange(idx, parseInt(e.target.value))}
                  className="w-full h-1 bg-studio-800 rounded-lg cursor-pointer"
                  title={`Shared boundary between ${layer.name} and ${layers[idx + 1].name}`}
                />
              </div>
            )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
