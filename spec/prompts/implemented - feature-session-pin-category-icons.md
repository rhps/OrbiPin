# Feature Prompt — OrbiPin: category icons on pins (replace plain dots), with animation

> Paste everything below the line into a fresh Hermes session working in the
> OrbiPin repo. The approach below was **proven live on the production
> deployment** (`striped-impala-387.convex.site`, 2026-09-22): emoji-as-text
> renders, and `map.addImage()` with Twemoji PNGs renders as `icon-image`.
> Follow the recommended path; the rejected one is documented so it isn't
> re-tried. Relevant specs: `03-pins-clustering-live.md` (pin layers),
> `07-quality-gates.md` (G6 sensitive-tone rule), `06` (extraction fields).

---

## Goal

Replace the plain colored-dot pins with **category icons** (emoji-style).
Examples: war/conflict → ⚔️ or 💥, flood → 🌊, earthquake → 🌋/📉, fire → 🔥,
storm → 🌀. The user wants them to feel **animated**, not static.

## Proven context (do not re-test)

- Map instance is reachable in prod as `window.__orbiMap` (also
  `__orbipinMap`). Pin layers: `event-pins` (circle), `event-clusters` +
  `event-cluster-count` (circle + symbol), `spider-pins`.
- Pin color comes from a `color` property on the event data; radius
  interpolates z2→z10 (7→14px). Clusters are `#3a6fd8`.
- **Emoji as `text-field`** in a symbol layer: renders (verified, 🌊 at 24px).
  Limitation: no animation possible, glyph fallback varies by platform.
- **`map.addImage(id, bitmap)` with Twemoji 72×72 PNGs** (jsDelivr CDN,
  e.g. `.../twemoji@14.0.2/assets/72x72/1f30a.png`): renders as
  `icon-image` (verified live). This is the recommended path.

## Recommended design: Twemoji symbol icons + native pulse (hybrid animation)

1. **Category → icon mapping, deterministic config.** Store a config table
   (not hardcoded in the layer): `category → {emoji, twemojiFile, color,
   tier}`. Keep it small: conflict/war, flood, earthquake, fire, storm,
   volcano, health, politics, other → neutral fallback (a plain pin dot or
   📍). Extraction already (or should) classify the event category in the
   ingestion call — if the field is missing on existing events, backfill
   with a single classification pass or map `category: other` until then.

2. **Self-host the icons.** Download the ~10 needed Twemoji 72×72 PNGs into
   the repo (`public/icons/`) and `addImage()` them at style-load. Do NOT
   hit the CDN at runtime (offline-safe, no third-party request, CSP-clean).
   Combine with `map.updateImage()` if you ever swap sets.

3. **Layer change.** `event-pins` becomes a `symbol` layer:
   `icon-image: ["get", "iconId"]` (an `iconId` property added to the
   GeoJSON converter next to the existing `color`), `icon-size`
   interpolated like the old radius, `icon-allow-overlap: true` at high
   zoom. Keep `icon-padding` tight so dense clusters stay readable.
   Clusters stay as count circles (icons on every member would be noise);
   icons appear when a cluster expands. Spider-pins follow the same
   icon treatment.

4. **Animation — two tiers (this is the important trade-off).**
   - **All pins (cheap, GPU-free):** a native MapLibre "breathing" halo —
     a circle layer under the icons whose `circle-radius`/`circle-opacity`
     animates via `feature-state` + paint transitions, or a small
     `setIconOpacity`/radius interpolation loop keyed to time. This gives
     the "alive" feel without per-pin DOM.
   - **Newest/hovered pins (rich):** HTML markers (`maplibregl.Marker`) with
     the emoji as a DOM element and a CSS animation (gentle bounce/pulse,
     `prefers-reduced-motion` respected). Use for a **bounded set only** —
     pins from the last N hours or the currently hovered/selected pin.
     Never for all 367+ (DOM markers would wreck pan performance).
   - Do NOT use animated GIF/Lottie overlays inside symbol layers —
     MapLibre symbols only take static images; frame-swapping via
     `updateImage()` is allowed but the halo approach is cheaper.

5. **G6 reconciliation (do not skip).** The quality gates require
   sensitive/conflict events to render restrained (muted, no pulse). With
   explicit war icons this becomes a *content* choice, so: keep G6's
   mechanics — conflict-category pins get the icon but a **desaturated
   color filter and NO halo/pulse animation**. The category config table
   from task 1 carries this flag (`restrained: true`) so it's data, not
   scattered conditionals. The G6 tone test-set in `npm run gate` should
   assert: conflict pins render restrained (no halo, muted color) and all
   pins render an icon that exists in the sprite set (no missing-image
   fallback boxes).

6. **Performance & fallback rules.**
   - 367+ events × symbol layers: fine (symbols are GPU-batched), but
     verify pan FPS after the change; the HTML-marker tier must stay under
     ~25 simultaneous markers.
   - Unknown/missing category → neutral fallback icon, never a blank pin.
   - Icon swap must survive style swaps (Flat/Night/Globe re-register
     layers on `style.load` — re-add images there too; images are wiped
     with the style just like layers/sources. This is the most likely
     regression — test the toggle explicitly).

7. **Verification checklist (report all in `hackathon.md` with evidence):**
   - War event shows ⚔️ (or chosen icon), flood shows 🌊 — on globe view
     AND after cluster expansion at z6+.
   - Newest pin shows the CSS-animated marker; panning with ~20 markers
     stays smooth.
   - Flat↔Night↔Globe toggle: icons still render after each swap.
   - G6 test-set: conflict pins muted + still.
   - `npm run gate` green.

## Rejected (do not use)

- Emoji as `text-field` on symbol layers: works, but un-animated and
  platform-dependent glyph rendering.
- Full-DOM markers for every pin: pan performance collapse at this event
  count.
- Runtime CDN fetches for icons: offline-fragile, CSP-unfriendly.
