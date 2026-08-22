// THE TWO RULES BESIDE A LABEL MUST BE THE SAME LINE, IN PIXELS.
//
// WHY THIS EXISTS. Owner, 2026-08-23: "in the main page, down below in the faq secion there are
// two lines on each side of the faq text and the line on the right is dimmed and differernt from
// the rest", and immediately after: "same for the see it work section and the line on the right
// too."
//
// Every section eyebrow is a centred label with a 1px rule either side, drawn as ::before and
// ::after. They are declared identically -- same width, same colour -- and they COMPUTE
// identically, which is why reading the stylesheet said nothing was wrong. The difference was in
// the RASTER. One of the pair carried a transform animation with `fill: both`, so it held a
// transform for ever; a transform-animated element is promoted to its own composited layer, and
// a layer's bounds snap to whole DEVICE pixels. A 1px hairline is 1.5 device pixels at 150%
// display scaling, so the composited one came out 2.0 device rows where its plain twin came out
// 1.5 -- one crisp line and one pale one, exactly as reported.
//
// WHAT IT ASSERTS. For every label on the page that carries a rule on both sides, photographed
// at 100/125/150/200% display scaling: the two rules carry the same amount of ink, to within a
// tenth of a device row. Coverage rather than colour, because the colour of the pixels is right
// in every case -- it is how many of them there are that differs.
//
// THE SUBJECT IS COMPUTED: any element whose ::before and ::after are both 1px-tall rules with a
// background of their own. A section head added next month is measured the day it is added.
//
// Chromium only, and deliberately: this is a question about how one engine turns a fractional
// CSS pixel into device pixels, and Chrome is where the owner reads the page. check-hairlines.mjs
// is the same kind of guard aimed at the gaps between grid cells.
//
// Run: `node scripts/check-rule-pair.mjs` (or `npm run test:rule-pair`).
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import zlib from "node:zlib";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const TOLERANCE = 0.1; // device rows of ink

/* ---------- a PNG reader, because the whole point is the pixels ---------- */
// Playwright writes a PNG; this reads it back with no dependency. Only the 8-bit
// non-interlaced form Chromium produces is handled, and anything else is reported rather than
// guessed at.
function readPNG(file) {
  const buf = readFileSync(file);
  let pos = 8, w = 0, h = 0, bitDepth = 0, colour = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colour = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colour !== 6 && colour !== 2)) {
    throw new Error(`unsupported PNG (bit depth ${bitDepth}, colour type ${colour})`);
  }
  const bpp = colour === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * bpp);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + w * bpp);
    rp += w * bpp;
    const cur = out.subarray(y * w * bpp, (y + 1) * w * bpp);
    const prev = y ? out.subarray((y - 1) * w * bpp, y * w * bpp) : Buffer.alloc(w * bpp);
    for (let i = 0; i < line.length; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 0xff;
    }
  }
  return { w, h, px: (x, y) => { const i = (y * w + x) * bpp; return [out[i], out[i + 1], out[i + 2]]; } };
}

/* How many device rows of the rule's own colour there are, on each side of the clip. */
function coverage(png) {
  const { w, h, px } = png;
  const side = { left: 0, right: 0 };
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const [r, g, b] = px(x, y);
      if (r - g > 40 && b - g > 25) {
        const x0 = x;
        let sum = 0, n = 0;
        while (x < w) {
          const [r2, g2, b2] = px(x, y);
          if (!(r2 - g2 > 40 && b2 - g2 > 25)) break;
          sum += r2; n++; x++;
        }
        if (x - x0 >= 8) side[(x0 + x) / 2 < w / 2 ? "left" : "right"] += (sum / n) / 255;
      } else x++;
    }
  }
  return side;
}

/* ---------- harness ------------------------------------------------------ */
const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
let serverExit = null;
server.on("exit", (c, s) => { serverExit = s || `code ${c}`; });
const base = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60 && !serverExit; i++) {
  try { const r = await fetch(base + "/"); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 120));
}
if (serverExit) {
  console.error(`check-rule-pair: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}
const shots = mkdtempSync(join(tmpdir(), "rule-pair-"));
const done = () => {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
  try { rmSync(shots, { recursive: true, force: true }); } catch {}
};

/* ---------- measure ------------------------------------------------------ */
const browser = await chromium.launch();
let measured = 0;
for (const dpr of [1, 1.25, 1.5, 2]) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr })).newPage();
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1400);
  try { await page.locator("#consentReject").click({ timeout: 2500 }); } catch {}
  // The subject: every label that carries a rule on BOTH sides.
  const subjects = await page.evaluate(() => {
    const out = [];
    const isRule = (cs) => cs.content !== "none" && cs.height === "1px"
      && parseFloat(cs.width) >= 8 && cs.backgroundColor !== "rgba(0, 0, 0, 0)";
    [...document.querySelectorAll("*")].forEach((el, i) => {
      if (isRule(getComputedStyle(el, "::before")) && isRule(getComputedStyle(el, "::after"))) {
        el.dataset.rulePair = String(i);
        out.push({ key: String(i), label: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24) });
      }
    });
    return out;
  });
  if (!subjects.length) {
    fail.push(`${dpr}x: no label on the page carries a rule on both sides -- this guard's subject has gone away`);
    await page.close();
    continue;
  }
  for (const s of subjects) {
    await page.evaluate((key) => {
      document.querySelector(`[data-rule-pair="${key}"]`).scrollIntoView({ block: "center", behavior: "instant" });
    }, s.key);
    await page.waitForTimeout(400);
    const box = await page.evaluate((key) => {
      const r = document.querySelector(`[data-rule-pair="${key}"]`).getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }, s.key);
    if (box.w < 40 || box.y < 0 || box.y > 880) continue;
    const file = join(shots, `${s.key}-${dpr}.png`);
    await page.screenshot({
      path: file,
      clip: { x: Math.max(0, Math.round(box.x + box.w / 2 - 200)), y: Math.round(box.y - 4), width: 400, height: 24 },
    });
    let cov;
    try { cov = coverage(readPNG(file)); } catch (e) { fail.push(`${dpr}x "${s.label}": ${e.message}`); continue; }
    if (!cov.left || !cov.right) continue;   // the clip did not catch both rules; not a finding
    measured++;
    if (Math.abs(cov.left - cov.right) > TOLERANCE) {
      fail.push(`${dpr}x "${s.label}": the two rules carry ${cov.left.toFixed(2)} and ${cov.right.toFixed(2)} device rows of ink -- one is visibly paler than the other`);
    }
  }
  console.log(`  ${dpr}x: ${subjects.length} label(s) with a rule either side`);
  await page.close();
}
await browser.close();
done();
if (measured < 4) {
  console.error(`check-rule-pair: only ${measured} pairs were photographed, so nothing was really measured.`);
  process.exit(1);
}
if (fail.length) {
  console.error(`\ncheck-rule-pair: FAIL (${fail.length})`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-rule-pair: OK (${measured} photographed pairs across 4 display scalings)`);
