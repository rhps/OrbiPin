---
title: "Guide — Convex Demo Video with Remotion (inspo pattern)"
type: guide
project: "[[02. Convex All Gas Hackathon]]"
created: "2026-09-21"
tags: [guide, remotion, video, hackathon, convex]
source-pattern: "[[Research — Remotion Teaser Pattern (Nutlope inspo)]]"
local-reference: /root/ProjectX/inspo/teaser
---

# 🎬 Guide: Convex Demo Video with Remotion

> Build the hackathon video the way Nutlope built the Inspo launch film:
> React components → MP4. No screen recording as primary asset, no demo-day
> flakiness — the video is code, renders identical every time.

---

## 0. Reference at hand

The inspo repo is still cloned at `/root/ProjectX/inspo/teaser`. Key files to
keep open while building:

| File | What it teaches |
|---|---|
| `src/Root.tsx` | Composition registration (1920×1080@60fps, duration) |
| `src/InspoLaunch.tsx` | The beat timeline — Sequences with authored frame numbers + comment map |
| `src/scenes/PromptScene.tsx` | The typing scene; the "fast type + long hold" readability trick |
| `src/timing.ts` | The 30fps→60fps trick (author at 30, render at 60) |
| `src/theme.ts` | One palette, two fonts, ONE easing constant (EXPO) |
| `src/LaunchSoundtrack.tsx` | Sound-as-code at exact frames |

---

## 1. Scaffold

```bash
cd /root/ProjectX/convex-video        # or wherever the hackathon repo lives
mkdir video && cd video
# Copy the pattern, not the studio template:
cp -r /root/ProjectX/inspo/teaser/{package.json,tsconfig.json,remotion.config.ts,src/index.ts} .
mkdir -p src/scenes public/shots
npm install
```

(Or start from `npx create-video@latest --blank` and copy `timing.ts` +
`theme.ts` from inspo — they're the real IP.)

**Versions that work together** (from inspo, don't improvise):
remotion 4.0.519 · @remotion/google-fonts, media, sfx 4.0.519 · react 19.2.3.

## 2. The three laws (from the research doc)

1. **All motion from frame number.** Every animation is
   `interpolate(frame, [a, b], [x, y], {easing: EXPO})`. No CSS animations,
   no timers. Frame 0 is mid-action — the film opens already moving.
2. **Author at 30fps, render at 60.** Use inspo's `timing.ts` verbatim.
   All your frame numbers are authored; the hook converts. Smoothness is free.
3. **One easing voice.** Copy `EXPO = [0.16, 1, 0.3, 1]` into theme.ts and
   use it everywhere. Mixed easings read as amateur in about 2 seconds.

## 3. Your beat map (90s core, 3-min cap)

Map your hackathon doc's demo script to scenes. Authored frames @30fps:

| Beat | Frames (~30fps) | Scene | What's on screen |
|---|---|---|---|
| Hook | 0–30 (1s) | `HookScene` | Title + one line: the problem. Open mid-typing or mid-zoom |
| Problem | 30–75 (1.5s) | `ProblemScene` | 3 quick cards: pain points. Fast in, hold, out |
| **Live demo** | 75–210 (4.5s→stretch) | `DemoScene` ×3 | **The money shots**: globe with pins appearing live (the Convex pulse), crawl → pins, zoom to a story |
| Tech insight | 210–255 (1.5s) | `TechScene` | 4-node architecture diagram animated (or Excalidraw export panned) |
| Impact | 255–300 (1.5s) | `OutroScene` | Tagline + URL, LONG hold — "the one thing a viewer must leave with" |

**Demo footage without screen recording:** capture 6–10 high-res screenshots
of your deployed app (agent-browser, 1920×1080, zoomed at different levels —
globe view, region, story view) into `public/shots/`. Then:
- Ken Burns them: `scale: interpolate(frame, [a,b],[1,1.15])` + slight x/y drift
- The "live" pulse: animate pins as absolutely-positioned dots appearing at
  staggered frames (`opacity: interpolate(frame, [n, n+4], [0,1])`) over the
  globe screenshot — that reads as real-time and IS your Convex story
- Captions under each shot naming the beat ("Firecrawl crawl → mutation →
  every open globe updates. No refresh.")

## 4. Scene skeleton (copy this shape)

```tsx
// src/scenes/HookScene.tsx
import React from "react";
import { AbsoluteFill, interpolate, Easing } from "remotion";
import { useAuthoredFrame } from "../timing";
import { colors, EXPO, fonts } from "../theme";

export const HookScene: React.FC = () => {
  const frame = useAuthoredFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.ink, justifyContent: "center", alignItems: "center" }}>
      <div style={{
        fontFamily: fonts.display,
        opacity: interpolate(frame, [0, 8], [0, 1], { easing: Easing.bezier(...EXPO) }),
        transform: `translateY(${interpolate(frame, [0, 10], [24, 0], { easing: Easing.bezier(...EXPO) }px)`,
      }}>
        News maps lie. The globe doesn't.
      </div>
    </AbsoluteFill>
  );
};
```

Composition file = beat timeline with the comment map (steal the format from
`InspoLaunch.tsx` — the frame-number comment block IS the editor).

## 5. Iterate

```bash
npm run dev        # opens Remotion Studio at localhost:3000
                   # drag the playhead, edit frame numbers, hot-reloads
```

Workflow loop: watch in studio → tweak a `[a, b]` range → re-watch. The
Studio's left panel shows your Sequences as named blocks — reorder by
changing `from` values.

## 6. Voiceover + sound

- Record VO over the final cut (QuickTime/audacity), drop in `public/`
- `@remotion/sfx` for accents: each pin-drop = soft tick, transitions = whoosh
- Or go TTS: generate per-beat audio files, place with `<Audio from={t(75)} src={...} />`

## 7. Render + submit

```bash
npx remotion render ConvexDemo out/demo.mp4 --codec=h264
# check: ≤3 minutes, plays in a plain browser
```

Then the vibeapps portal checklist: repo public, `hackathon.md` at root,
live URL open to anyone, video ≤3 min. **Also keep one real screen recording
as backup** per your hackathon doc's asset list.

## 8. Time budget

| Stage | Time |
|---|---|
| Scaffold + theme + timing | 30 min |
| Screenshots (agent-browser session) | 30 min |
| 5 scenes, first pass | 2–3 h |
| Polish loop (easing, holds, captions) | 1–2 h |
| VO + render + submit | 1 h |

A focused day. The pattern is proven — documesh shipped the same way.
