# 0001: Hybrid FastAPI and React Canvas Architecture

We chose a hybrid architecture consisting of a FastAPI (Python) backend with PostgreSQL persistence and an interactive React (TypeScript + HTML5 Canvas) frontend. High-frequency user interactions (zooming, panning, real-time value threshold adjustments, and grid overlay rendering) occur client-side without server latency, while the Python backend handles persistent project storage, user settings, and heavy computer vision processing (e.g. OpenCV edge extraction, landmark detection, and export generation).

## Status

Accepted. The split of responsibilities stands and is reaffirmed by ADR-0004.

## Amendment

This ADR originally described the client as "WebGL/Canvas" rendering at 60 FPS. The implementation uses the 2D canvas context only; there is no WebGL in the codebase. A GPU fragment-shader path remains the intended endpoint for value-study rendering, but it is not built. Until it is, interactive performance is achieved by capping render resolution rather than by GPU acceleration (see ADR-0004).
