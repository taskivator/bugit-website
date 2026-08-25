// A PINCH MUST NOT CLOSE WHAT THE READER JUST OPENED.
//
// WHY THIS EXISTS. Owner, 2026-08-25: "the 3 lines menu on mobile view sometimes closes on its
// own when tapped once."
//
// `getBoundingClientRect()` is always in LAYOUT-viewport coordinates. `window.innerWidth` and
// `window.innerHeight` are not the same thing everywhere: in Safari, and therefore in every
// browser on iOS, they report the VISUAL viewport, which shrinks as the reader pinches in. The
// mobile menu's own safety check compared one against the other, so on a zoomed reader the
// hamburger measured as off-screen and the overlay closed itself inside the same tap that had
// just opened it. MEASURED at iPhone 14 size, where the toggle's right edge sits at 374 CSS px:
//
//     pinch scale   window.innerWidth   documentElement.clientWidth   menu after one tap
//        1.0              390                      390                open
//        1.15             339                      390                CLOSED ITSELF
//        1.4              279                      390                CLOSED ITSELF
//        2.0              195                      390                CLOSED ITSELF
//
// "Sometimes" is exactly right: it needs any residual pinch zoom, and nothing else.
//
// HOW THE PINCH IS MODELLED, AND WHY NOT WITH A REAL ONE. The first version of this drove a
// genuine page scale through `Emulation.setPageScaleFactor`. It reproduced the defect, but it
// also breaks the harness: with the page scaled, Playwright's own hit-testing lands on the wrong
// element, so every control below the fold timed out as "unreachable" and the guard was
// measuring its own probe. What the product actually reads is two numbers, so the two numbers
// are what this models: `innerWidth`/`innerHeight` are redefined to report the visual viewport
// at a given pinch scale, exactly as Safari does, while the layout stays where it is -- which is
// precisely what a pinch does. Coordinates stay 1:1, so a real touch tap still lands where the
// reader would put a finger. See https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
// and https://www.quirksmode.org/mobile/viewports2.html for the behaviour being modelled.
//
// WHAT IT ASSERTS. The subject is COMPUTED: every visible control that declares itself a
// disclosure (`aria-expanded` with `aria-controls`) is tapped once at phone size, at four pinch
// scales, in both engines, and must report the OPPOSITE state afterwards and still be in it once
// everything has settled. Opposite rather than expanded: the report's step list starts open on a
// desktop and collapsed on a phone, and a control that always works is the claim either way.
//
// THE NEGATIVE CONTROL RE-INTRODUCES THE DEFECT rather than trusting that this guard can see it.
// app.js is served back mutated, with the layout measurement swapped for the visual one it used
// to use, and the mobile menu is then required to close itself. If it does not, the mutation is
// no longer reaching the code under test and this guard is measuring nothing, which is reported
// as a failure rather than passed over in silence.
//
// AND THE PROTECTION IT REPLACES MUST SURVIVE. The measurement exists because a reader can be
// locked behind an overlay whose only close control has left the screen. That is a LAYOUT
// condition, so the last case builds a real one -- open the menu on a scrolled page, then take
// away the header's pin -- and requires the overlay to give the page back.
//
// Run: `node scripts/check-zoomed-overlay.mjs` (or `npm run test:zoomed-overlay`).
// Needs both engines: `npx playwright install chromium webkit`.
import { chromium, webkit, devices } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

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
  await new Promise((r) => setTimeout(r, 200));
}
if (serverExit) { console.error(`check-zoomed-overlay: the dev server exited (${serverExit})`); process.exit(1); }

const DEVICE = devices["iPhone 14"];
const SCALES = [1, 1.15, 1.4, 2];

/* Safari's viewport metrics under a pinch, installed before any page script runs. */
/* documentElement is read INSIDE the getter: an init script runs before the document element
   exists, so capturing it here would install a getter over null. */
const pinch = (scale) => `(() => {
  Object.defineProperty(window, 'innerWidth',  { get: () => Math.round((document.documentElement || {clientWidth: 0}).clientWidth  / ${scale}) });
  Object.defineProperty(window, 'innerHeight', { get: () => Math.round((document.documentElement || {clientHeight: 0}).clientHeight / ${scale}) });
})()`;

let browser = null;

/* THE SUBJECT IS COMPUTED. Anything that declares itself a disclosure is one, so a control added
   later is measured rather than missed. */
const disclosures = async () => {
  const ctx = await browser.newContext({ ...DEVICE, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(700);
  const found = await page.evaluate(() =>
    [...document.querySelectorAll("[aria-expanded][aria-controls]")]
      .filter((el) => { const r = el.getBoundingClientRect(); return el.id && r.width > 0 && r.height > 0; })
      .map((el) => ({ id: el.id, controls: el.getAttribute("aria-controls") })));
  await ctx.close();
  return found;
};

/* One tap on one control, on a fresh page. Returns what the page did. */
const tapOnce = async ({ id }, { scale = 1, mutate, scrollTo, unpinHeader } = {}) => {
  const ctx = await browser.newContext({ ...DEVICE, hasTouch: true });
  if (mutate) {
    const src = readFileSync(join(ROOT, "app.js"), "utf8");
    const swapped = mutate(src);
    if (swapped === src) { await ctx.close(); return { error: "the negative control's mutation did not apply to app.js" }; }
    await ctx.route("**/app.js", (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body: swapped }));
  }
  if (scale !== 1) await ctx.addInitScript(pinch(scale));
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(700);
  if (scrollTo) { await page.evaluate((y) => window.scrollTo(0, y), scrollTo); await page.waitForTimeout(250); }

  /* READ THE STARTING STATE ON THIS PAGE, NOT ANOTHER ONE. The report's step list is refused
     while the instrument is still writing (`aria-disabled`), on its own schedule, so a state
     captured while enumerating the subjects belongs to a different page at a different moment. */
  const before = await page.evaluate((s) => {
    const el = document.getElementById(s);
    return el ? { was: el.getAttribute("aria-expanded"), disabled: el.getAttribute("aria-disabled") === "true" } : null;
  }, id);
  if (!before) { await ctx.close(); return { skipped: "control is not on this page" }; }
  if (before.disabled) { await ctx.close(); return { skipped: "control declares itself unavailable right now" }; }

  /* PRESS IT WHERE THE READER SEES IT: locator.tap() is a real touch tap that scrolls the
     control into view first and refuses to press what cannot receive the event, so a genuine
     obstruction is reported rather than silently absorbed by whatever is on top. */
  try {
    await page.locator("#" + id).tap({ timeout: 8000 });
  } catch (e) {
    await ctx.close();
    return { blocked: String(e).replace(/\s+/g, " ").slice(0, 140) };
  }
  await page.waitForTimeout(800);

  if (unpinHeader) {
    /* A GENUINE LAYOUT LOCKOUT, built the way the real one was: the scroll lock is
       `body{position:fixed;top:-<scrollY>}`, so a header that is not pinned to the viewport
       lands at its document offset, off the top of the screen. Take the pin away from a menu
       opened after scrolling and the close control really is gone. */
    await page.addStyleTag({ content: "body.menu-open header.nav.shell{position:static!important}" });
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForTimeout(800);
  }

  const out = await page.evaluate((s) => ({
    expanded: (document.getElementById(s) || {}).getAttribute
      ? document.getElementById(s).getAttribute("aria-expanded") : null,
    locked: document.body.classList.contains("menu-open"),
    innerWidth: window.innerWidth,
    layoutWidth: document.documentElement.clientWidth,
  }), id);
  await ctx.close();
  return { ...out, was: before.was };
};

/* ---------- 1. one tap must change the state, and it must stay changed ----- */
let cases = 0, skipped = 0, subjects = [];
for (const [ename, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  browser = await engine.launch();
  subjects = await disclosures();
  if (!subjects.length) fail.push(`${ename}: no disclosure control was found at phone size, so nothing was measured`);
  else if (ename === "chromium") note(`${subjects.length} disclosure control(s) at ${DEVICE.viewport.width}px: ${subjects.map((s) => s.id).join(", ")}`);

  for (const d of subjects) {
    for (const scale of SCALES) {
      const r = await tapOnce(d, { scale });
      if (r.skipped) { skipped++; continue; }
      cases++;
      if (r.blocked) { fail.push(`${ename}: #${d.id} could not be tapped at pinch scale ${scale}: ${r.blocked}`); continue; }
      const want = r.was === "true" ? "false" : "true";
      if (r.expanded !== want) {
        fail.push(`${ename}: #${d.id} started aria-expanded="${r.was}" and still reads "${r.expanded}" after ` +
          `ONE tap at pinch scale ${scale} (innerWidth ${r.innerWidth}, layout width ${r.layoutWidth})`);
      }
    }
  }

  /* ---------- 2. the negative control: put the defect back ----------------- */
  const MUTATE = (src) => src.replace(
    "const vw=()=>document.documentElement.clientWidth||window.innerWidth||0;",
    "const vw=()=>window.innerWidth||document.documentElement.clientWidth||0;");
  const nav = subjects.find((s) => s.id === "navToggle");
  if (!nav) fail.push(`${ename}: the mobile menu toggle (#navToggle) was not among the disclosures, so the negative control cannot run`);
  else {
    const neg = await tapOnce(nav, { scale: 1.4, mutate: MUTATE });
    if (neg.error) fail.push(`${ename} negative control: ${neg.error}`);
    else if (neg.expanded === "true") {
      fail.push(`${ename}: negative control did NOT fire -- with the visual-viewport measurement put back the ` +
        "menu stayed open at pinch scale 1.4, so this guard cannot see the defect it was written for");
    } else note(`${ename}: negative control fired (innerWidth ${neg.innerWidth}, layout width ${neg.layoutWidth})`);

    /* ---------- 3. the lockout this measurement exists for still works ----- */
    const locked = await tapOnce(nav, { scrollTo: 900, unpinHeader: true });
    if (locked.expanded === "true" || locked.locked) {
      fail.push(`${ename}: with the header un-pinned on a scrolled page the overlay stayed open and the page ` +
        "stayed locked; the reader has no close control on screen and no way to scroll to one");
    } else note(`${ename}: a real layout lockout still closes the overlay and gives the page back`);
  }

  await browser.close();
}

server.kill();

if (fail.length) {
  console.error("check-zoomed-overlay FAILED");
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-zoomed-overlay: OK (${cases} tap(s) across ${subjects.length} control(s) x ${SCALES.length} pinch scales ` +
  `x 2 engines; ${skipped} skipped as unavailable; negative control fired in both; the layout lockout still gives the page back)`);
