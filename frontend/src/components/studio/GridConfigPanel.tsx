'use client';

import React from 'react';
import type { GridConfig, GridType, CalibrationProfile } from '../../types/studio';
import { Grid, Eye, EyeOff } from 'lucide-react';

interface GridConfigPanelProps {
  grid: GridConfig;
  calibration: CalibrationProfile;
  onChange: (updated: Partial<GridConfig>) => void;
  onOpenCalibration: () => void;
}

interface GridStyleOption {
  type: GridType;
  label: string;
  description: string;
}

const GRID_STYLES: GridStyleOption[] = [
  { type: 'squares', label: 'Square Grid', description: 'Standard millimeter/inch grid transfer with coordinates' },
  { type: 'diagonals', label: 'Diagonal Grid', description: 'Diagonal angle checks and diagonal transfer lines' },
  { type: 'triangles', label: 'Triangular / Iso', description: '60-degree equilateral triangular lattice' },
  { type: 'dots', label: 'Dot Grid', description: 'Subtle cross-point landmark dots without heavy lines' },
  { type: 'harmonic', label: 'Harmonic Armature', description: 'Classical 14-line diagonal composition network' },
  { type: 'goldenRatio', label: 'Golden Ratio', description: 'Rule of Thirds and Phi (0.618) dynamic focal lines' },
];

export const GridConfigPanel: React.FC<GridConfigPanelProps> = ({
  grid,
  calibration,
  onChange,
  onOpenCalibration,
}) => {
  return (
    <div className="flex flex-col gap-4 p-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
          <Grid className="w-4 h-4 text-studio-accent" />
          <span>Grid & Alignment Guides</span>
        </div>
        <button
          onClick={() => onChange({ enabled: !grid.enabled })}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            grid.enabled
              ? 'bg-studio-accent text-slate-950 shadow-md'
              : 'bg-studio-800 text-slate-400 hover:text-white'
          }`}
        >
          {grid.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{grid.enabled ? 'Enabled' : 'Hidden'}</span>
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Grid Pattern Style
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {GRID_STYLES.map((style) => (
            <button
              key={style.type}
              onClick={() => onChange({ type: style.type })}
              className={`p-2 rounded-xl text-left border transition-all flex flex-col gap-0.5 ${
                grid.type === style.type
                  ? 'bg-studio-850 border-studio-accent text-white shadow-md ring-1 ring-studio-accent/30'
                  : 'bg-studio-900 border-studio-800 text-slate-400 hover:text-slate-200 hover:bg-studio-850'
              }`}
            >
              <span className="font-bold text-xs text-slate-200">{style.label}</span>
              <span className="text-[9px] text-slate-400 leading-tight line-clamp-1">
                {style.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-studio-900 border border-studio-800 p-3 rounded-xl flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-300">Physical Cell Size (Paper)</span>
          <span className="font-mono text-studio-accent font-bold">
            {grid.cellSizeMm} mm ({Math.round((grid.cellSizeMm / 25.4) * 10) / 10} in)
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="50"
          step="1"
          value={grid.cellSizeMm}
          onChange={(e) => onChange({ cellSizeMm: parseInt(e.target.value) })}
          className="w-full h-1 bg-studio-800 rounded-lg cursor-pointer"
        />
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>5mm (Fine)</span>
          <button
            onClick={onOpenCalibration}
            className="text-studio-accent hover:underline font-medium"
          >
            {calibration.isCalibrated ? 'Calibrated (1:1 Scale)' : 'Calibrate Screen DPI →'}
          </button>
          <span>50mm (Broad)</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 bg-studio-900 border border-studio-800 p-3 rounded-xl">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-300">Show Coordinates (A1, B2...)</span>
          <input
            type="checkbox"
            checked={grid.showLabels}
            onChange={(e) => onChange({ showLabels: e.target.checked })}
            className="rounded bg-studio-800 border-studio-700 text-studio-accent cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-300">Subdivide Cells (Half Marks)</span>
          <input
            type="checkbox"
            checked={grid.showSubdivisions}
            onChange={(e) => onChange({ showSubdivisions: e.target.checked, subdivisions: 2 })}
            className="rounded bg-studio-800 border-studio-700 text-studio-accent cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-300">Diagonal Crosshairs in Cells</span>
          <input
            type="checkbox"
            checked={grid.showDiagonalsInCells}
            onChange={(e) => onChange({ showDiagonalsInCells: e.target.checked })}
            className="rounded bg-studio-800 border-studio-700 text-studio-accent cursor-pointer"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 bg-studio-900 border border-studio-800 p-3 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Grid Line Opacity</span>
          <span className="font-mono text-slate-400">{Math.round(grid.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={grid.opacity}
          onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
          className="w-full h-1 bg-studio-800 rounded-lg cursor-pointer"
        />

        <div className="flex items-center justify-between pt-2 border-t border-studio-800/60">
          <span className="text-slate-300">Line Color</span>
          <div className="flex items-center gap-1.5">
            {['#38bdf8', '#f59e0b', '#10b981', '#ffffff', '#f43f5e', '#a855f7'].map((c) => (
              <button
                key={c}
                onClick={() => onChange({ lineColor: c })}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  grid.lineColor === c ? 'border-white scale-110 shadow' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
