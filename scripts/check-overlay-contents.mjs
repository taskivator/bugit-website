/**
 * WHAT IS INSIDE AN OVERLAY HAS TO WORK, NOT JUST THE CONTROL THAT OPENED IT.
 *
 * THE DEFECT THIS EXISTS FOR. The mobile menu inerted the page behind it by walking down from
 * <body> and inerting, at each level, the children that were not on a path to something that
 * must stay live. The header is on such a path, because the hamburger lives in it, so the walk
 * descended into it and inerted the logo, the language menu and the account menu. Correct.
 * The MENU is also "on a path" by that test -- it is the destination -- so the walk descended
 * into it too and inerted .mm-head and .mm-links. That is every link in the overlay, the
 * account rows, and the overlay's own close button. Owner, 2026-08-22: "tapping on the 3 lines
 * to open settings then nothing else n that setting is selectable when I tap either of them no
 * thing happens".
 *
 * WHY NOTHING CAUGHT IT. check-overlay-controls opens every declared disclosure and taps the
 * CONTROL -- and the control was the one element deliberately kept live, so it kept passing
 * while everything the control revealed was dead. The markup was valid, the classes were right,
 * aria-expanded told the truth, and the overlay was fully visible and fully opaque. `inert` is
 * inherited, carries no visual signal at all, and a descendant cannot opt out of it.
 *
 * THE SUBJECT IS COMPUTED. Every element carrying aria-expanded + aria-controls is opened, and
 * then every focusable in whatever it controls is measured. An overlay added later is covered
 * on the day it renders. Nothing here names the mobile menu.
 *
 * WHAT IS ASSERTED, for each focusable inside an open overlay:
 *   LIVE      it is not inside an [inert] subtree.
 *   HITTABLE  elementFromPoint at its centre resolves to it, so a finger reaches it.
 *   FOCUSABLE focus() actually lands on it (focus into an inert subtree is a silent no-op).
 * and once per overlay that has one, an honest tap on an in-page link must DO something.
 *
 * BOTH ENGINES, and a phone, because that is where this overlay exists.
 */
import { chromium, webkit, devices } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* The negative control restores the walk that descends into the overlay. It has to be served
   rather than injected: `behind()` is called from a closure bound at init, so the only way to
   run the old behaviour is to serve the old source. */
const BREAK_FROM = "        if(live.has(child))continue;";
const BREAK_TO =
  "        /*NEGATIVE CONTROL: the destination is walked into again, which is the shipped bug.*/";

const TARGETS = [
  ["chromium", chromium, "Pixel 7"],
  ["webkit", webkit, "iPhone 14"],
  ["webkit", webkit, "iPhone SE"],
];

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
let serverExit = null;
server.on("exit", (c, s) => { serverExit = s || `code ${c}`; });
const BASE = `http://127.0.0.1:${PORT}`;

const FOCUSABLE =
  'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

/* Read every focusable inside one open overlay and report, per element, whether a reader can
   actually reach it. Runs in the page because all three questions are questions about the
   rendered document, not about the markup. */
const INSPECT = (overlayId) => {
  const box = document.getElementById(overlayId);
  if (!box) return { missing: true, items: [] };
  const sel =
    'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
  const items = [];
  for (const el of box.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    if (el.hidden || el.closest("[hidden]")) continue;
    /* BRING IT INTO ITS OWN SCROLLPORT FIRST. A panel that is taller than the screen is capped
       and scrolls internally, and a row parked below the cap still reports a rect at its laid
       out position -- on screen, and painted over by whatever is actually there. Hit-testing
       that point measures the clip, not the control. A reader scrolls the list; so does this.
       `instant` because the page sets scroll-behavior:smooth, and every rect read in the same
       turn as a smooth scroll is read mid-flight. */
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cx = r.left + r.width / 2;
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1);
    const onScreen = r.bottom > 0 && r.top < window.innerHeight;
    const top = onScreen ? document.elementFromPoint(cx, cy) : null;
    const before = document.activeElement;
    let landed = null;
    try { el.focus({ preventScroll: true }); landed = document.activeElement === el; } catch { landed = false; }
    if (before && before.focus) try { before.focus({ preventScroll: true }); } catch {}
    items.push({
      what: (el.textContent || el.getAttribute("aria-label") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 26),
      href: el.getAttribute("href") || "",
      inert: !!el.closest("[inert]"),
      inertHost: (() => {
        const n = el.closest("[inert]");
        return n ? n.tagName.toLowerCase() + (n.id ? "#" + n.id : n.className ? "." + String(n.className).split(" ")[0] : "") : "";
      })(),
      onScreen,
      hit: !onScreen ? null : !!top && (top === el || el.contains(top) || top.contains(el)),
      hitWas: !onScreen || !top ? "" : top.tagName.toLowerCase() + (top.id ? "#" + top.id : top.className ? "." + String(top.className).split(" ")[0] : ""),
      landed,
    });
  }
  return { missing: false, items };
};

async function run(engineName, engine, deviceName, broken) {
  const failures = [];
  let measured = 0, overlays = 0, tapped = 0;
  const b = await engine.launch();
  const ctx = await b.newContext({ ...devices[deviceName] });
  if (broken) {
    let patched = false;
    await ctx.route("**/app*.js", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      if (body.includes(BREAK_FROM)) patched = true;
      route.fulfill({ response: res, body: body.split(BREAK_FROM).join(BREAK_TO) });
    });
    ctx.once("close", () => { if (!patched) failures.push("the control could never be installed"); });
  }
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const where = `${engineName}/${deviceName}`;

  const controls = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("[aria-expanded][aria-controls]")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (!el.id) el.id = "ovn-" + out.length;
      out.push({ id: el.id, controls: el.getAttribute("aria-controls") });
    }
    return out;
  });
  if (!controls.length) failures.push(`${where}: found no aria-expanded controls at all`);

  for (const c of controls) {
    const loc = page.locator("#" + c.id);
    await page.evaluate((id) => {
      document.getElementById(id).scrollIntoView({ block: "center", behavior: "instant" });
    }, c.id);
    try { await loc.tap({ timeout: 4000 }); } catch { continue; }   // covered by check-overlay-controls
    await page.waitForTimeout(400);
    if ((await loc.getAttribute("aria-expanded")) !== "true") continue;

    overlays++;
    const seen = await page.evaluate(INSPECT, c.controls);
    if (seen.missing) {
      failures.push(`${where}: #${c.id} says aria-controls="${c.controls}" and no such element exists`);
      continue;
    }
    for (const it of seen.items) {
      measured++;
      if (it.inert) {
        failures.push(
          `${where}: "${it.what}" inside #${c.controls} is inside an inert <${it.inertHost}> while ` +
            "the overlay is open, so a reader can see it, tap it, and nothing happens",
        );
        continue;                                    // the other two follow from this one
      }
      if (it.hit === false) {
        failures.push(
          `${where}: "${it.what}" inside #${c.controls} is covered by ${it.hitWas}, so a finger ` +
            "landing on it reaches something else",
        );
      }
      if (!it.landed) {
        failures.push(`${where}: "${it.what}" inside #${c.controls} cannot take focus`);
      }
    }

    /* AND ONE OF THEM IS ACTUALLY USED. Everything above is a measurement; this is the reader's
       own gesture, with no force, on the first in-page link the overlay offers. */
    const link = page.locator(`#${c.controls} a[href^="#"]`).first();
    if (await link.count()) {
      const before = await page.evaluate(() => ({ hash: location.hash, y: Math.round(window.scrollY) }));
      let ok = true;
      try { await link.tap({ timeout: 4000 }); } catch { ok = false; }
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => ({ hash: location.hash, y: Math.round(window.scrollY) }));
      if (!ok) {
        failures.push(`${where}: the first link inside #${c.controls} could not be tapped at all`);
      } else if (after.hash === before.hash && Math.abs(after.y - before.y) < 8) {
        failures.push(
          `${where}: tapping the first link inside #${c.controls} changed neither the address nor ` +
            "the scroll position, so selecting it did nothing",
        );
      } else tapped++;
    }
    /* Leave it closed for the next control, whichever way it ended. */
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    await page.waitForTimeout(250);
  }
  await ctx.close();
  await b.close();
  return { failures, measured, overlays, tapped };
}

let failures = [];
let measured = 0, overlays = 0, tapped = 0;
try {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error(`the site server exited before serving (${serverExit})`);
    try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  for (const [name, engine, dev] of TARGETS) {
    const r = await run(name, engine, dev, false);
    failures = failures.concat(r.failures);
    measured += r.measured; overlays += r.overlays; tapped += r.tapped;
  }

  /* A check that has never been watched fail is a check nobody has tested. */
  const control = await run("webkit", webkit, "iPhone 14", true);
  if (!control.failures.length) {
    failures.push(
      "NEGATIVE CONTROL DID NOT FIRE: with the overlay walked into again -- the state in which " +
        "every link in it was inert -- this check still passed, so it is not measuring what it " +
        "claims to measure",
    );
  }
  /* And a run that measured nothing is not a clean run. */
  if (!measured) {
    failures.push("this check opened every disclosure on the page and found nothing inside any " +
                  "of them to measure, so a clean result here means nothing");
  }
  if (!tapped) {
    failures.push("no overlay offered an in-page link to actually select, so the one gesture a " +
                  "reader makes was never performed");
  }

  if (failures.length) {
    console.error("check-overlay-contents: FAIL");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(
    `check-overlay-contents: OK (${measured} controls measured inside ${overlays} opened overlays ` +
      `across ${TARGETS.length} device/engine pairs, ${tapped} selected by hand, negative control ` +
      `fired with ${control.failures.length} finding(s))`,
  );
} finally {
  try { server.kill(); } catch {}
}
