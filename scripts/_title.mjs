import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
const ROOT = "c:/Users/Ppedr/Desktop/BugIt/01-repos-live-code/bugit-website";
const app = readFileSync(ROOT + "/app.js", "utf8");
const LANGS = JSON.parse(app.match(/const languages=(\[\[.*?\]\]);/s)[1].replace(/'/g, '"')).map(([c]) => c);
const PORT = await new Promise((res, rej) => { const p = net.createServer(); p.on("error", rej); p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); }); });
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}`; await new Promise((r) => setTimeout(r, 1000));
const b = await chromium.launch();
for (const W of [1920, 1600, 1280, 1160]) {
  const page = await b.newPage({ viewport: { width: W, height: 900 } });
  await page.goto(base + "/", { waitUntil: "load" });
  try { await page.click("#consentReject", { timeout: 1500 }); } catch {}
  await page.waitForTimeout(700);
  const r = await page.evaluate((langs) => {
    const h2 = document.querySelector(".report-panel h2");
    const cs = getComputedStyle(h2);
    const lh = parseFloat(cs.lineHeight);
    const keep = h2.textContent;
    const prevMin = h2.style.minHeight;
    h2.style.minHeight = "0px";
    let worst = { lines: 0 };
    for (const lang of langs) {
      const d = (window.i18n || {})[lang];
      if (!d || !d.report) continue;
      const titles = [d.report.title, d.report.scenB && d.report.scenB.title, d.report.scenC && d.report.scenC.title].filter(Boolean);
      for (const t of titles) {
        h2.textContent = t;
        const h = h2.getBoundingClientRect().height;
        const lines = Math.round(h / lh);
        if (lines > worst.lines) worst = { lines, lang, h: Math.round(h), t: t.slice(0, 40) };
      }
    }
    h2.textContent = keep; h2.style.minHeight = prevMin;
    return { lh: +lh.toFixed(2), worst, clamp: cs.webkitLineClamp, minH: cs.minHeight, colW: Math.round(h2.getBoundingClientRect().width) };
  }, LANGS);
  console.log(`[${W}] column ${r.colW}px  lineHeight ${r.lh}  current clamp=${r.clamp} reservation=${r.minH}  ->  worst title needs ${r.worst.lines} lines (${r.worst.lang}: "${r.worst.t}")`);
  await page.close();
}
await b.close(); server.kill();
