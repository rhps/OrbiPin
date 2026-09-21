# OrbiPin — Agent Guidance

OrbiPin: a living globe of curated regional news. Convex is the backend (non-negotiable).
Map stack: MapLibre GL JS globe projection + OpenFreeMap tiles + geoBoundaries polygons.
Full product brief: see the vault doc `7-Hackathon/02. Convex All Gas Hackathon.md`.

## Governing rules (inherited — read before writing code)

Complete guidance map — every rule we have, where it comes from, and whether
OrbiPin needs it:

| # | Guidance | Source | Rule in one line | OrbiPin needs it |
|---|---|---|---|---|
| 1 | Code Budget Ladder | AI Engineering Protocol | 7 rungs, first "yes" wins; YAGNI is the kill switch | ✅ YES — core discipline for agent-built code |
| 2 | `ponytail:` debt markers | AI Engineering Protocol | corner-cuts only with a stated ceiling; grep-stable; audit before milestones | ✅ YES — speed without silent landmines |
| 3 | Done means verified | AI Engineering Protocol | typecheck, lint, gates run; report what ran | ✅ YES — kills "should work" reports |
| 4 | One thing at a time | AI Engineering Protocol | no drive-by refactors, no smuggled features | ✅ YES |
| 5 | Spec authority | tickerparse guardrails | hackathon doc + `hackathon.md` are contracts; contradicting code fails review | ✅ YES |
| 6 | G1–G6 quality gates | OrbiPin brief (council-mandated) | precision tiers, boundary lookup, dedup, staleness, framing types, tone config | ✅ YES — the product's own law |
| 7 | `npm run gate` blocks deploy | OrbiPin brief (still-true pattern) | one command, all six gates, red = no deploy | ✅ YES — the enforcement spine |
| 8 | Trunk-based main | selatan.org CI/CD pattern | `main` is the only integration branch; staging/prod are deploy targets, not branches | ✅ YES |
| 9 | PRs never deploy envs | selatan.org CI/CD pattern | PRs get CI + throwaway preview deploy only | ✅ YES |
| 10 | Tag-gated releases (release-please) | selatan.org CI/CD pattern | Release PR → tag vX.Y.Z → prod deploy; rollback anchors free | ✅ YES |
| 11 | Env-scoped secrets | selatan.org CI/CD pattern | runtime keys via `convex env set` per deployment; repo holds only deploy creds | ✅ YES |
| 12 | Sandbox quarantine | owner decision | experiments/discussions/temp in `sandbox/`, never pushed | ✅ YES |
| 13 | Strict TypeScript everywhere | engineering-guidelines | strict mode; the type system is the first guardrail | ✅ YES — G5 depends on it |
| 14 | Ingestion licensing rules | engineering-guidelines (documesh rule) | official interfaces (llms.txt/RSS) or permissive licenses only; never scrape what has an official API | ✅ YES — directly shapes the source whitelist |
| 15 | Write path ≠ read path | engineering-guidelines (tickerparse principle) | ingestion = cron batch writes; reads = cache-heavy, pre-aggregated | ✅ YES — crons ingest, live queries read |
| 16 | 300-line frontend file gate | engineering-guidelines (tickerparse) | CI lint blocks frontend files >300 lines | ⏳ LATER — from the first real frontend sprint |
| 17 | Framework stack defaults (Hono/D1/etc.) | engineering-guidelines | Cloudflare-native defaults | ❌ NO — OrbiPin is Convex-mandated (hackathon rule); deviation is the hackathon's law |
| 18 | JWT/refresh auth patterns | engineering-guidelines | auth stack defaults | ❌ NO — no auth planned (rules say optional) |
| 19 | SQL repository layer / parameterized SQL | engineering-guidelines + tickerparse | SQL rules | ❌ NO — Convex is not SQL-shaped; its own validators apply |
| 20 | ML feature-correctness / PIT / monitoring specs | engineering-guidelines (Dojo) | ML systems law | ❌ NO — no ML training pipeline in scope |

**Priority for build day:** 1–12 are in force from the first commit (this file).
13 arrives with the scaffold. 14 shapes the source whitelist before the first
Firecrawl call. 16 activates at the first UI milestone. 17–20 are consciously
out — recorded here so the deviation is deliberate, never silent.

## Governing rules (detail)

Read the detail below before writing code:

1. **Code Budget Ladder** (from AI Engineering Protocol): Does it need to exist?
   Already in codebase? Stdlib? Platform feature? Installed dep? One line?
   Only then: minimum that works. First "yes" wins.
2. **`ponytail:` markers** — corner-cuts allowed only with a stated ceiling:
   `// ponytail: <cut> — <known ceiling>`. Grep-stable; audit before milestones.
3. **Done means verified** — typecheck, lint, gates run; report what you ran.
4. **One thing at a time** — no drive-by refactors, no smuggled features.
5. **Spec authority** — the hackathon doc + `hackathon.md` are the approved
   contracts; contradicting code fails review unless the doc is amended first.

## OrbiPin-specific guardrails (the G1–G6 gates)

| Gate | Enforcement | Trigger |
|---|---|---|
| G1 precision | Pin level = evidence level (city/adm2/province/country); `quotedPhrase` mandatory; geometry from boundary lookup, never the LLM | every write |
| G2 integrity | `placeName + tier → geometry` lookup is the only geo source of truth; unmatched → review queue | every write |
| G3 dedup | LLM cluster id + deterministic check; new pin only if both agree; pin shows newest article | every insert |
| G4 staleness | `lastSeenAt` paint-colored; last-known-good snapshot on deploy; 7-day archive cron | paint / deploy / nightly |
| G5 framing | `sources: NonEmptyArray<Source>` — zero-source events are a compile error | compile + render |
| G6 tone | Human-approved icon/tone config; sensitive events render restrained | config change + CI |

**`npm run gate` runs all six — any red gate blocks deploy.**

## Deployment & release (adapted from the selatan.org CI/CD pattern)

- **Trunk-based: `main` is the only integration branch.** Work on short-lived
  feature branches → PR → merge. Staging/prod are deployment targets, not branches.
- **PRs never deploy environments.** A PR gets CI (typecheck, lint, gate) +
  a throwaway Convex preview deploy (`npx convex deploy --preview`). Prod deploys
  only from `main` (development deployment) or a release tag (production).
- **Releases are tag-gated (release-please).** Merges accumulate on main →
  Release PR (version bump + changelog) → merge it → tag `vX.Y.Z` → prod deploy
  (`npx convex deploy` + static hosting upload). Rollback anchors come free.
- **Secrets are env-scoped, never in the repo.** Runtime keys (OPENAI, FIRECRAWL,
  AGENTMAIL) go in via `npx convex env set` per deployment — GitHub Actions secrets
  only for deploy credentials (`CONVEX_DEPLOY_KEY`), split staging vs prod.
- **Gate before deploy, always:** `npm run gate && npm run deploy`. A red gate
  blocks the release, no exceptions — that is the whole point of the spine.

## Sandbox

`sandbox/` is gitignored. Experiments, discussions, throwaway scripts live there.
Nothing in sandbox is ever referenced by committed code.
