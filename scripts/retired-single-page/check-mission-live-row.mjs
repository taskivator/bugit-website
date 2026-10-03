/**
 * THE ONE ROW A COLLAPSED MISSION CONTROL SHOWS MUST BE THE ROW THE RUN HAS REACHED.
 *
 * THE DEFECT THIS EXISTS FOR. Collapsed on a phone the status panel is a single line, and the
 * stylesheet worked out which line by itself: show whichever row is `.active`, and fall back to
 * the "Awaiting your approval" row when none is. A step is only `.active` between its start and
 * its finish, and the simulation leaves a deliberate GAP between one step finishing and the next
 * starting, so seven times a cycle no row was active at all and the single visible line flipped
 * to "Awaiting your approval" and back while the progress bar was still climbing. Owner,
 * 2026-08-22: "in the mission control on mobile view the awaiting for approval box is always
 * there so when the progress bar changes its visible behind it".
 *
 * WHY A SAMPLED CHECK. check-mission-box measures this panel thoroughly and passes: it takes ONE
 * photograph, and in a photograph the panel is correct. The defect only exists in the seams
 * between two states, so the only way to see it is to keep looking. This samples a whole cycle.
 *
 * WHAT IS ASSERTED, on every sample:
 *   ONE ROW    exactly one status row is laid out. Zero means the heading points at nothing.
 *   THE RIGHT  the visible row is the "Awaiting your approval" row only when the run has
 *   ROW        actually reached it, which the simulation says by marking that row `.active`.
 *              Before anything starts nothing is marked at all and the awaiting row is the
 *              honest thing to show, so that state is allowed -- and told apart from the defect
 *              by whether any step has been reached yet.
 */
import { chromium, webkit } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";
import { readFileSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* The control takes the marker away, which puts the stylesheet back to guessing. Served rather
   than injected: the marking happens inside the simulation's own frame loop. */
const BREAK_FROM = "    if(live!==lastLive){";
const BREAK_TO =
  "    if(false){/*NEGATIVE CONTROL: nothing is marked, so the stylesheet guesses again.*/";

/* The second control is a stylesheet, because the second defect was one: the collapsed row's
   clearance was 14px for a marker 20px wide. */
const MARKER_CONTROL =
  ".status-panel.steps-collapsed li{padding-inline-start:14px !important}";
/* And a third, for the side: put the ring back on a physical edge and Arabic sends it to the
   far end of the line again. */
const SIDE_CONTROL = ".status-panel li:before{inset-inline-start:auto !important;left:0 !important}";

/* EVERY LANGUAGE THE SITE SHIPS, read out of app.js rather than listed here, so a twelfth is
   measured the day it is added. The row's text is what the marker collides with and what the
   single line has to hold, and those are different lengths in every one of them. */
const LANGS = (() => {
  const src = readFileSync(join(ROOT, "app.js"), "utf8");
  const m = src.match(/const RTL_LOCALES\s*=\s*new Set\(\[([^\]]*)\]/);
  const langs = new Set(["en"]);
  const block = src.match(/^\s*(?:'|")?([a-z]{2}(?:-[a-z]{2})?)(?:'|")?:\s*\{linkedin:/gim) || [];
  for (const line of block) {
    const g = line.match(/([a-z]{2}(?:-[a-z]{2})?)/i);
    if (g) langs.add(g[1].toLowerCase());
  }
  if (m) for (const q of m[1].split(",")) {
    const g = q.match(/[a-z-]{2,5}/i);
    if (g) langs.add(g[0].toLowerCase());
  }
  return [...langs];
})();
/* A width where the marker is DRAWN. The phone rules hide it, so a check that only ever looked
   at a phone could never see it collide with anything: the collapsed row was given 14px of
   clearance for a 20px ring, and the ring went through the first two letters. The panel
   collapses by hand at every width, so this is the state a reader reaches by pressing the
   heading on a laptop, and the state the owner reported. */
const WIDE = { width: 1024, height: 768, collapseByHand: true };
const PHONE = { width: 390, height: 844 };
const CYCLE = 90;            // 18 seconds at 200ms, which is longer than one full cycle
const GLANCE = 45;           // enough for the marker, which every collapsed row draws
const EVERY = 200;

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
const BASE = `http://127.0.0.1:${PORT}`;

const SAMPLE = () => {
  const rows = [...document.querySelectorAll("#mcStepList > li")];
  const laid = rows.filter((l) => {
    const cs = getComputedStyle(l);
    return cs.display !== "none" && l.getBoundingClientRect().height > 1;
  });
  const started = rows.some((l) =>
    l.classList.contains("done") || l.classList.contains("active") || l.classList.contains("is-live"));
  const one = laid[0];
  /* THE MARKER AGAINST THE FIRST GLYPH. The approval row draws a ring on its leading edge, and
     the collapsed row's clearance has to clear it. Where the ring is hidden there is nothing to
     clear, and that is read from the ring rather than assumed from the width. */
  let marker = null;
  if (one) {
    const be = getComputedStyle(one, "::before");
    if (be.display !== "none" && be.content !== "none") {
      const r = one.getBoundingClientRect();
      const w = parseFloat(be.width) + 2 * (parseFloat(be.borderWidth) || 0);
      const walker = document.createTreeWalker(one, NodeFilter.SHOW_TEXT);
      let n = walker.nextNode();
      while (n && !n.textContent.trim()) n = walker.nextNode();
      if (n) {
        const rg = document.createRange();
        rg.selectNodeContents(n);
        const tr = rg.getBoundingClientRect();
        /* PHYSICAL BOXES, NO DIRECTION BRANCH. The first version of this reasoned about which
           side the marker "should" be on and then measured from that side, which in Arabic
           produced an 832px overlap on a 1024px screen -- a number that cannot happen, and the
           tell that the check was measuring its own assumption. Two boxes on one axis is the
           whole question: where the ring is drawn, and where the glyphs are. */
        const left = parseFloat(be.left);
        const right = parseFloat(be.right);
        const mLeft = isFinite(left) ? r.left + left
          : isFinite(right) ? r.right - right - w : r.left;
        const rtl = getComputedStyle(one).direction === "rtl";
        marker = {
          w: Math.round(w),
          /* Overlap on the axis, whichever way the text runs. */
          over: Math.round(Math.min(mLeft + w, tr.right) - Math.max(mLeft, tr.left)),
          /* And WHICH SIDE it is on, because a ring at the far end of a line it is supposed to
             mark is wrong even when it touches nothing. */
          leading: rtl ? mLeft + w > tr.right - 1 : mLeft < tr.left + 1,
          gap: Math.round(rtl ? mLeft - tr.right : tr.left - (mLeft + w)),
        };
      }
    }
  }
  return {
    marker,
    n: laid.length,
    started,
    awaiting: !!one && one.classList.contains("awaiting"),
    active: !!one && one.classList.contains("active"),
    text: one ? (one.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30) : "",
    collapsed: !!document.querySelector(".status-panel.steps-collapsed"),
  };
};

/* `view` is either the phone, where the panel collapses by itself and the marker is hidden, or
   a laptop, where the reader collapses it by pressing the heading and the marker IS drawn. Both
   are real states and only the second could ever show the collision. */
async function run(engineName, engine, lang, view, count, opts) {
  const failures = [];
  const broken = opts && opts.broken;
  const withMarkerControl = !!(opts && opts.markerControl);
  const withSideControl = !!(opts && opts.sideControl);
  let samples = 0;
  const b = await engine.launch();
  const ctx = await b.newContext({
    viewport: { width: view.width, height: view.height },
    isMobile: view.width < 900, hasTouch: view.width < 900,
  });
  let patched = !broken;
  if (broken) {
    await ctx.route("**/app*.js", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      if (body.includes(BREAK_FROM)) patched = true;
      route.fulfill({ response: res, body: body.split(BREAK_FROM).join(BREAK_TO) });
    });
  }
  await ctx.addCookies([{ name: "bugitLang", value: lang, url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  if (withMarkerControl) await page.addStyleTag({ content: MARKER_CONTROL });
  if (withSideControl) await page.addStyleTag({ content: SIDE_CONTROL });
  await page.evaluate(() => document.getElementById("consentBanner")?.remove());
  await page.evaluate(() => document.querySelector(".mission")?.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(500);
  /* Where the panel does not collapse by itself, collapse it the way a reader does. */
  if (view.collapseByHand) {
    await page.evaluate(() => document.getElementById("mcStepsToggle").click());
    await page.waitForTimeout(300);
  }

  const where = engineName + "/" + lang + "@" + view.width;
  const seenBad = new Set();
  for (let i = 0; i < count; i++) {
    const s = await page.evaluate(SAMPLE);
    if (!s.collapsed) {
      failures.push(`${where}: the panel is not collapsed, so nothing here was measured`);
      break;
    }
    samples++;
    if (s.n !== 1) {
      seenBad.add(`${where}: ${s.n} status rows are showing at once in the collapsed panel`);
    } else if (s.marker && s.marker.over > 0) {
      /* THE DEFECT. The ring is drawn over the letters of the line it belongs to. */
      seenBad.add(
        `${where}: the collapsed row's ${s.marker.w}px marker overlaps its own text by ` +
          `${s.marker.over}px ("${s.text}")`,
      );
    } else if (s.marker && !s.marker.leading) {
      /* THE OTHER ONE. In Arabic the ring was 644px away at the far end of the row, against a
         gap the row had reserved for it on the side the text actually starts. */
      seenBad.add(
        `${where}: the collapsed row's marker is drawn on the TRAILING side of its own line, ` +
          `${Math.abs(s.marker.gap)}px from it ("${s.text}")`,
      );
    } else if (s.awaiting && !s.active && s.started) {
      /* THE DEFECT. The run has reached at least one step, and the single visible line is the
         approval row, which the simulation has not reached. */
      seenBad.add(
        `${where}: mid-run the collapsed panel shows "${s.text}" -- the approval row, which the ` +
          "simulation has not reached, while steps behind it are already done",
      );
    }
    await page.waitForTimeout(EVERY);
  }
  for (const f of seenBad) failures.push(f);
  if (!patched) failures.push("the negative control could never be installed: its anchor is gone");
  await ctx.close();
  await b.close();
  return { failures, samples };
}

let failures = [];
let samples = 0;
let wide = 0;
try {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  /* EVERY LANGUAGE, on the phone, for a whole cycle: that is where the flip happened. Chromium
     walks all of them; WebKit walks English, German (the longest label) and Arabic (the one
     that changes direction), because this rule is about STATE rather than about rendering and
     two engines' worth of every language buys twenty minutes and no new question. */
  for (const lang of LANGS) {
    const r = await run("chromium", chromium, lang, PHONE, CYCLE, {});
    failures = failures.concat(r.failures);
    samples += r.samples;
  }
  for (const lang of ["en", "de", "ar"]) {
    const r = await run("webkit", webkit, lang, PHONE, CYCLE, {});
    failures = failures.concat(r.failures);
    samples += r.samples;
  }
  /* And every language again on a laptop with the panel collapsed by hand, which is the only
     state in which the marker is drawn at all. Shorter, because every collapsed row draws one:
     the marker is measured on the first sample rather than waited for. */
  for (const lang of LANGS) {
    const r = await run("chromium", chromium, lang, WIDE, GLANCE, {});
    failures = failures.concat(r.failures);
    samples += r.samples;
    wide++;
  }
  for (const lang of ["en", "ar"]) {
    const r = await run("webkit", webkit, lang, WIDE, GLANCE, {});
    failures = failures.concat(r.failures);
    samples += r.samples;
    wide++;
  }

  const fired = [];
  const rowControl = await run("chromium", chromium, "en", PHONE, CYCLE, { broken: true });
  if (!rowControl.failures.length) {
    failures.push(
      "NEGATIVE CONTROL DID NOT FIRE (ROW): with the live row unmarked -- the state in which the " +
        "stylesheet had to infer it and flipped to the approval row in every gap -- this check " +
        "still passed, so it is not measuring what it claims",
    );
  }
  fired.push("ROW:" + rowControl.failures.length);
  const markerRun = await run("chromium", chromium, "en", WIDE, GLANCE, { markerControl: true });
  const markerHits = markerRun.failures.filter((f) => /marker overlaps/.test(f));
  if (!markerHits.length) {
    failures.push(
      "NEGATIVE CONTROL DID NOT FIRE (MARKER): with the collapsed rows given back the 14px of " +
        "clearance they had for a 20px marker, this check still saw no collision",
    );
  }
  fired.push("MARKER:" + markerHits.length);
  const sideRun = await run("chromium", chromium, "ar", WIDE, GLANCE, { sideControl: true });
  const sideHits = sideRun.failures.filter((f) => /TRAILING side/.test(f));
  if (!sideHits.length) {
    failures.push(
      "NEGATIVE CONTROL DID NOT FIRE (SIDE): with the marker put back on a physical left edge, " +
        "Arabic still reported it on the leading side of its own line",
    );
  }
  fired.push("SIDE:" + sideHits.length);
  if (samples < 100) failures.push(`only ${samples} samples were taken; that is not a cycle`);
  if (!wide) failures.push("the marker was never measured in a state where it is drawn");

  if (failures.length) {
    console.error("check-mission-live-row: FAIL");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(
    `check-mission-live-row: OK (${samples} samples across two engines and all ${LANGS.length} ` +
      `languages: one row throughout, the approval row only once the run reached it, and in ` +
      `${wide} hand-collapsed panels the marker cleared its own text; negative controls fired ` +
      `${fired.join(", ")})`,
  );
} finally {
  try { server.kill(); } catch {}
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
}
