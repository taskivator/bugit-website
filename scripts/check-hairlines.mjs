/*
 * ONE SEPARATOR, ONE LINE.
 *
 * Owner, 2026-08-21: "as they disappear i can see the box borders duplicating like this", with a
 * screenshot of the documentation grid mid-reveal. Twenty minutes later: "the duplicate thingy is
 * happening here too", with the trust grid.
 *
 * I fixed the first one by reading the stylesheet and reasoning about it. The reasoning was
 * right, and the second report arrived anyway. That is the tell: a defect you can only confirm by
 * looking at a picture will keep coming back, because "does this look like two lines" is not a
 * question source code can answer. This file answers it from PIXELS.
 *
 * WHY IT HAPPENS AT ALL. These grids draw their separators by leaving a 1px gap between cells.
 * Whatever fills that gap is the line. If two different things fill it -- a card's own edge and
 * its neighbour's, or a card's edge and the wrapper's border -- then at rest they sit on top of
 * each other and read as one line, and the moment the two cards have DIFFERENT opacities, which
 * is the entire point of a staggered reveal, they come apart into two lines of different
 * strengths. Every version of this bug looks fine in a static screenshot and wrong while
 * scrolling, which is exactly how it shipped twice.
 *
 * WHERE IT LOOKS. Not everywhere. The first draft of this file scanned whole scanlines for
 * luminance ridges and returned 377 findings, nearly all of them the vertical strokes of
 * LETTERS: an "l" beside an "i" is two bright columns 3px apart and no row of pixels can tell
 * that from a doubled hairline. A separator is not anywhere -- it is in the gap between two
 * cells, or on the wrapper's own edge. So the windows are computed from the boxes, and each is
 * sampled at a y (or x) inside the cells' padding, where no glyph can reach.
 *
 * It measures at rest AND mid-reveal, because mid-reveal is the only state where the defect
 * shows and it is the state no static check ever looks at.
 *
 * THE SUBJECT IS COMPUTED: every element on the page whose column or row gap is 1px and which
 * has more than one child. A seventh grid built this way is measured the day it is added.
 */
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);
/* Owner: "make sure these issues are fixed in other views as well, mobile, tablet, all."
   Desktop wide, desktop narrow, tablet landscape, tablet portrait, large phone, small phone. */
const WIDTHS = [1600, 1280, 1024, 768, 430, 360];

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
  console.error(`check-hairlines: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}

/* Every hairline grid the page has, found by its gap rather than by its name. */
const FIND = () => {
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (!/^grid|^flex/.test(cs.display)) continue;
    /* EVERY GRID, NOT ONLY THE 1px ONES. The first version of this took `gap === 1` as its
       subject, on the reasoning that a doubled line needs a shared gap to be doubled in. That
       is where the defect had appeared twice, and it is not where it can appear: a card with a
       border of its own, sitting next to another card with a border of its own, draws two lines
       a gap apart, and if that gap is small enough the pair reads as one thick or doubled edge.
       So the subject is every grid whose children are close enough together for that to happen,
       and 16px is the widest gap on this page that a reader could still read as one seam. */
    /* A HAIRLINE GRID IS ONE WHOSE CELLS TOUCH. `gap === 1` was right when the seam was a gap
       showing a plane behind it; sections 106-108 moved the seams onto the cells' own borders
       with `gap:0`, so the test is now "touching or one pixel apart". An earlier draft allowed
       up to 16px, which swept in the film wall -- twelve separate cards with their own borders
       and real space between them -- and reported 253 findings about a design that is not this
       one. */
    /* `parseFloat("0px") || 99` reads a legitimate gap of ZERO as 99, and sections 106-108
       made exactly these grids `gap:0`. The subject came back empty at every width and the
       sweep found nothing to measure -- caught only because this file refuses to pass on an
       empty sweep. `||` is the wrong operator whenever 0 is a real answer. */
    const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 99; };
    const gap = Math.min(num(cs.columnGap), num(cs.rowGap));
    if (!(gap <= 1)) continue;
    if (el.children.length < 2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 30) continue;
    const name = el.tagName.toLowerCase() +
      (el.id ? "#" + el.id : "") +
      (typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
    el.dataset.hairKey = name;
    out.push(name);
  }
  return out;
};

/* The windows a separator can occupy, derived from the layout. */
const WINDOWS = (name) => {
  const el = document.querySelector('[data-hair-key="' + name + '"]');
  if (!el) return null;
  const R = (n) => n.getBoundingClientRect();
  const g = R(el);
  const cells = [...el.children].filter((n) => { const r = R(n); return r.width > 4 && r.height > 4; });
  if (cells.length < 2) return null;
  const kids = cells.map(R);
  const near = (a, b) => Math.abs(a - b) < 2;
  const out = { v: [], h: [] };

  /* A WINDOW IS A SEPARATOR WINDOW ONLY WHERE A LINE IS DECLARED, and getting that wrong cost
     five findings that were all the same mistake. The subject is every grid whose cells touch,
     which is right -- but it then measured all four of each wrapper's edges whether or not
     anything was ever meant to draw there. Two of the six grids on this page separate their
     ROWS only: the FAQ list and the two integration lists give each cell a 1px top border and
     nothing on the left or the right. Measuring their left and right edges finds whatever
     happens to be near the first cell's midline -- a chevron, a list marker, the leading stem
     of a glyph -- and calls a pair of them a doubled separator. Measured on the integration
     list at 1600: the profile across the 'leading edge' window was 11 12 11 12 11 11 11 11 14
     90 158 169 172 172 173, which is not a line beside a line, it is flat panel and then text.

     So each boundary is enabled by what the product declares on it: a border width on the
     wrapper's own side, or on the side of a cell that meets it. A grid that draws no vertical
     rule has no vertical separator to draw twice.

     BOX-SHADOWS KEEP EVERY WINDOW OPEN, and that exception is the whole point. The defect this
     file exists for was a shadow, not a border -- sections 106-108 moved the seams onto borders
     precisely because shadows do not snap to the pixel grid. If a shadow ever comes back to any
     cell or wrapper here, reading only border widths would quietly stop looking at the edges
     where it would show. So a shadow anywhere in the grid re-opens all four sides, and the ring
     negative control below -- which is a shadow -- still fires on every one of them. */
  const bw = (n, side) => parseFloat(getComputedStyle(n)["border" + side + "Width"]) || 0;
  const shadowed = (n) => { const s = getComputedStyle(n).boxShadow; return !!s && s !== "none"; };
  const anyShadow = shadowed(el) || cells.some(shadowed);
  const declared = (aEl, aSide, bEl, bSide) =>
    anyShadow || (aEl && bw(aEl, aSide) > 0) || (bEl && bw(bEl, bSide) > 0);

  for (let i = 0; i < kids.length; i++) {
    for (let j = 0; j < kids.length; j++) {
      if (i === j) continue;
      const a = kids[i], b = kids[j];
      /* EVERY SAMPLE LINE RUNS THROUGH THE MIDDLE OF A CELL. Sampling near a cell's own corner
         crosses the perpendicular separator or the rounded border, and a profile that crosses a
         second line reports it as a doubling of the first. */
      if (near(a.top, b.top) && b.left >= a.right - 0.5 && b.left - a.right <= 2
          && declared(cells[i], "Right", cells[j], "Left")) {
        out.v.push({ x0: a.right - 6, x1: b.left + 6,
                     ys: [a.top + a.height * 0.35, a.top + a.height * 0.65],
                     what: "the gap between two cells in a row" });
      }
      if (near(a.left, b.left) && b.top >= a.bottom - 0.5 && b.top - a.bottom <= 2
          && declared(cells[i], "Bottom", cells[j], "Top")) {
        out.h.push({ y0: a.bottom - 6, y1: b.top + 6,
                     xs: [a.left + a.width * 0.35, a.left + a.width * 0.65],
                     what: "the gap between two rows" });
      }
    }
  }
  /* THE PERIMETER IS SAMPLED AT THE MIDDLE OF AN EDGE, ON ONE SCANLINE, and both halves of that
     matter. These wrappers have a 14px border-radius, so near a corner the border's x moves
     inward by up to 2.5px over 6px of y -- and a profile AVERAGED over two ys near two different
     corners has two bumps in it that are the same line photographed twice. That produced thirteen
     findings of 1.5 to 4.3px, every one of them a rounded corner rather than a doubled edge. The
     middle of an edge is straight, and one scanline cannot smear a curve. */
  const first = kids[0], last = kids[kids.length - 1];
  const firstEl = cells[0], lastEl = cells[cells.length - 1];
  const mid = (r, k) => r[k === "y" ? "top" : "left"] + (k === "y" ? r.height : r.width) / 2;
  if (declared(el, "Left", firstEl, "Left"))
    out.v.push({ x0: g.left - 4, x1: g.left + 7, ys: [mid(first, "y")], what: "the wrapper's leading edge" });
  if (declared(el, "Right", lastEl, "Right"))
    out.v.push({ x0: g.right - 7, x1: g.right + 4, ys: [mid(last, "y")], what: "the wrapper's trailing edge" });
  if (declared(el, "Top", firstEl, "Top"))
    out.h.push({ y0: g.top - 4, y1: g.top + 7, xs: [mid(first, "x")], what: "the wrapper's top edge" });
  if (declared(el, "Bottom", lastEl, "Bottom"))
    out.h.push({ y0: g.bottom - 7, y1: g.bottom + 4, xs: [mid(last, "x")], what: "the wrapper's bottom edge" });
  if (!out.v.length && !out.h.length) return null;

  const box = { x: Math.round(Math.max(0, g.left - 8)), y: Math.round(Math.max(0, g.top - 8)) };
  box.width = Math.round(Math.min(window.innerWidth - box.x, g.width + 16));
  box.height = Math.round(Math.min(window.innerHeight - box.y, g.height + 16));
  if (box.width < 20 || box.height < 20) return null;
  return { box, windows: out, ops: [...el.children].map((k) => +(+getComputedStyle(k).opacity).toFixed(2)) };
};

/* Count the painted lines inside each window. A line is a run of pixels measurably lighter than
   the panel either side of it, collapsed so that one 1px line at 2x device pixels counts once.
   Two runs inside one window is one separator drawn twice. */
const COUNT = async ([shot, box, windows, threshold]) => {
  const img = new Image();
  img.src = "data:image/png;base64," + shot;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const s = img.width / box.width;
  const d = g.getImageData(0, 0, img.width, img.height).data;
  const lum = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null;
    const i = ((y * img.width) + x) * 4;
    return d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  };
  /* A LINE IS A NARROW RIDGE, not simply a bright pixel. The version before this one took the
     25th percentile of the window as its floor and called anything above it a line -- which made
     the CARD count as a line at every perimeter window, because a card fill (luminance 11) is
     brighter than the page ground behind the wrapper (5). Nineteen findings, all of them the
     boundary between the page and a card, none of them a doubled separator.
     Two properties separate a separator from a step. It is brighter than what sits on BOTH sides
     of it a couple of pixels away, and it is narrow: 1px by construction, 3px after
     antialiasing at 2x. A step between two flat regions satisfies neither. */
  const runs = (profile, origin) => {
    const n = profile.length;
    if (n < 7) return [];
    const at = (i) => profile[Math.max(0, Math.min(n - 1, i))];
    const raw = [];
    let open = null;
    for (let i = 0; i < n; i++) {
      const ridge = profile[i] - Math.min(at(i - 2), at(i + 2)) > threshold;
      if (ridge) { if (!open) open = { a: i, b: i }; else open.b = i; }
      else if (open) { raw.push(open); open = null; }
    }
    if (open) raw.push(open);
    const merged = [];
    for (const r of raw) {
      if (merged.length && r.a - merged[merged.length - 1].b <= 1) { merged[merged.length - 1].b = r.b; continue; }
      merged.push({ a: r.a, b: r.b });
    }
    /* A ridge cannot be claimed at the very edge of the window. `at()` clamps at both ends, so
       a profile that simply ramps up as it leaves the sampled strip looks like a local maximum
       there. Measured: the documentation grid's trailing window ran to x=1464 while the wrapper's
       own right edge is at 1460, and the ramp in the last two pixels was reported as a second
       line 4.2px from the first. */
    const edge = 2 * s;
    /* A LINE IS ONE PIXEL WIDE, and that -- not how bright it is -- is what separates it from a
       wash. `.metrics` cells carry no border at all: the only drawable line there is the
       wrapper's own, and the crest of the radial gradient a few pixels inside it was being
       counted as a second separator at four widths. A 1px border at 2x covers two device pixels
       and up to three with antialiasing; a gradient crest is broad. Three CSS pixels was
       generous enough to admit the crest.
       Brightness was tried first and is the wrong test: the injected controls draw their extra
       line in a fixed colour rather than the separator's, so a "the copy must be as bright as
       the original" rule cut the offset control from 113 findings to 1. A guard tuned until it
       stops seeing the defect it was built for is worse than no guard.
       2.6 rather than 1.8 for the same reason, one control further on: a ring drawn ON the
       border is two touching pixels, and 1.8 refused it -- the ring control stopped firing
       altogether. The bound has to admit a doubled hairline while refusing a wash, and that is
       where both controls fire. */
    return merged
      .filter((r) => (r.b - r.a + 1) / s <= 2.6)
      .filter((r) => (r.a + r.b) / 2 >= edge && (r.a + r.b) / 2 <= n - 1 - edge)
      .map((r) => +(origin + ((r.a + r.b) / 2) / s).toFixed(1));
  };

  const res = { v: [], h: [] };
  for (const w of windows.v) {
    const prof = [];
    for (let x = (w.x0 - box.x) * s; x <= (w.x1 - box.x) * s; x++) {
      let t = 0, n = 0;
      for (const y of w.ys) { const v = lum(x, (y - box.y) * s); if (v != null) { t += v; n++; } }
      prof.push(n ? t / n : 0);
    }
    res.v.push({ what: w.what, lines: runs(prof, w.x0) });
  }
  for (const w of windows.h) {
    const prof = [];
    for (let y = (w.y0 - box.y) * s; y <= (w.y1 - box.y) * s; y++) {
      let t = 0, n = 0;
      for (const x of w.xs) { const v = lum((x - box.x) * s, y); if (v != null) { t += v; n++; } }
      prof.push(n ? t / n : 0);
    }
    res.h.push({ what: w.what, lines: runs(prof, w.y0) });
  }
  return res;
};

/* THE GROUND HAS TO BE FLAT, or the texture on it counts as lines.

   `#ambient` is the decorative layer behind the whole page: a slowly drifting 1px grid and two
   aurora washes. Measured at 430, on the scanline the metrics grid's own left edge is sampled
   on, the page ground just outside that border read

       15.8 18 15.8 18 16.1 19 17.8 20 18.1 19 | 26.7 26.7 | 11.9 11.9 11.9 ...

   -- the wrapper's border at 26.7, the card fill at 11.9, and to the left of them a ground that
   oscillates by about 4 luminance every single pixel. The ridge threshold is 3, so at the right
   phase one of those bumps clears it and is reported as a second line 2.3px from the first. It
   moved between runs, because the grid drifts.

   Raising the threshold above the texture would blind this to a faint real doubling, which is
   the exact shape of the defect it was written for. So the decoration is taken out of the
   picture instead: it is behind everything being measured, it can never be a separator, and
   both negative controls still fire without it. The grids, their borders and their reveals are
   untouched. */
const FLAT_GROUND = "#ambient{display:none !important}";

async function sweep(browser, inject, label) {
  const found = [];
  let grids = 0, seps = 0;
  for (const W of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: W, height: 900 }, deviceScaleFactor: 2 });
    const css = FLAT_GROUND + (inject ? "\n" + inject : "");
    await page.route("**/styles.css", async (route) => {
      const res = await route.fetch();
      route.fulfill({ response: res, body: (await res.text()) + "\n" + css });
    });
    await page.goto(base + "/", { waitUntil: "load" });
    try { await page.click("#consentReject", { timeout: 1200 }); } catch {}
    /* PARK THE POINTER. `.doc-cards a:hover` lifts a card 3px, and a click leaves the mouse where
       it landed -- so as the page scrolls, whatever passes under that point is hovered. That read
       as a 3px misalignment of a perfectly good grid for a whole round of this. */
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    const names = await page.evaluate(FIND);

    for (const name of names) {
      /* MID-REVEAL IS THE STATE THAT MATTERS: that is where two lines drawn by two cards at two
         opacities come apart. At rest is measured too, because a doubling that survives there is
         a different defect and both are worth naming. */
      for (const [state, frac] of [["mid-reveal", 0.80], ["at rest", 0.05]]) {
        await page.evaluate(([n, f]) => {
          const el = document.querySelector('[data-hair-key="' + n + '"]');
          if (!el) return;
          window.scrollTo(0, Math.max(0, Math.round(window.scrollY + el.getBoundingClientRect().top - window.innerHeight * f)));
        }, [name, frac]);
        await page.waitForTimeout(320);
        /* AT REST MEANS AT REST, and scrolling to a position is not enough to get there. The
           reveals are driven by view() timelines, so a cell's opacity is a function of WHERE IT
           IS, not of how long the page has been open. At 360 every one of these grids is a
           single column taller than the viewport, so there is no scroll position at which all
           of its cells are revealed: the top ones are done and the bottom ones have not
           started. Measured that way the pass reported "at rest" with cell opacities of
           1 1 1 1 0.31 0 and called the resulting two faint bands a doubled separator.
           Taking the animations away leaves every cell at its base style, which for these
           reveals is the finished one. That is the state a reader sees once the page has
           settled, and it is the only state in which "a doubling that survives at rest" means
           anything. Mid-reveal is measured on its own, untouched, because that is where the
           defect this file was written for actually appears. */
        const settle = state === "at rest"
          ? await page.addStyleTag({ content: "*,*::before,*::after{animation:none !important}" })
          : null;
        if (settle) await page.waitForTimeout(120);
        const spec = await page.evaluate(WINDOWS, name);
        if (!spec) { if (settle) await settle.evaluate((el) => el.remove()); continue; }
        const shot = (await page.screenshot({ clip: spec.box })).toString("base64");
        const res = await page.evaluate(COUNT, [shot, spec.box, spec.windows, 3]);
        if (settle) await settle.evaluate((el) => el.remove());
        grids++;
        for (const kind of ["v", "h"]) {
          for (const w of res[kind]) {
            seps++;
            const span = w.lines.length > 1 ? w.lines[w.lines.length - 1] - w.lines[0] : 0;
            /* TWO EDGES A REAL GAP APART ARE TWO CARDS, which is the design. Two edges within
               6px are one seam drawn twice, which is what a reader calls a duplicated border. */
            if (w.lines.length > 1 && span <= 6) {
              const gap = +span.toFixed(1);
              found.push(`[${W} ${state}] ${name}: ${w.what} holds ${w.lines.length} painted lines ` +
                         `${gap}px apart (at ${w.lines.join(", ")}). One separator, drawn more than once. ` +
                         `Cell opacities were ${spec.ops.join(" ")}${label ? " (" + label + ")" : ""}.`);
            }
          }
        }
      }
    }
    await page.close();
  }
  return { found, grids, seps };
}

const browser = await chromium.launch();
const real = await sweep(browser, null, null);
for (const f of real.found) fail.push(f);
note(`${real.grids} grid render(s) across ${WIDTHS.length} widths, ${real.seps} separator window(s) inspected`);
if (!real.grids) {
  fail.push("no hairline grid was found at any width, so this sweep measured nothing. An empty " +
            "sweep must never read as a clean one.");
}

/* ---------- and they must STAY LINED UP, all the way down and all the way back --------- */
/* Owner, after the doubled lines were gone: "also the cards are not sticking to each other so
   sometimes when scrolling up they are in different positions up and down and not aligned."

   That is the same defect from the other side. In a hairline grid the seam between two cards is
   drawn by ONE of them, so if a stagger moves one card and not its neighbour, the seam moves
   with it: half of one line at the old y, half at the new one. Everything above measures the
   PAINT and would call that two lines only where the two halves overlap; this measures the
   GEOMETRY, which is where it comes from, and catches it everywhere along the seam.

   IT WALKS, AND IT WALKS BACK. A scroll-driven animation is a function of position, so the way
   in is the way out -- but only if the keyframes are symmetric, and the version that prompted
   the report was not. Sampling two positions per grid, as the paint sweep does, would step over
   the misaligned band entirely. So this walks the whole page in 300px steps and then walks it
   back up, and reports the direction it was going, because that is the sentence the owner used.

   THE TOLERANCE IS HALF A PIXEL. Cells in one CSS grid row share a grid line: their tops are
   equal, not close. Anything above rounding is a transform that one cell has and its neighbour
   does not. */
const ROWS_ALIGN = () => {
  const out = [];
  /* SCREEN RECTS ARE THE WRONG RULER INSIDE A 3D TRANSFORM, and that cost a round of this.
     Mission Control is tilted: `panelSettle` leaves it under a matrix3d with about 3 degrees of
     rotateX. Every descendant is then PROJECTED, so `getBoundingClientRect()` hands back a
     different left for each child purely as a function of how far down the tilted plane it sits
     -- measured at 430: 20.7, 19.7, 19.6, 15.2 for four children that are perfectly flush with
     each other on the surface they are drawn on. Nothing is torn; the ruler is.

     The defect this is looking for is one cell carrying a transform its row-mates do not, so
     that is measured directly and in the grid's own coordinates: the layout position from
     `offsetTop`/`offsetLeft`, which siblings share exactly because they share an offsetParent,
     plus the cell's OWN translation read out of its computed matrix at full precision. An
     ancestor's transform applies to all of them equally and drops out. */
  const shift = (cs) => {
    const t = cs.transform;
    if (!t || t === "none") return { x: 0, y: 0 };
    const n = t.slice(t.indexOf("(") + 1, -1).split(",").map(Number);
    if (t.startsWith("matrix3d")) return { x: n[12] || 0, y: n[13] || 0 };
    return { x: n[4] || 0, y: n[5] || 0 };
  };
  for (const el of document.querySelectorAll("[data-hair-key]")) {
    const name = el.dataset.hairKey;
    const cells = [...el.children]
      .map((n) => {
        const r = n.getBoundingClientRect();
        const cs = getComputedStyle(n);
        const s = shift(cs);
        return { n, r, top: n.offsetTop + s.y, left: n.offsetLeft + s.x };
      })
      .filter((c) => c.r.width > 4 && c.r.height > 4);
    if (cells.length < 2) continue;
    /* Group by shared grid line rather than by index: the column count changes with width and is
       measured here rather than assumed. Two cells are in the same row when their layout tops are
       within 6px -- far enough to catch a stagger, near enough not to merge two real rows, whose
       pitch on this page is never under 60px. */
    const group = (key) => {
      const gs = [];
      for (const c of cells) {
        const v = c[key];
        const g = gs.find((q) => Math.abs(q.v - v) < 6);
        if (g) { g.items.push(c); g.v = Math.min(g.v, v); } else gs.push({ v, items: [c] });
      }
      return gs.filter((g) => g.items.length > 1);
    };
    for (const [key, what] of [["top", "row"], ["left", "column"]]) {
      for (const g of group(key)) {
        const vs = g.items.map((c) => c[key]);
        const spread = Math.max(...vs) - Math.min(...vs);
        if (spread > 0.5) {
          out.push(`${name}: ${g.items.length} cells that share a ${what} are ` +
                   `${spread.toFixed(1)}px apart on ${key} (${vs.map((v) => v.toFixed(1)).join(", ")}), ` +
                   `so the seam they share is drawn in two places`);
        }
      }
    }
  }
  return out;
};
async function walk(browser, inject) {
  const found = [];
  let stops = 0;
  for (const W of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1 });
    const css = FLAT_GROUND + (inject ? "\n" + inject : "");
    await page.route("**/styles.css", async (route) => {
      const res = await route.fetch();
      route.fulfill({ response: res, body: (await res.text()) + "\n" + css });
    });
    await page.goto(base + "/", { waitUntil: "load" });
    try { await page.click("#consentReject", { timeout: 1200 }); } catch {}
    await page.mouse.move(2, 2);
    /* Let the page ENTRANCE finish before measuring alignment. It is a 0.5s animation with a
       per-cell delay, so during it the hero cells legitimately sit at different offsets; a walk
       that starts inside it reports the entrance as a defect. This measures the resting page and
       then every scroll position of it. */
    await page.waitForTimeout(1400);
    await page.evaluate(FIND);
    const h = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const down = [];
    for (let y = 0; y <= h; y += 300) down.push(y);
    down.push(h);
    for (const [dir, list] of [["scrolling down", down], ["scrolling up", [...down].reverse()]]) {
      for (const y of list) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(45);
        stops++;
        for (const b of await page.evaluate(ROWS_ALIGN)) found.push(`[${W} ${dir} @${y}] ${b}`);
      }
    }
    await page.close();
  }
  return { found, stops };
}

const walked = await walk(browser, null);
for (const f of walked.found.slice(0, 12)) fail.push(f);
if (walked.found.length > 12) {
  fail.push(`... and ${walked.found.length - 12} more cells out of line (same rule).`);
}
note(`${walked.stops} scroll position(s) walked down and back up, ${WIDTHS.length} widths`);
if (!walked.stops) fail.push("the alignment walk visited no scroll position, so it measured nothing.");

/* Its own negative control, and it has to be a STAGGER rather than a blanket shift: moving every
   cell by the same amount keeps them lined up with each other, which is exactly the property
   being tested. `:nth-child(2n)` moves every other one. */
const STAGGER = ".doc-cards>a:nth-child(2n),main section.shell.trust>div:nth-child(2n)" +
                "{transform:translateY(4px) !important}";
const walkCtl = await walk(browser, STAGGER);
if (!walkCtl.found.length) {
  fail.push("NEGATIVE CONTROL DID NOT FIRE: a 4px stagger on every other card produced no " +
            "misalignment, so the alignment walk is not measuring what it claims to measure.");
} else {
  note(`negative control (stagger) fired: ${walkCtl.found.length} misaligned cell group(s)`);
}
/* ---------- the negative controls ---------------------------------------- */
/* Two shapes of the same defect, and both must be seen.
   RING is what actually shipped: a full ring on every card, so the 1px gap between two
   neighbours holds two shadows. At rest they coincide and it looks right; mid-reveal, two cards
   at two opacities draw the same gap twice.
   OFFSET is the unambiguous version -- a second line parked 3px outside every card, which no
   coincidence can hide and which appears on the internal gaps and the perimeter alike. If a
   sampling change ever weakens this file the way it weakened it once already (a single scanline
   dropped the ring control from 17 findings to 3), OFFSET is the one that keeps shouting. */
const RING = ".doc-cards>a,main section.shell.trust>div,.metrics>div{box-shadow:0 0 0 1px #3a3a48 !important}";
const OFFSET = ".doc-cards>a,main section.shell.trust>div,.metrics>div{outline:1px solid #3a3a48 !important;outline-offset:3px}";
for (const [what, css] of [["ring", RING], ["offset", OFFSET]]) {
  const ctl = await sweep(browser, css, "control");
  if (!ctl.found.length) {
    fail.push(`NEGATIVE CONTROL DID NOT FIRE: the ${what} defect produced no doubled line, so this ` +
              `check cannot see the thing it exists for.`);
  } else {
    note(`negative control (${what}) fired: ${ctl.found.length} doubled line(s)`);
  }
}
await browser.close();

server.kill();
if (process.platform === "win32" && server.pid) {
  try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
}

if (fail.length) {
  for (const f of fail.slice(0, 30)) console.error("FAIL: " + f);
  if (fail.length > 30) console.error(`... and ${fail.length - 30} more`);
  console.error(`\ncheck-hairlines: ${fail.length} finding(s).`);
  process.exit(1);
}
console.log("check-hairlines OK: every separator in every 1px-gap grid is a single painted line, " +
            "at rest and mid-reveal, at every width measured.");
