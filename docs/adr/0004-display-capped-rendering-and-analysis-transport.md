# 0004: Display-Capped Rendering and Analysis Transport

The value-study shader sized its canvas to the Reference Image's native resolution and re-ran on every layer change, so a 12-megapixel photo allocated roughly 98MB of buffers and ran a 12-million-iteration loop on each opacity drag. We cap the working render at display resolution (long edge ~1600-2000px) and retain the original solely for export, and we send that same capped image as the multipart payload for on-demand analysis calls.

## Considered Options

A GPU fragment shader was the alternative, and is what ADR-0001 originally promised. It solves the problem properly rather than shrinking it, and remains the intended endpoint, but it is a materially different class of complexity (shader code, texture upload, context-loss handling, awkward readback for export). Capping first costs nothing if the shader is added later, so the shader is deferred to its own tracked work.

Uploading each image once and referencing it by id is the cleaner long-run transport, but it requires the persistence layer that does not yet exist. Posting the capped image keeps analysis stateless and roughly ten times smaller than the original, which matters once the backend is on a shared VPS rather than localhost.

## Consequences

Physical Caliper's pixels-per-millimetre mapping must be derived against a declared reference resolution, not against whatever the canvas happens to be, or printed grids will drift from on-screen grids as the cap changes. Landmark coordinates returned by the backend are in capped-image space and must be scaled back by a known factor.
