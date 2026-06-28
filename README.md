# Piano Chords Lab

Interactive **piano chord, scale & theory reference** — a freemium iOS PWA. Pick a root and chord type, see it light up across an interactive keyboard, hear it, and learn the theory. The piano-market sibling of [Jazz Guitar Lab](https://github.com/PabloHoney1977/Jazz-Guitar-App).

## Status
🌱 **Starter scaffold.** A working "Build a Chord" core is in place: 16 chord types, all 12 roots, a clickable 2-octave keyboard with chord-tone highlighting, oscillator-based audio preview, dark/light theme, and the freemium gate (first 4 chord types free, rest Pro behind the UpgradeSheet). The harder modules are intentionally stubbed — see "Roadmap" and `CLAUDE.md`.

## Run locally
No build step. Serve the folder over http (service worker needs http, not `file://`):
```
python -m http.server 8000
# open http://localhost:8000
```
Live (GitHub Pages, served from `main`): https://pablohoney1977.github.io/Piano-Chords-Lab/

## Stack
Single-file React 18 PWA (CDN React, no bundler). All components, data, audio, and styles live in `app.js` (`e()` = `React.createElement`). CSS theme variables in `index.html`. Capacitor wraps it for iOS; Codemagic builds it (to be added, mirroring Jazz Guitar Lab).

## Roadmap (MVP → launch)
- [x] Inversions + voicing display on the keyboard (Pro) — slash-chord naming + bass-note marker
- [ ] Scales tab (major/minor/modes) with the same highlight engine
- [ ] "Find chord" reverse lookup (tap keys → name the chord)
- [ ] Real piano samples (port the sample-loading approach from Jazz Guitar Lab)
- [ ] RevenueCat IAP + 7-day trial (port the `IAP` module)
- [ ] Onboarding, contextual tours, streak tracking (port from Jazz Guitar Lab)
- [ ] App icon set, manifest icons, Capacitor iOS project, `codemagic.yaml`
- [ ] Pricing decision (currently `$9.99` placeholder in `app.js` `PRICE`)

## Freemium split
- **Free (Essentials):** first 4 chord types (maj, min, dom7, min7), all roots, keyboard, audio.
- **Pro:** all 16+ chord types, inversions, scales, reverse lookup, full theory reference. One-time IAP, no subscription.
