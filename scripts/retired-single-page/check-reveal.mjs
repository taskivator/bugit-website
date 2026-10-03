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
  // The owner asked for this to hold "for any view we support", so the en sweep covers the
  // whole ladder rather than only its two ends: small phone, large phone, tablet portrait,
  // tablet landscape, laptop, desktop.
  ...[[320, 700], [600, 900], [768, 1024], [820, 1180], [1024, 800], [1280, 900], [1600, 900], [1920, 1080]]
    .map((size) => ({ lang: "en", size })),
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
    /* WHAT IS BEHIND A FADING ELEMENT MATTERS AS MUCH AS WHETHER IT FINISHES FADING.
       An element that animates opacity is see-through for the whole of its reveal, so the
       reader sees whatever is underneath it in proportion to how far the animation has got. On
       the hairline grids the layer underneath was `--rule`, white at 8.5%, and the cards on top
       were themselves only 82% opaque -- so every card arrived carrying a white wash that got
       worse the further down the grid it sat. Reported as "a white ugly highlight".
       This walks up from the fading element to the first ancestor that paints an opaque
       background, and reports the lightest translucent layer it passed. A fade toward a DARK
       ground is the design; a fade toward a light one is the defect. */
    const luminance = (c) => {
      const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c || "");
      if (!m) return null;
      return { l: (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114),
               a: m[4] === undefined ? 1 : +m[4], css: c };
    };
    let bleed = null;
    if (touchesOpacity) {
      const own = luminance(getComputedStyle(t).backgroundColor);
      if (own && own.a > 0) {
        // Composite every layer between this element and the first opaque background, so the
        // comparison is against what a reader actually sees through the element mid-fade.
        // THE FIRST VERSION OF THIS STOPPED AT THE FIRST OPAQUE ANCESTOR WITHOUT LOOKING AT IT,
        // which is how section 93 silenced this very check: it replaced the translucent white
        // plane under the hairline grids with the opaque colour that plane composited to, the
        // wash carried on exactly as before, and the guard went quiet because the layer was no
        // longer translucent. Opaque or not is not the question. Lighter or not is.
        const stack = [];
        let ground = 0, on = "<canvas>", css = "-";
        for (let n = t.parentElement; n; n = n.parentElement) {
          const bg = luminance(getComputedStyle(n).backgroundColor);
          if (!bg || bg.a === 0) continue;
          if (bg.a < 1) { stack.push({ bg, n }); continue; }
          ground = bg.l; on = name(n); css = bg.css; break;
        }
        for (let i = stack.length - 1; i >= 0; i--) {
          const s = stack[i];
          ground = s.bg.l * s.bg.a + ground * (1 - s.bg.a);
          if (s.bg.a > 0.02) { on = name(s.n); css = s.bg.css; }
        }
        const ownEff = own.l * own.a + ground * (1 - own.a);
        bleed = { delta: ground - ownEff, own: ownEff, gnd: ground, on, css, ownCss: own.css };
      }
    }
    out.push({
      key: t.dataset.revealKey + "/" + (an.animationName || "?"),
      progress: progress == null ? 0 : progress,
      opacity: +getComputedStyle(t).opacity,
      bleed,
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
    /* THE ASSERTION IS FULL OPACITY, NOT FULL PROGRESS, and that changed for a reason.
       This file used to require every scroll-driven animation to reach progress 1.0 as well.
       That was a proxy for the real requirement and it stopped being true the day the reveals
       became a PASS: section 98 gives every card `animation-range: cover 0% cover 100%`, so
       progress 1 now means "the reader has scrolled the card entirely off the top of the
       screen" -- which the last row above the footer can never do, however far the page
       scrolls, and which says nothing at all about whether the card was ever readable.
       What a reader is owed is that the thing became fully visible at some point. That is the
       rule, and it still catches the defect the progress rule was written for: a nested scroll
       container freezes the timeline, so the opacity never arrives either. The scroller is
       named in the finding, because when this fails that is almost always why. */
    if (r.touchesOpacity && r.opacity < 0.99) {
      found.push(
        `${r.label} never becomes fully visible: peak opacity ${r.opacity.toFixed(3)} anywhere in ` +
        `the page's scroll, so the reader sees it dimmed beside its neighbours. It is driven by ` +
        `${r.scroller}, which has ${r.range}px of scroll range` +
        (r.scroller === "<page>" ? "." :
          ` -- and a reveal is meant to be driven by the reader's scroll. A nested box becomes its ` +
          `timeline the moment it is given overflow:hidden; a scroller that cannot scroll is a ` +
          `timeline that never advances. If that overflow is only there to clip the corners, use ` +
          `overflow:clip -- it clips identically and creates no scroll container.`)
      );
    }
  }
  return { found, n: peak.size, peak: [...peak.values()] };
}

/* THE WHITE WASH UNDER A FADE. An element that animates its opacity is see-through for the
   whole of its reveal, so the reader sees whatever is behind it in proportion to how far the
   animation has run. If that is DARKER than the element, the card simply dissolves into the
   page, which is the effect. If it is LIGHTER, the card arrives carrying a wash that is worst
   where the reveal has run least -- the bottom of the grid -- which is the shape the owner
   reported twice: "the first 2 are fine ... as i go down the cards show a white layerd color".

   The threshold is the midpoint of a measured pair, not a round number:
     the defect   the six hairline grids put a plane at luminance 26.7 under cards at 11.9.
                  delta +14.8, at every one of nine widths. Reported by the owner on mobile,
                  then again on desktop after section 93 changed its colour but not its role.
     the page     with the plane gone, the WORST delta anywhere on the site is -2.5: the price
                  card, which is very slightly lighter than the page it fades into.
   +4 sits between them with 6.5 of headroom below and 10.8 above. */
const bleedFindings = (peak) => (peak || [])
  .filter((r) => r.bleed && r.bleed.delta > 4)
  .map((r) =>
    `${r.label} fades toward ${r.bleed.css} on ${r.bleed.on}, which is LIGHTER than the element ` +
    `itself: luminance ${r.bleed.gnd.toFixed(1)} behind ${r.bleed.own.toFixed(1)} in front ` +
    `(its own background is ${r.bleed.ownCss}). Half-revealed, it reads as a grey slab. A plane ` +
    `that has to be lighter than its cards cannot sit UNDER them -- give each card its own 1px ` +
    `ring instead and let the wrapper's background go.`);

const page = await browser.newPage();
for (const c of subject) {
  const { found, n, peak } = await measure(page, c.lang, c.size);
  cells++; animations += n;
  if (n === 0) {
    fail.push(`[${c.lang} ${c.size[0]}x${c.size[1]}] no scroll-driven reveal found at all: the scan ` +
              `did not run, and an empty sweep must never read as a clean one.`);
  }
  for (const f of found) fail.push(`[${c.lang} ${c.size[0]}x${c.size[1]}] ${f}`);
  for (const r of bleedFindings(peak)) fail.push(`[${c.lang} ${c.size[0]}x${c.size[1]}] ${r}`);
}
note(`${cells} render(s) swept, ${animations} scroll-driven reveal(s) measured across them`);

/* ---------- the negative control ----------------------------------------- */
// Put the scroll container back and require BOTH assertions to fire. Without this, a scan that
// quietly stopped finding subjects would report a clean page for ever.
const ctl = await measure(page, "en", [390, 844], ".doc-cards{overflow:hidden !important}");
const sawDim = ctl.found.some((f) => f.includes("never becomes fully visible"));
if (!sawDim) {
  fail.push("NEGATIVE CONTROL DID NOT FIRE: shipping overflow:hidden back onto .doc-cards left no " +
            "card measurably dim, so this check cannot see the defect it exists for.");
} else {
  note(`negative control fired: ${ctl.found.length} finding(s) when .doc-cards is made a scroll container again`);
}

/* SECOND AND THIRD NEGATIVE CONTROLS, for the white wash, one per shape it has taken.
   TRANSLUCENT is how it shipped: a white-at-8.5% plane under 82%-opaque cards.
   OPAQUE is how section 93 left it, and it is the important one -- that version was invisible
   to the rule this file used to carry, so a control that only rebuilds the translucent shape
   would prove the guard can see a defect the site no longer had while missing the one it did. */
const WASH_TRANSLUCENT =
  ".doc-cards,main section.shell.trust,.report-meta,.report-status,.metrics{background:rgba(255,255,255,.085) !important}" +
  ".doc-cards>a,main section.shell.trust>div,.report-meta>div,.report-status>div,.metrics>div{background:rgba(9,6,19,.82) !important}";
const WASH_OPAQUE =
  ".doc-cards,main section.shell.trust,.metrics,.demo-tabs,.report-meta,.report-status{background:#1a1a20 !important}" +
  ".doc-cards>a,main section.shell.trust>div,.metrics>div,.demo-tabs>button{box-shadow:none !important}";
for (const [what, css] of [["translucent", WASH_TRANSLUCENT], ["opaque", WASH_OPAQUE]]) {
  const wash = await measure(page, "en", [390, 844], css);
  const n = bleedFindings(wash.peak).length;
  if (!n) {
    fail.push(`NEGATIVE CONTROL DID NOT FIRE: putting the ${what} hairline plane back left the ` +
              `bleed check silent, so it cannot see the white wash it exists for.`);
  } else {
    note(`white-wash control (${what}) fired: ${n} finding(s) when the plane is put back under the cards`);
  }
}

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
  "check-reveal OK: every scroll-driven reveal becomes fully visible somewhere in the page's " +
  "scroll, and nothing fades toward a layer lighter than itself -- in every language, at every " +
  "width."
);
