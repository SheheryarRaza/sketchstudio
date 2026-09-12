'use client';

import React, { useState } from 'react';
import type { CalibrationProfile } from '../../types/studio';
import {
  calculateDpiFromCardPixels,
  calculateDpiFromRulerPixels,
} from '../../utils/physicalScale';
import { X, Ruler, CreditCard, Check, Sparkles } from 'lucide-react';

interface PhysicalCaliperModalProps {
  isOpen: boolean;
  calibration: CalibrationProfile;
  onClose: () => void;
  onSaveCalibration: (profile: CalibrationProfile) => void;
}

export const PhysicalCaliperModal: React.FC<PhysicalCaliperModalProps> = ({
  isOpen,
  onClose,
  onSaveCalibration,
}) => {
  const [method, setMethod] = useState<'card' | 'ruler'>('card');
  const [cardPixelWidth, setCardPixelWidth] = useState<number>(320);
  const [rulerLengthMm] = useState<number>(100);
  const [rulerPixelLength, setRulerPixelLength] = useState<number>(380);

  if (!isOpen) return null;

  const currentDpi =
    method === 'card'
      ? calculateDpiFromCardPixels(cardPixelWidth)
      : calculateDpiFromRulerPixels(rulerPixelLength, rulerLengthMm);

  const handleApply = () => {
    onSaveCalibration({
      isCalibrated: true,
      screenDpi: currentDpi.dpi,
      pixelsPerMm: currentDpi.pixelsPerMm,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-studio-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-studio-accent/20 rounded-xl text-studio-accent">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Real-World Physical Scale Caliper</h3>
              <p className="text-xs text-slate-400">Match screen pixels to true 1cm/1in drawing paper scale</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 text-xs">
          <div className="flex gap-2">
            <button
              onClick={() => setMethod('card')}
              className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                method === 'card'
                  ? 'bg-studio-850 border-studio-accent text-white shadow-md'
                  : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4 text-studio-accent" />
              <span>Standard Credit Card (85.6mm)</span>
            </button>
            <button
              onClick={() => setMethod('ruler')}
              className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                method === 'ruler'
                  ? 'bg-studio-850 border-studio-accent text-white shadow-md'
                  : 'bg-studio-950 border-studio-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Ruler className="w-4 h-4 text-amber-400" />
              <span>Physical Ruler Alignment</span>
            </button>
          </div>

          {method === 'card' ? (
            <div className="flex flex-col items-center gap-4 bg-studio-950 p-6 rounded-2xl border border-studio-800">
              <p className="text-center text-slate-300">
                Hold a standard credit card (or ID card) against your screen and drag the slider until the box matches its width.
              </p>
              <div
                className="h-36 rounded-xl border-2 border-studio-accent bg-studio-accent/10 flex flex-col items-center justify-center relative shadow-lg transition-all"
                style={{ width: `${cardPixelWidth}px` }}
              >
                <CreditCard className="w-8 h-8 text-studio-accent/60 mb-1" />
                <span className="font-mono text-studio-accent font-bold text-xs">
                  85.60 mm (Credit Card)
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {Math.round(cardPixelWidth)} Screen Pixels
                </span>
              </div>
              <div className="w-full flex items-center gap-3">
                <span className="text-slate-400">Smaller</span>
                <input
                  type="range"
                  min="200"
                  max="500"
                  value={cardPixelWidth}
                  onChange={(e) => setCardPixelWidth(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-studio-800 rounded-lg cursor-pointer"
                />
                <span className="text-slate-400">Larger</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 bg-studio-950 p-6 rounded-2xl border border-studio-800">
              <p className="text-center text-slate-300">
                Hold a physical ruler to your screen and adjust the bar to match {rulerLengthMm} mm.
              </p>
              <div
                className="h-8 rounded-lg bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center font-mono font-bold text-amber-400 text-xs shadow-lg"
                style={{ width: `${rulerPixelLength}px` }}
              >
                {rulerLengthMm} mm
              </div>
              <input
                type="range"
                min="200"
                max="600"
                value={rulerPixelLength}
                onChange={(e) => setRulerPixelLength(parseInt(e.target.value))}
                className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer"
              />
            </div>
          )}

          <div className="bg-studio-950 p-3 rounded-xl border border-studio-850 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Calculated Screen Density:</span>
            </div>
            <div className="font-mono text-emerald-400 font-bold">
              {currentDpi.dpi} DPI ({currentDpi.pixelsPerMm} px/mm)
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-studio-800 bg-studio-950/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-studio-accent text-slate-950 font-bold shadow-lg hover:bg-studio-accent/90 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply 1:1 Scale Calibration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
