import type {
  DrawingMethodState,
  GridConfig,
  ImageProjectState,
  ProjectState,
  StudioViewState,
  ValueStudyState,
} from '../types/studio';
import { generateDefaultLayerMeta } from './pencilGrades';
import { generateDefaultCutPoints } from './cutPoints';
import { DEFAULT_VALUE_FAMILY_FLOORS } from './tonalDecision';
import { CONSTRUCTION_INK, TRANSFER_GRID_INK } from './inkColors';
import { createInitialEdgeQualityState } from './edgeQuality';

export const INITIAL_IMAGE_STATE: ImageProjectState = {
  title: 'Classical Portrait Study',
  imageSrc: null,
  imageWidth: 600,
  imageHeight: 800,
  calibration: {
    isCalibrated: false,
    screenDpi: 96,
    pixelsPerMm: 3.78,
  },
  paperMapping: {
    isDeclared: false,
    paperPreset: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    fillMode: 'fillWidth',
  },
  histogram: { status: 'idle' },
  landmarks: { status: 'idle' },
};

export const INITIAL_VALUE_STUDY_STATE: ValueStudyState = {
  medium: 'graphite',
  numValueLayers: 5,
  layerMeta: generateDefaultLayerMeta(5),
  cutPoints: generateDefaultCutPoints(5),
  cutPointSource: 'default',
  valueFamilyFloors: DEFAULT_VALUE_FAMILY_FLOORS,
};

export const INITIAL_METHODS_STATE: DrawingMethodState = {
  activeMethod: 'loomis',
  opacity: 0.85,
  color: CONSTRUCTION_INK,
  showAnchorPoints: true,
  loomis: {
    center: { x: 300, y: 340, source: 'fallback' },
    radius: 170,
    radiusSource: 'fallback',
    browLineY: 340,
    browSource: 'fallback',
    noseLineY: 440,
    noseSource: 'fallback',
    chinY: 550,
    chinSource: 'fallback',
    jawWidth: 150,
    jawSource: 'fallback',
    tiltAngle: 0,
    sources: {
      center: 'fallback',
      radius: 'fallback',
      browLineY: 'fallback',
      noseLineY: 'fallback',
      chinY: 'fallback',
      jawWidth: 'fallback',
    },
  },
  reilly: {
    browCenter: { x: 300, y: 330, source: 'fallback' },
    noseTip: { x: 300, y: 440, source: 'fallback' },
    mouthCenter: { x: 300, y: 500, source: 'fallback' },
    chinBottom: { x: 300, y: 550, source: 'fallback' },
    leftEye: { x: 235, y: 345, source: 'fallback' },
    rightEye: { x: 365, y: 345, source: 'fallback' },
    leftJaw: { x: 190, y: 460, source: 'fallback' },
    rightJaw: { x: 410, y: 460, source: 'fallback' },
    leftTemple: { x: 180, y: 280, source: 'fallback' },
    rightTemple: { x: 420, y: 280, source: 'fallback' },
  },
  bargue: {
    points: [
      { id: 'p1', x: 300, y: 140 },
      { id: 'p2', x: 450, y: 280 },
      { id: 'p3', x: 430, y: 500 },
      { id: 'p4', x: 350, y: 600 },
      { id: 'p5', x: 250, y: 600 },
      { id: 'p6', x: 170, y: 500 },
      { id: 'p7', x: 150, y: 280 },
    ],
    plumbLines: [{ x: 235 }, { x: 300 }, { x: 365 }],
    levelBars: [{ y: 345 }, { y: 440 }, { y: 500 }, { y: 550 }],
  },
  triangulation: {
    measurements: [
      { id: 'm1', start: { x: 215, y: 345 }, end: { x: 255, y: 345 }, label: 'Eye Width (Base Unit)', color: '#38bdf8', ratioToBaseUnit: 1.0 },
      { id: 'm2', start: { x: 255, y: 345 }, end: { x: 345, y: 345 }, label: 'Inter-Eye Gap', color: '#f59e0b', ratioToBaseUnit: 2.25 },
      { id: 'm3', start: { x: 300, y: 345 }, end: { x: 300, y: 440 }, label: 'Nose Height', color: '#10b981', ratioToBaseUnit: 2.37 },
    ],
    baseUnitDistance: 40,
  },
  asaro: {
    planesOpacity: 0.7,
    lightAngleDeg: 45,
    showTerminator: true,
    terminatorSource: 'default',
  },
};

export const INITIAL_GRID_STATE: GridConfig = {
  enabled: true,
  type: 'squares',
  cellSizeMm: 15,
  lineColor: TRANSFER_GRID_INK,
  lineWidth: 1,
  opacity: 0.75,
  showLabels: true,
  showSubdivisions: false,
  subdivisions: 2,
  showDiagonalsInCells: false,
  dotRadius: 2,
};

export const INITIAL_VIEW_STATE: StudioViewState = {
  stage: 1,
  isSandbox: false,
  viewMode: 'valueStudy',
  splitPosition: 50,
  blurRadius: 0,
  isFlippedHorizontal: false,
  isolation: { kind: 'none' },
  ghostOpacity: 0.18,
  edgeQuality: createInitialEdgeQualityState(),
};

/**
 * Assembles concern-scoped studio sub-states into a composite ProjectState.
 * Exposes both concern-scoped sub-objects (image, values, methods, grid, view)
 * and backward-compatible flat property getters.
 */
export function assembleProjectState(
  image: ImageProjectState,
  values: ValueStudyState,
  methods: DrawingMethodState,
  grid: GridConfig,
  view: StudioViewState
): ProjectState {
  return {
    image,
    values,
    methods,
    grid,
    view,

    get id() { return image.id; },
    get title() { return image.title; },
    get imageSrc() { return image.imageSrc; },
    get imageWidth() { return image.imageWidth; },
    get imageHeight() { return image.imageHeight; },
    get calibration() { return image.calibration; },
    get paperMapping() { return image.paperMapping; },
    get histogram() { return image.histogram; },
    get landmarks() { return image.landmarks; },

    get medium() { return values.medium; },
    get numValueLayers() { return values.numValueLayers; },
    get layerMeta() { return values.layerMeta; },
    get cutPoints() { return values.cutPoints; },
    get cutPointSource() { return values.cutPointSource; },
    get valueFamilyFloors() { return values.valueFamilyFloors; },

    get stage() { return view.stage; },
    get isSandbox() { return view.isSandbox; },
    get viewMode() { return view.viewMode; },
    get splitPosition() { return view.splitPosition; },
    get blurRadius() { return view.blurRadius; },
    get isFlippedHorizontal() { return view.isFlippedHorizontal; },
    get isolation() { return view.isolation; },
    get ghostOpacity() { return view.ghostOpacity; },
    get appliedPreset() { return view.appliedPreset; },
    get edgeQuality() { return view.edgeQuality; },
  };
}

export const INITIAL_PROJECT_STATE: ProjectState = assembleProjectState(
  INITIAL_IMAGE_STATE,
  INITIAL_VALUE_STUDY_STATE,
  INITIAL_METHODS_STATE,
  INITIAL_GRID_STATE,
  INITIAL_VIEW_STATE
);
