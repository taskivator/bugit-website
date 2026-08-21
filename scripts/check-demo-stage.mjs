/*
 * THE DEMO STAGE IS ONE INSTRUMENT, AND NOTHING IT DRAWS LEAVES IT.
 *
 * Owner, 2026-08-21: "the square highligh around the buttons (core workflow, saas...) is going
 * out of the box", then "change the text color when hovered over them", then "including the one
 * thats playing, the color should change", then "this should be the same in all other views too
 * / mobile tablet etc".
 *
 * Section 111 of styles.css rebuilt the channel picker and the stage as ONE column: the same
 * width expression, the rail's bottom border removed, the stage flush beneath it, and the active
 * channel's 2px mark drawn ON the seam the two halves share. Everything about that arrangement
 * is a measurement, and every one of those measurements changes with the language -- four
 * channel names in German are not four channel names in Japanese, and at 320px they become a
 * 2x2 grid whose row height depends on whether the label wraps.
 *
 * None of it was gated. The demo section had guards for which VIDEO plays (check-channel) and
 * for the section's a11y, and nothing at all for what the picker paints. This is that gate.
 *
 * WHAT IS ASSERTED, all of it measured on the rendered page:
 *
 *   ONE COLUMN   the rail and the stage begin and end on the same two vertical lines, and the
 *                seam between them is a seam: no gap, no overlap. If they drift apart the
 *                instrument is two boxes again and the mark on the seam marks nothing.
 *   CONTAINED    with the ambient layer hidden and the films paused, the rail is photographed
 *                idle and then once per channel with the pointer on it, and EVERY pixel that
 *                differs must lie inside the instrument. This is the owner's complaint stated
 *                as a measurement: a highlight that leaves the visible box.
 *
 *                THE BOX IS THE INSTRUMENT, NOT THE RAIL, and that distinction is the whole
 *                reason this comment is long. The mark is deliberately drawn at
 *                `inset-block-end:-1px` -- "ON the stage's top rule, not above it" -- so for the
 *                bottom row of the phone's 2x2 grid roughly half of it lies on the stage's side
 *                of a boundary the two boxes share. Measured against the rail alone that reads
 *                as an escape, and it fired for Japanese at 320 and for no other language: not
 *                because Japanese is different, but because at dpr 2 the seam's fractional
 *                position decides which side of a sub-pixel tolerance one device row lands on.
 *                Widening the tolerance would have hidden a real escape too. Naming the right
 *                box does not.
 *   MARKED       the channel that is playing carries the signature colour and a mark at full
 *                width; an idle channel carries neither.
 *   HOVER        pointing at ANY channel takes it to the same signature colour and draws its
 *                mark full width -- and for an idle one that mark comes up weaker than the
 *                playing one's, which is the only thing left telling the two states apart once
 *                the colour is shared. Read with the pointer actually on the button, because
 *                four declarations compete for that colour across two cascade layers and which
 *                one wins is not a question the stylesheet can be read for: section 113's reset
 *                has to name `:not(.active):hover` to out-specify the legacy rule it undoes, so
 *                a colour left in that reset would silently beat the plain `button:hover`.
 *   CONTROL      the containment rule is re-run with the mark deliberately pushed out past the
 *                rail's ends, and must fire. A paint check that cannot see paint outside the box
 *                is a check that reports every page clean.
 *
 * The language table is read out of app.js rather than listed here, so a twelfth language is
 * measured the day it is added.
 */
import { chromium } from "playwright";
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
if (LANGS.length < 2) throw new Error(`only ${LANGS.length} language(s) found in app.js; the table did not parse`);

/* Desktop, tablet, the largest phone and the floor Android still ships. The 2x2 grid begins at
   760px, so 430 and 320 are on the other side of it from 1024 and 1440. */
const GEOMETRY_WIDTHS = [1440, 1024, 430, 320];
/* Photographing every language at every width is minutes of screenshots for a shape that only
   changes on the two sides of the grid breakpoint, so the pixel work runs at one width either
   side of it -- in every language, because the labels are what move. */
const PAINT_WIDTHS = [1440, 320];

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
  console.error(`check-demo-stage: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}

/* A page with the demo section on screen, the ambient layer hidden and the films paused, so the
   only thing that can change between two photographs is the pointer. */
async function openDemo(browser, lang, width, inject) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  /* The site reads its language from this cookie. `?lang=` is not a thing it supports, and a
     sweep that uses one measures English as many times as it has languages. */
  await ctx.addCookies([{ name: "bugitLang", value: lang, url: base }]);
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "load" });
  try { await page.click("#consentReject", { timeout: 1500 }); } catch {}
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const d = document.getElementById("demo");
    if (d) d.scrollIntoView({ block: "center" });
  });
  await page.addStyleTag({ content: "#ambient{display:none!important}" + (inject || "") });
  await page.evaluate(() => {
    document.querySelectorAll("video").forEach((v) => { try { v.pause(); } catch (e) {} });
  });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
  return { ctx, page };
}

const BOXES = () => {
  const rail = document.querySelector(".demo-tabs");
  const stage = document.querySelector(".video-frame");
  if (!rail || !stage) return null;
  const t = rail.getBoundingClientRect(), s = stage.getBoundingClientRect();
  const btns = [...rail.querySelectorAll("button")].map((el) => {
    const r = el.getBoundingClientRect();
    const after = getComputedStyle(el, "::after");
    return {
      text: el.textContent.replace(/\s+/g, " ").trim(),
      active: el.classList.contains("active"),
      cx: r.left + r.width / 2, cy: r.top + r.height / 2,
      w: r.width, h: r.height,
      colour: getComputedStyle(el).color,
      mark: after.transform,
      markOpacity: after.opacity,
    };
  });
  return {
    rail: { l: t.left, r: t.right, t: t.top, b: t.bottom },
    stage: { l: s.left, r: s.right, t: s.top, b: s.bottom },
    btns,
  };
};

/* Scale a `matrix(a, ...)` down to its horizontal factor. `none` is an unscaled mark. */
const scaleX = (m) => {
  if (!m || m === "none") return 1;
  const n = m.slice(m.indexOf("(") + 1, -1).split(",").map(Number);
  return m.startsWith("matrix3d") ? n[0] : n[0];
};

/* ---------- ONE COLUMN, and the two states of the picker ----------------- */
const browser = await chromium.launch();
let geometryChecks = 0;
for (const lang of LANGS) {
  for (const width of GEOMETRY_WIDTHS) {
    const { ctx, page } = await openDemo(browser, lang, width);
    const g = await page.evaluate(BOXES);
    const where = `${lang}/${width}`;
    if (!g) {
      fail.push(`${where}: the demo section did not render a rail and a stage at all`);
      await ctx.close();
      continue;
    }
    geometryChecks++;
    const near = (a, b) => Math.abs(a - b) <= 0.51;
    if (!near(g.rail.l, g.stage.l) || !near(g.rail.r, g.stage.r)) {
      fail.push(`ONE COLUMN ${where}: the rail spans ${g.rail.l.toFixed(1)}..${g.rail.r.toFixed(1)} and ` +
                `the stage ${g.stage.l.toFixed(1)}..${g.stage.r.toFixed(1)}, so they are not one box`);
    }
    if (!near(g.rail.b, g.stage.t)) {
      fail.push(`ONE COLUMN ${where}: the rail ends at ${g.rail.b.toFixed(2)} and the stage begins at ` +
                `${g.stage.t.toFixed(2)}, a ${(g.stage.t - g.rail.b).toFixed(2)}px ${g.stage.t > g.rail.b ? "gap" : "overlap"} where the seam should be`);
    }
    if (!g.btns.length) fail.push(`${where}: the rail has no channels in it`);
    const playing = g.btns.filter((b) => b.active);
    if (playing.length !== 1) {
      fail.push(`MARKED ${where}: ${playing.length} channel(s) are marked as playing; exactly one must be`);
    } else {
      const idle = g.btns.filter((b) => !b.active);
      if (idle.some((b) => b.colour === playing[0].colour)) {
        fail.push(`MARKED ${where}: an idle channel is drawn in the same colour as the one playing (${playing[0].colour})`);
      }
      if (scaleX(playing[0].mark) < 0.99) {
        fail.push(`MARKED ${where}: the playing channel "${playing[0].text}" carries a mark at ${scaleX(playing[0].mark).toFixed(2)} of its width`);
      }
      for (const b of idle) {
        if (scaleX(b.mark) > 0.01) {
          fail.push(`MARKED ${where}: the idle channel "${b.text}" carries a mark at ${scaleX(b.mark).toFixed(2)} of its width while another is playing`);
        }
      }
    }
    await ctx.close();
  }
}
note(`${geometryChecks} rail/stage pairs measured across ${LANGS.length} languages x ${GEOMETRY_WIDTHS.length} widths`);

/* ---------- CONTAINED: what a hover paints, and where ------------------- */
/* Photograph, hover, photograph, and compare. A rectangle test cannot do this job: the thing the
   owner saw was a background and a shadow, and what replaced it is a 2px mark with a transition,
   neither of which is the button's own box. */
const DIFF = async ([idle, hovered, clip, box]) => {
  const decode = async (b64) => {
    const im = new Image();
    im.src = "data:image/png;base64," + b64;
    await im.decode();
    const cv = document.createElement("canvas");
    cv.width = im.width; cv.height = im.height;
    const g = cv.getContext("2d");
    g.drawImage(im, 0, 0);
    return { d: g.getImageData(0, 0, im.width, im.height).data, w: im.width, h: im.height };
  };
  const A = await decode(idle), B = await decode(hovered);
  const scale = A.w / clip.width;
  let count = 0, worst = null;
  for (let y = 0; y < A.h; y++) {
    for (let x = 0; x < A.w; x++) {
      const i = (y * A.w + x) * 4;
      const diff = Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
      if (diff < 12) continue;
      const px = clip.x + x / scale, py = clip.y + y / scale;
      const over = Math.max(box.l - px, px - box.r, box.t - py, py - box.b);
      if (over <= 0.6) continue;
      count++;
      if (!worst || over > worst.over) worst = { over: +over.toFixed(1), px: +px.toFixed(1), py: +py.toFixed(1) };
    }
  }
  return { count, worst };
};

async function paintSweep(br, inject, langs = LANGS) {
  const found = [];
  let hovers = 0;
  for (const lang of langs) {
    for (const width of PAINT_WIDTHS) {
      const { ctx, page } = await openDemo(br, lang, width, inject);
      const g = await page.evaluate(BOXES);
      if (!g) { found.push(`${lang}/${width}: no demo section to photograph`); await ctx.close(); continue; }
      /* The frame runs 14px above the rail and 40px into the stage, so the seam and the band on
         either side of it are both photographed. */
      const clip = {
        x: Math.max(0, Math.floor(g.rail.l) - 14),
        y: Math.max(0, Math.floor(g.rail.t) - 14),
        width: Math.min(Math.ceil(g.rail.r - g.rail.l) + 28, width - Math.max(0, Math.floor(g.rail.l) - 14)),
        height: Math.ceil(g.rail.b - g.rail.t) + 54,
      };
      const box = { l: Math.min(g.rail.l, g.stage.l), r: Math.max(g.rail.r, g.stage.r), t: g.rail.t, b: g.stage.b };
      await page.waitForTimeout(400);
      const idle = (await page.screenshot({ clip })).toString("base64");
      const playingColour = (g.btns.find((x) => x.active) || {}).colour;
      for (const b of g.btns) {
        await page.mouse.move(b.cx, b.cy);
        await page.waitForTimeout(420);
        const hovered = (await page.screenshot({ clip })).toString("base64");
        hovers++;
        /* POINTING AT A CHANNEL ANSWERS. Owner: "change the text color when hovered over them",
           then "including the one thats playing, the color should change". Both go to the
           signature colour; what still tells them apart is the mark -- full strength under the
           one playing, a third of it under one being pointed at. Read while the pointer is
           actually on the button, because the rule that paints it lives behind :hover and a
           stylesheet reader cannot see which of four competing declarations won. */
        const state = await page.evaluate((i) => {
          const el = document.querySelectorAll(".demo-tabs button")[i];
          const after = getComputedStyle(el, "::after");
          return { colour: getComputedStyle(el).color, mark: after.transform, opacity: +after.opacity };
        }, g.btns.indexOf(b));
        if (playingColour && state.colour !== playingColour) {
          found.push(`HOVER ${lang}/${width}: pointing at "${b.text}" leaves it ${state.colour}; the channel ` +
                    `playing is ${playingColour}, and hover is meant to reach the same colour`);
        }
        if (scaleX(state.mark) < 0.99) {
          found.push(`HOVER ${lang}/${width}: pointing at "${b.text}" draws its mark at ` +
                    `${scaleX(state.mark).toFixed(2)} of its width instead of the whole of it`);
        }
        if (!b.active && !(state.opacity > 0.05 && state.opacity < 0.95)) {
          found.push(`HOVER ${lang}/${width}: pointing at the idle channel "${b.text}" gives its mark ` +
                    `opacity ${state.opacity}; it must be visible but weaker than the one playing, or the ` +
                    `two states cannot be told apart`);
        }
        const out = await page.evaluate(DIFF, [idle, hovered, clip, box]);
        if (out.count > 0) {
          found.push(`CONTAINED ${lang}/${width}: pointing at "${b.text}" paints ${out.count} device pixel(s) ` +
                     `outside the instrument, worst ${out.worst.over}px past its edge at (${out.worst.px}, ${out.worst.py})`);
        }
        await page.mouse.move(2, 2);
        await page.waitForTimeout(260);
      }
      await ctx.close();
    }
  }
  return { found, hovers };
}

const paint = await paintSweep(browser);
fail.push(...paint.found);
note(`${paint.hovers} hovers photographed and diffed across ${LANGS.length} languages x ${PAINT_WIDTHS.length} widths`);
await browser.close();

/* ---------- THE NEGATIVE CONTROL ---------------------------------------- */
/* Push the mark out past the ends of the rail and require the containment rule to see it. Run
   in one language at the two paint widths: the control is about the RULE, not the corpus.
   It has to be pushed out ON HOVER rather than always: this rule compares an idle photograph
   with a hovered one, so a mark that is already outside in BOTH of them is not a difference and
   a control built that way would silently pass while proving nothing. */
const ctlBrowser = await chromium.launch();
const CONTROLS = [
  {
    what: "the mark is pushed 40px past both ends of the rail",
    css: ".demo-tabs button:hover::after{inset-inline:-40px !important;transform:scaleX(1) !important}",
    rule: "CONTAINED",
  },
  {
    /* The hover colour has its own control because it has its own failure mode, and that mode is
       silent: section 113's reset must name `:not(.active):hover` to out-specify the legacy rule
       it undoes, so a colour left in that reset beats the plain `button:hover` and the channels
       quietly go back to white. A rule that cannot see white here is a rule that would have
       passed on the bug it was written for. */
    what: "the hover colour is forced back to white",
    css: ".demo-tabs button:hover{color:#fff !important}",
    rule: "HOVER",
  },
];
for (const c of CONTROLS) {
  const ctl = await paintSweep(ctlBrowser, c.css, LANGS.slice(0, 1));
  const fired = ctl.found.filter((f) => f.startsWith(c.rule)).length;
  if (!fired) {
    fail.push(`NEGATIVE CONTROL DID NOT FIRE: ${c.what} and the ${c.rule} rule stayed silent, ` +
              "so it cannot see the thing it exists for.");
  } else {
    note(`negative control fired: ${fired} ${c.rule} finding(s) when ${c.what}`);
  }
}
await ctlBrowser.close();

server.kill();
if (process.platform === "win32" && server.pid) {
  try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
}

if (fail.length) {
  for (const f of fail.slice(0, 40)) console.error("FAIL: " + f);
  if (fail.length > 40) console.error(`... and ${fail.length - 40} more`);
  console.error(`\ncheck-demo-stage: ${fail.length} finding(s).`);
  process.exit(1);
}
console.log("check-demo-stage OK: the rail and the stage are one column with a seam and no gap, the " +
            "channel that is playing is the only one marked, and nothing a hover paints reaches outside " +
            "the instrument -- in every language, on a desktop and on a phone.");
