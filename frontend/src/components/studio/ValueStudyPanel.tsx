'use client';

import React from 'react';
import type { ValueLayer, ProjectState, PencilHardness, IsolationTarget } from '../../types/studio';
import { generateDefaultValueLayers, PENCIL_DATABASE } from '../../utils/pencilGrades';
import { VALUE_FAMILIES, layersInFamily } from '../../utils/tonalDecision';
import { Layers, Eye, EyeOff, SlidersHorizontal, Focus } from 'lucide-react';

interface ValueStudyPanelProps {
  project: ProjectState;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
}

const PENCIL_OPTIONS: PencilHardness[] = [
  'White_Chalk', '9H', '6H', '4H', '2H', 'H', 'F', 'HB', 'B', '2B', '3B', '4B', '5B', '6B', '8B', '9B', 'Charcoal'
];

export const ValueStudyPanel: React.FC<ValueStudyPanelProps> = ({
  project,
  onUpdateProject,
}) => {
  const { layers, numValueLayers, viewMode, isolation, ghostOpacity } = project;

  const handleLevelCountChange = (count: number) => {
    onUpdateProject(prev => ({
      ...prev,
      numValueLayers: count,
      layers: generateDefaultValueLayers(count),
      // Layer ids encode the layer count, so a layer isolation cannot outlive a
      // recount. A Value Family one can, being defined by tonal range.
      isolation: prev.isolation.kind === 'layer' ? { kind: 'none' } : prev.isolation,
    }));
  };

  const handleLayerChange = (index: number, updates: Partial<ValueLayer>) => {
    onUpdateProject(prev => {
      const updated = [...prev.layers];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, layers: updated };
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
        <span className="text-[10px] font-mono text-studio-400 bg-studio-850 px-2 py-0.5 rounded">
          {layers.length} Value Bands
        </span>
      </div>

      <div className="flex items-center gap-1.5 bg-studio-950 p-1 rounded-xl border border-studio-800">
        <button
          onClick={() => onUpdateProject(p => ({ ...p, viewMode: 'original' }))}
          className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all ${
            viewMode === 'original'
              ? 'bg-studio-800 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Photo
        </button>
        <button
          onClick={() => onUpdateProject(p => ({ ...p, viewMode: 'valueStudy' }))}
          className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all ${
            viewMode === 'valueStudy'
              ? 'bg-studio-accent text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Value Study
        </button>
        <button
          onClick={() => onUpdateProject(p => ({ ...p, viewMode: 'posterized' }))}
          className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all ${
            viewMode === 'posterized'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Posterize
        </button>
      </div>

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
              className="text-[10px] font-bold text-studio-accent hover:text-white uppercase tracking-wide"
            >
              Show All
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {VALUE_FAMILIES.map((family) => {
            const count = layersInFamily(layers, family.id).length;
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
                <span className="block text-[9px] font-mono opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {isolation.kind !== 'none' && (
          <div className="flex flex-col gap-0.5 pt-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
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
            <div
              key={layer.id}
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
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                      isolated
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-studio-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Isolate this value band as a flat mask to shade"
                  >
                    Isolate
                  </button>

                  <button
                    onClick={() => handleLayerChange(idx, { visible: !layer.visible })}
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

              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Min: {layer.minThreshold}</span>
                    <span>Max: {layer.maxThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={layer.maxThreshold}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      handleLayerChange(idx, { maxThreshold: Math.max(val, layer.minThreshold + 1) });
                    }}
                    className="w-full h-1 bg-studio-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-studio-800/60">
                <span className="text-[10px] text-slate-400">Pencil Grade:</span>
                <select
                  value={layer.pencilGrade}
                  onChange={(e) => handleLayerChange(idx, { pencilGrade: e.target.value as PencilHardness })}
                  className="bg-studio-800 border border-studio-700 text-studio-accent font-mono font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer"
                >
                  {PENCIL_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p} ({PENCIL_DATABASE[p].name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
