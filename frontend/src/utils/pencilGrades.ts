import type { PencilHardness, ValueLayer } from '../types/studio';

export interface PencilGradeInfo {
  grade: PencilHardness;
  name: string;
  category: 'Hard (Light/Construction)' | 'Medium (Transitions)' | 'Soft (Dark/Shadows)' | 'Deep Occlusion';
  toneValue: number; // 0-255 ideal darkness target
  recommendedFor: string;
  strokeAdvice: string;
  hexPreview: string;
}

export const PENCIL_DATABASE: Record<PencilHardness, PencilGradeInfo> = {
  '9H': { grade: '9H', name: '9H Hard Graphite', category: 'Hard (Light/Construction)', toneValue: 250, recommendedFor: 'Ultra-faint guidelines, technical measurements', strokeAdvice: 'Feather-light touch, easily indents paper', hexPreview: '#f1f5f9' },
  '8H': { grade: '8H', name: '8H Hard Graphite', category: 'Hard (Light/Construction)', toneValue: 245, recommendedFor: 'Very faint grid lines and measuring bounds', strokeAdvice: 'Minimal pressure', hexPreview: '#e2e8f0' },
  '7H': { grade: '7H', name: '7H Hard Graphite', category: 'Hard (Light/Construction)', toneValue: 240, recommendedFor: 'Initial envelope polygons and plumb points', strokeAdvice: 'Light holding grip', hexPreview: '#cbd5e1' },
  '6H': { grade: '6H', name: '6H Hard Graphite', category: 'Hard (Light/Construction)', toneValue: 235, recommendedFor: 'Subtle high-key highlights and light planes', strokeAdvice: 'Keep tip sharp', hexPreview: '#94a3b8' },
  '5H': { grade: '5H', name: '5H Hard Graphite', category: 'Hard (Light/Construction)', toneValue: 225, recommendedFor: 'Initial facial proportional divisions', strokeAdvice: 'Delicate hatching', hexPreview: '#7e8fa6' },
  '4H': { grade: '4H', name: '4H Hard Graphite', category: 'Hard (Light/Construction)', toneValue: 215, recommendedFor: 'Loomis construction spheres, eye/brow alignment lines', strokeAdvice: 'Hold pencil far from tip for loose motion', hexPreview: '#6c7c94' },
  '3H': { grade: '3H', name: '3H Hard Graphite', category: 'Hard (Light/Construction)', toneValue: 200, recommendedFor: 'Bargue block-in contour lines and preliminary marks', strokeAdvice: 'Controlled cross-hatching', hexPreview: '#5a687d' },
  '2H': { grade: '2H', name: '2H Hard Graphite', category: 'Hard (Light/Construction)', toneValue: 185, recommendedFor: 'Light halftones, highlights turning toward light', strokeAdvice: 'Smooth layering without digging paper', hexPreview: '#4a576c' },
  'H':  { grade: 'H',  name: 'H Firm Graphite',   category: 'Medium (Transitions)',     toneValue: 170, recommendedFor: 'Delicate forehead and nose bridge half-tones', strokeAdvice: 'Consistent pressure on side of lead', hexPreview: '#3d485b' },
  'F':  { grade: 'F',  name: 'F Fine Point',      category: 'Medium (Transitions)',     toneValue: 155, recommendedFor: 'Clean sharp contour transitions', strokeAdvice: 'Hold at 45 degree angle', hexPreview: '#333e50' },
  'HB': { grade: 'HB', name: 'HB Standard',        category: 'Medium (Transitions)',     toneValue: 135, recommendedFor: 'General midtones, primary shadow boundary mapping', strokeAdvice: 'Versatile shading, smooth blending', hexPreview: '#293241' },
  'B':  { grade: 'B',  name: 'B Soft Graphite',    category: 'Medium (Transitions)',     toneValue: 115, recommendedFor: 'Cheek plane turns, eye socket foundation', strokeAdvice: 'Soft circular strokes', hexPreview: '#202734' },
  '2B': { grade: '2B', name: '2B Soft Graphite',   category: 'Soft (Dark/Shadows)',      toneValue: 95,  recommendedFor: 'Core shadow shapes, hair base values', strokeAdvice: 'Broad side-lead filling', hexPreview: '#181e28' },
  '3B': { grade: '3B', name: '3B Soft Graphite',   category: 'Soft (Dark/Shadows)',      toneValue: 80,  recommendedFor: 'Under-jaw shadows, ear crevice shading', strokeAdvice: 'Layered tone buildup', hexPreview: '#121720' },
  '4B': { grade: '4B', name: '4B Soft Graphite',   category: 'Soft (Dark/Shadows)',      toneValue: 65,  recommendedFor: 'Cast shadows under nose and lips, dark iris', strokeAdvice: 'Rich velvety pressure', hexPreview: '#0e121a' },
  '5B': { grade: '5B', name: '5B Soft Graphite',   category: 'Soft (Dark/Shadows)',      toneValue: 50,  recommendedFor: 'Deep nostril cavities, shadow under chin', strokeAdvice: 'Avoid smudging with hand guard', hexPreview: '#0a0d13' },
  '6B': { grade: '6B', name: '6B Extra Soft',      category: 'Soft (Dark/Shadows)',      toneValue: 35,  recommendedFor: 'Deep dark accents, pupil centers, dark lash lines', strokeAdvice: 'Firm velvety strokes, soft touch', hexPreview: '#06080d' },
  '7B': { grade: '7B', name: '7B Matte Graphite',  category: 'Deep Occlusion',           toneValue: 25,  recommendedFor: 'High-contrast cast shadows, rich darks', strokeAdvice: 'Builds quick dark mass without shine', hexPreview: '#040508' },
  '8B': { grade: '8B', name: '8B Black Graphite',  category: 'Deep Occlusion',           toneValue: 15,  recommendedFor: 'Max graphite darks, occlusion corners', strokeAdvice: 'Use blunt point for rich depth', hexPreview: '#020305' },
  '9B': { grade: '9B', name: '9B Ultra Dark',      category: 'Deep Occlusion',           toneValue: 5,   recommendedFor: 'Absolute deepest blacks in graphite', strokeAdvice: 'Very soft, use fixative later', hexPreview: '#010203' },
  'Charcoal': { grade: 'Charcoal', name: 'Willow/Compressed Charcoal', category: 'Deep Occlusion', toneValue: 0, recommendedFor: 'Pure non-reflective matte black occlusions', strokeAdvice: 'Blend with tortillon or chamois', hexPreview: '#000000' },
  'White_Chalk': { grade: 'White_Chalk', name: 'White Chalk / Gel Pen', category: 'Hard (Light/Construction)', toneValue: 255, recommendedFor: 'Specular highlights (cornea spark, nose tip)', strokeAdvice: 'Direct pinpoint application on toned paper', hexPreview: '#ffffff' },
};

/**
 * Generate default N-level value layers (3 to 9 steps)
 */
export function generateDefaultValueLayers(levels: number): ValueLayer[] {
  const count = Math.max(3, Math.min(9, levels));
  const layers: ValueLayer[] = [];
  const stepSize = 255 / count;

  const namesByCount: Record<number, string[]> = {
    3: ['Highlights & Lights', 'Midtones', 'Shadows & Darks'],
    4: ['Highlights', 'Halftones', 'Core Shadows', 'Deep Darks'],
    5: ['Highlights (Specular)', 'Light Halftone', 'Midtone Form', 'Core Shadow', 'Occlusion / Deep Dark'],
    6: ['Specular Highlights', 'Light Side', 'Center Halftone', 'Form Shadow', 'Reflected Light & Core', 'Cast Shadow & Accents'],
    7: ['White Highlight', 'High Light', 'Light Midtone', 'Base Midtone', 'Form Shadow', 'Core Shadow', 'Deep Occlusion'],
    8: ['White Accent', 'Highlight', 'Light Half', 'Medium Half', 'Dark Half', 'Form Shadow', 'Core Shadow', 'Deep Cast Shadow'],
    9: ['Value 1: White', 'Value 2: High Light', 'Value 3: Light', 'Value 4: Low Light', 'Value 5: Midtone', 'Value 6: High Dark', 'Value 7: Dark', 'Value 8: Low Dark', 'Value 9: Black Accent'],
  };

  const pencilByCount: Record<number, PencilHardness[]> = {
    3: ['2H', 'HB', '6B'],
    4: ['4H', 'HB', '2B', '6B'],
    5: ['4H', '2H', 'HB', '4B', '8B'],
    6: ['6H', '2H', 'HB', '2B', '4B', '8B'],
    7: ['White_Chalk', '4H', '2H', 'HB', '2B', '4B', '8B'],
    8: ['White_Chalk', '4H', '2H', 'F', 'HB', '2B', '4B', '8B'],
    9: ['White_Chalk', '6H', '4H', '2H', 'HB', '2B', '4B', '6B', 'Charcoal'],
  };

  const names = namesByCount[count] || namesByCount[5];
  const pencils = pencilByCount[count] || pencilByCount[5];

  for (let i = 0; i < count; i++) {
    const maxThresh = Math.round(255 - (i * stepSize));
    const minThresh = Math.round(Math.max(0, 255 - ((i + 1) * stepSize)));
    const pencil = pencils[i] || 'HB';
    const pencilInfo = PENCIL_DATABASE[pencil];

    const grayVal = Math.round((minThresh + maxThresh) / 2);
    const hex = `rgb(${grayVal}, ${grayVal}, ${grayVal})`;

    layers.push({
      id: `layer-${count}-${i + 1}`,
      name: names[i] || `Value Step ${i + 1}`,
      minThreshold: minThresh,
      maxThreshold: maxThresh,
      color: hex,
      pencilGrade: pencil,
      pencilDescription: `${pencilInfo.name} - ${pencilInfo.recommendedFor}`,
      visible: true,
      opacity: 1.0,
    });
  }

  return layers;
}
