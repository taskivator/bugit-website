#!/usr/bin/env node
/**
 * WHAT A VISITOR CAN DO ON THE PUBLISHED PAGES (2026-10-04).
 *
 * WHY THIS EXISTS. On 2026-10-04 bugit.dev switched to the redesign (build.js publishes
 * v2/index.html as / and v2/docs/index.html as /docs/). About forty browser guards in this folder
 * drove the single page site: its #langButton, its #docView, its mission box. They were retired
 * with it (scripts/retired-single-page/README.md says which and why), and most of what they held
 * was about that design. Some of it was not. A keyboard user must be able to work the language
 * picker; a thumb must be able to hit a link; text must not drop below a size people can read; a
 * visitor who asked for less motion must get it; a mistyped docs address must say so and let them
 * back out. Those properties outlive any design, and this guard holds them on the pages that are
 * live now. check-redesign.mjs holds the rest (old addresses, every language rendering clean,
 * consent, the Ask bar), against the BUILT bytes; this one serves the source tree like the other
 * browser suites, because its negative controls inject into the page.
 *
 * WHAT IT HOLDS, in Chromium:
 *   1. ROUTES   every docs route renders its own heading in English and Arabic; an unknown route
 *               renders the not-found heading; the docs come back after it; Back and Forward work.
 *   2. PICKER   the language picker opens with ArrowDown, moves with the arrows, closes with
 *               Escape and gives focus back, and Enter on an option changes the language.
 *   3. MENU     the phone menu opens, says so (aria-expanded), and Escape closes it.
 *   4. TAP      every control that is not a link inside running text is at least 24 CSS px in
 *               both directions (WCAG 2.2 AA, 2.5.8), at phone and desktop width.
 *   5. TYPE     no visible text under 10px, the floor the single page site held.
 *   6. NAMES    every visible control has an accessible name; every image has an alt; one h1.
 *   7. MOTION   with reduced motion, nothing animates forever, and once scrolled through, no text
 *               is left faded out waiting for an animation that will not come.
 *   8. NARROW   no sideways scroll at 320px in the languages with the longest words.
 *   9. ZOOM     the viewport never forbids zooming.
 *  10. CONTRAST with Windows High Contrast on (forced-colors), every button and field keeps a
 *               visible edge (forced colours remove backgrounds and box-shadow, so a filled
 *               button becomes bare text) or reads as an underlined link, and keyboard focus
 *               draws an outline. It replaces check-forced-colors.mjs, which drove the old router.
 * Each of 2, 4, 5, 6, 7, 8 and 10 has a NEGATIVE CONTROL that plants the defect and must be caught.
 *
 *   node scripts/check-published-pages.mjs
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAP_MIN = 24;
const TYPE_MIN = 10;

// The docs routes, read from the docs page's own table so a new page is covered without a list here.
const DOCS_SRC = readFileSync(path.join(ROOT, "v2", "docs", "docs.js"), "utf8");
const ROUTES = [...DOCS_SRC.matchAll(/\{\s*r:\s*"([^"]+)"/g)].map((m) => m[1]);
if (ROUTES.length < 8) { console.error(`check-published-pages: read only ${ROUTES.length} docs routes from docs.js; the table changed shape`); process.exit(1); }

const PORT = await new Promise((res, rej) => {
  const s = net.createServer(); s.unref(); s.on("error", rej);
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
let serverExit = null;
server.on("exit", (c, s) => { serverExit = s || "code " + c; });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) {
  if (serverExit) { console.error("check-published-pages: server.js exited (" + serverExit + ")"); process.exit(1); }
  try { if ((await fetch(B + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

const failures = [];
let checks = 0;
const check = (ok, what, detail = "") => { checks++; if (!ok) failures.push(`${what}${detail ? ` -- ${detail}` : ""}`); };
const CONSENT = encodeURIComponent(JSON.stringify({ v: 1, ad_storage: false, analytics_storage: false, ad_user_data: false, ad_personalization: false, ts: Math.floor(Date.now() / 1000) }));

const browser = await chromium.launch();
async function open(width, lang, { reducedMotion = "no-preference", css = "", init = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 860 }, reducedMotion });
  await ctx.addCookies([
    { name: "bugitLang", value: lang, url: B }, { name: "bugitLangSet", value: "user", url: B },
    { name: "bugit_consent", value: CONSENT, url: B },
  ]);
  await ctx.route(/googletagmanager|google-analytics|doubleclick|googleadservices|google\.com|cloudflareinsights/, (r) => r.fulfill({ status: 204, body: "" }));
  if (init) await ctx.addInitScript(init);
  if (css) await ctx.addInitScript((c) => {
    document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = c; document.head.appendChild(s); });
  }, css);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, errors };
}

// The sweep that 4, 5, 6 and 8 share. Runs in the page.
function sweep({ TAP_MIN, TYPE_MIN }) {
  const shown = (el) => {
    if (el.closest("[hidden],[aria-hidden=true],.mnav")) return false;
    const s = getComputedStyle(el), b = el.getBoundingClientRect();
    return s.visibility !== "hidden" && s.display !== "none" && b.width > 0 && b.height > 0;
  };
  const label = (el) => (el.getAttribute("aria-label") || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) ||
    el.getAttribute("aria-labelledby") && document.getElementById(el.getAttribute("aria-labelledby"))?.textContent ||
    el.innerText || el.getAttribute("title") || el.querySelector("img[alt]")?.alt || el.querySelector("svg title")?.textContent || "").trim();
  const tap = [], unnamed = [], small = [];
  for (const el of document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,[role=button],[tabindex]:not([tabindex='-1'])")) {
    if (!shown(el)) continue;
    const b = el.getBoundingClientRect(), name = label(el);
    if (!name) unnamed.push(el.outerHTML.slice(0, 90));
    // WCAG 2.5.8 exempts a target inside a sentence: its size is set by the line it sits in. The
    // sentence is the nearest ancestor that is not itself inline, not the parent: Arabic wraps an
    // address in its own element, so the parent of an inline mailto link holds nothing but the link.
    let block = el.parentElement;
    while (block && block !== document.body && getComputedStyle(block).display === "inline") block = block.parentElement;
    const inline = el.tagName === "A" && getComputedStyle(el).display === "inline" && !!block &&
      (block.textContent || "").trim().length > (el.textContent || "").trim().length + 3;
    if (!inline && (b.width < TAP_MIN || b.height < TAP_MIN)) tap.push(`${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""} "${name.slice(0, 24)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
  }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const t = w.currentNode, el = t.parentElement;
    if (!t.textContent.trim() || !el || !shown(el)) continue;
    const f = parseFloat(getComputedStyle(el).fontSize);
    if (f < TYPE_MIN) small.push(`${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""} "${t.textContent.trim().slice(0, 24)}" ${f}px`);
  }
  const noAlt = [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).map((i) => i.src.slice(-50));
  return {
    tap, unnamed, small: [...new Set(small)], noAlt, h1: document.querySelectorAll("h1").length,
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

async function measure(route, width, lang, opts = {}) {
  const { ctx, page, errors } = await open(width, lang, opts);
  await page.goto(B + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const r = await page.evaluate(sweep, { TAP_MIN, TYPE_MIN });
  await ctx.close();
  return { ...r, errors };
}

// The picker's keyboard contract. Returns a list of what went wrong (empty is a pass).
async function pickerKeys(opts = {}) {
  const bad = [];
  const { ctx, page } = await open(1440, "en", opts);
  await page.goto(B + "/", { waitUntil: "networkidle" });
  await page.focus(".lang-btn");
  await page.keyboard.press("ArrowDown");
  const opened = await page.evaluate(() => ({ hidden: document.querySelector(".lang-list").hidden, exp: document.querySelector(".lang-btn").getAttribute("aria-expanded"), focus: document.activeElement?.getAttribute("role") }));
  if (opened.hidden || opened.exp !== "true") bad.push("ArrowDown on the picker did not open it");
  if (opened.focus !== "option") bad.push("opening the picker did not move focus into the list");
  const before = await page.evaluate(() => document.activeElement?.dataset?.lang);
  await page.keyboard.press("ArrowDown");
  const after = await page.evaluate(() => document.activeElement?.dataset?.lang);
  if (!before || before === after) bad.push(`ArrowDown inside the list did not move focus (${before} -> ${after})`);
  await page.keyboard.press("Escape");
  const closed = await page.evaluate(() => ({ hidden: document.querySelector(".lang-list").hidden, onBtn: document.activeElement?.classList.contains("lang-btn") }));
  if (!closed.hidden) bad.push("Escape did not close the picker");
  if (!closed.onBtn) bad.push("Escape did not give focus back to the picker button");
  await page.keyboard.press("ArrowDown");
  await page.evaluate(() => document.querySelector('.lang-list [data-lang="de"]')?.focus());
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const lang = await page.evaluate(() => document.documentElement.lang);
  if (lang !== "de") bad.push(`Enter on Deutsch left the page in '${lang}'`);
  await ctx.close();
  return bad;
}

// Forced colours. Returns the controls with no edge, and the focused elements with no outline.
async function contrast(route, width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 860 }, forcedColors: "active" });
  await ctx.addCookies([{ name: "bugit_consent", value: CONSENT, url: B }]);
  await ctx.route(/googletagmanager|google-analytics|doubleclick|googleadservices|google\.com|cloudflareinsights/, (r) => r.fulfill({ status: 204, body: "" }));
  if (opts.css) await ctx.addInitScript((c) => {
    document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = c; document.head.appendChild(s); });
  }, opts.css);
  const page = await ctx.newPage();
  await page.goto(B + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const noEdge = await page.evaluate(() => [...document.querySelectorAll("button,input:not([type=hidden]),select,textarea,a.btn,[role=button]")]
    .filter((el) => { const s = getComputedStyle(el), b = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && !el.closest("[hidden],[aria-hidden=true]"); })
    .filter((el) => {
      const s = getComputedStyle(el);
      const border = ["Top", "Right", "Bottom", "Left"].some((k) => s["border" + k + "Style"] !== "none" && parseFloat(s["border" + k + "Width"]) > 0);
      return !border && !/underline/.test(s.textDecorationLine);
    }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${(el.textContent || el.value || "").trim().slice(0, 20)}"`));
  const noRing = new Set();
  let focused = 0;
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e);
      return { el: `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} "${(e.textContent || "").trim().slice(0, 18)}"`, ok: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 }; });
    if (f) { focused++; if (!f.ok) noRing.add(f.el); }
  }
  await ctx.close();
  return { noEdge, noRing: [...noRing], focused };
}

// Reduced motion. Returns what animates forever, and what text is still faded after a scroll through.
async function motion(opts = {}) {
  const { ctx, page } = await open(1440, "en", { reducedMotion: "reduce", ...opts });
  await page.goto(B + "/", { waitUntil: "networkidle" });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 400) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(60); }
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const forever = document.getAnimations().filter((a) => a.playState === "running" && a.effect?.getTiming().iterations === Infinity)
      .map((a) => (a.animationName || "animation") + " on " + (a.effect.target?.className || a.effect.target?.id || "?"));
    const faded = [...document.querySelectorAll("main *")].filter((e) => {
      if (e.closest("[hidden],[aria-hidden=true]") || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
      let o = 1; for (let x = e; x && x !== document.body; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity);
      return o < 0.5;
    }).map((e) => `${e.tagName.toLowerCase()}.${e.className} "${e.textContent.trim().slice(0, 30)}"`);
    return { forever, faded: faded.slice(0, 8) };
  });
  await ctx.close();
  return r;
}

try {
  console.log("check-published-pages: 1. docs routes");
  for (const lang of ["en", "ar"]) {
    const { ctx, page, errors } = await open(1280, lang);
    await page.goto(B + "/docs/#/docs", { waitUntil: "networkidle" });
    const nf = await page.evaluate(() => { location.hash = "#/no-such-page"; return new Promise((r) => setTimeout(() => r({ h1: document.querySelector("#docsMain h1")?.textContent.trim(), nf: !!document.querySelector("#docsMain .nf") }), 400)); });
    check(nf.nf && !!nf.h1, `[${lang}] an unknown docs route renders the not-found heading`, JSON.stringify(nf));
    const seen = new Set(), heads = {};
    for (const r of ROUTES) {
      await page.evaluate((r) => { location.hash = "#/" + r; }, r);
      await page.waitForFunction(() => { const m = document.querySelector("#docsMain"); return m && !m.querySelector(".nf") && m.querySelector("h1") && m.textContent.trim().length > 200; }, null, { timeout: 15000 }).catch(() => {});
      const got = await page.evaluate(() => ({ h1: document.querySelector("#docsMain h1")?.textContent.trim() || "", nf: !!document.querySelector("#docsMain .nf"), chars: document.querySelector("#docsMain")?.textContent.trim().length || 0 }));
      check(!got.nf && got.h1 && got.chars > 200, `[${lang}] #/${r} renders its page`, JSON.stringify(got));
      seen.add(got.h1); heads[r] = got.h1;
    }
    check(seen.size === ROUTES.length, `[${lang}] every docs route has its own heading`, `${seen.size} distinct of ${ROUTES.length}`);
    // The PAGE shown, not only the address: a router that changed the hash and left the previous
    // document on screen would pass an address check (Codex review, 2026-10-04).
    const shown = () => page.evaluate(() => ({ hash: location.hash, h1: document.querySelector("#docsMain h1")?.textContent.trim() || "" }));
    const prev = ROUTES[ROUTES.length - 2], last = ROUTES[ROUTES.length - 1];
    await page.goBack(); await page.waitForTimeout(600);
    const back = await shown();
    check(back.hash === "#/" + prev && back.h1 === heads[prev], `[${lang}] Back shows the previous docs page`, JSON.stringify(back));
    await page.goForward(); await page.waitForTimeout(600);
    const fwd = await shown();
    check(fwd.hash === "#/" + last && fwd.h1 === heads[last], `[${lang}] Forward shows it again`, JSON.stringify(fwd));
    check(errors.length === 0, `[${lang}] no page error while routing`, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  console.log("check-published-pages: 2. the language picker by keyboard");
  const keys = await pickerKeys();
  check(keys.length === 0, "the language picker works by keyboard", keys.join("; "));

  console.log("check-published-pages: 2b. a link's language is shown, not stored; the last choice wins");
  {
    // ?lang= is a link's language. It must not replace what the visitor chose (Codex review,
    // 2026-10-04): ja chosen, a ?lang=de link shows German, and the next plain visit is Japanese.
    const { ctx, page } = await open(1440, "ja");
    await page.goto(B + "/?lang=de", { waitUntil: "networkidle" });
    const viaLink = await page.evaluate(() => document.documentElement.lang);
    await page.goto(B + "/", { waitUntil: "networkidle" });
    const after = await page.evaluate(() => document.documentElement.lang);
    check(viaLink === "de" && after === "ja", "a ?lang= link shows its language and leaves the visitor's choice alone", `link ${viaLink}, then ${after}`);
    // The race: Japanese is slow, the visitor picks Japanese then English. English must stay.
    await ctx.route(/\/v2\/i18n\/ja\.json/, async (r) => { await new Promise((z) => setTimeout(z, 1500)); r.continue(); });
    await page.goto(B + "/?lang=en", { waitUntil: "networkidle" });
    await page.evaluate(() => { window.V2SetLang("ja", true); window.V2SetLang("en", true); });
    await page.waitForTimeout(2500);
    const raced = await page.evaluate(() => document.documentElement.lang);
    check(raced === "en", "a slow language that was chosen first does not overwrite the one chosen after it", raced);
    await ctx.close();
  }

  console.log("check-published-pages: 3. the phone menu");
  {
    const { ctx, page } = await open(360, "en");
    await page.goto(B + "/", { waitUntil: "networkidle" });
    await page.click(".nav-toggle");
    const o = await page.evaluate(() => ({ exp: document.querySelector(".nav-toggle").getAttribute("aria-expanded"), hidden: document.getElementById("mnav").hidden, links: document.querySelectorAll("#mnav a").length }));
    check(o.exp === "true" && !o.hidden && o.links >= 4, "the phone menu opens and says so", JSON.stringify(o));
    await page.keyboard.press("Escape");
    const c = await page.evaluate(() => ({ exp: document.querySelector(".nav-toggle").getAttribute("aria-expanded"), hidden: document.getElementById("mnav").hidden }));
    check(c.exp === "false" && c.hidden, "Escape closes the phone menu", JSON.stringify(c));
    await ctx.close();
  }

  console.log("check-published-pages: 4-6, 8. targets, type, names, narrow screens");
  let swept = 0;
  for (const route of ["/", "/docs/", "/docs/#/docs/privacy", "/docs/#/docs/faq"]) {
    for (const lang of ["en", "de", "ja", "ar"]) {
      for (const width of [320, 360, 1440]) {
        const r = await measure(route, width, lang);
        const at = `${route} ${lang} ${width}`;
        check(r.tap.length === 0, `${at}: every control is at least ${TAP_MIN}px`, r.tap.slice(0, 4).join("; "));
        check(r.small.length === 0, `${at}: no text under ${TYPE_MIN}px`, r.small.slice(0, 4).join("; "));
        check(r.unnamed.length === 0, `${at}: every control has a name`, r.unnamed.slice(0, 3).join("; "));
        check(r.noAlt.length === 0, `${at}: every image has an alt`, r.noAlt.slice(0, 3).join("; "));
        check(r.h1 === 1, `${at}: exactly one h1`, `${r.h1}`);
        check(r.over <= 0, `${at}: no sideways scroll`, `${r.over}px`);
        check(r.errors.length === 0, `${at}: no page error`, r.errors.slice(0, 2).join(" | "));
        swept++;
      }
    }
  }
  check(swept >= 48, "the sweep covered enough renders", `${swept}`);

  console.log("check-published-pages: 7. reduced motion");
  const m = await motion();
  check(m.forever.length === 0, "with reduced motion nothing animates forever", m.forever.join("; "));
  check(m.faded.length === 0, "with reduced motion no text is left faded after a scroll through", m.faded.join("; "));

  console.log("check-published-pages: 9. zoom");
  for (const f of ["v2/index.html", "v2/docs/index.html"]) {
    const vp = /<meta name="viewport" content="([^"]*)"/.exec(readFileSync(path.join(ROOT, f), "utf8"))?.[1] || "";
    check(vp && !/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(vp), `${f}: the viewport lets people zoom`, vp);
  }

  console.log("check-published-pages: 10. Windows High Contrast");
  for (const route of ["/", "/docs/", "/docs/#/docs/privacy"]) {
    for (const width of [1440, 360]) {
      const c = await contrast(route, width);
      check(c.noEdge.length === 0, `${route} ${width} forced colours: every control keeps an edge`, c.noEdge.slice(0, 4).join("; "));
      check(c.noRing.length === 0, `${route} ${width} forced colours: focus draws an outline`, c.noRing.slice(0, 4).join("; "));
      check(c.focused >= 8, `${route} ${width} forced colours: the keyboard reached enough controls to mean anything`, `${c.focused}`);
    }
  }

  // ── NEGATIVE CONTROLS: each plants the defect its check exists for, and must be caught. ──────
  console.log("check-published-pages: negative controls");
  const nc = (fired, what) => { if (!fired) failures.push(`[control] ${what} was planted and NOT caught, so that check proves nothing`); else console.log(`  control fired: ${what}`); };
  const planted = await measure("/", 360, "en", { css:
    ".foot nav a{display:inline!important;min-height:0!important;line-height:12px!important;font-size:12px!important;padding:0!important}" +
    ".ticket .from{font-size:8px!important}" +
    "body::after{content:'';display:block;width:900px;height:1px}",
    init: () => document.addEventListener("DOMContentLoaded", () => { const b = document.createElement("button"); b.style.cssText = "display:block;width:40px;height:40px"; b.innerHTML = "<span hidden>ghost name</span>"; document.querySelector("main").appendChild(b); }) });
  nc(planted.tap.some((t) => /^a /.test(t) || t.startsWith("a ")), "a 12px footer link");
  nc(planted.small.some((t) => /8px$/.test(t)), "8px text");
  nc(planted.unnamed.length > 0, "a button whose only name is hidden text");
  nc(planted.over > 0, "a 900px wide element on a 360px phone");
  const deaf = await pickerKeys({ init: () => window.addEventListener("keydown", (e) => { if (e.target.closest?.(".lang-pick")) e.stopPropagation(); }, true) });
  nc(deaf.length > 0, "a picker that ignores the keyboard");
  const moving = await motion({ css: "#ncSpin{animation:ncspin 1s linear infinite!important}@keyframes ncspin{to{transform:rotate(1turn)}}#ncFade{opacity:.2!important}",
    init: () => document.addEventListener("DOMContentLoaded", () => {
      const d = document.createElement("div"); d.id = "ncSpin"; d.textContent = "x"; document.querySelector("main").appendChild(d);
      const f = document.createElement("p"); f.id = "ncFade"; f.textContent = "a sentence waiting for an animation"; document.querySelector("main").appendChild(f);
    }) });
  nc(moving.forever.length > 0, "an endless animation under reduced motion");
  nc(moving.faded.length > 0, "text stuck at 20% opacity");
  const flat = await contrast("/", 1440, { css: "@media (forced-colors:active){.btn{border:0!important;text-decoration:none!important}} *:focus,*:focus-visible{outline:none!important}" });
  nc(flat.noEdge.length > 0, "a filled button with no edge under forced colours");
  nc(flat.noRing.length > 0, "focus with no outline under forced colours");
} finally {
  await browser.close();
  server.kill();
}

if (failures.length) {
  console.log(`\ncheck-published-pages FAILED: ${failures.length} of ${checks} checks`);
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
console.log(`\ncheck-published-pages OK: ${checks} checks. Docs routes, the picker by keyboard, the phone menu, ${TAP_MIN}px targets, a ${TYPE_MIN}px type floor, named controls, reduced motion, 320px phones, zoom and Windows High Contrast, each with its negative control caught.`);
