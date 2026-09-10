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

### Physical transfer

**Pencil Grade Mapping**:
The algorithmic translation of discrete tonal values into physical graphite and charcoal pencil hardness grades (e.g., 4H, 2H, HB, 2B, 4B, 6B, 8B, Charcoal).
_Avoid_: Pencil tool, brush size, shading filter

**Physical Caliper**:
The interactive calibration mechanism that maps display pixels to physical real-world units (mm, cm, inches) via a standard physical reference or ruler. Sole owner of the word "calibration" in this project.
_Avoid_: Screen ruler, zoom tool

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

**Teaching Mode**:
An interactive pedagogical guide embedded within each drawing method that explains anatomical landmarks, proportion rules, and step-by-step drafting execution.
_Avoid_: Tutorial, help menu, tooltip

**Atelier Workflow**:
The structured 5-stage drafting progression (Calibration & Envelope -> Construction & Proportion -> Shadow Block-In -> Halftone Modeling -> Deep Accents) guiding the artist from general forms to fine details.
_Avoid_: Wizard, drawing pipeline, drawing steps

### Configuration

**Medium Preset**:
A domain configuration bundle defining the materials, value quantization scale, and analysis pipelines for a specific physical art medium (e.g., Graphite, Charcoal, Oil Painting, Watercolor). Each medium owns its own materials scale.
_Avoid_: App theme, project template

**Storage Adapter**:
The storage abstraction interface responsible for persisting image binaries and project state across local disk, PostgreSQL metadata, or external storage.
_Avoid_: File uploader, image saver
