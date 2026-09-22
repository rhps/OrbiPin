# Feature Spec — 04: Day/Night Terminator

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
A solar terminator on the globe: the dark side moves as real time passes, so
users see where it is genuinely night right now. Ambient realism that also
powers the "while you slept" digest hook.

## Why
A static dark texture reads as broken (the globe was "always dark" — user
verified). A real terminator makes the globe feel alive and honest: the shading
is evidence too.

## What Changes
- Compute the sun's subpoint (lat = declination, lng = -15° × (UTC hours − 12 + EoT/60))
- Build a polygon covering the night hemisphere (longitudes subpoint+90 → +270)
- Render as a translucent dark fill under all event layers
- Update every 60 seconds; refresh on every style.load

## Requirements
- WHEN the map loads THE SYSTEM SHALL render the night hemisphere matching the
  current UTC time (±1° tolerance vs a reference almanac)
- WHEN 60 seconds elapse THE SYSTEM SHALL update the terminator position
- WHEN the user rotates the globe THE SYSTEM SHALL show the lit and dark halves
  fixed to Earth (not to the camera)
- WHEN a style/mode swap completes THE SYSTEM SHALL redraw the terminator
- IF the terminator source is missing at update time THEN the updater SHALL
  no-op silently (no error spam before the layer exists)

## Design
- **Math:** declination = −23.44° × cos(360°/365.24 × (day+10)); equation of
  time approximation; night band = longitudes subpoint+90…+270, ring at ±85° lat.
  Same approach as globe.gl's day-night-cycle demo (verified), ported to a
  MapLibre GeoJSON layer instead of a three.js shader.
- **Layer order:** added before area/pin layers so pins stay fully visible.
- **Styling:** `#060a14` at 0.38 opacity. V1 has a hard terminator edge — a soft
  twilight gradient is a future polish (many-band polygon or custom shader).
- **Known predecessor bug (do not repeat):** the old build rendered the sky
  spec's horizon glow as a light band at the globe's edge and an empty stub
  style as a dark ball. Sky is now excluded entirely (see spec 08).

## Out of Scope
- City-lights texture on the night side (needs raster night tiles)
- Soft twilight gradient bands
- Moon position / tides

## Tasks
- [ ] 1. Port `sunSubpoint` + `nightPolygon` from sandbox (verified math)
- [ ] 2. `night-side` source + `night-fill` layer registration in layer builder
- [ ] 3. 60s update interval + style.load refresh hook
- [ ] 4. Almanac cross-check test (compare against a reference for 3 timestamps)

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
