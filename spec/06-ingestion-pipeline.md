# Feature Spec — 06: Ingestion Pipeline (Firecrawl + RSS inlet)

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
The data feed: a Convex cron crawls a whitelisted source list via Firecrawl,
extracts structured events with OpenAI, and writes them through the G1–G3
gates into the events table. Users can also feed it via email (RSS inlet).

## Why
The pipeline IS the project (council consensus). Firecrawl must do real
crawling work (sponsor criterion), and the quality of every pin downstream
depends on what enters here.

## What Changes
- Whitelist of ~10 sources for the launch region (RSS-first where available)
- Convex cron schedules crawls; Firecrawl fetches article pages → clean markdown
- OpenAI extracts `{event, placeName, tier, quotedPhrase, confidence, storyClusterId}`
- User-email RSS inlet: forwarding a newsletter/scrolling item to the app's
  AgentMail address enters the same pipeline
- Everything passes the G1–G6 gates before becoming a pin

## Requirements
- WHEN the crawl cron fires THE SYSTEM SHALL crawl only whitelisted sources,
  within the estimated credit budget (crawl budget table checked before adding a source)
- WHEN Firecrawl returns an article THE SYSTEM SHALL extract the structured
  event fields and require `quotedPhrase` to exist verbatim in the text
- WHEN a source offers RSS/llms.txt THE SYSTEM SHALL prefer that interface over
  scraping (ingestion licensing rule — never scrape what has an official interface)
- WHEN a user emails an RSS item or feed link THE SYSTEM SHALL ingest it through
  the same gates and record it under that user's feed list
- WHEN extraction fails or confidence < threshold THE SYSTEM SHALL skip the
  article and log it to the review queue, not guess
- IF the crawl errors or times out THEN the cron SHALL retry per policy and
  alert via the ops channel; the map keeps rendering the last-known-good data

## Design
- **Structured feeds first, scraping second.** RSS gives clean + licensed data;
  Firecrawl adds the long tail (paywall-free pages) and deep extraction on the
  whitelist. This matches the council's architecture inversion and the legal posture.
- **Write path ≠ read path:** ingestion is batch writes from crons; the map
  reads via live queries. No crawl happens inside a request path.
- **Extraction contract:** one OpenAI call per article, strict JSON schema,
  model configured via env (`OPENAI_MODEL`), temperature 0 for determinism.
- **Budget table:** each whitelist source has: interface type, crawl frequency,
  credits/crawl estimate, owner. Reviewed before adding.

## Out of Scope
- Crawling non-whitelisted sites discovered dynamically
- Paywall circumvention / aggressive browser-fleet scraping
- Non-English sources (v1; region languages are v1.5)

## Tasks
- [ ] 1. Source whitelist doc + budget table for the wedge region
- [ ] 2. Convex cron + Firecrawl action (port from sandbox spike's verified call)
- [ ] 3. OpenAI extraction function + strict schema
- [ ] 4. quotedPhrase verification (substring check against fetched text)
- [ ] 5. RSS/llms.txt preference pass over the whitelist
- [ ] 6. Email RSS inlet (AgentMail inbound → same extraction path)
- [ ] 7. Ops alerts on crawl failure (email/Telegram per house pattern)
- [ ] 8. Credit-spend logging per crawl run (feeds `npm run gate` G-checks)

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
