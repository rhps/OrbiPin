# OrbiPin

A living globe of curated regional news. Events are pins on an orbiting globe,
clustered sensibly, honest about precision, with a day/night terminator and a
follow-by-email habit loop.

**Stack:** Convex (backend, DB, realtime, hosting) · MapLibre GL JS (globe) ·
OpenFreeMap (tiles) · Firecrawl (ingestion) · OpenAI (extraction) · AgentMail (inbox)

## Status

MVP in progress on branch `feature/mvp-implementation`. Specs live in the
product vault (`7-Hackathon/Convex/`).

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
