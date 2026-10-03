// NOTHING IS PAINTED OVER THE REPORT.
//
// WHY THIS EXISTS. Owner, twice. First: "in the mission control there is a weird shadow above
// the hide full report now." That was answered by taking the box-shadow off the bar. Second, on
// the same day: "the weird shadow above the Hide Full report in the Mission Control is still
// there and it moves up and down with the report."
//
// It was, because the shadow was never the only thing painting it. Measured at 1920 with the
// report open, TWO veils stacked above the label:
//   * `.report-panel.is-open>.report-more-toggle::before` -- a 46px band,
//     `linear-gradient(to top, #0a0714 0%, rgba(10,7,20,.86) 38%, transparent 100%)`;
//   * the bar's OWN background, `linear-gradient(0deg, #0a0714 0%, #0a0714 62%, transparent
//     100%)`, whose top 38% -- 20px of a 54px bar -- is see-through, so the report's text shows
//     through the button itself.
// Together, a ~66px dark-to-transparent smear pinned above a bar that the report scrolls under:
// a shadow that appears to travel with the report, which is exactly what was reported.
//
// AND THE FIX FOR IT HAD ALREADY BEEN WRITTEN, TWICE, AND NEVER APPLIED. Section 57 of the
// stylesheet sets this bar to a solid `#0a0714` with a comment explaining why. An
// identical-specificity rule further down the same layer puts the gradient back, and on a tie
// the later rule wins -- so section 57 had never once taken effect. Reading the stylesheet would
// have told you the bar was solid. Only the rendered page says otherwise, which is why this
// guard reads the rendered page.
//
// WHAT IT ASSERTS, per language and per width at which the report is a scroller:
//
//   1. THE TEST IS MEASURING SOMETHING. The report opens, and the panel really scrolls. A
//      pinned bar over a panel that does not scroll cannot veil anything, so a cell where the
//      panel does not scroll would pass no matter what the CSS said.
//   2. THE BAR IS OPAQUE. Computed: no background-image, a fully opaque background-color, no
//      box-shadow, and no ::before or ::after box above it. Stated as computed style rather
//      than as source text, because the source said the right thing for weeks while the page
//      did not.
//   3. NOTHING IS PAINTED ABOVE IT -- measured in pixels, not in declarations. The 80px strip
//      above the bar is captured as shipped, then captured again with the old veil put back.
//      The two must DIFFER (or this check is blind), and two captures of the shipped page must
//      be identical (or the comparison is noise).
//
// Run: `node scripts/check-report-bar.mjs` (or `npm run test:report-bar`).
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

/* ---------- the subject, read out of the product ------------------------- */
const app = readFileSync(join(ROOT, "app.js"), "utf8");
const langMatch = app.match(/const languages=(\[\[.*?\]\]);/s);
if (!langMatch) throw new Error("could not read the language table out of app.js");
const ALL_LANGS = JSON.parse(langMatch[1].replace(/'/g, '"')).map(([code]) => code);

// The pinned bar only exists where the panel is a scroller, which the stylesheet gates at
// 1160px. Read that number out of the stylesheet rather than repeating it here: if the gate
// moves, the guard moves with it instead of quietly testing a width that no longer applies.
const css = readFileSync(join(ROOT, "styles.css"), "utf8");
const gate = css.match(/@media\(min-width:(\d+)px\)\{\s*\.report-panel\{/);
const MIN = gate ? Number(gate[1]) : 1160;
const WIDTHS = [[MIN + 280, 900], [1920, 1080]];

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
  console.error(`check-report-bar: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}

// The panel sits over the ambient field, which drifts, and the report's own blocks arrive on an
// animation. Freeze both before comparing pixels: a veil is a static background, so nothing this
// check is looking for is removed by holding the motion still, and everything that would make
// two captures of the same page differ is.
const FREEZE = `*,*::before,*::after{animation-play-state:paused!important;transition:none!important}
#ambient .aurora,.particle{display:none!important}`;

// The veil exactly as it was, put back so the comparison has something to see.
const OLD_VEIL = `@media(min-width:${MIN}px){
  .report-panel.is-open>.report-more-toggle{
    background-image:linear-gradient(0deg,#0a0714 0%,#0a0714 62%,rgba(10,7,20,0) 100%)!important;
  }
  .report-panel.is-open>.report-more-toggle::before{
    /* top:auto is not decoration, and the comment carries no backticks because it lives inside
       a template literal -- one backtick here ends the string and the file stops parsing.
       The bar's ::before now draws the 1px rule at a top offset (section 102), and for an
       absolutely positioned box with top, bottom AND height all set, top wins and bottom is
       ignored -- so the veil landed on the rule's own line instead of in the 46px band above the
       bar, moved nothing, and this control reported itself blind in all twelve languages. A
       control has to undo the baseline it is overriding. */
    content:""!important;position:absolute;inset-inline:0;top:auto!important;bottom:100%;height:46px;
    background:linear-gradient(to top,#0a0714 0%,rgba(10,7,20,.86) 38%,rgba(10,7,20,0) 100%);
    pointer-events:none;
  }
}`;

/* CLAMP THE CLIP TO THE VIEWPORT, and say so when there is nothing left to measure.
   This threw -- "Clipped area is either empty or outside the resulting image" -- the moment the
   action bar moved flush to the panel's bottom edge, because the 80px strip above it was asked
   for at a y that no longer existed on screen. A guard that dies is worse than one that fails:
   the suite reported a crash where it should have reported either a result or an honest "could
   not measure here". */
const clampClip = (clip, vw, vh) => {
  const x = Math.max(0, Math.min(Math.round(clip.x), vw - 1));
  const y = Math.max(0, Math.min(Math.round(clip.y), vh - 1));
  const width = Math.max(0, Math.min(Math.round(clip.width), vw - x));
  const height = Math.max(0, Math.min(Math.round(clip.height), vh - y));
  return width >= 8 && height >= 8 ? { x, y, width, height } : null;
};

// Decode a PNG and reduce it to a flat luminance array, using the page's own decoder.
const strip = async (page, clip) => {
  const vp = page.viewportSize();
  const safe = clampClip(clip, vp.width, vp.height);
  if (!safe) return null;
  const shot = await page.screenshot({ clip: safe });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    const out = new Array(img.width * img.height);
    for (let i = 0, p = 0; p < out.length; i += 4, p++) out[p] = (d[i] + d[i + 1] + d[i + 2]) / 3;
    return out;
  }, shot.toString("base64"));
};
const meanDiff = (a, b) => {
  if (a.length !== b.length) return Infinity;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};
// HOW MUCH INK IS IN THE BAND, as the standard deviation of its own luminance. A veil is only
// as visible as what it covers, so this is the sensitivity the control has available at a given
// scroll position -- and choosing the position by it is the difference between measuring the
// instrument and measuring the page's paragraph lengths.
const spread = (a) => {
  if (!a || !a.length) return 0;
  let m = 0;
  for (let i = 0; i < a.length; i++) m += a[i];
  m /= a.length;
  let v = 0;
  for (let i = 0; i < a.length; i++) v += (a[i] - m) * (a[i] - m);
  return Math.sqrt(v / a.length);
};

/* ---------- measure ------------------------------------------------------ */
const browser = await chromium.launch();
const page = await browser.newPage();
let cells = 0;

for (const lang of ALL_LANGS) {
  for (const [w, h] of WIDTHS) {
    // Every language is rendered at the narrow end, where the bar is tightest; only English is
    // rendered at both, because the pixels above the bar do not depend on the language and 22
    // report openings is a minute of wall clock for no extra information.
    if (w !== WIDTHS[0][0] && lang !== "en") continue;
    const at = `[${lang} ${w}x${h}]`;
    await page.setViewportSize({ width: w, height: h });
    await page.goto(base + "/", { waitUntil: "load" });
    try { await page.click("#consentReject", { timeout: 1500 }); } catch {}
    if (lang !== "en") {
      await page.click("#langButton");
      await page.click(`#langList button[data-lang="${lang}"]`);
      await page.waitForTimeout(200);
      await page.reload({ waitUntil: "load" });
    }

    // AND IT PAUSES UNDER THE POINTER, which is where dismissing the consent banner leaves it.
    // At 1440x900 the instrument fills the viewport, so the click that rejects cookies puts the
    // cursor on the panel and `mouseenter` holds the run for ever: the report is never written
    // and the control never arms. At 1920x1080 the same click lands beside it and everything
    // looks fine, which is why only one cell of twenty-two failed. The product is right --
    // check-mission-pause.mjs asserts exactly this -- so the harness moves the pointer away, as
    // a reader who has just dismissed a banner and gone back to reading does.
    await page.mouse.move(0, 0);

    // THE INSTRUMENT PAUSES WHEN IT IS OFF SCREEN -- deliberately, and check-mission-pause.mjs
    // asserts it. At 1440x900 the panel is below the fold at load, so the report is never
    // written and the control never arms. Bring it into view the way a reader does, before
    // waiting for anything.
    await page.evaluate(() => document.querySelector(".mission")?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(200);

    // The control is refused until the report has finished being written, so wait for the
    // product's own readiness signal rather than for a number of seconds.
    try {
      await page.waitForSelector('#reportMoreToggle:not([aria-disabled="true"])', { timeout: 30000 });
    } catch {
      fail.push(`${at} the report never became openable: #reportMoreToggle stayed disabled for 30s.`);
      continue;
    }
    await page.click("#reportMoreToggle");
    await page.waitForTimeout(700);
    await page.addStyleTag({ content: FREEZE });
    await page.waitForTimeout(150);

    // 1. is there anything here to measure?
    //
    // THE SUBJECT IS COMPUTED, AND THAT IS THE WHOLE POINT OF THIS REWRITE. The first version of
    // this file measured `#reportMoreToggle` by id, because that was the bar the owner named. The
    // treatment had TWO halves -- a band above the action bar and an identical band below the
    // report head -- so removing the half this guard watched left the other half live, and the
    // same smear was reported again days later at the top of the panel. Naming the thing you
    // check is this project's recurring defect.
    // So: every element the browser reports as PINNED inside the open panel (position sticky or
    // fixed) is a bar the report scrolls past, and each one is held to the same contract. A third
    // bar added later is covered on the day it renders.
    const state = await page.evaluate(() => {
      const p = document.querySelector(".report-panel");
      if (!p) return null;
      const pinned = [...p.querySelectorAll("*")].filter((el) => {
        const q = getComputedStyle(el).position;
        return q === "sticky" || q === "fixed";
      });
      const describe = (el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const pseudo = (which) => {
          const ps = getComputedStyle(el, which);
          if (ps.content === "none" || ps.content === "normal") return null;
          // A generated box is only a VEIL if it hangs outside its own element. The chevron on
          // the action bar is an ::after that sits inside it, and it is not what this is about.
          const outside = ps.bottom === "100%" || ps.top === "100%" ||
                          parseFloat(ps.bottom) > r.height || parseFloat(ps.top) > r.height;
          return { content: ps.content, bg: ps.backgroundImage, outside: outside };
        };
        return {
          name: (el.id ? "#" + el.id : "." + (el.className || "").toString().split(" ")[0]),
          bg: cs.backgroundImage, bgColor: cs.backgroundColor, shadow: cs.boxShadow,
          before: pseudo("::before"), after: pseudo("::after"),
          h: Math.round(r.height),
        };
      };
      const t = document.getElementById("reportMoreToggle");
      const r = t ? t.getBoundingClientRect() : null;
      return {
        open: p.classList.contains("is-open"),
        scrollable: p.scrollHeight - p.clientHeight,
        bars: pinned.map(describe),
        box: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      };
    });
    if (!state) { fail.push(`${at} no report panel on the page at all.`); continue; }
    if (!state.open) { fail.push(`${at} the report did not open, so nothing below was measured.`); continue; }
    if (state.scrollable < 20) {
      fail.push(`${at} the report panel does not scroll (${state.scrollable}px of range), so a pinned ` +
                `bar cannot veil anything and this cell would pass whatever the CSS said.`);
      continue;
    }
    if (!state.bars.length) {
      fail.push(`${at} the open panel reports NO pinned bars at all, so this check measured nothing. ` +
                `Either the bars stopped being sticky or the selector no longer finds them.`);
      continue;
    }
    if (!state.box) { fail.push(`${at} #reportMoreToggle is missing.`); continue; }

    // 2. EVERY pinned bar is opaque, and none of them paints outside itself.
    for (const bar of state.bars) {
      if (bar.bg !== "none") {
        fail.push(`${at} pinned bar ${bar.name} has a gradient background (${bar.bg}). Its ` +
                  `transparent stop is the report's own text showing through it.`);
      }
      const alpha = /rgba?\([^)]*?,\s*([\d.]+)\s*\)$/.exec(bar.bgColor);
      if (alpha && Number(alpha[1]) < 1) {
        fail.push(`${at} pinned bar ${bar.name} has background-color ${bar.bgColor}: the report ` +
                  `scrolls visibly underneath it.`);
      }
      if (bar.shadow !== "none") {
        fail.push(`${at} pinned bar ${bar.name} carries a box-shadow (${bar.shadow}), which is ` +
                  `painted over the report beside it.`);
      }
      for (const [which, ps] of [["::before", bar.before], ["::after", bar.after]]) {
        if (ps && ps.outside) {
          fail.push(`${at} pinned bar ${bar.name} generates a ${which} box OUTSIDE its own edge ` +
                    `(content: ${ps.content}, background: ${ps.bg}). That is a veil over the ` +
                    `report, and it is what the owner reports as a shadow that moves with it.`);
        }
      }
    }

    // 3. and in pixels.
    //
    // AT THREE SCROLL POSITIONS, and the control is judged on the STRONGEST of them. A veil is
    // only as visible as the ink underneath it, and how much ink sits in an 80px band depends
    // on the language: Chinese sets the same paragraph in roughly half the characters, so at
    // one position the strip was almost bare panel and the control read 1.10 against a
    // threshold of 2 -- reporting the check as blind when it was simply pointed at a gap.
    // One sample is not the sensitivity of the instrument; the best of several is.
    const clip = { x: state.box.x, y: Math.max(0, state.box.y - 80), width: state.box.w, height: 80 };
    let best = 0;
    let unstable = null;
    /* WHERE TO STAND, decided by looking first. Three fixed fractions was already an improvement
       on one, and it still failed for Japanese: 1.94 against a threshold of 2, because none of
       the three happened to land on a dense line. The band is swept, each position is scored by
       how much ink it actually holds, and the veil is compared at the densest few. The threshold
       stops being a bet on where a language puts its paragraphs. */
    const inked = [];
    for (const frac of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
      await page.evaluate((f) => {
        const el = document.querySelector(".report-panel");
        el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * f);
      }, frac);
      await page.waitForTimeout(140);
      const look = await strip(page, clip);
      if (look) inked.push([frac, spread(look)]);
    }
    inked.sort((a, b) => b[1] - a[1]);
    const positions = inked.slice(0, 3).map(([f]) => f);
    if (!positions.length) positions.push(0.25, 0.5, 0.75);
    for (const frac of positions) {
      await page.evaluate((f) => {
        const el = document.querySelector(".report-panel");
        el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * f);
      }, frac);
      await page.waitForTimeout(250);
      const A = await strip(page, clip);
      const A2 = await strip(page, clip);
      if (!A || !A2) {
        unstable = `${(frac * 100).toFixed(0)}% (the strip above the bar is off screen here, so ` +
                   `nothing could be measured)`;
        break;
      }
      const stable = meanDiff(A, A2);
      if (stable > 0.4) { unstable = `${(frac * 100).toFixed(0)}% (${stable.toFixed(2)})`; break; }
      const veil = await page.addStyleTag({ content: OLD_VEIL });
      await page.waitForTimeout(200);
      const B = await strip(page, clip);
      await page.evaluate((el) => el.remove(), veil);
      await page.waitForTimeout(80);
      if (B) best = Math.max(best, meanDiff(A, B));
    }
    if (unstable) {
      fail.push(`${at} two captures of the same frame differ at ${unstable}: the comparison is ` +
                `noise, not evidence.`);
      continue;
    }
    if (best < 2) {
      fail.push(`NEGATIVE CONTROL DID NOT FIRE ${at}: putting the old veil back moved the 80px ` +
                `above the bar by at most ${best.toFixed(2)} of luminance at the three densest of ` +
                `nine scroll positions (ink ${inked.slice(0, 3).map(([, v]) => v.toFixed(1)).join("/")}), ` +
                `so this check cannot see a veil.`);
    } else {
      note(`${at} bar solid, nothing above it; the old veil would have moved ${best.toFixed(1)} of luminance`);
    }
    cells++;
  }
}

if (!cells) fail.push("no cell was measured at all: an empty sweep must never read as a clean one.");

await browser.close();
server.kill();
if (process.platform === "win32" && server.pid) {
  try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
}

if (fail.length) {
  for (const f of fail) console.error("FAIL: " + f);
  console.error(`\ncheck-report-bar: ${fail.length} finding(s).`);
  process.exit(1);
}
console.log(
  `check-report-bar OK: across ${cells} render(s), the report's action bar is opaque and nothing ` +
  `is painted over the report above it.`
);
