# Feature Spec — 09: Timeline (Past Events)

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
A scrubable timeline of the region's events — what happened before "now" —
built from a one-shot GDELT historical backfill plus everything the app has
collected live since launch.

## Why
The friend's original idea included history, and the "on this day" digest hook
(spec 05) needs it. History *scraping* was ruled scope creep by unanimous
council verdict; a backfill import is the honest, cheap version.

## What Changes
- One-evening bulk import of the region's historical events from GDELT
- Timeline scrubber: drag through days/weeks; pins appear/disappear as time moves
- Timeline data feeds "on this day" in the weekly digest
- Live events (post-launch) accumulate into the same timeline automatically

## Requirements
- WHEN the user scrubs the timeline to date D THE SYSTEM SHALL render only
  events whose [start, end] window contains D
- WHEN the user presses "play" THE SYSTEM SHALL animate through the selected
  range at a readable pace (e.g. 1 week/second)
- WHEN the app starts with an empty live history THE SYSTEM SHALL still show
  the GDELT backfill for the region (never an empty timeline if backfill ran)
- WHEN the weekly digest builds "on this day" THE SYSTEM SHALL query events
  from the same table (one source of truth)
- IF a backfill event lacks precision tiers THEN it SHALL import at country
  level with `source: "gdelt-backfill"` provenance marked on the pin

## Design
- **Source:** GDELT Events API filtered to the wedge region + date range;
  mapped to our event shape (tier: country/province from GDELT geo fields).
- **Backfill = bulk import script** (`scripts/backfill-gdelt.ts`), run once per
  region, idempotent (upsert by external id). NOT a scraping pipeline.
- **Timeline storage:** same events table + `occurredAt`/`archivedAt` fields;
  archived events keep timeline visibility but leave the live globe (G4).
- **UI:** range slider + play button; scrubbing sets a time-window query
  parameter on the events live query.

## Out of Scope
- Scraping history sources (council-unanimous cut)
- Second data pipeline maintenance
- Minute-level historical accuracy

## Tasks
- [ ] 1. GDELT API mapping doc (fields → our event shape)
- [ ] 2. `backfill-gdelt.ts` import script (idempotent, region+range args)
- [ ] 3. Timeline scrubber UI + time-windowed live query
- [ ] 4. "On this day" digest query (spec 05 consumer)
- [ ] 5. Provenance badge on backfill pins

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
