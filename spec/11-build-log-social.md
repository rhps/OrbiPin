# Feature Spec — 11: Build Log & Social Proof

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
`hackathon.md` at the repo root maintained by the convex-hackathon-skill, plus
build-in-public posts on X/LinkedIn tagging all sponsors. Judges read the log
first; the social track is a scored criterion, not vanity.

## Why
Official criterion: "Your hackathon.md build log is what judges read" and
"Social proof: you posted your build on X or LinkedIn. Engagement counts."
The full-field scan showed leaders win on *measured* logs (still-true: 25 real
answers, median 21s).

## What Changes
- `hackathon.md` following references/log-format.md (header fields + dated entries)
- An entry after every meaningful milestone, evidence-based (numbers, not adjectives)
- Build posts on X/LinkedIn tagging @convex @OpenAI @firecrawl @agentmail,
  each with a screenshot/clip and a link to the live URL
- Measured claims: real emails sent, medians, counts — only what we can prove

## Requirements
- WHEN a milestone completes THE SYSTEM SHALL add a dated entry with files
  touched, Convex features used, and evidence
- WHEN the log is updated THE SYSTEM SHALL preserve prior entries (append-only
  history; corrections flagged, not silently rewritten)
- WHEN posting socially THE SYSTEM SHALL tag all four sponsors and include the
  live URL
- WHEN stating any number in the log or posts THE SYSTEM SHALL have measured it
  (a real email count, a real median) — no projected numbers
- IF secrets or personal data would appear in the log THEN they SHALL be
  omitted (the log is public)

## Design
- **Format:** the skill's log-format (Project/Event/What it does/Live app/Repo/
  Frontend/Convex deployment/Components/features/Auth/AI models + dated entries).
- **Event field:** `Convex All Gas Hackathon` (or the active event).
- **Cadence:** log update rides each merged PR to main; social posts 2–3×/week
  (council risk #3: posting as a work item with its own deadline).
- **Portal reminder:** final submission goes through the event portal with
  repo + log + live URL + video (≤3 min).

## Out of Scope
- Automated posting bots (manual posts, drafted by agent, approved by owner)
- Devpost (this event's portal is vibeapps.dev)

## Tasks
- [ ] 1. Init `hackathon.md` per log-format (Event field set)
- [ ] 2. First entry: repo scaffold + spike learnings
- [ ] 3. Post cadence checklist item in AGENTS.md workflow
- [ ] 4. Draft posts per milestone (owner approves before publishing)

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
