// The studio's ink language (issue #39): one accent for selection and Drawing
// Method construction, one color reserved solely for the Transfer Grid so the
// two never read as one drawing, and one warm color for warnings. Mirrors the
// `studio.accent` / `studio.grid` / `studio.gold` Tailwind tokens in
// tailwind.config.js — kept here too since canvas/SVG rendering and project
// state need literal hex values rather than Tailwind classes.
export const CONSTRUCTION_INK = '#c8623f';
export const TRANSFER_GRID_INK = '#7fb3d5';
export const WARNING_INK = '#d2a24c';
