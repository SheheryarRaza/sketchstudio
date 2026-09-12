import type { DrawingMethodType } from './studio';

export interface MethodGuideStep {
  stepNumber: number;
  title: string;
  description: string;
  pencilRecommendation: string;
  artistTip: string;
}

export interface DrawingMethodInfo {
  type: DrawingMethodType;
  title: string;
  shortLabel: string;
  creator: string;
  era: string;
  shortSummary: string;
  corePrinciple: string;
  historicalContext: string;
  anatomicalRules: string[];
  commonMistakes: string[];
  steps: MethodGuideStep[];
}

export const DRAWING_METHODS_DATABASE: Record<DrawingMethodType, DrawingMethodInfo> = {
  none: {
    type: 'none',
    title: 'Freehand / No Overlay',
    shortLabel: 'Freehand',
    creator: 'Direct Observation',
    era: 'Universal',
    shortSummary: 'Unobstructed reference view without structural overlays.',
    corePrinciple: 'Train your pure eye-to-hand coordination and direct perceptual judgment.',
    historicalContext: 'Pure perceptual drawing relies on internalizing constructive habits so that construction happens mentally rather than explicitly on the paper.',
    anatomicalRules: ['Squint to unify values', 'Check angles against vertical and horizontal references'],
    commonMistakes: ['Rushing into small details (eyelashes, nostrils) before establishing overall head proportions.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Initial Sighting',
        description: 'Observe the gesture, tilt, and lighting direction of the model.',
        pencilRecommendation: '2H or 4H',
        artistTip: 'Keep your hand relaxed and move your entire arm from the shoulder.',
      }
    ]
  },
  loomis: {
    type: 'loomis',
    title: 'Loomis Method',
    shortLabel: 'Loomis',
    creator: 'Andrew Loomis',
    era: '1943 (Fun With a Pencil / Figure Drawing For All It\'s Worth)',
    shortSummary: '3D spherical cranium construction with sliced sides, brow line cross, and Rule of Thirds facial proportions.',
    corePrinciple: 'Treating the human head as a solid 3D sphere with flattened sides allows rotation in any 3D perspective while maintaining facial feature alignments.',
    historicalContext: 'Andrew Loomis was an American illustrator whose constructive books revolutionized head construction for commercial and fine artists worldwide.',
    anatomicalRules: [
      'The cranium is a ball with two flattened side planes representing the temporal bones (width is ~2/3 of ball diameter).',
      'The face divides into 3 equal thirds: Hairline to Brow Line, Brow Line to Base of Nose, Base of Nose to Bottom of Chin.',
      'The top of the ear aligns horizontally with the Brow Line; the bottom of the ear aligns with the Base of the Nose.',
      'The eyes sit exactly halfway between the top of the cranial sphere and the bottom of the chin.',
    ],
    commonMistakes: [
      'Placing eyes too high on the head (forgetting that half the skull height is the cranial vault).',
      'Drawing the side oval flat instead of angling it with the head tilt.',
      'Failing to slice off the side of the sphere, resulting in an overly wide, bowling-ball head.',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Cranial Sphere & Side Slice',
        description: 'Draw a circle representing the braincase. Slice off 1/6th of each side with an oval to create the flattened temporal plane.',
        pencilRecommendation: '4H (Light Construction)',
        artistTip: 'Rotate the tilt of the side oval to immediately establish whether the subject is looking up, down, or tilted.',
      },
      {
        stepNumber: 2,
        title: 'The Brow Cross & Center Line',
        description: 'Wrap the brow line across the equator of the sphere. Drop the vertical facial center line down the midline of the nose and chin.',
        pencilRecommendation: '4H',
        artistTip: 'Ensure the brow line curves around the sphere like a rubber band to define 3D volume.',
      },
      {
        stepNumber: 3,
        title: 'The Three Proportional Thirds',
        description: 'Measure the distance from Hairline to Brow Line. Duplicate that unit downward to place the Nose Base, and duplicate again to place the Chin.',
        pencilRecommendation: '2H',
        artistTip: 'Check the model: in foreshortened or tilted poses, perspective will compress the lower or upper thirds.',
      },
      {
        stepNumber: 4,
        title: 'Jaw Line & Ear Box',
        description: 'Connect the cheekbone and temporal oval down to the chin to form the jaw plane. Place the ear in the lower-back quadrant of the temporal oval.',
        pencilRecommendation: 'HB',
        artistTip: 'The ear angle follows the angle of the jaw ramus.',
      }
    ]
  },
  reilly: {
    type: 'reilly',
    title: 'Reilly Abstraction / Rhythms',
    shortLabel: 'Reilly',
    creator: 'Frank J. Reilly',
    era: 'Art Students League of New York (1930s-1960s)',
    shortSummary: 'Flowing harmonic rhythm lines connecting facial landmarks into a graceful continuous structural web.',
    corePrinciple: 'Human anatomy follows continuous curvilinear rhythms where tension and form flow smoothly from one feature into another.',
    historicalContext: 'Frank Reilly trained thousands of legendary American illustrators. His system combines classical academic structure with dynamic visual flow.',
    anatomicalRules: [
      'The brow rhythm swoops down across the bridge of the nose and continues along the cheekbone into the jawline.',
      'The muzzle circle encompasses the upper and lower lips, anchoring into the chin ball and nasal wing creases.',
      'The neck rhythms connect the sternocleidomastoid muscles behind the ear down to the sternal notch (pit of the neck).',
      'The eye socket rhythms form dynamic butterfly-wing shapes balancing across the glabella.',
    ],
    commonMistakes: [
      'Drawing isolated features (lips, eyes) as disconnected stickers instead of following the rhythm web.',
      'Making rhythm lines rigid and straight rather than organic flowing arcs.',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Center Line & Keystone',
        description: 'Establish the facial midline and the trapezoidal keystone between the eyebrows (glabella).',
        pencilRecommendation: '4H',
        artistTip: 'The keystone is the anchor from which all upper facial rhythms emanate.',
      },
      {
        stepNumber: 2,
        title: 'Brow to Jaw Rhythm Swoop',
        description: 'Draw the sweeping harmonic arc from the outer brow crest down around the cheekbone to the bottom of the chin.',
        pencilRecommendation: '3H',
        artistTip: 'This creates the structural mask that separates the front plane of the face from the side plane.',
      },
      {
        stepNumber: 3,
        title: 'Muzzle & Lip Sphere',
        description: 'Draw the barrel of the mouth (orbicularis oris) as a cylinder resting between the base of the nose and the chin notch.',
        pencilRecommendation: '2H',
        artistTip: 'Remember teeth curve backward into the skull—lips must wrap around this cylindrical curve.',
      },
      {
        stepNumber: 4,
        title: 'Neck & Trapezius Flow',
        description: 'Connect the sternocleidomastoid ribbons from behind the ears down to the clavicle pit.',
        pencilRecommendation: 'HB',
        artistTip: 'The neck is not a vertical column; it tilts forward at roughly 15 degrees.',
      }
    ]
  },
  bargue: {
    type: 'bargue',
    title: 'Charles Bargue / Sight-Size Block-In',
    shortLabel: 'Bargue',
    creator: 'Charles Bargue & Jean-Léon Gérôme',
    era: '1866 (Cours de Dessin - French Academic Method)',
    shortSummary: 'Envelope bounding polygons, vertical plumb lines, horizontal levels, and straight-line angular contour reduction.',
    corePrinciple: 'Capture absolute spatial fidelity by enclosing complex curves inside simplified straight angular envelopes and checking alignment with vertical plumb lines.',
    historicalContext: 'The Bargue Drawing Course was the standard curriculum for the French Académie des Beaux-Arts and was famously copied by Vincent van Gogh to master draftsmanship.',
    anatomicalRules: [
      'Never draw a curve until you have established the straight lines and apex points that bound it.',
      'Every landmark on the left side of the face must be horizontally checked across to its partner on the right.',
      'Drop a vertical plumb line from the tear duct or brow crest to check what falls directly beneath it (mouth corner, chin corner, collarbone).',
    ],
    commonMistakes: [
      'Premature curving: drawing rounded features before locking down angular tilt vertices.',
      'Eyeballing distances without using plumb lines or comparative levels.',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Outer Bounding Envelope',
        description: 'Enclose the entire head, hair, and shoulders in a 5-to-8 sided straight-line polygon.',
        pencilRecommendation: '4H (Ultra Sharp)',
        artistTip: 'Touch only the outermost extreme apex points (top of hair, chin, cheekbone, shoulder edge).',
      },
      {
        stepNumber: 2,
        title: 'Plumb Line Alignments',
        description: 'Drop vertical plumb lines from prominent landmarks (e.g. inner corner of the eye) down through the drawing.',
        pencilRecommendation: '3H',
        artistTip: 'Check what aligns: does the tear duct align with the edge of the nostril or the corner of the mouth?',
      },
      {
        stepNumber: 3,
        title: 'Level Bar Checks',
        description: 'Draw horizontal level lines across the eyes, nostrils, lip corners, and jaw points to verify tilt and tilt tilt symmetry.',
        pencilRecommendation: '3H',
        artistTip: 'Even slight head tilts will angle these horizontal levels; make sure all levels are parallel in perspective.',
      },
      {
        stepNumber: 4,
        title: 'Straight-Line Articulation',
        description: 'Break down curved contours (eyelids, lips, jaw) into 2 or 3 short straight segments.',
        pencilRecommendation: 'HB',
        artistTip: 'Straight lines make errors immediately obvious; you will round them smoothly later during value modeling.',
      }
    ]
  },
  asaro: {
    type: 'asaro',
    title: 'Asaro Head / Planar Analysis',
    shortLabel: 'Asaro',
    creator: 'John Asaro',
    era: '1976 (Planes of the Head)',
    shortSummary: 'Low-poly 3D geometric facet breakdown of the facial planes to analyze light direction and form turning.',
    corePrinciple: 'All curved organic forms on the face can be simplified into flat polygonal planes that face distinct directions in 3D space.',
    historicalContext: 'John Asaro created the famous faceted resin head sculpture used in art schools worldwide to master lighting, core shadows, and value consistency.',
    anatomicalRules: [
      'Planes facing directly toward the light source receive maximum illumination (Highlights / Light Side).',
      'Planes turning 90 degrees away from the light source form the Terminator / Core Shadow boundary.',
      'Planes facing downward (under brow, under nose, under lower lip, under chin) are naturally in cast or form shadow under overhead lighting.',
    ],
    commonMistakes: [
      'Shading a smooth gradient across a plane that should have a unified flat value.',
      'Failing to identify the light source angle before shading the individual facets.',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Primary Plane Separation (Front vs Side)',
        description: 'Separate the front plane of the face from the temporal and cheek side planes.',
        pencilRecommendation: '3H',
        artistTip: 'The cheekbone corner and temporal line mark the hard boundary between front and side planes.',
      },
      {
        stepNumber: 2,
        title: 'The Eye Sockets & Nose Keystone Planes',
        description: 'Carve out the triangular wedge of the nose and the hexagonal sunken planes of the orbital sockets.',
        pencilRecommendation: '2H',
        artistTip: 'The orbital socket is sunken like a mask; under top lighting, the entire upper socket is in shadow.',
      },
      {
        stepNumber: 3,
        title: 'Cheek, Lip & Chin Facets',
        description: 'Subdivide the cheek into upper zygomatic, middle buccinator, and lower jaw planes. Break the mouth into 5 distinct lip pillows (3 upper, 2 lower).',
        pencilRecommendation: 'HB',
        artistTip: 'The 3 pillows of the upper lip face downward (shadowed); the 2 pillows of the lower lip face upward (lighted).',
      },
      {
        stepNumber: 4,
        title: 'Terminator Mapping',
        description: 'Trace the continuous line of planes where the form turns into shadow.',
        pencilRecommendation: '2B / 4B',
        artistTip: 'Group all shadow planes into a single unified dark value first before adding reflected light.',
      }
    ]
  },
  triangulation: {
    type: 'triangulation',
    title: 'Comparative Measurement & Triangulation',
    shortLabel: 'Comparative',
    creator: 'Atelier Academies',
    era: 'Classical Academic Tradition',
    shortSummary: 'Using a base unit (e.g. eye-width or head height) with calipers to triangulate geometric distances and angles.',
    corePrinciple: 'Relational measurement eliminates spatial distortion by comparing every feature length to a standardized base unit.',
    historicalContext: 'Before grids were common, classical masters held a pencil or proportional divider at arm\'s length with locked elbow to measure proportions.',
    anatomicalRules: [
      'The width of the head at the eye line is roughly equal to 5 eye-widths.',
      'The space between the two inner eye corners (intercanthal distance) is exactly 1 eye-width.',
      'The width of the base of the nose equals 1 eye-width.',
      'The corners of the mouth align with the centers (pupils) of the eyes when the face is relaxed and neutral.',
    ],
    commonMistakes: [
      'Changing your sitting distance or posture when measuring with physical tools.',
      'Measuring features in isolation rather than comparing them directly to the chosen base unit.',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Select Your Base Unit',
        description: 'Choose a prominent, reliable landmark (standard: the width of the model\'s eye from corner to corner = 1.0 Unit).',
        pencilRecommendation: '4H',
        artistTip: 'Use our on-screen Caliper tool to lock this unit measurement.',
      },
      {
        stepNumber: 2,
        title: 'Compare Horizontal Spans',
        description: 'Check: Is the distance between the eyes equal to 1 Unit? Is the nose base 1 Unit? Is the mouth 1.5 Units?',
        pencilRecommendation: '3H',
        artistTip: 'If the nose is wider than 1 unit, the model may have a wider nasal wing or the head is slightly turned (foreshortened).',
      },
      {
        stepNumber: 3,
        title: 'Triangulate Landmark Triangle',
        description: 'Draw imaginary triangles connecting the two outer eye corners down to the tip of the chin.',
        pencilRecommendation: '2H',
        artistTip: 'The angle of this triangle immediately locks in the length and taper of the face.',
      },
      {
        stepNumber: 4,
        title: 'Vertical Multiples Check',
        description: 'Measure how many eye-units tall the entire head is (standard adult head is 7.5 to 8 eye-units tall).',
        pencilRecommendation: 'HB',
        artistTip: 'Check your physical paper drawing with your physical caliper to ensure identical ratios.',
      }
    ]
  },
  harmonic: {
    type: 'harmonic',
    title: 'Harmonic Armature & Dynamic Symmetry',
    shortLabel: 'Harmonic',
    creator: 'Jay Hambidge / Classical Greek Geometry',
    era: '1920 (The Elements of Dynamic Symmetry)',
    shortSummary: '14-line diagonal network, reciprocal diagonals, and Golden Ratio root rectangle alignments.',
    corePrinciple: 'Geometric harmonic lines establish mathematical visual balance and guide eye movement across the canvas composition.',
    historicalContext: 'Master painters from the Renaissance through the Golden Age of Illustration (Howard Pyle, N.C. Wyeth) structured entire compositions on the harmonic armature.',
    anatomicalRules: [
      'Major focal points (eyes, light-shadow terminators) resonate powerfully when placed on the intersections of primary and reciprocal diagonals (eyes of the armature).',
      'The gaze direction of the model aligns with the dominant diagonal grid orientation.',
    ],
    commonMistakes: [
      'Placing the subject strictly in the dead center without dynamic diagonal tension.',
      'Ignoring how the edges of the drawing paper dictate the angle of the harmonic diagonals.',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Primary Diagonals & Center Cross',
        description: 'Draw diagonals connecting opposite corners of the canvas, plus horizontal and vertical midlines.',
        pencilRecommendation: '4H (Faint)',
        artistTip: 'These define the 4 quadrants and the central gravity point of the composition.',
      },
      {
        stepNumber: 2,
        title: 'Reciprocal Diagonals (90-Degree Intersections)',
        description: 'Draw perpendicular lines from the remaining corners to meet the primary diagonals at right angles.',
        pencilRecommendation: '4H',
        artistTip: 'The intersection points are known as the "Eyes of the Rectangle" and are optimal placements for the subject\'s eyes.',
      },
      {
        stepNumber: 3,
        title: 'Aligning Anatomical Tilt',
        description: 'Match the tilt of the model\'s nose or jawline to one of the armature\'s diagonal vectors.',
        pencilRecommendation: '2H',
        artistTip: 'This creates subconscious harmony and dynamic flow across the entire artwork.',
      }
    ]
  }
};
