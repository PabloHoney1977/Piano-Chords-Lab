# Piano Chords Lab

Interactive **piano chord, scale & theory reference** — a freemium iOS PWA. Pick a root and chord type, see it light up across an interactive keyboard, hear it, and learn the theory. The piano-market sibling of [Jazz Guitar Lab](https://github.com/PabloHoney1977/Jazz-Guitar-App).

## Status
🚧 **Pre-launch.** The core product is built: 27 chord types with **inversions** (literal-voicing 3-octave keyboard), a **Scales tab** (20 scales/modes), a reverse **Find Chord** tab, a **Keys** tab (circle of fifths + chords-in-key), an **Ear** trainer (ported from Jazz Guitar Lab), all 12 roots, an additive-synth piano, onboarding + tours, dark/light theme, the freemium gate, and **RevenueCat IAP + a 7-day trial** (`effectiveLevel` architecture). App icons, the Capacitor config, and the Codemagic iOS pipeline are in place — the remaining launch work is wiring credentials and porting real piano samples. See "Roadmap" and `CLAUDE.md`.

## Run locally
No build step. Serve the folder over http (service worker needs http, not `file://`):
```
python -m http.server 8000
# open http://localhost:8000
```
Live (GitHub Pages, served from `main`): https://pablohoney1977.github.io/Piano-Chords-Lab/

## Tests
Headless smoke tests (Playwright + node's test runner) exercise rendering, the Chords/Scales tabs, freemium gating, and the IAP 7-day trial against the real `index.html`:
```
npm ci      # installs react/react-dom/playwright (devDeps)
npm test
```
React is mocked from the local devDependencies (no CDN needed) and the service worker is blocked so a cached shell can't hide a regression.

## Stack
Single-file React 18 PWA (CDN React, no bundler). All components, data, audio, and styles live in `app.js` (`e()` = `React.createElement`). CSS theme variables in `index.html`. Capacitor wraps it for iOS; Codemagic builds and ships it to TestFlight.

## iOS build (Capacitor + Codemagic)
The native `ios/` project is generated in CI rather than committed. `npm run build` assembles the static web app into `www/` (Capacitor's `webDir`); `codemagic.yaml` then runs `cap add ios` / `cap sync`, generates the AppIcon set from `assets/` via `@capacitor/assets`, signs, and uploads to TestFlight.

**Before the first CI run, set in the Codemagic UI** (these are *not* in the repo):
- App Store Connect API key integration named `CodemagicAppStoreKey`
- Env group `revenuecat` → `REVENUECAT_IOS_KEY` (RevenueCat iOS public SDK key)
- Env group `posthog` → `POSTHOG_KEY` (optional)
- `BUNDLE_ID` / `APP_STORE_APPLE_ID` in `codemagic.yaml` to match your app record

The keys are injected into `www/index.html` at build time (replacing the `__REVENUECAT_KEY__` / `__POSTHOG_KEY__` placeholders).

## Roadmap (MVP → launch)
- [x] Inversions + voicing display on the keyboard
- [x] Scales tab (major/minor/modes) with the same highlight engine
- [x] RevenueCat IAP + 7-day trial (`IAP` module + `effectiveLevel`)
- [x] App icon set, manifest icons, Capacitor config, `codemagic.yaml`
- [ ] Wire iOS credentials (Apple Developer + RevenueCat) and run the first TestFlight build
- [~] Audio: upgraded to an additive synth (inharmonic partials, piano ADSR, reverb/compressor bus); real samples still the eventual goal
- [x] "Find chord" reverse lookup (tap keys → name the chord, bass-aware slash chords)
- [x] Keys tab: interactive circle of fifths + "chords in this key" (diatonic triads with Roman numerals)
- [x] Onboarding + two-tier tour (overview on first run / `?` button; per-tab contextual tips)
- [x] Ear training (ported from Jazz Guitar Lab): 4 modes, difficulty tiers, spaced repetition, auto/TTS
- [ ] Streak tracking + milestones (port from Jazz Guitar Lab)
- [x] Pricing decision — `$6.99` one-time (`app.js` `PRICE`; rationale in `CLAUDE.md`)
- [x] Smoke tests (Playwright harness)

## Freemium split
- **Free (Essentials):** first 4 chord types (maj, min, dom7, min7), root position only, Major + Natural Minor scales, all roots, keyboard, audio.
- **Pro:** all 27 chord types, all inversions, all 20 scales/modes, reverse lookup, circle of fifths + chords-in-key, full theory reference. One-time IAP, no subscription.
