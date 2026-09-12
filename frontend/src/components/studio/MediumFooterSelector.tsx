'use client';

import React from 'react';
import type { MediumType } from '../../types/studio';
import { Feather, Palette, Droplets } from 'lucide-react';

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
  { type: 'graphite', label: 'Graphite & Charcoal', icon: <Feather className="w-3.5 h-3.5" />, active: true },
  { type: 'oil', label: 'Oil & Acrylic', icon: <Palette className="w-3.5 h-3.5" />, active: false },
  { type: 'watercolor', label: 'Watercolor & Gouache', icon: <Droplets className="w-3.5 h-3.5" />, active: false },
];

// Medium Preset as a compact sidebar-footer selector (issue #39; see #37 for
// turning this into a full Graphite/Charcoal selector).
export const MediumFooterSelector: React.FC<MediumFooterSelectorProps> = ({
  currentMedium,
  onChangeMedium,
}) => {
  return (
    <div className="border-t border-studio-800 bg-studio-900 p-2 flex items-center gap-1.5">
      {MEDIUM_OPTIONS.map((m) => (
        <button
          key={m.type}
          onClick={() => m.active && onChangeMedium(m.type)}
          disabled={!m.active}
          title={m.active ? m.label : `${m.label} (planned extension)`}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            currentMedium === m.type
              ? 'bg-studio-800 text-studio-accent'
              : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850'
          }`}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
};
