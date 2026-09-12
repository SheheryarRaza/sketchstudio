# 0010: Edge Quality Map Independent Overlay and Classification

Edge control (classifying boundaries into hard, soft, and lost edges) is fundamental to classical atelier and academic drafting. Existing edge detection (`extract_contour_edges`) only outputs binary Canny lines as a raster PNG, with no classification capability or interactive editing. We introduce an interactive vector Edge Quality Map decoupled from Value Study layers and Drawing Method constructions.

## Considered Options

- **Extending raster contour output**: Modifying Canny or edge shaders to tint lines. Rejected because raster output cannot be interactively selected, edited, split, reclassified, or manipulated by the artist.
- **Tying edge quality to Drawing Methods**: Treating edge quality as a sub-feature of Bargue or Loomis methods. Rejected because edge quality applies to the entire Reference Image and all stages of drawing (from block-in through halftone modeling and accents), independent of whether a specific facial construction method is active.
- **Independent vector overlay with dual-source suggestions**: Edge segments represented as polylines in native image space, rendered with distinct visual treatments (solid crimson for hard, dashed amber with halo for soft, dotted violet for lost), persistent in `localStorage`, with automated candidate suggestions from OpenCV contour approximation and anatomical fallbacks.

## Status

Accepted.

## Consequences

- Artists can mark, draw, split, and reclassify edges directly on the Reference Image with keyboard shortcuts (1 for Hard, 2 for Soft, 3 for Lost, E for toggle, D for Draw, S for Select).
- Marked edges render visually distinct from one another on canvas across all view modes and drawing stages.
- Edge annotations persist across sessions in `localStorage` under `sketchstudio_edge_quality_v1`, independent of Value Study cut points or Drawing Method state.
