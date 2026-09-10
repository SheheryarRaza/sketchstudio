# 0006: Preset Suggestion Uses Heuristic CV Analysis, Not an LLM

New users land on an uploaded Reference Image with no idea which Workflow Preset fits it. We considered wiring an LLM call (via a new backend route mirroring `/cv/*`) to inspect the image and recommend a preset conversationally. We rejected that for v1: the backend already computes histogram/luminance analysis for other features, and that same signal (contrast spread, dominant tonal range) is enough to pick among a small, fixed preset lineup. An LLM call adds a new external dependency, latency, and cost for a decision that a threshold rule already answers correctly.

## Status

Accepted.

## Consequences

The Auto-Suggest Chip can only ever recommend one of the curated Workflow Presets, never freeform advice — if a future feature needs open-ended guidance (e.g. answering "why did you suggest this"), that still requires the LLM integration this ADR deferred, and the CV service has no such integration to build on today.
