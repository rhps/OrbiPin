# Feature Prompt — OrbiPin: fix category starvation (70% of pins are 📍 fallback) + 3D icon upgrade

> Paste everything below the line into a fresh Hermes session working in the
> OrbiPin repo. Diagnosis below is from the live deployment
> (`striped-impala-387.convex.site`, 2026-09-22, event corpus ~372): the
> category feature shipped, but the distribution is broken —
> **260 "other" / 44 conflict / 26 politics / 5 storm / 4 fire / 1 flood**.
> A map that is ~70% fallback pins reads as broken even when it works. This
> prompt fixes classification AND the category set, upgrades the icon set to
> Fluent 3D (MIT), and adds programmatic animation. Read
> `gardening/7-Hackathon/Convex/06-ingestion-pipeline.md` and the G6 gate in
> `07-quality-gates.md` before coding.

---

## Diagnosis (verified — do not re-diagnose, build on it)

**Where the icons stand now:** the icon system works
(`iconId`/`catColor`/`restrained` properties on pins, 🚨 conflict, 🌊 flood,
🔥 fire, 🌀 storm, 🌋 volcano, 📍 fallback). The problem is upstream: the
classifier starves it.

**Root cause 1 — the category set has no everyday-news categories.** Sampled
"other" titles from the live map:
- "Police seize large meth shipment" → crime (no crime category exists)
- "Indonesia's Rafale pilots impress" → military/defense (doesn't exist)
- "Vietnam close to U.S. trade deal" → economy/trade (doesn't exist)
- "Sister of ex-PM arrested" → crime/politics boundary (no crime)
- "K-EXPO launch in Mexico", "Mali independence celebration" → genuinely
  culture/general (fine as other)

**Root cause 2 — the classifier under-assigns.** "Houthis push for control"
is conflict but sits in "other". The prompt presumably lets the model take
"other" as the path of least resistance. No few-shot anchors, no
"other is a last resort" instruction, no audit.

## Icon-set research (VERIFIED LIVE 2026-09-22 — do not re-research)

The owner asked for free/open-source ANIMATED icons from the internet.
Research result: **no reputable self-hostable animated-GIF emoji set exists.**
Verified against the actual repos:

| Set | License | Animated? | Notes |
|---|---|---|---|
| **Microsoft FluentUI Emoji** | **MIT** | ❌ static | Per-emoji folders: `3D/`, `Color/`, `Flat/`, `High Contrast/` + `metadata.json`. **3D PNGs are the pick** — dimensional, premium look (~32KB each). github.com/microsoft/fluentui-emoji |
| Google Noto Emoji | Apache-2.0 / OFL | ❌ static | `3D/png/{32,72,128,512}` — no animated dir in repo |
| Twemoji (current set) | CC-BY 4.0 | ❌ static | `72x72/` + `svg/` only |
| OpenMoji | CC-BY-SA 4.0 | ❌ static | SVG/PNG; share-alike + attribution |

GIPHY / LottieFiles-marketplace / Discord animations are license-mixed or
proprietary — not "open source", don't use them. **Conclusion: pick Fluent 3D
statics (MIT) and create the motion programmatically** (Part 1, task 2). The
platform agrees: MapLibre symbol layers only render static images — animated
GIFs on pins would need DOM markers for everything, which wrecks pan
performance.

## Tasks (in order)

### Part 1 — Icon upgrade (Fluent 3D + animation)

1. **Swap the icon source: Twemoji → FluentUI Emoji 3D (MIT).** Download the
   needed emoji as `assets/<Emoji Name>/3D/*_3d.png` into `public/icons/`
   (the current ~9 plus the ~5 new from Part 2; ~14 files, ~450KB total).
   Self-hosted, no runtime CDN. Map the category config table to the new
   files. Keep Twemoji as the documented fallback for any glyph Fluent
   lacks; record file origins in `public/icons/CREDITS.md` (MIT needs no
   attribution; CC-BY 4.0 does — add the line if any Twemoji is used).
2. **Animation — programmatic, two tiers (no GIFs):**
   - **All pins (cheap):** keep/build the native MapLibre halo pulse — a
     circle layer under the icons, `circle-radius`/`circle-opacity`
     breathing via `feature-state` + paint transitions. GPU-batched,
     scales to 400+ pins.
   - **Newest/hovered subset (rich, cap ~25 markers):** HTML
     `maplibregl.Marker` with the Fluent 3D PNG + CSS: gentle bob
     (`translateY` 0 → −4px → 0, ~2.4s ease-in-out infinite) + a soft
     drop-shadow swell. 3D asset + real motion = the "animated" feel with
     zero license risk. Respect `prefers-reduced-motion`.
   - **Optional stretch (only if time allows):** sprite-sheet frame-swap —
     pre-render 8 frames of the 3D PNG rotated ±6°, cycle via
     `map.updateImage()` at ~8fps for "breaking" pins only. Skip if fiddly;
     the two tiers above already deliver.
3. **Regression guards:** icons must re-register on every `style.load`
   (Flat/Night/Globe swap wipes images with the style — test the toggle
   explicitly). Unknown iconId → 📍 fallback, never a blank pin.

### Part 2 — Category starvation fix

4. **Expand the category set — from 9 to ~14, closing the real gaps:**
   - `conflict` (war, armed clash, terror, coup) — restrained per G6
   - `flood`, `earthquake`, `fire`, `storm`, `volcano`, `health`, `politics`
   - **NEW `crime`** (arrests, seizures, investigations, court cases)
   - **NEW `military`** (exercises, procurement, deployments — non-war;
     conflict stays separate; consider `restrained: true` here too)
   - **NEW `economy`** (trade deals, markets, major industry news)
   - **NEW `transport`** (plane/train/ferry accidents and disruptions —
     frequent regional news, currently drowning in "other")
   - **NEW `culture`** (festivals, expos, sport finals, entertainment)
   - `other` stays, explicitly last resort.
   Update the config table (category → icon file, color, restrained flag) —
   categories are DATA, not scattered conditionals. Fetch each new
   category's Fluent 3D PNG in task 1's pass.

5. **Rewrite the extraction prompt so "other" stops being the default:**
   - Add: "Choose the single best-fit category. `other` is a LAST RESORT for
     events that fit none of the categories — if two categories could apply,
     pick the more specific/newsworthy one."
   - Add ~8 few-shot anchors using real titles from this corpus (the
     diagnosis list above is pre-cleared for use: meth seizure → crime;
     Rafale pilots → military; Houthi offensive → conflict; trade deal →
     economy; gang-rape investigation → crime; election polls → politics).
   - Require output to include a one-line `categoryReason` — cheap, and it
     makes the spot audits in task 7 trivial.
   - Keep temperature 0 and the strict JSON schema (spec 06 contract).

6. **Backfill the existing ~260 "other" events.** One pass: re-run only the
   classification step (not re-extraction of places/tiers — don't touch
   what passed G1/G2) over events with `category = other`, batched, with the
   same prompt from task 5. Write `categoryReason` on each. Log the
   before/after distribution in `hackathon.md` — that table IS the evidence
   this feature worked.

7. **Guardrails against a swing too far.** A prompt shouting "never use
   other" can over-correct (everything becomes conflict). Rules:
   - Target distribution sanity band: `other` ≤ 25% of corpus, conflict
     between 5–25%. If outside the band after backfill, tune the prompt
     before shipping.
   - `categoryReason` spot-check: sample 20 re-classified events, human-scan
     the reasons. Junk reasons ("other because not sure") = prompt not done.

8. **Add a G-check to `npm run gate` (spec 07):** category distribution
   report — prints the histogram + `other` percentage; fails (or warns, per
   `gate.config.json` threshold) when `other` > 30%. Regression guard so
   the next prompt tweak can't silently starve the icons again.

9. **Verify end-to-end on the live site after deploy** (browser session —
   the map exposes `window.__orbiMap` / `__orbipinMap`):
   - Sweep SEA + a few world spots at z5, collect `iconId` distribution from
     `querySourceFeatures('events')` — expect `other` under ~30% of sampled
     pins and the new categories visibly present (crime/military/economy at
     least).
   - Icons render for all new categories, survive Flat/Night/Globe swaps,
     conflict pins stay muted/still (G6), newest-pin bob animation runs and
     respects reduced-motion, marker count ≤ 25 during live traffic.
   - No missing-image fallback boxes anywhere.

## Constraints

- Icon assets: self-hosted only; Fluent 3D primary (MIT), Twemoji fallback
  (CC-BY 4.0, attribution line if used) — recorded in `CREDITS.md`.
- Don't touch: tier/quotedPhrase extraction, dedup, terminator, clustering,
  projection persistence. Only classification + icon layers.
- Feature branch; `hackathon.md` entry with the before/after distribution
  table and the live-sweep numbers. `npm run gate` green before deploy.

## Success metrics (report these numbers)

1. `other` share of the live corpus: **from 260/372 (~70%) to ≤25%**, with
   re-classification spot-check ≥ 90% sensible (human-scanned
   `categoryReason`).
2. Icon set: all 14 categories rendering as Fluent 3D, animation running on
   newest pins, zero style-swap regressions in the toggle test.

---
---

# Feature Prompt (combined) — OrbiPin: close the loop (user commentary on events) + demo seed data

> Second prompt in this file, separate feature — paste independently into a
> fresh session. Deadline context: submission video is being recorded TODAY —
> Part B (demo seeds) is the priority path and ships first; Part A (the real
> loop) follows and must leave the demo seeds honest (labeled, not fake
> "live" data). Verified repo facts below — do not re-diagnose.

## Verified current state (2026-09-22, do not re-check)

- Inbound email path EXISTS and works: `convex/http.ts` webhook
  `/webhook/agentmail` (signature header) → `internal.inbound.handleInboundEmail`.
- Router knows exactly two routes in `convex/inbound.ts`: RSS inlet
  (subject `rss:`/`fw:`/fwd-ish) and ask-inbox (everything else → grounded
  LLM answer → emailed back).
- **KNOWN BUG (fix in Part A):** ask-inbox double-sends. Route 2 calls
  `answerForRegion` (which itself emails the reply) and then
  `handleInboundEmail` emails AGAIN with the same answer. Every question
  currently produces two identical reply emails.
- No `commentary` table in `convex/schema.ts` (current tables: events,
  articles, storyClusters, rawItems, followers, storyFollows, timelineMeta).
- Event card component: `PinPopup` in `src/App.tsx` (~line 654) — G5 hedged
  card with tier chip, blockquote, source chips, follow-story button.
- Map hooks for verification: `window.__orbipinMap` / `__orbiMap`.

## The feature (owner's loop)

Follow region → digest arrives → user replies with on-the-ground commentary
("the water reached my street") → the reply appears IN THE APP on that event.
Today the loop stops at "answer emailed back" — commentary is treated as a
question, answered from the corpus, and the user's own observation is
discarded.

---

## Part B — DEMO SEEDS (do this FIRST, ships today)

Goal: the event card shows an "On the ground" section with plausible,
honest reader commentary so the video can show the closed loop. These are
clearly-labeled illustrative samples, not fabricated live user mail.

1. **Schema:** add `commentary` table to `convex/schema.ts`:
   ```ts
   commentary: defineTable({
     eventId: v.id("events"),
     body: v.string(),            // the reader's words (≤280 chars, enforced)
     authorLabel: v.string(),     // display label, e.g. "Reader in Jakarta"
     receivedAt: v.number(),      // ms epoch
     verified: v.boolean(),       // false for seeds; always false for now
     seeded: v.optional(v.boolean()), // TRUE for demo seeds — honesty flag
   }).index("by_event", ["eventId"]),
   ```
2. **Seed script** `scripts/seed-commentary.ts` (run with `npx tsx`): picks
   6–10 active events across the visible wedge (mix of conflict/flood/storm
   + 1–2 politics), inserts 1–2 comments each with `seeded: true`,
   `verified: false`. Copy bank (edit freely, keep tone eyewitness-calm,
   no danger-claiming, no numbers we can't show):
   - "Water is up to my knees on the small road. Main street still passable."
   - "Power has been out in our neighborhood since early morning."
   - "Market opened today but only half the stalls are back."
   - "Heard the announcement loop around 6am — everyone moved to the mosque."
   - "Traffic out of the city is very slow but moving."
   - "Phone signal is patchy; messages only send near the square."
   - "Ash smell in the air since last night, windows staying shut."
   - "Volunteers are handing out drinking water near the bridge."
3. **Card UI:** in `PinPopup`, under the sources block — a compact
   "On the ground" section (honest G5-consistent framing):
   - Section header: `On the ground · unverified reader reports`
   - Each comment: quoted body + `authorLabel` + humanized `receivedAt`
     (reuse the existing `humanized()` helper).
   - Footer line, small, muted: `Reply to any OrbiPin email to add yours —
     reviewed before showing.` (true intent; the review step lands in
     Part A).
   - Cap display at 3 comments + "+N more" chip.
4. **Map badge (small, high video value):** events with commentary get a
   tiny ring/dot on their pin (e.g. `circle-stroke-color: amber` via a
   boolean property `hasCommentary` from the live query — extend
   `mapData.activeEventsGeo` to include a `commentaryCount`).
5. **Honesty rules (non-negotiable):** seeds always carry `seeded: true`
   and `verified: false`; the card renders the `unverified reader reports`
   label on ALL commentary (so seeded or not, nothing pretends to be
   verified news). The video may show these; nothing in the UI claims they
   are live user mail. Log in `hackathon.md`: "demo commentary seeded,
   labeled unverified — real inbound loop shipped same day (Part A)."
6. **Deploy to prod + verify live:** card shows the section on a seeded
   event; pin badge visible; style-swap (Flat/Night/Globe) keeps everything.

---

## Part A — THE REAL LOOP (follows Part B, same session if time allows)

1. **Fix the ask-inbox double-send first** (in `convex/inbound.ts`): remove
   the send inside `answerForRegion` OR the one in `handleInboundEmail`
   Route 2 — one send per question. Verify with a test question that
   exactly one reply email is generated.
2. **Route 3 — commentary classifier:** in `handleInboundEmail`, before the
   ask-inbox default, classify the reply. Cheap deterministic pre-filter:
   if text ends with `?` or starts with question words → ask-inbox;
   otherwise → commentary candidate. Then one OpenAI call (temp 0, strict
   JSON): `{ type: "question" | "commentary", eventRef: string|null,
   body: string }` where `eventRef` is matched against the events the
   sender FOLLOWS (most recent/most relevant by keyword overlap). No
   match → still store, `eventId = null`, queue for manual attach
   (admin query), never attach to a wrong event.
3. **Store through a moderation gate:** commentary rows insert with
   `verified: false` and only display after either (a) a lightweight check
   (no URLs, no phone numbers, ≤280 chars, no profanity list hit) sets a
   `autoApproved: true`, or (b) manual approval via an internal mutation.
   Owner decides display threshold — default: auto-approved shows, others
   don't. Junk/abuse goes to a review queue, never the map.
4. **Confirmation reply (the loop-closer):** after storing, send ONE email
   back: "Thanks — your report was added to 'Reports of {event}' in
   {place}. View it live: https://striped-impala-387.convex.site (reports
   show as unverified reader commentary)."
5. **Realtime display:** the card section from Part B is already wired to
   the same table — a comment arriving via webhook appears on open maps
   within the Convex live-query refresh. Verify: insert via internal
   mutation → card updates without reload.
6. **Gate addition (`npm run gate`):** `commentary` check — no displayed
   comment exceeds 280 chars, none with `verified: true` exists (until a
   real verification path exists), seeded rows are flagged. Keeps the
   honesty story mechanical (spec 07 pattern).
7. **Verification:** send a real test email through the AgentMail inbox
   containing a commentary-style reply; confirm: one reply email (not two),
   row in `commentary`, visible on the event card live, honest labels
   intact.

## Constraints (both parts)

- Don't touch: tier/quotedPhrase extraction, dedup, terminator, clustering,
  projection persistence, icons.
- G5 discipline extends to commentary: reader text is NEVER merged into the
  event description or the digest as if it were news — it renders in its
  own labeled section only.
- `npm run gate` green; feature branch; `hackathon.md` entry per part with
  evidence (the confirmation email text + live card screenshot count).
- Bundle budget: card additions are text + styles only, no new deps.

## Success criteria

- Part B: seeded "On the ground" section visible on live prod on 6+ events,
  pin badges showing, style-swap safe — recordable.
- Part A: a real inbound reply becomes an on-card comment with exactly one
  confirmation email sent, wrong-event attachment impossible, honesty
  labels on everything.
