# Feature Spec — 07: Quality Gates & `npm run gate`

**Date:** 2026-09-21 · **Project:** OrbiPin · **Status:** draft

## Summary
The enforcement spine: one command that runs all six quality gates (G1–G6) and
blocks deploys on any red. For humans and agents — "the gates say it's done,"
not "the agent says it's done."

## Why
The council's strongest finding (one wrong pin = death) only holds if checks
are mechanical. Exit codes are not proof; gates must run outside the agent's
self-certification. Pattern borrowed from still-true (field leader, verified).

## What Changes
- `npm run gate` script running G1–G6 checks, exiting non-zero on any failure
- `npm run deploy` chains `gate && deploy` — deploy is impossible without green gates
- CI runs the gate on every push (GitHub Actions)
- Each gate logs a one-line result (number or PASS/FAIL), summed into a readiness score

## Requirements
- WHEN `npm run gate` runs THE SYSTEM SHALL execute all six checks and print a
  per-gate line: G1 quoted-phrase spot audit, G2 unmatched-place report, G3
  cluster sampling, G4 snapshot check, G5 type audit (tsc), G6 tone test-set
- WHEN any gate fails THE SYSTEM SHALL exit non-zero and print the failing
  gate's detail first
- WHEN deploy is invoked THE SYSTEM SHALL run the gate first and abort on red
- WHEN CI runs on push THE SYSTEM SHALL run the gate and block merge on red
- IF the geo-tag spot audit finds a wrong pin rate above threshold THEN G1
  SHALL fail the build with the offending articles listed

## Design
- **Two gate classes:** *interlocks* (G2 schema validator, G5 type system —
  cannot be bypassed at runtime; they live in the app, not the script) and
  *checklists* (G1/G3/G4/G6 — scripted, run by CI and deploy chain, reviewed in
  diffs). The LLM can edit gate scripts, so gate diffs get human review.
- **Thresholds start as hypotheses:** G1 match-rate ≥90%, G3 similarity
  threshold, G6 test-set — all calibrated by the 48h spike; numbers live in
  `gate.config.json`, changes show in diffs.
- **Readiness score:** sum of gate results (still-true pattern) printed at the
  end — the honest "are we ready" number.

## Out of Scope
- E2E browser tests (later milestone)
- Load testing
- Automatic threshold tuning

## Tasks
- [ ] 1. `scripts/gate.mjs` skeleton with per-gate modules and exit-code logic
- [ ] 2. G5 type audit (tsc --noEmit wired in)
- [ ] 3. G1 spot-audit runner + 50-article fixture
- [ ] 4. G2 unmatched-place report from review queue
- [ ] 5. G3 cluster sampling report
- [ ] 6. G4 snapshot presence + age check
- [ ] 7. G6 tone test-set (10 known-sensitive events → restrained render)
- [ ] 8. `deploy` script chaining; GitHub Actions workflow
- [ ] 9. `gate.config.json` with calibrated thresholds (post-spike)

## Review
Approved by: ______ · Date: ______ (no code before this is filled)
