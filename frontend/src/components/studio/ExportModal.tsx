'use client';

import React, { useState } from 'react';
import type { ProjectState } from '../../types/studio';
import { PAPER_PRESETS, mmToPx } from '../../utils/physicalScale';
import { X, Download, Printer, FileText } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  project: ProjectState;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  project,
  onClose,
}) => {
  const [exportType, setExportType] = useState<'image' | 'printableGrid' | 'studyGuide'>('printableGrid');

  if (!isOpen) return null;

  const handleDownloadBlankGrid = () => {
    const paper = PAPER_PRESETS[project.calibration.paperPreset] || PAPER_PRESETS.A4;
    const dpi = 300;
    const widthPx = Math.round(mmToPx(paper.widthMm, dpi));
    const heightPx = Math.round(mmToPx(paper.heightMm, dpi));

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    const marginPx = Math.round(mmToPx(10, dpi));
    const cellPx = Math.round(mmToPx(project.grid.cellSizeMm, dpi));

    const gridW = widthPx - marginPx * 2;
    const gridH = heightPx - marginPx * 2;
    const cols = Math.floor(gridW / cellPx);
    const rows = Math.floor(gridH / cellPx);

    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#666666';

    for (let c = 0; c <= cols; c++) {
      const x = marginPx + c * cellPx;
      ctx.beginPath();
      ctx.moveTo(x, marginPx);
      ctx.lineTo(x, marginPx + rows * cellPx);
      ctx.stroke();

      if (c < cols && project.grid.showLabels) {
        const letter = String.fromCharCode(65 + (c % 26));
        ctx.fillText(letter, x + 8, marginPx - 8);
      }
    }

    for (let r = 0; r <= rows; r++) {
      const y = marginPx + r * cellPx;
      ctx.beginPath();
      ctx.moveTo(marginPx, y);
      ctx.lineTo(marginPx + cols * cellPx, y);
      ctx.stroke();

      if (r < rows && project.grid.showLabels) {
        ctx.fillText(`${r + 1}`, marginPx - 30, y + 28);
      }
    }

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText(`Sketch Studio Physical Grid - ${paper.name} (${project.grid.cellSizeMm}mm Cells)`, marginPx, heightPx - marginPx / 2);

    const link = document.createElement('a');
    link.download = `Printable-Grid-${paper.name}-${project.grid.cellSizeMm}mm.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-studio-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-studio-accent/20 rounded-xl text-studio-accent">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Export & Print Studio Assets</h3>
              <p className="text-xs text-slate-400">Generate high-res templates for your drawing desk</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setExportType('printableGrid')}
              className={`p-3 rounded-xl border flex flex-col gap-2 text-left transition-all ${
                exportType === 'printableGrid'
                  ? 'bg-studio-850 border-studio-accent shadow-md'
                  : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <Printer className="w-5 h-5 text-studio-accent" />
                <span className="text-[10px] font-mono text-studio-accent">Print Ready</span>
              </div>
              <div>
                <span className="font-bold text-slate-100 block">Printable Blank Grid</span>
                <span className="text-[10px] text-slate-400">
                  Exact 1:1 scale blank grid template on {project.calibration.paperPreset} paper.
                </span>
              </div>
            </button>

            <button
              onClick={() => setExportType('studyGuide')}
              className={`p-3 rounded-xl border flex flex-col gap-2 text-left transition-all ${
                exportType === 'studyGuide'
                  ? 'bg-studio-850 border-studio-accent shadow-md'
                  : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileText className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] font-mono text-amber-400">Pencil Chart</span>
              </div>
              <div>
                <span className="font-bold text-slate-100 block">Pencil Grade Study Guide</span>
                <span className="text-[10px] text-slate-400">
                  Reference sheet with tonal layer breakdown & recommended 9H-9B pencils.
                </span>
              </div>
            </button>
          </div>

          <div className="bg-studio-950 p-4 rounded-xl border border-studio-850 flex flex-col gap-2 text-xs text-slate-300">
            <span className="font-semibold text-studio-accent">Selected Export Details:</span>
            <div className="flex items-center justify-between">
              <span>Target Paper Size:</span>
              <span className="font-mono font-bold text-slate-100">{project.calibration.paperPreset}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Grid Cell Physical Dimension:</span>
              <span className="font-mono font-bold text-slate-100">{project.grid.cellSizeMm} mm</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Active Value Layers:</span>
              <span className="font-mono font-bold text-slate-100">{project.layers.length} Bands</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-studio-800 bg-studio-950/80 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium">
            Cancel
          </button>
          <button
            onClick={handleDownloadBlankGrid}
            className="px-5 py-2 rounded-xl bg-studio-accent text-slate-950 font-bold shadow-lg hover:bg-studio-accent/90 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download High-Res (300 DPI)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
