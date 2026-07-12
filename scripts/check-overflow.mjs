// Responsive horizontal-overflow regression test.
//
// Asserts that the document never scrolls sideways on mobile: for every important
// route × supported language × auth state × mobile width, the true content width
// must not exceed the device viewport (documentElement.scrollWidth <= device width).
//
// It drives the system Chrome over the DevTools Protocol using only Node built-ins
// (global fetch + WebSocket, Node 18+/21+) — no npm dependencies, matching this
// repo's dependency-free static-site philosophy. If no Chrome is found it SKIPS
// (exit 0) so it never breaks CI on a runner without a browser.
//
// Why not just read documentElement.scrollWidth as-is: the site sets
// body{overflow-x:hidden}, which CLAMPS scrollWidth and hides the symptom. This test
// navigates fresh per width (so width=device-width drives layout the way a real
// phone does) and temporarily neutralizes overflow-x while measuring, revealing the
// real overflow. Run: `node scripts/check-overflow.mjs` (or `npm run test:overflow`).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3211;
const DBG = 9411;

// Routes (hash-based SPA), the 10 supported languages, and the three auth-slot states.
const ROUTES = ['#/', '#/docs', '#/docs/license', '#/docs/privacy', '#/support'];
const LANGS = ['en', 'ja', 'fr', 'de', 'es', 'pt-br', 'it', 'ko', 'zh', 'ru'];
const STATES = ['loading', 'out', 'in'];
// Common phone widths (portrait) + two landscape phone sizes.
const VIEWPORTS = [
  [320, 720], [360, 780], [375, 812], [390, 844], [414, 896], [430, 932],
  [768, 1024], [844, 390], [932, 430],
];

function findChrome() {
  const envs = [process.env.CHROME_BIN, process.env.CHROME_PATH, process.env.GOOGLE_CHROME_BIN].filter(Boolean);
  const win = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  const mac = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const nix = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/snap/bin/chromium'];
  for (const c of [...envs, ...win, ...mac, ...nix]) { try { if (c && fs.existsSync(c)) return c; } catch {} }
  return null;
}

const CHROME = findChrome();
if (!CHROME) {
  console.log('check-overflow: no Chrome found (set CHROME_BIN to enable) — SKIPPING.');
  process.exit(0);
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const clean = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, clean === '/' ? 'index.html' : clean);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const udir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugit-overflow-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--force-device-scale-factor=1', `--remote-debugging-port=${DBG}`, `--user-data-dir=${udir}`, 'about:blank',
], { stdio: 'ignore' });

function cleanup(code) {
  try { chrome.kill(); } catch {}
  try { server.close(); } catch {}
  try { fs.rmSync(udir, { recursive: true, force: true }); } catch {}
  process.exit(code);
}

async function getJSON(url) { const r = await fetch(url); return r.json(); }
let version;
for (let i = 0; i < 80; i++) { try { version = await getJSON(`http://127.0.0.1:${DBG}/json/version`); break; } catch { await new Promise((r) => setTimeout(r, 150)); } }
if (!version) { console.error('check-overflow: Chrome DevTools endpoint never came up.'); cleanup(1); }

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let msgId = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
function send(method, params = {}, sessionId) { const id = ++msgId; return new Promise((res, rej) => { pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); }

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, S);
await send('Runtime.enable', {}, S);
async function evaluate(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, S); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; }
async function setViewport(w, h) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 0, mobile: true, screenWidth: w, screenHeight: h }, S); }

const applyState = (s) => s === 'in'
  ? `renderAccount('Alexander Kowalski'); document.getElementById('authSlot').dataset.state='in';`
  : s === 'out' ? `renderSignedOut();` : `document.getElementById('authSlot').dataset.state='loading';`;

const MEASURE = (w) => `(function(){
  var vw=${w}, de=document.documentElement, b=document.body;
  var ph=de.style.overflowX, pb=b.style.overflowX; de.style.overflowX='visible'; b.style.overflowX='visible'; void de.offsetWidth;
  var trueSw=de.scrollWidth, worst=null, all=document.getElementsByTagName('*');
  for(var i=0;i<all.length;i++){ var el=all[i];
    if(el.id==='ambient'||el.closest('#ambient')||(el.classList&&el.classList.contains('particle')))continue;
    var cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden')continue;
    var r=el.getBoundingClientRect(); if(r.width===0&&r.height===0)continue;
    if(r.right>vw+1&&(!worst||r.right>worst.right)) worst={t:el.tagName.toLowerCase(),c:(''+(el.className||'')).slice(0,40),id:el.id||'',right:Math.round(r.right)};
  }
  de.style.overflowX=ph; b.style.overflowX=pb;
  return JSON.stringify({over:Math.round(trueSw-vw), worst:worst});
})()`;

let checks = 0, fails = 0;
const failures = [];
for (const [w, h] of VIEWPORTS) {
  await setViewport(w, h);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?w=${w}` }, S);
  await new Promise((r) => setTimeout(r, 1200));
  const ready = await evaluate(`typeof applyLang==='function'&&typeof renderAccount==='function'`).catch(() => false);
  if (!ready) { await new Promise((r) => setTimeout(r, 1500)); }
  for (const route of ROUTES) {
    for (const lang of LANGS) {
      for (const state of STATES) {
        await evaluate(`location.hash='${route}'; applyLang('${lang}'); ${applyState(state)} void 0;`);
        // Expand the docs mobile nav disclosure too, so it can't hide an overflow.
        await evaluate(`var d=document.querySelector('.docs-sidebar'); if(d)d.classList.add('open'); void 0;`);
        await new Promise((r) => setTimeout(r, 15));
        const m = JSON.parse(await evaluate(MEASURE(w)));
        checks++;
        if (m.over > 1) {
          fails++;
          const wrec = m.worst ? `<${m.worst.t} class="${m.worst.c}" id="${m.worst.id}"> right=${m.worst.right}` : '(none)';
          failures.push(`  ${w}x${h} route=${route} lang=${lang} state=${state}  over=+${m.over}px  culprit=${wrec}`);
        }
      }
    }
  }
}

console.log(`check-overflow: ${checks} assertions across ${VIEWPORTS.length} widths × ${ROUTES.length} routes × ${LANGS.length} langs × ${STATES.length} states.`);
if (fails > 0) {
  console.error(`\nFAIL: ${fails} viewport/route/language combos scroll horizontally:`);
  failures.slice(0, 40).forEach((f) => console.error(f));
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more.`);
  cleanup(1);
}
console.log('PASS: no horizontal overflow on any mobile route/language/state.');
cleanup(0);
