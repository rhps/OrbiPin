# OrbiPin — Submission Kit (Convex All Gas Hackathon)

> Deadline: **Sep 22, 12:00 PM PT** · Portal:
> https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit
> Every field below is copy-paste ready. Only YOU can provide: the video
> link and your two social links. Everything else is final.

---

## App Title*

```
OrbiPin
```

## App/Project Tagline*

```
Every event, a pin on the planet — a living globe of curated regional news.
```

(If the field is short — under ~60 chars — use: `Every event, a pin on the planet.`)

## Description* (Markdown, paste as-is)

```markdown
**OrbiPin** is a living globe of curated world news. Events are pins on an
orbiting MapLibre globe with a real day/night terminator — and the pin
level always matches the evidence level: if the article only named the
country, the pin is country-sized, never a fake precise dot.

### What a reader gets
- **A globe that's honest.** Every pin states its precision tier
  (city / province / country) and carries the verbatim quote from the
  article that located it. Cards are hedged — "Reports of…" — and every
  claim links to its source. Places we can't locate are held in a review
  queue, never silently plotted.
- **News that finds you.** Follow a region with just an email address —
  no account. Change-triggered alerts when events in your region update,
  a daily digest, and **reply-to-ask**: email a question ("how bad is the
  flooding vs last week?") and a grounded assistant answers from the
  stored event corpus only — if the corpus can't support an answer, it
  says so.
- **Click a country** to highlight it and subscribe to it in one click.

### How it's built
- **Convex is the spine** (delete it and there is no app): schema +
  indexes, live queries pushing GeoJSON to every open globe (pins update
  without refresh), mutations for ingestion, scheduled crons (30-min
  crawl + nightly archive), HTTP actions with signature-verified AgentMail
  webhooks, full-text search over the event corpus.
- **Firecrawl** feeds it: whitelisted RSS-first sources, Firecrawl for the
  long tail, every item passing precision/dedup gates before it becomes a
  pin (story clustering: 40 outlets, 1 pin).
- **OpenAI** extracts structured events with a strict JSON schema at
  temperature 0 — `{place, tier, quotedPhrase, category, cluster}` — and
  powers the reply-to-ask inbox.
- **AgentMail** gives every region an inbox: alerts, digests, questions,
  and reader reports flow through it.
- Six mechanical quality gates (`npm run gate`) block deploys: quoted-
  phrase audits, unmatched-place reports, cluster sampling, snapshot
  checks, type audits, tone tests for sensitive events.

A real person can use this today: open the globe, follow your region by
email, and get told when *your* place changes.
```

## App Website Link*

```
https://striped-impala-387.convex.site
```

## GitHub Repo URL*

```
https://github.com/rhps/OrbiPin
```

## LinkedIn Share or profile link* (yours to make)

Best: a real share post (scored criterion — engagement counts). 30 seconds:

```
https://www.linkedin.com/feed/update/   ← paste your post's URL here
```
Post text, ready to use:

> OrbiPin is live — a living globe of world news where every pin is honest
> about its precision, and your region can email you when it changes.
> Follow by email, reply to ask questions, get change alerts.
> Built with Convex, Firecrawl, OpenAI and AgentMail.
> https://striped-impala-387.convex.site
> @convex @OpenAI @firecrawl @agentmail

(If out of time: your profile URL `linkedin.com/in/<you>` satisfies the
field, but a share post scores.)

## X (Twitter) share or profile link* (yours to make)

```
https://x.com/<your-handle>/status/...   ← paste your post's URL here
```
Post text, ready to use:

> 🌍 OrbiPin — a living globe of curated news. Every pin states its
> precision. Follow a region with just an email; reply to ask the corpus
> questions. Convex + Firecrawl + OpenAI + AgentMail.
> Live: https://striped-impala-387.convex.site
> @convex @OpenAI @firecrawl @agentmail

## Video Demo* (yours to record — the only hard blocker)

Under 3 minutes. The rubric says: *talk less, click through the real
product.* Record the live site in this exact order:

| Time | Do | Say (or caption) |
|---|---|---|
| 0:00–0:20 | Globe spinning, terminator visible, status bar live dot | "OrbiPin — every event, a pin on the planet. This is live data updating in realtime from Convex." |
| 0:20–0:50 | Zoom into a cluster, click it, open a pin card | "One story, one pin — sources merge. Every card shows the precision tier, the verbatim quote, and links to publishers." |
| 0:50–1:20 | Hover Malaysia → amber fill → click → Follow panel → subscribe | "Follow any region with just an email. No account." |
| 1:20–1:50 | (If commentary shipped) card's "On the ground" section | "Readers reply by email — their on-the-ground reports appear on the event." |
| 1:50–2:20 | Show `hackathon.md` scrolling, then `npm run gate` output | "Six quality gates block every deploy. The build log has every measured number." |
| 2:20–2:40 | Search ("flood"), results dim the globe | "Full-text search over the event corpus — Convex search indexes." |
| 2:40–3:00 | Zoom out to the spinning globe | "OrbiPin. Every event, a pin on the planet." |

Upload: YouTube (unlisted is fine) → paste the link.

---

## Final 3 checks before hitting Submit

1. **Luma registered?** (eligibility + the 20k Firecrawl credits tie to it)
2. Repo `README.md` status line updated (it currently says "MVP in
   progress on a branch" — change to "Shipped, live at <url>")
3. `hackathon.md` has a **Video:** line — add the YouTube link
