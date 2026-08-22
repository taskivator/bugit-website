// THE DOCUMENTATION'S CHROME MUST NOT LIE, AND MUST NOT MOVE.
//
// WHY THIS EXISTS. Two things the owner reported on 2026-08-23, both about the Support page and
// both caused by the same fact about it: it is the one documentation route short enough to fit
// on a screen.
//
//   "in the support page the thin bar at the top is there as if the user is at the bottom of
//   the page." The header draws a one-pixel reading position on its ::after, driven by
//   `animation-timeline: scroll()`. A scroll timeline on a page that cannot scroll has a
//   zero-length range and is INACTIVE: the animation then contributes nothing, `both` or not,
//   and the element renders at whatever the stylesheet declares. Nothing was declared, so it
//   rendered at its natural scaleX(1) -- a full bar, on a page the reader had not moved.
//   MEASURED at 1440x1600: `transform: none` on support, `matrix(0,0,0,1,0,0)` everywhere else.
//
//   "in the documentation section when i click on support the page moves from left to right and
//   it doesnt happen with the rest." Opening the one route that does not scroll takes the
//   scrollbar away, the viewport gets ~15px wider, and a centred layout slides right by half of
//   it. `scrollbar-gutter: stable` reserves the space so nothing can move.
//
// WHAT IT ASSERTS, for every documentation route the rendered nav offers -- computed, never
// typed, so a route added later is covered without anyone remembering this file:
//   1. at the top of the page the reading position reads 0%, whether or not the route scrolls;
//   2. the content column starts at the same x on every route, at every height measured.
// Two viewport heights, chosen so that at least one route cannot scroll at the taller one.
//
// A HEADLESS BROWSER CANNOT SEE THE SECOND ONE BY ITSELF: it paints overlay scrollbars, so the
// gutter is 0 whatever the page does. The x-position assertion therefore catches the DECLARATION
// going away (the layout would move for the reader) rather than the movement itself, and the
// computed `scrollbar-gutter` is asserted alongside it.
//
// Run: `node scripts/check-docs-chrome.mjs` (or `npm run test:docs-chrome`).
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
  console.error(`check-docs-chrome: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}
const done = () => {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {} }
};

const MEASURE = () => {
  const cs = getComputedStyle(document.querySelector("header.nav.shell"), "::after");
  const de = document.documentElement;
  const m = cs.transform.match(/matrix\(([^)]+)\)/);
  return {
    // `none` means the animation is contributing nothing and the bar is at full width.
    progress: m ? Number(m[1].split(",")[0]) : (cs.transform === "none" ? 1 : null),
    hidden: cs.display === "none",
    scrollable: de.scrollHeight - window.innerHeight,
    gutter: getComputedStyle(de).scrollbarGutter,
    contentX: Math.round((document.getElementById("docContent") || document.body).getBoundingClientRect().x),
  };
};

let measured = 0, sawUnscrollable = false;
for (const [engine, type] of [["chromium", chromium], ["webkit", webkit]]) {
  let browser;
  try {
    browser = await type.launch();
    for (const [w, h] of [[1440, 1600], [1440, 900]]) {
      const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
      await page.goto(base + "/#/docs", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      try { await page.locator("#consentReject").click({ timeout: 2500 }); } catch {}
      // The subject, out of the rendered page: whatever the documentation nav offers.
      const routes = await page.evaluate(() =>
        [...document.querySelectorAll("#docNav a")].map((a) => a.getAttribute("href")).filter(Boolean));
      if (routes.length < 4) { fail.push(`${engine} ${w}x${h}: only ${routes.length} documentation routes found`); await page.close(); continue; }
      const xs = new Map();
      for (const href of routes) {
        await page.evaluate((href) => { location.hash = href; }, href);
        await page.waitForTimeout(800);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForTimeout(200);
        const m = await page.evaluate(MEASURE);
        measured++;
        if (m.scrollable <= 0) sawUnscrollable = true;
        if (!m.hidden && !(m.progress <= 0.02)) {
          fail.push(`${engine} ${w}x${h} ${href}: the reading position reads ${(m.progress * 100).toFixed(0)}% at the top of a page with ${m.scrollable}px of scroll`);
        }
        if (m.gutter !== "stable") {
          fail.push(`${engine} ${w}x${h} ${href}: scrollbar-gutter is "${m.gutter}", so the layout moves sideways when a route stops scrolling`);
        }
        xs.set(href, m.contentX);
      }
      const distinct = new Set(xs.values());
      if (distinct.size > 1) {
        fail.push(`${engine} ${w}x${h}: the content column starts at ${[...distinct].join(" / ")}px depending on the route -- ${[...xs].map(([k, v]) => k + "=" + v).join(", ")}`);
      }
      console.log(`  ${engine} ${w}x${h}: ${routes.length} routes, content column at ${[...distinct].join("/")}px`);
      await page.close();
    }
    await browser.close();
  } catch (e) {
    fail.push(`${engine}: ${String(e).split("\n")[0]}`);
    try { await browser?.close(); } catch {}
  }
}

done();
if (!measured) { console.error("check-docs-chrome: nothing was measured."); process.exit(1); }
if (!sawUnscrollable) {
  // The defect only exists on a route that cannot scroll. If the tall viewport no longer
  // produces one, this guard has quietly stopped testing anything.
  fail.push("no documentation route was short enough to fit the tall viewport, so the case this guard exists for was never reached");
}
if (fail.length) {
  console.error(`\ncheck-docs-chrome: FAIL (${fail.length})`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-docs-chrome: OK (${measured} route/viewport/engine measurements)`);
