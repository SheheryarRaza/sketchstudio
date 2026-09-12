export type GridType = 'squares' | 'diagonals' | 'triangles' | 'dots' | 'harmonic' | 'goldenRatio';

export type PhysicalUnit = 'mm' | 'cm' | 'in';

export type PaperPreset = 'A5' | 'A4' | 'A3' | 'A2' | 'Letter' | '8x10' | '9x12' | '11x14' | 'Custom';

export type DrawingMethodType = 
  | 'none'
  | 'loomis' 
  | 'reilly' 
  | 'bargue' 
  | 'asaro' 
  | 'triangulation' 
  | 'harmonic';

export type AtelierStage = 1 | 2 | 3 | 4 | 5;

export type MediumType = 'graphite' | 'oil' | 'watercolor' | 'pastel';

export type PencilHardness = 
  | '9H' | '8H' | '7H' | '6H' | '5H' | '4H' | '3H' | '2H' | 'H'
  | 'F' | 'HB' | 'B' | '2B' | '3B' | '4B' | '5B' | '6B' | '7B' | '8B' | '9B'
  | 'Charcoal' | 'White_Chalk';

export type ValueFamily = 'shadows' | 'halftones' | 'lights';

// The two luminance boundaries that split Tonal Layers into Value Families
// (shadows/halftones/lights), independent of Tonal Layer count. Seeded per
// Reference Image from its measured histogram rather than fixed for every photo.
export interface ValueFamilyFloors {
  halftoneFloor: number; // boundary between shadows and halftones
  lightFloor: number; // boundary between halftones and lights
}

export type TonalRenderMode = 'valueStudy' | 'posterized';

export interface HistogramStats {
  width: number;
  height: number;
  meanLuminance: number;
  medianLuminance: number;
  deepDarkThreshold: number; // 10th percentile luminance
  highlightThreshold: number; // 90th percentile luminance
  histogram: number[]; // 256-bin luminance distribution, normalized 0-100
}

export type HistogramAnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: HistogramStats }
  | { status: 'error'; message: string };

export type LandmarkSource = 'detected' | 'fallback';

// Declared Source for the current Cut Points: whether they're the photo-measured
// seed, a hand-adjusted drag, or the plain evenly-spaced default — never left
// ambiguous, per this project's Declared Source convention.
export type CutPointSource = 'default' | 'seeded' | 'manual';

export interface LandmarkStats {
  source: LandmarkSource;
  loomis: LoomisAnchorPoints;
  reilly: ReillyAnchorPoints;
}

export type LandmarkAnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: LandmarkStats }
  | { status: 'error'; message: string };

export type IsolationTarget =
  | { kind: 'none' }
  | { kind: 'family'; family: ValueFamily }
  | { kind: 'layer'; layerId: string };

export interface ValueLayer {
  id: string;
  name: string;
  minThreshold: number; // 0 - 255, derived from this layer's bounding Cut Points
  maxThreshold: number; // 0 - 255, derived from this layer's bounding Cut Points
  color: string;
  pencilGrade: PencilHardness;
  pencilDescription: string;
  visible: boolean;
  opacity: number;
}

// The editable identity/style of a Tonal Layer, independent of its threshold
// range. Thresholds are never stored here — they're derived from cutPoints via
// buildValueLayers, so overlapping or gapped Tonal Layers can't be constructed.
export interface ValueLayerMeta {
  id: string;
  name: string;
  pencilGrade: PencilHardness;
  pencilDescription: string;
  visible: boolean;
  opacity: number;
}

export interface GridConfig {
  enabled: boolean;
  type: GridType;
  cellSizeMm: number; // in physical mm
  lineColor: string;
  lineWidth: number;
  opacity: number;
  showLabels: boolean; // A1, B2 labels
  showSubdivisions: boolean;
  subdivisions: number; // e.g. 2 or 4
  showDiagonalsInCells: boolean;
  dotRadius: number; // for dot grid
}

export interface CalibrationProfile {
  isCalibrated: boolean;
  screenDpi: number; // calculated pixels per inch
  pixelsPerMm: number;
}

// How the Reference Image fills the declared paper: spans its full width, its
// full height, or fits entirely within both (whichever dimension is tighter).
export type PaperFillMode = 'fillWidth' | 'fillHeight' | 'fitWithin';

export interface PaperMappingConfig {
  isDeclared: boolean;
  paperPreset: PaperPreset;
  paperWidthMm: number;
  paperHeightMm: number;
  fillMode: PaperFillMode;
}

export interface LoomisAnchorPoints {
  center: { x: number; y: number };
  radius: number;
  browLineY: number;
  noseLineY: number;
  chinY: number;
  jawWidth: number;
  tiltAngle: number; // in degrees
}

export interface ReillyAnchorPoints {
  browCenter: { x: number; y: number };
  noseTip: { x: number; y: number };
  mouthCenter: { x: number; y: number };
  chinBottom: { x: number; y: number };
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  leftJaw: { x: number; y: number };
  rightJaw: { x: number; y: number };
  leftTemple: { x: number; y: number };
  rightTemple: { x: number; y: number };
}

export interface BarguePoint {
  id: string;
  x: number;
  y: number;
}

export interface BargueEnvelope {
  points: BarguePoint[];
  plumbLines: Array<{ x: number }>;
  levelBars: Array<{ y: number }>;
}

export interface CaliperMeasurement {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  label: string;
  color: string;
  ratioToBaseUnit?: number;
}

export interface DrawingMethodState {
  activeMethod: DrawingMethodType;
  opacity: number;
  color: string;
  showAnchorPoints: boolean;
  loomis: LoomisAnchorPoints;
  reilly: ReillyAnchorPoints;
  bargue: BargueEnvelope;
  triangulation: {
    measurements: CaliperMeasurement[];
    baseUnitDistance?: number;
  };
  asaro: {
    planesOpacity: number;
    lightAngleDeg: number;
  };
}

import type { EdgeQualityState } from './edgeQuality';

export interface ProjectState {
  id?: string;
  title: string;
  imageSrc: string | null;
  imageWidth: number;
  imageHeight: number;
  medium: MediumType;
  stage: AtelierStage;
  isSandbox: boolean;
  numValueLayers: number; // 3 to 9
  layerMeta: ValueLayerMeta[];
  cutPoints: number[]; // N-1 shared boundaries between layerMeta, brightest-to-darkest (descending)
  grid: GridConfig;
  calibration: CalibrationProfile;
  paperMapping: PaperMappingConfig;
  methods: DrawingMethodState;
  edgeQuality?: EdgeQualityState;
  viewMode: 'original' | 'valueStudy' | 'edges' | 'split' | 'posterized';
  splitPosition: number; // 0-100 percentage
  blurRadius: number; // in pixels, squint mode blur radius applied to canvas view
  isFlippedHorizontal: boolean; // view-only horizontal mirror to catch symmetry/tilt errors
  isolation: IsolationTarget;
  ghostOpacity: number; // 0-1, visibility of the Reference Image beneath an isolated mask
  valueFamilyFloors: ValueFamilyFloors;
  cutPointSource: CutPointSource;
  histogram: HistogramAnalysisState;
  landmarks: LandmarkAnalysisState;
}

