# Feature Spec — 12: Full-Text Search

**Date:** 2026-09-22 · **Project:** OrbiPin · **Status:** draft

## Summary
A search box over the whole event corpus: type "flooding" or "Yogyakarta" and
get matching event pins, each linking back to its map card. For readers who
know what they're looking for but don't know where it is on the globe.

## Why
The hackathon doc names search as a Convex-depth marker twice ("search powers
*everything about flooding this week*"; the depth checklist includes full-text
search), but no spec owned it. It is also the natural entry point the globe
lacks: a globe rewards browsing, search rewards intent. Judged apps in the
field scan used search as evidence of real backend depth.

## What Changes
- Convex search index over event clusters (title + latest-article body +
  place names), with filters: region tier+place, tier, date range
- Search box in the app chrome; results list syncs with the map
  (click a result → `flyTo` the pin + open its card)
- Search results are the same G5-typed event card data the map uses —
  no second rendering path
- The ingest write path updates the searchable fields (keeps the index fresh
  via the same mutation that attaches sources)

## Requirements
- WHEN a user submits a query THE SYSTEM SHALL return matching clusters
  ranked by relevance within 500 ms, paginated (20 per page)
- WHEN a query matches an article attached to a cluster THE SYSTEM SHALL
  return that cluster (search hits sources, results show events)
- WHEN filters are set (region tier+place, event tier, date range) THE
  SYSTEM SHALL apply them before ranking
- WHEN a user clicks a search result THE SYSTEM SHALL fly the globe to that
  pin and open its event card — the same card the map click shows
- WHEN a query has no matches THE SYSTEM SHALL show an explicit empty state
  ("no events match") with the active filters named — never a blank list
- WHEN a cluster gains a new source or the latest article changes THE SYSTEM
  SHALL update its searchable fields on the same write (index never lags
  behind the pin)
- IF the query is empty or whitespace THEN the system SHALL show the
  unfiltered default view, not an error

## Design
- **Index:** Convex `searchIndex("search")` on the clusters table over
  `searchText` (concatenated: latest title + summary + place names) +
  `filterFields` for tier, region tier+place, and `lastSeenAt` (date filter).
- **searchText is derived, not stored twice by hand:** a Convex mutation
  recompute on every cluster write (G3 attach, latest-article change) —
  single write path, index cannot drift.
- **Map sync:** search sets a highlighted-result state; the map component
  already renders from the same live query shape, so results and pins share
  one source of truth.
- **Alternatives rejected:** external search service (new infra, no depth
  credit for Convex); client-side filtering of all events (breaks at scale,
  no relevance ranking); LLM-powered semantic search (v2 — expensive, and
  keyword-first matches the corpus better).
- **Query caps:** hard 10 results/page render on map + rate-limit mutation via
  `@convex-dev/rate-limiter` if abuse appears (v1: plain HTTP action is fine).

## Out of Scope
- Semantic / vector search (v2, after keyword search proves usage)
- Searching inside archived events is INCLUDED, but with a provenance-filter
  toggle (`gdelt-backfill` on/off) — no separate index
- Saved searches / search-alert digests (follow-a-region in spec 05 covers it)
- Autocomplete / typeahead (v2 polish)

## Tasks
- [ ] 1. Add `searchText` + filter fields to the clusters schema + search index
- [ ] 2. Derived-`searchText` recompute in the cluster write path (G3 attach,
       latest-article change)
- [ ] 3. `api.search` query: relevance rank + filters + pagination
- [ ] 4. Search box UI + results list (G5-typed cards)
- [ ] 5. Result-click → `flyTo` + open event card (map sync)
- [ ] 6. Empty state with named active filters
- [ ] 7. Fixture: seed 50 events, verify ranking + filters (feeds G-checks)

## Review
Approved by: owner (via session instruction) · Date: 2026-09-22
