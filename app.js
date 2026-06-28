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

// id, display name, suffix label, semitone intervals from root.
// First 4 are free (major / natural minor / both pentatonics — the everyday
// reference scales); modes + blues + harmonic/melodic minor are Pro.
const SCALES = [
  {id:'major',     name:'Major',           sym:'Ionian',      ivls:[0,2,4,5,7,9,11]},
  {id:'minor',     name:'Natural Minor',   sym:'Aeolian',     ivls:[0,2,3,5,7,8,10]},
  {id:'majpent',   name:'Major Pentatonic',sym:'5-note',      ivls:[0,2,4,7,9]},
  {id:'minpent',   name:'Minor Pentatonic',sym:'5-note',      ivls:[0,3,5,7,10]},
  // ── Pro below ──
  {id:'dorian',    name:'Dorian',          sym:'mode',        ivls:[0,2,3,5,7,9,10]},
  {id:'phrygian',  name:'Phrygian',        sym:'mode',        ivls:[0,1,3,5,7,8,10]},
  {id:'lydian',    name:'Lydian',          sym:'mode',        ivls:[0,2,4,6,7,9,11]},
  {id:'mixo',      name:'Mixolydian',      sym:'mode',        ivls:[0,2,4,5,7,9,10]},
  {id:'locrian',   name:'Locrian',         sym:'mode',        ivls:[0,1,3,5,6,8,10]},
  {id:'harmmin',   name:'Harmonic Minor',  sym:'',            ivls:[0,2,3,5,7,8,11]},
  {id:'melmin',    name:'Melodic Minor',   sym:'ascending',   ivls:[0,2,3,5,7,9,11]},
  {id:'blues',     name:'Blues',           sym:'minor blues', ivls:[0,3,5,6,7,10]},
];
const FREE_SCALES = 4;

const pcsFrom    = (root, ivls) => ivls.map(i => (root + i) % 12);
const notesFrom  = (root, ivls) => ivls.map(i => NOTES[(root + i) % 12]);
const chordPCs   = pcsFrom;
const chordNotes = notesFrom;
const chordName  = (root, ch)   => NOTES[root] + ch.sym;
const scaleName  = (root, sc)   => NOTES[root] + ' ' + sc.name;

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
function playScale(midis){
  const c = ctx(); if (c.state==='suspended') c.resume();
  const step = 0.18;
  midis.forEach((m,i) => pianoNote(c, m, c.currentTime + i*step, 0.5, 0.2));
}

const track = (ev, props) => { try { window.posthog && window.posthog.capture(ev, props); } catch(_){} };

/* ── Interactive keyboard (2 octaves from C4) ── */
function Keyboard({ rootPC, tonePCs }){
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
  const fill = (pc, isBlack) => {
    if (pc === rootPC) return 'var(--root)';
    if (tonePCs.includes(pc)) return 'var(--tone)';
    return isBlack ? 'var(--black-key)' : 'var(--white-key)';
  };
  return e('svg', { viewBox:`0 0 ${totalW} ${H}`, width:'100%',
      style:{ display:'block', maxWidth:totalW, margin:'4px auto 0',
              transform:'translateZ(0)', WebkitTransform:'translateZ(0)' } },
    whites.map((k,i) => e('g', { key:'w'+i, onClick:()=>playMidi(k.midi), style:{cursor:'pointer'} },
      e('rect', { x:k.x+1, y:0, width:W-2, height:H, rx:4,
        fill:fill(k.pc,false), stroke:'var(--border)', strokeWidth:1 }),
      (k.pc===rootPC || tonePCs.includes(k.pc))
        ? e('text', { x:k.x+W/2, y:H-12, textAnchor:'middle', fontSize:13, fontWeight:700,
            fill:'var(--dot-lbl)' }, NOTES[k.pc])
        : null
    )),
    blacks.map((k,i) => e('rect', { key:'b'+i, x:k.x, y:0, width:BW, height:BH, rx:3,
      onClick:()=>playMidi(k.midi),
      fill:fill(k.pc,true), stroke:'var(--border)', strokeWidth:1, style:{cursor:'pointer'} }))
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
  const [si, setSi]       = React.useState(0);                       // scale index
  const [tab, setTab]     = React.useState(() => localStorage.getItem('pc-tab') || 'chords');
  const [level, setLevel] = React.useState(() => localStorage.getItem('pc-level') || 'essentials');
  const [theme, setTheme] = React.useState(() => localStorage.getItem('pc-theme') || 'dark');
  const [upg, setUpg]     = React.useState(null);                    // feature name or null

  React.useEffect(()=>{ document.documentElement.dataset.theme = theme; localStorage.setItem('pc-theme',theme); },[theme]);
  React.useEffect(()=>{ localStorage.setItem('pc-root', root); },[root]);
  React.useEffect(()=>{ localStorage.setItem('pc-level', level); },[level]);
  React.useEffect(()=>{ localStorage.setItem('pc-tab', tab); },[tab]);
  React.useEffect(()=>{ track('app.loaded'); },[]);

  const isPro = level === 'pro';
  const onScales = tab === 'scales';

  const ch    = CHORDS[ci];
  const pcs   = chordPCs(root, ch.ivls);
  const midis = ch.ivls.map(i => 60 + root + i);

  const sc       = SCALES[si];
  const scPcs    = pcsFrom(root, sc.ivls);
  const scMidis  = sc.ivls.map(i => 60 + root + i).concat([60 + root + 12]); // run up to the octave

  // What the keyboard + root picker reflect depends on the active tab.
  const tonePCs = onScales ? scPcs : pcs;

  const pickType = (i) => {
    if (i >= FREE_TYPES && !isPro){ setUpg(CHORDS[i].name); track('paywall.shown',{feature:CHORDS[i].name}); return; }
    setCi(i);
  };
  const pickScale = (i) => {
    if (i >= FREE_SCALES && !isPro){ setUpg(SCALES[i].name + ' scale'); track('paywall.shown',{feature:SCALES[i].name+' scale'}); return; }
    setSi(i);
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

    /* Tab nav — Chords / Scales (both reuse the keyboard highlight engine) */
    e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:14}},
      [['chords','Chords'],['scales','Scales']].map(([id,label])=>
        e('button',{ key:id, onClick:()=>{ setTab(id); track('tab.changed',{tab:id}); },
          style:{ padding:'10px 0', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:'.92rem',
            border:'1px solid var(--border)',
            background: tab===id?'var(--accent)':'var(--bg2)',
            color: tab===id?'#07070f':'var(--txt)' } }, label))
    ),

    /* Name + notes card (chord or scale) */
    onScales
      ? e('div',{style:{...card, textAlign:'center'}},
          e('div',{style:{fontSize:'2rem',fontWeight:800}}, scaleName(root, sc)),
          e('div',{style:{fontSize:'.9rem',color:'var(--hint)',marginTop:4}}, notesFrom(root,sc.ivls).join(' · ')),
          e('button',{ onClick:()=>{ playScale(scMidis); track('scale.played',{scale:sc.id,root}); },
            style:{ marginTop:12, padding:'9px 22px', borderRadius:8, cursor:'pointer', fontWeight:700,
              background:'var(--accent)', border:'none', color:'#07070f' } }, '▶ Play scale')
        )
      : e('div',{style:{...card, textAlign:'center'}},
          e('div',{style:{fontSize:'2rem',fontWeight:800}}, chordName(root, ch)),
          e('div',{style:{fontSize:'.9rem',color:'var(--hint)',marginTop:4}}, chordNotes(root,ch).join(' · ')),
          e('button',{ onClick:()=>{ playChord(midis); track('chord.played',{chord:ch.id,root}); },
            style:{ marginTop:12, padding:'9px 22px', borderRadius:8, cursor:'pointer', fontWeight:700,
              background:'var(--accent)', border:'none', color:'#07070f' } }, '▶ Play chord')
        ),

    /* Keyboard (shared highlight engine) */
    e('div',{style:card}, e(Keyboard,{ rootPC:root, tonePCs:tonePCs })),

    /* Root picker */
    e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'4px 2px 8px',letterSpacing:'.04em'}},'ROOT'),
    e('div',{style:{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,marginBottom:16}},
      NOTES.map((n,i)=>e('button',{ key:n, onClick:()=>setRoot(i),
        style:{ padding:'10px 0', borderRadius:8, cursor:'pointer', fontWeight:700,
          border:'1px solid var(--border)',
          background: i===root?'var(--accent)':'var(--bg2)',
          color: i===root?'#07070f':'var(--txt)' } }, n))
    ),

    /* Type picker (chord types or scale types) */
    e('div',{style:{fontSize:'.72rem',fontWeight:700,color:'var(--hint)',margin:'4px 2px 8px',letterSpacing:'.04em'}},
      onScales ? 'SCALE TYPE' : 'CHORD TYPE'),
    onScales
      ? e('div',{style:{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,paddingBottom:30}},
          SCALES.map((s,i)=>{
            const locked = i>=FREE_SCALES && !isPro;
            return e('button',{ key:s.id, onClick:()=>pickScale(i),
              style:{ padding:'11px 12px', borderRadius:8, cursor:'pointer', textAlign:'left',
                fontWeight:600, fontSize:'.9rem', border:'1px solid var(--border)',
                background: i===si?'var(--bg3)':'var(--bg2)',
                color: locked?'var(--hint)':'var(--txt)',
                display:'flex', justifyContent:'space-between', alignItems:'center' } },
              e('span',null, s.name, ' ', s.sym ? e('span',{style:{color:'var(--hint)',fontSize:'.8rem'}}, s.sym) : null),
              locked ? e('span',{style:{fontSize:'.8rem'}},'🔒') : null);
          })
        )
      : e('div',{style:{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,paddingBottom:30}},
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
