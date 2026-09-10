# 0002: Modular Medium and Drawing Method Extensibility

We chose a plugin-style modular system for drawing methods and artistic mediums. The core canvas and measurement engine remains agnostic to specific mediums. Medium Presets (Graphite/Charcoal, Oil Painting, Watercolor) encapsulate material-specific tooling (such as graphite pencil grade suggestions, pigment palettes, and glaze layer planning), while Drawing Methods (Loomis, Reilly, Bargue, Asaro, Triangulation, Harmonic Armature) register their own interactive overlay components, anchor points, and pedagogical teaching guides.
