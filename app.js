/* Piano Chords Lab — single-file React PWA (no build step).
 * Mirrors the Jazz Guitar Lab architecture: e() = React.createElement, all
 * components/data/audio/styles inline, freemium gating via localStorage level.
 * This is a STARTER scaffold — a working "Build a Chord" core to grow from.
 * See CLAUDE.md for what to port from Jazz Guitar Lab (audio samples, IAP, tours). */
const e = React.createElement;
const { useState, useEffect, useRef } = React;
const safeLS    = (k, fb='') => { try { const v = localStorage.getItem(k); return v !== null ? v : fb; } catch(_){ return fb; } };
const safeLSSet = (k, v) => { try { localStorage.setItem(k, v); } catch(_){} };

/* ── Single source of truth for price (don't scatter literals like the jazz app did) ── */
const PRICE = '$6.99'; // one-time Pro unlock; single source of truth. See CLAUDE.md pricing note.

/* ── Music theory core (portable to any keyboard-based app) ── */
const NOTES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const WHITE_SEMIS = [0,2,4,5,7,9,11];     // C D E F G A B
const BLACK_AFTER  = [0,1,3,4,5];          // black key sits after these white indices (in an octave)
const BLACK_SEMI   = {0:1,1:3,3:6,4:8,5:10};

// id, display name, suffix symbol, semitone intervals from root
const CHORDS = [
  {id:'maj',  name:'Major',         sym:'',      ivls:[0,4,7]},
  {id:'min',  name:'Minor',         sym:'m',     ivls:[0,3,7]},
  {id:'dom7', name:'Dominant 7',    sym:'7',     ivls:[0,4,7,10]},
  {id:'min7', name:'Minor 7',       sym:'m7',    ivls:[0,3,7,10]},
  // ── Pro below (first 4 are free, mirroring Jazz Guitar Lab's "first 4 chord types") ──
  {id:'maj7', name:'Major 7',       sym:'maj7',  ivls:[0,4,7,11]},
  {id:'m7b5', name:'Half-dim 7',    sym:'m7♭5',  ivls:[0,3,6,10]},
  {id:'dim7', name:'Diminished 7',  sym:'°7',    ivls:[0,3,6,9]},
  {id:'aug',  name:'Augmented',     sym:'+',     ivls:[0,4,8]},
  {id:'sus4', name:'Suspended 4',   sym:'sus4',  ivls:[0,5,7]},
  {id:'sus2', name:'Suspended 2',   sym:'sus2',  ivls:[0,2,7]},
  {id:'maj6', name:'Major 6',       sym:'6',     ivls:[0,4,7,9]},
  {id:'min6', name:'Minor 6',       sym:'m6',    ivls:[0,3,7,9]},
  {id:'dom9', name:'Dominant 9',    sym:'9',     ivls:[0,4,7,10,14]},
  {id:'maj9', name:'Major 9',       sym:'maj9',  ivls:[0,4,7,11,14]},
  {id:'min9', name:'Minor 9',       sym:'m9',    ivls:[0,3,7,10,14]},
  {id:'add9', name:'Add 9',         sym:'add9',  ivls:[0,4,7,14]},
  {id:'dim',    name:'Diminished',      sym:'°',       ivls:[0,3,6]},
  {id:'7sus4',  name:'7 sus4',          sym:'7sus4',   ivls:[0,5,7,10]},
  {id:'6/9',    name:'Six-Nine',        sym:'6/9',     ivls:[0,4,7,9,14]},
  {id:'mMaj7',  name:'Minor-Major 7',   sym:'m(maj7)', ivls:[0,3,7,11]},
  {id:'7b5',    name:'Dominant 7♭5',    sym:'7♭5',     ivls:[0,4,6,10]},
  {id:'7s5',    name:'Dominant 7♯5',    sym:'7♯5',     ivls:[0,4,8,10]},
  {id:'7b9',    name:'Dominant 7♭9',    sym:'7♭9',     ivls:[0,4,7,10,13]},
  {id:'7s9',    name:'Dominant 7♯9',    sym:'7♯9',     ivls:[0,4,7,10,15]},
  {id:'maj7s11',name:'Major 7♯11',      sym:'maj7♯11', ivls:[0,4,7,11,18]},
  {id:'min11',  name:'Minor 11',        sym:'m11',     ivls:[0,3,7,10,14,17]},
  {id:'dom13',  name:'Dominant 13',     sym:'13',      ivls:[0,4,7,10,14,21]},
];
const FREE_TYPES = 4;

// id, display name, semitone intervals from root (one octave). First 2 free, rest Pro.
const SCALES = [
  {id:'major',   name:'Major (Ionian)',     ivls:[0,2,4,5,7,9,11]},
  {id:'natmin',  name:'Natural Minor',      ivls:[0,2,3,5,7,8,10]},
  // ── Pro below ──
  {id:'dorian',  name:'Dorian',             ivls:[0,2,3,5,7,9,10]},
  {id:'phryg',   name:'Phrygian',           ivls:[0,1,3,5,7,8,10]},
  {id:'lydian',  name:'Lydian',             ivls:[0,2,4,6,7,9,11]},
  {id:'mixo',    name:'Mixolydian',         ivls:[0,2,4,5,7,9,10]},
  {id:'locrian', name:'Locrian',            ivls:[0,1,3,5,6,8,10]},
  {id:'harmin',  name:'Harmonic Minor',     ivls:[0,2,3,5,7,8,11]},
  {id:'melmin',  name:'Melodic Minor',      ivls:[0,2,3,5,7,9,11]},
  {id:'majpent', name:'Major Pentatonic',   ivls:[0,2,4,7,9]},
  {id:'minpent', name:'Minor Pentatonic',   ivls:[0,3,5,7,10]},
  {id:'blues',   name:'Blues',              ivls:[0,3,5,6,7,10]},
  {id:'wholetone', name:'Whole Tone',        ivls:[0,2,4,6,8,10]},
  {id:'dimwh',     name:'Diminished (W–H)',  ivls:[0,2,3,5,6,8,9,11]},
  {id:'dimhw',     name:'Diminished (H–W)',  ivls:[0,1,3,4,6,7,9,10]},
  {id:'lydondom',  name:'Lydian Dominant',   ivls:[0,2,4,6,7,9,10]},
  {id:'phrygdom',  name:'Phrygian Dominant', ivls:[0,1,4,5,7,8,10]},
  {id:'altered',   name:'Altered (Super Locrian)', ivls:[0,1,3,4,6,8,10]},
  {id:'bebopdom',  name:'Bebop Dominant',    ivls:[0,2,4,5,7,9,10,11]},
  {id:'hungmin',   name:'Hungarian Minor',   ivls:[0,2,3,6,7,8,11]},
];
const FREE_SCALES = 2;

const chordPCs   = (root, ivls) => ivls.map(i => (root + i) % 12);
const chordNotes = (root, ivls) => ivls.map(i => NOTES[(root + i) % 12]);
const chordName  = (root, ch)   => NOTES[root] + ch.sym;

/* Inversions: voice the chord starting from C4 (midi 60), then raise the lowest
 * `inv` tones an octave. Returns the actual sounding MIDI notes, low → high.
 * inv 0 = root position; max useful inv = ivls.length-1. 3 octaves (60–95) fit all. */
const INV_LABELS = ['Root','1st','2nd','3rd','4th','5th'];
function voicing(root, ivls, inv){
  const ms = ivls.map(i => 60 + root + i);
  for (let k = 0; k < inv && k < ms.length; k++) ms[k] += 12;
  return ms.sort((a,b) => a - b);
}

/* ── Reverse lookup: name the chord(s) that match a set of selected notes ──
 * `pcs` = selected pitch classes (0–11); `bassPC` = pitch class of the lowest
 * selected note (for slash / inversion naming). Returns every exact match across
 * all 12 roots and the CHORDS table — symmetric chords (dim7/aug) and shared sets
 * (C6 == Am7) intentionally yield several, disambiguated by the bass. Root-position
 * matches (root == bass) rank first, then by fewest notes. */
const TWO_NOTE = {1:'min 2nd',2:'maj 2nd',3:'min 3rd',4:'maj 3rd',5:'perfect 4th',
  6:'tritone',7:'perfect 5th',8:'min 6th',9:'maj 6th',10:'min 7th',11:'maj 7th'};
function identifyChord(pcs, bassPC){
  const set = new Set(pcs);
  const out = [];
  for (let root = 0; root < 12; root++){
    for (const ch of CHORDS){
      const chSet = new Set(ch.ivls.map(i => (root + i) % 12));
      if (chSet.size !== set.size) continue;
      let ok = true; set.forEach(pc => { if (!chSet.has(pc)) ok = false; });
      if (!ok) continue;
      const slash = bassPC != null && bassPC !== root;
      out.push({ root, ch, slash,
        name: NOTES[root] + ch.sym + (slash ? '/' + NOTES[bassPC] : '') });
    }
  }
  out.sort((a,b) =>
    (a.slash - b.slash) || (a.ch.ivls.length - b.ch.ivls.length) || (a.root - b.root));
  return out;
}

/* ── Circle of fifths + diatonic chords ("chords in this key") ──
 * CO5 is the wheel in fifths order (clockwise from C): each entry has the major key,
 * its relative minor, its tonic pitch class, and its key signature. `keyInfoFor(pc)`
 * finds the entry for a root; `diatonicTriads(pc)` returns the seven triads built on a
 * major scale, with Roman numerals and playable MIDI. */
const CO5 = [
  { maj:'C',  min:'Am',  pc:0,  sig:'0'  },
  { maj:'G',  min:'Em',  pc:7,  sig:'1♯' },
  { maj:'D',  min:'Bm',  pc:2,  sig:'2♯' },
  { maj:'A',  min:'F♯m', pc:9,  sig:'3♯' },
  { maj:'E',  min:'C♯m', pc:4,  sig:'4♯' },
  { maj:'B',  min:'G♯m', pc:11, sig:'5♯' },
  { maj:'G♭', min:'E♭m', pc:6,  sig:'6♭' },
  { maj:'D♭', min:'B♭m', pc:1,  sig:'5♭' },
  { maj:'A♭', min:'Fm',  pc:8,  sig:'4♭' },
  { maj:'E♭', min:'Cm',  pc:3,  sig:'3♭' },
  { maj:'B♭', min:'Gm',  pc:10, sig:'2♭' },
  { maj:'F',  min:'Dm',  pc:5,  sig:'1♭' },
];
const DIA_MAJOR = [0,2,4,5,7,9,11];
const ROMANS  = ['I','ii','iii','IV','V','vi','vii°'];
const DEG_SYM = ['','m','m','','','m','°'];
const keyInfoFor = (root) => CO5.find(x => x.pc === root) || CO5[0];
function diatonicTriads(root){
  return [0,1,2,3,4,5,6].map(d => {
    const semis = [d, d+2, d+4].map(x => DIA_MAJOR[x % 7] + 12 * Math.floor(x / 7));
    return { roman:ROMANS[d], name:NOTES[(root + DIA_MAJOR[d]) % 12] + DEG_SYM[d],
             midis: semis.map(s => 60 + root + s) };
  });
}

/* ── Audio (additive synthesized piano — no samples) ──
 * Each note is a stack of sine partials with slight string inharmonicity, shaped by a
 * piano-like envelope (fast attack, two-stage decay) and a brightness rolloff that darkens
 * as the note decays. All notes feed a shared master bus: convolution reverb (synthesized
 * impulse), a high-shelf to tame harshness, and a compressor to glue chords. Still a synth,
 * but far closer to a real piano than the old two-oscillator beep. Swap for samples later. */
let _actx;
const ctx = () => (_actx = _actx || new (window.AudioContext || window.webkitAudioContext)());

// Relative amplitude of partials 1..6 (normalized to sum ≈ 1 so chords don't clip).
const PARTIAL_GAIN = [0.5, 0.25, 0.12, 0.07, 0.04, 0.02];
const INHARMONICITY = 0.0004; // piano strings: fn = n·f0·√(1+B·n²)

let _bus;
function makeImpulse(c, seconds, decay){
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++){
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, decay);
  }
  return buf;
}
function bus(c){
  if (_bus) return _bus;
  const input = c.createGain();
  const sum   = c.createGain();
  const dry   = c.createGain(); dry.gain.value = 0.88;
  const wet   = c.createGain(); wet.gain.value = 0.11;
  const rev   = c.createConvolver(); rev.buffer = makeImpulse(c, 2.2, 2.6);
  const shelf = c.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 3200; shelf.gain.value = -4;
  const comp  = c.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.25;
  const master = c.createGain(); master.gain.value = 0.85;
  input.connect(dry).connect(sum);
  input.connect(rev).connect(wet).connect(sum);
  sum.connect(shelf).connect(comp).connect(master).connect(c.destination);
  _bus = { input };
  return _bus;
}
function pianoNote(c, midi, when, dur, vol){
  const f0 = 440 * Math.pow(2, (midi - 69) / 12);
  const out = bus(c).input;
  const g = c.createGain();
  // Piano envelope: ~4ms attack, fast decay to ~40%, then a longer decay to the tail.
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.004);
  g.gain.exponentialRampToValueAtTime(vol * 0.4, when + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  // Tone darkens as the note rings out.
  const lp = c.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(9000, f0*8 + 2000), when);
  lp.frequency.exponentialRampToValueAtTime(Math.max(700, f0*3), when + dur);
  g.connect(lp).connect(out);
  const stop = when + dur + 0.05;
  PARTIAL_GAIN.forEach((amp, idx) => {
    const n = idx + 1;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.value = f0 * n * Math.sqrt(1 + INHARMONICITY*n*n);
    const pg = c.createGain(); pg.gain.value = amp;
    o.connect(pg).connect(g);
    o.start(when); o.stop(stop);
  });
}
function playMidi(midi){ const c = ctx(); if (c.state==='suspended') c.resume(); pianoNote(c, midi, c.currentTime, 1.1, 0.22); }
function playChord(midis){
  const c = ctx(); if (c.state==='suspended') c.resume();
  midis.forEach((m,i) => pianoNote(c, m, c.currentTime + i*0.035, 1.7, 0.16));
}
// Ascending sequence (scales) — distinct, evenly-spaced notes.
function playSeq(midis){
  const c = ctx(); if (c.state==='suspended') c.resume();
  midis.forEach((m,i) => pianoNote(c, m, c.currentTime + i*0.22, 0.45, 0.2));
}

const track = (ev, props) => { try { window.posthog && window.posthog.capture(ev, props); } catch(_){} };

/* ── Entitlement model (ported from Jazz Guitar Lab's effectiveLevel architecture) ──
 * Two levels of truth:
 *   owned  — what the user actually purchased ('essentials' | 'pro'), in pc-level
 *   trial  — a one-time 7-day Pro trial, start timestamp in pc-trial-start
 * The *effective* level the UI gates on is the max of (owned, active trial). Once the
 * trial is started it can't be restarted (presence of pc-trial-start = "used"). */
const TRIAL_DAYS = 7;
const DAY_MS = 86400000;
const trialMsLeft = (start, now) => start ? Math.max(0, start + TRIAL_DAYS*DAY_MS - now) : 0;
const effectiveLevel = (owned, start, now) =>
  (owned === 'pro' || trialMsLeft(start, now) > 0) ? 'pro' : 'essentials';

/* ── IAP (RevenueCat via Capacitor) ──
 * RevenueCat ships as a Capacitor plugin, so it only exists on device; on the web PWA
 * `native` is false and every method no-ops/returns false (the dev Pro toggle and the
 * web "unlock" path keep the browser build testable). Entitlement id `pro`, product
 * `pro_unlock` — mirror Jazz Guitar Lab. Verify the plugin's response shapes against the
 * installed @revenuecat/purchases-capacitor version when the iOS project is added. */
const IAP = {
  API_KEY: (typeof window !== 'undefined' && window.__REVENUECAT_KEY__) || '__REVENUECAT_KEY__',
  ENTITLEMENT: 'pro',
  PRODUCT: 'pro_unlock',
  _configured: false,
  get plugin(){ try { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases; } catch(_){ return null; } },
  get native(){ try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && this.plugin); } catch(_){ return false; } },
  _active(info){ try { return !!(info && info.entitlements && info.entitlements.active && info.entitlements.active[this.ENTITLEMENT]); } catch(_){ return false; } },
  async configure(){
    if (this._configured || !this.native) return;
    try { await this.plugin.configure({ apiKey: this.API_KEY }); this._configured = true; } catch(_){}
  },
  async isEntitled(){
    if (!this.native) return false;
    try { const r = await this.plugin.getCustomerInfo(); return this._active(r && r.customerInfo); } catch(_){ return false; }
  },
  async purchase(){
    if (!this.native) return false;
    try {
      const offerings = await this.plugin.getOfferings();
      const cur = offerings && (offerings.current || (offerings.all && offerings.all.default));
      const pkg = cur && cur.availablePackages && cur.availablePackages[0];
      if (!pkg) return false;
      const r = await this.plugin.purchasePackage({ aPackage: pkg });
      return this._active(r && r.customerInfo);
    } catch(_){ return false; }
  },
  async restore(){
    if (!this.native) return false;
    try { const r = await this.plugin.restorePurchases(); return this._active(r && r.customerInfo); } catch(_){ return false; }
  },
};

/* ── Interactive keyboard (3 octaves from C4) ──
 * Renders the literal voicing (actual sounding notes), so inversions are visible:
 * the bass note is colored --root, the upper chord tones --tone. */
function Keyboard({ voicing, bassMidi, onKey }){
  // onKey(midi): when provided (Find mode), a tap also toggles selection.
  const tap = (midi) => { playMidi(midi); if (onKey) onKey(midi); };
  const OCT = 3, W = 32, H = 168, BW = 21, BH = 104, START = 60;
  const whites = [];
  for (let o = 0; o < OCT; o++) for (let wi = 0; wi < 7; wi++){
    const semi = WHITE_SEMIS[wi];
    whites.push({ x:(o*7+wi)*W, midi:START + o*12 + semi });
  }
  const blacks = [];
  for (let o = 0; o < OCT; o++) for (const ba of BLACK_AFTER){
    const semi = BLACK_SEMI[ba];
    blacks.push({ x:(o*7+ba+1)*W - BW/2, midi:START + o*12 + semi });
  }
  const totalW = OCT*7*W;
  const on = new Set(voicing);
  const fill = (midi, isBlack) => {
    if (midi === bassMidi) return 'var(--root)';
    if (on.has(midi))      return 'var(--tone)';
    return isBlack ? 'var(--black-key)' : 'var(--white-key)';
  };
  return e('svg', { viewBox:`0 0 ${totalW} ${H}`, width:'100%',
      style:{ display:'block', maxWidth:totalW, margin:'4px auto 0',
              transform:'translateZ(0)', WebkitTransform:'translateZ(0)' } },
    whites.map((k,i) => e('g', { key:'w'+i, onClick:()=>tap(k.midi), style:{cursor:'pointer'} },
      e('rect', { x:k.x+1, y:0, width:W-2, height:H, rx:4,
        fill:fill(k.midi,false), stroke:'var(--border)', strokeWidth:1 }),
      on.has(k.midi)
        ? e('text', { x:k.x+W/2, y:H-12, textAnchor:'middle', fontSize:12, fontWeight:700,
            fill:'var(--dot-lbl)' }, NOTES[k.midi%12])
        : null
    )),
    blacks.map((k,i) => e('rect', { key:'b'+i, x:k.x, y:0, width:BW, height:BH, rx:3,
      onClick:()=>tap(k.midi),
      fill:fill(k.midi,true), stroke:'var(--border)', strokeWidth:1, style:{cursor:'pointer'} }))
  );
}

/* ── Circle of Fifths wheel (two rings: major outer, relative-minor inner) ── */
function polar(cx, cy, r, deg){ const a = (deg - 90) * Math.PI / 180; return [cx + r*Math.cos(a), cy + r*Math.sin(a)]; }
function wedgePath(cx, cy, rIn, rOut, a0, a1){
  const [x0,y0] = polar(cx,cy,rOut,a0), [x1,y1] = polar(cx,cy,rOut,a1);
  const [x2,y2] = polar(cx,cy,rIn,a1),  [x3,y3] = polar(cx,cy,rIn,a0);
  const large = (a1 - a0) <= 180 ? 0 : 1;
  return `M${x0} ${y0} A${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3} Z`;
}
function CircleOfFifths({ root, onPick }){
  const cx = 130, cy = 130;
  const wedge = (k, rIn, rOut) => wedgePath(cx, cy, rIn, rOut, k*30 - 15, k*30 + 15);
  const sel = keyInfoFor(root);
  return e('svg', { viewBox:'0 0 260 260', width:'100%',
      style:{ maxWidth:300, display:'block', margin:'0 auto', transform:'translateZ(0)', WebkitTransform:'translateZ(0)' } },
    CO5.map((it,k) => {
      const on = it.pc === root, [lx,ly] = polar(cx,cy,96,k*30);
      return e('g',{ key:'M'+k, onClick:()=>onPick(it.pc), style:{cursor:'pointer'} },
        e('path',{ d:wedge(k,72,120), fill:on?'var(--accent)':'var(--bg3)', stroke:'var(--border)', strokeWidth:1 }),
        e('text',{ x:lx, y:ly+5, textAnchor:'middle', fontSize:15, fontWeight:800, fill:on?'#07070f':'var(--txt)' }, it.maj));
    }),
    CO5.map((it,k) => {
      const on = it.pc === root, [lx,ly] = polar(cx,cy,52,k*30);
      return e('g',{ key:'m'+k, onClick:()=>onPick(it.pc), style:{cursor:'pointer'} },
        e('path',{ d:wedge(k,34,72), fill:on?'var(--tone)':'var(--bg2)', stroke:'var(--border)', strokeWidth:1 }),
        e('text',{ x:lx, y:ly+4, textAnchor:'middle', fontSize:11, fontWeight:700, fill:on?'#07070f':'var(--hint)' }, it.min));
    }),
    e('circle',{ cx, cy, r:33, fill:'var(--bg2)', stroke:'var(--border)', strokeWidth:1 }),
    e('text',{ x:cx, y:cy-1, textAnchor:'middle', fontSize:16, fontWeight:800, fill:'var(--txt)' }, sel.maj),
    e('text',{ x:cx, y:cy+14, textAnchor:'middle', fontSize:10, fill:'var(--hint)' }, sel.sig === '0' ? '♮' : sel.sig)
  );
}

/* ── Ear trainer (Pro) — ported from Jazz Guitar Lab's EarTrainingView ──
 * Instrument-agnostic logic kept ~verbatim (4 modes, interval difficulty tiers,
 * per-item spaced-repetition "weakest" tracking, back/forward history, auto mode
 * + TTS, persistent scoring, intro gate). Piano layer rebuilt: the play* bodies
 * drive our pianoNote() synth (MIDI, C4=60); theme constants map to our CSS vars;
 * cadences adapted to common/pop progressions; localStorage keys prefixed pc-.
 * The whole tab is Pro-gated, so level is always 'pro' (isEss branches dormant). */
const UI_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const SERIF   = UI_FONT; // JGL used Georgia; keep our sans aesthetic
const BG2='var(--bg2)', BORDER='var(--border)', HINT='var(--hint)', LBL='var(--txt)',
  BTN_OFF='var(--txt)', BTN_BRD='var(--border)', GOLD='var(--gold)',
  ACT_GOLD='var(--bg3)', ACT_RED='var(--bg3)', ACT_YEL='var(--bg3)', WRONG='var(--root)';
// Chord/triad interval shapes for playback.
const SHAPE = { major:[0,4,7], minor:[0,3,7], dim:[0,3,6], aug:[0,4,8],
  maj7:[0,4,7,11], m7:[0,3,7,10], dom7:[0,4,7,10], m7b5:[0,3,6,10], dim7:[0,3,6,9] };

function EarTrainingView({level,onPracticed,onUpgrade}){
  const isEss=level==='essentials';
  const practicedRef=useRef(false);
  const answerCountRef=useRef(0);
  const skipSaveRef=useRef(0);
  const levelInitRef=useRef(false);
  const levelChangingRef=useRef(false);

  const [mode,setMode]=useState('intervals');
  const [scores,setScores]=useState(()=>{
    try{const s=JSON.parse(safeLS('pc-ear-scores','{}'));
      return {intervals:{r:s.intervals?.r||0,w:s.intervals?.w||0},
        triads:{r:s.triads?.r||0,w:s.triads?.w||0},
        chords:{r:s.chords?.r||0,w:s.chords?.w||0},
        cadences:{r:s.cadences?.r||0,w:s.cadences?.w||0}};}
    catch(ex){return {intervals:{r:0,w:0},triads:{r:0,w:0},chords:{r:0,w:0},cadences:{r:0,w:0}};}
  });
  const [detail,setDetail]=useState(()=>{
    try{const s=JSON.parse(safeLS('pc-ear-detail','{}'));
      return {intervals:s.intervals||{},triads:s.triads||{},chords:s.chords||{},cadences:s.cadences||{}};}
    catch(ex){return {intervals:{},triads:{},chords:{},cadences:{}};}
  });
  useEffect(()=>{if(skipSaveRef.current>0){skipSaveRef.current--;return;}safeLSSet('pc-ear-scores',JSON.stringify(scores));},[scores]);
  useEffect(()=>{if(skipSaveRef.current>0){skipSaveRef.current--;return;}safeLSSet('pc-ear-detail',JSON.stringify(detail));},[detail]);
  const [seenIntro,setSeenIntro]=useState(()=>!!safeLS('pc-ear-intro'));
  const [current,setCurrent]=useState(null);
  const [revealed,setRevealed]=useState(false);
  const [lastResult,setLastResult]=useState(null);
  const [wrongGuess,setWrongGuess]=useState(null);
  const [choices,setChoices]=useState([]);
  const [harmonic,setHarmonic]=useState(false);
  const [ivalTier,setIvalTier]=useState(()=>{const v=parseInt(safeLS('pc-ear-ival-tier','1'),10);return v>=1&&v<=5?v:1;});
  useEffect(()=>{safeLSSet('pc-ear-ival-tier',String(ivalTier));},[ivalTier]);
  const [autoMode,setAutoMode]=useState(false);
  const historyRef=useRef([]);
  const autoTimerRef=useRef(null);
  const autoTimer2Ref=useRef(null);
  const bestVoiceRef=useRef(null);
  const autoModeRef=useRef(false);

  useEffect(()=>{
    function pickVoice(){
      const vs=window.speechSynthesis?.getVoices()||[];
      if(!vs.length) return;
      bestVoiceRef.current=
        vs.find(v=>/enhanced|premium/i.test(v.name)&&/en[-_]/i.test(v.lang))
        ||vs.find(v=>/google.*en.*us|en.*us.*google/i.test(v.name))
        ||vs.find(v=>v.lang==='en-US'&&v.localService)
        ||vs.find(v=>v.lang==='en-US')
        ||vs.find(v=>/^en/i.test(v.lang))||null;
    }
    pickVoice();
    window.speechSynthesis?.addEventListener('voiceschanged',pickVoice);
    return()=>window.speechSynthesis?.removeEventListener('voiceschanged',pickVoice);
  },[]);
  useEffect(()=>{autoModeRef.current=autoMode;},[autoMode]);
  useEffect(()=>{if(!autoMode){clearTimeout(autoTimerRef.current);clearTimeout(autoTimer2Ref.current);window.speechSynthesis?.cancel();}},[autoMode]);
  useEffect(()=>()=>{clearTimeout(autoTimerRef.current);clearTimeout(autoTimer2Ref.current);window.speechSynthesis?.cancel();},[]);

  const IVALS=[
    {s:1, name:'Minor 2nd', feel:'"Jaws" theme · "Mission: Impossible"'},
    {s:2, name:'Major 2nd', feel:'"Happy Birthday" opening · "Frère Jacques"'},
    {s:3, name:'Minor 3rd', feel:'"Smoke on the Water" · "Greensleeves"'},
    {s:4, name:'Major 3rd', feel:'"When the Saints…" · Beethoven\'s 5th'},
    {s:5, name:'Perfect 4th',feel:'"Here Comes the Bride" · "Amazing Grace"'},
    {s:6, name:'Tritone',   feel:'"The Simpsons" theme · "Maria" (Ma-RÍ-a)'},
    {s:7, name:'Perfect 5th',feel:'"Star Wars" theme · "Twinkle Twinkle" leap'},
    {s:8, name:'Minor 6th', feel:'"The Entertainer" · "Because" (Beatles)'},
    {s:9, name:'Major 6th', feel:'"My Bonnie…" · NBC chimes'},
    {s:10,name:'Minor 7th', feel:'"Somewhere" (West Side Story) · "Star Trek"'},
    {s:11,name:'Major 7th', feel:'"Take On Me" chorus · "Don\'t Know Why"'},
    {s:12,name:'Octave',    feel:'"Over the Rainbow" (Some-WHERE)'},
  ];
  const IVAL_TIERS=[
    {lbl:'Octave & Perfects',  ivals:[5,7,12]},
    {lbl:'+ Major 3rd & 6th',  ivals:[4,5,7,9,12]},
    {lbl:'+ Minor 3rd & 6th',  ivals:[3,4,5,7,8,9,12]},
    {lbl:'+ 2nds & 7ths',      ivals:[2,3,4,5,7,8,9,10,11,12]},
    {lbl:'All 12',             ivals:[1,2,3,4,5,6,7,8,9,10,11,12]},
  ];
  const maxTier=isEss?3:5;
  const effTier=Math.min(ivalTier,maxTier);
  const activeIvals=IVALS.filter(x=>IVAL_TIERS[effTier-1].ivals.includes(x.s));

  // Cadences adapted to common/pop progressions (major key, root-relative offsets).
  const CADENCES=[
    {id:'I-IV-V',    name:'I–IV–V',        chords:[{r:0,q:'major'},{r:5,q:'major'},{r:7,q:'major'}], feel:'The three-chord backbone of rock, blues & folk'},
    {id:'I-V-vi-IV', name:'I–V–vi–IV',     chords:[{r:0,q:'major'},{r:7,q:'major'},{r:9,q:'minor'},{r:5,q:'major'}], feel:'The "four-chord song" — countless pop hits'},
    {id:'ii-V-I',    name:'ii–V–I',        chords:[{r:2,q:'m7'},{r:7,q:'dom7'},{r:0,q:'maj7'}], feel:'The engine of jazz harmony'},
    {id:'I-vi-IV-V', name:'I–vi–IV–V',     chords:[{r:0,q:'major'},{r:9,q:'minor'},{r:5,q:'major'},{r:7,q:'major'}], feel:'The 1950s doo-wop progression'},
    {id:'IV-I',      name:'IV–I (plagal)', chords:[{r:5,q:'major'},{r:0,q:'major'}], feel:'The "Amen" cadence'},
  ];

  const TRIAD_LBL={major:'Major',minor:'Minor',dim:'Diminished',aug:'Augmented'};
  const TRIAD_DESC={
    major:'bright, stable — I, IV, V of a major key',
    minor:'dark, smooth — ii, iii, vi of a major key',
    dim:'tense, unstable — the vii°; two minor thirds stacked',
    aug:'eerie, whole-tone color — two major thirds stacked'
  };
  const TRIAD_LIST=['major','minor','dim','aug'];
  const QUALITIES=['maj7','m7','dom7','m7b5'];
  const QLABELS={'maj7':'Major 7','m7':'Minor 7','dom7':'Dom 7','m7b5':'Half-Dim'};
  const QDESCS={
    maj7:'lush, stable — the I and IV chord',
    m7:'smooth, floating — the ii and vi chord',
    dom7:'tense, pulling — the V chord',
    m7b5:'searching, unstable — the vii and minor ii chord'
  };

  // ── Play functions (piano synth) ──
  const _ac=()=>{const c=ctx();if(c.state==='suspended')c.resume();return c;};
  function playInterval(root,sem,isHarmonic){
    try{const c=_ac(),t=c.currentTime,m1=60+root,m2=m1+sem;
      pianoNote(c,m1,t+0.05,1.2,0.22);
      pianoNote(c,m2,isHarmonic?t+0.05:t+0.62,1.2,0.22);
    }catch(ex){}
  }
  function playTriad(root,quality){
    try{const c=_ac(),t=c.currentTime;
      (SHAPE[quality]||[0,4,7]).forEach((iv,i)=>pianoNote(c,60+root+iv,t+i*0.09,1.5,0.17));
    }catch(ex){}
  }
  function playSeventh(root,quality){
    try{const c=_ac(),t=c.currentTime;
      (SHAPE[quality]||[0,4,7,10]).forEach((iv,i)=>pianoNote(c,60+root+iv,t+i*0.07,1.7,0.15));
    }catch(ex){}
  }
  function playCadence(root,cadence){
    try{const c=_ac(),t=c.currentTime;
      cadence.chords.forEach((chord,ci)=>{
        const chordRoot=(root+chord.r)%12;
        (SHAPE[chord.q]||[0,4,7]).forEach((iv,ni)=>pianoNote(c,48+chordRoot+iv,t+ci*1.15+ni*0.05,1.4,0.13));
      });
    }catch(ex){}
  }
  function playRound(r){
    if(!r||!r.current) return;
    if(r.mode==='intervals') playInterval(r.current.root,r.current.semitones,!!r.harmonic);
    else if(r.mode==='triads') playTriad(r.current.root,r.current.quality);
    else if(r.mode==='cadences') playCadence(r.current.root,r.current.cadence);
    else playSeventh(r.current.root,r.current.quality);
  }
  function replayCurrent(){ if(!current) return; playRound({mode,current,harmonic}); }
  function pushHistory(){
    if(!current) return;
    historyRef.current.push({mode,current,choices,revealed,lastResult,wrongGuess,harmonic});
    if(historyRef.current.length>50) historyRef.current.shift();
  }
  function nextRound(){ pushHistory(); newRound(); }
  function goBack(){
    const h=historyRef.current.pop();
    if(!h){replayCurrent();return;}
    clearTimeout(autoTimerRef.current);clearTimeout(autoTimer2Ref.current);
    setCurrent(h.current);setChoices(h.choices||[]);setRevealed(h.revealed);
    setLastResult(h.lastResult);setWrongGuess(h.wrongGuess);
    setTimeout(()=>playRound(h),150);
  }
  function autoReveal(){
    if(!current) return;
    let spk='';
    if(mode==='intervals'){
      const iv=IVALS.find(x=>x.s===current.semitones);
      const ORD={'2nd':'second','3rd':'third','4th':'fourth','5th':'fifth','6th':'sixth','7th':'seventh','8th':'octave'};
      spk=iv?iv.name.replace(/\b(\d+(?:st|nd|rd|th))\b/g,m=>ORD[m]||m):'';
    } else if(mode==='triads'){spk=(TRIAD_LBL[current.quality]||'')+' triad';}
    else if(mode==='cadences'){
      const m={'I-IV-V':'One four five','I-V-vi-IV':'One five six four','ii-V-I':'Two five one','I-vi-IV-V':'One six four five','IV-I':'Four one'};
      spk=m[current.cadence.id]||current.cadence.name;
    } else {
      const m={'maj7':'Major seven','m7':'Minor seven','dom7':'Dominant seven','m7b5':'Half diminished'};
      spk=m[current.quality]||QLABELS[current.quality]||'';
    }
    setRevealed(true);setLastResult('auto');
    if(!spk){autoTimerRef.current=setTimeout(newRound,2600);return;}
    if(window.speechSynthesis){
      window.speechSynthesis.cancel();
      const utt=new SpeechSynthesisUtterance(spk);
      if(bestVoiceRef.current) utt.voice=bestVoiceRef.current;
      utt.rate=0.82;utt.pitch=0.9;
      let done=false;
      function adv(){if(done||!autoModeRef.current)return;done=true;autoTimerRef.current=setTimeout(newRound,1600);}
      utt.onend=adv;utt.onerror=adv;
      autoTimerRef.current=setTimeout(adv,Math.max(3000,spk.length*80));
      window.speechSynthesis.speak(utt);
    } else { autoTimerRef.current=setTimeout(newRound,2600); }
  }

  useEffect(()=>{
    if(!autoMode||!current||revealed)return;
    clearTimeout(autoTimerRef.current);clearTimeout(autoTimer2Ref.current);
    autoTimer2Ref.current=setTimeout(replayCurrent,2000);
    autoTimerRef.current=setTimeout(autoReveal,7000);
    return()=>{clearTimeout(autoTimerRef.current);clearTimeout(autoTimer2Ref.current);};
  },[current,autoMode,revealed]); // eslint-disable-line

  function newRound(){
    const root=Math.floor(Math.random()*12);
    setRevealed(false);setLastResult(null);setWrongGuess(null);
    if(mode==='intervals'){
      const correct=activeIvals[Math.floor(Math.random()*activeIvals.length)];
      const others=activeIvals.filter(x=>x.s!==correct.s).sort(()=>Math.random()-0.5).slice(0,3);
      setChoices([correct,...others].sort(()=>Math.random()-0.5));
      setCurrent({root,semitones:correct.s});
      setTimeout(()=>playInterval(root,correct.s,harmonic),150);
    } else if(mode==='triads'){
      const quality=TRIAD_LIST[Math.floor(Math.random()*4)];
      setCurrent({root,quality});
      setTimeout(()=>playTriad(root,quality),150);
    } else if(mode==='cadences'){
      const cadencePool=isEss?CADENCES.slice(0,2):CADENCES;
      const correct=cadencePool[Math.floor(Math.random()*cadencePool.length)];
      const others=CADENCES.filter(x=>x.id!==correct.id).sort(()=>Math.random()-0.5).slice(0,3);
      setChoices([correct,...others].sort(()=>Math.random()-0.5));
      setCurrent({root,cadence:correct});
      setTimeout(()=>playCadence(root,correct),150);
    } else {
      const quality=QUALITIES[Math.floor(Math.random()*4)];
      setCurrent({root,quality});
      setTimeout(()=>playSeventh(root,quality),150);
    }
  }
  function guess(answer){
    if(revealed||!current||autoMode) return;
    let correct,key;
    if(mode==='intervals'){correct=answer===current.semitones;key=current.semitones;}
    else if(mode==='cadences'){correct=answer===current.cadence.id;key=current.cadence.id;}
    else{correct=answer===current.quality;key=current.quality;}
    setRevealed(true);setLastResult(correct?'right':'wrong');
    if(!correct) setWrongGuess(answer);
    answerCountRef.current++;
    if(!practicedRef.current&&answerCountRef.current>=5){practicedRef.current=true;onPracticed&&onPracticed();}
    setScores(s=>({...s,[mode]:{r:s[mode].r+(correct?1:0),w:s[mode].w+(correct?0:1)}}));
    setDetail(d=>{const m={...d[mode]},en={...m[key]||{r:0,w:0}};en[correct?'r':'w']++;m[key]=en;return{...d,[mode]:m};});
  }
  useEffect(()=>{
    if(seenIntro){
      if(levelChangingRef.current){levelChangingRef.current=false;return;}
      clearTimeout(autoTimerRef.current);clearTimeout(autoTimer2Ref.current);
      historyRef.current=[];
      newRound();
    }
  },[mode,seenIntro,ivalTier]); // eslint-disable-line
  useEffect(()=>{
    if(!levelInitRef.current){levelInitRef.current=true;return;}
    if(!seenIntro) return;
    clearTimeout(autoTimerRef.current);clearTimeout(autoTimer2Ref.current);
    if(isEss){
      setHarmonic(false);setAutoMode(false);
      if(mode==='triads'||mode==='chords'||mode==='cadences'){levelChangingRef.current=true;setMode('intervals');}
    }
    skipSaveRef.current+=2;
    setScores(s=>({...s,intervals:{r:0,w:0}}));
    setDetail(d=>({...d,intervals:{}}));
    historyRef.current=[];
    newRound();
  },[level]); // eslint-disable-line

  if(!seenIntro) return e('div',{style:{paddingTop:'12vh',paddingBottom:20,textAlign:'center',maxWidth:420,margin:'0 auto'}},
    e('div',{style:{fontSize:'2.5rem',marginBottom:12}},'♫'),
    e('div',{style:{fontSize:'1.1rem',fontWeight:800,fontFamily:SERIF,marginBottom:8}},'Ear Training'),
    e('div',{style:{fontSize:'.85rem',color:LBL,lineHeight:1.6,marginBottom:20}},
      'You\'ll hear notes played. Identify what you hear — interval, chord type, or progression. ',
      'The more you practice, the more your ear recognizes these sounds naturally.'),
    e('button',{onClick:()=>{setSeenIntro(true);safeLSSet('pc-ear-intro','1');},
      style:{padding:'11px 28px',borderRadius:8,fontSize:'.95rem',fontWeight:700,background:GOLD,color:'#07070f',border:'none',cursor:'pointer'}},
      'Start Training →'));

  const sc=scores[mode];
  const total=sc.r+sc.w;
  const pct=total>0?Math.round(100*sc.r/total):0;
  const weakest=(()=>{
    const dm=detail[mode]||{};
    let worst=null,worstRate=1;
    Object.entries(dm).forEach(([k,v])=>{const t=v.r+v.w;if(t<2) return;const rate=v.r/t;if(rate<worstRate){worstRate=rate;worst={k,r:v.r,w:v.w};}});
    if(!worst) return null;
    const label=mode==='intervals'?(IVALS.find(x=>x.s===+worst.k)||{name:worst.k}).name
      :mode==='triads'?(TRIAD_LBL[worst.k]||worst.k)
      :mode==='cadences'?((CADENCES.find(x=>x.id===worst.k)||{name:worst.k}).name)
      :(QLABELS[worst.k]||worst.k);
    return{label,missed:worst.w,total:worst.r+worst.w};
  })();

  function renderChoices(){
    const mkBtn=(key,onClick,label,isAns,isWrong)=>e('button',{key,onClick,disabled:revealed,style:{
      padding:'14px 8px',borderRadius:8,cursor:revealed?'default':'pointer',
      fontFamily:SERIF,fontSize:'.95rem',fontWeight:700,minHeight:52,
      border:'2px solid '+(isAns?GOLD:isWrong?WRONG:BTN_BRD),
      background:isAns?ACT_YEL:isWrong?ACT_RED:BG2,
      color:isAns?GOLD:isWrong?WRONG:BTN_OFF,
      opacity:revealed&&!isAns&&!isWrong?0.45:1}},label);
    if(mode==='intervals') return choices.map(iv=>mkBtn(iv.s,()=>guess(iv.s),iv.name,revealed&&iv.s===current.semitones,revealed&&wrongGuess===iv.s));
    if(mode==='cadences') return choices.map(cad=>mkBtn(cad.id,()=>guess(cad.id),cad.name,revealed&&cad.id===current.cadence.id,revealed&&wrongGuess===cad.id));
    const list=mode==='triads'?TRIAD_LIST:QUALITIES, lbls=mode==='triads'?TRIAD_LBL:QLABELS;
    return list.map(q=>mkBtn(q,()=>guess(q),lbls[q],revealed&&q===current.quality,revealed&&wrongGuess===q));
  }
  function renderReveal(){
    if(!revealed) return null;
    let answerName,answerDesc;
    if(mode==='intervals'){const iv=IVALS.find(x=>x.s===current.semitones);answerName=iv?iv.name:'';answerDesc=iv?iv.feel:'';}
    else if(mode==='triads'){answerName=TRIAD_LBL[current.quality];answerDesc=TRIAD_DESC[current.quality];}
    else if(mode==='cadences'){answerName=current.cadence.name;answerDesc=current.cadence.feel;}
    else{answerName=QLABELS[current.quality];answerDesc=QDESCS[current.quality];}
    if(lastResult==='auto') return e('div',{style:{textAlign:'center',marginBottom:14,padding:'12px 20px',background:BG2,border:'1px solid '+BORDER,borderRadius:8}},
      e('div',{style:{fontFamily:SERIF,fontSize:'1.1rem',color:GOLD,marginBottom:4}},answerName),
      e('div',{style:{fontSize:'.77rem',color:HINT}},answerDesc));
    return e('div',{style:{textAlign:'center',marginBottom:14,padding:'12px 20px',
      background:lastResult==='right'?ACT_YEL:ACT_RED,border:'1px solid '+(lastResult==='right'?GOLD:WRONG),borderRadius:8}},
      e('div',{style:{fontSize:'1.05rem',fontWeight:700,color:lastResult==='right'?GOLD:WRONG,marginBottom:4}},lastResult==='right'?'✓ Correct!':'✗ That was…'),
      e('div',{style:{fontFamily:SERIF,fontSize:'1.1rem',color:GOLD,marginBottom:4}},answerName),
      e('div',{style:{fontSize:'.77rem',color:HINT}},answerDesc));
  }

  const intervalHint=mode==='intervals'?(harmonic?'Two notes played together — name the interval':'Two notes played in sequence — name the interval'):null;
  const modeHint={intervals:intervalHint,triads:'Three-note chord — major, minor, diminished, or augmented?',chords:'Four-note chord — identify the 7th-chord quality',cadences:'A short progression — name it'};
  const TABS=[{id:'intervals',lbl:'Intervals',locked:false},{id:'triads',lbl:'Triads',locked:isEss},{id:'chords',lbl:'7ths',locked:isEss},{id:'cadences',lbl:'Progressions',locked:isEss}];

  function toggleAuto(){
    if(!autoMode&&isEss){onUpgrade&&onUpgrade('Auto ear training');return;}
    if(!autoMode){
      if(window.speechSynthesis){window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));}
      setAutoMode(true);newRound();
    } else {
      clearTimeout(autoTimerRef.current);clearTimeout(autoTimer2Ref.current);
      window.speechSynthesis?.cancel();clearTimeout(autoTimerRef.current);setAutoMode(false);
    }
  }

  return e('div',{style:{padding:'0 0 20px'}},
    e('div',{style:{textAlign:'center',marginBottom:12}},
      e('div',{style:{fontFamily:SERIF,fontSize:'1.2rem',fontWeight:800,color:'var(--txt)',marginBottom:4}},'Ear Training'),
      autoMode?e('div',{style:{fontSize:'.78rem',color:HINT}},'Auto mode — listen and learn, no scoring')
      :total>0?e('div',null,
        e('div',{style:{fontSize:'.95rem',fontWeight:700,color:pct>=70?GOLD:WRONG}},pct+'% — '+sc.r+'/'+total),
        weakest?e('div',{style:{fontSize:'.7rem',color:HINT,marginTop:3}},'⚠ Weakest: '+weakest.label+' ('+weakest.missed+'/'+weakest.total+' missed)'):null
      ):null),
    e('div',{style:{display:'flex',gap:2,alignItems:'flex-end'}},
      TABS.map(({id,lbl,locked})=>e('button',{key:id,onClick:locked?()=>onUpgrade&&onUpgrade(lbl):()=>setMode(id),style:{
        flex:1,padding:'8px 4px',borderRadius:'6px 6px 0 0',cursor:'pointer',fontSize:'.76rem',fontWeight:mode===id?800:500,
        border:'1px solid '+BTN_BRD,borderBottom:mode===id?'1px solid '+BG2:'1px solid '+BTN_BRD,
        background:mode===id?BG2:'transparent',color:mode===id?'var(--txt)':BTN_OFF,marginBottom:mode===id?'-1px':0,
        position:'relative',zIndex:mode===id?1:0,minHeight:42,...(locked?{opacity:0.6}:{})}},
        lbl,(locked?e('span',{style:{fontSize:'.6rem',marginLeft:2}},'🔒'):null)))),
    e('div',{style:{display:'flex',justifyContent:'flex-end',marginTop:4,marginBottom:4}},
      e('button',{onClick:toggleAuto,title:autoMode?'Turn off auto-advance':'Auto-advance: hear the answer, then next',
        style:{padding:'5px 10px',borderRadius:8,cursor:'pointer',fontSize:'.72rem',fontWeight:autoMode?700:500,
          border:'1px solid '+(autoMode?GOLD:BTN_BRD),background:autoMode?ACT_GOLD:'transparent',color:autoMode?GOLD:BTN_OFF,minHeight:36,whiteSpace:'nowrap'}},
        autoMode?'Auto ●':'Auto ○')),
    e('div',{style:{background:BG2,border:'1px solid '+BTN_BRD,borderRadius:'0 6px 6px 6px',padding:16,marginBottom:12}},
      e('div',{style:{fontSize:'.74rem',color:HINT,textAlign:'center',marginBottom:mode==='intervals'?4:14}},modeHint[mode]),
      mode==='intervals'?e('div',{style:{display:'flex',gap:6,justifyContent:'center',marginBottom:14}},
        e('button',{onClick:()=>setHarmonic(false),style:{padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:'.72rem',fontWeight:!harmonic?700:500,
          border:'1px solid '+(!harmonic?GOLD:BTN_BRD),background:!harmonic?ACT_YEL:'transparent',color:!harmonic?GOLD:BTN_OFF,minHeight:30}},'Ascending ↑'),
        e('button',{onClick:()=>setHarmonic(true),style:{padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:'.72rem',fontWeight:harmonic?700:500,
          border:'1px solid '+(harmonic?GOLD:BTN_BRD),background:harmonic?ACT_YEL:'transparent',color:harmonic?GOLD:BTN_OFF,minHeight:30}},'♪♪ Harmonic')
      ):null,
      mode==='intervals'?e('div',{style:{marginBottom:14}},
        e('div',{style:{fontSize:'.66rem',color:HINT,textAlign:'center',marginBottom:6}},'Difficulty — add intervals as your ear grows'),
        e('div',{style:{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap'}},
          IVAL_TIERS.map((t,i)=>{const tn=i+1,active=effTier===tn;
            return e('button',{key:tn,onClick:()=>setIvalTier(tn),title:t.lbl,style:{padding:'4px 10px',borderRadius:6,cursor:'pointer',fontSize:'.7rem',fontWeight:active?700:500,
              border:'1px solid '+(active?GOLD:BTN_BRD),background:active?ACT_YEL:'transparent',color:active?GOLD:BTN_OFF,minHeight:30}},'Lv'+tn);
          }))
      ):null,
      e('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginBottom:16}},
        e('div',{style:{display:'flex',alignItems:'center',gap:20}},
          e('button',{onClick:autoMode?replayCurrent:goBack,'aria-label':'Previous',disabled:autoMode,style:{
            width:44,height:44,borderRadius:'50%',border:'1px solid '+BTN_BRD,background:'transparent',color:BTN_OFF,fontSize:'1.2rem',
            cursor:autoMode?'default':'pointer',opacity:autoMode?0.35:1,display:'flex',alignItems:'center',justifyContent:'center'}},'←'),
          e('button',{onClick:replayCurrent,style:{width:72,height:72,borderRadius:'50%',border:'2px solid '+GOLD,background:ACT_YEL,color:GOLD,
            fontSize:'2rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 16px var(--gold)'}},'♪'),
          e('button',{onClick:!autoMode&&revealed?nextRound:replayCurrent,'aria-label':'Next',disabled:autoMode,style:{
            width:44,height:44,borderRadius:'50%',border:'1px solid '+(!autoMode&&revealed?GOLD:BTN_BRD),
            background:!autoMode&&revealed?ACT_YEL:'transparent',color:!autoMode&&revealed?GOLD:BTN_OFF,fontSize:'1.2rem',
            cursor:autoMode?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:autoMode?0.35:1}},'→')),
        e('div',{style:{fontSize:'.72rem',color:HINT}},autoMode&&!revealed?'Listen… answer coming':autoMode&&revealed?'Next question coming…':'Tap ♪ to replay')),
      renderReveal(),
      !revealed&&mode==='intervals'?e('div',{style:{marginBottom:12}},
        e('details',{style:{cursor:'pointer'}},
          e('summary',{style:{fontSize:'.7rem',color:HINT,userSelect:'none',listStyle:'none',textAlign:'center'}},'▸ Song reference hints'),
          e('div',{style:{marginTop:8,display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}},
            activeIvals.map(iv=>e('div',{key:iv.s,style:{fontSize:'.68rem',color:HINT,padding:'3px 6px',borderRadius:4,border:'1px solid '+BORDER,lineHeight:1.4}},
              e('span',{style:{color:BTN_OFF,fontWeight:600}},(['P1','m2','M2','m3','M3','P4','TT','P5','m6','M6','m7','M7','P8'][iv.s]||iv.name)+' '),iv.feel)))
        )):null,
      current?e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:revealed?12:0}},renderChoices()):null
    ),
    !autoMode?e('button',{onClick:()=>{setScores(s=>({...s,[mode]:{r:0,w:0}}));setDetail(d=>({...d,[mode]:{}}));},style:{
      width:'100%',padding:8,background:'transparent',border:'1px solid '+BTN_BRD,borderRadius:6,color:BTN_OFF,fontSize:'.78rem',cursor:'pointer',minHeight:40}},'Reset score'):null
  );
}

/* ── Upgrade sheet (RevenueCat purchase + 7-day trial + restore) ── */
function UpgradeSheet({ feature, canTrial, busy, onClose, onUnlock, onStartTrial, onRestore }){
  return e('div', { onClick:onClose, style:{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)',
      display:'flex', alignItems:'flex-end', zIndex:50 } },
    e('div', { onClick:ev=>ev.stopPropagation(), style:{ width:'100%', maxWidth:720, margin:'0 auto',
        background:'var(--bg2)', borderRadius:'18px 18px 0 0', padding:'22px 20px 30px',
        border:'1px solid var(--border)' } },
      e('div',{style:{width:40,height:4,borderRadius:2,background:'var(--border)',margin:'0 auto 16px'}}),
      e('div',{style:{fontSize:'1.2rem',fontWeight:800,marginBottom:6}},'Unlock Pro'),
      e('div',{style:{fontSize:'.92rem',color:'var(--hint)',marginBottom:18,lineHeight:1.5}},
        (feature?feature+' is a Pro feature. ':'') +
        'Pro unlocks every chord type, all inversions, scales, and the full theory reference — one price, forever. No subscription.'),
      e('button',{ onClick:onUnlock, disabled:busy, style:{ width:'100%', padding:15, borderRadius:10,
          cursor:busy?'default':'pointer', opacity:busy?0.6:1,
          fontWeight:700, fontSize:'1rem', background:'var(--gold)', border:'none', color:'#07070f' } },
        busy ? 'Working…' : 'Unlock Pro — ' + PRICE),
      canTrial
        ? e('button',{ onClick:onStartTrial, disabled:busy, style:{ width:'100%', padding:13, marginTop:10,
            borderRadius:10, cursor:busy?'default':'pointer', fontWeight:700, fontSize:'.95rem',
            background:'transparent', border:'1px solid var(--gold)', color:'var(--gold)' } },
            'Start 7-day free trial')
        : null,
      e('div',{style:{display:'flex',gap:8,marginTop:10}},
        e('button',{ onClick:onRestore, disabled:busy, style:{ flex:1, padding:12, borderRadius:10,
            cursor:busy?'default':'pointer', fontWeight:600, background:'transparent', border:'none', color:'var(--hint)' } },
          'Restore'),
        e('button',{ onClick:onClose, disabled:busy, style:{ flex:1, padding:12, borderRadius:10,
            cursor:busy?'default':'pointer', fontWeight:600, background:'transparent', border:'none', color:'var(--hint)' } },
          'Maybe later')
      )
    )
  );
}

/* ── Two-tier tour (overview on first run / from the ? button; per-tab contextual tips) ──
 * `tourStepsFor(key)` returns the steps for a tour; `key` is 'overview' or a tab id. */
function tourStepsFor(key){
  switch (key){
    case 'overview': return [
      { title:'Welcome to Piano Chords Lab', body:'An interactive reference for piano chords, scales and theory. Here’s a 20-second tour — tap Next.' },
      { title:'Chords', body:'Pick any root and chord type to see it light up across the keyboard and hear it. The first four types are free.' },
      { title:'Scales', body:'The Scales tab shows 12 scales and modes on the same keyboard, played back ascending.' },
      { title:'Find a chord', body:'Stuck on a voicing? The Find tab names any chord you tap in — it even reads the bass note for slash chords.' },
      { title:'Free → Pro', body:'Inversions, all scales, and Find are Pro. Start a one-time 7-day free trial anytime from the upgrade sheet — no subscription.' },
    ];
    case 'chords': return [
      { title:'Build a chord', body:'Choose a root and a chord type below; the keyboard shows the actual voicing. Tap ▶ Play to hear it.' },
      { title:'Inversions (Pro)', body:'Use the inversion buttons to lift the bass an octave — the name updates with the slash bass, e.g. C/E.' },
    ];
    case 'scales': return [
      { title:'Explore scales', body:'Pick a root and a scale; tap ▶ Play scale to hear it ascend. Major and Natural Minor are free.' },
    ];
    case 'find': return [
      { title:'Find a chord', body:'Tap notes on the keyboard and we’ll name the chord. The lowest note (red) is read as the bass, so inversions and slash chords are named too. Tap Clear to start over.' },
    ];
    case 'keys': return [
      { title:'Keys & the circle of fifths', body:'Tap any key on the wheel to see its signature, relative minor, and the seven chords that belong to it (with Roman numerals). Tap a chord to hear it.' },
    ];
    case 'ear': return [
      { title:'Train your ear', body:'Listen, then pick what you heard. Four modes up top — intervals, triads, 7th chords, and progressions — with difficulty levels, song-reference hints, and an auto mode that speaks the answers. Your accuracy and weakest items are tracked.' },
    ];
    default: return [];
  }
}

function Tour({ steps, onClose }){
  const [i, setI] = React.useState(0);
  const step = steps[i];
  if (!step) return null;
  const last = i === steps.length - 1;
  const btn = { flex:1, padding:12, borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'.95rem' };
  const ghost = { ...btn, background:'transparent', border:'1px solid var(--border)', color:'var(--hint)' };
  const primary = { ...btn, background:'var(--accent)', border:'none', color:'#07070f' };
  return e('div', { onClick:onClose, style:{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:60, padding:20 } },
    e('div', { onClick:ev=>ev.stopPropagation(), style:{ width:'100%', maxWidth:420, background:'var(--bg2)',
        border:'1px solid var(--border)', borderRadius:16, padding:'22px 20px 18px' } },
      e('div',{style:{fontSize:'1.15rem',fontWeight:800,marginBottom:8}}, step.title),
      e('div',{style:{fontSize:'.95rem',color:'var(--hint)',lineHeight:1.55,minHeight:72}}, step.body),
      steps.length > 1
        ? e('div',{style:{display:'flex',gap:5,justifyContent:'center',margin:'14px 0 16px'}},
            steps.map((_,d)=>e('div',{key:d,style:{width:7,height:7,borderRadius:4,
              background: d===i?'var(--accent)':'var(--border)'}})))
        : e('div',{style:{height:16}}),
      e('div',{style:{display:'flex',gap:8}},
        i>0 ? e('button',{ onClick:()=>setI(i-1), style:ghost }, 'Back')
            : e('button',{ onClick:onClose, style:ghost }, 'Skip'),
        e('button',{ onClick:()=> last ? onClose() : setI(i+1), style:primary }, last ? 'Done' : 'Next')
      )
    )
  );
}

/* ── App ── */
function App(){
  const [root, setRoot]   = React.useState(() => +(localStorage.getItem('pc-root') ?? 0));
  const [tab, setTab]     = React.useState(() => localStorage.getItem('pc-tab') || 'chords');
  const [ci, setCi]       = React.useState(0);                       // chord index
  const [inv, setInv]     = React.useState(0);                       // inversion index
  const [si, setSi]       = React.useState(0);                       // scale index
  const [owned, setOwned] = React.useState(() => localStorage.getItem('pc-level') || 'essentials'); // purchased level
  const [trialStart, setTrialStart] = React.useState(() => +(localStorage.getItem('pc-trial-start') || 0));
  const [now, setNow]     = React.useState(() => Date.now());        // drives trial countdown / expiry
  const [busy, setBusy]   = React.useState(false);                  // IAP call in flight
  const [theme, setTheme] = React.useState(() => localStorage.getItem('pc-theme') || 'dark');
  const [upg, setUpg]     = React.useState(null);                    // feature name or null
  const [sel, setSel]     = React.useState([]);                      // Find: selected MIDI notes
  const [tour, setTour]   = React.useState(null);                    // { key, steps } or null

  React.useEffect(()=>{ document.documentElement.dataset.theme = theme; localStorage.setItem('pc-theme',theme); },[theme]);
  React.useEffect(()=>{ localStorage.setItem('pc-root', root); },[root]);
  React.useEffect(()=>{ localStorage.setItem('pc-tab', tab); },[tab]);
  React.useEffect(()=>{ localStorage.setItem('pc-level', owned); },[owned]);
  React.useEffect(()=>{ if (trialStart) localStorage.setItem('pc-trial-start', trialStart); },[trialStart]);
  React.useEffect(()=>{ track('app.loaded'); },[]);
  // First run: show the overview tour once (marked done on close).
  React.useEffect(()=>{
    if (!localStorage.getItem('pc-onboarded')) setTour({ key:'overview', steps:tourStepsFor('overview') });
  },[]);
  // Sync real RevenueCat entitlements on launch (no-op on web).
  React.useEffect(()=>{ (async()=>{ await IAP.configure(); if (await IAP.isEntitled()) setOwned('pro'); })(); },[]);
  // Re-check trial expiry once a minute so Pro features lock the moment it lapses.
  React.useEffect(()=>{ const id = setInterval(()=>setNow(Date.now()), 60000); return ()=>clearInterval(id); },[]);

  const effLevel    = effectiveLevel(owned, trialStart, now);
  const isPro       = effLevel === 'pro';
  const msLeft      = trialMsLeft(trialStart, now);
  const onTrial     = owned !== 'pro' && msLeft > 0;
  const trialDays   = Math.ceil(msLeft / DAY_MS);
  const canTrial    = !trialStart;                                   // never started = eligible
  // Find, Keys & Ear are Pro; if a saved pc-tab loads without Pro, fall back to Chords.
  const PRO_TABS    = ['find','keys','ear'];
  const activeTab   = (PRO_TABS.includes(tab) && !isPro) ? 'chords' : tab;
  const ch    = CHORDS[ci];
  // Clamp inversion if the new chord has fewer tones (e.g. switching 7th→triad).
  const safeInv = Math.min(inv, ch.ivls.length - 1);
  const midis   = voicing(root, ch.ivls, safeInv);
  const bass    = midis[0];

  // Scale: render one ascending octave (root → octave), root colored as the "bass".
  const sc         = SCALES[si];
  const scaleMidis = [...sc.ivls.map(i => 60 + root + i), 60 + root + 12];

  // Keys: circle-of-fifths entry + diatonic chords for the selected root (as a major key).
  const keyInfo  = keyInfoFor(root);
  const diatonic = diatonicTriads(root);

  // Find: derive pitch classes + bass from the selected notes, then name matches.
  const selSorted = [...sel].sort((a,b) => a - b);
  const selPCs    = [...new Set(selSorted.map(m => m % 12))];
  const selBassPC = selSorted.length ? selSorted[0] % 12 : null;
  const matches   = selPCs.length >= 3 ? identifyChord(selPCs, selBassPC) : [];

  const pickType = (i) => {
    if (i >= FREE_TYPES && !isPro){ setUpg(CHORDS[i].name); track('paywall.shown',{feature:CHORDS[i].name}); return; }
    setCi(i);
    if (inv > CHORDS[i].ivls.length - 1) setInv(0);
  };
  const pickInv = (i) => {
    if (i > 0 && !isPro){ setUpg('Inversions'); track('paywall.shown',{feature:'Inversions'}); return; }
    setInv(i); track('inversion.picked',{inv:i,chord:ch.id});
  };
  const pickScale = (i) => {
    if (i >= FREE_SCALES && !isPro){ setUpg(SCALES[i].name + ' scale'); track('paywall.shown',{feature:SCALES[i].name}); return; }
    setSi(i); track('scale.picked',{scale:SCALES[i].id});
  };
  const startTour = (key) => { const steps = tourStepsFor(key); if (steps.length) setTour({ key, steps }); track('tour.opened',{key}); };
  const closeTour = () => {
    if (tour){
      if (tour.key === 'overview') localStorage.setItem('pc-onboarded','1');
      else localStorage.setItem('pc-tip-'+tour.key, '1');
      track('tour.closed',{key:tour.key});
    }
    setTour(null);
  };
  const pickTab = (t) => {
    if (PRO_TABS.includes(t) && !isPro){
      const feat = t === 'find' ? 'Find Chord' : t === 'keys' ? 'Circle of Fifths' : 'Ear Training';
      setUpg(feat); track('paywall.shown',{feature:feat}); return;
    }
    setTab(t); track('tab.switched',{tab:t});
    // Per-tab contextual tip, shown once, only after onboarding and when nothing else is open.
    if (localStorage.getItem('pc-onboarded') && !localStorage.getItem('pc-tip-'+t) && !tour && !upg){
      const steps = tourStepsFor(t);
      if (steps.length) setTour({ key:t, steps });
    }
  };
  const toggleKey = (midi) => setSel(s => s.includes(midi) ? s.filter(m => m !== midi) : [...s, midi]);
  const clearSel  = () => setSel([]);
  const doUnlock = async () => {
    track('purchase.started',{feature:upg});
    if (!IAP.native){ // web PWA has no store — grant locally so the browser build stays usable
      setOwned('pro'); setUpg(null); track('upgrade.completed',{feature:upg,mode:'web'}); return;
    }
    setBusy(true);
    const ok = await IAP.purchase();
    setBusy(false);
    if (ok){ setOwned('pro'); setUpg(null); track('upgrade.completed',{feature:upg}); }
    else track('purchase.failed',{feature:upg});
  };
  const doStartTrial = () => {
    const t = Date.now();
    setTrialStart(t); setNow(t); setUpg(null);
    track('trial.started',{feature:upg});
  };
  const doRestore = async () => {
    track('restore.started');
    if (!IAP.native){ track('restore.unavailable',{mode:'web'}); return; }
    setBusy(true);
    const ok = await IAP.restore();
    setBusy(false);
    if (ok){ setOwned('pro'); setUpg(null); track('restore.completed'); }
    else track('restore.empty');
  };

  const card = { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:14 };

  return e(React.Fragment, null,
    /* Header */
    e('header',{style:{display:'flex',alignItems:'center',gap:10,padding:'14px 0 10px'}},
      e('div',{style:{fontSize:'1.15rem',fontWeight:800,letterSpacing:'-.01em'}},'Piano Chords Lab'),
      e('div',{style:{flex:1}}),
      e('button',{ onClick:()=>setOwned(owned==='pro'?'essentials':'pro'),
        title:'Toggle owned Pro (dev)', style:{ padding:'5px 10px', borderRadius:20, cursor:'pointer',
          fontSize:'.72rem', fontWeight:700, border:'1px solid var(--border)',
          background: isPro?'var(--gold)':'transparent', color: isPro?'#07070f':'var(--hint)' } },
        owned==='pro' ? 'Pro ✦' : (onTrial ? 'Trial · ' + trialDays + 'd' : 'Essentials')),
      e('button',{ onClick:()=>startTour('overview'), title:'Take the tour',
        style:{ padding:'5px 9px', borderRadius:20, cursor:'pointer', fontSize:'.85rem', fontWeight:700,
          border:'1px solid var(--border)', background:'transparent', color:'var(--txt)' } }, '?'),
      e('button',{ onClick:()=>setTheme(theme==='dark'?'light':'dark'),
        style:{ padding:'5px 9px', borderRadius:20, cursor:'pointer', fontSize:'.85rem',
          border:'1px solid var(--border)', background:'transparent', color:'var(--txt)' } },
        theme==='dark' ? '☀' : '☾')
    ),

    /* Tabs */
    e('div',{style:{display:'flex',gap:6,marginBottom:14}},
      [['chords','Chords'],['scales','Scales'],['find','Find'],['keys','Keys'],['ear','Ear']].map(([t,label]) =>
        e('button',{ key:t, onClick:()=>pickTab(t),
          style:{ flex:1, padding:'9px 2px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'.78rem',
            border:'1px solid var(--border)',
            background: activeTab===t?'var(--accent)':'var(--bg2)',
            color: activeTab===t?'#07070f':'var(--txt)' } },
          label, (PRO_TABS.includes(t) && !isPro) ? ' 🔒' : ''))
    ),

    activeTab==='ear'
    ? e(EarTrainingView,{ key:'ear', level:'pro', onUpgrade:()=>{}, onPracticed:()=>track('ear.practiced') })
    : activeTab==='keys'
    ? e(React.Fragment,{key:'keys'},
        /* Circle of fifths */
        e('div',{style:card}, e(CircleOfFifths,{ root, onPick:setRoot })),
        /* Key summary + diatonic chords */
        e('div',{style:card},
          e('div',{style:{textAlign:'center',marginBottom:12}},
            e('div',{style:{fontSize:'1.5rem',fontWeight:800}}, keyInfo.maj + ' major'),
            e('div',{style:{fontSize:'.82rem',color:'var(--hint)',marginTop:3}},
              'Relative minor: ' + keyInfo.min + '  ·  Key signature: ' +
              (keyInfo.sig === '0' ? 'none' : keyInfo.sig))),
          e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'0 2px 8px',letterSpacing:'.04em'}},'CHORDS IN THIS KEY'),
          e('div',{style:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}},
            diatonic.map((dc,i)=>e('button',{ key:i, onClick:()=>{ playChord(dc.midis); track('diatonic.played',{key:root,roman:dc.roman}); },
              style:{ padding:'8px 2px', borderRadius:8, cursor:'pointer', border:'1px solid var(--border)',
                background:'var(--bg2)', color:'var(--txt)', display:'flex', flexDirection:'column', alignItems:'center', gap:2 } },
              e('span',{style:{fontSize:'.7rem',fontWeight:700,color:'var(--hint)'}}, dc.roman),
              e('span',{style:{fontSize:'.9rem',fontWeight:700}}, dc.name))))
        )
      )
    : activeTab==='find'
    ? e(React.Fragment,{key:'find'},
        /* Result card */
        e('div',{style:{...card, textAlign:'center'}},
          matches.length
            ? e(React.Fragment,null,
                e('div',{style:{fontSize:'2rem',fontWeight:800}}, matches[0].name),
                matches.length > 1
                  ? e('div',{style:{fontSize:'.82rem',color:'var(--hint)',marginTop:6}},
                      'also: ' + matches.slice(1,4).map(m=>m.name).join(' · '))
                  : null)
            : e('div',{style:{fontSize:'1.05rem',fontWeight:700,color:'var(--hint)',padding:'6px 0'}},
                selPCs.length === 0 ? 'Tap notes to identify a chord'
                : selPCs.length === 2 ? (TWO_NOTE[((selPCs[1]-selPCs[0])%12+12)%12] || 'interval') + ' (need 3+ notes)'
                : selPCs.length < 3 ? 'Add more notes…'
                : 'No exact match — try different notes'),
          selPCs.length
            ? e('div',{style:{fontSize:'.9rem',color:'var(--hint)',marginTop:8}},
                selSorted.map(m=>NOTES[m%12]).join(' · '))
            : null,
          e('div',{style:{display:'flex',gap:8,justifyContent:'center',marginTop:14}},
            e('button',{ onClick:()=>{ if(selSorted.length) playChord(selSorted); track('find.play',{n:selSorted.length}); },
              style:{ padding:'9px 18px', borderRadius:8, cursor:'pointer', fontWeight:700,
                background:'var(--accent)', border:'none', color:'#07070f' } }, '▶ Play'),
            e('button',{ onClick:clearSel,
              style:{ padding:'9px 18px', borderRadius:8, cursor:'pointer', fontWeight:700,
                background:'transparent', border:'1px solid var(--border)', color:'var(--txt)' } }, 'Clear'))
        ),
        /* Selectable keyboard */
        e('div',{style:card}, e(Keyboard,{ voicing:selSorted, bassMidi:selSorted[0], onKey:toggleKey })),
        e('div',{style:{fontSize:'.75rem',color:'var(--hint)',textAlign:'center',paddingBottom:30}},
          'Tap keys to build a chord — the lowest note (red) is read as the bass for slash chords.')
      )
    : activeTab==='chords'
    ? e(React.Fragment,{key:'chords'},
        /* Chord name + notes */
        e('div',{style:{...card, textAlign:'center'}},
          e('div',{style:{fontSize:'2rem',fontWeight:800}},
            chordName(root, ch),
            safeInv > 0 ? e('span',{style:{fontSize:'1rem',fontWeight:600,color:'var(--hint)'}}, '/' + NOTES[bass%12]) : null),
          e('div',{style:{fontSize:'.9rem',color:'var(--hint)',marginTop:4}}, midis.map(m=>NOTES[m%12]).join(' · ')),
          safeInv > 0
            ? e('div',{style:{fontSize:'.72rem',color:'var(--hint)',marginTop:2}}, INV_LABELS[safeInv] + ' inversion')
            : null,
          e('button',{ onClick:()=>{ playChord(midis); track('chord.played',{chord:ch.id,root,inv:safeInv}); },
            style:{ marginTop:12, padding:'9px 22px', borderRadius:8, cursor:'pointer', fontWeight:700,
              background:'var(--accent)', border:'none', color:'#07070f' } }, '▶ Play chord')
        ),
        /* Keyboard */
        e('div',{style:card}, e(Keyboard,{ voicing:midis, bassMidi:bass })),
        /* Inversion picker (Pro) */
        e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'4px 2px 8px',letterSpacing:'.04em'}},'INVERSION'),
        e('div',{style:{display:'grid',gridTemplateColumns:`repeat(${ch.ivls.length},1fr)`,gap:6,marginBottom:16}},
          ch.ivls.map((_,i)=>{
            const locked = i>0 && !isPro;
            return e('button',{ key:'inv'+i, onClick:()=>pickInv(i),
              style:{ padding:'10px 0', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'.85rem',
                border:'1px solid var(--border)',
                background: i===safeInv?'var(--accent)':'var(--bg2)',
                color: i===safeInv?'#07070f':(locked?'var(--hint)':'var(--txt)') } },
              INV_LABELS[i], locked ? ' 🔒' : '');
          })
        )
      )
    : e(React.Fragment,{key:'scales'},
        /* Scale name + notes */
        e('div',{style:{...card, textAlign:'center'}},
          e('div',{style:{fontSize:'2rem',fontWeight:800}}, NOTES[root] + ' ' + sc.name),
          e('div',{style:{fontSize:'.9rem',color:'var(--hint)',marginTop:4}}, sc.ivls.map(i=>NOTES[(root+i)%12]).join(' · ')),
          e('div',{style:{fontSize:'.72rem',color:'var(--hint)',marginTop:2}}, sc.ivls.length + ' notes'),
          e('button',{ onClick:()=>{ playSeq(scaleMidis); track('scale.played',{scale:sc.id,root}); },
            style:{ marginTop:12, padding:'9px 22px', borderRadius:8, cursor:'pointer', fontWeight:700,
              background:'var(--accent)', border:'none', color:'#07070f' } }, '▶ Play scale')
        ),
        /* Keyboard */
        e('div',{style:card}, e(Keyboard,{ voicing:scaleMidis, bassMidi:60+root }))
      ),

    /* Root picker (shared by Chords + Scales only; other tabs pick the root their own way) */
    (activeTab==='chords' || activeTab==='scales')
    ? e(React.Fragment,{key:'rootpick'},
        e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'4px 2px 8px',letterSpacing:'.04em'}},'ROOT'),
        e('div',{style:{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,marginBottom:16}},
          NOTES.map((n,i)=>e('button',{ key:n, onClick:()=>setRoot(i),
            style:{ padding:'10px 0', borderRadius:8, cursor:'pointer', fontWeight:700,
              border:'1px solid var(--border)',
              background: i===root?'var(--accent)':'var(--bg2)',
              color: i===root?'#07070f':'var(--txt)' } }, n))
        )
      )
    : null,

    activeTab==='chords'
    ? e(React.Fragment,{key:'ctypes'},
        /* Chord type picker */
        e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'4px 2px 8px',letterSpacing:'.04em'}},'CHORD TYPE'),
        e('div',{style:{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,paddingBottom:30}},
          CHORDS.map((c,i)=>{
            const locked = i>=FREE_TYPES && !isPro;
            return e('button',{ key:c.id, onClick:()=>pickType(i),
              style:{ padding:'11px 12px', borderRadius:8, cursor:'pointer', textAlign:'left',
                fontWeight:600, fontSize:'.9rem', border:'1px solid var(--border)',
                background: i===ci?'var(--bg3)':'var(--bg2)',
                color: locked?'var(--hint)':'var(--txt)',
                display:'flex', justifyContent:'space-between', alignItems:'center' } },
              e('span',null, c.name, ' ', e('span',{style:{color:'var(--hint)',fontSize:'.8rem'}}, c.sym)),
              locked ? e('span',{style:{fontSize:'.8rem'}},'🔒') : null);
          })
        )
      )
    : activeTab==='scales'
    ? e(React.Fragment,{key:'stypes'},
        /* Scale picker */
        e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'4px 2px 8px',letterSpacing:'.04em'}},'SCALE'),
        e('div',{style:{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,paddingBottom:30}},
          SCALES.map((s,i)=>{
            const locked = i>=FREE_SCALES && !isPro;
            return e('button',{ key:s.id, onClick:()=>pickScale(i),
              style:{ padding:'11px 12px', borderRadius:8, cursor:'pointer', textAlign:'left',
                fontWeight:600, fontSize:'.9rem', border:'1px solid var(--border)',
                background: i===si?'var(--bg3)':'var(--bg2)',
                color: locked?'var(--hint)':'var(--txt)',
                display:'flex', justifyContent:'space-between', alignItems:'center' } },
              e('span',null, s.name),
              locked ? e('span',{style:{fontSize:'.8rem'}},'🔒') : null);
          })
        )
      )
    : null,

    upg ? e(UpgradeSheet,{ feature:upg, canTrial, busy,
            onClose:()=>setUpg(null), onUnlock:doUnlock, onStartTrial:doStartTrial, onRestore:doRestore }) : null,

    tour ? e(Tour,{ steps:tour.steps, onClose:closeTour }) : null
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
