/*
 * THE ROUTING AUDIT.
 *
 * check-spa-routing.mjs already guards the regression that cost a session: a 404 that
 * destroyed the docs containers and took the documentation with it. This is the wider sweep the
 * owner asked for on 2026-08-21 -- every route, from every entry, in every language.
 *
 * Six questions, and each one is a different way in:
 *
 *   DEEP     load the URL cold. This is what a bookmark, a search result and a link in an email
 *            all do, and it is the only entry that has no prior page state to lean on.
 *   NAV      arrive by clicking, from the homepage and from another document.
 *   RELOAD   press F5 while on the route. A SPA that keeps its state in memory lands on the
 *            homepage here and the reader loses their place.
 *   BACK     the browser's own back and forward buttons.
 *   LANG     the chosen language survives a route change. Losing it silently reverts a reader
 *            to English on the page they were reading.
 *   DEAD     no link on any page points at a route that does not render.
 *
 * Every one of them is asked in all eleven languages, because the router and the dictionary
 * meet in renderDocRoute() and a route can render in English and not in Japanese.
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
const DOC_ROUTES = JSON.parse(app.match(/const docRoutes=(\[.*?\]);/s)[1].replace(/'/g, '"'));

const PORT = await new Promise((res, rej) => { const p = net.createServer(); p.on("error", rej); p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); }); });
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 80; i++) { try { const r = await fetch(base); if (r.ok) break; } catch { await new Promise((r) => setTimeout(r, 150)); } }

/* THE SPAWNED SERVER OUTLIVED THE CHECK. `server.kill()` sits at the very bottom, so any throw
   above it -- a crashed page, a navigation that never settles -- left a node process holding a
   port with nothing to stop it. Two were found still running an hour after the suite had been
   abandoned. An exit hook runs on every ordinary exit path, including process.exit and an
   uncaught throw. */
process.on("exit", () => { try { server.kill(); } catch { /* already gone */ } });

/* A NAVIGATION THAT NEVER SETTLES MUST FAIL, NOT WAIT. `waitUntil: "networkidle"` has no
   deadline of its own here, and the whole 60-check website suite runs these in sequence: one
   stuck page meant `npm test` simply never finished, which reads as a suite nobody runs rather
   than as a failure anybody sees. Measured 2026-08-25: the suite sat for over an hour with no
   output and no error. */
const NAV_TIMEOUT_MS = 25_000;

const fail = [];
/* A CRASHED RENDERER TAKES THE WHOLE BROWSER WITH IT, so every language after the first
   failure reported "Target page, context or browser has been closed" -- a cascade of
   false results that hides which languages are actually healthy. Relaunched per language
   when it is gone, so each of the eleven gets a real answer. */
let browser = await chromium.launch();

/* What a rendered document looks like when it worked: the docs view is showing, the homepage
   is not, the sidebar still has its document list, and there is a real heading with real
   content under it. "A heading exists" alone passes on the not-found view, which also has one. */
const state = (page) => page.evaluate(() => {
  const doc = document.getElementById("docView");
  const home = document.getElementById("homeView");
  const c = document.getElementById("docContent");
  return {
    hash: location.hash,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    docHidden: doc ? doc.hidden : null,
    homeHidden: home ? home.hidden : null,
    navLinks: document.querySelectorAll("#docNav .docs-nav-list a").length,
    h1: (document.querySelector("#docView h1")?.textContent || "").trim().slice(0, 60),
    /* CHARACTERS, not whitespace-separated tokens. Japanese and Chinese do not put spaces
       between words, so a word count reported 7 for a support page that was fully rendered
       and flagged four healthy routes as broken. */
    chars: (c?.textContent || "").replace(/\s+/g, "").length,
    notFound: /not found|見つかり|introuvable|nicht gefunden|no encontrad|não encontrad|non trovat|찾을 수 없|未找到|не найден|لم يتم العثور/i
      .test((document.querySelector("#docView h1")?.textContent || "")),
  };
});

const okDoc = (s) => s.docHidden === false && s.homeHidden === true && !s.notFound && s.chars > 120 && s.navLinks > 0;

for (const lang of LANGS) {
  if (!browser.isConnected()) browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "bugitLang", value: lang, url: base }]);
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
  page.setDefaultTimeout(NAV_TIMEOUT_MS);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));

  /* ONE LANGUAGE FAILING IS ONE FINDING, NOT THE END OF THE RUN. A crashed renderer threw
     straight out of this loop, so the remaining languages were never examined and the suite
     reported nothing at all -- the eleventh language is exactly the one most likely to be
     broken, and it was the one guaranteed never to be reached. */
  try {

  /* --- DEEP: every route, loaded cold ---------------------------------- */
  for (const r of DOC_ROUTES) {
    await page.goto(`${base}#/${r}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(220);
    const s = await state(page);
    if (!okDoc(s)) fail.push(`DEEP   [${lang}] #/${r} → ${JSON.stringify(s)}`);
    if (s.lang !== lang) fail.push(`LANG   [${lang}] #/${r} rendered with html lang="${s.lang}"`);
  }

  /* --- RELOAD: still there after F5 ------------------------------------ */
  for (const r of ["docs", "docs/privacy", "support"]) {
    await page.goto(`${base}#/${r}`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(220);
    const s = await state(page);
    if (!okDoc(s) || s.hash !== `#/${r}`) fail.push(`RELOAD [${lang}] #/${r} → ${JSON.stringify(s)}`);
  }

  /* --- NAV: arrive by clicking, from the homepage and from a document --- */
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  /* .first() is not enough: the phone overlay carries a second copy of every nav link and it
     is in the DOM at every width. Take the first link a reader could actually click. */
  const docLink = await (async () => {
    for (const h of await page.$$('a[href^="#/docs"]')) if (await h.isVisible()) return h;
    return null;
  })();
  if (!docLink) fail.push(`NAV    [${lang}] the homepage offers no link into the documentation`);
  else {
    await docLink.click();
    await page.waitForTimeout(400);
    const s = await state(page);
    if (!okDoc(s)) fail.push(`NAV    [${lang}] homepage → docs → ${JSON.stringify(s)}`);
  }
  /* document → document, via the sidebar */
  const side = (await Promise.all((await page.$$('#docNav .docs-nav-list a')).map(async (h) => (await h.isVisible()) ? h : null))).filter(Boolean);
  if (side.length > 1) {
    await side[1].click();
    await page.waitForTimeout(400);
    const s = await state(page);
    if (!okDoc(s)) fail.push(`NAV    [${lang}] sidebar link 2 → ${JSON.stringify(s)}`);
  }

  /* --- BACK / FORWARD --------------------------------------------------- */
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/docs/privacy"; });
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = "#/docs/license"; });
  await page.waitForTimeout(400);
  await page.goBack(); await page.waitForTimeout(400);
  let s = await state(page);
  if (!okDoc(s) || s.hash !== "#/docs/privacy") fail.push(`BACK   [${lang}] back from license → ${JSON.stringify(s)}`);
  await page.goForward(); await page.waitForTimeout(400);
  s = await state(page);
  if (!okDoc(s) || s.hash !== "#/docs/license") fail.push(`FWD    [${lang}] forward → ${JSON.stringify(s)}`);
  await page.goBack(); await page.goBack(); await page.waitForTimeout(400);
  s = await state(page);
  if (s.homeHidden !== false) fail.push(`BACK   [${lang}] back to the homepage left it hidden → ${JSON.stringify(s)}`);

  /* --- LANG: the choice survives every route change --------------------- */
  await page.goto(base, { waitUntil: "networkidle" });
  for (const r of ["docs", "docs/license", "support", ""]) {
    await page.evaluate((r) => { location.hash = r ? "#/" + r : "#pricing"; }, r);
    await page.waitForTimeout(320);
    const st = await state(page);
    if (st.lang !== lang) fail.push(`LANG   [${lang}] became "${st.lang}" after moving to ${r || "#pricing"}`);
    const wantDir = lang === "ar" ? "rtl" : "ltr";
    if (st.dir !== wantDir) fail.push(`LANG   [${lang}] dir="${st.dir}" on ${r || "#pricing"}, expected ${wantDir}`);
  }

  /* --- DEAD: no in-page link points at a route that does not render ----- */
  const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href")))]);
  for (const h of hrefs) {
    if (!h || h === "#") { fail.push(`DEAD   [${lang}] a link with href="${h}"`); continue; }
    if (h.startsWith("#/")) {
      const r = h.slice(2).replace(/\/$/, "");
      if (!DOC_ROUTES.includes(r)) fail.push(`DEAD   [${lang}] ${h} is not a declared route`);
    } else {
      const id = h.slice(1);
      const found = await page.evaluate((id) => !!document.getElementById(id), id);
      if (!found) fail.push(`DEAD   [${lang}] ${h} has no target on the page`);
    }
  }

  if (errors.length) fail.push(`ERROR  [${lang}] ${[...new Set(errors)].join(" | ")}`);
  process.stdout.write(`  ${lang.padEnd(6)} deep+reload+nav+back+lang+dead\n`);

  } catch (e) {
    /* Reported with the language, because "Page crashed" on its own says nothing about which
       of the eleven it was, and that is the whole question. */
    const why = String(e && e.message ? e.message : e).split("\n")[0].slice(0, 160);
    fail.push(`CRASH  [${lang}] the page did not survive this language: ${why}`);
    process.stdout.write(`  ${lang.padEnd(6)} FAILED: ${why}\n`);
  } finally {
    await ctx.close().catch(() => { /* a crashed context cannot be closed cleanly */ });
  }
}

/* --- the unknown route, and the server's own 404 ------------------------ */
{
  if (!browser.isConnected()) browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${base}#/does-not-exist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const s = await state(page);
  if (!s.notFound) fail.push(`404    an unknown hash route did not render a not-found heading (h1="${s.h1}")`);
  /* The sidebar is emptied and hidden here ON PURPOSE -- renderNotFound writes into the docs
     containers rather than over them, and empties the list, so the reader gets the message and
     one way home. What must not happen is the list failing to come BACK, which is the
     regression that stranded a reader on every later docs link. So the assertion is on the
     recovery, not on the 404 itself. */
  if (!s.navLinks) {
    const navGone = await page.evaluate(() => !document.getElementById("docNav") || !document.getElementById("docContent"));
    if (navGone) fail.push("404    the not-found view destroyed the docs containers");
  }
  await page.evaluate(() => { location.hash = "#/docs"; });
  await page.waitForTimeout(400);
  if (!okDoc(await state(page))) fail.push("404    could not return to the documentation after a not-found route");
  /* The HTTP status of an unknown PATH is the host's job, not the app's: server.js is a dev
     server and falls back to index.html with a 200 for everything, which is what makes hash
     routing work locally. Ask the deployed host instead, and only when one is named. */
  const live = process.env.LIVE_ORIGIN;
  if (live) {
    const r = await fetch(live.replace(/\/$/, "") + "/no-such-file-" + Date.now());
    if (r.status !== 404) fail.push(`404    ${live} GET /no-such-file returned HTTP ${r.status}, expected 404`);
    else console.log(`  ${live} answers an unknown path with a real 404`);
  } else {
    console.log("  (skipped the HTTP-404 check: set LIVE_ORIGIN to ask the deployed host)");
  }
  await page.close();
}

await browser.close();
server.kill();

if (fail.length) { console.error(`\ncheck-routing FAILED (${fail.length}):\n - ` + fail.join("\n - ")); process.exit(1); }
console.log(`\ncheck-routing OK: ${DOC_ROUTES.length} routes x ${LANGS.length} languages, entered cold, by click, by reload and by history`);
