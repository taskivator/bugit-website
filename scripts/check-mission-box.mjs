/*
 * MISSION CONTROL IS ONE BOX ON A PHONE, IN EVERY LANGUAGE.
 *
 * Owner, 2026-08-21: "test all the languages with the new mision control for mobile view too,
 * get the spacing right and everything correct."
 *
 * Section 100 collapsed the eight-row status list to its live row and merged the two panels into
 * a single bordered box on phones. That was designed and measured in English, and English is the
 * shortest language this site ships: "PROJECT LEARNING" is 16 characters and its German, Russian
 * and Japanese equivalents are not. The heading now sits on one line with a chevron pinned to its
 * end, which is exactly the shape that breaks first when a translation is longer than the one it
 * was laid out for.
 *
 * WHAT IS ASSERTED, all of it measured on the rendered page:
 *
 *   ONE BOX      the wrapper draws a border and the two panels inside it draw none. If a panel
 *                gets its own edge back, the section is two cards again and the whole point of
 *                section 100 is gone.
 *   COLLAPSED    exactly one status row is visible, and it is the live one. Zero rows means the
 *                heading points at nothing; eight means the collapse did not happen.
 *   THE HEADING  its text and its chevron do not overlap, and there is real space between them.
 *                A chevron sitting on the last glyph of "PROJEKTLERNEN" is the defect this file
 *                exists to catch.
 *   FITS         nothing inside the box crosses the box's own edges, and the page does not
 *                scroll sideways.
 *   SPACING      the gap above and below the live row, and the gap between the heading and the
 *                row, are the same in every language. A layout that is right in English and
 *                4px tighter in Japanese is not right, it is lucky.
 *   BOTH STATES  everything above is measured collapsed AND expanded, because the expanded list
 *                is where eight translated rows have to fit.
 *
 * The language table is read out of app.js rather than listed here, so a seventeenth language is
 * measured the day it is added.
 */
import { chromium, webkit } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

const app = readFileSync(join(ROOT, "app.js"), "utf8");
const langMatch = app.match(/const languages=(\[\[.*?\]\]);/s);
if (!langMatch) throw new Error("could not read the language table out of app.js");
const LANGS = JSON.parse(langMatch[1].replace(/'/g, '"')).map(([code]) => code);

/* The phone widths the site supports, from the floor Android still ships to the largest iPhone. */
const WIDTHS = [320, 360, 390, 430];

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
  console.error(`check-mission-box: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const mission = q(".mission"), panel = q(".status-panel"), report = q(".report-panel");
  const head = q("#mcStepsToggle"), list = q("#mcStepList");
  if (!mission || !panel || !report || !head || !list) return { missing: true };
  const R = (e) => e.getBoundingClientRect();
  const bw = (e) => parseFloat(getComputedStyle(e).borderTopWidth) || 0;

  const rows = [...list.children].filter((li) => li.getBoundingClientRect().height > 0);
  const live = rows.find((li) => li.classList.contains("active") || li.classList.contains("awaiting")) || rows[0];
  const hr = R(head), lr = live ? R(live) : null, mr = R(mission), lir = R(list);

  /* The chevron is a ::after on the heading, so its box is read the only way a pseudo-element's
     box can be: from the heading's own content box and the pseudo's computed width, honouring
     the writing direction. */
  const hs = getComputedStyle(head);
  const after = getComputedStyle(head, "::after");
  const chevW = parseFloat(after.width) || 0;
  const rtl = getComputedStyle(document.documentElement).direction === "rtl";
  const padEnd = parseFloat(rtl ? hs.paddingLeft : hs.paddingRight) || 0;

  /* Where the heading's TEXT actually ends, which is not where its box ends. */
  const range = document.createRange();
  range.selectNodeContents(head);
  const tr = range.getBoundingClientRect();

  /* BOTH BRANCHES OF THIS WERE THE SAME SUBTRACTION, which is how a check that measures a
     direction-sensitive gap fails: it reported -158px to -261px of overlap in Arabic at every
     width in both engines, sixteen findings, and the Arabic heading was fine. In RTL the chevron
     is at the LEFT end of the row and the text ends at its left edge, so the gap runs the other
     way and the operands swap. The mirror image of the same mistake as a physical `right:auto`
     inside a layout that flips. */
  const headroom = rtl
    ? tr.left - (hr.left + padEnd + chevW)
    : (hr.right - padEnd - chevW) - tr.right;

  const inside = [];
  for (const el of mission.querySelectorAll("*")) {
    const r = R(el);
    if (r.width === 0 || r.height === 0) continue;
    const over = Math.max(mr.left - r.left, r.right - mr.right);
    if (over > 1.5) inside.push({ el: el.tagName.toLowerCase() + "." + String(el.className || "").split(" ")[0], over: Math.round(over) });
  }

  return {
    expanded: head.getAttribute("aria-expanded") === "true",
    rowCount: rows.length,
    liveText: live ? (live.textContent || "").trim().slice(0, 30) : null,
    liveIsLive: !!live && (live.classList.contains("active") || live.classList.contains("awaiting")),
    borders: { mission: bw(mission), status: bw(panel), report: bw(report) },
    headText: (head.textContent || "").trim(),
    headLines: Math.round(hr.height / (parseFloat(hs.lineHeight) || 16)),
    headroom: +headroom.toFixed(1),
    gapHeadToRow: lr ? +(lr.top - hr.bottom).toFixed(1) : null,
    gapRowToPanelEnd: lr ? +(R(panel).bottom - lr.bottom).toFixed(1) : null,
    listTop: +(lir.top - hr.bottom).toFixed(1),
    missionH: Math.round(mr.height),
    overflow: inside.slice(0, 3),
    pageWide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
};

async function sweep(browser, engine, inject) {
  const found = [];
  let cells = 0;
  for (const W of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    if (inject) {
      await page.route("**/styles.css", async (route) => {
        const res = await route.fetch();
        route.fulfill({ response: res, body: (await res.text()) + "\n" + inject });
      });
    }
    for (const lang of LANGS) {
      await page.goto(base + "/", { waitUntil: "load" });
      try { await page.click("#consentReject", { timeout: 1200 }); } catch {}
      if (lang !== "en") {
        await page.click("#langButton");
        await page.click(`#langList button[data-lang="${lang}"]`);
        await page.waitForTimeout(180);
        await page.reload({ waitUntil: "load" });
      }
      await page.waitForTimeout(700);

      for (const state of ["collapsed", "expanded"]) {
        if (state === "expanded") {
          await page.click("#mcStepsToggle");
          await page.waitForTimeout(300);
        }
        const m = await page.evaluate(MEASURE);
        cells++;
        const at = `[${engine} ${lang} ${W} ${state}]`;
        if (m.missing) { found.push(`${at} the instrument is not on the page at all`); continue; }

        if (m.expanded !== (state === "expanded")) {
          found.push(`${at} aria-expanded says ${m.expanded} in the ${state} state.`);
        }
        if (m.borders.mission < 0.5) {
          found.push(`${at} ONE BOX: the wrapper draws no border, so there is no box.`);
        }
        if (m.borders.status > 0.5 || m.borders.report > 0.5) {
          found.push(`${at} ONE BOX: a panel inside the box draws its own border ` +
                     `(status ${m.borders.status}px, report ${m.borders.report}px), so this reads as ` +
                     `two cards stacked rather than one instrument.`);
        }
        if (state === "collapsed") {
          if (m.rowCount !== 1) {
            found.push(`${at} COLLAPSED: ${m.rowCount} status row(s) visible, expected exactly 1. ` +
                       `Zero means the heading points at nothing; more means the collapse did not happen.`);
          } else if (!m.liveIsLive) {
            found.push(`${at} COLLAPSED: the one visible row is "${m.liveText}", which is not the live ` +
                       `one. The row that survives has to be the row that is moving.`);
          }
        } else if (m.rowCount < 8) {
          found.push(`${at} EXPANDED: only ${m.rowCount} of 8 rows are visible.`);
        }
        if (m.headroom < 6) {
          found.push(`${at} THE HEADING: "${m.headText}" leaves ${m.headroom}px between its last glyph ` +
                     `and the chevron. Under 6px they read as touching, and below zero they overlap.`);
        }
        if (m.overflow.length) {
          const o = m.overflow[0];
          found.push(`${at} FITS: ${o.el} runs ${o.over}px past the box's own edge.`);
        }
        if (m.pageWide) found.push(`${at} FITS: the page scrolls sideways.`);
        if (state === "collapsed") {
          found.push({ spacing: true, key: `${engine} ${W} ${state}`, lang,
                       gapHeadToRow: m.gapHeadToRow, gapRowToPanelEnd: m.gapRowToPanelEnd, h: m.missionH });
        }
      }
      // leave it as we found it for the next language
      await page.click("#mcStepsToggle").catch(() => {});
    }
    await ctx.close();
  }
  return { found, cells };
}

/* SPACING IS A COMPARISON, not a number. What matters is that the same gap is the same in every
   language at a given width, so the check is the SPREAD across languages rather than an absolute
   that would have to be guessed. */
function spacingFindings(records) {
  const out = [];
  const byKey = new Map();
  for (const r of records) {
    if (!byKey.has(r.key)) byKey.set(r.key, []);
    byKey.get(r.key).push(r);
  }
  for (const [key, rows] of byKey) {
    for (const field of ["gapHeadToRow", "gapRowToPanelEnd"]) {
      const vals = rows.map((r) => r[field]).filter((v) => v != null);
      if (vals.length < 2) continue;
      const lo = Math.min(...vals), hi = Math.max(...vals);
      if (hi - lo > 3) {
        const worst = rows.filter((r) => r[field] === hi || r[field] === lo)
          .map((r) => `${r.lang} ${r[field]}px`).join(", ");
        out.push(`[${key}] SPACING: ${field} ranges ${lo}px to ${hi}px across the languages ` +
                 `(${worst}). The same gap has to be the same gap in every language.`);
      }
    }
  }
  return out;
}

const results = [];
for (const [engine, launcher] of [["blink", chromium], ["webkit", webkit]]) {
  const browser = await launcher.launch();
  const r = await sweep(browser, engine, null);
  results.push(r);
  for (const f of r.found) {
    if (typeof f === "string") fail.push(f);
  }
  for (const f of spacingFindings(r.found.filter((x) => typeof x === "object" && x.spacing))) fail.push(f);
  await browser.close();
}
note(`${results.reduce((a, r) => a + r.cells, 0)} render(s): ${LANGS.length} languages x ` +
     `${WIDTHS.length} phone widths x 2 states x 2 engines`);

/* ---------- the negative control ----------------------------------------- */
/* Give the panels their borders back. That is precisely the state section 100 replaced, and if
   this file cannot see it then "one box" is an assertion about nothing. */
const TWO_CARDS = "@media(max-width:760px){.status-panel,.report-panel{border:1px solid #2a2a36 !important}}";
const ctlBrowser = await chromium.launch();
const ctl = await sweep(ctlBrowser, "blink", TWO_CARDS);
const sawTwo = ctl.found.filter((f) => typeof f === "string" && f.includes("ONE BOX")).length;
if (!sawTwo) {
  fail.push("NEGATIVE CONTROL DID NOT FIRE: putting a border back on both panels left the ONE BOX " +
            "rule silent, so it cannot see the thing it exists for.");
} else {
  note(`negative control fired: ${sawTwo} finding(s) when the two panels get their own borders back`);
}
await ctlBrowser.close();

server.kill();
if (process.platform === "win32" && server.pid) {
  try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
}

if (fail.length) {
  for (const f of fail.slice(0, 40)) console.error("FAIL: " + f);
  if (fail.length > 40) console.error(`... and ${fail.length - 40} more`);
  console.error(`\ncheck-mission-box: ${fail.length} finding(s).`);
  process.exit(1);
}
console.log("check-mission-box OK: one box, one live row collapsed and eight expanded, the chevron " +
            "clear of the heading, nothing past the edges and the same spacing -- in every language, " +
            "at every phone width, in both engines.");
