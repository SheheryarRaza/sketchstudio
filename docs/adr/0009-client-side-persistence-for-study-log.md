# 0009: Client-Side Persistence for Study Log

With project persistence and PostgreSQL removed in #33 to eliminate dead plumbing and keep SketchStudio a lightweight, zero-configuration local drafting studio, the timed gesture study log needed a dedicated persistence model. We adopt browser `localStorage` under key `sketchstudio_study_log_v1` rather than re-introducing a server-side database or file API.

## Considered Options

- **Server-side database / backend endpoint**: Would re-introduce database configuration, migrations, and network latency for a personal drafting studio that previously removed Postgres in #33.
- **File export only**: Writing to disk on each session requires browser download prompts or File System Access API permissions, interrupting the drawing flow after quick gesture studies.
- **Client-side LocalStorage**: Zero-friction, synchronous, survives browser refreshes, isolated per domain, matches the existing storage pattern used for calibration, grid, and paper mapping preferences in `page.tsx`.

## Status

Accepted.

## Consequences

Gesture study sessions and reflection notes are stored client-side in the artist's browser. The study log is scoped independently of backend APIs. The study log modal provides a clear mechanism to edit notes, delete individual entries, or clear history.
