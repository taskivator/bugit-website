/**
 * A PHONE'S HEIGHT IS THE SCARCE THING, AND NOTHING MAY SIT IN IT UNINVITED.
 *
 * TWO DEFECTS, ONE SUBJECT. Both were reported on 2026-08-22 and both are about a box that
 * stays on a small screen when it has no business being there.
 *
 *   CONTENTS  The documentation's contents rail is `position:sticky`, which is right beside a
 *             document in a two-column layout: it holds its line while the reading moves. Below
 *             899px there is no second column, so the rail is simply ABOVE the document -- and a
 *             sticky box with nothing to stay level with just stays on the screen. It pinned
 *             itself 84px down and the document scrolled through it. The sheet's background is
 *             86% opaque, so the contents list stayed legible behind every paragraph, all the
 *             way to the bottom of a 8,600px document. Owner: "the on the page part in
 *             documentation when scrolling down on mobile view stays on the background of the
 *             document being scrolled".
 *
 *   HEADER    A phone held sideways has about 390px of height and the header took 72 of them on
 *             every screenful. Owner: "in mobile view in landscape mode because the height is
 *             limitted i want the top navigation bar to disappear and does not follow as the
 *             user scroll down so they can see more content". On a short landscape screen it
 *             now scrolls away like anything else. Portrait is unchanged and asserted here too,
 *             because "it went away" is only correct where it was asked for.
 *
 *   INSTRUMENT  Mission Control is one argument in two parts, and on a phone held sideways
 *             the two headings were 531px apart on a 390px screen: there was no scroll
 *             position that showed both. Owner: "in landscape mode the mission control
 *             seperates into 2 sections and the project learning and AI QA analysis part cant
 *             be both seen together". The portrait phone treatment answers it; it just was not
 *             reaching a screen that is short rather than narrow.
 *
 * WHY NOT A LOOK AT THE STYLESHEET. The contents fix is one line in a media query and it landed
 * BEFORE the rule it had to beat: same specificity, so the cascade went the other way and the
 * page did not change at all. A stylesheet that contains the right rule and a page that obeys it
 * are different claims. Everything here is read off the rendered page, at real scroll positions.
 *
 * Both engines, because a phone runs both.
 */
import { chromium, webkit } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Both defects are pure CSS, so both controls are stylesheets: injecting the old rule with
   !important puts the page back into the state that was reported. */
const CONTROLS = [
  { what: "the contents rail is made sticky again",
    css: "@media(max-width:899px){.docs-sidebar{position:sticky !important;top:84px !important}}",
    rule: "CONTENTS" },
  { what: "the header is made to follow a short landscape screen again",
    css: "@media (orientation:landscape) and (max-height:560px){header.nav.shell{position:sticky !important;top:0 !important}}",
    rule: "HEADER" },
  { what: "the status list is expanded back to its eight rows on a short screen",
    css: ".status-panel.steps-collapsed li{display:flex !important}",
    rule: "INSTRUMENT" },
];

const PHONES = [
  { name: "Pixel 7", width: 412, height: 915 },
  { name: "iPhone SE", width: 320, height: 568 },
];
const LANDSCAPE = [
  { name: "iPhone 14 sideways", width: 844, height: 390 },
  { name: "iPhone SE sideways", width: 568, height: 320 },
];
const DOCS = ["#/docs/privacy", "#/docs/license", "#/docs/getting-started"];
const TARGETS = [["chromium", chromium], ["webkit", webkit]];

const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
});
const BASE = `http://127.0.0.1:${PORT}`;

/* Does anything in the document's own navigation share space with the document? Read from the
   boxes, and then confirmed by asking the page what is actually painted at that point. */
const OVERLAP = () => {
  const rail = document.querySelector(".docs-sidebar");
  const content = document.querySelector(".docs-content");
  if (!rail || !content) return { missing: true };
  const rr = rail.getBoundingClientRect(), cr = content.getBoundingClientRect();
  const share = !(rr.bottom <= cr.top || rr.top >= cr.bottom || rr.right <= cr.left || rr.left >= cr.right);
  let painted = null;
  if (share) {
    const cx = rr.left + rr.width / 2;
    const cy = Math.min(Math.max(rr.top + Math.min(24, rr.height / 2), 1), window.innerHeight - 1);
    const t = document.elementFromPoint(cx, cy);
    painted = t ? t.tagName.toLowerCase() + (t.className ? "." + String(t.className).split(" ")[0] : "") : null;
  }
  return {
    missing: false, share, painted,
    pos: getComputedStyle(rail).position,
    railTop: Math.round(rr.top), contentTop: Math.round(cr.top),
  };
};

async function run(engineName, engine, control) {
  const failures = [];
  let scrolls = 0, headers = 0, instruments = 0;
  const b = await engine.launch();

  // ---- CONTENTS ----------------------------------------------------------------
  for (const phone of PHONES) {
    const ctx = await b.newContext({
      viewport: { width: phone.width, height: phone.height }, isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    for (const route of DOCS) {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      if (control) await page.addStyleTag({ content: control.css });
      await page.evaluate(() => document.getElementById("consentBanner")?.remove());
      const seen = new Set();
      for (const frac of [0, 0.15, 0.35, 0.6, 0.85]) {
        await page.evaluate((f) => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: Math.round(max * f), behavior: "instant" });
        }, frac);
        await page.waitForTimeout(220);
        const o = await page.evaluate(OVERLAP);
        if (o.missing) { failures.push(`${engineName}/${phone.name}${route}: no document rail rendered`); break; }
        scrolls++;
        if (o.share) {
          seen.add(
            `${engineName}/${phone.name} ${route}: the contents rail (${o.pos}, top ${o.railTop}px) ` +
              `is sitting on the document itself, which starts at ${o.contentTop}px, and what is ` +
              `painted over it is <${o.painted}>. The document reads through it.`,
          );
        }
      }
      for (const f of seen) failures.push(f);
    }
    await ctx.close();
  }

  // ---- HEADER ------------------------------------------------------------------
  for (const [kind, sizes] of [["landscape", LANDSCAPE], ["portrait", PHONES]]) {
    for (const size of sizes) {
      const ctx = await b.newContext({
        viewport: { width: size.width, height: size.height }, isMobile: true, hasTouch: true,
      });
      const page = await ctx.newPage();
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      if (control) await page.addStyleTag({ content: control.css });
      await page.evaluate(() => document.getElementById("consentBanner")?.remove());
      const atTop = await page.evaluate(() => {
        const h = document.querySelector("header").getBoundingClientRect();
        return { top: Math.round(h.top), h: Math.round(h.height) };
      });
      if (atTop.top > 2 || atTop.h < 20) {
        failures.push(`${engineName}/${size.name}: the header is not at the top of an unscrolled page`);
      }
      await page.evaluate(() => window.scrollTo({ top: 1600, behavior: "instant" }));
      await page.waitForTimeout(250);
      const after = await page.evaluate(() => {
        const h = document.querySelector("header").getBoundingClientRect();
        return { bottom: Math.round(h.bottom) };
      });
      headers++;
      if (kind === "landscape" && after.bottom > 0) {
        failures.push(
          `${engineName}/${size.name}: the header is still on screen after scrolling (its bottom ` +
            `edge is at ${after.bottom}px). On a ${size.height}px-tall screen it is taking ` +
            `${Math.round((atTop.h / size.height) * 100)}% of everything the reader has.`,
        );
      }
      if (kind === "portrait" && after.bottom <= 0) {
        failures.push(
          `${engineName}/${size.name}: the header scrolled away in PORTRAIT. It was asked to do ` +
            "that on a short landscape screen only; here it is the site's navigation.",
        );
      }
      await ctx.close();
    }
  }

  // ---- INSTRUMENT --------------------------------------------------------------
  /* BOTH HALVES OF MISSION CONTROL, ON ONE SHORT SCREEN. The section is one argument told in
     two parts: what the agent learned, and the report it wrote. A phone held sideways has
     390px of height and the full instrument stood 1117px tall in it, so PROJECT LEARNING sat
     250px above the top of the screen while AI QA ANALYSIS was 263px below it. There is no
     scroll position that shows both, which is the same requirement the portrait phone treatment
     was built for and the same treatment now answers it.
     Measured between the two HEADINGS rather than by the instrument's total height: the report
     may be as long as it likes below the fold, and what a reader has to be able to see together
     is the two labels. */
  for (const size of LANDSCAPE) {
    const ctx = await b.newContext({
      viewport: { width: size.width, height: size.height }, isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    if (control) await page.addStyleTag({ content: control.css });
    await page.evaluate(() => document.getElementById("consentBanner")?.remove());
    await page.evaluate(() => document.querySelector(".mission")?.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const head = document.querySelector(".status-head");
      const label = document.querySelector(".report-panel small, .report-label");
      if (!head || !label) return { missing: true };
      const a = head.getBoundingClientRect(), c = label.getBoundingClientRect();
      return {
        missing: false,
        span: Math.round(Math.max(a.bottom, c.bottom) - Math.min(a.top, c.top)),
        vh: window.innerHeight,
        learning: (head.textContent || "").trim().slice(0, 22),
        analysis: (label.textContent || "").trim().slice(0, 22),
        collapsed: !!document.querySelector(".status-panel.steps-collapsed"),
      };
    });
    instruments++;
    if (m.missing) {
      failures.push(`${engineName}/${size.name}: Mission Control did not render both headings`);
    } else if (m.span > m.vh) {
      failures.push(
        `${engineName}/${size.name}: "${m.learning}" and "${m.analysis}" are ${m.span}px apart on ` +
          `a screen ${m.vh}px tall, so the two halves of the instrument cannot be seen together ` +
          `at any scroll position (status list collapsed: ${m.collapsed})`,
      );
    }
    await ctx.close();
  }

  await b.close();
  return { failures, scrolls, headers, instruments };
}

let failures = [];
let scrolls = 0, headers = 0, instruments = 0;
try {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  for (const [name, engine] of TARGETS) {
    const r = await run(name, engine, null);
    failures = failures.concat(r.failures);
    scrolls += r.scrolls; headers += r.headers; instruments += r.instruments;
  }
  const fired = [];
  for (const c of CONTROLS) {
    const control = await run("chromium", chromium, c);
    const hits = control.failures.filter((f) =>
      c.rule === "CONTENTS" ? /contents rail/.test(f)
      : c.rule === "HEADER" ? /the header is still on screen|scrolled away in PORTRAIT/.test(f)
      : /cannot be seen together/.test(f));
    if (!hits.length) {
      failures.push(
        `NEGATIVE CONTROL DID NOT FIRE (${c.rule}): with ${c.what}, this check still passed, so ` +
          `it is not measuring ${c.rule} at all`,
      );
    }
    fired.push(`${c.rule}:${hits.length}`);
  }
  if (!scrolls || !headers || !instruments) {
    failures.push("this check measured nothing, so a clean result means nothing");
  }

  if (failures.length) {
    console.error("check-phone-height: FAIL");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(
    `check-phone-height: OK (${scrolls} scroll positions across ${DOCS.length} documents and ` +
      `${PHONES.length} phones with nothing sitting on the document, ${headers} header ` +
      `measurements in both orientations, ${instruments} short-landscape instruments with both ` +
      `halves in view; negative controls fired ${fired.join(", ")})`,
  );
} finally {
  try { server.kill(); } catch {}
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
}
