# Feature Spec — 00: Spike Findings (input to all specs)

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** reference (done)

## Summary
What the sandbox spike proved, disproved, and learned — the evidence base every
other spec builds on. Reference only; no tasks.

## Verified Working (port as-is)
- **Globe projection** via style-root `projection: {type:"globe"}` — renders,
  rotates, survives as long as the style carries it
- **OpenFreeMap integration**: liberty/dark styles load; no API key; free
- **Cluster layers** down to z14 (G3 visual): badge counts, click-to-expand
- **G1 hover-highlight polygons** (West Java/Timor-Leste fills on pin hover)
- **Solar terminator math** (sunSubpoint + night hemisphere polygon, updates
  per minute — sanity-checked against real UTC time)
- **Tailscale access**: Vite `allowedHosts: [".tail.selatan.org"]` + host
  binding; reachable at `ams.tail.selatan.org:5173`

## Verified Broken / Rejected (do not repeat)
- **`projection` in Map constructor options** — silently ignored in maplibre-gl
  5.24; must be style-root or `setProjection()` after `style.load`
- **`maplibregl.Style.Sky`** — does not exist (no-op; sky never applied)
- **Sky spec with bright horizon color** — paints a light band at the globe's
  rim on rotation (the reported artifact). Full analysis in spec 08
- **Style-swap projection reset** — `setStyle()` resets projection to the
  style's default; must re-assert on `style.load`
- **globe.gl for the product** — JPEG texture globe, no deep zoom (research)

## Architectural Decisions Confirmed
- Fetch base style → bake projection/sky → `setStyle(merged, {diff:false})` →
  re-register sources/layers on `style.load` (the `built` flag pattern)
- Top-level `await buildStyle(mode)` in the constructor call — page opens on
  the real style, never a stub
- `window.setOrbiMode` / `window.setOrbiProjection` console hooks for testing

## Honest Caveats Carried Forward
- Terminator edge is hard (no twilight gradient) — polish item
- Sandbox polygons are hand-drawn; real build uses geoBoundaries
- Pin info card rendered into the (now removed) HUD — needs a real sidebar/
  popup component in the app build
- Vite `allowedHosts` for tailscale is sandbox-local; production uses the
  convex.site domain and needs none of it
