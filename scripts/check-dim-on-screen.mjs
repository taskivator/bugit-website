// NOTHING IS DIM WHILE IT IS ON THE SCREEN BEING READ.
//
// WHY THIS EXISTS. Owner, 2026-08-23: "in landscape mode in mobile the fading is agressive,
// they fade still with some space left at the top of the phone."
//
// The site's reveal is a PASS: a block rises in over the first fifth of its cover range and
// fades back out over the last tenth, so the wave travels the same way whichever way the reader
// scrolls. Both ends are measured against the cover range -- the scrollport plus the block --
// and a phone held sideways has 390px of scrollport, inset by the 108px the sticky header takes.
// MEASURED at 844x390 before the fix, walking the page in 130px steps and reading each block's
// own animation progress:
//
//     "Backed by a 7-day refund policy"   opacity 0     top 48  bottom 66   pass1 @100%
//     the FAQ section head                opacity 0     top  1  bottom 80   pass1 @100%
//     the demo tabs                       opacity 0.16  top  5  bottom 102  pass1 @98.4%
//     "Open the channel"                  opacity 0.18  top 17  bottom 103  pass1 @98.2%
//     DOCUMENTATION                       opacity 0.26  top 84  bottom 104  pass1 @97.4%
//
// Every one of them is a block sitting whole on the screen, below the header, with clear space
// above it, painting at nothing.
//
// WHAT IT ASSERTS. On a short screen, no element driven by a reveal is painting below full
// opacity while its top edge is in the upper 60% of the viewport -- i.e. while the reader has
// scrolled it into the part of the screen they are reading. The page is swept top to bottom in
// third-of-a-screen steps, in both engines, at three landscape sizes.
//
// WHAT IT DELIBERATELY DOES NOT ASSERT. Anything on a TALL screen: there the exit fade happens
// under the header, which is the design and is check-motion's and check-reveal's ground. And
// anything that is not a reveal -- the stacked demo videos, a play ring that is off until its
// film runs -- which are stacked states rather than content arriving.
//
// check-reveal.mjs cannot see this: it records each animation's PEAK opacity over the whole
// sweep and asserts it reaches 1.0, which it does. This one asserts WHERE on the screen it is
// still below it.
//
// Run: `node scripts/check-dim-on-screen.mjs` (or `npm run test:dim-on-screen`).
import { chromium, webkit } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];

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
  console.error(`check-dim-on-screen: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}
const done = () => {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
};

const FIND = () => {
  const vh = innerHeight, out = [];
  for (const el of document.querySelectorAll("main *")) {
    const cs = getComputedStyle(el);
    const o = parseFloat(cs.opacity);
    if (!(o < 0.985)) continue;
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    // The instrument dims its own rows on purpose and rebuilds them every cycle; that
    // choreography is check-mission-pause's subject, not this one's.
    if (el.closest(".mission")) continue;
    const r = el.getBoundingClientRect();
    if (!r.height || !r.width) continue;
    if (r.top < 0 || r.top > vh * 0.6) continue;
    // A reveal, not a stacked state: the element's own opacity is being driven by one of the
    // page's arrival animations. Read from the running animation rather than from a class name.
    const a = el.getAnimations().find((x) => /pass\d|riseIn|docIn|cellIn/.test(x.animationName || ""));
    if (!a) continue;
    out.push({
      sel: el.tagName.toLowerCase() + (String(el.className || "").trim() ? "." + String(el.className).trim().split(/\s+/).slice(0, 2).join(".") : ""),
      op: Math.round(o * 100) / 100,
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      name: a.animationName,
      prog: a.effect ? Math.round((a.effect.getComputedTiming().progress ?? -1) * 1000) / 10 : null,
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32),
    });
  }
  return out;
};

// Three real landscape phones, both engines Chrome ships on a phone.
const VIEWS = [
  { engine: "chromium", type: chromium, w: 844, h: 390 },    // iPhone 13 / 14 sideways
  { engine: "chromium", type: chromium, w: 932, h: 430 },    // iPhone 14 Pro Max sideways
  { engine: "webkit", type: webkit, w: 844, h: 390 },
];
let stops = 0;
for (const view of VIEWS) {
  const label = `${view.engine} ${view.w}x${view.h}`;
  let browser;
  try {
    browser = await view.type.launch();
    const page = await (await browser.newContext({ viewport: { width: view.w, height: view.h } })).newPage();
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const doc = await page.evaluate(() => document.documentElement.scrollHeight);
    const worst = new Map();
    for (let y = 0; y < doc - view.h; y += Math.round(view.h / 3)) {
      await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
      await page.waitForTimeout(130);
      stops++;
      for (const r of await page.evaluate(FIND)) {
        const k = r.sel + "|" + r.text;
        if (!worst.has(k) || worst.get(k).op > r.op) worst.set(k, { ...r, y });
      }
    }
    for (const r of [...worst.values()].sort((a, b) => a.op - b.op)) {
      fail.push(`${label}: ${r.sel} "${r.text}" painting at ${r.op} (${r.name} @${r.prog}%) with its top ${r.top}px down a ${view.h}px screen, at scrollY ${r.y}`);
    }
    console.log(`  ${label}: ${worst.size} element(s) dim while on screen`);
    await browser.close();
  } catch (e) {
    fail.push(`${label}: ${String(e).split("\n")[0]}`);
    try { await browser?.close(); } catch {}
  }
}

done();
if (stops < 30) { console.error(`check-dim-on-screen: only ${stops} scroll stops -- the sweep did not run.`); process.exit(1); }
if (fail.length) {
  console.error(`\ncheck-dim-on-screen: FAIL (${fail.length})`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-dim-on-screen: OK (${stops} scroll stops across ${VIEWS.length} landscape sizes)`);
