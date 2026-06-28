# Piano Chords Lab — Project Context

## ⚑ MEMORY PROTOCOL — read first, do every time
This file **is** my memory across sessions (containers are ephemeral; I have no
recall of past sessions beyond what's committed here). Therefore:
1. **Every time I finish a unit of work** (a feature, a fix, a decision), I update
   this file *before* I stop: append to the **Session Log** at the bottom, update
   **Build Status** and **Next Session Priorities**, and revise strategy/marketability
   notes if they changed. Then commit + push.
2. **At the end of every reply where I did work, I show the user a ready-to-paste
   "Continuation Prompt"** — a short block they can drop into the next session to pick
   up exactly where we left off. Keep it concrete (what's done, what's next, which branch).
3. Treat anything *not* written here as lost. If a decision matters, it goes in this file.

## What this is
The **piano-market sibling of Jazz Guitar Lab**, part of a deliberate "music-app studio"
strategy: one shared engine (music theory + Web Audio + interactive SVG instrument +
freemium paywall + Capacitor/RevenueCat/PostHog pipeline) reused across several apps that
**cross-promote each other for free** — the answer to the organic-discovery problem.
Piano was chosen first because the keyboard-learner market is ~10–20× jazz guitarists while
still ASO-winnable in the chord/scale *reference* lane (below the lesson juggernauts).

Sibling repos: `Jazz-Guitar-App` (live), `Note-Quest` (kids note-reading game, new).

## Workflow Preferences (same as Jazz Guitar Lab)
- Always use model **claude-opus-4-8**.
- When making a fix, commit it without being asked (unless told not to); push immediately after.
- App is served from `main` via **GitHub Pages** (root, `main` branch) — landing on `main` = live.
- No build step: `index.html` + `app.js` are served directly.
- **GitHub CLI (`gh`) is NOT installed on this machine.** Repos/Pages were created via the GitHub
  REST API using the cached git credential:
  `TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^password=//p')`
  then `curl`/python against `api.github.com` (token has `repo` scope). Use this pattern for
  GitHub API actions, or install `gh` if preferred.
- **No Node locally** — use `pip install nodejs-bin` then run via
  `python -c "import nodejs; nodejs.node.run([...])"` for `node --check`/tests.

## Stack
Single-file React 18 PWA. CDN React (unpkg UMD), no bundler. All components, data, audio, and
styles inline in `app.js` (`e()` = `React.createElement`). CSS theme vars in `index.html`
(two `:root` blocks: dark default + `[data-theme="light"]`). Target: iPhone/iPad.
Capacitor iOS + Codemagic CI to be added (mirror Jazz Guitar Lab's `ios/` + `codemagic.yaml`).

## What's Built (current `app.js`)
A working **Build-a-Chord** core:
- `NOTES`, `CHORDS` (16 types with semitone-interval formulas), `chordPCs/chordNotes/chordName` helpers.
- `Keyboard` component: 2-octave clickable SVG piano; highlights root (red `--root`) and chord
  tones (teal `--tone`) by pitch class across both octaves; `translateZ(0)` compositing hint
  applied (iOS Safari filtered-SVG repaint gotcha — same as Jazz Guitar Lab's NeckSVG).
- Oscillator-based `pianoNote`/`playChord`/`playMidi` audio (placeholder — port real samples).
- Freemium gate: `FREE_TYPES = 4` (first 4 chord types free), rest open `UpgradeSheet`.
- Header with dev Pro toggle + theme toggle. localStorage keys prefixed `pc-` (`pc-root`,
  `pc-level`, `pc-theme`).
- `PRICE` constant = single source of truth for the price string (learn from Jazz Guitar Lab,
  where `$9.99` was scattered across ~10 files and had to be swept).
- `track()` PostHog helper + `__POSTHOG_KEY__` placeholder in `index.html` (no-ops until set).

## To Port From Jazz Guitar Lab (don't rebuild from scratch)
- **Real instrument samples** + EQ chain → adapt `playGuitarNote` to piano samples.
- **`IAP` module** (RevenueCat, entitlement `pro`, product `pro_unlock`) + 7-day trial
  (`effectiveLevel` architecture) — copy near-verbatim; swap localStorage prefixes to `pc-`.
- **Two-tier tour system** (`tourStepsFor`, overview + per-page contextual tours).
- **Streak tracking** + milestones.
- **Onboarding** first-run logic.

## Freemium Split
- **Free (Essentials):** first 4 chord types (maj, min, dom7, min7), all 12 roots, keyboard, audio.
- **Pro:** all 16+ chord types, inversions (TODO), scales (TODO), reverse "find chord" (TODO),
  full theory reference. One-time IAP, **no subscription**.

## Pricing — TBD
`PRICE` in `app.js` is a **`$9.99` placeholder**. Decide via the same market-research lens used
for Jazz Guitar Lab (which landed at $14.99 vs comps iReal Pro $21.99 / Tenuto $19.99). Piano
chord/reference apps skew cheaper and more crowded than the jazz niche, so $4.99–$9.99 one-time
is the likely range — research before launch. Update only the `PRICE` constant.

## Product Strategy — the 3-phase plan (decided 2026-06-28)
Positioning: **"the chord & scale reference that actually teaches you, not just shows you."**
Aim *below* the lesson juggernauts (Simply Piano / Flowkey / Yokee) in the chord/scale
*reference* lane, but climb above the commodity $2.99 chord dictionaries via a light
**learning/context layer** (Phase 2 = the actual moat).

- **Phase 1 — Complete the reference (MVP, table stakes).**
  - Inversions + voicing display on the keyboard ← biggest credibility gap, do first.
  - Scales tab (major/minor/modes/pentatonic/blues) reusing the highlight engine — cheap, doubles value.
  - Reverse "Find Chord" (tap keys → name the chord) — the sticky/shareable + ASO-keyword feature.
- **Phase 2 — The differentiator (what wins the lane).**
  - Chord-in-context: show diatonic function ("ii in C major", "V7 in F"). Nobody cheap does this well.
  - Common progressions (ii-V-I, 12-bar blues, I-V-vi-IV) you can hear + step through. Leans on Jazz Guitar Lab DNA.
  - Ear-training micro-drills + streaks (port streak system) → turns a lookup tool into a daily-open habit.
- **Phase 3 — Productionize for App Store.** Real piano samples (+EQ), RevenueCat IAP + 7-day trial,
  onboarding/tours, icons, Capacitor iOS + Codemagic. "Port, don't rebuild" from Jazz Guitar Lab.

## Marketability — honest read (decided 2026-06-28)
**Tailwinds:** market ~10–20× jazz guitarists; we dodge the juggernauts by living in the reference lane;
**pricing wedge** = big players are $120–200/yr subscriptions, so "every chord/scale + theory, one price,
forever, no subscription" is a real, repeatable hook (subscription fatigue is on our side); cross-promo
flywheel across the sibling apps gives near-zero-cost installs once one app has traction.
**Headwinds:** reference lane is crowded + cheap (Piano Companion, Perfect Ear, Tenuto, free web tools),
so pure "build a chord" won't differentiate — **Phase 2 is the business, not a nice-to-have**; piano apps
skew cheaper than jazz, so lean **$7.99–$9.99 one-time only if Phase 2 lands, else $4.99**; **ASO is
make-or-break** — winning "piano chords / piano scales / chord finder" matters more than features, and
reverse-lookup + progressions double as keyword magnets.
**Bottom line:** winnable lane + good GTM, but build Phase 1 fast (mostly mechanical) and spend the real
creative effort on Phase 2.

## Build Status (keep current)
- ✅ Build-a-Chord core (16 types, 12 roots, 2-oct keyboard highlight, oscillator audio, freemium gate).
- ✅ **Inversions + voicing display** (Pro): Root/1st/2nd/3rd selector, slash-chord name, bass key marked
  (`--bass`) on the keyboard, audio plays the inverted voicing. (2026-06-28)
- ⬜ Scales tab · ⬜ Reverse "Find Chord" · ⬜ Phase 2 (context/progressions/ear-training) · ⬜ Phase 3.

## Next Session Priorities
1. **Scales tab** reusing the highlight engine (major/minor/modes/pentatonic/blues) — next, cheap value.
2. Reverse "Find Chord" lookup (tap keys → name the chord).
3. Begin Phase 2: chord-in-context (diatonic function) + common progressions.
4. Port the `IAP` module + 7-day trial from Jazz Guitar Lab.
5. App icons (192/512 + iOS set), Capacitor iOS project, `codemagic.yaml`.
6. Pricing research → set `PRICE`. Smoke tests (Playwright, mirror Jazz Guitar Lab's `test/`).

## Session Log
- **2026-06-28** — Gave product overview (3-phase plan + marketability, above). Established this Memory
  Protocol. Built Phase 1 **inversions + voicing display** in `app.js` (inversion state, `invertVoicing`
  helper, slash-chord naming, `--bass` theme var + bass-key marker on `Keyboard`, Pro-gated like other
  premium features). Working branch: `claude/jazz-guitar-theory-review-vmhg63`.
