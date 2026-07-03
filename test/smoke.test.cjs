/* End-to-end smoke tests for Piano Chords Lab.
 * Loads the real index.html in headless Chromium and exercises the core flows:
 * rendering, the Chords/Scales tabs, freemium gating, and the IAP 7-day trial.
 * Run with `npm test`. */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const { startServer, launch, openApp } = require('./helpers.cjs');

const DAY = 86400000;
let server, browser, url;

before(async () => { server = await startServer(); url = server.url; browser = await launch(); });
after(async () => { if (browser) await browser.close(); if (server) await server.close(); });

// Convenience: open a clean app, run fn, always tear the context down.
async function withApp(fn, opts) {
  const page = await openApp(browser, url, opts);
  try { await fn(page); assert.deepStrictEqual(page.__errors, [], 'no console/page errors'); }
  finally { await page.context().close(); }
}

const headerLabel = (page) => page.textContent('header button').then((t) => t.trim());

test('boots on the Chords tab with the free chord builder', async () => {
  await withApp(async (page) => {
    assert.strictEqual(await page.textContent('header div'), 'Piano Chords Lab');
    assert.ok(await page.$('text=▶ Play chord'), 'play-chord button present');
    // 3-octave keyboard = 21 white + 15 black = 36 keys.
    assert.strictEqual((await page.$$('svg rect')).length, 36);
    assert.strictEqual(await headerLabel(page), 'Essentials');
  });
});

test('locked chord type opens the paywall; free ones do not', async () => {
  await withApp(async (page) => {
    await page.click('text=Major 7');                 // 5th type → Pro
    assert.ok(await page.$('text=Unlock Pro'), 'paywall shown for locked chord');
    await page.click('text=Maybe later');
    await page.waitForTimeout(100);
    assert.ok(!(await page.$('text=Unlock Pro')), 'paywall dismissed');
  });
});

test('Scales tab: Major free, Dorian Pro-gated', async () => {
  await withApp(async (page) => {
    await page.click('text=Scales');
    assert.ok(await page.$('text=▶ Play scale'), 'play-scale button present');
    await page.click('text=Dorian');
    assert.ok(await page.$('text=Start 7-day free trial'), 'paywall offers trial');
    assert.ok(await page.$('text=Restore'), 'paywall offers restore');
  });
});

test('starting the trial unlocks Pro and shows a countdown', async () => {
  await withApp(async (page) => {
    await page.click('text=Scales');
    await page.click('text=Dorian');
    await page.click('text=Start 7-day free trial');
    await page.waitForTimeout(150);
    assert.strictEqual(await headerLabel(page), 'Trial · 7d');
    assert.ok(await page.evaluate(() => localStorage.getItem('pc-trial-start')), 'trial timestamp stored');
    // During the trial a locked scale just selects — no paywall.
    await page.click('text=Phrygian');
    await page.waitForTimeout(100);
    assert.ok(!(await page.$('text=Unlock Pro')), 'no paywall during active trial');
  });
});

test('an expired trial re-locks Pro and is not offered again', async () => {
  await withApp(async (page) => {
    await page.evaluate((ago) => localStorage.setItem('pc-trial-start', String(Date.now() - ago)), 8 * DAY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('header');
    assert.strictEqual(await headerLabel(page), 'Essentials');
    await page.click('text=Scales');
    await page.click('text=Dorian');
    assert.ok(await page.$('text=Unlock Pro'), 'paywall returns after expiry');
    assert.ok(!(await page.$('text=Start 7-day free trial')), 'trial is one-time, not re-offered');
  });
});

test('Find tab is Pro-gated for free users', async () => {
  await withApp(async (page) => {
    await page.click('text=Find');
    assert.ok(await page.$('text=Unlock Pro'), 'paywall shown when free user taps Find');
    assert.ok(!(await page.$('text=Tap notes to identify a chord')), 'Find view not rendered');
  });
});

test('Find: selecting C-E-G identifies a C major chord', async () => {
  await withApp(async (page) => {
    await page.click('header button:has-text("Essentials")'); // dev toggle → Pro
    await page.click('text=Find');
    await page.waitForSelector('text=Tap notes to identify a chord');
    const whites = await page.$$('svg g');                    // white-key groups, C4=0 D=1 E=2 F=3 G=4
    await whites[0].click(); await whites[2].click(); await whites[4].click();
    await page.waitForTimeout(150);
    // Primary result names C (root position, bass = C).
    const result = await page.textContent('div[style*="2rem"]');
    assert.match(result, /^C\b/, `expected a C chord, got "${result}"`);
    // Clear resets to the prompt.
    await page.click('text=Clear');
    await page.waitForTimeout(100);
    assert.ok(await page.$('text=Tap notes to identify a chord'), 'cleared back to prompt');
  });
});

test('first run shows the overview tour and marks onboarded', async () => {
  await withApp(async (page) => {
    assert.ok(await page.$('text=Welcome to Piano Chords Lab'), 'overview tour shown on first run');
    await page.click('text=Skip');
    await page.waitForTimeout(100);
    assert.ok(!(await page.$('text=Welcome to Piano Chords Lab')), 'tour dismissed');
    assert.strictEqual(await page.evaluate(() => localStorage.getItem('pc-onboarded')), '1');
  }, { onboarded: false, tips: false });
});

test('? button reopens the overview tour', async () => {
  await withApp(async (page) => {
    assert.ok(!(await page.$('text=Welcome to Piano Chords Lab')), 'no tour when already onboarded');
    await page.click('header button:has-text("?")');
    assert.ok(await page.$('text=Welcome to Piano Chords Lab'), 'tour reopened from ? button');
  });
});

test('per-tab contextual tip shows once on first visit', async () => {
  await withApp(async (page) => {
    await page.click('text=Scales');
    assert.ok(await page.$('text=Explore scales'), 'scales tip shown on first visit');
    await page.click('text=Done');
    await page.waitForTimeout(100);
    assert.strictEqual(await page.evaluate(() => localStorage.getItem('pc-tip-scales')), '1');
  }, { onboarded: true, tips: false });
});

test('Keys tab is Pro-gated for free users', async () => {
  await withApp(async (page) => {
    await page.click('text=Keys');
    assert.ok(await page.$('text=Unlock Pro'), 'paywall shown when free user taps Keys');
    assert.ok(!(await page.$('text=CHORDS IN THIS KEY')), 'Keys view not rendered');
  });
});

test('Keys: circle of fifths + diatonic chords for the selected key', async () => {
  await withApp(async (page) => {
    await page.click('header button:has-text("Essentials")'); // dev toggle → Pro
    await page.click('text=Keys');
    await page.waitForSelector('text=CHORDS IN THIS KEY');
    assert.ok(await page.$('text=C major'), 'defaults to C major');
    assert.ok((await page.$$('svg path')).length >= 24, 'circle-of-fifths wheel rendered (24 wedges)');
    // Diatonic triads of C major: Roman numerals present, vii° is B diminished.
    let labels = await page.$$eval('button span', ss => ss.map(s => s.textContent));
    for (const r of ['I','IV','V','vii°']) assert.ok(labels.includes(r), `has ${r}`);
    assert.ok(labels.includes('B°'), 'vii° of C is B diminished');
    // Key follows the shared root: pick D → summary + diatonic update (vii° becomes C♯°).
    await page.click('button:has-text("Chords")');
    await page.getByText('D', { exact: true }).click();
    await page.click('text=Keys');
    await page.waitForSelector('text=D major');
    labels = await page.$$eval('button span', ss => ss.map(s => s.textContent));
    assert.ok(labels.includes('C♯°'), 'vii° of D is C♯ diminished');
  });
});

test('Ear tab is Pro-gated for free users', async () => {
  await withApp(async (page) => {
    await page.click('text=Ear');
    assert.ok(await page.$('text=Unlock Pro'), 'paywall shown when free user taps Ear');
    assert.ok(!(await page.$('text=Start Training')), 'ear intro not rendered');
  });
});

test('Ear training: intro → answer → reveal (Pro)', async () => {
  await withApp(async (page) => {
    await page.click('header button:has-text("Essentials")'); // dev toggle → Pro
    await page.click('text=Ear');
    await page.click('text=Start Training');                   // dismiss intro gate
    // All four Pro modes are available.
    for (const m of ['Intervals','Triads','7ths','Progressions'])
      assert.ok(await page.$(`button:has-text("${m}")`), `mode tab ${m}`);
    await page.waitForSelector('text=Song reference hints');   // intervals default
    // Answer the interval question — tier 1 pool always includes Perfect 5th.
    await page.click('button:has-text("Perfect 5th")');
    await page.waitForTimeout(150);
    const reveal = await page.textContent('body');
    assert.ok(/Correct!|That was/.test(reveal), 'answer reveals feedback');
    // Switching mode updates the prompt.
    await page.click('button:has-text("Triads")');
    await page.waitForSelector('text=Three-note chord');
  });
});

test('streak: practicing increments once per day', async () => {
  await withApp(async (page) => {
    assert.ok(!(await page.textContent('header')).includes('🔥'), 'no streak chip before practice');
    await page.click('text=▶ Play chord');
    await page.waitForTimeout(120);
    assert.ok((await page.textContent('header')).includes('🔥 1'), 'streak shows 1 after first practice');
    assert.strictEqual(await page.evaluate(() => localStorage.getItem('pc-streak')), '1');
    await page.click('text=▶ Play chord');                    // same day again
    await page.waitForTimeout(120);
    assert.ok((await page.textContent('header')).includes('🔥 1'), 'same-day practice does not double-count');
  });
});

test('streak: hitting a milestone shows the celebration', async () => {
  await withApp(async (page) => {
    // Seed yesterday's practice with a 2-day streak, then reload.
    await page.evaluate(() => {
      const d = new Date(Date.now() - 86400000);
      const y = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      localStorage.setItem('pc-streak','2'); localStorage.setItem('pc-streak-best','2'); localStorage.setItem('pc-streak-last', y);
    });
    await page.reload({ waitUntil:'load' });
    await page.waitForSelector('header');
    assert.ok((await page.textContent('header')).includes('🔥 2'), 'carried streak shows 2');
    await page.click('text=▶ Play chord');                    // → day 3, a milestone
    await page.waitForSelector('text=3-day streak!');
    assert.ok((await page.textContent('header')).includes('🔥 3'), 'streak advanced to 3');
    await page.click('text=Nice');
  });
});

test('audio: pianoNote renders an audible, decaying, non-clipping tone', async () => {
  await withApp(async (page) => {
    // app.js is a classic script, so its synth functions are globals — render the
    // real pianoNote through an OfflineAudioContext and measure the output.
    const r = await page.evaluate(async () => {
      const R = 44100, off = new OfflineAudioContext(1, Math.floor(R*1.3), R);
      [60,64,67].forEach(m => pianoNote(off, m, 0.01, 1.1, 0.16)); // C major triad
      const d = (await off.startRendering()).getChannelData(0);
      const seg = (a,b) => { let s=0,n=0; for (let i=Math.floor(a*R);i<Math.floor(b*R);i++){s+=d[i]*d[i];n++;} return Math.sqrt(s/n); };
      let peak=0; for (let i=0;i<d.length;i++) if (Math.abs(d[i])>peak) peak=Math.abs(d[i]);
      return { early: seg(0.02,0.12), late: seg(0.9,1.0), peak };
    });
    assert.ok(r.early > 0.005, `produces audible output (early RMS ${r.early})`);
    assert.ok(r.late < r.early, 'note decays like a piano');
    assert.ok(r.peak <= 1.0, `no clipping (peak ${r.peak})`);
  });
});

test('web Unlock grants Pro locally and persists', async () => {
  await withApp(async (page) => {
    await page.click('text=Scales');
    await page.click('text=Dorian');
    await page.click('button:has-text("Unlock Pro —")'); // price-agnostic (PRICE constant)
    await page.waitForTimeout(150);
    assert.strictEqual(await headerLabel(page), 'Pro ✦');
    assert.strictEqual(await page.evaluate(() => localStorage.getItem('pc-level')), 'pro');
  });
});
