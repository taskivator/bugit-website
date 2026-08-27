// THE PAGE A MISTYPED URL LANDS ON, IN EVERY LANGUAGE THIS SITE SHIPS.
//
// `404.html` is what the EDGE serves for a path that is not a hash route. It was a third,
// English-only copy of two sentences the site already had translated into eleven languages --
// and the two copies it was a third of did not agree with each other either. `_siteNotFound`
// held richer wording for nine locales and was assigned to `i18n[c].notFound`, WHICH NOTHING
// EVER READ; the in-app view rendered its own terser table, which had Arabic but not the
// better copy. Three sources, one of them dead, and the reader of a broken link got whichever
// one the surface happened to use.
//
// There is one table now, in app.js, and `build.js` generates `/404.js` from it, so the hard
// 404 and the in-app one cannot drift.
//
// WHY A BROWSER. The strings are swapped by script, from a cookie, so the only way to know a
// reader sees them is to be a reader. And the swap has one non-obvious way to fail silently:
// the site's CSP is `script-src 'self'` with no unsafe-inline and no nonce, so an inline
// script here would be blocked -- on the one page nobody visits deliberately. This asserts no
// console error, which is where that would show.
//
// It also asserts the page is correct with JavaScript OFF: English is in the markup, and the
// script only ever replaces it.
//
// The dev server answers 200 with index.html for any unknown path, so this loads /404.html
// directly. The 404 STATUS is the edge's job and is verified against bugit.dev by curl in the
// release checklist, not here.
//
// Run: node scripts/check-not-found.mjs
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = 3912;
const base = `http://localhost:${port}`;
const srv = spawn("node", ["server.js"], { cwd: path.join(root, "dist"), env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
const stop = () => { try { srv.kill(); } catch {} };

let up = false;
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(base + "/404.html"); if (r.ok) { up = true; break; } } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
if (!up) { console.error("server never came up"); stop(); process.exit(2); }

const EXPECT = {
  en: ["may be mistyped", "ltr"],
  ja: ["そのページは存在しません", "ltr"],
  fr: ["Cette page n’existe pas", "ltr"],
  de: ["Diese Seite existiert nicht", "ltr"],
  es: ["Esa página no existe", "ltr"],
  "pt-br": ["Essa página não existe", "ltr"],
  it: ["Questa pagina non esiste", "ltr"],
  ko: ["해당 페이지가 존재하지 않습니다", "ltr"],
  zh: ["该页面不存在", "ltr"],
  ru: ["Такой страницы нет", "ltr"],
  ar: ["هذه الصفحة غير موجودة", "rtl"],
};

const browser = await chromium.launch();
const problems = [];
for (const [lang, [expect, dir]] of Object.entries(EXPECT)) {
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: "bugitLang", value: lang, url: base }]);
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e.message)));
  await page.goto(`${base}/404.html`, { waitUntil: "networkidle" });
  const seen = await page.evaluate(() => ({
    body: document.getElementById("nf-body")?.textContent ?? "",
    home: document.getElementById("nf-home")?.textContent ?? "",
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    title: document.title,
    pans: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  if (!seen.body.includes(expect)) problems.push(`${lang}: body ${JSON.stringify(seen.body.slice(0, 50))}`);
  if (lang !== "en" && seen.lang !== lang) problems.push(`${lang}: <html lang="${seen.lang}">`);
  if (lang !== "en" && seen.dir !== dir) problems.push(`${lang}: dir="${seen.dir}" expected ${dir}`);
  if (!seen.home) problems.push(`${lang}: the way home has no label`);
  if (seen.pans) problems.push(`${lang}: the 404 page pans sideways`);
  for (const e of errs) problems.push(`${lang}: console — ${e.slice(0, 110)}`);
  console.log(`  ${lang.padEnd(6)} lang=${(seen.lang || "-").padEnd(6)} dir=${(seen.dir || "-").padEnd(4)} ${seen.body.slice(0, 44)}`);
  await ctx.close();
}

{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  await ctx.addCookies([{ name: "bugitLang", value: "ja", url: base }]);
  const page = await ctx.newPage();
  await page.goto(`${base}/404.html`, { waitUntil: "domcontentloaded" });
  const body = await page.evaluate(() => document.getElementById("nf-body")?.textContent ?? "");
  if (!body.includes("may be mistyped")) problems.push(`no-JS: ${JSON.stringify(body.slice(0, 50))}`);
  console.log(`  no-JS  English still rendered: ${body.slice(0, 44)}`);
  await ctx.close();
}

await browser.close();
stop();
console.log("");
if (problems.length) { for (const p of problems) console.error("  - " + p); process.exit(1); }
console.log(`404 page: localized in all ${Object.keys(EXPECT).length} languages, correct direction, correct with JS off`);
