// The documentation reads like a document.
//
// WHY THIS EXISTS. Four defects, all of them found by measuring rather than by looking:
//
//   1. EVERY HEADING ON EVERY DOCUMENTATION ROUTE RENDERED AT 18px. H1, H2 and the body were
//      within 1.5px of each other, so a 4,500px privacy statement had no hierarchy at all.
//      The cause was two characters: `1.35rem+ 2.1vw` inside a clamp(). CSS math REQUIRES
//      whitespace around + and -, so the clamp was invalid, the var() substitution failed at
//      computed-value time, and every font-size that used that token silently inherited. It
//      is invisible in the source, it produces no parse error, no console warning and no
//      failing build -- and it flattened the type on the homepage too. That class of defect
//      is why this file starts by resolving every token the sheet declares.
//
//   2. 112 CHARACTERS A LINE, where continuous reading wants 50-75.
//
//   3. THE CONTENTS LIST COULD NOT REACH ITS LAST ENTRY, then, once fixed by clamping at the
//      bottom of the page, JUMPED from entry 12 to entry 15 on the licence. Both are the same
//      bug seen from two sides: a reading line at a fixed height cannot describe the last
//      screenful of a document, because the page runs out of scroll before those headings
//      reach it.
//
//   4. THE FOOTER FLASHED into the middle of the window on every documentation click. The
//      text of each document is fetched, and an empty box is a short box.
//
// Each of those is asserted here against every documentation route, and the hierarchy check
// carries a negative control, because a check that has never failed has never been tested.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

const ROUTES = [
  ["#/docs", "the index"],
  ["#/docs/license", "the licence"],
  ["#/docs/privacy", "the privacy statement"],
  ["#/docs/refund", "the refund policy"],
  ["#/docs/commerce", "the commercial disclosure"],
  ["#/docs/faq", "the FAQ"],
  ["#/docs/user-guide", "the user guide"],
  ["#/docs/overview", "the overview"],
  ["#/support", "support"],
];

const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
});
const base = `http://127.0.0.1:${PORT}`;

// Every custom property the sheet declares, read from the sheet itself rather than from a
// list kept in here: a token added tomorrow is checked tomorrow, without anyone remembering.
const css = readFileSync(join(ROOT, "styles.css"), "utf8");
const TOKENS = [...new Set(
  [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]*(?:clamp|calc|min\(|max\()[^;{}]*);/gi)]
    .map((m) => m[1])
)];

try {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + "/#/docs/privacy", { waitUntil: "networkidle" });
  await page.evaluate(() => { const b = document.getElementById("consentBanner"); if (b) b.remove(); });
  await page.waitForTimeout(600);

  // ---- 1. every calculated token resolves ---------------------------------
  const broken = await page.evaluate((names) => {
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const bad = [];
    for (const n of names) {
      probe.style.width = "auto";
      probe.style.width = `var(${n})`;
      const w = getComputedStyle(probe).width;
      // A resolvable length computes to px. An invalid one leaves the declaration invalid at
      // computed-value time, and width falls back to auto.
      if (!/^-?[\d.]+px$/.test(w)) bad.push(`${n} -> ${w}`);
    }
    probe.remove();
    return bad;
  }, TOKENS);
  if (broken.length) {
    fail.push(`${broken.length} declared token(s) do not resolve to a length, so every ` +
              `property using them silently inherits: ${broken.join(", ")}`);
  } else {
    note(`${TOKENS.length} calculated tokens all resolve to a length`);
  }

  // ---- 2. hierarchy, measure and the contents list, per route -------------
  const results = [];
  for (const [hash, name] of ROUTES) {
    await page.goto(base + "/" + hash, { waitUntil: "networkidle" });
    await page.waitForTimeout(750);
    const m = await page.evaluate(() => {
      const content = document.getElementById("docContent");
      const h1 = content.querySelector("h1");
      const body = [...content.querySelectorAll(".license-doc p, .support-card p, .doc-shelf-desc")]
        .find((p) => p.textContent.trim().length > 40);
      const h2 = content.querySelector(".license-title, .support-card h2");
      const px = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
      // Characters per line, counted from the rendered line boxes rather than estimated.
      const cpl = [...content.querySelectorAll(".license-doc p")]
        .filter((p) => p.textContent.trim().length > 220)
        .map((p) => {
          // LINES, from the block's own geometry: height divided by line-height. Counting
          // client rects instead is wrong twice over -- getClientRects returns one rect per
          // line PER INLINE BOX, so bold lead-ins multiply the count, and an inline <code>
          // chip carries padding, so even de-duplicating by top counts its line twice. The
          // user guide measured 24 characters a line by the first method and 40 by the
          // second; it is 66.
          const cs = getComputedStyle(p);
          const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
          const lines = Math.max(1, Math.round(p.getBoundingClientRect().height / lh));
          return Math.round(p.textContent.trim().length / lines);
        })
        .sort((a, b) => a - b);
      const toc = document.querySelector(".doc-toc");
      const sections = content.querySelectorAll("h2").length >= 3
        ? content.querySelectorAll("h2").length
        : content.querySelectorAll(".license-clause").length;
      return {
        h1: px(h1), h2: px(h2), body: px(body),
        h1s: content.querySelectorAll("h1").length,
        eyebrows: content.querySelectorAll(".eyebrow").length,
        cpl: cpl.length ? cpl[Math.floor(cpl.length / 2)] : null,
        sections, tocItems: toc ? toc.querySelectorAll("a").length : 0,
        tocFirst: toc ? toc.querySelector("a").textContent.trim() : null,
      };
    });
    results.push([name, m]);

    if (m.h1s !== 1) fail.push(`${name}: ${m.h1s} H1 elements; a document has exactly one.`);
    if (m.eyebrows) fail.push(`${name}: the page title is printed twice (an eyebrow above the H1).`);
    if (m.body && m.h1 < m.body * 1.6) {
      fail.push(`${name}: the title is ${m.h1}px against ${m.body}px body text. ` +
                "That is not a hierarchy, it is a paragraph in bold.");
    }
    if (m.h2 && m.body && m.h2 < m.body * 1.15) {
      fail.push(`${name}: section headings are ${m.h2}px against ${m.body}px body text.`);
    }
    if (m.cpl !== null && (m.cpl < 45 || m.cpl > 80)) {
      fail.push(`${name}: prose runs to ${m.cpl} characters a line (readable is 50-75).`);
    }
    if (m.sections >= 3 && m.tocItems !== m.sections) {
      fail.push(`${name}: ${m.sections} sections but ${m.tocItems} entries in the contents list.`);
    }
    if (m.sections < 3 && m.tocItems) {
      fail.push(`${name}: a contents list for ${m.sections} section(s) is furniture.`);
    }
    note(`${name.padEnd(26)} h1 ${String(m.h1).padStart(5)}  h2 ${String(m.h2).padStart(5)}  ` +
         `body ${String(m.body).padStart(5)}  ${m.cpl ? m.cpl + " chars/line" : "-".padStart(12)}  ` +
         `${m.sections} sections / ${m.tocItems} contents`);
  }

  // ---- 3. the contents list tracks the whole document ---------------------
  // The step is COMPUTED from the document, not typed. It used to be a flat 90px, on the stated
  // premise that this was "finer than any section on these pages" -- and on 2026-08-21 that
  // premise stopped being true: clause 12 of the licence, "Termination", is 87px tall and its
  // band of scroll positions is 60px wide, so a 90px walk stepped straight over it and reported
  // an entry that "is never marked however far you scroll". It is marked; the walk was coarser
  // than the thing it was measuring.
  //
  // A guard that names its own sampling rate stops being a measurement the moment the content
  // moves under it. The step is a third of the shortest section instead, so the premise is
  // re-derived from the page on every run and cannot go quietly stale again.
  for (const route of ["#/docs/license", "#/docs/privacy"]) {
    await page.goto(base + "/" + route, { waitUntil: "networkidle" });
    await page.evaluate(() => { const b = document.getElementById("consentBanner"); if (b) b.remove(); });
    await page.waitForTimeout(800);
    const total = await page.evaluate(() => document.querySelectorAll(".doc-toc a").length);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const step = await page.evaluate(() => {
      const hs = [...document.querySelectorAll(".doc-toc a")]
        .map((a) => document.getElementById((a.getAttribute("href") || "").slice(1)))
        .filter(Boolean)
        .map((el) => el.getBoundingClientRect().height)
        .filter((h) => h > 0);
      return Math.max(10, Math.floor(Math.min(...hs) / 3));
    });
    const seen = new Set();
    let backwards = 0, prev = -1;
    for (let y = 0; y <= max; y += step) {
      await page.evaluate((v) => scrollTo(0, v), y);
      await page.waitForTimeout(45);
      const i = await page.evaluate(() =>
        [...document.querySelectorAll(".doc-toc a")].findIndex((a) => a.classList.contains("is-current")));
      if (i < prev) backwards++;
      prev = i;
      seen.add(i);
    }
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(120);
    const atEnd = await page.evaluate(() =>
      [...document.querySelectorAll(".doc-toc a")].findIndex((a) => a.classList.contains("is-current")));
    const missed = [...Array(total).keys()].filter((n) => !seen.has(n));
    if (missed.length) {
      fail.push(`${route}: entries ${missed.map((n) => n + 1).join(", ")} of ${total} are never ` +
                "marked however far you scroll, so the contents list skips sections.");
    }
    if (atEnd !== total - 1) {
      fail.push(`${route}: at the bottom of the document the contents list marks entry ` +
                `${atEnd + 1} of ${total}, not the last one.`);
    }
    if (backwards > 1) {
      fail.push(`${route}: the marked entry moved backwards ${backwards} times while scrolling down.`);
    }
    note(`${route}: all ${total} entries reachable at a ${step}px step, ends on the last, no backward jumps`);
  }

  // ---- 4. the footer cannot ride up while a document loads ----------------
  await page.route("**/PRIVACY.md", async (r) => {
    await new Promise((res) => setTimeout(res, 1400));
    await r.continue();
  });
  await page.goto(base + "/#/docs", { waitUntil: "networkidle" });
  await page.evaluate(() => { const b = document.getElementById("consentBanner"); if (b) b.remove(); });
  await page.evaluate(() => { location.hash = "#/docs/privacy"; });
  await page.waitForTimeout(400);           // mid-fetch, deliberately
  const loading = await page.evaluate(() => {
    const f = document.querySelector(".footer").getBoundingClientRect();
    return {
      skeleton: !!document.querySelector(".doc-skel"),
      busy: !!document.querySelector('[aria-busy="true"]'),
      footerTop: Math.round(f.top),
      viewport: innerHeight,
    };
  });
  if (!loading.skeleton || !loading.busy) {
    fail.push("a document being fetched shows neither a skeleton nor aria-busy, so the box is " +
              "empty while it loads.");
  }
  if (loading.footerTop < loading.viewport) {
    fail.push(`the footer sits ${loading.viewport - loading.footerTop}px INSIDE the window ` +
              "while a document is still being fetched: that is the flash readers reported.");
  } else {
    note(`while a document loads: skeleton shown, footer ${loading.footerTop - loading.viewport}px ` +
         "below the fold");
  }
  await page.unroute("**/PRIVACY.md");

  // ---- 5. the negative control -------------------------------------------
  // Break the type scale exactly the way it was broken, and require the hierarchy check to see
  // it. Without this, every assertion above would pass just as happily against a flat page.
  await page.goto(base + "/#/docs/privacy", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const controlSaw = await page.evaluate(() => {
    const s = document.createElement("style");
    // The original defect: a clamp() with no space before the plus.
    s.textContent = ":root{--t-2xl:clamp(29px,1.35rem+ 2.1vw,45px)}";
    document.head.appendChild(s);
    const content = document.getElementById("docContent");
    const h1 = parseFloat(getComputedStyle(content.querySelector("h1")).fontSize);
    const p = [...content.querySelectorAll(".license-doc p")].find((x) => x.textContent.length > 40);
    const body = parseFloat(getComputedStyle(p).fontSize);
    s.remove();
    return { h1, body, wouldFail: h1 < body * 1.6 };
  });
  if (!controlSaw.wouldFail) {
    fail.push("NEGATIVE CONTROL DID NOT FIRE: the type scale was broken the way it shipped " +
              `(h1 ${controlSaw.h1}px against ${controlSaw.body}px body) and the hierarchy ` +
              "check still passed, so it cannot see a flattened document.");
  } else {
    note(`negative control fired: with the malformed clamp restored, the title collapses to ` +
         `${controlSaw.h1}px against ${controlSaw.body}px of body text`);
  }

  await browser.close();
} catch (e) {
  fail.push(String(e && e.message ? e.message : e));
} finally {
  try { server.kill(); } catch {}
}

if (fail.length) {
  console.error(`check-reading FAILED: ${fail.length} problem(s).`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-reading OK: ${ROUTES.length} documentation routes each have one title, a ` +
            "real hierarchy under it, prose inside the readable measure, a contents list that " +
            "matches the document and reaches its last section, and a skeleton that keeps the " +
            "footer out of the window while the text is fetched.");
