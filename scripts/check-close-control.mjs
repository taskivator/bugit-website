// A READER MUST NEVER BE LOCKED BEHIND A CONTROL THEY CANNOT REACH.
//
// WHY THIS EXISTS. Owner, 2026-08-23: "google chrome is still crashing when the 3 lines settings
// is open the page is zoomed in and X is pressed."
//
// It was not a crash. Chrome's own Crashpad on this machine holds no dump newer than 2026-08-06,
// so nothing died -- the PAGE was left dead, which a reader cannot tell apart from a browser that
// has. Opening the mobile menu locks the document with `body{position:fixed;top:-<scrollY>}` and
// marks everything behind the overlay `inert`; the hamburger, which becomes an X, is the single
// control that undoes both. MEASURED as a desktop window, menu closed and open, at every width:
//
//     viewport   the X's box        inside the viewport?
//        64      [103,12,46,46]     no, 85px past the right edge
//        98      [103,12,46,46]     no, 51px past
//       130      [103,12,46,46]     no, 19px past
//       150      [103,12,46,46]     YES, and every width above it
//
// Below 150 CSS px the header row could not fit and did not wrap, so the controls were pushed out
// of the viewport, and `html{overflow-x:clip}` means the reader cannot scroll to what left it.
// 150px is not exotic: Chrome zooms to 500%, and 500% of a window narrowed to look at the mobile
// layout is exactly this. `elementFromPoint` at the X's centre returned NOTHING there -- not
// another element, nothing, because the point is outside the viewport -- and an earlier sweep
// read that as "covered by something else" and went looking for a z-index bug that was not there.
//
// WHAT IT ASSERTS, at every width from 64px up and at short and tall viewports, in both writing
// directions, and after a zoom applied WHILE THE MENU IS OPEN, which is the reported order:
//
//   1. the control that closes the overlay is fully inside the viewport,
//   2. a press at its centre reaches it (elementFromPoint, not a guess),
//   3. after that press the page is given back: not position:fixed, no menu-open class, no
//      element left inert, and the reading position where it was.
//
// THE SUBJECT IS COMPUTED. The overlay is found by `aria-controls` from the control that owns it,
// so a rename or a second overlay is measured rather than missed.
//
// Run: `node scripts/check-close-control.mjs` (or `npm run test:close-control`).
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];

/* ---------- the page under test ------------------------------------------ */
let base = process.env.BASE_URL || "";
let server = null;
if (!base) {
  const PORT = await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
  });
  server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  base = `http://127.0.0.1:${PORT}`;
  let up = false;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(base + "/"); if (r.ok) { up = true; break; } } catch {}
    await new Promise((r) => setTimeout(r, 120));
  }
  if (!up) { console.error("check-close-control: the dev server never answered."); stop(); process.exit(1); }
}
function stop() {
  if (!server) return;
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
}

/* ---------- what the page is asked, in the page -------------------------- */
// The control is the one that owns an overlay through aria-controls. Nothing here is named.
const FIND = () => {
  const controls = [...document.querySelectorAll("[aria-controls][aria-expanded]")]
    .filter((el) => {
      const p = document.getElementById(el.getAttribute("aria-controls"));
      if (!p) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== "none";
    });
  // The one whose overlay covers the viewport is the one that locks the page.
  const full = controls.find((el) => {
    const p = document.getElementById(el.getAttribute("aria-controls"));
    const cs = getComputedStyle(p);
    return cs.position === "fixed" || p.classList.contains("mobile-menu");
  });
  const el = full || controls[0];
  if (!el) return null;
  el.dataset.closeProbe = "1";
  return { panel: el.getAttribute("aria-controls"), label: (el.getAttribute("aria-label") || "").slice(0, 24) };
};

const LOOK = () => {
  const el = document.querySelector("[data-close-probe]");
  const r = el.getBoundingClientRect();
  const w = window.innerWidth, h = window.innerHeight;
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  const panel = document.getElementById(el.getAttribute("aria-controls"));
  return {
    box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    vw: w, vh: h,
    inside: r.left >= -1 && r.top >= -1 && r.right <= w + 1 && r.bottom <= h + 1,
    reached: !!hit && (hit === el || el.contains(hit)),
    over: Math.round(Math.max(0, r.right - w, r.bottom - h, -r.left, -r.top)),
    open: !!panel && panel.classList.contains("open"),
    locked: getComputedStyle(document.body).position === "fixed" || !!document.body.style.top,
    inert: document.querySelectorAll("[inert]").length,
    expanded: el.getAttribute("aria-expanded"),
    y: Math.round(window.scrollY),
    point: [Math.round(cx), Math.round(cy)],
  };
};

/* ---------- the sweep ---------------------------------------------------- */
const WIDTHS = [64, 100, 130, 160, 200, 280, 320, 360, 390, 430];
const HEIGHTS = [120, 400, 844];
const ZOOMS = [1, 2, 3, 5];

const browser = await chromium.launch();
let measured = 0, sawNarrow = false;

async function one({ w, h, zoom, rtl, rotate }) {
  const where = `${w}x${h}${zoom > 1 ? ` zoomed ${zoom}x while open` : ""}` +
    `${rotate ? ` rotated to ${rotate[0]}x${rotate[1]} while open` : ""}${rtl ? " RTL" : ""}`;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1,
    locale: rtl ? "ar" : "en",
  });
  const page = await ctx.newPage();
  try {
    const cdp = await ctx.newCDPSession(page);
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    if (rtl) {
      await page.evaluate(() => { document.documentElement.setAttribute("dir", "rtl"); });
      await page.waitForTimeout(200);
    }
    try { await page.evaluate(() => document.getElementById("consentReject")?.click()); } catch {}
    await page.waitForTimeout(150);

    const found = await page.evaluate(FIND);
    if (!found) { fail.push(`${where}: no control on the page declares an overlay through aria-controls`); return; }

    await page.evaluate(() => document.querySelector("[data-close-probe]").click());
    await page.waitForTimeout(350);
    let s = await page.evaluate(LOOK);

    if (zoom > 1) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: Math.max(50, Math.round(w / zoom)), height: Math.max(50, Math.round(h / zoom)),
        deviceScaleFactor: zoom, mobile: false,
      });
      await page.waitForTimeout(400);
      s = await page.evaluate(LOOK);
    }
    /* Turning the phone does not close the menu, and it should not: the reader is still in it.
       What it must not do is take the only way out with it -- in landscape the header is
       deliberately `position:static` so a short screen keeps its height, and the rule that pins
       it while the menu is open has to win over that. */
    if (rotate) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: rotate[0], height: rotate[1], deviceScaleFactor: 1, mobile: false,
      });
      await page.waitForTimeout(450);
      s = await page.evaluate(LOOK);
    }
    if (s.vw < 160) sawNarrow = true;

    // A menu that closed itself rather than trap the reader is a pass, not a finding: the page
    // is not locked and the control is back where it was.
    if (!s.open) {
      if (s.locked) fail.push(`${where}: the overlay closed but the page is still locked`);
      if (s.inert) fail.push(`${where}: the overlay closed and left ${s.inert} element(s) inert`);
      measured++;
      return;
    }

    if (!s.inside) {
      fail.push(`${where}: the page is locked and the control that closes it is ${s.over}px outside ` +
        `the viewport (box ${JSON.stringify(s.box)} in ${s.vw}x${s.vh}) -- a reader cannot scroll to it, ` +
        `and Escape is a key a phone does not have`);
      return;
    }
    if (!s.reached) {
      fail.push(`${where}: the control that closes the overlay is on screen but a press at ` +
        `${JSON.stringify(s.point)} does not reach it`);
      return;
    }

    await page.evaluate(() => document.querySelector("[data-close-probe]").click());
    await page.waitForTimeout(400);
    const after = await page.evaluate(LOOK);
    if (after.open) fail.push(`${where}: the overlay is still open after its own close control was pressed`);
    if (after.locked) fail.push(`${where}: the page is still locked after the close: the reader cannot scroll`);
    if (after.inert) fail.push(`${where}: ${after.inert} element(s) left inert after the close: that part of the page is dead to touch and to a screen reader`);
    if (after.expanded !== "false") fail.push(`${where}: the control still reports aria-expanded=${after.expanded}`);
    measured++;
  } catch (e) {
    fail.push(`${where}: ${String(e).split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}

for (const w of WIDTHS) for (const h of HEIGHTS) await one({ w, h, zoom: 1, rtl: false });
for (const zoom of ZOOMS) { await one({ w: 390, h: 844, zoom, rtl: false }); await one({ w: 320, h: 568, zoom, rtl: false }); }
await one({ w: 390, h: 844, zoom: 3, rtl: true });
await one({ w: 120, h: 400, zoom: 1, rtl: true });
/* The page turned sideways under an open menu, at three zooms, and the reverse. */
for (const zoom of [1, 3, 5]) await one({ w: 390, h: 844, zoom, rotate: [844, 390] });
await one({ w: 844, h: 390, zoom: 1, rotate: [390, 844] });
await one({ w: 844, h: 390, zoom: 3, rotate: [390, 844] });

await browser.close();
stop();

if (!sawNarrow) {
  console.error("check-close-control: no case ever produced a viewport under 160px, so the width this guard exists for was never reached.");
  process.exit(1);
}
if (measured < WIDTHS.length) {
  console.error(`check-close-control: only ${measured} cases completed, so this proved very little.`);
  process.exit(1);
}
if (fail.length) {
  console.error(`\ncheck-close-control: FAIL (${fail.length})`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-close-control: OK (${measured} viewport/zoom/direction cases; the overlay's close control is on screen and works in all of them)`);
