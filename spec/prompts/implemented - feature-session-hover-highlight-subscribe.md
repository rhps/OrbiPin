# Feature Prompt — OrbiPin: hover-highlight any country/region + click-to-subscribe box

> Paste everything below the line into a fresh Hermes session working in the
> OrbiPin repo. It contains a live-site diagnosis (2026-09-22) with the exact
> root cause of why hover-highlight is dead today, so start at Task 1, not at
> rediscovery. Specs: `gardening/7-Hackathon/Convex/02-region-precision-areas.md`
> (hover areas), `05-habit-loop.md` (follow/subscribe). Read both first.

---

## Feature request (user's words, expanded)

On `https://striped-impala-387.convex.site/`: when the cursor (hand cursor)
hovers over an area — e.g. Malaysia or the UK — that area's polygon should
**highlight** (fill with an accent color). When the user **clicks** the
highlighted area, a **box/panel should pop up** letting the user **subscribe
to that exact area** (region-following, like the existing 📧 Follow flow but
pre-filled with the clicked area instead of a generic region).

## Verified context from live testing (do not re-diagnose)

1. **The hover highlight is structurally broken today.** The `area-fill`
   layer's opacity is `["case", ["boolean", ["feature-state", "hover"], false], 0.28, 0]`
   — but the features in the `areas` GeoJSON source have **no feature `id`**
   and the source has **no `promoteId`** (verified: feature keys are only
   `type/properties/geometry`; `querySourceFeatures` returns `id: null`).
   `setFeatureState` can never bind → hover fill never lights. This is the
   first thing to fix.
2. **The `areas` source only contains 2 sandbox polygons** — `ID-JB` (West
   Java, hand-drawn, 9 points) and `TLS` (Timor-Leste). There is no Malaysia,
   no UK, no real boundary dataset behind the live map. Spec 02 says real
   build = geoBoundaries ADM1/ADM2, simplified with mapshaper, loaded
   per-country on demand.
3. **Existing wiring to reuse, not rebuild:**
   - `fill-color` on `area-fill` is already a `match` on `code`
     (`ID-JB → #ffb020`, `TLS → #39d98a`) — extend, don't replace.
   - The 📧 Follow button opens a panel with ⚡ Instant / 📅 Daily / 🗓 Weekly
     cadence and "reply to ask" hint — backed by a Convex `followers` table
     keyed by AgentMail address + region tier+place (spec 05). The new
     click-box should be this same panel, pre-filled from the clicked
     polygon's `code`/`tier`, not a second subscription system.
   - Map hooks exist in prod: `window.__orbiMap` / `__orbipinMap` (MapLibre
     instance), React component `mt` owns it.
4. Pins already carry a `highlight` property (e.g. `"GB"`) intended to key
   into this same areas system — keep that contract.

## Tasks (in order)

1. **Fix the id contract.** Give every area feature a stable id: set
   `promoteId: "code"` on the `areas` GeoJSON source (id = the
   country/region code string), or set numeric `id` per feature. Rebuild the
   source registration so this survives style swaps (the app re-registers
   sources on `style.load` — the `built` flag pattern).

2. **Load real boundaries.** Replace the 2 hand-drawn sandbox polygons with
   geoBoundaries country polygons (ADM0 at minimum for the launch wedge +
   major countries; ADM1 where the wedge needs province detail). Simplify
   with mapshaper to small payloads; store as static per-region JSON assets,
   lazy-load on demand (spec 02's design — do not ship one giant world file
   at full resolution). Include Malaysia, UK, Indonesia at minimum.

3. **Wire hover.** On `mousemove` over `area-fill`: set
   `setFeatureState({source:'areas', id}, {hover:true})`, clear the previous
   id's hover state, set canvas cursor to `pointer`. On `mouseleave`: clear
   hover + cursor. The existing 0.28-opacity hover expression then works
   unchanged. Give the fill a per-code color fallback (keep the current
   `match` for wedge regions, add a neutral accent default like `#ffb020` at
   lower opacity for all other countries so *every* country highlights).

4. **Wire click → subscribe box.** On `click` on `area-fill`: open the
   existing Follow panel pre-filled with the clicked area
   (`{tier, place/code, displayName}` from the feature properties — add a
   human `name` property to the boundary assets at build time, e.g.
   `"Malaysia"`, so the box says "Follow Malaysia", not "Follow MYS").
   Subscribing writes to the same `followers` table as the 📧 button
   (`address, region tier+place, cadence, breaking opt-in` — spec 05).
   Show the currently-following state if that area is already followed
   (unsubscribe path).

5. **Distinguish area-click from map-drag/pan and pin-click.** Only open the
   box on a true click (no drag: compare `mousedown`/`mouseup` points, or use
   MapLibre's `click` which already suppresses drags); if the click also hits
   an event pin (`event-pins`/`event-clusters` layers), the pin wins — areas
   are the fallback target, not a mask over pins.

6. **Touch/small screens:** hover doesn't exist — the click path must work
   alone (tap = highlight + open box). Verify panel is usable at mobile width.

7. **Gate check (spec 07):** add to `npm run gate` — G2-style check that
   every boundary asset's features have the `code` + `name` properties, and
   that the areas source registration sets `promoteId` (regression guard for
   task 1; the app shipped hover-keyed paint against id-less features once
   already).

## Constraints

- Feature-branch flow (no direct pushes to main); `hackathon.md` entry per
  milestone with evidence.
- Style-swap survival is mandatory: hover + click must still work after
  Flat/Night/Globe toggles (this app re-registers layers on `style.load` —
  test the toggle explicitly before reporting done).
- Attribution: geoBoundaries requires attribution (CC-BY) — add it next to
  the OpenFreeMap/OSM credits if not already present.
- Do not touch: globe projection persistence, terminator, clustering, pin
  cards (all verified working).
