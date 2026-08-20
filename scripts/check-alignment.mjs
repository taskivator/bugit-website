// The page has ONE content edge and ONE centre line, and the stylesheet that produces them
// is fully layered.
//
// Two checks, in one file, because they are the same fact seen from two ends.
//
// WHAT THE DESIGN PROMISES. Every section on the home page begins at the same x: the hero,
// the trust table, the integrations card, the pricing pair, the FAQ and the footer all start
// on the shell's edge. Inside them, every section HEAD is centred on that shell. That is not
// decoration. It is the thing that makes a long page read as one document rather than a stack
// of unrelated blocks, and it is invisible to every other guard here, all of which read source
// rather than geometry.
//
// THE HEADS USED TO BE LEFT ALIGNED and this file measured their left edge. When they were
// centred, the old measurement would have passed on a page whose heads were centred within
// twelve DIFFERENT widths, because every head still started somewhere. So it now measures the
// gap on BOTH sides of each head and requires them to match: an assertion that cannot be
// satisfied by accident, and one that keeps working whichever way the design later goes.
//
// HOW IT BREAKS, AND WHY THAT IS SILENT. styles.css is three cascade layers: `legacy` (the
// sheet as it shipped), `design` (the 2026 system), `fixes` (the corrections that must beat
// even a redesign). Layers are resolved before specificity, which is what lets the design win
// without renaming anything app.js depends on. But UNLAYERED declarations outrank every
// layer, so a single stray `}` anywhere in the file closes its layer early and silently
// promotes everything after it above the design.
//
// That is not hypothetical. The sheet shipped for months with a doubled brace after
// .aurora.b. Flat, the parser discarded it and nothing was wrong. The moment the file was
// wrapped in @layer legacy { ... } that same brace closed the layer 765 lines early, three
// quarters of the old sheet became unlayered, and the entire redesign lost to the file it was
// replacing. esbuild parsed it without complaint. The browser rendered it without an error.
// The only symptom was that the page looked like the old page.
//
// So this asserts the mechanism AND the outcome, and then proves it can see the outcome fail.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

// ---------- 1. the stylesheet is fully layered, and balanced ----------------
{
  const css = readFileSync(join(ROOT, "styles.css"), "utf8");
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");

  const declared = bare.match(/@layer\s+([a-z, ]+);/);
  if (!declared) {
    fail.push("styles.css does not declare its layer order. Without the @layer statement the " +
              "order depends on which layer happens to appear first, which is not a design.");
  } else {
    const order = declared[1].split(",").map((s) => s.trim()).filter(Boolean);
    note(`layer order declared: ${order.join(" -> ")}`);
    for (const want of ["legacy", "design", "fixes"]) {
      if (!order.includes(want)) fail.push(`layer "${want}" is not in the declared order`);
    }
    if (order.indexOf("design") < order.indexOf("legacy")) {
      fail.push("design is declared BEFORE legacy, so the old sheet now wins everywhere");
    }
    if (order.indexOf("fixes") < order.indexOf("design")) {
      fail.push("fixes is declared BEFORE design, so the corrections no longer beat the redesign");
    }
  }

  // Balance, counted the way a parser counts: comments skipped, every brace weighed.
  let depth = 0, i = 0, stray = 0;
  while (i < bare.length) {
    const c = bare[i];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth < 0) { stray++; depth = 0; } }
    i++;
  }
  if (stray) {
    fail.push(`styles.css has ${stray} stray closing brace(s). In a layered sheet a stray '}' ` +
              "closes its layer early and silently promotes the rest above the design. " +
              "No parser will tell you: esbuild and the browser both accept it.");
  }
  if (depth !== 0) fail.push(`styles.css ends ${depth} brace(s) deep`);

  // Nothing may live outside a layer. Walk the top level and require every block to be a
  // layer; anything else is a declaration that outranks the whole design system.
  // Statement at-rules (@layer a,b,c; @import; @charset) end in a semicolon and never open a
  // block, so they have to come out before walking the top level. Leaving them in made the
  // layer-order declaration itself look like the head of the first block.
  const blocks = bare.replace(/@(?:layer|import|charset|namespace)[^;{]*;/g, "");
  const outside = [];
  depth = 0; i = 0;
  let segStart = 0;
  while (i < blocks.length) {
    const c = blocks[i];
    if (c === "{") {
      if (depth === 0) {
        const head = blocks.slice(segStart, i).trim();
        if (head && !/^@layer\s+[a-z-]+$/.test(head)) outside.push(head.slice(0, 60));
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) segStart = i + 1;
    }
    i++;
  }
  const tail = blocks.slice(segStart).trim();
  if (tail) outside.push(tail.slice(0, 60));
  for (const o of outside) {
    fail.push(`"${o}" sits outside every layer and therefore outranks all of them`);
  }
  if (!outside.length && !stray) note("every rule in styles.css is inside a layer");
}

// ---------- 2. the rendered page: one edge, one centre line ----------------
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

// The subject is COMPUTED. Not a list of selectors to keep in step with the markup: every
// direct child of the home view that is a section, plus the footer, must share the edge, and
// every head inside one of them must be centred. A section added tomorrow is measured
// tomorrow, and so is its head.
const MEASURE = (dir) => {
  const px = (el) => {
    const r = el.getBoundingClientRect();
    return dir === "rtl" ? Math.round(window.innerWidth - r.right) : Math.round(r.left);
  };
  const edges = [];
  const heads = [];
  for (const s of document.querySelectorAll("#homeView > section")) {
    const id = s.id || s.className.split(" ")[0];
    edges.push({ id, x: px(s) });

    // The head of a section is its .section-head, or the eyebrow+heading pair of a section
    // that carries its own. Centring is measured as the gap either side of the HEADING's own
    // text box, because the block itself is full width and would be centred trivially.
    const h = s.querySelector(".section-head > h2, .card > h2, .docs-strip > .eyebrow");
    if (!h) continue;
    // Measured on the LAST LINE, not on the whole text block. A heading that wraps fills
    // its box on every line but the last, so the bounding box of all the lines together is
    // the box whether the text is centred or flush left, and comparing its gaps proves
    // nothing. The last line is the short one, and where it sits is the whole question.
    const range = document.createRange();
    range.selectNodeContents(h);
    const lines = [...range.getClientRects()].filter((r) => r.width > 1);
    const box = h.getBoundingClientRect();
    if (!lines.length || !box.width) continue;
    const last = lines[lines.length - 1];
    heads.push({ id,
                 left: Math.round(last.left - box.left),
                 right: Math.round(box.right - last.right),
                 // ...and the box itself has to be centred in its section, which is what
                 // margin-inline:auto is for and what a stray width would break.
                 boxLeft: Math.round(box.left - s.getBoundingClientRect().left),
                 boxRight: Math.round(s.getBoundingClientRect().right - box.right) });
  }
  const foot = document.querySelector("footer.footer");
  if (foot) edges.push({ id: "footer", x: px(foot) });
  return { edges, heads };
};

try {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error(`the site server exited before serving (${serverExit})`);
    try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  const browser = await chromium.launch();
  let nEdges = 0, nHeads = 0;
  for (const width of [1440, 1280, 1024]) {
    for (const lang of ["en", "ar"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(base, { waitUntil: "networkidle" });
      await page.evaluate((l) => applyLang(l), lang);
      await page.waitForTimeout(160);
      const dir = lang === "ar" ? "rtl" : "ltr";
      const { edges, heads } = await page.evaluate(MEASURE, dir);

      if (edges.length < 5) {
        fail.push(`[${width}px ${lang}] measured only ${edges.length} sections: the scan did not run`);
      }
      const xs = [...new Set(edges.map((e) => e.x))];
      if (xs.length !== 1) {
        fail.push(`[${width}px ${lang}] the page has ${xs.length} content edges, not 1: ` +
                  edges.map((e) => `${e.id}=${e.x}`).join(" "));
      }
      nEdges += edges.length;

      if (heads.length < 3) {
        fail.push(`[${width}px ${lang}] measured only ${heads.length} section heads`);
      }
      for (const h of heads) {
        // 2px, because a centred text box lands on a half pixel as often as not.
        if (Math.abs(h.left - h.right) > 2) {
          fail.push(`[${width}px ${lang}] the "${h.id}" heading's text is not centred: ` +
                    `${h.left}px of space on one side of its last line, ${h.right}px on the other`);
        }
        if (Math.abs(h.boxLeft - h.boxRight) > 2) {
          fail.push(`[${width}px ${lang}] the "${h.id}" heading's box is not centred in its ` +
                    `section: ${h.boxLeft}px on one side, ${h.boxRight}px on the other`);
        }
      }
      nHeads += heads.length;

      // The negative controls, once each. Break one section's edge and pull one heading off
      // centre, and require both measurements to notice, so a clean run cannot be a run that
      // measured nothing.
      if (width === 1440 && lang === "en") {
        // MARGIN, not padding. The edge measured is the section's own border box, which
        // padding does not move, so the first version of this control changed nothing and
        // the check reported that it could not see a broken alignment. It was right.
        await page.addStyleTag({ content: "#faq{margin-left:37px}" });
        await page.waitForTimeout(60);
        const broken = (await page.evaluate(MEASURE, dir)).edges;
        if ([...new Set(broken.map((e) => e.x))].length < 2) {
          fail.push("NEGATIVE CONTROL DID NOT FIRE: indenting a section by 37px produced no " +
                    "second edge, so this measurement cannot see a broken alignment.");
        } else note("negative control fired: a 37px indent produced a second content edge");

        // The auto margin, not the alignment. Two attempts failed before this one, both for
        // the same reason: the head is a centred flex column whose heading has BOTH
        // margin-inline:auto and a box that shrinks to its own text. text-align moved
        // nothing because the box is exactly as wide as the text; align-self moved nothing
        // because an auto margin outranks it. Zeroing the start margin is what actually
        // breaks the centring, which is what the check has to be able to see.
        await page.addStyleTag({ content: "#demo .section-head h2{margin-inline-start:0;align-self:flex-start}" });
        await page.waitForTimeout(60);
        const off = (await page.evaluate(MEASURE, dir)).heads
          .filter((h) => Math.abs(h.left - h.right) > 2 || Math.abs(h.boxLeft - h.boxRight) > 2);
        if (!off.length) {
          fail.push("NEGATIVE CONTROL DID NOT FIRE: left aligning a heading produced no " +
                    "finding, so this measurement cannot see an off-centre head.");
        } else {
          note(`negative control fired: an off-centre heading measured ` +
               `${off[0].boxLeft}px / ${off[0].boxRight}px either side of its box`);
        }
      }
      await page.close();
    }
  }
  note(`${nEdges} section edges and ${nHeads} heads measured across 3 widths and 2 writing directions`);
  await browser.close();
} catch (e) {
  fail.push(String(e && e.message ? e.message : e));
} finally {
  try { server.kill(); } catch {}
}

if (fail.length) {
  console.error(`check-alignment FAILED: ${fail.length} problem(s).`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log("check-alignment OK: styles.css is fully layered and balanced, every section on " +
            "the page begins on the same edge, and every section head is centred on it, in " +
            "both writing directions.");
