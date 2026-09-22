# OrbiPin — Feature Specs

Numbered feature specs, one file each. Format:
`../../gardening/08-AI-Resources/01-Protocol/Feature Spec Format.md`
(copy in vault). Review gate: no code before the spec's Review section is filled.

## Index

| # | Spec | Status | Depends on |
|---|------|--------|------------|
| 00 | [Spike Findings](00-spike-findings.md) | reference (done) | — |
| 01 | [Globe Map Core](01-globe-map-core.md) | draft | 00 |
| 02 | [Region Precision & Hover Areas](02-region-precision-areas.md) | draft | 01 |
| 03 | [Event Pins, Clustering & Live Updates](03-pins-clustering-live.md) | draft | 01, 02 |
| 04 | [Day/Night Terminator](04-day-night-terminator.md) | draft | 01 |
| 05 | [Habit Loop (Alerts, Ask-Inbox, Digest, Follow)](05-habit-loop.md) | draft | 03 |
| 06 | [Ingestion Pipeline (Firecrawl + RSS inlet)](06-ingestion-pipeline.md) | draft | 01 |
| 07 | [Quality Gates & `npm run gate`](07-quality-gates.md) | draft | 01–06 |
| 08 | [Sky, Atmosphere & Visual Modes](08-sky-atmosphere-visual-modes.md) | draft — awaiting owner re-implementation | 01 |
| 09 | [Timeline (Past Events)](09-timeline.md) | draft | 03 |
| 10 | [Deployment & Release Pipeline](10-deployment-release.md) | draft | 07 |
| 11 | [Build Log & Social Proof](11-build-log-social.md) | draft | — |
| 12 | [Full-Text Search](12-full-text-search.md) | draft | 03 |

## Suggested build order
1. **01** scaffold + globe (everything hangs on this)
2. **06** ingestion whitelist + first crawl (data before pixels)
3. **02** precision tiers + hover areas (trust layer)
4. **03** pins/clusters/live updates (the product)
5. **04** terminator (ambient realism)
6. **07** gates spine (starts thin, grows with each feature)
7. **05** habit loop (retention)
8. **09** timeline (backfill)
9. **10** deploy/release pipeline (before "live URL" matters)
10. **08** sky re-implementation (owner-driven, whenever)
11. **11** log + social (continuous, from first commit)
12. **12** search (Convex-depth signal; anytime after 03 exists)
