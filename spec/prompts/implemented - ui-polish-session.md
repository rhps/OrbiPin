# UI Polish Prompt — OrbiPin visual redesign

> Paste everything below the line into a fresh Hermes session working in the
> OrbiPin repo. It includes a UI audit of the live deployment
> (`striped-impala-387.convex.site`, 2026-09-22) so no re-discovery is needed.
> Relevant specs: `gardening/7-Hackathon/Convex/02-region-precision-areas.md`
> (pin focus ring), `05-habit-loop.md` (follow story toggle), `07` (G6 tone
> rule), `08` (visual modes). Do NOT break what's verified working — see
> Constraints.

---

## Goal

Lift OrbiPin from "working demo" to "designed product" without touching the
data pipeline. The globe is the identity; the UI should feel like a mission-
control surface for news: dark, calm, precise, alive.

## Audited current state (live site, 2026-09-22)

- All UI is inline-styled; font is default Arial; no design tokens.
- Top-right buttons: `🗺 Flat` `🌑 Night` `📧 Follow` — dark navy chips
  (`rgb(16,27,46)` bg, `#7fb4ff` text, 8px radius), **no active-state
  indicator** on the mode toggle.
- Status line bottom-right: `data: convex · events: 372` — 11px grey text.
- Event card (opens on pin click): plain stacked text — hedge label, tier,
  place · source count, quoted phrase, "Latest: publisher · date". No chip,
  no hierarchy, no animation, no follow-story action.
- Follow panel: ⚡ Instant / 📅 Daily / 🗓 Weekly + subscribe + "reply to ask"
  hint — functional but plain.
- Pins: color from data (`#39d98a` green seen), radius z-interpolated 7→14,
  clusters `#3a6fd8` blue. Area fills already use amber `#ffb020`.
- Map labels: Noto Sans Bold (OpenFreeMap style — don't change the map's
  own labels; align the UI to them).
- Loading state: plain "Loading globe…" text.

Existing color DNA to keep and systematize: deep space navy (page bg
`#060a12`-ish), panel navy `rgb(16,27,46)`, blue accent `#7fb4ff`/`#3a6fd8`,
positive green `#39d98a`, amber accent `#ffb020`.

## Tasks (in order — each is a shippable increment)

1. **Design tokens + base styles.** Create a `theme.css` (or tokens module)
   defining CSS custom properties: colors (space navy bg, panel, border,
   accent blue, amber, tier colors: city/province/country, success, danger),
   spacing scale, radius scale, font stack, z-layers. Replace all inline
   styles in the React components with token-based classes. Add the UI font
   (Inter or Space Grotesk via npm package `@fontsource/*`, self-hosted —
   no Google Fonts request at runtime). Emoji icons (🗺🌑📧⚡📅🗓📌) → one
   consistent icon set (e.g. `lucide-react`).

2. **App chrome: header + mode toggle.** Floating top bar over the globe:
   left = OrbiPin wordmark + one-line tagline ("Every event, a pin on the
   planet"); right = segmented control for map mode (Globe / Flat) and theme
   (Day / Night) with the **active segment visually highlighted** (today it
   isn't — this is a bug-grade UX gap), plus the Follow button. Frosted-glass
   panels: `backdrop-filter: blur()`, translucent panel color, 1px border.
   Must stay usable at mobile width (collapse tagline, keep controls).

3. **Event card redesign (the money surface).** Card structure:
   - Header row: tier chip (colored per tier) + place name + publisher
     favicon/initial.
   - Title with the G5 hedge preserved ("Reports of…" must never be dropped).
   - Quoted phrase as a styled blockquote with left accent border.
   - Source list: publisher chips with timestamps (humanized — "2h ago"),
     each linking out. Render "date unknown" when the date is missing —
     never epoch/1970 (known data bug, separate fix session).
   - Footer: "Follow this story" toggle button (wire to the existing
     follows/subscription system from spec 05 — the data model exists, the
     card just doesn't surface it).
   - Slide-in animation (~200ms ease-out); bottom-sheet layout at mobile
     width; Escape key and ✕ close it; focus is trapped while open.

4. **Follow/subscribe panel restyle.** Same card language as #3: cadence as
   a proper segmented control (Instant/Daily/Weekly), email/address field
   with focus ring, explicit success and error states, and a "following ✓"
   state when already subscribed. Copy stays honest (hedged, plain words).

5. **Map layer polish (paint properties only — no logic changes).**
   - Newest pins get a soft pulse: `feature-state` + `circle-radius`/
     `circle-opacity` transition (CSS-free, MapLibre-native). "Newest" =
     recent `lastSeenAt`/`publishedAt` bucket — if dates are the broken
     ones, key the pulse to recently-*inserted* ids instead.
   - City-tier pins get a halo ring (spec 02's focus-ring idea).
   - Clusters: graduated radius by count, count badge styling consistent
     with the UI accent.
   - Hover states for the area-highlight feature (separate feature session)
     should use the amber token.
   - G6 rule: sensitive/conflict events keep restrained styling (thin
     outline, muted color, no pulse). The pulse/ring work must respect this.

6. **Status bar.** Bottom bar (or keep bottom-right): live dot (green pulse
   when the Convex websocket is connected — the client knows its connection
   state) + `372 events` + "updated Xm ago". Monospace-ish tabular figures
   for the count. Collapses to just the dot + count on mobile.

7. **Loading & empty states.** Branded splash while the style loads: small
   globe/pin mark + "Loading globe…" with a subtle spinner — replaces the
   bare text. Event card and search results (when they exist) get skeleton
   shimmer. Globe-only fallback for WebGL-unavailable stays (already in
   spec 01) but gets the same visual language.

8. **Motion & accessibility pass.** `prefers-reduced-motion: reduce` turns
   off pulse/slide/shimmer. Keyboard: all controls reachable, visible focus
   rings (2px accent outline), card focus-trapped (from #3). Contrast:
   verify panel text ≥ 4.5:1 on panel backgrounds (the 11px grey `#8496b3`
   on navy is borderline — bump it). Touch targets ≥ 44px on mobile.

## Constraints (verified working — do not regress)

- Globe projection persistence across style swaps (Flat/Night/Globe) —
  after ANY change, cycle modes and confirm projection stays globe and all
  7 custom layers re-register (`event-pins`, `event-clusters`,
  `event-cluster-count`, `night-fill`, `area-fill`, `area-line`,
  `spider-pins`).
- Terminator (`#060a14` @ 0.38, correct math), clustering cutoffs
  (clusters ≤ z14, none at z15+), pin card data flow, Convex realtime —
  all verified working. Visual-only changes.
- No heavy animation/GSAP-style libraries; CSS + MapLibre-native
  transitions only. No runtime font CDN requests (self-host fonts).
- Performance budget: initial JS must not grow by more than ~15%; CSS is
  fine.
- `hackathon.md` entry per milestone with evidence (screenshots count).
- Feature-branch flow, gates green before deploy (`npm run gate`).

## Suggested visual direction (one line each, for consistency)

- Feel: mission control / planet observatory — dark, calm, high-signal.
- Panels: frosted glass on space; 12–16px radius; 1px hairline borders in
  the border token, not pure white.
- Type: one display weight for the wordmark and card titles; tabular
  numbers for counts and timestamps.
- Color discipline: navy space + one blue accent + one amber highlight +
  semantic tier colors. Resist adding more hues.
