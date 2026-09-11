# 0007: Selecting a Workflow Preset Exits the Atelier Workflow into Sandbox Mode

ADR-defined Atelier Workflow already owns View Mode, Drawing Method, and Grid defaults per stage. Workflow Presets set the same properties as a single bundle picked once, right after upload. Letting both systems drive the same settings at once would leave it ambiguous which one wins when they disagree — picking a preset mid-ladder could silently be overridden by the next stage transition, or vice versa. We considered scoping presets to only apply within Sandbox Mode (already existing as an opt-out toggle) or having presets set defaults without leaving the ladder; both leave the two systems fighting over the same state. Instead, selecting a Workflow Preset switches Sandbox Mode on automatically, so exactly one system owns View Mode/Method/Grid at any time. A one-time toast explains the switch the first time it happens.

## Status

Accepted.

## Consequences

A user who wants both the guided 5-stage ladder and a preset's starting configuration can't have both — they get the preset's bundle and lose the ladder's stage progression for that session, and have to manually toggle Sandbox Mode back off (which does not restore the preset's settings) to resume the guided flow.
