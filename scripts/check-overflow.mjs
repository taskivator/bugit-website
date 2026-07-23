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
const ROUTES = ['#/', '#/docs', '#/docs/getting-started', '#/docs/user-guide', '#/docs/license', '#/docs/privacy', '#/docs/refund', '#/docs/faq', '#/support'];
const LANGS = ['en', 'ja', 'fr', 'de', 'es', 'pt-br', 'it', 'ko', 'zh', 'ru'];
const STATES = ['loading', 'out', 'in'];
// Common phone widths (portrait) + two landscape phone sizes.
const VIEWPORTS = [
  [320, 720], [360, 780], [375, 812], [390, 844], [412, 915], [414, 896], [430, 932],
  [768, 1024], [1024, 768], [844, 390], [932, 430],
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
  console.error('check-overflow: no Chrome found; set CHROME_BIN to run required assertions.');
  process.exit(1);
}
console.log(`check-overflow: using ${CHROME}`);

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
console.log(`check-overflow: fixture server listening on ${PORT}`);

const udir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugit-overflow-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--force-device-scale-factor=1', `--remote-debugging-port=${DBG}`, `--user-data-dir=${udir}`, 'about:blank',
], { stdio: 'ignore' });
console.log(`check-overflow: Chrome launched with PID ${chrome.pid}`);

// 5 min: the full sweep is ~2970 real-browser assertions across 11 viewports. The
// GitHub runner is markedly slower than a dev box; the old 2 min deadline cut the
// passing sweep off mid-way. Raised ONLY to fit the proven normal execution time —
// per-viewport progress + a per-500-assertion heartbeat below keep a genuine hang
// distinguishable from a long valid run.
const watchdog = setTimeout(() => {
  console.error('check-overflow: timed out before completing assertions.');
  cleanup(1);
}, 300_000);

function cleanup(code) {
  clearTimeout(watchdog);
  try { chrome.kill(); } catch {}
  try { server.close(); } catch {}
  try { fs.rmSync(udir, { recursive: true, force: true }); } catch {}
  process.exitCode = code;
  if (code !== 0) throw new Error('check-overflow aborted before completing its assertions.');
}

async function getJSON(url) { const r = await fetch(url); return r.json(); }
let version;
for (let i = 0; i < 80; i++) { try { version = await getJSON(`http://127.0.0.1:${DBG}/json/version`); break; } catch { await new Promise((r) => setTimeout(r, 150)); } }
if (!version) { console.error('check-overflow: Chrome DevTools endpoint never came up.'); cleanup(1); }
console.log('check-overflow: Chrome DevTools endpoint ready');

const targets = await getJSON(`http://127.0.0.1:${DBG}/json/list`);
const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
if (!pageTarget) { console.error('check-overflow: Chrome exposed no debuggable page target.'); cleanup(1); }

const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  const timeout = setTimeout(() => rej(new Error('CDP page WebSocket did not open within 5 seconds.')), 5_000);
  ws.onopen = () => { clearTimeout(timeout); res(); };
  ws.onerror = (error) => { clearTimeout(timeout); rej(error); };
});
console.log('check-overflow: attached to page target');
let msgId = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
function send(method, params = {}) { const id = ++msgId; return new Promise((res, rej) => { pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); }); }

await send('Page.enable');
await send('Runtime.enable');
async function evaluate(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; }
async function setViewport(w, h) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true, screenWidth: w, screenHeight: h }); }

const applyState = (s) => s === 'in'
  ? `renderAccount('Alexander Kowalski'); document.getElementById('authSlot').dataset.state='in';`
  : s === 'out' ? `renderSignedOut();` : `document.getElementById('authSlot').dataset.state='loading';`;

const MEASURE = (w) => `(function(){
  var vw=${w}, de=document.documentElement, b=document.body;
  var ph=de.style.overflowX, pb=b.style.overflowX; de.style.overflowX='visible'; b.style.overflowX='visible'; void de.offsetWidth;
  // THE ASSERTION is trueSw below — documentElement.scrollWidth measured with the
  // overflow-x clamps neutralized. It has no exclusions of any kind and is the
  // only thing that decides pass/fail.
  var trueSw=de.scrollWidth, worst=null, measured=0, all=document.getElementsByTagName('*');
  for(var i=0;i<all.length;i++){ var el=all[i];
    // Everything below only picks the human-readable CULPRIT shown when a check
    // fails. #ambient's contents are skipped here because they are structurally
    // clipped (see the contain:paint assertion) and would otherwise always win
    // the "worst" contest and point the reader at a red herring.
    //
    // This used to be an exclusion in the assertion path, and that is exactly how
    // this gate reported 2430 clean assertions while .particle elements painted
    // up to 91px past the right edge on a phone: the only broken elements were
    // the ones the test refused to look at.
    var cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden')continue;
    var r=el.getBoundingClientRect(); if(r.width===0&&r.height===0)continue;
    measured++;
    if(el.id==='ambient'||el.closest('#ambient'))continue;
    // 1px covers subpixel rounding.
    if(r.right>vw+1&&(!worst||r.right>worst.right)){
      // DIAGNOSTICS ONLY (does not affect the trueSw assertion): record the culprit's
      // computed sizing + its parent's grid/width so a Linux-font overflow is fully
      // characterised in the CI log (element/container width, grid template, min-width,
      // white-space, wrapping).
      var p=el.parentElement, pcs=p?getComputedStyle(p):null, pr=p?p.getBoundingClientRect():null;
      worst={t:el.tagName.toLowerCase(),c:(''+(el.className||'')).slice(0,40),id:el.id||'',right:Math.round(r.right),
        w:Math.round(r.width),mw:cs.minWidth,ws:cs.whiteSpace,ow:cs.overflowWrap||cs.wordWrap,wb:cs.wordBreak,disp:cs.display,
        par:p?{t:p.tagName.toLowerCase(),c:(''+(p.className||'')).slice(0,30),w:Math.round(pr.width),disp:pcs.display,gtc:pcs.gridTemplateColumns,mw:pcs.minWidth}:null};
    }
  }
  de.style.overflowX=ph; b.style.overflowX=pb;
  // Structural guard for the actual fix: #ambient must clip its own painting.
  // overflow:hidden alone does NOT clip position:fixed descendants (their
  // containing block is the viewport, outside the clipper), so without
  // contain:paint the particle field paints outside the viewport again.
  var amb=document.getElementById('ambient');
  var contain=amb?(getComputedStyle(amb).contain||''):'NO-AMBIENT-ELEMENT';
  return JSON.stringify({over:Math.round(trueSw-vw), worst:worst, measured:measured, contain:contain});
})()`;

const expectedChecks = VIEWPORTS.length * ROUTES.length * LANGS.length * STATES.length;
let checks = 0, measuredElements = 0, fails = 0;
const failures = [];
for (const [w, h] of VIEWPORTS) {
  await setViewport(w, h);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?w=${w}` });
  await new Promise((r) => setTimeout(r, 1200));
  let ready = await evaluate(`typeof applyLang==='function'&&typeof renderAccount==='function'`).catch(() => false);
  if (!ready) {
    await new Promise((r) => setTimeout(r, 1500));
    ready = await evaluate(`typeof applyLang==='function'&&typeof renderAccount==='function'`).catch(() => false);
  }
  if (!ready) { console.error(`check-overflow: page scripts did not initialize at ${w}x${h}.`); cleanup(1); }
  for (const route of ROUTES) {
    for (const lang of LANGS) {
      for (const state of STATES) {
        await evaluate(`location.hash='${route}'; applyLang('${lang}'); ${applyState(state)} void 0;`);
        // Expand the docs mobile nav disclosure too, so it can't hide an overflow.
        await evaluate(`var d=document.querySelector('.docs-sidebar'); if(d)d.classList.add('open'); void 0;`);
        await new Promise((r) => setTimeout(r, 15));
        const m = JSON.parse(await evaluate(MEASURE(w)));
        checks++;
        // Heartbeat: a genuine hang stops these; a long valid run keeps emitting them.
        if (checks % 500 === 0) console.log(`check-overflow: heartbeat ${checks}/${expectedChecks} assertions...`);
        measuredElements += m.measured;
        if (m.measured <= 0) { console.error(`check-overflow: measurement inspected no visible elements at ${w}x${h} ${route} ${lang} ${state}.`); cleanup(1); }
        if (m.over > 1) {
          fails++;
          const wo = m.worst;
          const wrec = wo ? `<${wo.t} class="${wo.c}" id="${wo.id}"> right=${wo.right}` : '(none outside #ambient — check the decorative layer)';
          const diag = wo ? ` [w=${wo.w} disp=${wo.disp} min-width=${wo.mw} white-space=${wo.ws} overflow-wrap=${wo.ow} word-break=${wo.wb}` +
            (wo.par ? ` | parent <${wo.par.t} class="${wo.par.c}"> w=${wo.par.w} disp=${wo.par.disp} grid-cols=${wo.par.gtc} min-width=${wo.par.mw}` : '') + ']' : '';
          failures.push(`  ${w}x${h} route=${route} lang=${lang} state=${state}  over=+${m.over}px  culprit=${wrec}${diag}`);
        }
        if (!/paint/.test(m.contain)) {
          fails++;
          failures.push(`  ${w}x${h} route=${route} lang=${lang} state=${state}  #ambient lost contain:paint (got "${m.contain}") — position:fixed particles will paint outside the viewport again`);
        }
      }
    }
  }
  console.log(`check-overflow: completed ${w}x${h} (${checks}/${expectedChecks} assertions)`);
}

console.log(`check-overflow: ${checks} assertions and ${measuredElements} visible-element measurements across ${VIEWPORTS.length} widths × ${ROUTES.length} routes × ${LANGS.length} langs × ${STATES.length} states.`);
if (checks !== expectedChecks || measuredElements <= 0) {
  console.error(`FAIL: expected ${expectedChecks} nonempty assertions, completed ${checks} across ${measuredElements} visible-element measurements.`);
  cleanup(1);
}
if (fails > 0) {
  console.error(`\nFAIL: ${fails} viewport/route/language combos scroll horizontally:`);
  failures.slice(0, 40).forEach((f) => console.error(f));
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more.`);
  cleanup(1);
}
console.log('PASS: no horizontal overflow on any mobile route/language/state.');
cleanup(0);
