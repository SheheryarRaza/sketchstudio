# 0005: Charcoal as a Distinct Medium Preset

ADR-0002 recorded "Graphite/Charcoal" as a single Medium Preset, and the implementation reflected that by making charcoal one entry at the darkest end of the graphite pencil scale. That makes charcoal-only work unrepresentable: every value band collapses onto a single black. We split charcoal into its own Medium Preset with its own materials scale (vine and willow for light passages, compressed for darks, charcoal pencil for detail, white chalk for highlights on toned paper), mirroring how the graphite scale already serves graphite.

## Status

Accepted. Supersedes the combined "Graphite/Charcoal" Medium Preset described in ADR-0002; the rest of ADR-0002 stands.

## Consequences

The pencil-grade table becomes medium-scoped rather than global, which ADR-0002 already anticipated in principle ("Medium Presets encapsulate material-specific tooling") but the code did not implement. Oil, watercolour and pastel remain declared medium types with no materials behind them; this ADR does not address that gap.
