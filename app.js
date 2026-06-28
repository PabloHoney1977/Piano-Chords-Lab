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

const chordPCs   = (root, ivls) => ivls.map(i => (root + i) % 12);
const chordNotes = (root, ivls) => ivls.map(i => NOTES[(root + i) % 12]);
const chordName  = (root, ch)   => NOTES[root] + ch.sym;
const INV_LABELS = ['Root', '1st', '2nd', '3rd', '4th'];

/* Invert a chord: move the lowest `inv` notes up an octave, re-sort low→high.
 * Returns the actual sounding midis and the bass (lowest) note's pitch class/midi. */
function invertVoicing(rootMidi, ivls, inv){
  const k = inv % ivls.length;
  const midis = ivls.map((iv, idx) => rootMidi + iv + (idx < k ? 12 : 0)).sort((a, b) => a - b);
  return { midis, bassMidi: midis[0], bassPC: midis[0] % 12 };
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

const track = (ev, props) => { try { window.posthog && window.posthog.capture(ev, props); } catch(_){} };

/* ── Interactive keyboard (2 octaves from C4) ── */
function Keyboard({ rootPC, tonePCs, bassMidi }){
  const OCT = 2, W = 46, H = 168, BW = 30, BH = 104;
  const whites = [];
  for (let o = 0; o < OCT; o++) for (let wi = 0; wi < 7; wi++){
    const semi = WHITE_SEMIS[wi];
    const midi = 60 + o*12 + semi;
    whites.push({ x:(o*7+wi)*W, midi, pc:(semi)%12 });
  }
  const blacks = [];
  for (let o = 0; o < OCT; o++) for (const ba of BLACK_AFTER){
    const semi = BLACK_SEMI[ba];
    const midi = 60 + o*12 + semi;
    blacks.push({ x:(o*7+ba+1)*W - BW/2, midi, pc:semi%12 });
  }
  const totalW = OCT*7*W;
  // The specific lowest sounding key (the bass of the current inversion) wins over pitch-class tint.
  const fill = (k, isBlack) => {
    if (k.midi === bassMidi) return 'var(--bass)';
    if (k.pc === rootPC) return 'var(--root)';
    if (tonePCs.includes(k.pc)) return 'var(--tone)';
    return isBlack ? 'var(--black-key)' : 'var(--white-key)';
  };
  const lit = (k) => k.midi === bassMidi || k.pc === rootPC || tonePCs.includes(k.pc);
  return e('svg', { viewBox:`0 0 ${totalW} ${H}`, width:'100%',
      style:{ display:'block', maxWidth:totalW, margin:'4px auto 0',
              transform:'translateZ(0)', WebkitTransform:'translateZ(0)' } },
    whites.map((k,i) => e('g', { key:'w'+i, onClick:()=>playMidi(k.midi), style:{cursor:'pointer'} },
      e('rect', { x:k.x+1, y:0, width:W-2, height:H, rx:4,
        fill:fill(k,false), stroke:'var(--border)', strokeWidth:1 }),
      lit(k)
        ? e('text', { x:k.x+W/2, y:H-12, textAnchor:'middle', fontSize:13, fontWeight:700,
            fill:'var(--dot-lbl)' }, NOTES[k.pc])
        : null
    )),
    blacks.map((k,i) => e('rect', { key:'b'+i, x:k.x, y:0, width:BW, height:BH, rx:3,
      onClick:()=>playMidi(k.midi),
      fill:fill(k,true), stroke:'var(--border)', strokeWidth:1, style:{cursor:'pointer'} }))
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
  const [ci, setCi]       = React.useState(0);                       // chord index
  const [inv, setInv]     = React.useState(0);                       // inversion (0 = root position)
  const [level, setLevel] = React.useState(() => localStorage.getItem('pc-level') || 'essentials');
  const [theme, setTheme] = React.useState(() => localStorage.getItem('pc-theme') || 'dark');
  const [upg, setUpg]     = React.useState(null);                    // feature name or null

  React.useEffect(()=>{ document.documentElement.dataset.theme = theme; localStorage.setItem('pc-theme',theme); },[theme]);
  React.useEffect(()=>{ localStorage.setItem('pc-root', root); },[root]);
  React.useEffect(()=>{ localStorage.setItem('pc-level', level); },[level]);
  React.useEffect(()=>{ track('app.loaded'); },[]);

  const isPro  = level === 'pro';
  const ch     = CHORDS[ci];
  const pcs    = chordPCs(root, ch.ivls);
  const maxInv = ch.ivls.length - 1;                 // triad→2, 7th→3, 9th→4
  const invSafe = Math.min(inv, maxInv);             // clamp when switching to a smaller chord
  const voicing = invertVoicing(60 + root, ch.ivls, invSafe);
  const midis   = voicing.midis;
  const displayName = invSafe > 0 ? chordName(root, ch) + ' / ' + NOTES[voicing.bassPC] : chordName(root, ch);

  const pickType = (i) => {
    if (i >= FREE_TYPES && !isPro){ setUpg(CHORDS[i].name); track('paywall.shown',{feature:CHORDS[i].name}); return; }
    setCi(i);
    setInv(v => Math.min(v, CHORDS[i].ivls.length - 1));
  };
  const pickInv = (i) => {
    if (i > 0 && !isPro){ setUpg('Inversions'); track('paywall.shown',{feature:'Inversions'}); return; }
    setInv(i); track('inversion.picked',{inv:i,chord:ch.id});
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

    /* Chord name + notes (voicing order, low→high) */
    e('div',{style:{...card, textAlign:'center'}},
      e('div',{style:{fontSize:'2rem',fontWeight:800}}, displayName),
      e('div',{style:{fontSize:'.9rem',color:'var(--hint)',marginTop:4}},
        midis.map(m=>NOTES[m%12]).join(' · ') + (invSafe>0 ? '  ·  '+INV_LABELS[invSafe]+' inversion' : '')),
      e('button',{ onClick:()=>{ playChord(midis); track('chord.played',{chord:ch.id,root,inv:invSafe}); },
        style:{ marginTop:12, padding:'9px 22px', borderRadius:8, cursor:'pointer', fontWeight:700,
          background:'var(--accent)', border:'none', color:'#07070f' } }, '▶ Play chord')
    ),

    /* Keyboard */
    e('div',{style:card}, e(Keyboard,{ rootPC:root, tonePCs:pcs, bassMidi: invSafe>0 ? voicing.bassMidi : null })),

    /* Inversion picker (Pro beyond root position) */
    e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'4px 2px 8px',letterSpacing:'.04em'}},'INVERSION'),
    e('div',{style:{display:'flex',gap:6,marginBottom:16}},
      Array.from({length:maxInv+1}).map((_,i)=>{
        const locked = i>0 && !isPro;
        return e('button',{ key:i, onClick:()=>pickInv(i),
          style:{ flex:1, padding:'9px 0', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'.85rem',
            border:'1px solid var(--border)',
            background: i===invSafe ? 'var(--bass)' : 'var(--bg2)',
            color: i===invSafe ? '#07070f' : (locked ? 'var(--hint)' : 'var(--txt)') } },
          INV_LABELS[i], locked ? ' 🔒' : '');
      })
    ),

    /* Root picker */
    e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'4px 2px 8px',letterSpacing:'.04em'}},'ROOT'),
    e('div',{style:{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,marginBottom:16}},
      NOTES.map((n,i)=>e('button',{ key:n, onClick:()=>setRoot(i),
        style:{ padding:'10px 0', borderRadius:8, cursor:'pointer', fontWeight:700,
          border:'1px solid var(--border)',
          background: i===root?'var(--accent)':'var(--bg2)',
          color: i===root?'#07070f':'var(--txt)' } }, n))
    ),

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
    ),

    upg ? e(UpgradeSheet,{ feature:upg, onClose:()=>setUpg(null), onUnlock:doUnlock }) : null
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
