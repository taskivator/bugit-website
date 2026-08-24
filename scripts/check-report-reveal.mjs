// PRESSING "SHOW FULL REPORT" HAS TO SHOW SOME OF THE REPORT.
//
// WHY THIS EXISTS. Owner, 2026-08-23: "on mobile for mission control when show full report is
// tapped there is no indication that the report opened and they can scroll down to see it some
// ppl might miss it."
//
// It was true, and the two rules that made it true are both deliberate. The instrument is the
// same size open or closed (section 73 of the stylesheet, the owner's own rule), so the panel
// cannot grow into the press; and the report opens into the panel's own scroller, which starts
// at the top -- and the top is the head, the title and the four meta boxes, which is exactly
// what was already on the screen. MEASURED at 390x844 in WebKit before the fix: the press
// revealed 714px of report and put 28px of it inside the viewport. The before and after
// screenshots are the same picture with one word changed.
//
// WHAT IT ASSERTS, on every press, in both engines:
//   1. a real amount of the report's own body is inside the viewport afterwards (>=180px),
//   2. the panel is the same height it was  -- the owner's rule is not traded away for 1,
//   3. the page did not scroll -- the reveal happens inside the instrument, and a press that
//      moves the whole page under the reader is a different defect wearing the fix's clothes.
//
// The subject is the CONTROL, not a scroll position: the report is opened by pressing the thing
// a reader presses, after arriving at it the way a reader arrives.
//
// Run: `node scripts/check-report-reveal.mjs` (or `npm run test:report-reveal`).
import { chromium, webkit, devices } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);
const MIN_ON_SCREEN = 180;   // px of report body a press must put in front of the reader

/* ---------- the harness -------------------------------------------------- */
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
  console.error(`check-report-reveal: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}
const done = () => {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
};

/* ---------- what the reader can see -------------------------------------- */
const SNAP = () => {
  const btn = document.getElementById("reportMoreToggle");
  const panel = document.querySelector(".report-panel");
  const vh = window.innerHeight;
  const onScreen = (el) => {
    if (getComputedStyle(el).display === "none") return 0;
    const b = el.getBoundingClientRect();
    return Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0));
  };
  return {
    scrollY: Math.round(window.scrollY),
    panelH: Math.round(panel.getBoundingClientRect().height),
    expanded: btn.getAttribute("aria-expanded"),
    bodyOnScreen: Math.round([...document.querySelectorAll(".report-more")].reduce((a, el) => a + onScreen(el), 0)),
  };
};

/* ---------- measure ------------------------------------------------------ */
const VIEWS = [
  { engine: "chromium", type: chromium, device: "iPhone 13" },
  { engine: "webkit", type: webkit, device: "iPhone 13" },
  { engine: "chromium", type: chromium, device: "Pixel 5" },
  { engine: "chromium", type: chromium, size: { width: 1440, height: 900 } },
];
let measured = 0;
for (const view of VIEWS) {
  const label = `${view.engine}/${view.device || `${view.size.width}x${view.size.height}`}`;
  let browser;
  try {
    browser = await view.type.launch();
    const ctx = await browser.newContext(
      view.device ? { ...devices[view.device] } : { viewport: view.size },
    );
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    // THE BANNER COMES OFF FIRST, because a reader takes it off. It is pinned to the bottom of
    // the viewport and the report's control is the last thing in the panel, so with the banner
    // up the two share the same corner: every press aimed at the control lands on the banner.
    // AND ITS REMOVAL IS ASSERTED, not attempted. This used to be a bare
    // `try { ...click({timeout:2500}) } catch {}`, so on a loaded machine the click timed out,
    // the catch swallowed it, the banner stayed up over the corner this check presses, and the
    // press landed on the banner. The gate then reported the PRODUCT as broken -- "the control
    // still reports itself collapsed after a press" -- which is a true sentence about a press
    // that never reached the control. Seen once on 2026-08-24, on webkit/iPhone 13, while
    // sixteen pytest workers had the CPU; it passed on both re-runs.
    //
    // A gate that cannot tell its own unmet precondition from a product defect is worse than no
    // gate: it costs a release its credibility in one direction and its cover in the other.
    try {
      await page.locator("#consentReject").click({ timeout: 8000 });
    } catch (err) {
      fail.push(`${label}: HARNESS -- the consent banner would not dismiss (${String(err).split("\n")[0].slice(0, 90)}); ` +
                "it covers the corner this control lives in, so nothing below measures the product");
      await browser.close(); continue;
    }
    await page.waitForTimeout(300);
    const bannerGone = await page.evaluate(() => {
      const n = document.getElementById("consentBanner") || document.querySelector(".consent-banner, #cookieBanner");
      if (!n) return true;
      const cs = getComputedStyle(n);
      return cs.display === "none" || cs.visibility === "hidden" || n.getBoundingClientRect().height === 0;
    });
    if (!bannerGone) {
      fail.push(`${label}: HARNESS -- the consent banner is still laid out after being dismissed`);
      await browser.close(); continue;
    }
    // The instrument runs only while it is on screen, so the reader has to arrive first --
    // and the pointer is then taken off it, because the mission pauses on hover by design and
    // a pointer left where a dismissed banner used to be hovers whatever scrolls under it.
    await page.evaluate(() => document.querySelector(".mission").scrollIntoView({ block: "start", behavior: "instant" }));
    await page.mouse.move(4, 4);
    let ready = false;
    for (let i = 0; i < 90 && !ready; i++) {
      await page.waitForTimeout(500);
      ready = await page.evaluate(() => document.getElementById("reportMoreToggle").classList.contains("is-ready"));
    }
    if (!ready) { fail.push(`${label}: the report never became available to open`); await browser.close(); continue; }
    // Arrive at the control the way a reader does, by scrolling rather than by teleporting.
    await page.evaluate(() => document.getElementById("reportMoreToggle").scrollIntoView({ block: "nearest", behavior: "instant" }));
    await page.waitForTimeout(300);
    const before = await page.evaluate(SNAP);
    // PRESSED WHERE IT IS, at the coordinates the reader can see. locator.click() scrolls the
    // element into view first, differently per engine, and this page sets `scroll-behavior:
    // smooth` -- so that scroll is still travelling when the press lands and its arrival looks
    // exactly like the page moving under the press. A tap at a measured point cannot scroll
    // anything, which is the only way this assertion measures the product and not the harness.
    const box = await page.evaluate(() => {
      const r = document.getElementById("reportMoreToggle").getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom, vh: innerHeight };
    });
    if (box.top < 0 || box.bottom > box.vh) {
      fail.push(`${label}: the control is not fully on screen to be pressed (${Math.round(box.top)}..${Math.round(box.bottom)} of ${box.vh})`);
      await browser.close(); continue;
    }
    // WHAT IS ACTUALLY UNDER THE PRESS POINT. The control sits flush against the bottom edge
    // of an iPhone 13 viewport (598..664 of 664), which is the same corner every pinned overlay
    // on this site claims. Asking before pressing turns "the product did not open" into "X was
    // covering the button", which is the difference between a bug report and a wild goose chase.
    const under = await page.evaluate(({ x, y }) => {
      const b = document.getElementById("reportMoreToggle");
      const hit = document.elementFromPoint(x, y);
      if (!hit) return "nothing (the point is outside the viewport)";
      if (hit === b || b.contains(hit)) return null;
      return hit.tagName.toLowerCase() + (hit.id ? "#" + hit.id : "") +
             (hit.className ? "." + String(hit.className).split(/\s+/).slice(0, 2).join(".") : "");
    }, { x: box.x, y: box.y });
    if (under) {
      fail.push(`${label}: HARNESS -- ${under} is under the press point, not the control`);
      await browser.close(); continue;
    }
    if (view.device) await page.touchscreen.tap(box.x, box.y);
    else await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(800);
    const after = await page.evaluate(SNAP);
    measured++;
    if (after.expanded !== "true") {
      fail.push(`${label}: the control still reports itself collapsed after a press`);
    }
    if (after.bodyOnScreen < MIN_ON_SCREEN) {
      fail.push(`${label}: the press left ${after.bodyOnScreen}px of the report on screen, under the ${MIN_ON_SCREEN}px floor -- nothing visibly opened`);
    }
    if (Math.abs(after.panelH - before.panelH) > 2) {
      fail.push(`${label}: the instrument changed height on the press, ${before.panelH}px -> ${after.panelH}px`);
    }
    if (Math.abs(after.scrollY - before.scrollY) > 2) {
      fail.push(`${label}: the press moved the page ${after.scrollY - before.scrollY}px`);
    }
    note(`${label}: ${after.bodyOnScreen}px of report on screen, panel ${before.panelH}->${after.panelH}px, page still at ${after.scrollY}`);
    await browser.close();
  } catch (e) {
    fail.push(`${label}: ${String(e).split("\n")[0]}`);
    try { await browser?.close(); } catch {}
  }
}

done();
// THE REASONS FIRST, ALWAYS. `!measured` used to exit here before `fail` was printed, so a run
// where every viewport bailed on a precondition reported the single word "nothing was measured"
// and threw away the sentence saying why -- which is the one thing the operator needed. It was
// nearly unreachable before the precondition checks above; now it is the normal shape of a
// harness failure, and a gate that knows why it failed must say so.
if (fail.length) {
  console.error(`\ncheck-report-reveal: FAIL (${fail.length})`);
  for (const f of fail) console.error("  - " + f);
}
if (!measured) {
  console.error("check-report-reveal: nothing was measured, so this proves nothing about the product.");
  process.exit(1);
}
if (fail.length) process.exit(1);
console.log(`check-report-reveal: OK (${measured} device/engine pairs)`);
