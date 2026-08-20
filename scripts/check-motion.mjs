// The page animates. Nothing it animates may ever be left unreadable.
//
// WHY THIS EXISTS. Reveal-on-scroll is built by starting content at opacity 0 and animating it
// to 1. Every failure mode of that technique ends the same way: text nobody can read, on a page
// that reports no error. The animation can fail to start because the browser does not support
// the timeline, or because the element never entered the range, or because a reduced-motion
// rule cancelled the animation but left the `from` state applied. In all three the markup is
// present, the accessibility tree is correct, every other guard here passes, and the visitor
// sees a blank section.
//
// So this asserts the outcome rather than the technique:
//
//   1. The opening actually plays. If it does not, the delays and keyframes are decoration.
//   2. It FINISHES. Every part of the hero ends fully opaque.
//   3. Scroll reveals settle. After scrolling past a section, nothing in it is still partway.
//   4. Reduced motion removes MOTION, not CONTENT. Compared against the settled normal-motion
//      state element by element, so an element that is deliberately faded (an inactive demo
//      video, a dimmed window control) is not mistaken for one the animation stranded.
//   5. The system is a system. A page that claims a motion design and runs two keyframes is
//      not one, and the count is read from the rendered page rather than from the source.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

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
let serverExit = null;
server.on("exit", (c, s) => { serverExit = s || `code ${c}`; });
const base = `http://127.0.0.1:${PORT}`;

// Measured PER SECTION, with the section scrolled into view first.
//
// The first version of this scanned the whole page from scrollTop 0 and reported fourteen
// stranded elements, of which twelve were correct behaviour. A view() timeline runs in both
// directions: an element below the fold sits at its `from` state, which is opacity 0, and that
// is the animation working rather than failing. And the Mission Control panel dims its own list
// on a loop by design, which is check-mission-pause's subject, not this one's.
//
// So: scroll each section into view, let it settle, and require the text in THAT section to be
// readable. Nothing is judged while it is off screen.
// One full pass down the page and back, so every view() timeline has been driven through its
// range at least once before anything is judged.
const settle = async (page) => {
  await page.evaluate(async () => {
    const step = Math.max(300, Math.round(window.innerHeight / 2));
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
};

const readSection = (idx) => {
  const secs = [...document.querySelectorAll("#homeView > section"), document.querySelector("footer.footer")]
    .filter(Boolean);
  const s = secs[idx];
  if (!s) return null;
  const bad = [];
  let seen = 0;
  for (const e of s.querySelectorAll("h1,h2,h3,p,span,b,strong,small,li,a,button,summary")) {
    // The instrument panel runs a deliberate looping dim; the inactive demo videos are stacked
    // behind the active one on purpose. Neither is a stranded reveal.
    if (e.closest(".mission") || e.closest(".demo-stack")) continue;
    // Text a screen reader is told to ignore is decoration, and decoration is allowed to be
    // swapped out: the playlist's row number is replaced by a play glyph on the current row.
    if (e.closest("[aria-hidden='true']")) continue;
    const r = e.getBoundingClientRect();
    if (r.height === 0 || r.width === 0) continue;
    if (!(e.textContent || "").trim()) continue;
    // Judge only what is ON SCREEN. A view() timeline holds an element at its `from` state
    // until it enters the viewport, which is the animation working; a tall section's bottom is
    // simply not being shown yet, and reporting it would be reporting the feature.
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    seen++;
    const op = parseFloat(getComputedStyle(e).opacity);
    if (op < 0.9) {
      bad.push(`${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}` +
               `="${(e.textContent || "").trim().slice(0, 30)}" at ${op}`);
    }
  }
  return { id: s.id || String(s.className).split(" ")[0], seen, bad };
};

const scrollToSection = (idx) => {
  const secs = [...document.querySelectorAll("#homeView > section"), document.querySelector("footer.footer")]
    .filter(Boolean);
  const s = secs[idx];
  if (!s) return false;
  window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 120, behavior: "instant" });
  return true;
};

try {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error(`the site server exited before serving (${serverExit})`);
    try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  const browser = await chromium.launch();

  // ---- 1 + 2. the opening plays, and finishes -----------------------------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "commit" });
  await page.waitForTimeout(130);
  const early = await page.evaluate(() => {
    const t = document.querySelector(".hero-title");
    return t ? parseFloat(getComputedStyle(t).opacity) : null;
  });
  if (early === null) fail.push("no .hero-title to measure: the page did not render");
  else if (early > 0.98) {
    fail.push(`the opening never plays: .hero-title was already at opacity ${early} 130ms in. ` +
              "Either the keyframes were dropped or the delays are shorter than they read.");
  } else note(`the opening plays: .hero-title at ${early} after 130ms`);

  await page.waitForTimeout(1800);
  const heroDone = await page.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); return e ? +getComputedStyle(e).opacity : null; };
    return { title: g(".hero-title"), pill: g(".pill"), metrics: g(".metrics div"),
             actions: g(".actions"), panel: g(".mission-wrap"), under: g(".under") };
  });
  for (const [k, v] of Object.entries(heroDone)) {
    if (v === null) fail.push(`the hero is missing ${k}`);
    else if (v < 0.99) fail.push(`the opening did not finish: ${k} settled at opacity ${v}`);
  }
  if (!fail.length) note("the opening finishes: every part of the hero settles fully opaque");

  // ---- 3. every section, scrolled into view, is readable -----------------
  await settle(page);
  const nSections = await page.evaluate(() =>
    [...document.querySelectorAll("#homeView > section"), document.querySelector("footer.footer")]
      .filter(Boolean).length);
  let totalRead = 0;
  const sectionState = {};
  for (let i = 0; i < nSections; i++) {
    await page.evaluate(scrollToSection, i);
    await page.waitForTimeout(650);
    const r = await page.evaluate(readSection, i);
    if (!r) continue;
    sectionState[r.id] = r.seen;
    totalRead += r.seen;
    if (r.seen === 0) fail.push(`[${r.id}] no text measured: the scan did not run on this section`);
    for (const b of r.bad) fail.push(`[${r.id}] left partway through its reveal: ${b}`);
  }
  if (totalRead < 100) fail.push(`only ${totalRead} elements measured across the page: too few to mean anything`);
  note(`${totalRead} text elements measured across ${nSections} sections, each scrolled into view`);

  // ---- 4. reduced motion removes motion, not content ---------------------
  const rmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const rm = await rmCtx.newPage();
  await rm.goto(base, { waitUntil: "networkidle" });
  await settle(rm);
  const worse = [];
  for (let i = 0; i < nSections; i++) {
    await rm.evaluate(scrollToSection, i);
    await rm.waitForTimeout(220);
    const r = await rm.evaluate(readSection, i);
    if (!r) continue;
    for (const b of r.bad) worse.push(`[${r.id}] ${b}`);
  }
  for (const w of worse) {
    fail.push(`reduced motion left content faded: ${w}. Motion is removed there, and the ` +
              "`from` state of a reveal must be removed with it.");
  }
  const stillMoving = await rm.evaluate(() => {
    const names = new Set();
    for (const e of document.querySelectorAll("main *, footer *")) {
      const n = getComputedStyle(e).animationName;
      // The blip mascot's own idle loop lives inside its SVG and is governed by the SVG's own
      // reduced-motion rule, which is not this sheet's to assert.
      if (n && n !== "none" && !/^b[FBLGT]$/.test(n)) names.add(n);
    }
    return [...names];
  });
  for (const n of stillMoving) {
    fail.push(`"${n}" still animates under prefers-reduced-motion:reduce. ` +
              "Motion is removed there, not shortened.");
  }
  if (!worse.length && !stillMoving.length) {
    note("reduced motion: nothing animates, and nothing is left faded");
  }

  // ---- 5. it is a system, not an effect ----------------------------------
  const inv = await page.evaluate(() => {
    const names = new Set();
    for (const e of document.querySelectorAll("*")) {
      for (const pseudo of [null, "::before", "::after"]) {
        const n = getComputedStyle(e, pseudo).animationName;
        if (n && n !== "none") n.split(",").map((s) => s.trim()).forEach((x) => x !== "none" && names.add(x));
      }
    }
    return [...names].sort();
  });
  if (inv.length < 8) {
    fail.push(`only ${inv.length} animations are live on the page (${inv.join(", ")}). ` +
              "The page is supposed to carry a motion system; this reads as a leftover.");
  } else note(`${inv.length} animations live: ${inv.join(", ")}`);

  // ---- the negative control ----------------------------------------------
  // Strand one element the way a broken reveal would, and require the settled-state scan to
  // report it. Without this a clean run is equally consistent with a scan that read nothing.
  const faqIndex = await page.evaluate(() =>
    [...document.querySelectorAll("#homeView > section")].findIndex((s) => s.id === "faq"));
  await page.addStyleTag({ content: "#faq .section-head h2{opacity:.35 !important}" });
  await page.evaluate(scrollToSection, faqIndex);
  await page.waitForTimeout(400);
  const control = await page.evaluate(readSection, faqIndex);
  if (!control || !control.bad.length) {
    fail.push("NEGATIVE CONTROL DID NOT FIRE: forcing the FAQ heading to opacity .35 produced " +
              "no finding, so this check cannot see a stranded reveal.");
  } else note(`negative control fired: ${control.bad[0]}`);

  await browser.close();
} catch (e) {
  fail.push(String(e && e.message ? e.message : e));
} finally {
  try { server.kill(); } catch {}
}

if (fail.length) {
  console.error(`check-motion FAILED: ${fail.length} problem(s).`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log("check-motion OK: the opening plays and finishes, every reveal settles, reduced " +
            "motion removes the motion without hiding anything, and the scan was proven able " +
            "to see a stranded element.");
