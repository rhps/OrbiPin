# Feature Prompt — OrbiPin: branded splash/loading page

> Paste everything below the line into a fresh Hermes session working in the
> OrbiPin repo. Current state verified live (2026-09-22): the app shows plain
> "Loading globe…" text while the MapLibre style loads — this prompt replaces
> that with a branded splash. Related prompt: `ui-polish-session.md` (design
> tokens). If the UI-polish session already ran, use its `theme.css` tokens;
> if not, hardcode the colors listed here and note it for the polish session.

---

## Goal

A full-viewport splash page shown while the globe loads. Content, top to
bottom: the **OrbiPin wordmark**, the **tagline**, and an **hourglass loading
animation**. It fades out and removes itself the moment the map is ready.

## Copy (decided — fallbacks included)

- **Wordmark:** `OrbiPin`
- **Tagline (primary):** `Every event, a pin on the planet.`
  - Fallbacks if the owner prefers closer to their original draft:
    `News around the world, pinned.` · `The world's news, pinned.` — use the
    primary unless the owner says otherwise.
- No other text. No feature list. No "Loading…" word — the hourglass says it.

## Design (matches the app's existing space-navy look)

- **Background:** the page bg the app already uses (space navy `#060a12`) —
  the splash should feel like the globe's space, not a white flash before it.
  The splash layer sits above the map container and is removed (not just
  hidden) after the transition.
- **Wordmark:** the UI font at display weight, white/near-white. If the UI
  polish session's font (Inter/Space Grotesk self-hosted) is available, use
  it; otherwise system-ui bold is acceptable for v1.
- **Tagline:** one line under the wordmark, muted panel-text color
  (`#8496b3` or lighter for contrast — ≥ 4.5:1 on the navy), regular weight,
  slightly smaller than the wordmark.
- **Hourglass animation:** an ⏳ that gently flips/rocks on a loop —
  `@keyframes` rotating between ~-12° and ~12° (or a periodic 180° flip
  every ~1.6s with a small pause), plus a subtle opacity breathe. Keep it
  small and calm (roughly 32–40px), sitting below the tagline. Implementation
  notes:
  - Use the Twemoji ⏳ PNG (`1f231.png` is ⌛, `231b.png` is ⏳ — verify which
    file; twemoji naming: `231b.png` = ⏳ hourglass done, `23f3.png` =
    ⏳ hourglass flowing — **use `23f3.png`, the flowing one**) from the same
    self-hosted icon set as the pin-icons feature, so no runtime CDN request
    and it matches the pins visually. If the icon feature hasn't landed yet,
    fetch the PNG once into `public/icons/` now.
  - Fallback if that asset isn't in place: the native ⏳ emoji character in
    the DOM with the same CSS animation. Both are fine; pick one and note it.
- **Layout:** all three elements centered vertically and horizontally,
  generous spacing (wordmark → tagline ~8–12px, tagline → hourglass ~28px).
  No borders, no card box — text floating in space.

## Behavior

1. Splash is part of the initial HTML (or rendered synchronously on mount)
   so it appears instantly — it must never itself wait on JS bundles to show.
2. Dismiss trigger: the map's first `load`/`style.load` event (the same
   moment the app currently swaps "Loading globe…" out). Do not wait for
   full tile render — first style load is enough; tiles pop in behind.
3. Exit: fade out ~300ms ease-out, then `remove()` the node. If the map
   fails to load within ~10s, show a quiet error line under the hourglass
   ("Still trying… check your connection") instead of hanging silently, with
   a retry button.
4. `prefers-reduced-motion: reduce` → no rocking animation (static hourglass
   + simple fade), everything else unchanged.
5. No layout shift: reserve the viewport (100dvh) so the globe doesn't jump
   when the splash leaves.

## Verification (report with evidence in `hackathon.md`)

- Cold load: splash visible immediately, fades out when the globe appears,
  no white flash before or after, no scrollbar or layout shift.
- Throttled load (slow 3G in devtools): splash persists gracefully, no
  timeout error before ~10s, error + retry appear if forced offline.
- Reduced-motion: animation off, fade still works.
- Mobile width: centered, nothing clipped, hourglass not oversized.
- Style-swap toggles (Flat/Night/Globe) after load: splash stays gone (it
  must bind to the FIRST load only, not reappear on every `style.load`).

## Constraints

- Visual-only; do not touch map logic, layers, or data flow.
- No new runtime dependencies; no CDN requests at runtime.
- Keep the splash code small (one component + one CSS block); it renders
  for ~1–2 seconds and must not ship animation libraries.
- Feature-branch flow; `hackathon.md` entry with screenshots on completion.
