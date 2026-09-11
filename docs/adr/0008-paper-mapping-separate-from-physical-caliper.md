# 0008: Paper Mapping Is Separate From Physical Caliper

GridOverlay computes millimetre cell size from screen DPI and draws in image-pixel space, but the canvas is then CSS-scaled to fit the viewport — so a "15mm" cell reads as roughly 9mm on screen at the default fit, and there was no concept of how large the Reference Image is meant to be on paper at all: "1:1 Scale" only set the CSS zoom factor to 1.0, unrelated to any real-world size. We introduce Paper Mapping: the artist declares a paper size (A4/A3/Letter/custom) and how the Reference Image fills it (e.g. "fills paper width"), and Transfer Grid spacing is computed in image space from that declared mapping alone. Screen DPI / Physical Caliper's on-screen calibration becomes optional and only governs an explicit "True Size" view — it never drives grid spacing or PDF export dimensions.

## Considered Options

A full on-screen calibration workflow (deriving actual monitor DPI by having the artist match a reference object like a bank card on screen, as professional grid tools do) would make True Size more accurate to the physical screen, but doesn't fix the core problem: grid spacing and PDF export need a stable, device-independent basis, and per-monitor calibration is exactly the opposite of stable. Relabeling "1:1 Scale" without adding any real paper-size concept was considered as a stopgap, but leaves the Transfer Grid permanently wrong at any zoom other than a coincidental one.

## Status

Accepted.

## Consequences

Physical Caliper's screen calibration and Paper Mapping's declared paper size are two independent concepts that both happen to produce a "size" — future work must not conflate them. A Reference Image with no declared Paper Mapping has no valid Transfer Grid or PDF export size; onboarding must set one before either becomes available.
