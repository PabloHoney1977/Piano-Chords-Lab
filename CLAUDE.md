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
Capacitor wraps it for iOS; `npm run build` assembles `www/` (the `webDir`), and
`codemagic.yaml` generates the native `ios/` in CI (`cap add ios`), builds icons from
`assets/` via `@capacitor/assets`, signs, and ships to TestFlight. Native `ios/` is NOT
committed — CI regenerates it. Secrets (App Store Connect key, `REVENUECAT_IOS_KEY`) live
in the Codemagic UI, injected into `www/index.html` at build time.

## What's Built (current `app.js`)
A working **Build-a-Chord** core:
- `NOTES`, `CHORDS` (27 types with semitone-interval formulas — triads through 13ths/altered
  dominants), `chordPCs/chordNotes/chordName` helpers.
- `Keyboard` component: 3-octave clickable SVG piano; renders the **literal voicing** (actual
  sounding MIDI notes) so inversions are visible — bass note red `--root`, upper tones teal
  `--tone`; `translateZ(0)` compositing hint applied (iOS Safari filtered-SVG repaint gotcha —
  same as Jazz Guitar Lab's NeckSVG).
- **Inversions** (Pro): `voicing(root, ivls, inv)` raises the lowest `inv` tones an octave;
  inversion picker is Pro-gated (root position free). Chord name shows slash-bass (e.g. `C/E`).
  3 octaves (MIDI 60–95) fit every chord type in every inversion, incl. 9ths.
- **Scales tab** (`SCALES`, 20 scales/modes): Chords/Scales tab switcher reuses the same
  `Keyboard` (renders one ascending octave, root colored `--root`). `FREE_SCALES = 2`
  (Major + Natural Minor free), rest Pro-gated. `playSeq()` plays the scale ascending.
- **Find tab** (Pro): reverse lookup — tap keys (`Keyboard` `onKey` selection mode) and
  `identifyChord(pcs, bassPC)` names every exact match across all 12 roots × `CHORDS`,
  bass-aware for slash chords (C-E-G-A over C → `C6`, also `Am7/C`). Root-position matches
  rank first. Tab is Pro-gated at entry (`activeTab` falls back to Chords if a saved
  `pc-tab='find'` loads without Pro). 2-note selections show the interval name.
- **Keys tab** (Pro): interactive **circle of fifths** (`CircleOfFifths` SVG wheel — `CO5` data,
  `wedgePath`/`polar` helpers; outer majors, inner relative minors, center hub with key + signature)
  driving the shared `root`, plus **"chords in this key"** — `diatonicTriads(root)` builds the seven
  major-key triads with Roman numerals (I ii iii IV V vi vii°), each tappable to play. Also Pro-gated
  via `activeTab`.
- **Ear tab** (Pro): `EarTrainingView` — **ported from Jazz Guitar Lab's ear trainer** (the mature
  module, not a rebuild). 4 modes (intervals / triads / 7th chords / progressions), interval
  difficulty tiers (Lv1–5), per-item spaced-repetition "weakest" tracking, song-reference hints,
  back/forward history, and an **auto mode** that speaks answers via Web Speech TTS. Instrument-
  agnostic logic kept ~verbatim; piano layer rebuilt: `play*` bodies drive `pianoNote()` (MIDI,
  C4=60), theme constants → our CSS vars, **cadences adapted to common/pop progressions**
  (I–IV–V, I–V–vi–IV, ii–V–I, I–vi–IV–V, IV–I), keys prefixed `pc-ear-*`. Whole tab is Pro, so
  `level='pro'` (the essentials branches are dormant). TTS MP3 clips + pedal support dropped.
- **Additive synth piano** (`pianoNote`/`playChord`/`playSeq`/`playMidi`): 6 inharmonic sine
  partials + piano ADSR (fast attack, two-stage decay) + per-note brightness rolloff, through a
  shared master `bus()` (synthesized convolution reverb, high-shelf, compressor). Not samples,
  but far past the old two-oscillator beep; still the first thing to replace with real samples.
- Freemium gate: `FREE_TYPES = 4` (first 4 chord types free), rest open `UpgradeSheet`.
- **IAP + 7-day trial** (`effectiveLevel` architecture): `owned` (purchased, `pc-level`) vs a
  one-time 7-day trial (`pc-trial-start`); the UI gates on `effectiveLevel(owned,start,now)` =
  max of the two. `IAP` module wraps RevenueCat's Capacitor plugin (entitlement `pro`, product
  `pro_unlock`, key from `window.__REVENUECAT_KEY__`) — `configure/isEntitled/purchase/restore`,
  all no-op on web. `UpgradeSheet` offers Unlock / Start trial / Restore; on web the Unlock path
  grants locally so the PWA stays testable. Entitlements re-sync on launch; trial expiry re-checks
  every 60s. **TODO before iOS: verify plugin response shapes vs installed `@revenuecat/purchases-capacitor`.**
- **Onboarding + two-tier tour** (`tourStepsFor(key)` + `Tour` carousel): first run shows the
  `overview` tour once (`pc-onboarded`); the header `?` reopens it; first visit to each tab shows
  a one-time contextual tip (`pc-tip-<tab>`). All dismissible; no tab-driving to avoid gating edges.
- Header with dev Pro toggle (toggles `owned`) + trial countdown + `?` tour + theme toggle.
  localStorage keys prefixed `pc-` (`pc-root`, `pc-tab`, `pc-level`, `pc-trial-start`, `pc-theme`,
  `pc-onboarded`, `pc-tip-*`).
- `PRICE` constant = single source of truth for the price string (learn from Jazz Guitar Lab,
  where `$9.99` was scattered across ~10 files and had to be swept).
- `track()` PostHog helper + `__POSTHOG_KEY__` placeholder in `index.html` (no-ops until set).

## To Port From Jazz Guitar Lab (don't rebuild from scratch)
- **Real instrument samples** + EQ chain → adapt `playGuitarNote` to piano samples.
- ✅ **`IAP` module** + 7-day trial (`effectiveLevel`) — *done; built from the architecture in
  this doc (JGL repo wasn't accessible). Reconcile against JGL's actual `IAP`/RevenueCat wiring
  when the iOS project is added.*
- ✅ **Two-tier tour system** (`tourStepsFor`, overview + per-page contextual tours) — *done.*
- ✅ **Onboarding** first-run logic — *done (overview tour on first run, `pc-onboarded`).*
- **Streak tracking** + milestones.

## Freemium Split
- **Free (Essentials):** first 4 chord types (maj, min, dom7, min7), root-position only,
  Major + Natural Minor scales, all 12 roots, keyboard, audio.
- **Pro:** all 27 chord types, all inversions, all 20 scales/modes, reverse "find chord",
  circle of fifths + chords-in-key, full theory reference. One-time IAP, **no subscription**.

## Pricing — set to $6.99 (revisit post-launch)
`PRICE` in `app.js` is **`$6.99`** one-time Pro unlock (single source of truth — change only there).

Rationale (market research, 2026): the piano chord/scale **reference** lane is crowded and
price-anchored low — comps cluster at **$2.99–$4.99 one-time** (Piano Chords and Scales $4.99,
Pensato $3.99, Tenuto $4.99), with freemium leaders (Piano Companion, 4.75★/22k+ reviews)
dominating on trust and only outliers near ~$9. This is the opposite of Jazz Guitar Lab's niche
(landed $14.99; jazz comps $20+). $9.99 (the old placeholder) was 2× the category anchor — too
high for a new app with no review base. **$6.99** sits above the commodity $4.99 tier (signals
"more polished than the cheap ones") but under the $9.99 wall, with the 7-day trial de-risking it.
Levers if needed: **$4.99** = conservative/volume; **$9.99** = aggressive/premium. Cross-promotion
from sibling apps lowers CAC and supports the slightly-above-anchor price.

## Next Session Priorities
1. ✅ Inversions + voicing display on the keyboard. *(done — `voicing()` + 3-octave literal keyboard)*
2. ✅ Scales tab reusing the highlight engine. *(done — `SCALES` + Chords/Scales tabs, `FREE_SCALES=2`)*
3. ✅ Port the `IAP` module + 7-day trial from Jazz Guitar Lab. *(done — `IAP` + `effectiveLevel`, RevenueCat Capacitor wrapper, trial in `UpgradeSheet`)*
4. ✅ App icons, Capacitor config, `codemagic.yaml`. *(done — `icons/` + `assets/` brand icon
   (red-root/teal-tone keyboard), `capacitor.config.json`, Codemagic→TestFlight pipeline that
   regenerates `ios/` in CI. **Pending: wire Apple Developer + RevenueCat credentials in the
   Codemagic UI and run the first build.**)*
5. ✅ Pricing research → set `PRICE`. *(done — `$6.99` one-time; rationale in "Pricing" above.)*
6. ✅ Smoke tests (Playwright + `node --test`). *(done — `test/smoke.test.cjs` + `test/helpers.cjs`,
   6 cases covering render/tabs/gating/trial; `npm test`. React mocked from devDeps, SW blocked.)*
