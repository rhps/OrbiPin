# Feature Spec — 01: Globe Map Core

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
The main interface: a MapLibre GL globe showing curated news events as pins, for
anyone who wants to see what is happening in their region. Opens as a globe by
default and stays a globe.

## Why
Everything else (pins, clustering, day/night, digests) renders on top of this
surface. It must exist first, and it must not silently fall back to a flat map —
the globe is the product's identity.

## What Changes
- Scaffold a Vite + TypeScript app in the repo root (the spike graduates from `sandbox/`)
- MapLibre GL JS v5+ with OpenFreeMap tiles (public instance, no API key)
- Globe projection baked into the style object (style-root property, NOT the
  Map constructor option — verified: constructor option is ignored in v5)
- Re-assert `setProjection({type:"globe"})` on every `style.load` (setStyle resets it)

## Requirements
- WHEN the app loads THE SYSTEM SHALL render a globe projection on first paint (never flat)
- WHEN any style swap or mode change completes THE SYSTEM SHALL re-assert globe projection
- WHEN the user zooms from space to street level THE SYSTEM SHALL keep vector
  rendering crisp down to village level (z0→z22 via OpenFreeMap)
- IF WebGL is unavailable THEN the system SHALL show an explanatory message with
  a link to the repo instead of a blank canvas
- WHEN the page loads THE SYSTEM SHALL attribute OpenFreeMap/OpenMapTiles/OpenStreetMap
  automatically (MapLibre attribution control)

## Design
- **Engine:** MapLibre GL JS — only engine that is both a spinning globe and a
  deep-zoom vector map. globe.gl rejected (JPEG texture, no village zoom).
- **Tiles:** OpenFreeMap public instance (`liberty` default, `dark` optional).
  Free, unlimited, no key, MIT. Self-host is the escape hatch if ever needed.
- **Globe enforcement:** `projection: {type:"globe"}` merged into the style
  object at build time + `map.setProjection(GLOBE)` on `style.load`. Belt and braces.
- **Sky:** deliberately absent (see 08-sky-visual-mode spec for the full story).

## Out of Scope
- Event pins/clusters (spec 03)
- Day/night shading (spec 04)
- Region polygons (spec 02)
- Auth

## Tasks
- [ ] 1. `npm create vite@latest` TypeScript scaffold in repo root
- [ ] 2. Install `maplibre-gl`; load OpenFreeMap style with globe projection baked in
- [ ] 3. Verify first paint is globe (manual: rotate, confirm curvature)
- [ ] 4. WebGL-unavailable fallback message
- [ ] 5. Zoom test: orbit → region → street → village (manual, screenshot evidence)

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
