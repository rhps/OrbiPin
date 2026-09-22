# Feature Spec — 08: Sky, Atmosphere & Visual Modes

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft — **awaiting
owner re-implementation and review; this spec collects every configuration and
every failed attempt so the next attempt starts from evidence**

## Summary
How the globe looks in space: atmosphere, sky, starfield, and the two visual
modes (nature/night). This spec exists because three sky implementations were
attempted and all produced artifacts; the owner will re-implement and review.

## Why
The globe must feel like a planet in space (globe.gl aesthetic), but every sky
attempt so far produced a light band at the globe's edge when rotating. The
artifact was diagnosed (see Failure Log) but not yet solved acceptably.

## What Changes
- Two visual modes: **nature** (default — OpenFreeMap `liberty`: blue water +
  green landcover) and **night orbit** (OpenFreeMap `dark` + starfield)
- Globe projection and (optional) sky are baked into the style object
- Mode toggle swaps the full style; sources/layers re-register after swap

## Requirements (for the re-implementation to pass)
- WHEN the globe rotates THE SYSTEM SHALL show NO light band, glow patch, or
  sky-plane edge at any point on the globe's rim — the edge meets pure space
- WHEN in nature mode THE SYSTEM SHALL show blue oceans and green landcover
  (OpenFreeMap liberty), crisp to village zoom
- WHEN in night mode THE SYSTEM SHALL show a dark map with a starfield backdrop
- WHEN switching modes THE SYSTEM SHALL preserve: projection (globe), all pins,
  clusters, hover polygons, and the day/night terminator
- IF a sky/atmosphere effect is attempted THEN it SHALL NOT paint any pixels
  outside the planet's silhouette (any sky-plane bleed = fail)

## Configuration Reference (everything that controls the look)

### Style-root properties (MapLibre v5 — the ONLY place these are honored)
```js
style.projection = { type: "globe" };   // constructor option is IGNORED in v5
style.sky = { ... }                      // ← THE ARTIFACT SOURCE; see failure log
```

### Sky specification (last attempted — produced the edge artifact)
```js
sky: {
  "sky-color":         "#0b1020",  // space above horizon
  "sky-horizon-blend": 0.5,        // 0=hard horizon line, 1=full blend
  "horizon-color":     "#3a6fd8",  // the bright blue rim ← artifact source
  "horizon-fog-blend": 0.6,
  "fog-color":         "#0e1626",  // blends into planet edge
  "fog-ground-blend":  0.7,
  "atmosphere-blend": [             // fades glow as you zoom in
    "interpolate", ["linear"], ["zoom"],
    0, 1,    // full glow from orbit
    5, 1,
    7, 0,    // none at street level
  ],
}
```
Knobs to try on re-implementation:
- `"sky-horizon-blend": 0` (hard cut horizon)
- `"horizon-color"` = `"sky-color"` (no bright rim) — rim glow then comes only
  from `atmosphere-blend`
- `"atmosphere-blend"` stepped later (e.g. 0→1 until z6)
- Or **no sky at all** (current state): body background `#060a12` is space —
  verified artifact-free, just less pretty

### Candidate approaches NOT yet tried (for the re-implementation)
1. **Custom WebGL layer** drawing only a thin halo hugging the planet
   silhouette (no full-sky plane) — MapLibre `addLayer({type:"custom"})`,
   render an additive glow ring behind the globe using the globe projection's
   center/radius. Most control, most work. Highest expected quality.
2. **CSS/canvas halo trick:** a fixed radial-gradient div behind the canvas,
   centered via `map.getCenter()` each move — cheap, approximate, may wobble.
3. **Post-processing overlay:** canvas-drawn radial gradient composited on top
   with `pointer-events: none`, masked to the globe circle. Fragile on resize.
4. **Two-style sandwich:** dark starfield style as base + raster hillshade
   ring. Unproven.

### Starfield (night mode, verified working)
```js
container.style.backgroundImage =
  "url('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')";
container.style.backgroundSize = "cover";
```
Only in night mode. Note: the raw image has a bright Milky Way blob — if
re-enabled alongside a dimmer space, apply a dark gradient overlay on top.

## Failure Log (do not repeat)
1. **Attempt 1 — `map.setSky(maplibregl.Style.Sky)`:** `Style.Sky` does not
   exist in maplibre-gl 5.24. No-op; nothing rendered. (Verified in dist.)
2. **Attempt 2 — explicit `setSky({...})` with blue horizon:** worked, but the
   sky plane's bright horizon band showed at the globe's rim on rotation —
   the reported "very light part on the top left edge." `maxPitch: 0` reduced
   but did not eliminate (any pitch/tilt or aspect exposes the plane).
3. **Attempt 3 — sky removed entirely:** artifact gone (current state). Space
   is flat dark. Owner accepts interim; wants the glow re-attempted properly.

## Debug hints for the re-implementation
- Verify what the browser runs: the Vite-served `main.js` (curl it), not the
  source file — hot reload masked a stale-module issue once
- `map.getProjection().type` and `map.getSky()` confirm live state
- Test rotations at zoom 2–3, pitch 0 AND pitch 45+ (the artifact showed on
  rotation, not just tilt)
- The style swap wipes sky/projection unless baked into the merged style object

## Out of Scope
- City-lights night texture
- Real-time cloud layer
- Specular ocean sun-glint

## Tasks
- [ ] 1. Owner re-implements sky/atmosphere per Configuration Reference
- [ ] 2. Rotation test at multiple zooms/pitches: zero edge artifacts
- [ ] 3. Decide: halo-on / halo-off default
- [ ] 4. Document final config in this spec (replace failure log with result)

## Review
Re-implemented by: ______ · Reviewed by: ______ · Date: ______
