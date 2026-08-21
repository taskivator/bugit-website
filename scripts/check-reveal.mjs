// A REVEAL MUST REACH THE READER.
//
// WHY THIS EXISTS. Owner, 2026-08-21: "in mobile view the boxes: runs in vs code, support and
// Faq in the main page have dimmed color compared to the rest." They were: measured at 390x844,
// "Runs in VS Code" peaked at opacity 0.569, FAQ at 0.708 and Support at 0.308, and each peak
// was reached at scrollY=0 and never moved again.
//
// The cause is one declaration with no visible connection to any of it. These cards reveal on
// `animation-timeline:view()`, and a view() timeline is resolved against the element's NEAREST
// SCROLL CONTAINER -- not against the page. Both grids carry `overflow:hidden` so their cells
// clip to the rounded corner, and `overflow:hidden` makes a box a scroll container even when
// nothing in it can meaningfully scroll. The timeline that was meant to be driven by the reader
// was therefore attached to a box with 14px of scroll range: it can never reach the end of the
// animation, so each card is stranded at whatever progress its position in that container
// resolves to. The ones near the top overshoot the range end and look perfect. The ones at the
// bottom do not, and stay part-drawn for ever.
//
// `check-motion.mjs` ALREADY CLAIMS THIS GROUND -- "3. Scroll reveals settle. After scrolling
// past a section, nothing in it is still partway" -- and it passes on the broken tree, with its
// own negative control firing. It is not dead; it cannot see this failure, for three reasons
// that are each individually reasonable:
//   * it renders one viewport (1440x900), and this defect's severity is a function of how tall
//     the container is, so it is worst on a phone and mildest on a desktop;
//   * it reads only what is on screen after scrolling each section into view, and the cards
//     that fail are the ones at the BOTTOM of a container -- exactly what is below the fold
//     when that container's top is brought into view;
//   * its threshold is opacity < 0.9, and a card stranded at 0.93 is visibly grey beside a
//     neighbour at 1.0.
// Rather than loosen a guard that is right about its own subject, this one takes the subject the
// other cannot: every width, every language, every reveal on the page, and the PEAK over the
// whole scroll rather than the value at one position.
//
// WHAT IT ASSERTS. Two halves: the first is the mechanism, the second is what the reader sees.
// Either can fail without the other, which is why neither is dropped.
//
//   1. EVERY SCROLL-DRIVEN ANIMATION CAN REACH THE END OF ITS RANGE. Measured, not inferred:
//      the page is swept top to bottom and each animation's peak progress recorded. Anything
//      that cannot reach 1.0 anywhere the reader can scroll is reported together with the
//      scroller that drives it and that scroller's range, because the range is the diagnosis.
//   2. EVERY FADE-IN FINISHES. For every element whose scroll-driven animation touches opacity,
//      peak opacity across the entire document scroll must be >= 0.99.
//
// Pseudo-elements are excluded from both. The report's own sticky-head band is a pseudo on a
// nested scroller and is DESIGNED to sit partway -- it fades in only once content is underneath
// it. A pseudo-element is decoration; an element is content.
//
// THE SUBJECT IS COMPUTED, NEVER TYPED. The animations are read from the rendered page via
// document.getAnimations(), and the languages out of app.js. Naming the three cards the owner
// happened to notice would pass the day a fourth is added.
//
// Run: `node scripts/check-reveal.mjs` (or `npm run test:reveal`). Optional `--lang de` /
// `--width 390` to narrow while debugging.
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const pick = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const fail = [];
const note = (m) => console.log("  " + m);

/* ---------- the subject, read out of the product ------------------------- */
const app = readFileSync(join(ROOT, "app.js"), "utf8");
const langMatch = app.match(/const languages=(\[\[.*?\]\]);/s);
if (!langMatch) throw new Error("could not read the language table out of app.js");
const ALL_LANGS = JSON.parse(langMatch[1].replace(/'/g, '"')).map(([code]) => code);

// The defect's severity is a function of container height, so the phone is where it bites and
// the desktop is where it hides. Every language is rendered at both ends, because the language
// decides how tall a card is and therefore which card is the one left short.
const MATRIX = [
  ...ALL_LANGS.map((l) => ({ lang: l, size: [390, 844] })),
  ...ALL_LANGS.map((l) => ({ lang: l, size: [1440, 900] })),
  { lang: "en", size: [768, 1024] },
  { lang: "en", size: [1280, 900] },
  { lang: "en", size: [1920, 1080] },
];
const langFilter = pick("--lang");
const widthFilter = pick("--width");
const subject = MATRIX.filter(
  (c) => (!langFilter || c.lang === langFilter) && (!widthFilter || String(c.size[0]) === widthFilter)
);
if (!subject.length) { console.error("check-reveal: the filters selected nothing to measure."); process.exit(1); }

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
  console.error(`check-reveal: the dev server exited (${serverExit}) before a single page was rendered.`);
  process.exit(1);
}

/* ---------- the probe, run inside the page ------------------------------- */
// One pass returns, for every scroll-driven animation on an element: a stable key, how far
// along it is, what drives it, how far that thing can scroll, and the element's opacity.
// Keys are written onto the element so the sweep can accumulate a peak per animation.
const PROBE = () => {
  const name = (el) => {
    if (!el) return "null";
    if (el === document.scrollingElement || el === document.documentElement) return "<page>";
    const cls = typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/).join(".") : "";
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + cls;
  };
  const out = [];
  let n = 0;
  for (const an of document.getAnimations()) {
    const tl = an.timeline;
    if (!tl || !("source" in tl)) continue;              // a document timeline: time-based, not ours
    if (an.effect && an.effect.pseudoElement) continue;  // decoration, not content
    const t = an.effect && an.effect.target;
    if (!t || !t.isConnected) continue;
    if (!t.dataset.revealKey) t.dataset.revealKey = "rk" + ++n;
    let progress = null;
    try { progress = an.effect.getComputedTiming().progress; } catch {}
    if (progress == null && "overallProgress" in an) progress = an.overallProgress;
    let touchesOpacity = false;
    try { touchesOpacity = an.effect.getKeyframes().some((k) => "opacity" in k); } catch {}
    const src = tl.source;
    const isPage = src === document.scrollingElement || src === document.documentElement;
    const parent = t.parentElement;
    const where = parent && typeof parent.className === "string"
      ? parent.className.trim().split(/\s+/)[0] + "#" + ([...parent.children].indexOf(t) + 1) : "?";
    out.push({
      key: t.dataset.revealKey + "/" + (an.animationName || "?"),
      progress: progress == null ? 0 : progress,
      opacity: +getComputedStyle(t).opacity,
      touchesOpacity,
      scroller: name(src),
      range: isPage
        ? document.documentElement.scrollHeight - window.innerHeight
        : src ? src.scrollHeight - src.clientHeight : 0,
      label: `${where} <${t.tagName.toLowerCase()}> "${(t.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30)}"`,
    });
  }
  return out;
};

/* ---------- measure ------------------------------------------------------ */
const browser = await chromium.launch();
let cells = 0, animations = 0;

// One cell of the matrix. `inject` lets the negative control recreate the defect.
//
// The injection is served AS PART OF styles.css, not added to a rendered page with addStyleTag.
// A view() timeline resolves its source when the animation is created and Chromium does not
// re-attach it when `overflow` changes afterwards, so a late rule changes nothing and the
// control reports a clean sweep over a page it never actually broke. Rewriting the stylesheet on
// the wire puts the rule in the first cascade, which is the only place it counts.
async function measure(page, lang, [w, h], inject) {
  if (inject) {
    await page.route("**/styles.css", async (route) => {
      const res = await route.fetch();
      route.fulfill({ response: res, body: (await res.text()) + "\n" + inject });
    });
  }
  await page.setViewportSize({ width: w, height: h });
  await page.goto(base + "/", { waitUntil: "load" });
  try { await page.click("#consentReject", { timeout: 1500 }); } catch {}
  if (lang !== "en") {
    await page.click("#langButton");
    await page.click(`#langList button[data-lang="${lang}"]`);
    await page.waitForTimeout(200);
    await page.reload({ waitUntil: "load" });
  }
  await page.waitForTimeout(900);

  const peak = new Map();
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  const stops = [];
  for (let y = 0; y < docH; y += Math.max(200, Math.round(h * 0.6))) stops.push(y);
  stops.push(docH, docH);          // and rest at the very bottom, which is as far as a reader
                                   // near the end of the page can get
  for (const y of stops) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(60);
    for (const r of await page.evaluate(PROBE)) {
      const prev = peak.get(r.key);
      if (!prev) { peak.set(r.key, { ...r }); continue; }
      if (r.progress > prev.progress) { prev.progress = r.progress; prev.scroller = r.scroller; prev.range = r.range; }
      if (r.opacity > prev.opacity) prev.opacity = r.opacity;
    }
  }
  if (inject) await page.unroute("**/styles.css");

  const found = [];
  for (const r of peak.values()) {
    if (r.progress < 0.999) {
      found.push(
        `${r.label} never finishes its reveal: peak progress ${r.progress.toFixed(3)} anywhere in ` +
        `the page's scroll. It is driven by ${r.scroller}, which has ${r.range}px of scroll range. ` +
        (r.scroller === "<page>" ? "" :
          `A reveal is meant to be driven by the reader's scroll; a nested box becomes its timeline ` +
          `the moment it is given overflow:hidden. If that overflow is only there to clip the ` +
          `corners, use overflow:clip -- it clips identically and creates no scroll container.`)
      );
    }
    if (r.touchesOpacity && r.opacity < 0.99) {
      found.push(
        `${r.label} never becomes fully visible: peak opacity ${r.opacity.toFixed(3)}. The reader ` +
        `sees it dimmed beside its neighbours.`
      );
    }
  }
  return { found, n: peak.size };
}

const page = await browser.newPage();
for (const c of subject) {
  const { found, n } = await measure(page, c.lang, c.size);
  cells++; animations += n;
  if (n === 0) {
    fail.push(`[${c.lang} ${c.size[0]}x${c.size[1]}] no scroll-driven reveal found at all: the scan ` +
              `did not run, and an empty sweep must never read as a clean one.`);
  }
  for (const f of found) fail.push(`[${c.lang} ${c.size[0]}x${c.size[1]}] ${f}`);
}
note(`${cells} render(s) swept, ${animations} scroll-driven reveal(s) measured across them`);

/* ---------- the negative control ----------------------------------------- */
// Put the scroll container back and require BOTH assertions to fire. Without this, a scan that
// quietly stopped finding subjects would report a clean page for ever.
const ctl = await measure(page, "en", [390, 844], ".doc-cards{overflow:hidden !important}");
const sawStalled = ctl.found.some((f) => f.includes("never finishes its reveal"));
const sawDim = ctl.found.some((f) => f.includes("never becomes fully visible"));
if (!sawStalled) fail.push("NEGATIVE CONTROL DID NOT FIRE: shipping overflow:hidden back onto .doc-cards left every reveal reaching progress 1, so this check cannot see the mechanism.");
if (!sawDim) fail.push("NEGATIVE CONTROL DID NOT FIRE: shipping overflow:hidden back onto .doc-cards left no card measurably dim, so this check cannot see the symptom.");
if (sawStalled && sawDim) note(`negative control fired: ${ctl.found.length} finding(s) when .doc-cards is made a scroll container again`);

await browser.close();
server.kill();
if (process.platform === "win32" && server.pid) {
  try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
}

if (fail.length) {
  for (const f of fail) console.error("FAIL: " + f);
  console.error(`\ncheck-reveal: ${fail.length} finding(s).`);
  process.exit(1);
}
console.log(
  "check-reveal OK: every scroll-driven reveal reaches the end of its range and finishes fully " +
  "opaque -- in every language, at every width."
);
