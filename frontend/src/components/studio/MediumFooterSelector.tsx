'use client';

import React from 'react';
import type { MediumType } from '../../types/studio';
import { Pencil, Flame, Palette, Droplets } from 'lucide-react';

interface MediumFooterSelectorProps {
  currentMedium: MediumType;
  onChangeMedium: (medium: MediumType) => void;
}

interface MediumOption {
  type: MediumType;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

const MEDIUM_OPTIONS: MediumOption[] = [
  { type: 'graphite', label: 'Graphite', icon: <Pencil className="w-3.5 h-3.5" />, active: true },
  { type: 'charcoal', label: 'Charcoal', icon: <Flame className="w-3.5 h-3.5" />, active: true },
  { type: 'oil', label: 'Oil Painting', icon: <Palette className="w-3.5 h-3.5" />, active: false },
  { type: 'watercolor', label: 'Watercolor', icon: <Droplets className="w-3.5 h-3.5" />, active: false },
];

// Medium Preset as a compact sidebar-footer selector (ADR-0005, issue #37:
// full Graphite and Charcoal selectors, each pulling its own materials scale).
export const MediumFooterSelector: React.FC<MediumFooterSelectorProps> = ({
  currentMedium,
  onChangeMedium,
}) => {
  return (
    <div className="border-t border-studio-800 bg-studio-900 p-2 flex items-center gap-1.5" role="toolbar" aria-label="Medium Selector">
      {MEDIUM_OPTIONS.map((m) => (
        <button
          key={m.type}
          onClick={() => m.active && onChangeMedium(m.type)}
          disabled={!m.active}
          title={m.active ? m.label : `${m.label} (planned extension)`}
          aria-label={m.label}
          aria-pressed={currentMedium === m.type}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            currentMedium === m.type
              ? 'bg-studio-800 text-studio-accent font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850'
          }`}
        >
          {m.icon}
          <span className="text-[11px] truncate">{m.label}</span>
        </button>
      ))}
    </div>
  );
};
