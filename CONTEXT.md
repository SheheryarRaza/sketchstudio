# SketchStudio

A web-based visual analysis, measurement, and drafting studio for artists transcribing reference images onto physical drawing media.

## Language

**Reference Image**:
The source visual uploaded by the artist to analyze, measure, and transcribe onto physical drawing media.
_Avoid_: Picture, asset, source photo

**Value Study**:
The discrete tonal decomposition of an image into distinct light-to-dark steps (such as highlights, halftones, core shadows, and cast shadows).
_Avoid_: Black and white filter, posterization, grayscale

**Tonal Layer**:
An isolated threshold mask representing a specific value band in the value study.
_Avoid_: Cutout, filter layer

**Pencil Grade Mapping**:
The algorithmic translation of discrete tonal values into physical graphite and charcoal pencil hardness grades (e.g., 4H, 2H, HB, 2B, 4B, 6B, 8B, Charcoal).
_Avoid_: Pencil tool, brush size, shading filter

**Physical Caliper**:
The interactive calibration mechanism that maps display pixels to physical real-world units (mm, cm, inches) via a standard physical reference or ruler.
_Avoid_: Screen ruler, zoom tool

**Harmonic Armature**:
The geometric network of diagonals, reciprocals, and grid subdivisions across the canvas used for composition, alignment, and proportional transfer.
_Avoid_: Diagonal lines, angle guide

**Drawing Method**:
A structured visual construction technique (e.g., Loomis, Reilly, Sight-Size, Bargue, Asaro) used to measure, construct, and verify anatomy, perspective, and values.
_Avoid_: Drawing style, drawing filter, drawing template

**Teaching Mode**:
An interactive pedagogical guide embedded within each drawing method that explains anatomical landmarks, proportion rules, and step-by-step drafting execution.
_Avoid_: Tutorial, help menu, tooltip

**Atelier Workflow**:
The structured 5-stage drafting progression (Calibration & Envelope -> Construction & Proportion -> Shadow Block-In -> Halftone Modeling -> Deep Accents) guiding the artist from general forms to fine details.
_Avoid_: Wizard, drawing pipeline, drawing steps

**Landmark Auto-Snap**:
The computer vision alignment engine that detects facial reference points and automatically positions initial construction guide anchors over the reference image.
_Avoid_: Face detection, auto-align

**Medium Preset**:
A domain configuration bundle defining the materials, value quantization scale, and analysis pipelines for a specific physical art medium (e.g., Graphite/Charcoal, Oil Painting, Watercolor).
_Avoid_: App theme, project template

**Storage Adapter**:
The storage abstraction interface responsible for persisting image binaries and project state across local disk, PostgreSQL metadata, or external storage.
_Avoid_: File uploader, image saver
