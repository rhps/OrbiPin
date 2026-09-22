---
title: "Video Spec — OrbiPin Demo (Convex All Gas Hackathon)"
type: feature-spec
feature: convex-demo-video
created: "2026-09-21"
project: "[[02. Convex All Gas Hackathon]]"
status: approved
---

# Feature: OrbiPin Demo Video (≤3 min, target 90s)

## Summary
A feature-led demo video for the vibeapps.dev submission. Shows what OrbiPin
does — see what's happening in your region at a glance on a globe of pins —
with one 5-second stack badge. Built with Remotion (inspo pattern) + one
agent-browser live recording for the pulse moment.

## Why
Judges watch 2–3 minutes and care about the product, not the pipeline
internals. The wedge: one region, trusted sources, pins you can verify.
Video must dramatize the features, not the architecture.

## What Changes
- 7-beat video (table below), 5 feature seconds total for stack badge
- Live pulse recorded via agent-browser; everything else Remotion-rendered

## Requirements

- WHEN the video starts THE SYSTEM SHALL show the globe with pins dropping (hook, 10s)
- WHEN the problem beat plays THE SYSTEM SHALL show the simple problem: "I just want to know what's happening in my region" — not chaotic-headlines complexity (10-15s)
- WHEN demo beat 1 plays THE SYSTEM SHALL show a live pin appearing without refresh (15s)
- WHEN demo beat 2 plays THE SYSTEM SHALL show clicking a pin → event card → source one click away (10s)
- WHEN demo beat 3 plays THE SYSTEM SHALL show follow-region → email digest arriving → user replies to the digest with a comment, and the reply lands in the app (20s)
- WHEN the stack beat plays THE SYSTEM SHALL show three badge cards appearing sequentially, each with a one-line role explanation (15s):
  - Convex — "Convex powers the whole backend — realtime data, functions, and storage in one platform"
  - Firecrawl — "Firecrawl keeps the news fresh, crawling major publishers around the clock"
  - AgentMail — "AgentMail delivers your region digest straight to your inbox"
- WHEN the outro plays THE SYSTEM SHALL hold the URL long enough to read (10s)
- THE VIDEO SHALL be ≤3 minutes, mp4, playable in a plain browser

## Beat map (locked)

| # | Beat | Time | Content |
|---|---|---|---|
| 1 | Hook | 10s | Globe, pins drop on the region. Tagline energy. |
| 2 | Problem | 12s | **Simple framing: "What's happening in my region right now?" — a person, a place, a question. Cut to the globe as the answer.** |
| 3 | Demo: pulse | 15s | Live pin appears, no refresh (agent-browser recording) |
| 4 | Demo: trust | 10s | Pin → event card → source link opens |
| 5 | Demo: follow + reply | 20s | Follow region → digest arrives → **user replies with on-the-ground commentary → reply appears in the app on that event** (the loop closes) |
| 6 | Stack | 15s | 3 cards, one per tool, each with its one-line role (see wording below) |
| 7 | Outro | 10s | orbipin.com / convex.site URL, long hold |

**Total: ~92s** — comfortable margin under 3 min.

**Stack-beat wording (locked):**
- **Convex** — *"Convex powers the entire backend — realtime sync, functions, and data, all in one platform."*
- **Firecrawl** — *"Firecrawl keeps the news fresh — crawling major publishers around the clock."*
- **AgentMail** — *"AgentMail delivers your region digest straight to your inbox."*

Style: each card = logo/name + one line, appears in sequence (~5s each), same easing voice as the rest of the film.

## Out of Scope
- Pipeline internals (dedup, geo-tag method, cron details) — those live in hackathon.md
- Architecture diagrams
- Multi-region/world-tour shots (the wedge is ONE region)

## Tasks
- [ ] 1. Validation spike (per hackathon gate — wrong-pin count on 50 articles)
- [ ] 2. Build OrbiPin MVP (3 P0 features = demo beats 3-5 (follow now includes reply-to-comment))
- [ ] 3. Deploy to convex.site
- [ ] 4. Capture: agent-browser screenshots + live pulse recording
- [ ] 5. Remotion: scaffold (inspo timing.ts/theme.ts), 7 scenes
- [ ] 6. VO + sound, iterate in Studio
- [ ] 7. Render ≤3min, verify playback, submit via vibeapps.dev

## Review
Approved by: Rio · Date: 2026-09-21
