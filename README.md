# OrbiPin

A living globe of curated regional news. Events are pins on an orbiting globe,
clustered sensibly, honest about precision, with a day/night terminator and a
follow-by-email habit loop.

**Stack:** Convex (backend, DB, realtime, hosting) · MapLibre GL JS (globe) ·
OpenFreeMap (tiles) · Firecrawl (ingestion) · OpenAI (extraction) · AgentMail (inbox)

## Status — feature-complete MVP

Live: https://striped-impala-387.convex.site · Specs live in the product
vault (`7-Hackathon/Convex/`) · Evidence log: `hackathon.md`

**Feature branches (not yet merged to main):** `feature/search` ·
`feature/transparency` · `feature/commentary-loop` · `feature/category-fix` ·
`feature/region-detect` · `feature/day-replay` · `prep/production`

**Shipped:** globe + 231-country hover areas (exact PIP hit-testing) ·
full-text search (Convex searchIndex, `/` shortcut) · transparency panel ·
follow-by-email habit loop · reader commentary loop (seeds + inbound) ·
14 category icons (Fluent 3D, G6 restrained conflict/military) · day replay
· branded splash · day/night terminator · spiderfy clustering.

## Gates & deploy

```bash
npm run gate                 # icons (G6) + search fixture + tsc
npx convex deploy            # backend to prod
npm run build && npx @convex-dev/static-hosting upload dist   # site
```

CI runs gates on every PR (preview deploy, never touches prod).
Production deploys on `v*` tags via `.github/workflows/deploy-prod.yml`
(needs `CONVEX_PROD_DEPLOY_KEY` secret + `VITE_CONVEX_URL` var).

## Development

```bash
npm install
npx convex dev          # backend (requires CONVEX_DEPLOY_KEY or login)
npm run dev             # frontend on :5173
```

## Gates

`npx tsc --noEmit` must pass before any deploy (G5 audit). The full
`npm run gate` spine (G1–G6) is specified in the vault specs (07) and lands
with the ingestion milestone.
