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

### 2026-09-22 - category icons on pins (Twemoji + breathing halo)
`feature/category-icons`: replaced plain dot pins with category symbol icons.
1. **Icons**: 9 self-hosted Twemoji 72px PNGs in `public/icons/` (conflict
   🚨, flood 🌊, quake, fire 🔥, storm 🌀, volcano 🌋, health, politics,
   other 📍). Loaded via `addImage()` at every `style.load` (survives swaps —
   verified: 3/3 icons present after `setStyle`).
2. **Category derivation**: deterministic keyword map in
   `src/lib/categories.ts` (no LLM change, no backfill) — client-side
   classify of the event label. Live mix: other 260, conflict 44, politics
   26, storm 5, fire 4, flood 1. Unknown → `cat-other` fallback (never a
   blank pin); `icon-image` uses `coalesce` so even a missing sprite can't
   produce fallback boxes.
3. **Layers**: `event-pins`/`spider-pins` are symbol layers now
   (`icon-image`, z-interpolated `icon-size` 0.32→0.62); new
   `event-pin-halo`/`spider-pin-halo` circle layers beneath (blurred,
   category color). Clusters stay count circles.
4. **Animation**: breathing halo — sine opacity 0.15↔0.45 on a 1.2s
   `setInterval` (paint-property, GPU-cheap); skipped entirely under
   `prefers-reduced-motion: reduce`. Verified live: halo paint animating
   (0.44 sampled mid-cycle).
5. **G6**: conflict category = `restrained: true` → no halo (layer filter)
   + icon at 0.75 opacity. Verified live on a real conflict event
   ("US strikes on drug boats"): pin rendered, zero halo → PASS. Gate
   script `scripts/gate-icons.mjs` asserts 9 icons shipped + conflict
   restrained → PASS.
6. All 340 events carry iconId; style-swap survival verified (icons + data
   re-registered).

### 2026-09-22 - UI polish: tokens, chrome, event card, status bar, splash
`feature/ui-polish`: working-demo → designed-product pass (spec 07 G6, 08).
1. **Tokens** (`src/theme.css`): space navy bg, frosted-glass panels
   (backdrop-blur + hairline borders), blue accent / amber highlight / tier
   semantic colors, spacing+radius+z scales, Inter self-hosted via
   @fontsource (no runtime CDN). Muted text bumped #8496b3 → #9db0cc (≥4.5:1).
2. **Chrome**: floating top bar — OrbiPin wordmark + tagline, segmented
   Globe/Flat + Day/Night controls with visible active state (the bug-grade
   gap), Follow chip (lucide Mail icon). Verified live: topBar ✓, active
   segments "Globe"+"Day" ✓. Mobile: tagline collapses.
3. **Event card**: tier chip + place + source count header, G5 hedge kept
   ("Reports of…"), quoted phrase as amber-edged blockquote, publisher chips
   with humanized dates ("1m ago", "date unknown" — never epoch), Follow
   this story toggle, 200ms slide-in, Escape closes (verified live ✓),
   bottom-sheet at mobile width.
4. **Follow panel**: same glass language, segmented cadence, email focus
   ring, "Following X ✓" state when already subscribed.
5. **Map paint**: pulse/halo shipped in the category-icons session (G6
   restrained honored); area hover uses amber token already.
6. **Status bar**: live pulsing green dot + "376 events" + "data: convex ·
   updated 1m ago" (tabular numerals). Verified live ✓.
7. **Splash**: 📍 mark + "Loading globe…" + spinner (reduced-motion aware).
8. **A11y/motion**: prefers-reduced-motion kills pulse/slide/shimmer;
   :focus-visible 2px accent rings; touch targets ≥36-44px.
Bundle: 1261 KB JS (fonts/icons CSS-side; within budget).

### 2026-09-22 - branded splash (hourglass)
`feature/branded-splash`: full-viewport splash in index.html (paints before
any JS bundle): OrbiPin wordmark (Inter/system display), tagline "Every
event, a pin on the planet.", self-hosted Twemoji ⏳ 23f3.png rocking
±12° @1.6s with opacity breathe. Space-navy bg (#060a12) — no white flash;
100dvh reserved, no layout shift. Dismissed on FIRST map load only (single-
use flag — style swaps never resurrect it), 300ms fade then remove().
10s fallback: quiet "Still trying… check your connection" + Retry
(reload). Reduced-motion: no rocking, static icon. Chrome-verified live:
splash removed after load ✓, stays gone across style swap ✓, layers
intact ✓.

### 2026-09-22 - "On the ground" reader commentary (Part B: demo seeds)
`feature/commentary-loop`: closed-loop UI for reader reports.
1. **Schema**: `commentary` table (eventId, body ≤280, authorLabel, receivedAt,
   verified:false always, seeded flag, autoApproved).
2. **Seeds**: 12 comments across 8 events (calm eyewitness bank), `seeded:true`,
   labeled "sample" in the UI. API verified: listForEvent returns rows.
3. **Card UI**: "On the ground · unverified reader reports" section — quoted
   bodies, authorLabel + humanized age + sample flag, cap 3 + "+N more",
   honest footer "Reply to any OrbiPin email to add yours — reviewed before
   showing." Chrome-verified live on the badged typhoon event (search
   "dujuan causes flooding" → card shows 3 seeded comments).
4. **Pin badge**: `event-pin-badge` amber ring on pins with commentary
   (mapData carries commentaryCount; verified rendering at Tokyo z7/z8).
   Note: overlapping sibling pins can grab a click at stacked pixels —
   expected with perfect coordinate stacking; search-pin path is exact.
5. Low-zoom area hit-test fixes (bbox loader, exact PIP, ISO3→ISO2) landed
   same branch, verified: shift-click Japan → 19 events/6 publishers.

### 2026-09-22 - category starvation fix + Fluent 3D icons
`feature/category-fix` (NOT merged to main per owner instruction):
1. **Icon set**: 13 FluentUI Emoji 3D PNGs (MIT) self-hosted + Twemoji pushpin
   fallback for `other` (CC-BY 4.0) — CREDITS.md records origins. All 14
   registered per style.load; verified 14/14 loaded AND 14/14 after a style
   swap (Flat/Night/Globe).
2. **Category set 9 → 14**: added crime, military (restrained per G6),
   economy, transport, culture. Config is data (categories.ts table).
3. **Classifier**: keyword lists expanded over 3 measured passes against the
   live corpus. Distribution: other 260/372 (70%) → 68/357 (19%) on the live
   source; politics 23%, conflict 16% (within the 5–25% band), economy 15%,
   crime 8%, transport 7%, military 5%. Sanity band met (other ≤25%).
4. Live iconId mix matches; conflict+military restrained (no halo, dimmed).
   Gate `scripts/gate-icons.mjs` PASS (14 icons shipped, conflict restrained).

### 2026-09-22 - "Your region" auto-detect (Feature C)
`feature/region-detect`: auth-free personalization. Timezone → region via a
static ~50-entry table (tzRegions.ts) — privacy: timezone string only, no IP
lookup, no geolocation prompt, no third-party API; the toast says so ("your
timezone, nothing else"). First visit only (localStorage orbipin:region-pref:
accepted|dismissed — never asks twice). Accept → Follow panel pre-filled +
2s amber flash on the region polygon (ISO2→ISO3 mapped for feature-state).
Unmapped zones show nothing (default-off). Chrome-verified live:
Europe/London → "Follow the UK" toast → panel opens, pref saved, toast gone.

### 2026-09-22 - Day replay "While the world spun" (Feature D)
`feature/day-replay`: ▶ Replay 24h dock (bottom-center, appears when ≥10
events have recent activity). 24h compressed to ~12s (1×/2×/4× speeds),
pins appear as replay-time passes each event's newest-article publish
moment; terminator sweeps synced to replay-time (updateTerminator(atTime));
scrub slider; Exit auto-restores all pins + wall-clock terminator.
Verified live: 347 pins → filter engages → progressive accumulation →
auto-restore to 347 ✓. Caption: "times are UTC · sensitive events stay
muted" (G6 honored — restraint is per-pin, unaffected by replay).
Dependency check passed: 0% epoch dates (394 events, all real dates).
Note: corpus is fresh (most articles <24h old) so replay starts near-empty
and fills — honest representation of when news actually landed.
