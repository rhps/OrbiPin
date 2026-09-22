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
