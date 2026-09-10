'use client';

import React from 'react';
import type { MediumType } from '../../types/studio';
import { Palette, Feather, Droplets, Check } from 'lucide-react';

interface MediumSelectorProps {
  currentMedium: MediumType;
  onChangeMedium: (medium: MediumType) => void;
}

interface MediumOption {
  type: MediumType;
  name: string;
  subtitle: string;
  status: 'active' | 'future_ready';
  icon: React.ReactNode;
}

const MEDIUMS: MediumOption[] = [
  {
    type: 'graphite',
    name: 'Graphite & Charcoal Sketching',
    subtitle: 'Value quantization, 9H-9B hardness mapping, Loomis/Bargue atelier guides',
    status: 'active',
    icon: <Feather className="w-4 h-4 text-studio-accent" />,
  },
  {
    type: 'oil',
    name: 'Oil & Acrylic Painting (Future Module)',
    subtitle: 'Munsell hue-value-chroma isolation, warm/cool temperature, edge quality analyzer',
    status: 'future_ready',
    icon: <Palette className="w-4 h-4 text-amber-400" />,
  },
  {
    type: 'watercolor',
    name: 'Watercolor & Gouache (Future Module)',
    subtitle: 'Transparency glaze layering, paper white preservation masks, pigment dilution ratios',
    status: 'future_ready',
    icon: <Droplets className="w-4 h-4 text-indigo-400" />,
  },
];

export const MediumSelector: React.FC<MediumSelectorProps> = ({
  currentMedium,
  onChangeMedium,
}) => {
  return (
    <div className="flex flex-col gap-3 p-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
          <Palette className="w-4 h-4 text-studio-accent" />
          <span>Medium Presets & Future Extensions</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded">
          Modular Core
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {MEDIUMS.map((m) => {
          const isSelected = currentMedium === m.type;

          return (
            <button
              key={m.type}
              onClick={() => {
                if (m.status === 'active') {
                  onChangeMedium(m.type);
                } else {
                  alert(`${m.name} is architected in the domain model and will unlock color/glaze analyzers in the next phase!`);
                }
              }}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                isSelected
                  ? 'bg-studio-850 border-studio-accent shadow-md ring-1 ring-studio-accent/30'
                  : 'bg-studio-900 border-studio-800 hover:bg-studio-850'
              }`}
            >
              <div className="p-2 rounded-lg bg-studio-950 border border-studio-800 shrink-0">
                {m.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-xs">{m.name}</span>
                  {m.status === 'active' ? (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-amber-400/80 bg-amber-950/40 px-1.5 py-0.5 rounded">
                      Planned Extension
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
