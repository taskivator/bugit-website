// THE MARKER STAYS IN ITS ROW WHILE IT MOVES.
//
// WHY THIS EXISTS. Owner, 2026-08-23: "the green tick animation goes out of it box."
//
// It did, and the cause is one property name. Each step in Mission Control carries a round
// marker drawn as the row's ::before, centred on the row with `transform: translateY(-50%)`.
// Two of its three states are animated -- `spin` while the step is running, which repeats for
// as long as the step lasts, and `mcPop` when it completes -- and both animations are written
// in `transform`. A running animation REPLACES the property it animates, so for every frame of
// both of them the centring simply was not applied. MEASURED at 390x844, 375x667, 393x851 and
// 844x390, in Chromium and WebKit: the marker sat 8.0px below the centre of a 38px row for the
// whole time it was moving. On a phone that row is a pill and, collapsed, it is the only row on
// screen -- so a 16px circle spent the run hanging through the pill's rounded bottom corner.
//
// WHAT IT ASSERTS. The marker's centre and its row's centre agree to within a pixel, sampled
// through complete runs of the instrument. The marker is a pseudo-element and has no node to
// measure, so its box is computed the way the browser computes it: the used top/left/width/
// height, then the individual `translate`/`scale` and the `transform` matrix applied about the
// box's own centre. Rows with no box are skipped -- the instrument rebuilds its list between
// cycles, and nothing that is not rendered can be out of place.
//
// It is deliberately an assertion about CENTRING rather than about containment. A rectangular
// containment test passes on the broken tree: the marker is 16px in a 36px padding box, so 8px
// of drop still leaves it inside the row's RECTANGLE -- and out through the corner of the pill
// the reader can actually see.
//
// Run: `node scripts/check-mission-marker.mjs` (or `npm run test:mission-marker`).
import { chromium, webkit, devices } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const TOLERANCE = 1.0;   // px between the two centres
const SAMPLES = 200;     // ~9s of a ~25s cycle, which covers every step's spin and pop

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
  console.error(`check-mission-marker: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}
const done = () => {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
};

/* The pseudo-element's box, composed the way the engine composes it. */
const PROBE = () => {
  const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const pct = (v, basis) => String(v).trim().endsWith("%") ? num(v) / 100 * basis : num(v);
  const out = [];
  for (const li of document.querySelectorAll("#mcStepList li")) {
    const cs = getComputedStyle(li, "::before");
    if (cs.content === "none" || cs.display === "none") continue;
    const w = num(cs.width), h = num(cs.height);
    if (!w || !h) continue;
    const liRect = li.getBoundingClientRect();
    if (!liRect.width || !liRect.height) continue;   // between cycles: not rendered, not judged
    const liCs = getComputedStyle(li);
    const bt = num(liCs.borderTopWidth), bl = num(liCs.borderLeftWidth);
    const padH = liRect.height - bt - num(liCs.borderBottomWidth);
    let y = liRect.top + bt + pct(cs.top, padH);
    if (cs.translate && cs.translate !== "none") {
      const p = cs.translate.split(/\s+/);
      y += pct(p[1] === undefined ? "0" : p[1], h);
    }
    let f = 0;
    if (cs.transform && cs.transform !== "none") {
      const m = cs.transform.match(/matrix\(([^)]+)\)/);
      if (m) f = Number(m[1].split(",")[5]);   // the matrix's own vertical translation
    }
    const cy = y + h / 2 + f;
    out.push({
      step: (li.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24),
      state: li.classList.contains("done") ? "done" : li.classList.contains("active") ? "active" : "idle",
      off: Math.round(Math.abs(cy - (liRect.top + liRect.bottom) / 2) * 10) / 10,
    });
  }
  return out;
};

const VIEWS = [
  { engine: "chromium", type: chromium, device: "iPhone 13" },
  { engine: "webkit", type: webkit, device: "iPhone 13" },
  { engine: "chromium", type: chromium, device: "iPhone SE" },
  { engine: "chromium", type: chromium, size: { width: 844, height: 390 } },   // held sideways
  { engine: "chromium", type: chromium, size: { width: 1440, height: 900 } },
];
let samples = 0;
for (const view of VIEWS) {
  const label = `${view.engine}/${view.device || `${view.size.width}x${view.size.height}`}`;
  let browser;
  try {
    browser = await view.type.launch();
    const ctx = await browser.newContext(view.device ? { ...devices[view.device] } : { viewport: view.size });
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    // The instrument runs only while it is on screen, and it pauses under a pointer by design.
    await page.evaluate(() => document.querySelector(".mission").scrollIntoView({ block: "start", behavior: "instant" }));
    await page.mouse.move(4, 4);
    let worst = 0, where = "";
    for (let i = 0; i < SAMPLES; i++) {
      for (const r of await page.evaluate(PROBE)) {
        samples++;
        if (r.off > worst) { worst = r.off; where = `${r.state} "${r.step}"`; }
      }
      await page.waitForTimeout(45);
    }
    if (worst > TOLERANCE) {
      fail.push(`${label}: the marker is ${worst}px off the centre of its row (${where})`);
    }
    console.log(`  ${label}: worst ${worst.toFixed(1)}px off centre`);
    await browser.close();
  } catch (e) {
    fail.push(`${label}: ${String(e).split("\n")[0]}`);
    try { await browser?.close(); } catch {}
  }
}

done();
if (samples < 100) {
  console.error(`check-mission-marker: only ${samples} marker samples -- the instrument never ran.`);
  process.exit(1);
}
if (fail.length) {
  console.error(`\ncheck-mission-marker: FAIL (${fail.length})`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-mission-marker: OK (${samples} marker samples across ${VIEWS.length} device/engine pairs)`);
