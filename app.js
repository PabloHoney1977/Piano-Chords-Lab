/* Piano Chords Lab — single-file React PWA (no build step).
 * Mirrors the Jazz Guitar Lab architecture: e() = React.createElement, all
 * components/data/audio/styles inline, freemium gating via localStorage level.
 * This is a STARTER scaffold — a working "Build a Chord" core to grow from.
 * See CLAUDE.md for what to port from Jazz Guitar Lab (audio samples, IAP, tours). */
const e = React.createElement;

/* ── Single source of truth for price (don't scatter literals like the jazz app did) ── */
const PRICE = '$9.99'; // TBD — see CLAUDE.md pricing note. Change here only.

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

/* ── Audio (simple oscillator piano — port real samples from Jazz Guitar Lab later) ── */
let _actx;
const ctx = () => (_actx = _actx || new (window.AudioContext || window.webkitAudioContext)());
function pianoNote(c, midi, when, dur, vol){
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
  o1.type = 'triangle'; o2.type = 'sine';
  o1.frequency.value = f; o2.frequency.value = f * 2;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o1.connect(g); o2.connect(g); g.connect(c.destination);
  o1.start(when); o2.start(when); o1.stop(when + dur); o2.stop(when + dur);
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

/* ── Interactive keyboard (3 octaves from C4) ──
 * Renders the literal voicing (actual sounding notes), so inversions are visible:
 * the bass note is colored --root, the upper chord tones --tone. */
function Keyboard({ voicing, bassMidi }){
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
    whites.map((k,i) => e('g', { key:'w'+i, onClick:()=>playMidi(k.midi), style:{cursor:'pointer'} },
      e('rect', { x:k.x+1, y:0, width:W-2, height:H, rx:4,
        fill:fill(k.midi,false), stroke:'var(--border)', strokeWidth:1 }),
      on.has(k.midi)
        ? e('text', { x:k.x+W/2, y:H-12, textAnchor:'middle', fontSize:12, fontWeight:700,
            fill:'var(--dot-lbl)' }, NOTES[k.midi%12])
        : null
    )),
    blacks.map((k,i) => e('rect', { key:'b'+i, x:k.x, y:0, width:BW, height:BH, rx:3,
      onClick:()=>playMidi(k.midi),
      fill:fill(k.midi,true), stroke:'var(--border)', strokeWidth:1, style:{cursor:'pointer'} }))
  );
}

/* ── Upgrade sheet (stub — wire RevenueCat later, see CLAUDE.md) ── */
function UpgradeSheet({ feature, onClose, onUnlock }){
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
      e('button',{ onClick:onUnlock, style:{ width:'100%', padding:15, borderRadius:10, cursor:'pointer',
          fontWeight:700, fontSize:'1rem', background:'var(--gold)', border:'none', color:'#07070f' } },
        'Unlock Pro — ' + PRICE),
      e('button',{ onClick:onClose, style:{ width:'100%', padding:12, marginTop:10, borderRadius:10,
          cursor:'pointer', fontWeight:600, background:'transparent', border:'none', color:'var(--hint)' } },
        'Maybe later')
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
  const [level, setLevel] = React.useState(() => localStorage.getItem('pc-level') || 'essentials');
  const [theme, setTheme] = React.useState(() => localStorage.getItem('pc-theme') || 'dark');
  const [upg, setUpg]     = React.useState(null);                    // feature name or null

  React.useEffect(()=>{ document.documentElement.dataset.theme = theme; localStorage.setItem('pc-theme',theme); },[theme]);
  React.useEffect(()=>{ localStorage.setItem('pc-root', root); },[root]);
  React.useEffect(()=>{ localStorage.setItem('pc-tab', tab); },[tab]);
  React.useEffect(()=>{ localStorage.setItem('pc-level', level); },[level]);
  React.useEffect(()=>{ track('app.loaded'); },[]);

  const isPro = level === 'pro';
  const ch    = CHORDS[ci];
  // Clamp inversion if the new chord has fewer tones (e.g. switching 7th→triad).
  const safeInv = Math.min(inv, ch.ivls.length - 1);
  const midis   = voicing(root, ch.ivls, safeInv);
  const bass    = midis[0];

  // Scale: render one ascending octave (root → octave), root colored as the "bass".
  const sc         = SCALES[si];
  const scaleMidis = [...sc.ivls.map(i => 60 + root + i), 60 + root + 12];

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
  const doUnlock = () => { setLevel('pro'); setUpg(null); track('upgrade.completed',{feature:upg}); };

  const card = { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:14 };

  return e(React.Fragment, null,
    /* Header */
    e('header',{style:{display:'flex',alignItems:'center',gap:10,padding:'14px 0 10px'}},
      e('div',{style:{fontSize:'1.15rem',fontWeight:800,letterSpacing:'-.01em'}},'Piano Chords Lab'),
      e('div',{style:{flex:1}}),
      e('button',{ onClick:()=>setLevel(isPro?'essentials':'pro'),
        title:'Toggle Pro (dev)', style:{ padding:'5px 10px', borderRadius:20, cursor:'pointer',
          fontSize:'.72rem', fontWeight:700, border:'1px solid var(--border)',
          background: isPro?'var(--gold)':'transparent', color: isPro?'#07070f':'var(--hint)' } },
        isPro ? 'Pro ✦' : 'Essentials'),
      e('button',{ onClick:()=>setTheme(theme==='dark'?'light':'dark'),
        style:{ padding:'5px 9px', borderRadius:20, cursor:'pointer', fontSize:'.85rem',
          border:'1px solid var(--border)', background:'transparent', color:'var(--txt)' } },
        theme==='dark' ? '☀' : '☾')
    ),

    /* Tabs */
    e('div',{style:{display:'flex',gap:6,marginBottom:14}},
      ['chords','scales'].map(t => e('button',{ key:t, onClick:()=>{ setTab(t); track('tab.switched',{tab:t}); },
        style:{ flex:1, padding:'9px 0', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'.9rem',
          border:'1px solid var(--border)',
          background: tab===t?'var(--accent)':'var(--bg2)',
          color: tab===t?'#07070f':'var(--txt)' } }, t==='chords' ? 'Chords' : 'Scales'))
    ),

    tab==='chords'
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

    /* Root picker (shared) */
    e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'4px 2px 8px',letterSpacing:'.04em'}},'ROOT'),
    e('div',{style:{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,marginBottom:16}},
      NOTES.map((n,i)=>e('button',{ key:n, onClick:()=>setRoot(i),
        style:{ padding:'10px 0', borderRadius:8, cursor:'pointer', fontWeight:700,
          border:'1px solid var(--border)',
          background: i===root?'var(--accent)':'var(--bg2)',
          color: i===root?'#07070f':'var(--txt)' } }, n))
    ),

    tab==='chords'
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
    : e(React.Fragment,{key:'stypes'},
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
      ),

    upg ? e(UpgradeSheet,{ feature:upg, onClose:()=>setUpg(null), onUnlock:doUnlock }) : null
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
