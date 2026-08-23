#!/usr/bin/env node
/*
 * WINDOWS HIGH CONTRAST, WHICH NOTHING HAD EVER RENDERED THIS SITE IN.
 *
 * Owner, 2026-08-24: "make sure your website and portal audit includes android phone, android
 * tablets, iphone, ipad, mac, linux and every other major player thats popular between users."
 *
 * Windows is the largest of those, and `forced-colors: active` is the mode a Windows reader with
 * High Contrast on is in. It is not a dark theme and it is not a preference: the UA REPLACES
 * colour. Per CSS Forced Colors 1 it forces color, background-color, border-color, outline-color,
 * text-decoration-color, fill and stroke to system colours -- and it forces two things to NONE
 * rather than to a colour: every `box-shadow`, and every `background-image` that is not a url().
 *
 * Nothing on either surface had a rule inside a forced-colors query, and no guard in either
 * repository had ever set the flag. What that hid, measured on 2026-08-24 at 1366x768:
 *
 *   FOCUS  Thirteen consecutive Tab presses across the home page, and every focused control
 *          reported outline:none and box-shadow:none. Nav links, the skip link, the brand, the
 *          consent buttons, the social links -- not one showed where the keyboard was. The cause
 *          is `:where(a,button,summary,[tabindex]):focus-visible{outline:none;box-shadow:var(--focus)}`,
 *          which is the right trade in ordinary colour and leaves nothing behind in forced
 *          colour. WCAG 2.4.7 failing for the readers who turned High Contrast on because they
 *          need contrast, and who are disproportionately navigating by keyboard.
 *
 *   EDGE   A control whose only visible boundary is a gradient or a shadow has no boundary once
 *          both are forced away. The site survives this because `.primary` declares an opaque
 *          background-COLOUR under its gradient and a colour is replaced rather than removed;
 *          the portal's equivalent did not, and its "Sign in" button was bare text. The rule is
 *          here so that the site cannot drift into the portal's version of the same mistake.
 *
 * THE SUBJECT IS COMPUTED. Controls are whatever the page gives the keyboard, found by pressing
 * Tab, and edges are compared between two renders of the same page. Nothing is named, so a
 * control added next month is measured the day it is added.
 *
 * Both engines that support the flag are used. WebKit does not implement forced-colors at all,
 * which is correct -- macOS "Increase contrast" is a different mechanism -- so it is not asked.
 *
 * Run: node scripts/check-forced-colors.mjs
 */
import { chromium, firefox } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

/* Routes and languages from the app's own tables, never a list kept in step by hand. */
const app = readFileSync(join(ROOT, "app.js"), "utf8");
const DOC_ROUTES = JSON.parse(app.match(/const docRoutes=(\[.*?\]);/s)[1].replace(/'/g, '"'));
const LANGS = JSON.parse(app.match(/const languages=(\[\[.*?\]\]);/s)[1].replace(/'/g, '"')).map(([c]) => c);
/* One route of each kind, and one right-to-left language: the rule is about colour, not about
   content, so breadth here buys less than the two engines and the two modes do. */
const ROUTES = ["/", "/" + DOC_ROUTES[2], "/" + DOC_ROUTES[DOC_ROUTES.length - 1]];
const PROBE_LANGS = ["en", LANGS.includes("ar") ? "ar" : LANGS[1]];
const TABS = 14;

/* ---------- the site under test ------------------------------------------ */
const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
});
const base = `http://127.0.0.1:${PORT}`;
function stop() {
  try { server.kill(); } catch {}
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
}
let up = false;
for (let i = 0; i < 80; i++) {
  try { const r = await fetch(base + "/"); if (r.ok) { up = true; break; } } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
if (!up) { console.error("check-forced-colors: the site did not come up."); stop(); process.exit(1); }

/* ---------- what the reader can see -------------------------------------- */
/* An element PAINTS SOMETHING if it has any of the affordances forced colours keeps. box-shadow
   is listed because it is what the site uses today and what forced colours removes: including it
   is what makes the difference between the two modes measurable rather than assumed. */
const PAINTS = `(el) => {
  const cs = getComputedStyle(el);
  const alpha = (c) => { const m = String(c).match(/[0-9.]+/g); return m && m.length > 3 ? +m[3] : (m ? 1 : 0); };
  const bordered = ["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"]
    .some((p) => parseFloat(cs[p]) > 0);
  return {
    outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
    shadow: cs.boxShadow !== "none",
    edge: bordered || cs.backgroundImage !== "none" || cs.boxShadow !== "none"
       || alpha(cs.backgroundColor) > 0.06 || cs.textDecorationLine !== "none",
    detail: "outline=" + cs.outlineStyle + " " + cs.outlineWidth + " shadow=" + (cs.boxShadow !== "none")
          + " border=" + bordered + " bgimg=" + (cs.backgroundImage !== "none")
          + " bgAlpha=" + alpha(cs.backgroundColor).toFixed(2),
  };
}`;

const TAB_SNAPSHOT = (paintsSrc) => {
  const paints = eval("(" + paintsSrc + ")");
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const name = el.tagName.toLowerCase()
    + (el.id ? "#" + el.id : "")
    + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : "");
  return {
    name,
    text: (el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 30),
    ...paints(el),
  };
};

/* Every control on the page, keyed by a path that survives a reload, so the same element can be
   compared between the forced render and the ordinary one. */
const ALL_CONTROLS = (paintsSrc) => {
  const paints = eval("(" + paintsSrc + ")");
  const pathOf = (el) => {
    const bits = [];
    let n = el;
    while (n && n !== document.body) { let i = 1, s = n; while ((s = s.previousElementSibling)) i++;
      bits.unshift(n.tagName.toLowerCase() + ":" + i); n = n.parentElement; }
    return bits.join(">");
  };
  /* WHAT THE READER SEES, NOT WHICH NODE OWNS THE PAINT. A control is routinely a transparent
     box over a child that carries the whole affordance: the video's play control is a full-bleed
     `button` with two gradients and no border, and the pink circle a reader actually sees is the
     `<i>` inside it, which has a background COLOUR and therefore survives forced colours intact.
     Scoring only the element's own box called that a control that had lost its edge, in Firefox,
     three times per page -- a true statement about the node and a false one about the screen. */
  const visibleWithin = (el) => {
    if (paints(el).edge) return true;
    for (const kid of el.querySelectorAll("*")) {
      const kr = kid.getBoundingClientRect();
      if (kr.width < 4 || kr.height < 4) continue;
      const kcs = getComputedStyle(kid);
      if (kcs.display === "none" || kcs.visibility === "hidden") continue;
      if (paints(kid).edge) return true;
    }
    return false;
  };
  const out = {};
  for (const el of document.querySelectorAll("a[href], button, [role=button], summary, input, select, textarea")) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const own = paints(el);
    out[pathOf(el)] = {
      name: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "")
          + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""),
      text: (el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 30),
      ...own,
      edge: visibleWithin(el),
    };
  }
  return out;
};

/* ---------- one render --------------------------------------------------- */
async function render(browser, { forced, lang, route, inject }) {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    forcedColors: forced ? "active" : "none",
    locale: lang,
  });
  await ctx.addCookies([{ name: "lang", value: lang, url: base }]);
  const page = await ctx.newPage();
  await page.goto(base + route, { waitUntil: "load" });
  if (inject) await page.addStyleTag({ content: inject });
  await page.waitForTimeout(350);

  const controls = await page.evaluate(ALL_CONTROLS, PAINTS);
  const focused = [];
  const seen = new Set();
  for (let i = 0; i < TABS; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(TAB_SNAPSHOT, PAINTS);
    if (!r) continue;
    const key = r.name + "|" + r.text;
    if (seen.has(key)) continue;
    seen.add(key);
    focused.push(r);
  }
  await ctx.close();
  return { controls, focused };
}

/* ---------- the two rules ------------------------------------------------ */
function score(where, normal, forcedRender) {
  const found = [];
  for (const f of forcedRender.focused) {
    if (!f.outline && !f.shadow) {
      found.push(`FOCUS ${where} "${f.text || f.name}" (${f.name}) shows nothing when it has the keyboard: ${f.detail}`);
    }
  }
  for (const [path, n] of Object.entries(normal.controls)) {
    const f = forcedRender.controls[path];
    if (!f || !n.edge || f.edge) continue;
    found.push(`EDGE  ${where} "${n.text || n.name}" (${n.name}) has a visible edge in ordinary colour and none in forced colour: ${f.detail}`);
  }
  return found;
}

/* ---------- measure ------------------------------------------------------ */
let cells = 0, controlsSeen = 0, focusedSeen = 0;
const ENGINES = [["chromium", chromium], ["firefox", firefox]];
for (const [engineName, engine] of ENGINES) {
  const browser = await engine.launch();
  for (const route of ROUTES) {
    for (const lang of PROBE_LANGS) {
      const where = `[${engineName} ${lang}] ${route}`;
      const normal = await render(browser, { forced: false, lang, route });
      const forcedRender = await render(browser, { forced: true, lang, route });
      cells++;
      controlsSeen += Object.keys(forcedRender.controls).length;
      focusedSeen += forcedRender.focused.length;
      if (!forcedRender.focused.length) {
        fail.push(`${where}: ${TABS} Tab presses reached no control at all, so this cell measured nothing`);
        continue;
      }
      fail.push(...score(where, normal, forcedRender));
    }
  }
  await browser.close();
}
note(`${cells} cell(s): ${ROUTES.length} routes x ${PROBE_LANGS.length} languages x ${ENGINES.length} engines, each rendered twice`);
note(`${controlsSeen} control(s) compared between ordinary and forced colour, ${focusedSeen} of them reached by Tab`);

/* ---------- negative controls -------------------------------------------- */
/* A guard nobody has watched fail is a guard nobody has tested. Each control below reproduces
   the exact defect this file was written for, and the run fails if the rule stays quiet. */
const nc = await chromium.launch();

const withoutOutline = await render(nc, {
  forced: true, lang: "en", route: "/",
  inject: "@media (forced-colors:active){a:focus-visible,button:focus-visible,summary:focus-visible,[tabindex]:focus-visible{outline:none !important}}",
});
const outlineFindings = score("[negative control]", withoutOutline, withoutOutline).filter((f) => f.startsWith("FOCUS"));
if (!outlineFindings.length) {
  fail.push("NEGATIVE CONTROL DID NOT FIRE: with the forced-colours outline removed, every focused control still scored as visible, so the FOCUS rule is not measuring what it claims to");
} else {
  note(`negative control FOCUS fired: ${outlineFindings.length} control(s) with nothing to show`);
}

const normalHome = await render(nc, { forced: false, lang: "en", route: "/" });
const flattened = await render(nc, {
  forced: true, lang: "en", route: "/",
  inject: "@media (forced-colors:active){a.primary,a.secondary,button.consent-btn{background-color:transparent !important;border-width:0 !important;text-decoration-line:none !important}}",
});
const edgeFindings = score("[negative control]", normalHome, flattened).filter((f) => f.startsWith("EDGE"));
if (!edgeFindings.length) {
  fail.push("NEGATIVE CONTROL DID NOT FIRE: with the buttons' fill and border removed under forced colours, nothing was reported as having lost its edge, so the EDGE rule is not measuring what it claims to");
} else {
  note(`negative control EDGE fired: ${edgeFindings.length} control(s) that lost their last visible edge`);
}
await nc.close();

stop();

if (fail.length) {
  console.error(`\ncheck-forced-colors: FAIL (${fail.length})`);
  for (const f of fail.slice(0, 40)) console.error("  - " + f);
  if (fail.length > 40) console.error(`  ... and ${fail.length - 40} more`);
  process.exit(1);
}
console.log(`\ncheck-forced-colors OK: in Windows High Contrast every control the keyboard reaches still shows where it is, and no control loses its last visible edge -- ${cells} cells across ${ENGINES.length} engines, both negative controls fired`);
