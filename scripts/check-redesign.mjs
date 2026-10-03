#!/usr/bin/env node
/**
 * THE PUBLISHED PAGES, AS PUBLISHED (2026-10-04).
 *
 * WHY THIS EXISTS. On 2026-10-04 bugit.dev switched to the redesign: build.js publishes
 * v2/index.html as the homepage and v2/docs/index.html as /docs/. Most of the browser guards in
 * this folder were written for the single page site and still read index.html and app.js from the
 * source tree, which are no longer what anybody is served. They keep passing, and their passing
 * says nothing about the pages that are live. This guard is about those pages, and it renders the
 * BUILT site (dist/, hashed names and all), not the sources, because the build is where a missed
 * rewrite turns into a dead script.
 *
 * WHAT IT HOLDS, each in Chromium:
 *   1. The old single page addresses still land. Links to /#/docs/privacy, /#/support, /#features
 *      are printed in the VS Code agent (frozen releases included), the PDF guides and the portal;
 *      v2/route.js forwards them, and a fragment never reaches _redirects.
 *   2. Both pages render in every language at a phone and a desktop width with no page error, no
 *      failed request and no sideways scroll, and the language the visitor chose is the one shown.
 *   3. A first visit shows the consent banner and makes no request to Google.
 *   4. The Ask bar opens Ask BugIt and it answers.
 * And a NEGATIVE CONTROL: with route.js answered empty, check 1 must fail, or it proves nothing.
 *
 *   node scripts/check-redesign.mjs     (builds first unless SKIP_BUILD=1)
 */
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const LANGS = ["en", "ja", "fr", "de", "es", "pt-br", "it", "ko", "zh", "ru", "ar"];
const WIDTHS = [1440, 360];

if (process.env.SKIP_BUILD !== "1") {
  const b = spawnSync(process.execPath, ["build.js"], { cwd: ROOT, stdio: "inherit" });
  if (b.status !== 0) { console.error("check-redesign: the build failed"); process.exit(1); }
}
if (!existsSync(path.join(DIST, "index.html")) || !existsSync(path.join(DIST, "docs", "index.html"))) {
  console.error("check-redesign: dist has no index.html or docs/index.html; build.js did not publish the pages");
  process.exit(1);
}

const PORT = await new Promise((res, rej) => {
  const s = net.createServer(); s.unref(); s.on("error", rej);
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), SITE_ROOT: DIST }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(B + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

const failures = [];
let checks = 0;
const check = (ok, what, detail = "") => { checks++; if (!ok) failures.push(`${what}${detail ? ` -- ${detail}` : ""}`); };
const CONSENT = encodeURIComponent(JSON.stringify({ v: 1, ad_storage: false, analytics_storage: false, ad_user_data: false, ad_personalization: false, ts: Math.floor(Date.now() / 1000) }));

const browser = await chromium.launch();
async function open(width, lang, { consent = true, blockRoute = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 860 } });
  const cookies = [];
  if (lang) cookies.push({ name: "bugitLang", value: lang, url: B }, { name: "bugitLangSet", value: "user", url: B });
  if (consent) cookies.push({ name: "bugit_consent", value: CONSENT, url: B });
  if (cookies.length) await ctx.addCookies(cookies);
  // Nothing leaves the machine: Google is answered locally, so a request is recorded, not sent.
  const google = [];
  await ctx.route(/googletagmanager|google-analytics|doubleclick|googleadservices|google\.com/, (r) => { google.push(r.request().url()); r.fulfill({ status: 204, body: "" }); });
  await ctx.route(/cloudflareinsights/, (r) => r.fulfill({ status: 204, body: "" }));
  if (blockRoute) await ctx.route(/\/v2\/route\.[a-f0-9]+\.js$/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
  page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(B)) errors.push(`${r.status()} ${r.url().slice(B.length)}`); });
  return { ctx, page, errors, google };
}

const FORWARDS = [
  ["/#/docs/privacy", "/docs/#/docs/privacy"], ["/#/docs/license", "/docs/#/docs/license"],
  ["/#/support", "/docs/#/support"], ["/#/docs", "/docs/#/docs"],
  ["/#/docs/getting-started", "/docs/#/docs/getting-started"],
  ["/#features", "/#how"], ["/#faq", "/docs/#/docs/faq"], ["/#pricing", "/#pricing"],
];
async function forwards(blockRoute) {
  const wrong = [];
  for (const [from, want] of FORWARDS) {
    const { ctx, page } = await open(1280, "en", { blockRoute });
    await page.goto(B + from, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const u = new URL(page.url());
    if (u.pathname + u.hash !== want) wrong.push(`${from} -> ${u.pathname + u.hash}, wanted ${want}`);
    await ctx.close();
  }
  return wrong;
}

try {
  console.log("check-redesign: old single page addresses land on the new pages");
  const wrong = await forwards(false);
  check(wrong.length === 0, "every old address is forwarded", wrong.join("; "));

  console.log("check-redesign: both pages, every language, phone and desktop");
  for (const route of ["/", "/docs/", "/docs/#/docs/privacy"]) {
    for (const lang of LANGS) {
      for (const w of WIDTHS) {
        const { ctx, page, errors } = await open(w, lang);
        await page.goto(B + route, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        const r = await page.evaluate(() => ({
          lang: document.documentElement.lang,
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          h1: (document.querySelector("#docsMain h1, main h1")?.textContent || "").trim(),
        }));
        const where = `${route} ${lang} ${w}`;
        check(errors.length === 0, `${where}: no page error or failed request`, errors.slice(0, 3).join(" | "));
        // BCP 47 is case-insensitive: the page writes pt-BR for the pt-br cookie, correctly.
        check(r.lang.toLowerCase() === lang, `${where}: shows the chosen language`, `lang=${r.lang}`);
        check(r.over <= 0, `${where}: no sideways scroll`, `${r.over}px`);
        check(r.h1.length > 0, `${where}: has a heading`);
        await ctx.close();
      }
    }
  }

  console.log("check-redesign: a first visit asks before measuring");
  {
    const { ctx, page, google, errors } = await open(1440, "en", { consent: false });
    await page.goto(B + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const banner = await page.evaluate(() => { const b = document.getElementById("consentBanner"); return !!b && !b.hidden && b.getBoundingClientRect().height > 0; });
    check(banner, "the consent banner is shown on a first visit");
    check(google.length === 0, "no Google request before a choice", google.slice(0, 2).join(" "));
    check(errors.length === 0, "no error on a first visit", errors.slice(0, 3).join(" | "));
    await ctx.close();
  }

  console.log("check-redesign: the Ask bar opens Ask BugIt, and it answers");
  {
    const { ctx, page } = await open(1440, "en");
    await page.goto(B + "/", { waitUntil: "networkidle" });
    await page.click("#askBar");
    await page.waitForSelector(".bgd-bot .bgd-answer p", { timeout: 15000 }).catch(() => {});
    const open_ = await page.evaluate(() => window.BugitGuide?.isOpen?.() === true);
    const answer = await page.evaluate(() => (document.querySelector(".bgd-bot .bgd-answer")?.textContent || "").trim().length);
    check(open_, "the Ask bar opens Ask BugIt");
    check(answer > 40, "Ask BugIt answers the Ask bar's question", `${answer} characters`);
    await ctx.close();
  }

  console.log("check-redesign: negative control (route.js answered empty)");
  const controlWrong = await forwards(true);
  if (controlWrong.length === 0) failures.push("[control] with route.js emptied, every old address still landed, so the forwarding check proves nothing");
  else console.log(`  negative control fired: ${controlWrong.length} of ${FORWARDS.length} addresses went wrong without route.js`);
} finally {
  await browser.close();
  server.kill();
}

if (failures.length) {
  console.log(`\ncheck-redesign FAILED: ${failures.length} of ${checks} checks`);
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
console.log(`\ncheck-redesign OK: ${checks} checks. Old addresses land, both pages render clean in ${LANGS.length} languages at ${WIDTHS.join(" and ")}px, a first visit asks before measuring, and Ask BugIt answers.`);
