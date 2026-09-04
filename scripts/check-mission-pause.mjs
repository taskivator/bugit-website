// Mission Control must never be able to latch paused.
//
// WHY THIS EXISTS. Mission Control pauses while a visitor is inspecting the report, and
// both pause sources were EDGE-triggered pairs: hover paused on `mouseenter` and resumed
// on `mouseleave`, focus paused on `focusin` and resumed on `focusout`. A finger produces
// the first half of each pair and never the second — the synthesized `mouseenter` gets no
// `mouseleave` until you tap something else, and a tap leaves focus sitting on whatever
// was tapped. So on a phone EVERY tap inside the panel froze the simulation at whatever
// half-built state it was in, for as long as the page stayed open.
//
// Reported against the disclosure button ("expands the report half way through report
// generation and gets stuck"), but reproduced at 390x844 on the report TITLE too, which
// changes no focus at all — the hover half alone was enough. A visitor tapping "Show full
// report" mid-generation got a report frozen at "Loading severity · 42%" that never
// finished, which is the opposite of what the tap asked for.
//
// The four assertions below are the actual contract, and two of them are the FEATURE
// rather than the bug: deleting the pause outright would "fix" the freeze and quietly
// remove the ability to read the report on a desktop, so hover-pause and keyboard-pause
// are asserted to still work. Progress is read from the real driven value —
// `.report-progress i`'s scaleX, which initMission writes every frame.
//
// Like the other browser guards here it drives system Chrome over the DevTools Protocol
// with Node built-ins only (no npm dependency), and it runs against the SOURCE tree the
// same way check-overflow.mjs does. Run: `node scripts/check-mission-pause.mjs`.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { waitForDevTools } from './lib/chrome-devtools.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3216;
const DBG = 9416;

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
  console.error('check-mission-pause: no Chrome found; set CHROME_BIN to run required assertions.');
  process.exit(1);
}
console.log(`check-mission-pause: using ${CHROME}`);

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

const udir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugit-mission-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--force-device-scale-factor=1', `--remote-debugging-port=${DBG}`, `--user-data-dir=${udir}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });  // stderr PIPED: it is the only evidence
                                              // when Chrome dies before its DevTools port opens

const watchdog = setTimeout(() => {
  console.error('check-mission-pause: timed out before completing assertions.');
  cleanup(1);
}, 180_000);

function cleanup(code) {
  clearTimeout(watchdog);
  try { chrome.kill(); } catch {}
  try { server.close(); } catch {}
  try { fs.rmSync(udir, { recursive: true, force: true }); } catch {}
  process.exitCode = code;
  if (code !== 0) throw new Error('check-mission-pause aborted before completing its assertions.');
}

const getJSON = async (u) => (await fetch(u)).json();
// cleanup() is what kills Chrome, closes the fixture server and removes the profile dir,
// and it is reached by CALLING it -- an uncaught throw here would leave all three behind.
let version;
try {
  version = await waitForDevTools(chrome, DBG, { name: 'check-mission-pause' });
} catch (err) {
  console.error(err.message);
  cleanup(1);
}

const targets = await getJSON(`http://127.0.0.1:${DBG}/json/list`);
const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
if (!pageTarget) { console.error('check-mission-pause: Chrome exposed no debuggable page target.'); cleanup(1); }

const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('CDP page WebSocket did not open within 5 seconds.')), 5_000);
  ws.onopen = () => { clearTimeout(to); res(); };
  ws.onerror = (e) => { clearTimeout(to); rej(e); };
});
let msgId = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
const send = (method, params = {}) => { const id = ++msgId; return new Promise((res, rej) => { pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); }); };

await send('Page.enable');
await send('Runtime.enable');
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Progress is read from the value initMission actually drives every frame.
const PROGRESS = `(function(){var b=document.querySelector('.report-progress i');
  if(!b)return -1; var m=/scaleX\\(([0-9.]+)\\)/.exec(b.style.transform||''); return m?parseFloat(m[1]):-1;})()`;
const STATE = `JSON.stringify({
  p:${PROGRESS},
  pct:(document.querySelector('.report-pct')||{}).textContent||'',
  collapsed:document.querySelector('.report-panel').classList.contains('is-collapsed'),
  focus:(document.activeElement&&document.activeElement.id)||'',
  hover:(function(){try{return document.querySelector('.mission').matches(':hover')}catch(e){return false}})()
})`;
const state = async () => JSON.parse(await evaluate(STATE));

async function load(w, h, touch) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: touch, screenWidth: w, screenHeight: h });
  // maxTouchPoints must be >= 1 even when disabling, or CDP rejects the call.
  await send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: touch ? 5 : 1 });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?mission-pause-check` });
  // Arming is the precondition for everything below. It used to be waited for and then
  // ignored: on a loaded machine the 12s ran out, this returned anyway, and the failure
  // surfaced 40s later as "the simulation is not running at all" pointing at the report
  // rather than at the page that never finished starting. Same defect the file is about,
  // in the harness: an edge that was watched for and then not acted on.
  let armed = false;
  for (let i = 0; i < 200; i++) {
    try { if (await evaluate(`!!(document.querySelector('.mission')&&document.querySelector('.mission').classList.contains('mc-armed'))`)) { armed = true; break; } } catch {}
    await sleep(150);
  }
  if (!armed) fail(`Mission Control never armed within 30s at ${w}x${h}; nothing below this point was measured.`);
  await settleOnScreen(`${w}x${h}`);
}

/**
 * Get the panel on screen AND KEEP IT THERE until the loop is observably running.
 *
 * ONE SCROLL IS NOT ENOUGH, and this is the actual cause of the flake the 2026-08-19 audit
 * recorded as "fails on a cold runner". It is not coldness. The loop runs only while an
 * IntersectionObserver reports the panel on screen, and that observer is registered by
 * initMission() on DOMContentLoaded — whereas `mc-armed`, which load() waits for, is set by an
 * inline script that runs much earlier. So on a slow machine the sequence is:
 *
 *   1. the inline script sets mc-armed;
 *   2. load() sees it and scrolls the panel into view;
 *   3. the page is STILL laying out — fonts, images, the consent banner — and the panel drifts
 *      back off screen;
 *   4. initMission finally runs and registers the observer, whose first callback reports NOT
 *      intersecting, so `visible` stays false;
 *   5. nothing ever scrolls again, so the loop never starts.
 *
 * The evidence is in the failing CI run itself: the assertion right after the failure reads
 * `(0 -> 0 -> 0.4152)` — the loop began the moment the TAP ran, and the only thing a tap does
 * before its touch events is scroll the target into view a second time. Raising the timeout,
 * which is what I tried first, cannot help: 80 seconds of a loop that is switched off is still
 * a loop that is switched off.
 *
 * So: scroll, watch, and scroll AGAIN if it has not started. Each retry is a fresh chance for
 * the observer to see the panel, which is precisely what the tap was doing by accident.
 */
async function settleOnScreen(where) {
  const scroll = () =>
    evaluate(`document.querySelector('.mission').scrollIntoView({block:'center',behavior:'instant'}); 1`);

  for (let attempt = 1; attempt <= 8; attempt++) {
    await scroll();
    await sleep(500);
    let prev = (await state()).p;
    // ~3s of watching per attempt. A running loop moves the bar every frame, so movement shows
    // up almost immediately; the only quiet period is the end-of-cycle hold at 100%, which is
    // itself proof the loop is running.
    for (let i = 0; i < 10; i++) {
      await sleep(300);
      const s = await state();
      if (s.p !== prev || s.p >= 0.99) {
        if (attempt > 1) console.log(`note  ${where}: the loop needed ${attempt} scrolls to start`);
        return;
      }
      prev = s.p;
    }
  }
  fail(
    `${where}: Mission Control never started after 8 scrolls into view. The panel is armed and ` +
      `the browser is rendering, so the IntersectionObserver is not reporting it on screen — ` +
      `check that the panel is not taller than the viewport at this size (threshold 0.2).`,
  );
}

// Is this renderer producing animation frames at all?
//
// initMission drives the whole simulation from requestAnimationFrame. A headless Chrome that
// has not begun compositing does not run rAF callbacks, so `tc` never advances, the bar stays
// at scaleX(0), and every reading below is 0 — which is indistinguishable from the outside from
// the product having frozen. That is the precondition, and it has to be established before any
// window is opened on the thing it gates.
const RAF_FRAMES = (n, ms) => `new Promise(function(r){
  var seen = 0, done = false;
  function finish(){ if(!done){ done = true; r(seen); } }
  function tick(){ seen++; if(seen >= ${n}) return finish(); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  setTimeout(finish, ${ms});
})`;

/**
 * Wait until the browser is observably rendering. Returns the number of seconds it took, so a
 * slow cold start is visible in the log instead of being absorbed silently.
 */
async function awaitRendering(label) {
  const NEEDED = 5;
  for (let i = 0; i < 45; i++) {
    if ((await evaluate(RAF_FRAMES(NEEDED, 1000))) >= NEEDED) return i;
    await sleep(200);
  }
  fail(`${label}: this browser produced no animation frames in ~55s, so Mission Control could ` +
       `not have run. That is a cold/headless renderer, NOT a product defect — do not read it ` +
       `as Mission Control being frozen.`);
  return -1;
}

// Wait until the report is genuinely MID-generation.
//
// TWO THINGS WERE WRONG HERE, and the fix for both is to strengthen rather than to loosen.
//
// 1. It opened its window with no precondition. On a cold runner the loop had not started, so
//    this reported "the report never reached mid-generation", which reads as Mission Control
//    being broken — over the guard that stands on a defect that once genuinely froze it on every
//    phone. The assertion immediately below it would then pass in the same run, on the same
//    button. A flaky guard over a real defect is worse than no guard: it turns a red build into
//    a shrug. awaitRendering() now establishes that frames exist before anything is measured.
//
// 2. The 40s budget was never a full cycle. A cycle is COMP (~8s of acts) plus a hold of
//    rnd(20.5, 27.5)s at 100%, plus TRANS 0.8s, all scaled by up to 1.08 — about 39s at worst.
//    Arriving just after the mid-generation window meant waiting nearly a whole cycle for the
//    next one, with roughly a second to spare. The budget below is two worst-case cycles, which
//    is the number the code actually implies rather than a round one.
const CYCLE_WORST_MS = 40_000;
async function midGeneration(label) {
  const coldSeconds = await awaitRendering(label);

  const deadline = Date.now() + 2 * CYCLE_WORST_MS;
  let sawMovement = false;
  let prev = (await state()).p;
  while (Date.now() < deadline) {
    const s = await state();
    if (s.p !== prev) sawMovement = true;
    if (s.p > 0.05 && s.p < 0.6) return s;
    prev = s.p;
    await sleep(200);
  }

  const last = await state();
  // Say which of the two failures this is, rather than making the reader guess. "Progress never
  // moved" and "progress moved but never through the window" are different defects.
  fail(`${label}: the report never reached mid-generation in ${(2 * CYCLE_WORST_MS) / 1000}s ` +
       `(last progress ${last.p}; rendering started after ~${coldSeconds}s; ` +
       `progress ${sawMovement ? "DID" : "never"} change during the wait). ` +
       (sawMovement
         ? `The loop is running but never passed through 0.05-0.6, which a full cycle must do.`
         : `The loop is not advancing at all even though the browser is producing frames — ` +
           `that is Mission Control genuinely stopped.`));
  return state();
}

async function boxOf(sel) {
  const raw = await evaluate(`(function(){var e=document.querySelector(${JSON.stringify(sel)});
    if(!e)return 'null'; e.scrollIntoView({block:'center',behavior:'instant'});
    var r=e.getBoundingClientRect();
    return JSON.stringify({x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),
                           w:Math.round(r.width),h:Math.round(r.height),disp:getComputedStyle(e).display});})()`);
  if (raw === 'null') fail(`selector not found: ${sel}`);
  return JSON.parse(raw);
}

async function tap(sel) {
  const b = await boxOf(sel);
  if (b.w === 0 || b.h === 0 || b.disp === 'none') fail(`cannot tap ${sel}: it is not visible (display:${b.disp}, ${b.w}x${b.h}).`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(350);
  return b;
}

async function mouseTo(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, pointerType: 'mouse' });
  await sleep(300);
}

let failures = 0;
function fail(msg) { failures++; console.error(`FAIL: ${msg}`); }
function pass(msg) { console.log(`ok  ${msg}`); }

// ---------------------------------------------------------------------------
// 1 + 2. PHONE: a tap must never stop the simulation.
// ---------------------------------------------------------------------------
// "Show full report" is DECLINED while the report is still being written -- there is no full
// report yet -- and works the moment the run completes. Both halves are asserted: a control
// that is unavailable for ever and a control that is available too early look identical to a
// check that only tests one of them.
for (const [label, sel, expectExpand] of [
  ['tapping "Show full report"', '#reportMoreToggle', 'after-complete'],
  ['tapping the report title', '.report-panel h2', false],
]) {
  await load(390, 844, true);
  const before = await midGeneration(label);
  const b = await tap(sel);
  const after = await state();
  if (expectExpand === 'after-complete') {
    if (!after.collapsed) {
      fail(`${label}: the report opened while it was still being generated. There is nothing ` +
           `to show yet, which is why the control is aria-disabled until the run completes.`);
    } else {
      pass(`${label} is declined while the report is still being written`);
    }
  }
  await sleep(2200);
  const later = await state();
  if (!(later.p > after.p)) {
    fail(`${label} at 390x844 FROZE Mission Control: progress ${after.p} -> ${later.p} over 2.2s ` +
         `(pct "${later.pct}", focus "${later.focus}", :hover ${later.hover}). ` +
         `A tap has no mouseleave and no focusout, so an edge-triggered pause can never be released.`);
  } else {
    pass(`${label} at 390x844 keeps generating (${before.p} -> ${after.p} -> ${later.p})`);
  }
}

// ---------------------------------------------------------------------------
// 2b. ...and the same press, once the run has finished, opens the report. Without this the
//     check above would pass just as happily against a button that never worked at all.
// ---------------------------------------------------------------------------
{
  await load(390, 844, true);
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = await evaluate(`(function(){var b=document.getElementById('reportMoreToggle');
      return !!b && b.getAttribute('aria-disabled')!=='true';})()`) === true;
    if (!ready) await sleep(500);
  }
  if (!ready) {
    fail('the report never finished generating, so "Show full report" never became available.');
  } else {
    await tap('#reportMoreToggle');
    const opened = await state();
    if (opened.collapsed) fail('once the report was complete, "Show full report" still did not open it.');
    else pass('once the report is complete, "Show full report" opens it');
  }
}

// ---------------------------------------------------------------------------
// 3. DESKTOP: hovering must still pause, and leaving must resume. This is the
//    feature the phone fix had to preserve rather than delete.
// ---------------------------------------------------------------------------
{
  await load(1280, 900, false);
  await mouseTo(4, 4);
  await midGeneration('desktop hover');
  const b = await boxOf('.mission');
  await mouseTo(b.x, b.y);
  const held = await state();
  await sleep(1800);
  const stillHeld = await state();
  if (!held.hover) fail('desktop hover: the pointer never registered as hovering the mission; the assertion below would be meaningless.');
  else if (stillHeld.p !== held.p) fail(`desktop hover: hovering no longer pauses Mission Control (progress ${held.p} -> ${stillHeld.p}). Visitors can no longer stop it to read the report.`);
  else pass(`hovering pauses on desktop (held at ${held.p})`);

  await mouseTo(4, 4);
  await sleep(2400);   // the resume is deliberately delayed ~900ms
  const resumed = await state();
  if (!(resumed.p > stillHeld.p)) fail(`desktop hover: moving the pointer away did not resume (progress stuck at ${resumed.p}).`);
  else pass(`leaving resumes on desktop (${stillHeld.p} -> ${resumed.p})`);
}

// ---------------------------------------------------------------------------
// 4. KEYBOARD focus must still pause — the other half of "inspection", and the
//    reason the fix narrows to :focus-visible instead of dropping focus entirely.
//
//    A REAL Tab key is pressed first. Chrome only treats focus as ":focus-visible"
//    when the last interaction was a keyboard one, and a bare programmatic .focus()
//    on a fresh page does NOT qualify — asserting on that alone silently skipped this
//    case, which is precisely the shape of coverage this repo exists to refuse. One
//    genuine key event establishes keyboard modality; .focus() then lands the way a
//    Tab into the panel would, without depending on the tab order of the whole page.
// ---------------------------------------------------------------------------
{
  await load(390, 844, false);
  await midGeneration('keyboard focus');
  for (const type of ['rawKeyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  }
  await sleep(120);
  const fv = await evaluate(`(function(){var b=document.getElementById('reportMoreToggle');
    b.focus(); try{return b.matches(':focus-visible')}catch(e){return 'unsupported'}})()`);
  await sleep(300);
  const held = await state();
  await sleep(1800);
  const stillHeld = await state();
  if (fv !== true) {
    fail(`keyboard focus: :focus-visible did not match after a real Tab press (got ${fv}), so the keyboard pause could not be exercised at all. ` +
         `Fix the harness rather than accepting the skip — an unexercised assertion reads as coverage.`);
  } else if (stillHeld.p !== held.p) {
    fail(`keyboard focus no longer pauses Mission Control (progress ${held.p} -> ${stillHeld.p}). A keyboard visitor cannot hold the report still to read it.`);
  } else {
    pass(`keyboard focus pauses (held at ${held.p})`);
  }
}

// ---------------------------------------------------------------------------
// 5. SOURCE-LEVEL: a pause must have an exit that does not depend on the
//    counterpart event arriving. This is what the runtime assertions cannot see
//    (they cannot make a browser drop a mouseleave), so it is asserted directly.
// ---------------------------------------------------------------------------
{
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  if (!src.includes('function checkPause()')) {
    fail('app.js no longer has the pause watchdog (checkPause). A lost mouseleave would strand the simulation with no way back.');
  } else if (!src.includes("mission.matches(':hover')") || !src.includes('mission.contains(document.activeElement)')) {
    fail('the pause watchdog no longer re-reads the real hover/focus state, so it can no longer release a stranded pause.');
  } else {
    pass('the pause watchdog re-reads real hover/focus state');
  }
  if (!src.includes("addEventListener('touchstart'") || !src.includes("e.pointerType!=='mouse'")) {
    fail('app.js no longer tracks touch as a distinct input modality, so a tap can pause the mission again.');
  } else {
    pass('touch is tracked as a distinct input modality');
  }
}

if (failures) {
  console.error(`\ncheck-mission-pause: ${failures} assertion(s) failed.`);
  cleanup(1);
} else {
  console.log('\ncheck-mission-pause: OK — a tap never stops Mission Control, hover and keyboard still pause it, and a pause always has an exit.');
  cleanup(0);
}
