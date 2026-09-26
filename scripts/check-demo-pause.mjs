// THE DEMO CAN BE STOPPED, AND IT STAYS STOPPED (CR-08-F08, WCAG 2.2.2).
//
// WHY THIS EXISTS. The four demo clips start by themselves when the section scrolls into view
// and rotate from one channel to the next after each clip ends. For a reader without reduced
// motion there was no way to stop that: no control on the stage, no native controls on the
// clips. Scrolling the section away paused it only until it came back. WCAG 2.2.2 requires a
// way to pause moving content that starts automatically and lasts more than five seconds.
// check-motion step 6 covers the reduced-motion half (nothing starts); this covers the other.
//
// WHAT IT ASSERTS, in English and in German (the label is translated, and a label that stays
// English on a German page is a defect this site has shipped before):
//   1. the stage carries a visible button whose accessible name is its visible label, in the
//      page's language, and it is reachable by keyboard;
//   2. pressing it with the KEYBOARD pauses every clip and relabels it as Play;
//   3. while paused NOTHING restarts playback: not scrolling the section away and back (the
//      intersection observer), not a clip ending (the rotation timer), not choosing another
//      channel. play() calls are counted, so this holds even where the headless browser cannot
//      decode the clip;
//   4. the channel does not rotate while paused, measured past the full hold interval;
//   5. pressing it again resumes (play() is called) and relabels it as Pause;
//   6. under reduced motion the control is hidden, because nothing moves there and the clip
//      carries the browser's own controls (check-motion step 6).
//
// POSITIVE CONTROL for 4: with the control NOT pressed, the same simulated clip end must rotate
// the channel. Without it, "did not rotate while paused" is equally consistent with a
// simulation that never reaches the rotation code at all.
//
// Run: `node scripts/check-demo-pause.mjs` (or `npm run test:demo-pause`).
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
});
let serverExit = null;
server.on("exit", (c, s) => { serverExit = s || `code ${c}`; });
const base = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60 && !serverExit; i++) {
  try { const r = await fetch(base + "/"); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 120));
}
if (serverExit) {
  console.error(`check-demo-pause: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}
const done = () => {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
};

// Counts play() calls on the demo clips, before app.js runs. A counted call is the page ASKING
// to play, which is the decision under test; whether this browser can decode H.264 is not.
const PLAY_COUNTER = () => {
  const orig = HTMLMediaElement.prototype.play;
  window.__demoPlays = 0;
  HTMLMediaElement.prototype.play = function () {
    if (this.classList && this.classList.contains("demo-video")) window.__demoPlays++;
    return orig.call(this);
  };
};

// app.js holds each clip's final frame for this long before rotating (HOLD_MS). Read, not
// typed: if the interval changes, the wait below follows it.
const HOLD_MS = await (async () => {
  const src = await (await fetch(base + "/app.js")).text();
  const m = src.match(/const HOLD_MS=(\d+);/);
  if (!m) { fail.push("could not read HOLD_MS from app.js, so the rotation wait below is a guess"); return 3400; }
  return Number(m[1]);
})();

const LABELS = { en: { pause: "Pause", play: "Play" }, de: { pause: "Anhalten", play: "Abspielen" } };

const state = (page) => page.evaluate(() => {
  const b = document.getElementById("demoPause");
  const active = document.querySelector("#demoStack .demo-video.is-active");
  const r = b && b.getBoundingClientRect();
  return {
    lang: document.documentElement.lang,
    exists: !!b,
    hidden: b ? (b.hidden || getComputedStyle(b).display === "none" || r.width === 0) : true,
    text: b ? b.textContent.trim() : "",
    ariaLabel: b ? b.getAttribute("aria-label") : null,
    paused: b ? b.classList.contains("is-paused") : null,
    allPaused: [...document.querySelectorAll("#demoStack .demo-video")].every((v) => v.paused),
    active: active ? active.dataset.video : null,
    plays: window.__demoPlays,
  };
});
const scrollToDemo = (page) => page.evaluate(() => document.getElementById("demo").scrollIntoView({ block: "center", behavior: "instant" }));
const scrollAway = (page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
// A clip reaching its end, as the rotation code sees it.
const endActive = (page) => page.evaluate(() => {
  const v = document.querySelector("#demoStack .demo-video.is-active");
  v.dispatchEvent(new Event("ended"));
});

const browser = await chromium.launch();
let measured = 0;
try {
  for (const lang of ["en", "de"]) {
    const L = LABELS[lang];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
    await ctx.addCookies([{ name: "bugitLang", value: lang, url: base }]);
    await ctx.addInitScript(PLAY_COUNTER);
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    try { await page.locator("#consentReject").click({ timeout: 2500 }); } catch {}

    await scrollToDemo(page);
    await page.waitForTimeout(800);
    let s = await state(page);
    if (s.lang !== lang) { fail.push(`${lang}: the page rendered as "${s.lang}", so nothing below is about ${lang}`); await ctx.close(); continue; }
    measured++;
    // 1.
    if (!s.exists) { fail.push(`${lang}: there is no pause control on the demo stage (#demoPause)`); await ctx.close(); continue; }
    if (s.hidden) fail.push(`${lang}: the pause control exists but is not visible`);
    if (s.text !== L.pause) fail.push(`${lang}: the control reads "${s.text}", expected "${L.pause}"`);
    if (s.ariaLabel && s.ariaLabel !== s.text) fail.push(`${lang}: the control's accessible name "${s.ariaLabel}" is not its visible label "${s.text}"`);
    if (s.plays < 1) fail.push(`${lang}: the clip never asked to play when the section came into view, so nothing here is paused FROM playing`);

    // Positive control for 4: unpaused, a clip end rotates the channel.
    const before = s.active;
    await endActive(page);
    await page.waitForTimeout(HOLD_MS + 700);
    s = await state(page);
    if (s.active === before) fail.push(`${lang}: POSITIVE CONTROL: with nothing paused, a clip end did not rotate the channel after ${HOLD_MS + 700}ms, so the paused case below proves nothing`);

    // 2. by keyboard.
    await page.focus("#demoPause");
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
    if (focused !== "demoPause") fail.push(`${lang}: the pause control cannot take keyboard focus`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    s = await state(page);
    if (!s.paused) fail.push(`${lang}: pressing Enter on the control did not pause (no is-paused state)`);
    if (!s.allPaused) fail.push(`${lang}: after pausing, a demo clip is still playing`);
    if (s.text !== L.play) fail.push(`${lang}: once paused the control reads "${s.text}", expected "${L.play}"`);

    // 3 and 4. Nothing restarts, nothing rotates.
    const playsAtPause = s.plays, activeAtPause = s.active;
    await scrollAway(page); await page.waitForTimeout(600);
    await scrollToDemo(page); await page.waitForTimeout(800);
    await endActive(page);
    await page.waitForTimeout(HOLD_MS + 700);
    s = await state(page);
    if (s.plays !== playsAtPause) fail.push(`${lang}: while paused, play() was called ${s.plays - playsAtPause} time(s) by scrolling back or a clip ending`);
    if (s.active !== activeAtPause) fail.push(`${lang}: while paused, the channel rotated from ${activeAtPause} to ${s.active}`);
    // Choosing another channel changes the channel and leaves it still.
    const other = await page.evaluate(() => {
      const b = [...document.querySelectorAll(".demo-tabs button")].find((x) => !x.classList.contains("active"));
      b.click(); return b.dataset.video;
    });
    await page.waitForTimeout(400);
    s = await state(page);
    if (s.active !== other) fail.push(`${lang}: choosing ${other} while paused did not switch the channel`);
    if (s.plays !== playsAtPause) fail.push(`${lang}: choosing a channel while paused started playback`);
    if (!s.allPaused) fail.push(`${lang}: choosing a channel while paused left a clip playing`);
    if (!s.paused || s.text !== L.play) fail.push(`${lang}: choosing a channel released the pause (control reads "${s.text}")`);

    // 5. Resume.
    await page.focus("#demoPause");
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    s = await state(page);
    if (s.paused) fail.push(`${lang}: pressing the control again did not resume`);
    if (s.plays <= playsAtPause) fail.push(`${lang}: resuming did not ask the clip to play`);
    if (s.text !== L.pause) fail.push(`${lang}: after resuming the control reads "${s.text}", expected "${L.pause}"`);
    note(`${lang}: "${L.pause}" pauses by keyboard, holds through scroll, clip end and channel change, "${L.play}" resumes`);
    await ctx.close();
  }

  // 6. Reduced motion.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await scrollToDemo(page);
    await page.waitForTimeout(600);
    const s = await state(page);
    if (!s.exists) fail.push("reduced motion: #demoPause is missing from the page");
    else if (!s.hidden) fail.push("reduced motion: the pause control is shown although nothing moves there and the clip has its own controls");
    else note("reduced motion: the control is hidden; the clip's own controls stand in (check-motion step 6)");
    measured++;
    await ctx.close();
  }
} catch (e) {
  fail.push(`harness: ${String(e).split("\n")[0]}`);
} finally {
  await browser.close().catch(() => {});
  done();
}

if (measured < 3) fail.push(`only ${measured} of 3 scenarios were measured`);
if (fail.length) {
  console.error(`\ncheck-demo-pause: FAIL (${fail.length})`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log("check-demo-pause: OK (the demo stack can be paused by keyboard, stays paused, resumes, in two languages; hidden under reduced motion)");
