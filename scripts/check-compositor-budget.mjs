// A PHONE HAS A MEMORY BUDGET, AND THIS PAGE HAS TO LIVE INSIDE IT.
//
// WHY THIS EXISTS. Owner, 2026-08-23: "ITS STILL CRASHING, on chrome in ios double tapping a page
// zoom in that section and pressing X crashes the entire chrome", and then "sometime even simply
// pressing X when the 3 lines setting is open crashes the chrome".
//
// Chrome on iOS is WebKit in a WKWebView, and when the WHOLE APP dies rather than one tab, the
// cause is iOS jetsam: the process went over its memory budget. A filter, a backdrop-filter or a
// blend mode forces an offscreen buffer; a blur samples about three sigma past the box on every
// side, so the buffer is larger than the element; and a page-scale zoom multiplies every buffer by
// the SQUARE of the scale. Enumerated from the computed styles and the real boxes, iPhone 390pt at
// deviceScaleFactor 3, this page asked for:
//
//     zoom 1x   145.6 MB      zoom 2x   582.6 MB      zoom 3x   1312 MB
//
// A gigabyte of compositor buffers is not a slow page, it is a dead app -- and 145 MB before any
// zoom is why pressing the X with no zoom at all could do it too: the close un-fixes the body and
// scrolls it back, re-rastering every one of those surfaces at once.
//
// The largest of them rendered NOTHING: `backdrop-filter` is visible only where the element's own
// background lets the backdrop through, and .mission's background is rgb(12,10,21) and #ytStage's
// is rgb(7,5,15) -- fully opaque, no alpha. 53 MB at 1x, 477 MB at 3x, for pixels no one can see.
//
// WHAT IT ASSERTS. On a phone, at 1x and at 3x zoom, menu closed and open: the page's total
// composited buffer demand stays under budget, no single element takes more than its share, and no
// element carries a backdrop-filter behind a background that is fully opaque, which is free to
// remove and can only ever cost.
//
// THE SUBJECT IS COMPUTED: every element on the page is examined for filter, backdrop-filter,
// mix-blend-mode and will-change, and its cost is derived from its own box and its own blur
// radius. A blur added next month is measured the day it is added; nothing here is named.
//
// Run: `node scripts/check-compositor-budget.mjs` (or `npm run test:compositor-budget`).
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];

// Measured headroom, not aspiration. The page sat at 145.6 MB when this was written and needs
// 0 MB at 1x; these leave room for a real effect to be added deliberately without leaving room
// for another accident of this size.
const BUDGET_TOTAL_MB = { 1: 24, 3: 180 };
const BUDGET_ONE_MB = { 1: 12, 3: 90 };

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
  if (!up) { console.error("check-compositor-budget: the dev server never answered."); stop(); process.exit(1); }
}
function stop() {
  if (!server) return;
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
}

const COST = ({ dpr, zoom }) => {
  const px = dpr * zoom;
  const rows = [];
  const radiusOf = (s) => {
    let r = 0;
    for (const m of String(s).matchAll(/blur\(([0-9.]+)px\)/g)) r = Math.max(r, parseFloat(m[1]));
    return r;
  };
  const opaque = (c) => {
    if (!c) return false;
    if (/^rgb\(/.test(c) || /^oklab\((?![^)]*\/)/.test(c) || /^#[0-9a-f]{6}$/i.test(c)) return true;
    const m = c.match(/[\s,\/]([01](?:\.\d+)?)\s*\)$/);
    return !!m && parseFloat(m[1]) >= 0.999;
  };
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const filt = cs.filter && cs.filter !== "none" ? cs.filter : "";
    const backRaw = cs.backdropFilter || cs.webkitBackdropFilter || "";
    const back = backRaw && backRaw !== "none" ? backRaw : "";
    const blend = cs.mixBlendMode && cs.mixBlendMode !== "normal" ? cs.mixBlendMode : "";
    const wc = cs.willChange && cs.willChange !== "auto" ? cs.willChange : "";
    if (!filt && !back && !blend && !wc) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const grow = 3 * Math.max(radiusOf(filt), radiusOf(back));
    const w = r.width + grow * 2, h = r.height + grow * 2;
    const buffers = (filt ? 2 : 0) + (back ? 2 : 0) + (blend ? 1 : 0) + (wc && !filt && !back ? 1 : 0);
    rows.push({
      what: (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "") || el.tagName,
      box: [Math.round(r.width), Math.round(r.height)],
      why: [filt && "filter", back && "backdrop-filter", blend && ("blend:" + blend), wc && ("will-change:" + wc)].filter(Boolean).join(" + "),
      mb: +(w * px * h * px * 4 * Math.max(1, buffers) / 1048576).toFixed(1),
      wastedBackdrop: !!back && opaque(cs.backgroundColor),
      bg: cs.backgroundColor,
    });
  }
  rows.sort((a, b) => b.mb - a.mb);
  return { rows, total: +rows.reduce((s, r) => s + r.mb, 0).toFixed(1) };
};

const browser = await chromium.launch();
let measured = 0;
for (const menuOpen of [false, true]) {
  for (const zoom of [1, 3]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(base + "/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1400);
      try { await page.evaluate(() => document.getElementById("consentReject")?.click()); } catch {}
      await page.waitForTimeout(200);
      if (menuOpen) {
        await page.evaluate(() => document.getElementById("navToggle")?.click());
        await page.waitForTimeout(400);
      }
      const r = await page.evaluate(COST, { dpr: 3, zoom });
      measured++;
      const where = `iPhone 390pt DPR3, zoom ${zoom}x, menu ${menuOpen ? "open" : "closed"}`;
      if (r.total > BUDGET_TOTAL_MB[zoom]) {
        const top = r.rows.slice(0, 4).map((x) => `${x.what} ${x.mb}MB (${x.why})`).join("; ");
        fail.push(`${where}: the page asks the compositor for ${r.total} MB, over its ${BUDGET_TOTAL_MB[zoom]} MB budget. Largest: ${top}`);
      }
      for (const x of r.rows) {
        if (x.mb > BUDGET_ONE_MB[zoom]) {
          fail.push(`${where}: ${x.what} alone asks for ${x.mb} MB (${x.box[0]}x${x.box[1]}, ${x.why}), over the ${BUDGET_ONE_MB[zoom]} MB a single element may take`);
        }
        if (x.wastedBackdrop) {
          fail.push(`${where}: ${x.what} has a backdrop-filter behind an OPAQUE background (${x.bg}), so it renders nothing at all and costs ${x.mb} MB`);
        }
      }
    } catch (e) {
      fail.push(`zoom ${zoom}x menu ${menuOpen}: ${String(e).split("\n")[0]}`);
    }
    await ctx.close();
  }
}
await browser.close();
stop();

if (measured < 4) {
  console.error(`check-compositor-budget: only ${measured} of 4 states were measured, so this proved little.`);
  process.exit(1);
}
if (fail.length) {
  console.error(`\ncheck-compositor-budget: FAIL (${fail.length})`);
  for (const f of [...new Set(fail)]) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-compositor-budget: OK (4 phone states measured; the page stays inside its buffer budget at 1x and 3x zoom)`);
