# Fix-Session Prompt — OrbiPin: epoch-zero timestamps + G3 dedup audit

> Copy everything below the line into a fresh Hermes session working in the
> OrbiPin repo. Context block first (what we verified, what's broken), then
> the task list. Evidence is included so the fixer doesn't re-test from zero.

---

You are fixing two issues in the **OrbiPin** repo (Convex full-stack app:
news events as pins on a MapLibre globe). A live verification pass was run
against the production deployment `https://striped-impala-387.convex.site/`
on 2026-09-22. The specs live in `gardening/7-Hackathon/Convex/` — especially
`03-pins-clustering-live.md` (G3 dedup + card), `06-ingestion-pipeline.md`
(write path), `07-quality-gates.md`. Read those three before coding.

## Verified context (do not re-discover)

**What already works (no need to touch):**
- Globe projection survives style swaps (Flat/Night/Globe toggle — re-assert
  on `style.load` confirmed working; all 7 custom layers re-register)
- Clustering: active at z3.5 (clusters up to 38), none at z15 ✓ (spec 03)
- Day/night terminator: correct math (within 2°), `#060a14` @ 0.38 ✓ (spec 04)
- Pin cards render with G5 hedged framing ("Reports of…", tier, place,
  source count, quotedPhrase) ✓ (spec 03/05)
- 367 events live from Convex, subscriptions syncing to `convex.cloud` ✓

**Bug 1 — epoch-zero timestamps (confirmed, reproducible):**
Clicking any pin shows `Latest: dw · 1970-01-01 00:00 UTC`. Every inspected
pin had this, so `publishedAt` is 0/null/undefined across the corpus.
Suspects, in order:
1. Ingestion never extracts a publish date (Firecrawl markdown rarely has a
   clean date; the extraction call may not request one)
2. Seconds-vs-milliseconds mixup (`Date.now()/1000` stored, rendered as ms)
3. Card falls back to `new Date(0)` instead of "date unknown"

**Bug 2 — G3 dedup not visibly working (strong signal, needs audit):**
All sampled pins show `sources: 1`. With 367 events from a 40-outlet-style
news corpus there should be multi-source clusters (the "×12" badge design in
spec 03). Either the deterministic merge thresholds (normalized headline
similarity + same tier-place within 48h) are too strict, or the LLM
`storyClusterId` is never populated/used. Also: quoted phrases coming through
are 2-word fragments ("in Delhi") instead of the verbatim sentence spec 02
requires — same extraction call likely needs tightening.

## Tasks (in order)

1. **Locate the write path.** Find the Convex mutation(s) that insert
   articles/events (spec 06: ingestion → extraction → events table). Confirm
   how `publishedAt` and `storyClusterId` are set today.

2. **Fix Bug 1 at the root:** extraction must return a publish date when the
   article has one (add to the OpenAI extraction schema if missing); store
   consistently (pick ms epoch, document it); render "date unknown" in the
   card when absent — never epoch zero.

3. **Backfill or accept existing rows:** decide whether the 367 existing
   events get re-extracted for dates, or the fix applies to new ingests only.
   State the decision in the build log.

4. **Audit G3 (don't guess):** query the clusters table — what % of events
   have ≥2 sources? If ~0%, loosen/check the deterministic threshold and
   verify `storyClusterId` is actually populated by the extraction call.
   The 48h window + similarity threshold values should land in
   `gate.config.json` (spec 07), not hardcoded.

5. **Tighten quotedPhrase:** extraction prompt must demand the full verbatim
   sentence containing the location, not a fragment (spec 02).

6. **Guardrails:** the `npm run gate` spine (spec 07) should catch both
   regressions — add/strengthen: G1 audit flags quoted phrases < N words;
   a card-date check (no rendered date earlier than 2000-01-01); G3 cluster
   sampling prints the multi-source %.

7. **Verify against the live site** (browser or curl on
   `striped-impala-387.convex.site`): after redeploy, a pin card shows a real
   date (or "date unknown"), and the cluster counts show merged sources
   where the same story came from multiple outlets.

## Constraints

- Follow the repo's `AGENTS.md` / feature-branch flow (no direct pushes to
  main).
- Append evidence-based entries to `hackathon.md` per milestone (what
  changed, files touched, Convex features used — numbers, not adjectives).
- Don't touch what's verified working (globe/projection/terminator/clustering).
- Spec 07's rule applies: any gate red blocks deploy.
