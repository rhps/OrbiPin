# OrbiPin build log

- **Project:** OrbiPin
- **Event:** Convex All Gas Hackathon
- **What it does:** A living globe of curated regional news — events appear as
  pins on an orbiting MapLibre globe with honest precision tiers (the pin level
  matches the evidence level in the headline), real day/night shading, and a
  follow-by-email habit loop (change alerts, ask-the-inbox, digests).
- **Live app:** https://striped-impala-387.convex.site
- **Repo:** https://github.com/rhps/OrbiPin (public)
- **Frontend:** Convex static hosting
- **Convex deployment:** https://striped-impala-387.convex.cloud
- **Components:** @convex-dev/static-hosting (planned), direct RSS+Firecrawl ingestion
- **Convex features:** schema, tables, indexes, queries, mutations, internal
  functions, actions, HTTP-ready webhooks, crons (30-min crawl, nightly archive),
  realtime queries
- **Auth:** none
- **AI models:** OpenAI (extraction with strict JSON, temperature 0)
- **Started:** 2026-08-26 (ideation) · **Implementation started:** 2026-09-21

## Log

### 2026-09-21 - spike
Globe/map stack decided against alternatives: MapLibre GL JS v5 globe projection
+ OpenFreeMap tiles. Verified in sandbox: spinning globe with village-level
vector zoom (globe.gl rejected — JPEG texture globe cannot zoom past city level).
Day/night terminator prototyped from real solar math (declination + equation of
time). Three sky attempts documented; sky removed pending a clean halo approach.

### 2026-09-21 - specs
Eleven feature specs written and vaulted (00–11): globe core, precision tiers +
hover areas, pins/clustering/live, terminator, habit loop, ingestion pipeline,
quality gates, sky reference, timeline, deploy pipeline, build log. G1–G6
quality gates defined with enforcement points.

### 2026-09-21 - ingestion pipeline live
Whitelist of 12 verified RSS feeds across 12 countries (NPR, BBC, France 24,
DW, Al Jazeera, TASS [labeled state media], Japan Times, Korea Times, ABC AU,
CNA, Antara, Dawn). Feed fetch verified: 11/12 feeds OK, 276 raw items on first
full pass (Dawn 403 — moving to Firecrawl fallback). OpenAI extraction with
strict JSON + G1 verbatim quotedPhrase check + G2 geo resolver (40-country
table): 65+ items extracted first pass, non-significant stories correctly
skipped, unresolved places parked in review queue. All 3 provider keys smoke-
tested inside Convex actions: OK.

### 2026-09-22 - MVP merged to main
Full pipeline on main: crawl driver (cron 30 min) → extraction (cost-capped
batches) → events/articles tables → live GeoJSON query for the map → 146 active
events across 14 countries in DB. React frontend with globe, cluster layers
(z14), G1 hover polygons, day/night terminator, pin popups with hedged G5
framing. CI on PRs (typecheck + preview deploy); prod deploy workflow
tag-gated. Convex crons: 30-min crawl+extract, nightly stale-archive.

### 2026-09-22 - epoch-zero + G3 dedup fix
Verified live pass found two regressions; both fixed on `fix/epoch-zero-and-dedup`:
1. Pin cards showed `1970-01-01` — `mapData:activeEventsGeo` sorted articles by
   `publishedAt` but never exposed the date, and `convexData.ts` hardcoded
   `publishedAt: 0` into the client source object. Fixed: `latestPublishedAt`
   now flows through the GeoJSON properties (372/372 events carry real dates;
   sample Yemen → 2026-09-21 15:14 UTC), and the card renders "date unknown"
   when absent instead of epoch zero.
2. G3 dedup effectively inert (8/372 multi-source = 2%): the deterministic
   matcher required an exact 24-char event-label prefix, which never matches
   across outlets that phrase the same story differently. Replaced with
   word-overlap similarity (≥50% shared significant words, 48h window) per
   spec 03; thresholds externalized to `gate.config.json` (spec 07).
   Also tightened the extraction prompt: `quotedPhrase` must be the full
   verbatim clause, not 2-word fragments (spec 02).
Decision: existing 372 events keep their stored dates (now surfaced); new
ingests benefit from the merge + prompt fixes. Convex features used:
internal queries/actions, `withIndex` filters, GeoJSON query surface.

### 2026-09-22 - hover-highlight areas + click-to-subscribe (spec 02 + 05)
`feature/hover-areas-subscribe`: fixed the structurally-dead hover system and
shipped real boundaries.
1. **id contract fixed**: areas source now sets `promoteId: "code"` —
   feature-state hover binds (verified live: `getFeatureState → {hover:true}`).
   This was the root cause of dead hover (paint keyed on feature-state against
   id-less features).
2. **Real boundaries**: geoBoundaries ADM0 (CC-BY, attributed in the
   attribution control) for MYS/GBR/IDN, simplified ~90% (radial-distance
   decimation, 0.05° tolerance), served as per-country assets from
   `public/areas/*.geojson` (43-389 KB each), lazy-loaded when a country's
   centroid enters the viewport (`moveend`), merged into the areas source.
3. **Hover**: mousemove on `area-fill` → `setFeatureState` hover → 0.28 fill
   + outline glow + pointer cursor; neutral amber default for ALL countries
   (wedge match colors kept).
4. **Click → subscribe**: clicking an area opens the existing Follow panel
   pre-filled with the polygon's `name` ("Follow Malaysia", verified live:
   panelText = "Malaysia"). Writes to the same `followers` table + cadence +
   reply-to-ask as the 📧 flow. Pins win over areas (verified: pin click does
   NOT open the panel).
5. **Style-swap survival**: after `setStyle`, areas source (2 features),
   hover binding, and all layers survive — verified live.
6. **Gate**: `gate` check validates every asset has code+name and the source
   sets promoteId (PASS).
Touch: click path works alone (no hover dependency); panel is width-fluid.

### 2026-09-22 - world coverage: 231 country hover areas
Extended from 3 to 231 countries (all geoBoundaries ADM0). Adaptive
simplification per country span (0.02° small → 0.3° Canada/Russia), 7 MB
total across per-country assets, median 16 KB. `manifest.json` (code,
centroid, bytes) drives lazy loading: 12 unseen countries per `moveend`,
burst-limited; dedup on merge. Chrome-verified live: 24 areas after boot,
36 after panning to Europe, 48 after South America; hover binds (Ecuador
→ {hover:true}); click opens panel pre-filled "Brazil". geoBoundaries
CC-BY attribution retained.
