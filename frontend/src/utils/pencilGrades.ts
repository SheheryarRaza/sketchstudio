import type { PencilHardness, ValueLayerMeta, MediumType } from '../types/studio';

export interface PencilGradeInfo {
  grade: PencilHardness;
  name: string;
  displayName: string;
  badge?: string;
  category: string;
  toneValue: number; // 0-255 ideal darkness target
  recommendedFor: string;
  strokeAdvice: string;
  hexPreview: string;
  mediums: MediumType[];
}

export const PENCIL_DATABASE: Record<PencilHardness, PencilGradeInfo> = {
  '9H': { grade: '9H', name: '9H Hard Graphite', displayName: '9H', badge: '9H', category: 'Hard (Light/Construction)', toneValue: 250, recommendedFor: 'Ultra-faint guidelines, technical measurements', strokeAdvice: 'Feather-light touch, easily indents paper', hexPreview: '#f1f5f9', mediums: ['graphite'] },
  '8H': { grade: '8H', name: '8H Hard Graphite', displayName: '8H', badge: '8H', category: 'Hard (Light/Construction)', toneValue: 245, recommendedFor: 'Very faint grid lines and measuring bounds', strokeAdvice: 'Minimal pressure', hexPreview: '#e2e8f0', mediums: ['graphite'] },
  '7H': { grade: '7H', name: '7H Hard Graphite', displayName: '7H', badge: '7H', category: 'Hard (Light/Construction)', toneValue: 240, recommendedFor: 'Initial envelope polygons and plumb points', strokeAdvice: 'Light holding grip', hexPreview: '#cbd5e1', mediums: ['graphite'] },
  '6H': { grade: '6H', name: '6H Hard Graphite', displayName: '6H', badge: '6H', category: 'Hard (Light/Construction)', toneValue: 235, recommendedFor: 'Subtle high-key highlights and light planes', strokeAdvice: 'Keep tip sharp', hexPreview: '#94a3b8', mediums: ['graphite'] },
  '5H': { grade: '5H', name: '5H Hard Graphite', displayName: '5H', badge: '5H', category: 'Hard (Light/Construction)', toneValue: 225, recommendedFor: 'Initial facial proportional divisions', strokeAdvice: 'Delicate hatching', hexPreview: '#7e8fa6', mediums: ['graphite'] },
  '4H': { grade: '4H', name: '4H Hard Graphite', displayName: '4H', badge: '4H', category: 'Hard (Light/Construction)', toneValue: 215, recommendedFor: 'Loomis construction spheres, eye/brow alignment lines', strokeAdvice: 'Hold pencil far from tip for loose motion', hexPreview: '#6c7c94', mediums: ['graphite'] },
  '3H': { grade: '3H', name: '3H Hard Graphite', displayName: '3H', badge: '3H', category: 'Hard (Light/Construction)', toneValue: 200, recommendedFor: 'Bargue block-in contour lines and preliminary marks', strokeAdvice: 'Controlled cross-hatching', hexPreview: '#5a687d', mediums: ['graphite'] },
  '2H': { grade: '2H', name: '2H Hard Graphite', displayName: '2H', badge: '2H', category: 'Hard (Light/Construction)', toneValue: 185, recommendedFor: 'Light halftones, highlights turning toward light', strokeAdvice: 'Smooth layering without digging paper', hexPreview: '#4a576c', mediums: ['graphite'] },
  'H':  { grade: 'H',  name: 'H Firm Graphite',   displayName: 'H',  badge: 'H',  category: 'Medium (Transitions)',     toneValue: 170, recommendedFor: 'Delicate forehead and nose bridge half-tones', strokeAdvice: 'Consistent pressure on side of lead', hexPreview: '#3d485b', mediums: ['graphite'] },
  'F':  { grade: 'F',  name: 'F Fine Point',      displayName: 'F',  badge: 'F',  category: 'Medium (Transitions)',     toneValue: 155, recommendedFor: 'Clean sharp contour transitions', strokeAdvice: 'Hold at 45 degree angle', hexPreview: '#333e50', mediums: ['graphite'] },
  'HB': { grade: 'HB', name: 'HB Standard',        displayName: 'HB', badge: 'HB', category: 'Medium (Transitions)',     toneValue: 135, recommendedFor: 'General midtones, primary shadow boundary mapping', strokeAdvice: 'Versatile shading, smooth blending', hexPreview: '#293241', mediums: ['graphite'] },
  'B':  { grade: 'B',  name: 'B Soft Graphite',    displayName: 'B',  badge: 'B',  category: 'Medium (Transitions)',     toneValue: 115, recommendedFor: 'Cheek plane turns, eye socket foundation', strokeAdvice: 'Soft circular strokes', hexPreview: '#202734', mediums: ['graphite'] },
  '2B': { grade: '2B', name: '2B Soft Graphite',   displayName: '2B', badge: '2B', category: 'Soft (Dark/Shadows)',      toneValue: 95,  recommendedFor: 'Core shadow shapes, hair base values', strokeAdvice: 'Broad side-lead filling', hexPreview: '#181e28', mediums: ['graphite'] },
  '3B': { grade: '3B', name: '3B Soft Graphite',   displayName: '3B', badge: '3B', category: 'Soft (Dark/Shadows)',      toneValue: 80,  recommendedFor: 'Under-jaw shadows, ear crevice shading', strokeAdvice: 'Layered tone buildup', hexPreview: '#121720', mediums: ['graphite'] },
  '4B': { grade: '4B', name: '4B Soft Graphite',   displayName: '4B', badge: '4B', category: 'Soft (Dark/Shadows)',      toneValue: 65,  recommendedFor: 'Cast shadows under nose and lips, dark iris', strokeAdvice: 'Rich velvety pressure', hexPreview: '#0e121a', mediums: ['graphite'] },
  '5B': { grade: '5B', name: '5B Soft Graphite',   displayName: '5B', badge: '5B', category: 'Soft (Dark/Shadows)',      toneValue: 50,  recommendedFor: 'Deep nostril cavities, shadow under chin', strokeAdvice: 'Avoid smudging with hand guard', hexPreview: '#0a0d13', mediums: ['graphite'] },
  '6B': { grade: '6B', name: '6B Extra Soft',      displayName: '6B', badge: '6B', category: 'Soft (Dark/Shadows)',      toneValue: 35,  recommendedFor: 'Deep dark accents, pupil centers, dark lash lines', strokeAdvice: 'Firm velvety strokes, soft touch', hexPreview: '#06080d', mediums: ['graphite'] },
  '7B': { grade: '7B', name: '7B Matte Graphite',  displayName: '7B', badge: '7B', category: 'Deep Occlusion',           toneValue: 25,  recommendedFor: 'High-contrast cast shadows, rich darks', strokeAdvice: 'Builds quick dark mass without shine', hexPreview: '#040508', mediums: ['graphite'] },
  '8B': { grade: '8B', name: '8B Black Graphite',  displayName: '8B', badge: '8B', category: 'Deep Occlusion',           toneValue: 15,  recommendedFor: 'Max graphite darks, occlusion corners', strokeAdvice: 'Use blunt point for rich depth', hexPreview: '#020305', mediums: ['graphite'] },
  '9B': { grade: '9B', name: '9B Ultra Dark',      displayName: '9B', badge: '9B', category: 'Deep Occlusion',           toneValue: 5,   recommendedFor: 'Absolute deepest blacks in graphite', strokeAdvice: 'Very soft, use fixative later', hexPreview: '#010203', mediums: ['graphite'] },
  'Charcoal': { grade: 'Charcoal', name: 'Willow/Compressed Charcoal', displayName: 'Charcoal', badge: 'Ch', category: 'Deep Occlusion', toneValue: 0, recommendedFor: 'Pure non-reflective matte black occlusions', strokeAdvice: 'Blend with tortillon or chamois', hexPreview: '#000000', mediums: ['charcoal'] },
  'White_Chalk': { grade: 'White_Chalk', name: 'White Chalk / Gel Pen', displayName: 'White', badge: 'W', category: 'Highlights (Toned Paper)', toneValue: 255, recommendedFor: 'Specular highlights (cornea spark, nose tip)', strokeAdvice: 'Direct pinpoint application on toned paper', hexPreview: '#ffffff', mediums: ['graphite', 'charcoal'] },
  'Vine_Charcoal': { grade: 'Vine_Charcoal', name: 'Vine Charcoal', displayName: 'Vine', badge: 'Vn', category: 'Light (Lay-In & Halftones)', toneValue: 205, recommendedFor: 'Initial lay-in, wipeable gesture, light halftones', strokeAdvice: 'Feather-light sweeps; dusts off completely with chamois', hexPreview: '#6b6e76', mediums: ['charcoal'] },
  'Willow_Charcoal': { grade: 'Willow_Charcoal', name: 'Willow Charcoal', displayName: 'Willow', badge: 'Wl', category: 'Medium (Transitions & Massing)', toneValue: 155, recommendedFor: 'Broad midtone transitions, facial form turns', strokeAdvice: 'Soft velvety sweeps, blend with tortillon or stump', hexPreview: '#3b3c40', mediums: ['charcoal'] },
  'Charcoal_Pencil_HB': { grade: 'Charcoal_Pencil_HB', name: 'Charcoal Pencil (HB / Firm)', displayName: 'HB Pencil', badge: 'CP-HB', category: 'Medium (Transitions & Massing)', toneValue: 130, recommendedFor: 'Initial fine contour mapping, delicate halftones', strokeAdvice: 'Light holding grip, crisp edges', hexPreview: '#323337', mediums: ['charcoal'] },
  'Charcoal_Pencil_Hard': { grade: 'Charcoal_Pencil_Hard', name: 'Hard Charcoal Pencil (2B)', displayName: 'Hard Pencil', badge: 'CP-H', category: 'Medium (Transitions & Massing)', toneValue: 110, recommendedFor: 'Crisp contour lines, fine facial detail, sharp edges', strokeAdvice: 'Firm controlled point, sharpen with knife', hexPreview: '#28292d', mediums: ['charcoal'] },
  'Charcoal_Pencil_Medium': { grade: 'Charcoal_Pencil_Medium', name: 'Medium Charcoal Pencil (4B)', displayName: 'Med Pencil', badge: 'CP-M', category: 'Soft (Dark/Shadows)', toneValue: 70, recommendedFor: 'Core shadow shapes, eye socket depth, hair masses', strokeAdvice: 'Layered tone buildup preserving paper tooth', hexPreview: '#18191c', mediums: ['charcoal'] },
  'Charcoal_Pencil_Soft': { grade: 'Charcoal_Pencil_Soft', name: 'Soft Charcoal Pencil (6B)', displayName: 'Soft Pencil', badge: 'CP-S', category: 'Soft (Dark/Shadows)', toneValue: 40, recommendedFor: 'Deep shadow block-in, dark hair accents, shadow shapes', strokeAdvice: 'Rich velvety deposit, gentle pressure', hexPreview: '#0c0d0e', mediums: ['charcoal'] },
  'Charcoal_Pencil_Extra_Soft': { grade: 'Charcoal_Pencil_Extra_Soft', name: 'Extra Soft Charcoal Pencil (8B)', displayName: 'Ex-Soft Pencil', badge: 'CP-XS', category: 'Deep Occlusion', toneValue: 20, recommendedFor: 'Deep cast shadow accents, pupil depth, dark massing', strokeAdvice: 'Broad dark velvety strokes; very soft point', hexPreview: '#050607', mediums: ['charcoal'] },
  'Compressed_Charcoal': { grade: 'Compressed_Charcoal', name: 'Compressed Charcoal Stick', displayName: 'Compressed', badge: 'Cp', category: 'Deep Occlusion', toneValue: 0, recommendedFor: 'Pitch-black occlusion accents, pupil center, max darks', strokeAdvice: 'Heavy opaque pressure, permanent non-reflective matte black', hexPreview: '#000000', mediums: ['charcoal'] },
};

/**
 * Returns available pencil/material grades for the specified medium preset.
 */
export function getPencilGradesForMedium(medium: MediumType = 'graphite'): PencilHardness[] {
  if (medium === 'charcoal') {
    return [
      'White_Chalk',
      'Vine_Charcoal',
      'Willow_Charcoal',
      'Charcoal_Pencil_HB',
      'Charcoal_Pencil_Hard',
      'Charcoal_Pencil_Medium',
      'Charcoal_Pencil_Soft',
      'Charcoal_Pencil_Extra_Soft',
      'Compressed_Charcoal',
    ];
  }

  return [
    'White_Chalk',
    '9H', '8H', '7H', '6H', '5H', '4H', '3H', '2H',
    'H', 'F', 'HB', 'B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B',
  ];
}

/**
 * Formats a consistent tooltip description for a pencil/material grade,
 * preventing Feature Envy across UI panels.
 */
export function formatPencilTooltip(grade: PencilHardness): string {
  const info = PENCIL_DATABASE[grade];
  if (!info) return grade;
  return `${info.name} — ${info.category}\nUsage: ${info.recommendedFor}\nTechnique: ${info.strokeAdvice}`;
}

const GRAPHITE_PENCIL_BY_COUNT: Record<number, PencilHardness[]> = {
  3: ['2H', 'HB', '6B'],
  4: ['4H', 'HB', '2B', '6B'],
  5: ['4H', '2H', 'HB', '4B', '8B'],
  6: ['6H', '2H', 'HB', '2B', '4B', '8B'],
  7: ['White_Chalk', '4H', '2H', 'HB', '2B', '4B', '8B'],
  8: ['White_Chalk', '4H', '2H', 'F', 'HB', '2B', '4B', '8B'],
  9: ['White_Chalk', '6H', '4H', '2H', 'HB', '2B', '4B', '6B', '9B'],
};

const CHARCOAL_PENCIL_BY_COUNT: Record<number, PencilHardness[]> = {
  3: ['Vine_Charcoal', 'Charcoal_Pencil_Medium', 'Compressed_Charcoal'],
  4: ['Vine_Charcoal', 'Willow_Charcoal', 'Charcoal_Pencil_Soft', 'Compressed_Charcoal'],
  5: ['Vine_Charcoal', 'Willow_Charcoal', 'Charcoal_Pencil_Hard', 'Charcoal_Pencil_Soft', 'Compressed_Charcoal'],
  6: ['Vine_Charcoal', 'Willow_Charcoal', 'Charcoal_Pencil_Hard', 'Charcoal_Pencil_Medium', 'Charcoal_Pencil_Soft', 'Compressed_Charcoal'],
  7: ['White_Chalk', 'Vine_Charcoal', 'Willow_Charcoal', 'Charcoal_Pencil_Hard', 'Charcoal_Pencil_Medium', 'Charcoal_Pencil_Soft', 'Compressed_Charcoal'],
  8: ['White_Chalk', 'Vine_Charcoal', 'Willow_Charcoal', 'Charcoal_Pencil_Hard', 'Charcoal_Pencil_Medium', 'Charcoal_Pencil_Soft', 'Charcoal_Pencil_Extra_Soft', 'Compressed_Charcoal'],
  9: ['White_Chalk', 'Vine_Charcoal', 'Willow_Charcoal', 'Charcoal_Pencil_HB', 'Charcoal_Pencil_Hard', 'Charcoal_Pencil_Medium', 'Charcoal_Pencil_Soft', 'Charcoal_Pencil_Extra_Soft', 'Compressed_Charcoal'],
};

/**
 * Generate default N-level Tonal Layer metadata (3 to 9 steps) scoped to the
 * chosen Medium Preset per ADR-0005.
 */
export function generateDefaultLayerMeta(levels: number, medium: MediumType = 'graphite'): ValueLayerMeta[] {
  const count = Math.max(3, Math.min(9, levels));

  const namesByCount: Record<number, string[]> = {
    3: ['Highlights & Lights', 'Midtones', 'Shadows & Darks'],
    4: ['Highlights', 'Halftones', 'Core Shadows', 'Deep Darks'],
    5: ['Highlights (Specular)', 'Light Halftone', 'Midtone Form', 'Core Shadow', 'Occlusion / Deep Dark'],
    6: ['Specular Highlights', 'Light Side', 'Center Halftone', 'Form Shadow', 'Reflected Light & Core', 'Cast Shadow & Accents'],
    7: ['White Highlight', 'High Light', 'Light Midtone', 'Base Midtone', 'Form Shadow', 'Core Shadow', 'Deep Occlusion'],
    8: ['White Accent', 'Highlight', 'Light Half', 'Medium Half', 'Dark Half', 'Form Shadow', 'Core Shadow', 'Deep Cast Shadow'],
    9: ['Value 1: White', 'Value 2: High Light', 'Value 3: Light', 'Value 4: Low Light', 'Value 5: Midtone', 'Value 6: High Dark', 'Value 7: Dark', 'Value 8: Low Dark', 'Value 9: Black Accent'],
  };

  const pencilByCount = medium === 'charcoal' ? CHARCOAL_PENCIL_BY_COUNT : GRAPHITE_PENCIL_BY_COUNT;

  const names = namesByCount[count] || namesByCount[5];
  const pencils = pencilByCount[count] || pencilByCount[5];

  const meta: ValueLayerMeta[] = [];
  for (let i = 0; i < count; i++) {
    const pencil = pencils[i] || (medium === 'charcoal' ? 'Willow_Charcoal' : 'HB');
    const pencilInfo = PENCIL_DATABASE[pencil];

    meta.push({
      id: `layer-${count}-${i + 1}`,
      name: names[i] || `Value Step ${i + 1}`,
      pencilGrade: pencil,
      pencilDescription: `${pencilInfo.name} - ${pencilInfo.recommendedFor}`,
      visible: true,
      opacity: 1.0,
    });
  }

  return meta;
}
