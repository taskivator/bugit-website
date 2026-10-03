// One-off (re-runnable) extractor for the v2 prototype: tags every piece of visible text in
// v2/index.html with data-k / data-ka and writes v2/i18n/en.json. Run with the site served on
// :3077. JavaScript is disabled while it reads, so it sees the page exactly as written.
import { chromium } from "playwright";
import fs from "node:fs";
const SRC = "v2/index.html";
const b = await chromium.launch();
const p = await (await b.newContext({ javaScriptEnabled: false })).newPage();
await p.goto("http://127.0.0.1:3077/v2/");
const res = await p.evaluate(() => {
  const out = {}; let n = 0; const key = () => "t" + String(++n).padStart(3, "0");
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "KBD", "CODE"]);
  const hasText = (el) => [...el.childNodes].some((c) => c.nodeType === 3 && /\p{L}/u.test(c.textContent));
  const walk = (el) => {
    if (SKIP.has(el.tagName) || el.closest("svg")) return;
    if (el.hasAttribute("data-k")) return;
    if (hasText(el)) { const k = el.getAttribute("data-k") || key(); el.setAttribute("data-k", k); out[k] = el.innerHTML.replace(/\s+/g, " ").trim(); return; }
    for (const c of el.children) walk(c);
  };
  walk(document.body);
  for (const el of document.querySelectorAll("[aria-label],[alt],[placeholder],[title]:not(title)")) {
    for (const a of ["aria-label", "alt", "placeholder", "title"]) {
      const v = el.getAttribute(a); if (!v || !/\p{L}/u.test(v)) continue;
      const k = key(); out[k] = v;
      el.setAttribute("data-ka", (el.getAttribute("data-ka") ? el.getAttribute("data-ka") + "," : "") + a + ":" + k);
    }
  }
  out["meta.title"] = document.title;
  out["meta.description"] = document.querySelector('meta[name="description"]').content;
  return { out, html: "<!doctype html>\n" + document.documentElement.outerHTML + "\n" };
});
await b.close();
fs.writeFileSync(SRC, res.html);
fs.writeFileSync("v2/i18n/en.json", JSON.stringify(res.out, null, 1) + "\n");
console.log(Object.keys(res.out).length, "strings");
