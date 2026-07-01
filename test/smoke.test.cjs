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
async function withApp(fn) {
  const page = await openApp(browser, url);
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
