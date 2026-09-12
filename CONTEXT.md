# SketchStudio

A web-based visual analysis, measurement, and drafting studio for artists transcribing reference images onto physical drawing media.

## Language

### Analysis

**Reference Image**:
The source visual uploaded by the artist to analyze, measure, and transcribe onto physical drawing media.
_Avoid_: Picture, asset, source photo

**Value Study**:
The discrete tonal decomposition of an image into distinct light-to-dark steps (such as highlights, halftones, core shadows, and cast shadows).
_Avoid_: Black and white filter, posterization, grayscale

**Tonal Mask**:
The continuous-tone view of a Reference Image, restricted to the currently visible Tonal Layers, retaining the photographic gradient rather than quantizing it.
_Avoid_: Grayscale mode, preview, soft view

**Tonal Layer**:
An isolated threshold mask representing a specific value band in the Value Study. A band of brightness, never a stage of drawing work.
_Avoid_: Cutout, filter layer, shading layer, pass

**Value Family**:
A named group of adjacent Tonal Layers (Lights, Halftones, Shadows) defined by tonal range rather than index, so it stays coherent as the number of layers changes.
_Avoid_: Layer group, selection, tonal group

**Isolate**:
To restrict the canvas to a single Tonal Layer or Value Family, rendering it as a flat mask over a faint underlay of the Reference Image.
_Avoid_: Solo, mute, focus

**Cut Point**:
One of the N−1 shared boundary values between N adjacent Tonal Layers in a Value Study. Moving a Cut Point moves both neighboring Tonal Layers' shared edge at once, so overlapping or gapped Tonal Layers are impossible to construct.
_Avoid_: Threshold slider, band edge, max slider

**Edge Quality Map**:
The overlay and classification of contour and form boundaries on the Reference Image into distinct physical edge qualities (hard, soft, lost), guiding the artist's pencil pressure, blending, and lost-and-found contours.
_Avoid_: Outline filter, edge detector, stroke style

**Edge Quality**:
The transition sharpness across an edge boundary:
- **Hard Edge**: An abrupt, crisp boundary where two values meet with minimal transition (e.g., cast shadows, silhouette occlusions).
- **Soft Edge**: A gradual transition across turning form, where value changes smoothly over a measurable distance (e.g., form shadows, rounded contours).
- **Lost Edge**: A boundary where adjacent values match so closely that the edge disappears entirely, merging subject and background or adjacent forms.
_Avoid_: Line thickness, blur level, stroke weight

### Physical transfer

**Pencil Grade Mapping**:
The algorithmic translation of discrete tonal values into physical graphite and charcoal pencil hardness grades (e.g., 4H, 2H, HB, 2B, 4B, 6B, 8B, Charcoal).
_Avoid_: Pencil tool, brush size, shading filter

**Physical Caliper**:
The interactive calibration mechanism that maps display pixels to physical real-world units (mm, cm, inches) via a standard physical reference or ruler. Sole owner of the word "calibration" in this project.
_Avoid_: Screen ruler, zoom tool

**Paper Mapping**:
The declared relationship between the Reference Image and a physical paper size (e.g., "this photo fills A4 width"), used to compute Transfer Grid spacing in image space. Independent of Physical Caliper: Physical Caliper's screen calibration only governs the optional True Size on-screen view, never grid spacing or export dimensions.
_Avoid_: Scale, calibration, 1:1, print size

**True Size**:
An on-screen view mode that renders the Reference Image at its literal physical size on this screen, combining the Paper Mapping's declared real-world size with Physical Caliper's screen calibration. Disabled until both are set; never used for Transfer Grid spacing or export dimensions.
_Avoid_: 1:1 scale, actual size, zoom to fit

**Transfer Grid**:
The overlay of evenly spaced cells drawn across the Reference Image at a declared physical size, sized in image space from the Paper Mapping and used to transcribe proportions onto the physical page square by square.
_Avoid_: Grid overlay, graph paper, squares

**Harmonic Armature**:
The geometric network of diagonals, reciprocals, and grid subdivisions across the canvas used for composition, alignment, and proportional transfer.
_Avoid_: Diagonal lines, angle guide

### Construction

**Drawing Method**:
A structured visual construction technique (e.g., Loomis, Reilly, Sight-Size, Bargue, Asaro) used to measure, construct, and verify anatomy, perspective, and values.
_Avoid_: Drawing style, drawing filter, drawing template

**Anchor Placement**:
The positioning of a Drawing Method's construction anchors onto the Reference Image, performed by the artist and optionally seeded by Landmark Auto-Snap.
_Avoid_: Face calibration, anchor calibration, fitting

**Landmark Auto-Snap**:
The automated assist within Anchor Placement that proposes an initial anchor position from detected facial reference points, falling back to declared proportional construction when no face is found.
_Avoid_: Face detection, auto-align

**Declared Source**:
A visible statement on any measured or estimated value — Landmark Auto-Snap's anchors, a Value Study's Cut Points, and future Drawing Capture alignment — of whether it came from real detection/measurement or a declared fallback construction. Never left ambiguous or silently substituted for one another.
_Avoid_: Confidence score, source badge, silent fallback

**Teaching Mode**:
An interactive pedagogical guide embedded within each drawing method that explains anatomical landmarks, proportion rules, and step-by-step drafting execution.
_Avoid_: Tutorial, help menu, tooltip

**Atelier Workflow**:
The structured 5-stage drafting progression (Calibration & Envelope -> Construction & Proportion -> Shadow Block-In -> Halftone Modeling -> Deep Accents) guiding the artist from general forms to fine details.
_Avoid_: Wizard, drawing pipeline, drawing steps

**Light Direction Diagnosis**:
The automated estimation of key light angle and core shadow boundary from the Reference Image's measured luminance histogram and shadow Value Family spatial distribution. Classified under Declared Source as an estimate, never presented as a measured fact.
_Avoid_: Sun sensor, lighting detection, shadow angle

**Terminator Line**:
The dividing boundary between the lit hemisphere (highlights and halftones) and shadow hemisphere (core shadow, cast shadow, reflected light) of the form, drawn across the canvas to guide Asaro planar facet construction and shadow block-in.
_Avoid_: Shadow line, cut line, border, edge divider

### Comparison

**Drawing Capture**:
A photograph of the artist's physical drawing-in-progress, aligned to the Reference Image via a small number of matched points, enabling direct comparison and measurement of the drawing against the Reference Image. Not yet implemented.
_Avoid_: Progress photo, submission, upload

### Configuration

**Medium Preset**:
A domain configuration bundle defining the materials, value quantization scale, and analysis pipelines for a specific physical art medium (e.g., Graphite, Charcoal, Oil Painting, Watercolor). Each medium owns its own materials scale.
_Avoid_: App theme, project template

**Storage Adapter**:
The storage abstraction interface responsible for persisting image binaries and project state across local disk, PostgreSQL metadata, or external storage.
_Avoid_: File uploader, image saver

### Onboarding & presets

**Sandbox Mode**:
The opt-out state in which the artist controls View Mode, Drawing Method, and Grid directly, rather than having the Atelier Workflow set them per stage. Mutually exclusive with active stage progression.
_Avoid_: Free mode, manual mode, advanced mode

**Workflow Preset**:
A curated bundle of View Mode, Value Study configuration, Grid, Drawing Method, and Medium Preset, offered as a starting point immediately after uploading a Reference Image. Selecting one switches the artist into Sandbox Mode, since a Workflow Preset and the Atelier Workflow cannot both own the same settings at once.
_Avoid_: Template, quick-start, style

**Auto-Suggest Chip**:
A dismissible recommendation of one Workflow Preset, shown after upload and derived from the Reference Image's existing histogram/luminance analysis rather than freeform interpretation. Proposes; never applies itself.
_Avoid_: AI suggestion, smart recommendation, auto-apply

### Practice & progression

**Gesture Study**:
A timed drafting exercise (30s, 2min, 5min) focusing on rhythm, proportion, and line of action. Automatically conceals the Reference Image upon timer completion to enforce observational memory and deliberate practice.
_Avoid_: Quick sketch, speed drawing, timer mode

**Study Log**:
The persistent historical journal of completed Gesture Study sessions, recording date, duration, Reference Image, and artist reflection notes to observe drawing habit development and structural growth over time.
_Avoid_: History tab, activity log, drawing stats

