# 0011: Light Direction Diagnosis and Terminator Line

## Context

Artists transcribing reference photographs using planar construction methods (notably John Asaro's planar head analysis) require an explicit identification of the key light source direction and the terminator line (the core shadow boundary separating lit form from shadow form). Without a clear light vector, planar facet shading easily degenerates into arbitrary local gradients rather than unified planar lighting.

## Decision

We estimate the key light direction angle and terminator line boundary by analyzing the Reference Image's measured luminance histogram and the spatial distribution of the shadow Value Family:

1. **Hybrid Architecture**:
   - The backend exposes `POST /api/cv/light-direction` in `CVService`. When facial reference landmarks are present, it bounds the analysis to the face ROI to prevent uniform dark studio backgrounds (e.g. obsidian Chiaroscuro) from skewing the shadow centroid.
   - It computes the spatial centroids of the shadow Value Family ($L < \text{threshold}$) and lit pixels ($L \ge \text{threshold}$), deriving the directional angle $\theta = \text{atan2}(dy, dx) \pmod{360}$.
   - The terminator line is calculated as the perpendicular tangent line spanning across the transition boundary between lit and shadow centroids.
2. **Client-Side Pure Utilities & Offline Fallback**:
   - `src/utils/lightDirection.ts` provides pure mathematical geometry functions (`calculateTerminatorLine`, `directionLabelFromAngle`, `estimateLightDirectionFromCentroids`, `setLightAngle`, `toggleTerminator`).
   - If the backend is unavailable or offline, client-side fallback provides seamless continuity.
3. **Declared Source Integrity**:
   - In accordance with `CONTEXT.md`, the lighting direction is strictly labeled as an estimate (`source: 'estimated'`), never presented as a measured fact.
   - Manual artist adjustments immediately reclassify the source to `'manual'`.
4. **Asaro Drawing Method Canvas Integration**:
   - When Asaro is the active Drawing Method, the terminator line is rendered across the canvas with a distinct dashed cyan stroke and endpoint markers.
   - An incident light ray and angle indicator visually display the incoming light vector.
   - Text elements support upright counter-mirroring when view-only horizontal flip (`isFlippedHorizontal`) is enabled.

## Consequences

The Asaro Drawing Method now provides actionable 3D lighting feedback and core shadow guidelines directly aligned with classical planar drafting principles, with zero disruption to existing value studies or anchor placement.
