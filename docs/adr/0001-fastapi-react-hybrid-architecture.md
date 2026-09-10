# 0001: Hybrid FastAPI and React WebGL/Canvas Architecture

We chose a hybrid architecture consisting of a FastAPI (Python) backend with PostgreSQL persistence and an interactive React (TypeScript + HTML5 Canvas & WebGL) frontend. High-frequency user interactions (zooming, panning, real-time value threshold adjustments, and grid overlay rendering) occur client-side at 60 FPS without server latency, while the Python backend handles persistent project storage, user settings, and heavy computer vision processing (e.g. OpenCV edge extraction, landmark detection, and export generation).
