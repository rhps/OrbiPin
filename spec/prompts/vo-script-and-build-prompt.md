# 🎙️ Voiceover Script + Production Prompt — OrbiPin Demo Video

> Companion to `spec-convex-demo-video.md`. Beat-locked narration for
> ElevenLabs TTS, plus the build prompt for the Remotion production.

---

## Voiceover script (locked to beats, ~92s)

**Voice direction for ElevenLabs:** calm, confident, warm — a person telling
you about a thing they use, not a hype announcer. Speed slightly relaxed.
Male or female both work; pick one and keep it across all clips.

### Beat 1 — Hook (10s)
> What's happening in your region, right now?
> OrbiPin puts it on the map — literally.

### Beat 2 — Problem (12s)
> You shouldn't have to scroll five news apps to know what's going on
> around you. One question, one place: what's happening here?

### Beat 3 — Demo: pulse (15s)
> This is live. A new report comes in — and the pin appears on the globe,
> instantly, no refresh. Every open globe sees it at the same moment.

### Beat 4 — Demo: trust (10s)
> Every event shows its sources — one click away. Reports of an event,
> never just claims. You judge. You verify.

### Beat 5 — Demo: follow + reply (20s)
> Follow your region and the digest lands in your inbox.
> And here's the part news apps can't do: just reply.
> Your on-the-ground note joins the event — for everyone following it.

### Beat 6 — Stack (15s)
> Built on three platforms.
> Convex powers the entire backend — realtime sync, functions, and data, all in one.
> Firecrawl keeps the news fresh, crawling major publishers around the clock.
> AgentMail delivers the digest — and brings your reply back.

### Beat 7 — Outro (10s)
> OrbiPin. Your region, live.
> Find it at orbipin.com

**Word count check:** ~150 words ≈ 60–75s of speech at a calm pace — fits the
92s cut with breathing room for the visuals to lead.

---

## ElevenLabs production notes

- Generate **one audio clip per beat** (7 clips) — not one long file. Per-beat
  clips align to Remotion `<Audio from={t(...)}>` exactly, and re-rendering
  one beat doesn't re-generate the rest
- Voice: pick a default (e.g. "Adam" or "Rachel" — calm narrators), stability
  ~0.5, similarity ~0.75, style low
- Export WAV; drop into `public/vo/beat1.wav … beat7.wav`
- Re-generate any beat freely — cost is per-character, whole script ≈ 900
  characters ≈ trivial credit spend

## Remotion build prompt

Hand this to the implementing session/agent:

---

Build a Remotion video project per these locked inputs:

**Repo pattern:** copy `timing.ts` (30fps→60fps authoring trick) and
`theme.ts` structure (one palette, one easing `EXPO = [0.16,1,0.3,1]`) from
`/root/ProjectX/inspo/teaser/src/`. Versions: remotion 4.0.519, react 19.2.3,
@remotion/google-fonts + media + sfx 4.0.519.

**Composition:** `OrbiPinDemo` · 1920×1080 · fps 60 · duration = 92s authored
at 30fps = 2760 authored frames.

**Beats (authored frames @30fps):**

| Beat | Frames | Scene | Assets |
|---|---|---|---|
| 1 Hook | 0–300 | HookScene | globe screenshot + animated pin dots fading in staggered; VO beat1.wav |
| 2 Problem | 300–660 | ProblemScene | text lines: the question, big; VO beat2.wav |
| 3 Pulse | 660–1110 | PulseScene | agent-browser live recording (mp4) full-bleed + caption "no refresh"; VO beat3.wav |
| 4 Trust | 1110–1410 | TrustScene | screenshots: pin → card → source; 3-step pan; VO beat4.wav |
| 5 Follow+Reply | 1410–2010 | FollowScene | screenshots: follow UI → email digest → reply typed → app shows comment; VO beat5.wav |
| 6 Stack | 2010–2460 | StackScene | 3 cards sequential (Convex / Firecrawl / AgentMail), each name + locked one-liner; VO beat6.wav |
| 7 Outro | 2460–2760 | OutroScene | tagline + orbipin.com, long hold; VO beat7.wav |

**Rules:**
1. All motion via `interpolate(frame, [...], [...], EXPO)` — no CSS animation
2. Open mid-action (frame 0 already moving)
3. One easing voice everywhere
4. Real screenshots only (from `public/shots/`), no fake UI
5. `@remotion/sfx`: soft tick per pin-drop (beat 1), whoosh per card (beat 6)
6. Audio placed per-beat: `<Audio src={staticFile("vo/beatN.wav")} from={t(start)} />`

**Render:** `npx remotion render OrbiPinDemo out/orbipin-demo.mp4 --codec=h264`
— verify ≤3 min, plays in plain browser.

---

## Open items

- [ ] Spec Review line: approved by Rio (this prompt assumes yes)
- [ ] Validation spike still pending (region + 5 sources)
- [ ] Record agent-browser live pulse after app deploy
- [ ] Generate 7 ElevenLabs clips → public/vo/
