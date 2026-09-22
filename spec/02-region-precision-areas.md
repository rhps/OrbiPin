# Feature Spec — 02: Region Precision & Hover Areas

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
Every event pin states how precisely the news located it (city / regency /
province / country), and hovering a pin highlights the *area* that tier covers.
For readers deciding how much to trust a pin.

## Why
LLM geo-tagging is confidently wrong often enough that one wrong city pin kills
trust (council finding #2, 4-for-4). Pin level = evidence level makes precision
visible instead of claimed.

## What Changes
- Extraction pipeline returns a precision tier per event: `city` / `adm2` / `province` / `country`
- The tier is whatever the article actually names — never guessed up or down
- Coordinates/geometry resolve from a boundary lookup table, never from the LLM
- Hovering a pin highlights its area: city pins grow a focus ring; province/country
  tiers fill their polygon

## Requirements
- WHEN the extractor processes an article THE SYSTEM SHALL return
  `{placeName, tier, quotedPhrase, confidence}` with `quotedPhrase` being the
  verbatim location sentence from the article
- WHEN an event has no `tier` or empty `quotedPhrase` THE SYSTEM SHALL reject
  the write (schema validator) and queue it for review
- WHEN a pin is hovered THE SYSTEM SHALL visually highlight the area its tier covers
- WHEN a place name cannot be matched to the boundary table THE SYSTEM SHALL
  place it in a review queue and NOT render it on the map
- IF two place names collide across tiers (e.g. "Jakarta" city vs province)
  THEN the tier stated in the article decides the geometry

## Design
- **Boundary data:** [geoBoundaries](https://www.geoboundaries.org/) ADM1/ADM2
  (CC-BY 3.0 / ODbL — verified live for Indonesia; ADM2 = regency/city).
- **Payload control:** simplify polygons with [mapshaper](https://mapshaper.org/)
  to keep hover fills fast; store per-country JSON assets, load on demand.
- **Lookup contract:** `placeName + tier → geometry`. Single source of truth (G2).
- **Precedent:** verified working in the sandbox spike (hover fills West Java /
  Timor-Leste polygons).

## Out of Scope
- Street-level pin placement
- Soft twilight gradients on the terminator (spec 04)
- Manual geocoding UI (review queue is read-only for v1)

## Tasks
- [ ] 1. Fetch geoBoundaries ADM1/ADM2 for the wedge region; simplify with mapshaper
- [ ] 2. Build lookup table `placeName+tier → geometry id` with fuzzy match + confidence
- [ ] 3. Schema validator rejecting events without tier/quotedPhrase
- [ ] 4. Review queue (Convex table + simple admin query)
- [ ] 5. Hover-highlight layers (port from sandbox `area-fill`/`area-line`)
- [ ] 6. Unmatched-place report in `npm run gate`

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
