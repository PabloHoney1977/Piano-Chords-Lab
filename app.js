/* Piano Chords Lab — single-file React PWA (no build step).
 * Mirrors the Jazz Guitar Lab architecture: e() = React.createElement, all
 * components/data/audio/styles inline, freemium gating via localStorage level.
 * This is a STARTER scaffold — a working "Build a Chord" core to grow from.
 * See CLAUDE.md for what to port from Jazz Guitar Lab (audio samples, IAP, tours). */
const e = React.createElement;

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
  // Find is Pro; if a saved pc-tab='find' loads without Pro, fall back to Chords.
  const activeTab   = (tab === 'find' && !isPro) ? 'chords' : tab;
  const ch    = CHORDS[ci];
  // Clamp inversion if the new chord has fewer tones (e.g. switching 7th→triad).
  const safeInv = Math.min(inv, ch.ivls.length - 1);
  const midis   = voicing(root, ch.ivls, safeInv);
  const bass    = midis[0];

  // Scale: render one ascending octave (root → octave), root colored as the "bass".
  const sc         = SCALES[si];
  const scaleMidis = [...sc.ivls.map(i => 60 + root + i), 60 + root + 12];

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
    if (t === 'find' && !isPro){ setUpg('Find Chord'); track('paywall.shown',{feature:'Find Chord'}); return; }
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
      [['chords','Chords'],['scales','Scales'],['find','Find']].map(([t,label]) =>
        e('button',{ key:t, onClick:()=>pickTab(t),
          style:{ flex:1, padding:'9px 0', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'.9rem',
            border:'1px solid var(--border)',
            background: activeTab===t?'var(--accent)':'var(--bg2)',
            color: activeTab===t?'#07070f':'var(--txt)' } },
          label, (t==='find' && !isPro) ? ' 🔒' : ''))
    ),

    activeTab==='find'
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

    /* Root picker (shared by Chords + Scales; not used in Find) */
    activeTab!=='find'
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
