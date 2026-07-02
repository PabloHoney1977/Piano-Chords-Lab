/* Shared test helpers for the Playwright smoke suite.
 *
 * The app loads React from the unpkg CDN at runtime. Tests run offline, so we
 * mock those two requests with the React UMD builds resolved from node_modules
 * (react / react-dom are devDependencies). We also block the service worker so
 * a cached shell can't mask a regression.
 *
 * Chromium: uses Playwright's resolved browser, or PW_CHROMIUM_PATH / the
 * pre-installed /opt/pw-browsers/chromium if present (CI images vary). */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Playwright may be a devDependency (CI) or globally installed (some sandboxes).
function loadPlaywright() {
  try { return require('playwright'); }
  catch (_) { return require('/opt/node22/lib/node_modules/playwright'); }
}

// Resolve a React UMD build from node_modules, falling back to a vendored copy
// in test/ (gitignored) so the suite can run before `npm ci` in a pinch.
function umd(pkg, file, vendored) {
  try { return require.resolve(`${pkg}/umd/${file}`); }
  catch (_) {
    const local = path.join(__dirname, vendored);
    if (fs.existsSync(local)) return local;
    throw new Error(
      `Cannot find ${pkg}/umd/${file}. Run \`npm ci\` (installs react/react-dom) ` +
      `or drop a copy at test/${vendored}.`);
  }
}
const REACT_UMD = () => umd('react', 'react.production.min.js', 'react.production.min.js');
const REACTDOM_UMD = () => umd('react-dom', 'react-dom.production.min.js', 'react-dom.production.min.js');

function chromiumExecutable() {
  const p = process.env.PW_CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  return fs.existsSync(p) ? p : undefined; // undefined → Playwright resolves its own
}

const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml' };

function startServer() {
  const server = http.createServer((req, res) => {
    let p = req.url.split('?')[0];
    if (p === '/') p = '/index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404; return res.end('not found');
    }
    res.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ url: `http://localhost:${port}/index.html`,
                close: () => new Promise((r) => server.close(r)) });
    });
  });
}

async function launch() {
  const { chromium } = loadPlaywright();
  return chromium.launch({ executablePath: chromiumExecutable() });
}

// Fresh context (clean localStorage) per call; mocks React; opens the app.
// By default the onboarding overview + per-tab tips are pre-dismissed so they
// don't overlay unrelated tests. Pass { onboarded:false } / { tips:false } to
// exercise the tour flows.
async function openApp(browser, url, opts = {}) {
  const { onboarded = true, tips = true } = opts;
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const seed = [];
  if (onboarded) seed.push("localStorage.setItem('pc-onboarded','1');");
  if (tips) seed.push("['chords','scales','find','keys','ear'].forEach(t=>localStorage.setItem('pc-tip-'+t,'1'));");
  if (seed.length) await ctx.addInitScript(`try{${seed.join('')}}catch(e){}`);
  const page = await ctx.newPage();
  await page.route('**/unpkg.com/react@**/react.production.min.js',
    (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(REACT_UMD()) }));
  await page.route('**/unpkg.com/react-dom@**/react-dom.production.min.js',
    (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(REACTDOM_UMD()) }));
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.__errors = errors;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('header', { timeout: 8000 });
  return page;
}

module.exports = { startServer, launch, openApp };
