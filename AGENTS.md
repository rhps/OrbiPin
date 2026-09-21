# OrbiPin — Agent Guidance

OrbiPin: a living globe of curated regional news. Convex is the backend (non-negotiable).
Map stack: MapLibre GL JS globe projection + OpenFreeMap tiles + geoBoundaries polygons.
Full product brief: see the vault doc `7-Hackathon/02. Convex All Gas Hackathon.md`.

## Governing rules (inherited — read before writing code)

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

## Sandbox

`sandbox/` is gitignored. Experiments, discussions, throwaway scripts live there.
Nothing in sandbox is ever referenced by committed code.
