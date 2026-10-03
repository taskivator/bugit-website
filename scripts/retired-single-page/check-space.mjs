/*
 * THE SPACE AUDIT.
 *
 * Owner brief, 2026-08-21: "all languages are behaving correctly and there is enough space for
 * ALL of them EVERYWHERE and the texts are showing correctly."
 *
 * Every guard in this folder that touches language reads STRINGS. This one reads the rendered
 * page, because the failure the owner is describing is not a missing key -- it is a present,
 * correct, translated string that does not fit the box the English one fitted. German compounds
 * are ~30% longer than their English source, Russian ~20%, and the two worst offenders in this
 * product are a nav row and a button, both of which were sized when the only language was
 * English.
 *
 * WHAT IT MEASURES, per (language x route x width). Five failure shapes, and the reason each is
 * a separate one is that they are caused by different things and fixed in different ways:
 *
 *   PAN       the document is wider than the viewport. The reader can push the page sideways
 *             and the layout has a hole in it.
 *   ESCAPE    an element's box leaves the viewport and nothing clips it. This is what CAUSES a
 *             pan, and naming the element is the difference between a symptom and a fix.
 *   CLIP      text is cut off -- either ellipsised, or hidden by an ancestor's overflow. This
 *             one is silent: the page looks fine and a word is missing.
 *   COLLIDE   two pieces of text are drawn on top of each other.
 *   FADE      text is present, laid out, and invisible: transparent ink, or held at the `from`
 *             state of a reveal that never fired.
 *
 * THE SUBJECT IS COMPUTED, NEVER TYPED. The language list and the route list are read out of
 * app.js, and the section anchors out of index.html. A guard that names its own subject stops
 * covering the eleventh language the day an eleventh language is added, and reads as coverage
 * the whole time -- which is the recurring defect in this repo.
 *
 * TWO TRAPS, both of which produce a confident clean sweep over a broken page:
 *
 *   1. The clipped-ancestor walk MUST stop before <body>. body's overflow-x propagates to the
 *      viewport, so body never clips its own children; treating it as a clipper marks every
 *      element contained and reports zero offenders on a page that demonstrably pans.
 *   2. Reveal animations must be allowed to FIRE, not disabled. Turning them off with
 *      prefers-reduced-motion changes what the page renders, so the probe measures a layout no
 *      reader ever sees.
 *   3. The reveals are SCROLL-DRIVEN (animation-timeline:view()), so an element's opacity is a
 *      function of where it currently sits in the viewport. Measuring once, from the top of the
 *      page, therefore reports every below-fold element as invisible -- 200 findings on a page
 *      with nothing wrong with it. The probe runs at each scroll position instead, and judges
 *      ink only on elements that are IN VIEW at that moment, which is the only place the
 *      question "is this text visible" has an answer.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import https from "node:https";
import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const only = process.argv.slice(2);
const pick = (flag) => { const i = only.indexOf(flag); return i >= 0 ? only[i + 1] : null; };

/* ---------- 1. The subject, read out of the product ---------------------- */
const app = readFileSync(path.join(ROOT, "app.js"), "utf8");
const html = readFileSync(path.join(ROOT, "index.html"), "utf8");

const langMatch = app.match(/const languages=(\[\[.*?\]\]);/s);
if (!langMatch) throw new Error("could not read the language table out of app.js");
const LANGS = JSON.parse(langMatch[1].replace(/'/g, '"')).map(([code, name]) => ({ code, name }));

const routeMatch = app.match(/const docRoutes=(\[.*?\]);/s);
if (!routeMatch) throw new Error("could not read docRoutes out of app.js");
const DOC_ROUTES = JSON.parse(routeMatch[1].replace(/'/g, '"'));

const ANCHORS = [...new Set([...html.matchAll(/href="#([a-z][a-z-]*)"/g)].map((m) => m[1]))];

const ROUTES = ["", ...DOC_ROUTES.map((r) => "/" + r)];

/* Every view the product is actually opened in, not a tidy three. Owner, 2026-08-21: "mobile
   view, tablet view and any other view there is". Phone LANDSCAPE is in the list because it is
   the one people forget: it is 375px tall, which is shorter than some of this page's own
   sticky chrome, and nothing else in the set exercises that.

   TWO SETS, and the reason is that this guard runs in two places. The full twelve take about
   eighty minutes, which is the right cost for an audit and the wrong cost for a pre-push check
   nobody would then run. `--quick` (the default in CI and in `npm test`) keeps five, chosen
   because they are the widths that actually caught something on 2026-08-21: 320 found the
   Arabic pan and the sliced byline, 390 the phone's clamps, 768 the tablet range, 1180 the
   Mission Control stream line, 1920 the widest desktop. A subset picked for tidiness rather
   than for evidence would have found none of them. `--full` runs all twelve. */
const QUICK = new Set(["320", "390", "768", "1180", "1920"]);
const WIDTHS = [
  { w: 320, h: 568, label: "320", note: "smallest phone still in use" },
  { w: 360, h: 800, label: "360", note: "the most common Android" },
  { w: 390, h: 844, label: "390", note: "iPhone 14/15" },
  { w: 430, h: 932, label: "430", note: "iPhone Pro Max" },
  { w: 667, h: 375, label: "667L", note: "phone, landscape" },
  { w: 768, h: 1024, label: "768", note: "iPad portrait" },
  { w: 834, h: 1112, label: "834", note: "iPad Air portrait" },
  { w: 1024, h: 768, label: "1024", note: "iPad landscape" },
  { w: 1180, h: 820, label: "1180", note: "iPad Pro landscape" },
  { w: 1280, h: 800, label: "1280", note: "small laptop" },
  { w: 1512, h: 950, label: "1512", note: "MacBook" },
  { w: 1920, h: 1080, label: "1920", note: "desktop" },
];
const CONCURRENCY = Number(process.env.AUDIT_CONCURRENCY || 8);

const langFilter = pick("--lang");
const widthFilter = pick("--width");
const routeFilter = pick("--route");
const full = only.includes("--full");
const subjLangs = langFilter ? LANGS.filter((l) => l.code === langFilter) : LANGS;
const subjWidths = widthFilter
  ? WIDTHS.filter((v) => v.label === widthFilter)
  : (full ? WIDTHS : WIDTHS.filter((v) => QUICK.has(v.label)));
const subjRoutes = routeFilter ? ROUTES.filter((r) => r === routeFilter) : ROUTES;

/* ---------- 2. The probe, run inside the page ---------------------------- */
/* Kept as a string so it is obvious that nothing from this module's scope leaks into it. */
const PROBE = `(() => {
  const vw = window.innerWidth;
  const rtl = document.documentElement.dir === "rtl";
  const out = { pan: 0, escape: [], clip: [], collide: [], fade: [], leak: [] };

  out.pan = Math.max(0, document.documentElement.scrollWidth - vw);

  const label = (el) => {
    const id = el.id ? "#" + el.id : "";
    const cls = (typeof el.className === "string" && el.className.trim())
      ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".") : "";
    return el.tagName.toLowerCase() + id + cls;
  };
  const textOf = (el) => (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 70);
  const ownText = (el) => [...el.childNodes]
    .filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\\s+/g, " ").trim();

  /* A visible, laid-out element that is part of the page rather than its decoration. */
  const candidates = [];
  const walk = (el, hiddenReason) => {
    for (const child of el.children) {
      if (child.tagName === "SCRIPT" || child.tagName === "STYLE" || child.tagName === "SVG") continue;
      const cs = getComputedStyle(child);
      let reason = hiddenReason;
      if (!reason) {
        if (cs.display === "none" || cs.visibility === "hidden" || child.hasAttribute("hidden")) reason = "hidden";
        /* Visually hidden, by whatever name. The page uses .sr-only in some places and a
           hand-written 1px + clip-path box in others (.mc-flow-label), and the second kind
           reported "cuts 219px" of text that is not on the screen at all. Detect the SHAPE,
           not the class name. */
        else if (child.classList.contains("sr-only")
                 || (cs.clipPath && cs.clipPath !== "none" && parseFloat(cs.width) <= 2)) reason = "sr-only";
        else if (child.id === "ambient" || child.classList.contains("particle")) reason = "decor";
        /* A closed <details> still hands its answer a full-size rect, because the box that
           clips it is ::details-content -- a pseudo-element, which is not in the DOM parent
           chain and therefore invisible to the clipper walk below. Every closed FAQ answer
           read as a block of text sitting on top of the next question. */
        else if (child.tagName !== "SUMMARY" && child.parentElement.tagName === "DETAILS"
                 && !child.parentElement.open) reason = "closed-details";
      }
      if (!reason) candidates.push({ el: child, cs });
      walk(child, reason);
    }
  };
  walk(document.body, null);

  /* ---- ESCAPE + CLIP-BY-ANCESTOR ---------------------------------------
     An element past the viewport edge is only a defect if nothing legitimately clips it.
     The walk stops BEFORE body: body's overflow-x propagates to the viewport, so body does
     not clip its own children, and counting it as a clipper reports zero offenders on a
     page that demonstrably pans. */
  const clipperFor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      const ox = s.overflowX;
      if (ox === "auto" || ox === "scroll") return { kind: "scrollable", el: p };
      if (ox === "hidden" || ox === "clip") return { kind: "hidden", el: p };
    }
    return null;
  };

  /* PARKED IS NOT BROKEN. An off-canvas panel sits wholly outside the viewport until it is
     opened, and in a left-to-right document leftward overflow creates no scrollable area --
     the viewport clamps it. What IS a defect is an element PARTIALLY outside: half readable,
     half gone. */
  for (const { el, cs } of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right <= 0 || r.left >= vw) continue;
    if (cs.position === "fixed" && (el.closest("header") || el.closest(".mobile-menu"))) {
      /* the sticky header and the phone overlay are measured, but they are allowed to sit
         over the page: only their own width against the viewport matters */
    }
    const over = Math.max(r.right - vw, -r.left);
    if (over <= 1) continue;
    const clip = clipperFor(el);
    const rec = { el: label(el), text: textOf(el), over: +over.toFixed(1),
                  box: [+r.left.toFixed(1), +r.right.toFixed(1)] };
    if (!clip) out.escape.push(rec);
    else if (clip.kind === "hidden" && textOf(el)) { rec.by = label(clip.el); out.clip.push(rec); }
  }

  /* ---- LEAK: what is actually making the document too wide --------------
     Only computed when the page pans, and only for boxes that do NOT clip: a box whose content
     needs more width than it has, with overflow visible, hands that overflow to its parent, and
     the chain of them ends at the document. This is the one measurement that finds an
     unbreakable run of text or an absolutely-positioned panel laid out off-screen, because
     neither moves the border box the ESCAPE scan reads. */
  if (out.pan > 1) {
    for (const { el, cs } of candidates) {
      if (cs.overflowX !== "visible") continue;
      const need = el.scrollWidth - el.clientWidth;
      if (need <= 1) continue;
      out.leak.push({ el: label(el), need, sw: el.scrollWidth, cw: el.clientWidth, text: textOf(el).slice(0, 44) });
    }
    out.leak.sort((a, b) => b.need - a.need);
    out.leak = out.leak.slice(0, 6);
  }

  /* ---- CLIP: text cut off inside its own box ---------------------------- */
  for (const { el, cs } of candidates) {
    const t = ownText(el);
    if (!t) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    /* A disclosure's teaser is clamped on purpose: the collapsed report panel's .report-more
       is the preview above the "Show full report" control, and the rule that removes the clamp
       when the panel opens is two lines below the one that applies it. Only the COLLAPSED state
       is exempt -- if the OPEN panel ever clips its own report, that is real and still caught.
       (No backticks in this comment: it lives inside the probe's template literal.) */
    if (el.closest(".report-panel.is-collapsed") && el.classList.contains("report-more")) continue;
    const hx = cs.overflowX === "hidden" || cs.overflowX === "clip";
    const hy = cs.overflowY === "hidden" || cs.overflowY === "clip";
    const wOver = el.scrollWidth - el.clientWidth;
    const hOver = el.scrollHeight - el.clientHeight;
    if (hx && wOver > 1) out.clip.push({ el: label(el), text: t.slice(0, 70), over: wOver, axis: "x" });
    else if (hy && hOver > 1) out.clip.push({ el: label(el), text: t.slice(0, 70), over: hOver, axis: "y" });
    else if (cs.textOverflow === "ellipsis" && wOver > 0)
      out.clip.push({ el: label(el), text: t.slice(0, 70), over: wOver, axis: "ellipsis" });
  }

  /* ---- FADE: laid out, in view, and invisible ----------------------------
     The band is deliberately not the whole viewport. Every reveal on this page is driven by
     animation-timeline:view(), so an element entering at the bottom edge is legitimately
     partway through its fade; only something sitting in the middle of the screen and still
     transparent is a defect. */
  const vh = window.innerHeight;
  for (const { el, cs } of candidates) {
    const t = ownText(el);
    if (!t) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.bottom < vh * 0.25 || r.top > vh * 0.7) continue;
    /* Mission Control holds each block of the report at opacity 0 and turns them on across a
       twenty-five second sequence, so a block measured before its moment is legitimately
       transparent -- and still transparent 900ms later, which is all the settle re-check can
       see. That produced 138 findings, every one a block waiting its turn. The sequence is not
       unowned: check-motion asserts every reveal settles and check-mission-pause asserts the
       sequence itself, so this guard steps back from it rather than racing it. */
    if (el.closest(".mc-armed")) continue;
    /* Gradient text is painted THROUGH the glyphs: the ink is transparent on purpose and the
       colour comes from the background. Reading cs.color alone calls the hero headline
       invisible. */
    if ((cs.webkitBackgroundClip || cs.backgroundClip) === "text") continue;
    const m = cs.color.match(/rgba?\\(([^)]+)\\)/);
    const a = m ? (m[1].split(",")[3] !== undefined ? parseFloat(m[1].split(",")[3]) : 1) : 1;
    let opacity = 1;
    for (let p = el; p && p !== document.body; p = p.parentElement) opacity *= parseFloat(getComputedStyle(p).opacity || "1");
    if (a < 0.12 || opacity < 0.12) out.fade.push({ el: label(el), text: t.slice(0, 60), alpha: +a.toFixed(2), opacity: +opacity.toFixed(2) });
  }

  /* ---- COLLIDE: two pieces of text drawn on top of each other ------------
     Only leaves that carry their OWN text, only pairs where neither contains the other, and
     only where both are in normal flow.

     "In normal flow" has to be judged on the whole ANCESTOR CHAIN, not on the element. The
     consent banner is fixed and the header is sticky, but the <strong> and the <a> inside them
     are both position:static -- so an element-level test called every overlay a collision and
     produced 411 findings on a page with none. An overlay is *supposed* to sit over the page;
     what is not supposed to happen is two things in the flow landing on each other. */
  const floating = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === "fixed" || pos === "sticky" || pos === "absolute") return true;
    }
    return false;
  };
  /* An inline element must be compared LINE BOX BY LINE BOX, not by its bounding rect. An
     inline <code> that wraps has a bounding rect spanning the full column, which overlaps
     every sibling on both of its lines -- "«Activate» over «--solo»" was two words sitting
     peacefully in one sentence. getClientRects() returns the boxes that are actually painted. */
  const leaves = [];
  for (const { el, cs } of candidates) {
    const t = ownText(el);
    if (!t) continue;
    if (cs.position !== "static" && cs.position !== "relative") continue;
    if (floating(el)) continue;
    const rects = [...el.getClientRects()].filter((r) => r.width >= 2 && r.height >= 2);
    if (!rects.length) continue;
    leaves.push({ el, rects, t });
  }
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const A = leaves[i], B = leaves[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      let worst = 0;
      for (const ra of A.rects) for (const rb of B.rects) {
        const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (x <= 1 || y <= 1) continue;
        const ratio = (x * y) / Math.min(ra.width * ra.height, rb.width * rb.height);
        if (ratio > worst) worst = ratio;
      }
      if (worst < 0.3) continue;
      out.collide.push({ a: label(A.el), at: A.t.slice(0, 40), b: label(B.el), bt: B.t.slice(0, 40),
                         overlap: +worst.toFixed(2) });
    }
  }
  return out;
})()`;

/* ---------- 3. Drive it ------------------------------------------------- */
const PORT = await new Promise((res, rej) => {
  const p = net.createServer();
  p.on("error", rej);
  p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); });
});
/* Keep the server's dying words. Run 4 of this sweep ended with ERR_CONNECTION_REFUSED on job
   3 of 55 and `stdio: "ignore"` meant there was nothing to read: the harness could say the site
   was unreachable but not why. Now a death names itself. */
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "ignore", "pipe"] });
let serverDied = "";
server.stderr.on("data", (b) => { serverDied += b.toString(); });
server.on("exit", (code, sig) => {
  if (code === 0 || sig === "SIGTERM") return;
  console.error(`\nTHE PREVIEW SERVER DIED (code ${code}). Every finding after this point is the harness, not the page.`);
  if (serverDied.trim()) console.error(serverDied.trim().split("\n").slice(0, 12).map((l) => "  " + l).join("\n"));
});
const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 80; i++) { try { const r = await fetch(base); if (r.ok) break; } catch { await new Promise((r) => setTimeout(r, 150)); } }

const browser = await chromium.launch();
const findings = [];
let combos = 0;

/* One job per (viewport x language). 12 x 11 is 132 of them and each walks eleven routes, so
   they run in a pool rather than a nested loop -- serially this is hours, and an audit nobody
   waits for is an audit nobody runs. */
const jobs = [];
for (const v of subjWidths) for (const lang of subjLangs) jobs.push({ v, lang });
let next = 0;
const worker = async () => {
  for (;;) {
    const idx = next++;
    if (idx >= jobs.length) return;
    const { v, lang } = jobs[idx];
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h } });
    /* The language is a cookie, so it is in force on the FIRST paint. Clicking the menu
       instead would measure a page that had already laid itself out in English. */
    await ctx.addCookies([{ name: "bugitLang", value: lang.code, url: base }]);
    const page = await ctx.newPage();
    const consoleErrors = [];
    const netErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
    page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 200)));
    page.on("requestfailed", (r) => netErrors.push(r.url().replace(base, "/") + " " + (r.failure()?.errorText || "")));
    page.on("response", (r) => { if (r.status() >= 400) netErrors.push(r.url().replace(base, "/") + " HTTP " + r.status()); });

    for (const route of subjRoutes) {
      combos++;
      await page.goto(base + (route ? "#" + route : ""), { waitUntil: "networkidle" });
      await page.waitForTimeout(350);
      const where = `${lang.code}/${v.label}${route || "/home"}`;
      const seen = new Set();
      const add = (kind, detail) => {
        const k = kind + "|" + detail;
        if (seen.has(k)) return;
        seen.add(k);
        findings.push({ kind, where, detail });
      };
      /* Walk the page top to bottom, measuring at each stop. Sticky chrome, scroll-driven
         reveals and anything that only overflows once it is on screen are all invisible to a
         single measurement taken from the top. */
      const stops = await page.evaluate(() => {
        const total = document.documentElement.scrollHeight - innerHeight;
        /* A licence page at 320px is 24000px tall; walking it in 0.75-viewport steps is 100
           measurements of the same paragraph shape. 40 stops is enough to see every distinct
           block on the longest page here, and keeps the sweep inside a coffee break. */
        const step = Math.max(240, innerHeight * 0.75, total / 40);
        const out = [];
        for (let y = 0; y <= total + step; y += step) out.push(Math.round(Math.min(y, Math.max(0, total))));
        return [...new Set(out)];
      });
      for (const y of stops) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.waitForTimeout(160);
        let r = await page.evaluate(PROBE);
        /* THE FADE RE-CHECK. The doc pages run a time-based entry animation (docHeadIn) on every
           render, so a sample taken 160ms after arriving catches the heading at opacity 0 and
           calls it invisible -- 419 times, on a page whose heading is perfectly visible a
           quarter of a second later. Ink is only judged on what is STILL transparent once the
           animations here have settled. Geometry needs no such wait. */
        if (r.fade.length) {
          /* WAIT FOR THE ANIMATION TO STOP, DON'T GUESS HOW LONG IT TAKES.
             This was a fixed window, raised from 900ms to 1500ms when two headings at 1920
             still landed inside the entry animation. The CI runner is slower than this machine
             and 1500ms was not enough there either: three more headings, on pages whose text is
             plainly visible a moment later. Guessing a duration means re-guessing it on every
             new machine.
             So: ask the page when its animations have finished. getAnimations() reports exactly
             what is still running on the elements in question, and their `finished` promises
             resolve when they are done. The deadline is a backstop for an infinite animation,
             not the mechanism. */
          /* WATCH THE INK, NOT THE CLOCK — and not the animation list either. Waiting on
             `getAnimations().finished` looks right and is a trap on this page: the ground runs
             several INFINITE animations (the particle drift, the sheen), so their promises never
             resolve and every check burned its whole timeout. The sweep went from minutes to
             hours and I stopped it.
             What actually needs to settle is the opacity of the specific elements just reported.
             Poll those: leave as soon as they are opaque, or as soon as they stop changing. A
             page whose reveal has finished exits in ~200ms; only a genuinely stuck element pays
             the full deadline. */
          /* RE-ASK THE PROBE, DON'T RE-FIND THE ELEMENTS.
             Two earlier attempts failed in instructive ways. A fixed wait had to be re-guessed
             on every machine (900ms here, 1500ms here, still not enough on the CI runner). Then
             I polled the reported elements by re-selecting them — and when that lookup missed,
             it found nothing, returned instantly, and waited zero milliseconds while looking
             exactly like it had waited: seven doc ledes reported as invisible on a page whose
             text is measurably opaque 900ms after it renders.
             The probe already knows how to find what is faded. Ask it again until it stops
             saying so, or until the deadline. Nothing to keep in sync, and an empty result is
             the answer rather than a silent no-op. */
          let again = null;
          for (let i = 0; i < 14; i++) {
            await page.waitForTimeout(200);
            again = await page.evaluate(PROBE);
            if (!again.fade.length) break;
          }
          const still = new Set((again ? again.fade : []).map((f) => f.el + "|" + f.text));
          r.fade = r.fade.filter((f) => still.has(f.el + "|" + f.text));
        }
        if (r.pan > 1) {
          add("PAN", `document is ${r.pan.toFixed(0)}px wider than the ${v.w}px viewport`);
          /* A pan with no ESCAPE means the overflow is INLINE content inside a box that is
             itself the right width -- an element rect cannot show it. Name the culprits. */
          for (const l of r.leak) add("PAN", `  ↳ ${l.el} needs ${l.need}px more than it has (${l.cw}→${l.sw})  «${l.text}»`);
        }
        for (const e of r.escape) add("ESCAPE", `${e.el} is ${e.over}px past the edge  «${e.text}»`);
        for (const c of r.clip) add("CLIP", `${c.el} cuts ${c.over}px${c.axis ? " on " + c.axis : " (clipped by " + c.by + ")"}  «${c.text}»`);
        for (const c of r.collide) add("COLLIDE", `${c.a} «${c.at}» over ${c.b} «${c.bt}» (${c.overlap})`);
        for (const f of r.fade) add("FADE", `${f.el} alpha=${f.alpha} opacity=${f.opacity}  «${f.text}»`);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    /* TWO THINGS THIS HARNESS CAUSES ITSELF, and nothing else.
       A guard that can never be green is a guard everyone learns to ignore, so these are named
       exactly -- URL and error text together -- rather than filtered by keyword:

       1. The session probe to portal.bugit.dev is refused by CORS because the portal
          allow-lists https://bugit.dev and this page is served from 127.0.0.1. That is the
          portal being correctly strict about an origin the harness invented. The live header
          is asserted below rather than assumed, so if the portal ever stops allowing the real
          site this still fails.
       2. Chromium aborts its own media preload when the context closes. ERR_ABORTED on a demo
          video is the browser cancelling a request nobody is waiting for.

       Anything else -- a 404, a script error, a failed stylesheet -- is still a finding. */
    const HARNESS_ONLY = [
      { re: /portal\.bugit\.dev\/api\/session-status/, and: /ERR_FAILED|CORS policy|Access to fetch/, why: "cross-origin session probe from the harness origin" },
      { re: /\/public\/media\/.*\.mp4/, and: /ERR_ABORTED/, why: "Chromium cancelling its own media preload" },
      { re: /^Failed to load resource: net::ERR_FAILED$/, and: /.*/, why: "the console half of the same cross-origin probe" },
    ];
    const selfInflicted = (text) => HARNESS_ONLY.some((h) => h.re.test(text) && h.and.test(text));
    for (const e of [...new Set(consoleErrors)]) if (!selfInflicted(e)) findings.push({ kind: "CONSOLE", where: `${lang.code}/${v.label}`, detail: e });
    for (const e of [...new Set(netErrors)]) if (!selfInflicted(e)) findings.push({ kind: "NETWORK", where: `${lang.code}/${v.label}`, detail: e });
    await ctx.close();
    process.stdout.write(`  [${String(idx + 1).padStart(3)}/${jobs.length}] ${v.label.padStart(5)} ${String(v.w) + "x" + v.h} ${lang.code.padEnd(6)} ${subjRoutes.length} routes\n`);
  }
};
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

await browser.close();
/* Wait for the child to be GONE, do not just ask it to go. `kill()` only sends the signal, and
   process.exit() racing a half-closed stderr pipe aborts the whole run under a libuv assertion
   on Windows -- exit code 127 on a CLEAN sweep. It only ever showed up when there was nothing
   to report, because printing a long list of findings gave the handle time to finish closing:
   a teardown bug that hid whenever the audit failed and appeared only when it passed. */
await (async () => {
  if (server.exitCode !== null) return;
  server.stderr?.destroy();
  server.kill();
  await new Promise((res) => {
    const done = () => { clearTimeout(t); res(); };
    const t = setTimeout(done, 2000);
    server.once("exit", done);
  });
})();

/* ---------- 3b. Pay for the CORS exemption ------------------------------
   The sweep ignores the refused session probe because the harness serves from 127.0.0.1 and
   the portal allow-lists the real site. That reasoning is only sound if the real site IS
   allowed, so check it instead of assuming it. Skipped, out loud, when there is no network --
   an offline run should report less, never pass on a claim it could not test. */
/* node:https with a keep-alive-free agent, NOT fetch. Measured: one `fetch()` here turned a
   CLEAN sweep into exit code 127 -- undici's global connection pool outlives the script, and
   process.exit() racing it aborts the process under a libuv assertion. Removing the call alone
   restored exit 0, which is how I know it was this and not the browser or the child server.
   An agent I create is an agent I can destroy. */
const allowOrigin = await new Promise((resolve) => {
  const agent = new https.Agent({ keepAlive: false });
  const done = (v) => { try { agent.destroy(); } catch {} clearTimeout(t); resolve(v); };
  const t = setTimeout(() => done(null), 12000);
  const req = https.request(
    { host: "portal.bugit.dev", path: "/api/session-status", method: "GET", agent, headers: { Origin: "https://bugit.dev" } },
    (res) => { res.resume(); res.on("end", () => done(res.headers["access-control-allow-origin"] ?? "(absent)")); },
  );
  req.on("error", () => done(null));
  req.end();
});
if (allowOrigin === null) {
  console.log("\nlive CORS: not checked (no network) — the refused session probes above are unverified");
} else if (allowOrigin !== "https://bugit.dev") {
  findings.push({ kind: "NETWORK", where: "live", detail: `portal.bugit.dev answers the real site with Access-Control-Allow-Origin: ${allowOrigin} — the signed-in header state cannot reach bugit.dev` });
} else {
  console.log("\nlive CORS: portal.bugit.dev allows https://bugit.dev (so the refusals above are this harness's own origin)");
}

/* A run that rendered nothing must not report "clean". `--route home` matches no route (the
   home route is the empty string) and this printed five clean sections over zero pages: the
   exact shape of silent pass this whole audit keeps turning up. */
if (combos === 0) {
  console.error(`\ncheck-space FAIL: nothing was rendered — ${subjLangs.length} language(s) x ${subjWidths.length} width(s) x ${subjRoutes.length} route(s). Check the --lang/--route filter.`);
  process.exit(1);
}

/* ---------- 4. Report --------------------------------------------------- */
const byKind = {};
for (const f of findings) (byKind[f.kind] ||= []).push(f);
console.log(`\n${combos} page renders across ${subjLangs.length} languages x ${subjWidths.length} widths x ${subjRoutes.length} routes\n`);
for (const kind of ["PAN", "ESCAPE", "CLIP", "COLLIDE", "FADE", "CONSOLE", "NETWORK"]) {
  const list = byKind[kind] || [];
  if (!list.length) { console.log(`${kind.padEnd(8)} clean`); continue; }
  /* Collapse: the same element failing in nine languages is one defect, not nine. */
  const groups = new Map();
  for (const f of list) {
    const key = f.detail.replace(/\d+(\.\d+)?px/g, "Npx").replace(/«[^»]*»/, "«…»").replace(/\(\d\.\d+\)/, "(r)");
    if (!groups.has(key)) groups.set(key, { sample: f.detail, where: [] });
    groups.get(key).where.push(f.where);
  }
  console.log(`\n${kind}  —  ${list.length} occurrence(s), ${groups.size} distinct`);
  for (const [, g] of [...groups].sort((a, b) => b[1].where.length - a[1].where.length)) {
    console.log(`  · ${g.sample}`);
    console.log(`      ${g.where.length}x  ${g.where.slice(0, 8).join(" ")}${g.where.length > 8 ? " …" : ""}`);
  }
}
const total = findings.length;
console.log(`\n${total ? total + " FINDINGS" : "no space, clipping, collision or fade defects in any language"}`);
process.exit(total ? 1 : 0);
