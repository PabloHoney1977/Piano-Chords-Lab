# Piano Chords Lab — Project Context

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

## Next Session Priorities
1. Inversions + voicing display on the keyboard.
2. Scales tab reusing the highlight engine.
3. Port the `IAP` module + 7-day trial from Jazz Guitar Lab.
4. App icons (192/512 for manifest + iOS set), Capacitor iOS project, `codemagic.yaml`.
5. Pricing research → set `PRICE`.
6. Smoke tests (Playwright, mirror Jazz Guitar Lab's `test/` harness).
