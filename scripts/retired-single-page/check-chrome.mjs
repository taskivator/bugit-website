/*
 * THE CHROME: the header lockup, the language menu, the social labels, the footer links.
 *
 * These four are the parts of the page that are present on EVERY route, in every language, and
 * they are the parts a page-level sweep is least likely to catch, because each defect is a
 * property of an INTERACTION or of one narrow width rather than of the resting page.
 *
 * Each check below is here because it was a real defect on 2026-08-21:
 *
 *   MENU     the language panel was moved from `display:none` to `visibility:hidden` so it
 *            could animate closed. A visibility:hidden box is still LAID OUT, and this one is
 *            wider than the button it hangs off -- which took 104px off the right of every
 *            Arabic page at 320px, on every route, with nothing visible to explain it. It must
 *            be out of layout when closed, in both writing directions.
 *   BYLINE   "BY TASKIVATOR" is nowrap + ellipsis and lost 12px in English and 22px in Arabic
 *            at 320px, rendering the parent brand's name as "BY TASKIVAT…". A truncated brand
 *            name is worse than an absent one.
 *   LABEL    the social marks' hover labels straddled the header's bottom edge, where the
 *            reading-progress line is drawn, and landed on whatever the page had behind them --
 *            at the foot of the page, the bright call-to-action band.
 *   FOOTER   the documentation links went to plain white on hover while drawing a pink
 *            underline, so the two halves of one gesture disagreed. The owner asked for the
 *            colour the FAQ questions use.
 *
 * Every assertion is a measurement rather than a look at the stylesheet: three of these four
 * were written correctly in CSS and still wrong on the page.
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

const PORT = await new Promise((res, rej) => { const p = net.createServer(); p.on("error", rej); p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); }); });
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 80; i++) { try { const r = await fetch(base); if (r.ok) break; } catch { await new Promise((r) => setTimeout(r, 150)); } }

const fail = [];
const browser = await chromium.launch();

/* ---- MENU + BYLINE: every language, at the widths where they broke ------ */
for (const w of [320, 360, 390, 768, 1280, 1512]) {
  for (const lang of LANGS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies([{ name: "bugitLang", value: lang, url: base }]);
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const closed = await page.evaluate(() => {
      const l = document.querySelector(".lang-list");
      if (!l) return { missing: true };
      const cs = getComputedStyle(l);
      return { display: cs.display, rects: l.getClientRects().length, docW: document.documentElement.scrollWidth };
    });
    if (closed.missing) { fail.push(`[${lang}@${w}] there is no .lang-list`); await ctx.close(); continue; }
    /* Out of layout, not merely invisible. `display:none` gives an element no client rects at
       all, which is the only state that cannot contribute overflow. */
    if (closed.display !== "none" || closed.rects !== 0)
      fail.push(`[${lang}@${w}] the CLOSED language panel is still laid out (display:${closed.display}, ${closed.rects} boxes) — this is what cut 104px off the Arabic page`);
    if (closed.docW > w + 1)
      fail.push(`[${lang}@${w}] the page is ${closed.docW - w}px wider than the viewport with the menu closed`);

    /* Open it, and it must be on screen and above the fold of its own row. */
    await page.click("#langButton").catch(() => {});
    await page.waitForTimeout(420);
    const open = await page.evaluate(() => {
      const l = document.querySelector(".lang-list");
      const r = l.getBoundingClientRect();
      const names = [...l.querySelectorAll(".lang-n")];
      return {
        display: getComputedStyle(l).display,
        inside: r.left >= -1 && r.right <= innerWidth + 1,
        left: +r.left.toFixed(1), right: +r.right.toFixed(1),
        docW: document.documentElement.scrollWidth,
        clipped: names.filter((n) => n.scrollWidth > n.clientWidth + 0.5).map((n) => n.textContent),
        checked: l.querySelectorAll('[aria-checked="true"]').length,
        items: l.querySelectorAll('[role="menuitemradio"]').length,
      };
    });
    if (open.display === "none") fail.push(`[${lang}@${w}] the language menu did not open`);
    else {
      if (!open.inside) fail.push(`[${lang}@${w}] the open language menu is off screen (${open.left}..${open.right} in ${w}px)`);
      if (open.docW > w + 1) fail.push(`[${lang}@${w}] the open menu widened the page by ${open.docW - w}px`);
      if (open.clipped.length) fail.push(`[${lang}@${w}] truncated in the menu: ${open.clipped.join(", ")}`);
      if (open.items !== LANGS.length) fail.push(`[${lang}@${w}] the menu offers ${open.items} languages, expected ${LANGS.length}`);
      if (open.checked !== 1) fail.push(`[${lang}@${w}] ${open.checked} menu items are aria-checked, expected exactly 1`);
    }

    /* THE MENU MUST BEHAVE LIKE THE MENU IT SAYS IT IS.
       The markup declared role="menu", role="menuitemradio", aria-haspopup, aria-expanded and
       aria-controls, and implemented none of it: the arrows did nothing, opening moved focus
       nowhere, and Tab walked out while the menu stayed open under a button that reported
       itself collapsed. A declared role is a promise about behaviour, and nothing was checking
       the promise -- the existing assertions above all read geometry, which was correct.
       Checked at one width per language: keyboard behaviour is not a function of viewport, and
       repeating it six times would buy nothing but minutes. */
    if (w === 1280) {
      const kb = await page.evaluate(async () => {
        const menu = document.getElementById("langMenu");
        const btn = document.getElementById("langButton");
        const list = document.getElementById("langList");
        const items = () => [...list.querySelectorAll("button")];
        const press = (key) => {
          const target = document.activeElement || document;
          target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
        };
        const out = {};
        /* START FROM CLOSED. The geometry block above leaves the menu OPEN, so the first click
           here was toggling it shut and every assertion below then failed against a working
           menu -- a false red that cost more time than the defect it was written for. */
        if (menu.classList.contains("open")) { btn.click(); await new Promise((r) => setTimeout(r, 60)); }
        /* Open with the pointer, the way most people do, and see where focus went. */
        btn.click();
        await new Promise((r) => setTimeout(r, 60));
        out.focusOnOpen = document.activeElement && document.activeElement.closest("#langList") ? "item" : (document.activeElement === btn ? "button" : "elsewhere");
        out.focusIsChecked = document.activeElement ? document.activeElement.getAttribute("aria-checked") === "true" : false;
        /* Roving tabindex: exactly one item in the tab order. */
        out.tabbable = items().filter((b) => b.tabIndex === 0).length;
        const first = document.activeElement;
        press("ArrowDown");
        await new Promise((r) => setTimeout(r, 40));
        out.arrowMoved = document.activeElement !== first && !!(document.activeElement && document.activeElement.closest("#langList"));
        press("End");
        await new Promise((r) => setTimeout(r, 40));
        out.endWentLast = document.activeElement === items()[items().length - 1];
        press("Home");
        await new Promise((r) => setTimeout(r, 40));
        out.homeWentFirst = document.activeElement === items()[0];
        /* Escape closes AND hands focus back, so the reader is not dropped on <body>. */
        press("Escape");
        await new Promise((r) => setTimeout(r, 60));
        out.escClosed = !menu.classList.contains("open");
        out.escReturnedFocus = document.activeElement === btn;
        out.expandedAfterClose = btn.getAttribute("aria-expanded");
        /* Focus leaving must close it: an open menu under a collapsed button is a lie told to
           anyone who cannot see the screen. */
        btn.click();
        await new Promise((r) => setTimeout(r, 60));
        const away = document.querySelector("a[href], button:not(#langButton)");
        if (away) away.focus();
        await new Promise((r) => setTimeout(r, 80));
        out.closedOnFocusLoss = !menu.classList.contains("open");
        return out;
      });
      const K = `[${lang}@${w}] the language menu`;
      if (kb.focusOnOpen !== "item") fail.push(`${K} does not move focus into the list when it opens (focus went to ${kb.focusOnOpen})`);
      if (!kb.focusIsChecked) fail.push(`${K} opens on some other item than the language currently in use`);
      if (kb.tabbable !== 1) fail.push(`${K} puts ${kb.tabbable} items in the tab order, expected exactly 1 (roving tabindex)`);
      if (!kb.arrowMoved) fail.push(`${K} declares role="menu" but the arrow keys do not move between languages`);
      if (!kb.endWentLast) fail.push(`${K} does not answer End`);
      if (!kb.homeWentFirst) fail.push(`${K} does not answer Home`);
      if (!kb.escClosed) fail.push(`${K} does not close on Escape`);
      if (!kb.escReturnedFocus) fail.push(`${K} closes on Escape but drops focus instead of returning it to the button`);
      if (kb.expandedAfterClose !== "false") fail.push(`${K} reports aria-expanded="${kb.expandedAfterClose}" while closed`);
      if (!kb.closedOnFocusLoss) fail.push(`${K} stays open after focus leaves it`);
    }
    await page.keyboard.press("Escape").catch(() => {});

    /* THE BYLINE. Either it is shown in full, or it is not shown -- never sliced. */
    const byline = await page.evaluate(() => {
      const em = document.querySelector(".brand em");
      if (!em) return null;
      const cs = getComputedStyle(em);
      if (cs.display === "none") return { hidden: true };
      return { hidden: false, cut: em.scrollWidth - em.clientWidth, text: em.textContent.trim() };
    });
    if (byline && !byline.hidden && byline.cut > 1)
      fail.push(`[${lang}@${w}] the byline is sliced by ${byline.cut}px ("${byline.text}")`);
    await ctx.close();
  }
}

/* ---- LABEL: the social mark's label must clear the bar it hangs under --- */
{
  const page = await browser.newPage({ viewport: { width: 1512, height: 950 } });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.getElementById("consentBanner")?.remove());
  await page.waitForTimeout(200);
  /* At the FOOT of the page, which is where the owner saw it: the reading-progress line is
     fully drawn there and the band behind it is at its brightest. */
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  for (const which of ["linkedin", "youtube"]) {
    const mark = await page.$(`.nav-social[href*="${which}"]`);
    if (!mark) { fail.push(`there is no ${which} mark in the header`); continue; }
    await mark.hover();
    await page.waitForTimeout(400);
    const r = await page.evaluate((which) => {
      const a = document.querySelector(`.nav-social[href*="${which}"]`);
      const header = document.querySelector("header.nav");
      const hr = header.getBoundingClientRect();
      const ar = a.getBoundingClientRect();
      const cs = getComputedStyle(a, "::after");
      /* `top` on the ::after is relative to the mark's PADDING box, and the mark has a
         border, so the padding box is 2px shorter than the rect. Anchor the arithmetic to
         the rect's TOP and add the resolved offset; deriving it from the bottom and
         subtracting the height quietly reintroduces that 2px. */
      const top = ar.top + parseFloat(cs.top || "0");
      const h = parseFloat(cs.height) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 2;
      return { labelTop: +top.toFixed(1), labelBottom: +(top + h).toFixed(1), headerBottom: +hr.bottom.toFixed(1),
               opacity: cs.opacity, bg: cs.backgroundColor };
    }, which);
    if (r.labelTop < r.headerBottom + 0.5)
      fail.push(`the ${which} label starts at ${r.labelTop} but the header ends at ${r.headerBottom} — it straddles the bar and the progress line runs through it`);
    if (parseFloat(r.opacity) < 0.99) fail.push(`the ${which} label did not become visible on hover (opacity ${r.opacity})`);
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(r.bg))
      fail.push(`the ${which} label has no background, so it reads against whatever is behind it`);
  }
  await page.close();
}

/* ---- FOOTER: the documentation links answer the way the questions do ---- */
{
  const page = await browser.newPage({ viewport: { width: 1512, height: 950 } });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  /* The consent banner is fixed to the foot of the viewport and swallows a hover aimed at
     anything under it. Removing it is not cheating: the reader who has answered it once
     never sees it again, and this check is about colour, not about consent. */
  await page.evaluate(() => document.getElementById("consentBanner")?.remove());
  await page.waitForTimeout(400);
  const faqHover = await page.evaluate(() => {
    /* Read the FAQ's own hover colour out of the stylesheet rather than hard-coding pink, so
       this keeps agreeing with the page if the brand colour ever moves. */
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const r of rules || []) {
        if (r.selectorText && /\.faq summary:hover/.test(r.selectorText)) return r.style.color;
      }
    }
    return null;
  });
  const link = await page.$(".footer nav a");
  if (!link) fail.push("the footer has no documentation links");
  else {
    const before = await link.evaluate((el) => getComputedStyle(el).color);
    await link.hover();
    await page.waitForTimeout(300);
    const after = await link.evaluate((el) => getComputedStyle(el).color);
    if (after === before) fail.push(`a footer documentation link does not change colour on hover (${after})`);
    /* Resolve the FAQ's declared colour through a probe element so both sides are rgb(). */
    const want = await page.evaluate((c) => {
      if (!c) return null;
      const d = document.createElement("span");
      d.style.color = c; document.body.appendChild(d);
      const v = getComputedStyle(d).color; d.remove(); return v;
    }, faqHover);
    if (want && after !== want)
      fail.push(`the footer link hovers to ${after}, the FAQ questions hover to ${want} — the owner asked for these to match`);
  }
  await page.close();
}

await browser.close();
server.kill();

if (fail.length) { console.error(`\ncheck-chrome FAILED (${fail.length}):\n - ` + fail.join("\n - ")); process.exit(1); }
console.log(`\ncheck-chrome OK: the language menu is out of layout when closed and on screen when open in ${LANGS.length} languages at 6 widths, it answers the arrows, Home, End, Escape and focus loss the way the menu role it declares promises, the byline is never sliced, the social labels clear the bar, and the footer links answer like the questions`);
