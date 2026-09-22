# Feature Spec — 03: Event Pins, Clustering & Live Updates

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
News events appear as pins on the globe in real time, clustered sensibly at
every zoom level, and clicking a pin shows the story's latest state with all
sources. For the reader tracking what's happening now.

## Why
The council's killer question: "40 outlets cover one earthquake — does the map
show 40 dots or 1?" And Convex depth (judging criterion 2) requires the realtime
layer to do real work, not decorate.

## What Changes
- Events stored in Convex; frontend subscribes via live query → pins update without refresh
- Geometric clustering (MapLibre cluster layers) from world view down to z14
- One story = one pin regardless of how many outlets covered it (G3 dedup)
- Clicked pin opens the story's latest article first, full source list beneath
- "Follow this story" toggle on each pin

## Requirements
- WHEN a new event is written to Convex THE SYSTEM SHALL render its pin on all
  open maps within 1 second, without page refresh
- WHEN multiple articles describe the same story (same cluster id OR ≥threshold
  headline similarity AND same tier-place within 48h) THE SYSTEM SHALL attach
  them as sources to one pin
- WHEN a user clicks a pin THE SYSTEM SHALL show the newest article in the
  cluster (max publishedAt) with all sources and timestamps listed below
- WHEN a user activates "follow this story" THE SYSTEM SHALL subscribe their
  identity (AgentMail address) to updates for that cluster
- WHEN the map is at zoom ≥14 THE SYSTEM SHALL NOT cluster pins (every pin stands alone)
- WHEN a cluster is clicked THE SYSTEM SHALL ease into it and split it
- IF a cluster contains events of different tiers THEN the cluster badge SHALL
  show the count and the pin colors shall resolve on expansion

## Design
- **Dedup layers:** (a) LLM `storyClusterId` during extraction, (b) deterministic
  normalized-headline-similarity + same tier-place within 48h. New pin only if
  both agree it's new; otherwise the article joins the existing cluster.
- **Map clustering:** MapLibre `cluster: true, clusterRadius: 35, clusterMaxZoom: 14`
  (verified in sandbox). Cluster badge = `point_count_abbreviated`.
- **Latest-article card:** sort cluster sources by `publishedAt` desc, head with
  the newest. Card content type enforces `sources: NonEmptyArray<Source>` (G5).
- **Realtime:** Convex `useQuery` → GeoJSON conversion → `map.getSource("events").setData()`.
- **Follow:** subscription row in Convex keyed by AgentMail address + cluster id.

## Out of Scope
- Push notifications (email is the channel — spec 05)
- Story-thread visualization (reply chains)
- Editing/merging clusters manually (v2 admin)

## Tasks
- [ ] 1. Convex schema: events, articles, sources, clusters, follows
- [ ] 2. Realtime query → GeoJSON converter
- [ ] 3. Port cluster layers from sandbox (already verified)
- [ ] 4. Pin click card component (G5-typed)
- [ ] 5. Dedup write-path logic (cluster match + attach-as-source)
- [ ] 6. "Follow this story" toggle + Convex subscription
- [ ] 7. Cluster-sampling check in `npm run gate`

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
