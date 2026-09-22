# Feature Spec — 05: Habit Loop (Alerts, Ask-Inbox, Digest, Follow)

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
The retention layer: change-triggered email alerts, a reply-to-ask inbox, a
user-configured digest, and per-story following — via the app's own AgentMail
address. For users who won't stare at a globe but still want to know.

## Why
Nobody stares at a map all day (council consensus). The globe earns attention;
this loop earns retention. It also makes AgentMail do irreplaceable work
(sends, receives, replies) instead of being a newsletter sender.

## What Changes
- Change-triggered alerts: new pin or material update in a followed region →
  short email within minutes (throttled; "breaking" is opt-in)
- Reply-to-ask: every email ends "reply to ask"; the agent answers from the
  stored event corpus, grounded, linking back to pins
- Digest as user-configured fallback: morning/evening/weekly, user's timezone;
  weekly adds "Your region in 5 pins" + "on this day" (timeline retrospective)
- Follow a single story: one toggle on a pin → updates as sources attach

## Requirements
- WHEN a followed region gets a new event or a material cluster update THE
  SYSTEM SHALL email the follower within 2 minutes (batched: ≤3 emails/day
  unless breaking is opted in)
- WHEN a user replies to any OrbiPin email THE SYSTEM SHALL parse the question
  and answer from the stored corpus only — IF the corpus cannot support an
  answer THEN reply with an honest miss (no invention)
- WHEN a user configures a digest THE SYSTEM SHALL send at their chosen cadence
  in their timezone (morning/evening/weekly)
- WHEN the weekly digest runs THE SYSTEM SHALL include "region in 5 pins" and
  the "on this day" retrospective from the timeline table
- WHEN a followed cluster receives a new source THE SYSTEM SHALL email the
  story-follower (subject: story title, newest content first)
- IF a digest period had zero events THEN the digest SHALL say so plainly
  (heartbeat, not silence) and skip fabrication

## Design
- **Identity:** the user's AgentMail address IS the identity (auth-free region
  following — validated direction from council disagreement B).
- **Trigger path:** Convex realtime detects cluster change → scheduled job
  batches → AgentMail send. Inbound replies arrive via AgentMail webhook →
  Convex HTTP action (signature-verified) → grounded answer from corpus.
- **Material update definition:** ≥1 new source attached, or severity/tier
  change. Edits that change neither do not trigger emails.
- **Email rendering** uses the same event-card component as the map (G5 types),
  so map and email cannot drift.

## Out of Scope
- Push notifications / SMS
- HTML-heavy emails (plain structured text + links; better deliverability)
- Custom digest branding per user

## Tasks
- [ ] 1. Convex: followers table (address, region tier+place, cadence, breaking opt-in)
- [ ] 2. Material-update detector on the cluster write path
- [ ] 3. Alert sender (AgentMail action) with throttle
- [ ] 4. Inbound webhook → question parser → grounded answerer → reply
- [ ] 5. Digest builder (daily/weekly) + timezone scheduler (Convex crons)
- [ ] 6. "On this day" query over the timeline table
- [ ] 7. Story-follow email thread

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
