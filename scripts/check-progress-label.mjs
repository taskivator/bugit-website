/* THE PROGRESS LABEL MUST FIT THE COLUMN IT LIVES IN — FOR EVERY STRING IT CAN EVER HOLD.

   `.report-pct` shows "<phase> · <n>%" and cycles through every stage of Mission Control over
   twenty-five seconds. On 2026-08-21 it was cutting text in six languages, and the sweep that
   is supposed to catch exactly that reported it clean: whether a clip is on screen depends on
   which phase happens to be showing when the measurement is taken. Windows caught a short
   label, the CI runner caught a long one, and the same guard therefore said two different
   things about the same page.

   A measurement that samples one frame of an animation is a lottery. This one enumerates every
   string the loop can write -- `mission.phases[]`, `initializing` and `complete`, each with the
   widest percentage -- clones the cell without its width constraint, and measures all of them
   against the room the cell actually has. No timing, no sampling, no luck.

   THE MARGIN IS THE POINT. It requires real headroom, not merely "fits": the defect that
   started this survived on the developer's machine with 4px to spare and failed on a runner
   with a different font stack. A guard that passes at 4px has not verified anything portable.

   Truncation here is also the worst kind: the label is cut at the END, so the part it eats is
   the percentage -- the only part not already spelled out in the status list beside it. */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const app = readFileSync(path.join(ROOT, "app.js"), "utf8");
const LANGS = JSON.parse(app.match(/const languages=(\[\[.*?\]\]);/s)[1].replace(/'/g, '"')).map(([c]) => c);

/* Every breakpoint the design changes at, plus the two pinch points either side of 1180 --
   below 1160 the instrument stacks and takes the whole shell, above 1320 the shell outgrows
   the column, so the tightest case sits between and a tidy three-width sample steps over it. */
const WIDTHS = [320, 360, 390, 430, 667, 768, 834, 1024, 1180, 1240, 1280, 1320, 1512, 1920];

/* Below this the cell has no portable headroom. 4px passed locally and failed in CI. */
const MIN_SLACK = 14;

const PORT = await new Promise((res, rej) => {
  const p = net.createServer();
  p.on("error", rej);
  p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); });
});
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch { await new Promise((r) => setTimeout(r, 150)); } }

const MEASURE = `(() => {
  const pct = document.querySelector(".report-pct");
  if (!pct) return { missing: true };
  const m = (((typeof i18n !== "undefined" && (i18n[document.documentElement.lang] || i18n.en)) || {}).mission) || {};
  /* EXACTLY what initMission() writes: pctText = (complete | initializing | phases[k]) + " · " + pr + "%".
     Sweeping the whole mission dictionary instead pulls in status-list prose and reports a
     423px "need" for a cell that never holds it -- the same over-collection that made an
     earlier clamp measurement meaningless. */
  const labels = [m.initializing, m.complete].concat(m.phases || []).filter(Boolean);
  if (!labels.length) return { empty: true };
  const probe = pct.cloneNode(false);
  probe.style.cssText = "position:absolute;left:-9999px;white-space:nowrap;width:auto;max-width:none;visibility:hidden";
  pct.parentElement.appendChild(probe);
  let need = 0, which = "";
  for (const l of labels) {
    probe.textContent = l + " · 100%";
    const w = probe.getBoundingClientRect().width;
    if (w > need) { need = w; which = l; }
  }
  probe.remove();
  return { have: Math.floor(pct.clientWidth), need: Math.ceil(need), which, n: labels.length };
})()`;

const browser = await chromium.launch();
const fail = [];
let measured = 0;

for (const w of WIDTHS) {
  for (const lang of LANGS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 820 } });
    await ctx.addCookies([{ name: "bugitLang", value: lang, url: base }]);
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.querySelector(".mission")?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(850);
    const r = await page.evaluate(MEASURE);
    await ctx.close();
    if (r.missing) { fail.push(`[${lang}@${w}] there is no .report-pct`); continue; }
    if (r.empty) { fail.push(`[${lang}@${w}] the mission dictionary has no phase labels — this guard would pass on nothing`); continue; }
    measured += r.n;
    const slack = r.have - r.need;
    if (slack < 0) fail.push(`[${lang}@${w}] the progress label is cut: "${r.which} · 100%" needs ${r.need}px, the column has ${r.have}px (${-slack}px short)`);
    else if (slack < MIN_SLACK) fail.push(`[${lang}@${w}] the progress label has only ${slack}px of headroom ("${r.which}"): under ${MIN_SLACK}px it clips on a machine with different fonts, which is how this shipped`);
  }
}

await browser.close();
server.kill();

if (fail.length) {
  console.error(`check-progress-label FAIL — ${fail.length} case(s)\n`);
  for (const f of fail.slice(0, 30)) console.error("  - " + f);
  if (fail.length > 30) console.error(`  ... and ${fail.length - 30} more`);
  process.exit(1);
}
console.log(`check-progress-label OK: ${measured} label measurements across ${LANGS.length} languages x ${WIDTHS.length} widths, every one with at least ${MIN_SLACK}px of room`);
