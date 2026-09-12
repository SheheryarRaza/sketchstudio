'use client';

import React, { useState } from 'react';
import { Upload, SlidersHorizontal, Eye, X, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';

export const TOUR_STORAGE_KEY = 'sketchstudio_has_seen_tour_v1';

interface FirstRunTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: 1 | 2 | 3;
}

interface TourStep {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  body: string;
  tip: string;
  icon: React.ElementType;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: '1. Upload Reference Image',
    subtitle: 'The foundation of your drafting study',
    body: 'Load a high-resolution Reference Image via local file upload, drag-and-drop, or sample portraits. SketchStudio analyzes luminance histogram distributions and facial landmarks automatically.',
    tip: 'Your Reference Image is never altered or uploaded externally — all analysis runs client-side and in your container.',
    icon: Upload,
  },
  {
    step: 2,
    title: '2. Choose a Starting Point',
    subtitle: 'Curated bundles tailored to your subject',
    body: 'Select from five curated Workflow Presets (Static Portrait, Dramatic Light, Dynamic Pose, Classical Cast, or Full Scene). Our Auto-Suggest Chip highlights the ideal preset based on your Reference Image’s contrast spread.',
    tip: 'Selecting a preset switches the studio to Sandbox Mode, configuring View Mode, Method, and Grid together.',
    icon: SlidersHorizontal,
  },
  {
    step: 3,
    title: '3. Studio Canvas & Value Isolation',
    subtitle: 'Drafting, measuring, and tonal decomposition',
    body: 'Transcribe proportions using physical grids and anatomical drawing methods. In the Values panel, isolate individual Tonal Layers or entire Value Families (Shadows, Halftones, Lights) to block in shapes accurately.',
    tip: 'Use the squint blur slider anytime to simplify the canvas into broad tonal masses.',
    icon: Eye,
  },
];

export const FirstRunTourModal: React.FC<FirstRunTourModalProps> = ({
  isOpen,
  onClose,
  initialStep = 1,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);

  if (!isOpen) return null;

  const stepData = TOUR_STEPS.find((s) => s.step === currentStep) || TOUR_STEPS[0];
  const StepIcon = stepData.icon;

  const handleFinish = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      }
    } catch {
      // Ignore localStorage exceptions in restricted environments
    }
    onClose();
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => ((prev + 1) as 1 | 2 | 3));
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => ((prev - 1) as 1 | 2 | 3));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-studio-900 border border-studio-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-studio-800 bg-studio-950/40">
          <div className="flex items-center gap-2 text-studio-accent">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Studio Walkthrough
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-studio-800 transition-colors"
            title="Skip tour"
            aria-label="Skip walkthrough"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Step Icon & Title */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-studio-800/80 border border-studio-700/60 flex items-center justify-center shrink-0 text-studio-accent shadow-inner">
              <StepIcon className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 id="tour-modal-title" className="text-base font-bold text-slate-100">
                {stepData.title}
              </h3>
              <p className="text-xs font-medium text-studio-accent">
                {stepData.subtitle}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed">
            {stepData.body}
          </p>

          {/* Callout Tip */}
          <div className="p-3.5 rounded-xl bg-studio-950 border border-studio-800/80 text-xs text-slate-400 flex items-start gap-2.5">
            <span className="font-bold text-amber-400 shrink-0">Tip:</span>
            <span className="leading-normal">{stepData.tip}</span>
          </div>

          {/* Step Dots & Progress */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((s) => (
                <div
                  key={s.step}
                  className={`h-1.5 rounded-full transition-all ${
                    s.step === currentStep
                      ? 'w-6 bg-studio-accent'
                      : s.step < currentStep
                      ? 'w-1.5 bg-emerald-500'
                      : 'w-1.5 bg-studio-800'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Step {currentStep} of 3
            </span>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-studio-800 bg-studio-950/60 text-xs">
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-200 transition-colors font-medium py-1 px-2 rounded"
          >
            Skip Walkthrough
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-slate-300 hover:text-white font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-studio-accent text-slate-950 font-bold hover:bg-studio-accent/90 transition-colors shadow-sm"
            >
              <span>{currentStep === 3 ? 'Start Drafting' : 'Next'}</span>
              {currentStep === 3 ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
