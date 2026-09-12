'use client';

import React, { useState } from 'react';
import type { ProjectState } from '../../types/studio';
import { fetchPdfGrid } from '../../utils/exportsApi';
import { X, Download, Printer, FileText, Loader2 } from 'lucide-react';

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
  const [downloadState, setDownloadState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }
  >({ status: 'idle' });

  if (!isOpen) return null;

  const handleDownloadPdfGrid = async () => {
    if (!project.paperMapping.isDeclared) return;
    setDownloadState({ status: 'loading' });
    try {
      const blob = await fetchPdfGrid(project.paperMapping, project.grid.cellSizeMm, project.grid.showLabels);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Printable-Grid-${project.paperMapping.paperPreset}-${project.grid.cellSizeMm}mm.pdf`;
      link.href = objectUrl;
      link.click();
      URL.revokeObjectURL(objectUrl);
      setDownloadState({ status: 'idle' });
    } catch (err) {
      setDownloadState({
        status: 'error',
        message: err instanceof Error ? err.message : 'PDF grid export failed',
      });
    }
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
                <span className="text-xs font-mono text-studio-accent">Print Ready</span>
              </div>
              <div>
                <span className="font-bold text-slate-100 block">Printable Blank Grid</span>
                <span className="text-xs text-slate-400">
                  {project.paperMapping.isDeclared
                    ? `Vector PDF grid template on ${project.paperMapping.paperPreset} paper.`
                    : 'Requires a declared Paper Mapping.'}
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
                <span className="text-xs font-mono text-amber-400">Pencil Chart</span>
              </div>
              <div>
                <span className="font-bold text-slate-100 block">Pencil Grade Study Guide</span>
                <span className="text-xs text-slate-400">
                  Reference sheet with tonal layer breakdown & recommended 9H-9B pencils.
                </span>
              </div>
            </button>
          </div>

          <div className="bg-studio-950 p-4 rounded-xl border border-studio-850 flex flex-col gap-2 text-xs text-slate-300">
            <span className="font-semibold text-studio-accent">Selected Export Details:</span>
            <div className="flex items-center justify-between">
              <span>Target Paper Size:</span>
              <span className="font-mono font-bold text-slate-100">
                {project.paperMapping.isDeclared ? project.paperMapping.paperPreset : 'Not declared'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Grid Cell Physical Dimension:</span>
              <span className="font-mono font-bold text-slate-100">{project.grid.cellSizeMm} mm</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Active Value Layers:</span>
              <span className="font-mono font-bold text-slate-100">{project.layerMeta.length} Bands</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-studio-800 bg-studio-950/80 flex items-center justify-between gap-2">
          {downloadState.status === 'error' ? (
            <span className="text-xs text-rose-400 max-w-xs">{downloadState.message}</span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium">
              Cancel
            </button>
            <button
              onClick={handleDownloadPdfGrid}
              disabled={!project.paperMapping.isDeclared || downloadState.status === 'loading'}
              title={project.paperMapping.isDeclared ? undefined : 'Declare a Paper Mapping first'}
              className="px-5 py-2 rounded-xl bg-studio-accent text-slate-950 font-bold shadow-lg hover:bg-studio-accent/90 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-studio-accent"
            >
              {downloadState.status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadState.status === 'error' ? 'Retry Download' : 'Download PDF Grid'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
