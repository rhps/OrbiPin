# Feature Prompt — OrbiPin: Day Replay · Region Auto-Detect · Transparency Panel · Search UI

> Paste everything below the line into a fresh Hermes session working in the
> OrbiPin repo. Four features, one session, ordered by dependency. Live-site
> context verified 2026-09-22 (`striped-impala-387.convex.site`): 372 events
> from Convex, globe projection + terminator + clustering all working and
> verified (do not regress them — see Constraints). Specs live in
> `gardening/7-Hackathon/Convex/` — read `03` (pins/clusters), `04`
> (terminator), `05` (followers), `09` (timeline/event table), and **`12`
> (search — build to it, do not rewrite it)** before coding.

---

## Build order (dependency-driven)

**Search first** (spec 12 is already approved-format), then **transparency
panel** (reuses search-style queries), then **region auto-detect**, then
**day replay** (needs the timestamp fix — see its section).

Each feature ships independently: one branch + one `hackathon.md` entry with
evidence per feature.

---

## Feature A — Search UI (spec 12; build to the spec, don't recreate)

**Spec:** `12-full-text-search.md` is the source of truth: Convex
`searchIndex` on the clusters table, derived `searchText` recomputed on every
cluster write, filters (region/tier/date), relevance ranking, pagination
(20/page), result-click → `flyTo` + open the same G5-typed event card the map
uses, explicit empty state naming active filters.

**Session additions beyond the spec text:**
- The spec's Review line is blank — treat the owner's instruction to build
  this as approval: fill `Approved by: owner (via session instruction)` with
  today's date before starting.
- Search box placement: floating panel top-left (opposite the mode-toggle
  chrome), opens with `/` keyboard shortcut and a magnifier button. Closes on
  Escape.
- Results list = compact rows (tier chip + title + place + age), NOT full
  cards; full card opens on click, same component as map clicks.
- Map sync on results: dim non-matching pins (`circle-opacity` 0.15) while
  the search panel is open with an active query — the globe becomes the
  results view. Clearing the query restores.
- Spec 12 task 7 (50-event ranking fixture) feeds `npm run gate` — wire it.

---

## Feature B — Transparency panel (the gates, made visible)

**Goal:** click any country (or open from a pin card) → a small panel showing
that region's honesty stats. The trust layer becomes a product surface.

**Content per region:**
- Event count (live vs archived, from spec 09's `archivedAt`)
- Source count (distinct publishers across clusters)
- Freshest source age ("newest source: 2h ago")
- Precision mix: how many events at city / adm2 / province / country tier
  (the data exists — pins already carry `tier`)
- Unmatched-place count from the G2 review queue, honestly shown ("1 place
  we couldn't locate — held for review", NOT rendered on the map)
- A one-line explainer: "Every pin links to its source. Places we can't
  verify stay off the map."

**Implementation:**
- One Convex query aggregating per-region stats (group by the tier+place
  the events already carry; no new write-path fields needed).
- Entry points: (1) click a country polygon if the hover-areas feature
  landed, else (2) a small "ℹ About this view" button + per-pin-card link
  "About {place}". Don't block on the hover feature — ship entry point 2.
- Visual language: same frosted-glass panel as the Follow panel; numbers in
  tabular figures; no marketing gloss — this panel's power is plainness.
- Gate tie-in: surface the same numbers `npm run gate` computes (G2
  unmatched-place report, G3 cluster stats) so the panel can never disagree
  with the gates. One shared query module, two consumers.

---

## Feature C — "Your region" auto-detect (auth-free personalization)

**Goal:** first visit infers the likely-home region from the browser
timezone and offers it — no account, no geolocation permission prompt.

**Behavior:**
- Map `Intl.DateTimeFormat().resolvedOptions().timeZone` → region via a
  static timezone→region table in the repo (~40 entries is enough: cover
  Indonesia/SEA zones, UK/Europe, Americas, plus a sensible default-off).
- First visit: small toast bottom-left — "Looking for news near you?
  [Follow Indonesia] [No thanks]" (region name from the table; if the
  timezone maps to nothing in the wedge, show nothing at all).
- Accepting writes the same `followers` row the 📧 Follow flow writes
  (address = the user's AgentMail-derived identity per spec 05; if no
  identity exists yet, defer to the existing follow flow pre-filled with
  the detected region — the toast becomes a shortcut, not a new system).
- Store the choice in `localStorage` (`orbipin:region-pref`: accepted |
  dismissed) — never ask twice. A "change region" link lives in the Follow
  panel.
- If the region-follow (hover/click subscribe) feature has landed, the
  accepted toast also highlights that region's polygon once (the amber
  hover fill, ~2s) so the user sees what they just subscribed to.
- **Privacy rules:** no IP lookups, no third-party geo APIs, no
  geolocation API prompt. Timezone string only. Say so in the toast's
  title attribute or a tiny "how this works" link — honesty is the brand.

---

## Feature D — Day replay ("While the world spun")

**Goal:** a play button that animates the last 24h: pins appear at the time
they happened while the day/night terminator sweeps the globe. The demo
moment.

**HARD DEPENDENCY — read first:** this feature is only honest if `publishedAt`
is real. The production corpus currently renders epoch-zero dates
(1970-01-01, known bug, fix session prompt exists:
`prompts/fix-session-2026-09-22-timestamps-dedup.md`). **Do not build Day
Replay until that fix has landed and pins carry real dates.** Verify first:
query the events table — if >5% of events have `publishedAt` before
2026-01-01, stop and report; build Features A–C meanwhile.

**Implementation:**
- UI: a compact ▶ control docked bottom-center (visible only when ≥10
  events have last-24h timestamps). Press → 24h compress into ~12 seconds
  (2h/second, adjustable speed 1×/2×/4×).
- Mechanism: the events live query already returns timestamps; replay is a
  client-side time-window filter over that GeoJSON — pins fade/scale in
  when replay-time passes their `publishedAt`. No new backend work.
- The terminator already updates per minute (spec 04); during replay,
  compute its position from replay-time instead of wall-clock (the
  `sunSubpoint` math is pure — feed it the shifted time). The globe darkens
  and sweeps as pins pop — this sync is the magic; get it tight.
- Controls: pause, scrub back (drag on a mini progress line), exit restores
  the live view exactly (all pins, current terminator).
- Honest limits: a caption during replay — "Showing reports from the last
  24h · times are UTC" (or the viewer's zone). G6 rule holds during replay:
  conflict events stay restrained (no pulse even in replay).
- Performance: it's the same one `events` source with a time filter — no
  per-frame source re-set. Recompute the visible set at most every 250ms.

---

## Constraints (apply to all four features)

- **Do not regress (all verified working live):** globe projection across
  style swaps; all 7 custom layers re-registering
  (`event-pins`, `event-clusters`, `event-cluster-count`, `night-fill`,
  `area-fill`, `area-line`, `spider-pins`); terminator math ±2°; cluster
  cutoff (none above z14); G5 hedged card framing; Convex realtime.
- After each feature: cycle Flat/Night/Globe and confirm the above.
- `npm run gate` green before every deploy; feature branches only, no
  direct main pushes.
- One `hackathon.md` entry per feature with measured evidence (counts,
  timings, screenshots).
- No new runtime CDN dependencies; self-hosted assets only.
- If a feature needs the epoch-date fix (only Feature D does), that fix
  lands first and gets its own verified entry before replay work starts.

## Suggested commit sequence

1. `feat(search)` — Feature A (schema + index → query → UI → gate fixture)
2. `feat(transparency)` — Feature B (shared stats query → panel → card link)
3. `feat(region-detect)` — Feature C (tz table → toast → followers wiring)
4. `fix(dates)` landing verified → `feat(day-replay)` — Feature D
