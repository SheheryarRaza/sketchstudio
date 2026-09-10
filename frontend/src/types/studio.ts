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

export type IsolationTarget =
  | { kind: 'none' }
  | { kind: 'family'; family: ValueFamily }
  | { kind: 'layer'; layerId: string };

export interface ValueLayer {
  id: string;
  name: string;
  minThreshold: number; // 0 - 255
  maxThreshold: number; // 0 - 255
  color: string;
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
  paperPreset: PaperPreset;
  paperWidthMm: number;
  paperHeightMm: number;
  paperOrientation: 'portrait' | 'landscape';
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
  layers: ValueLayer[];
  grid: GridConfig;
  calibration: CalibrationProfile;
  methods: DrawingMethodState;
  viewMode: 'original' | 'valueStudy' | 'edges' | 'split' | 'posterized';
  splitPosition: number; // 0-100 percentage
  isolation: IsolationTarget;
  ghostOpacity: number; // 0-1, visibility of the Reference Image beneath an isolated mask
  histogram: HistogramAnalysisState;
}
