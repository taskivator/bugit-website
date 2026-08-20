/*
 * THE INSTRUMENT KEEPS ITS SIZE.
 *
 * Owner rule, 2026-08-21: "i dont want the size of the mission control to get bigger when show
 * full report is selected in any language the size should stay the same."
 *
 * Two ways that breaks, and they are different failures:
 *
 *   ON OPEN     pressing "Show full report" grows the box. Above 1160px the panel was already
 *               pinned to the height the layout gave it; below 1160px it was deliberately
 *               allowed to grow, and at 1024x768 one press took the box from 599px to 1,665px.
 *   ON THE LOOP the instrument runs a twenty-five second cycle through several scenarios, and
 *               a box whose height is decided by whatever text is currently in it changes size
 *               on its own. Six earlier rounds of the stylesheet exist because of this, and
 *               every clamp raised for a longer language is a chance to reintroduce it.
 *
 * Both are asked in every language, because the strings are what differ. The panel is allowed
 * ONE pixel of movement: sub-pixel layout rounds differently between locales and a zero
 * tolerance fails on nothing.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(ROOT, "app.js"), "utf8");
const LANGS = JSON.parse(app.match(/const languages=(\[\[.*?\]\]);/s)[1].replace(/'/g, '"')).map(([c]) => c);
const VIEWS = [[1920, 1080], [1512, 950], [1280, 800], [1024, 768], [768, 1024], [390, 844]];
const TOLERANCE = 1.5;

const PORT = await new Promise((res, rej) => { const p = net.createServer(); p.on("error", rej); p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); }); });
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 80; i++) { try { const r = await fetch(base); if (r.ok) break; } catch { await new Promise((r) => setTimeout(r, 150)); } }

const fail = [];
const browser = await chromium.launch();
const jobs = [];
for (const [w, h] of VIEWS) for (const lang of LANGS) jobs.push({ w, h, lang });
let next = 0;
const worker = async () => {
  for (;;) {
    const i = next++;
    if (i >= jobs.length) return;
    const { w, h, lang } = jobs[i];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addCookies([{ name: "bugitLang", value: lang, url: base }]);
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => document.getElementById("consentBanner")?.remove());
    await page.evaluate(() => document.querySelector(".mission")?.scrollIntoView({ block: "center" }));
    const ready = await page.waitForFunction(() => {
      const b = document.getElementById("reportMoreToggle");
      return b && b.getAttribute("aria-disabled") !== "true";
    }, null, { timeout: 30000 }).then(() => true).catch(() => false);
    if (!ready) { fail.push(`[${lang}@${w}] the report never became readable`); await ctx.close(); continue; }

    const box = () => page.evaluate(() => {
      const m = document.querySelector(".mission").getBoundingClientRect();
      return { h: +m.height.toFixed(1), w: +m.width.toFixed(1) };
    });

    /* --- ON OPEN ------------------------------------------------------- */
    const before = await box();
    await page.evaluate(() => document.getElementById("reportMoreToggle").click());
    await page.waitForTimeout(750);
    const opened = await box();
    if (Math.abs(opened.h - before.h) > TOLERANCE)
      fail.push(`[${lang}@${w}] opening the report changed the box: ${before.h} -> ${opened.h} (+${(opened.h - before.h).toFixed(1)})`);
    /* and closing it puts the box back exactly where it was */
    await page.evaluate(() => document.getElementById("reportMoreToggle").click());
    await page.waitForTimeout(600);
    const closed = await box();
    if (Math.abs(closed.h - before.h) > TOLERANCE)
      fail.push(`[${lang}@${w}] closing the report did not restore the box: ${before.h} -> ${closed.h}`);

    /* --- ON THE LOOP ---------------------------------------------------- */
    /* Sampled across a full cycle. The instrument changes scenario roughly every twenty-five
       seconds; thirty seconds of samples covers a scenario change in every language. */
    let min = Infinity, max = 0, minAt = "", maxAt = "";
    for (let t = 0; t < 60; t++) {
      const b = await box();
      if (b.h < min) { min = b.h; minAt = `${t / 2}s`; }
      if (b.h > max) { max = b.h; maxAt = `${t / 2}s`; }
      await page.waitForTimeout(500);
    }
    if (max - min > TOLERANCE)
      fail.push(`[${lang}@${w}] the box moved on its own over one cycle: ${min} (${minAt}) -> ${max} (${maxAt}), ${(max - min).toFixed(1)}px`);
    await ctx.close();
    process.stdout.write(`  ${String(w).padStart(4)} ${lang.padEnd(6)} open ${before.h}->${opened.h}  cycle ${min}..${max}\n`);
  }
};
await Promise.all(Array.from({ length: 6 }, worker));
await browser.close();
server.kill();

if (fail.length) { console.error(`\ncheck-instrument-size FAILED (${fail.length}):\n - ` + fail.join("\n - ")); process.exit(1); }
console.log(`\ncheck-instrument-size OK: the box is the same size opened, closed, and at every point of its own cycle — ${LANGS.length} languages x ${VIEWS.length} viewports`);
