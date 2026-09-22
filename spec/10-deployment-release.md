# Feature Spec — 10: Deployment & Release Pipeline

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
How code reaches production: trunk-based main, gated CI, tag-gated releases —
the selatan.org CI/CD pattern adapted to Convex (preview deploys per PR, prod
only from release tags).

## Why
`npm run gate` only protects deploys if the deploy path is structured. Without
a pipeline, "live URL" (a judging criterion) depends on someone remembering to
deploy — and rollback has no anchor.

## What Changes
- GitHub Actions workflow: CI on PR (typecheck, lint, `npm run gate`, preview deploy)
- Staging auto-deploy from `main` (Convex development deployment)
- release-please in manifest mode: Release PR → tag `vX.Y.Z` → production deploy
- Convex static hosting serves the frontend at `https://<deployment>.convex.site`

## Requirements
- WHEN a PR is opened THE SYSTEM SHALL run typecheck + lint + `npm run gate`
  and deploy a throwaway Convex preview deployment — never staging/prod
- WHEN a PR merges to main THE SYSTEM SHALL auto-deploy the staging (development)
  deployment
- WHEN a Release PR merges THE SYSTEM SHALL tag `vX.Y.Z`, create a GitHub
  Release, and deploy production (backend + static hosting upload)
- WHEN production deploys THE SYSTEM SHALL run `npm run gate` again as a
  pre-deploy step inside the deploy job
- IF a prod deploy fails THEN the previous release tag SHALL remain the
  rollback anchor (re-deploy by tag)
- IF secrets are needed THE SYSTEM SHALL store them env-scoped (GitHub
  environment secrets for `CONVEX_DEPLOY_KEY` staging/prod; runtime keys via
  `npx convex env set` per deployment)

## Design
- **Pattern source:** selatan.org CI/CD pattern (rules 1–6, proven on
  legalcheck), adapted: Cloudflare Workers deployments → Convex deployments;
  wrangler → `npx convex deploy`; preview worker → `convex deploy --preview`.
- **Rule 6 port:** release-please can't trigger `on: release` workflows with
  GITHUB_TOKEN — the deploy job is *called* from the release workflow, with an
  `on: release` + tag-prefix filter as backup for manual publishes.
- **Single project** (no monorepo path filters needed yet) — keep the structure
  so filters are easy to add if the repo ever hosts siblings.

## Out of Scope
- Multi-environment preview per PR (single shared preview deployment is enough)
- Monorepo path filtering
- Self-hosted runners

## Tasks
- [ ] 1. `.github/workflows/ci.yml` — typecheck/lint/gate on PR
- [ ] 2. Preview deploy job (`convex deploy --preview`) on PR
- [ ] 3. Staging auto-deploy job on merge to main
- [ ] 4. release-please config + manifest
- [ ] 5. Prod deploy workflow called from release flow (tag filter `v*`)
- [ ] 6. GitHub environments: `staging`, `prod` with scoped secrets
- [ ] 7. Smoke test: staging URL 200 → Release PR merge → prod URL 200

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
