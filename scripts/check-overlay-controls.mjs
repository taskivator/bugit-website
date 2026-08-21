/**
 * A control that opens an overlay must still work when the overlay is open.
 *
 * THE DEFECT THIS EXISTS FOR. The mobile menu made the page behind it `inert` so a screen
 * reader could not browse through the overlay. It did that by inerting every child of <body>
 * except the overlay -- and the hamburger that closes the overlay lives in the <header>, which
 * is one of those children. `inert` is inherited and a descendant cannot opt out, so opening
 * the menu deleted its own close button from hit-testing. The button still looked pressable and
 * still said aria-label="Close menu". Tapping it did nothing, on a page whose scroll was locked
 * behind the overlay, which reads to a visitor as a browser that has stopped responding.
 *
 * WHY A TEST AND NOT A CODE REVIEW. Nothing about the markup looks wrong, the attribute is on an
 * ancestor three levels up, and every automated check in this repo passed: the overlay opened,
 * the classes were right, the aria was right. Playwright itself hid it, because `click({force})`
 * dispatches the event regardless -- which is precisely the thing a finger cannot do. So this
 * file taps honestly, with no force anywhere, and a control that cannot be reached fails.
 *
 * THE SUBJECT IS COMPUTED. Every element carrying `aria-expanded` and `aria-controls` is a
 * declared disclosure control, and each one is tested. A second overlay added later is covered
 * on the day it renders, with nothing to remember and no list in this file to go stale.
 *
 * BOTH ENGINES. The report came from Chrome on iPhone, which is WebKit, and this class of bug
 * has landed here before in exactly one engine. A missing engine is a FAILURE, not a skip.
 */
import { chromium, webkit, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

/* The negative control rewrites app.js on the wire, restoring the blanket version of `behind()`.
   Injecting a stylesheet or re-running a function after load would not do: the handler is bound
   at init from a closure, so the only way to test the old behaviour is to serve the old source. */
const BREAK_FROM = "const keepLive=()=>[menu,toggle];";
const BREAK_TO =
  "const keepLive=()=>[menu];" +
  "/*NEGATIVE CONTROL: the toggle is no longer kept live, which is the shipped bug.*/";

const TARGETS = [
  ["chromium", chromium, "Pixel 7"],
  ["chromium", chromium, "Galaxy S9+"],
  ["webkit", webkit, "iPhone 14"],
  ["webkit", webkit, "iPhone SE"],
  ["webkit", webkit, "iPhone 13 Pro Max"],
];

async function controlsOn(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("[aria-expanded][aria-controls]")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (!el.id) el.id = "ovc-" + out.length;
      out.push({ id: el.id, controls: el.getAttribute("aria-controls") });
    }
    return out;
  });
}

/* WHAT A FINGER ACTUALLY DOES BEFORE IT TAPS.

   Playwright's honest tap refuses when something else is on top of the target, which is the
   right rule and the reason this file exists. What it does NOT do is scroll further: if the
   element is already inside the viewport it is considered scrolled into view, even when it has
   landed under a fixed overlay, and it then retries the same blocked point until it times out.
   On an iPhone SE that is what happened -- the Mission Control toggle opened, the page settled
   with it 25px from the bottom of a 568px viewport, and the consent banner (322px tall, 57% of
   that screen) was over it. A person would flick the page and tap it where it is clear.

   So this does that first, and the FAILURE becomes the stronger statement: not "something was
   in the way once", but "there is no scroll position at which this control can be tapped".
   That is a real trap and this is where it is caught -- the same sweep found that the whole
   footer legal row had no reachable scroll position at all while the banner was up.

   `behavior:'instant'` is not decoration. The page sets `html{scroll-behavior:smooth}`, so a
   plain scrollTo animates and every rect read in the same turn is read mid-flight. */
const scrollClear = (page, id) =>
  page.evaluate((elId) => {
    const el = document.getElementById(elId);
    if (!el) return "the control is no longer in the document";
    const blocker = () => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 4 || r.top > window.innerHeight - 4) return "off screen";
      const cx = r.left + r.width / 2;
      const cy = Math.min(Math.max(r.top + r.height / 2, 2), window.innerHeight - 2);
      const top = document.elementFromPoint(cx, cy);
      if (!top || top === el || el.contains(top) || top.contains(el)) return null;
      let name = top.tagName.toLowerCase() + (top.id ? "#" + top.id : "");
      for (let p = top; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.position === "fixed" || cs.position === "sticky") {
          name = p.tagName.toLowerCase() + (p.id ? "#" + p.id : "");
        }
      }
      return name;
    };
    /* BRING IT INTO VIEW BEFORE SWEEPING AROUND IT, or the sweep is centred on wherever the
       previous control happened to leave the page. #mcStepsToggle sits about 1,400px down; the
       sweep reaches 820px either side of where it starts, so from the top of the page it never
       arrived, and reported "covered at every scroll position" about a control that is clear at
       scrollY 1342 with the banner's top edge 240px below it. The sweep is for finding a gap
       near the control, not for finding the control. */
    el.scrollIntoView({ block: "center", behavior: "instant" });
    let last = blocker();
    if (!last) return null;
    const start = window.scrollY;
    const step = Math.max(40, Math.round(window.innerHeight / 8));
    for (let i = 1; i <= 10; i++) {
      for (const sign of [-1, 1]) {
        window.scrollTo({ top: Math.max(0, start + sign * i * step), behavior: "instant" });
        const b = blocker();
        if (!b) return null;
        last = b;
      }
    }
    window.scrollTo({ top: start, behavior: "instant" });
    return last;
  }, id);

const inertAncestor = (page, id) =>
  page.evaluate((elId) => {
    const el = document.getElementById(elId);
    for (let n = el; n; n = n.parentElement) {
      if (n.hasAttribute && n.hasAttribute("inert")) return n.tagName.toLowerCase();
    }
    return null;
  }, id);

async function run(engineName, engine, deviceName, broken) {
  const failures = [];
  const b = await engine.launch();
  const ctx = await b.newContext({ ...devices[deviceName] });
  if (broken) {
    await ctx.route("**/app*.js", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      route.fulfill({ response: res, body: body.split(BREAK_FROM).join(BREAK_TO) });
    });
  }
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  const controls = await controlsOn(page);
  const where = `${engineName}/${deviceName}`;
  if (!controls.length) {
    failures.push(`${where}: found NO aria-expanded controls at all; this check measured nothing`);
  }

  for (const c of controls) {
    const loc = page.locator("#" + c.id);
    const blockedOpen = await scrollClear(page, c.id);
    if (blockedOpen && blockedOpen !== "off screen") {
      failures.push(
        `${where}: #${c.id} is covered by ${blockedOpen} at every scroll position, so there is ` +
          `no way to tap it at all`,
      );
      continue;
    }
    try {
      await loc.tap({ timeout: 4000 });                    // honest tap, no force
    } catch {
      failures.push(`${where}: #${c.id} could not be tapped to OPEN`);
      continue;
    }
    await page.waitForTimeout(300);
    const expanded = await loc.getAttribute("aria-expanded");
    if (expanded !== "true") continue;                     // did not open a disclosure; not ours

    const inert = await inertAncestor(page, c.id);
    if (inert) {
      failures.push(
        `${where}: #${c.id} is inside an inert <${inert}> while the thing it controls is open, ` +
          `so the control that closes it cannot be reached`,
      );
    }
    const blockedClose = await scrollClear(page, c.id);
    if (blockedClose && blockedClose !== "off screen") {
      failures.push(
        `${where}: #${c.id} is covered by ${blockedClose} at every scroll position while what it ` +
          `controls is open, so it can never be closed`,
      );
      continue;
    }
    try {
      await loc.tap({ timeout: 4000 });                    // honest tap again: it must CLOSE
    } catch {
      failures.push(`${where}: #${c.id} could not be tapped to CLOSE while open`);
      continue;
    }
    await page.waitForTimeout(300);
    if ((await loc.getAttribute("aria-expanded")) !== "false") {
      failures.push(`${where}: #${c.id} stayed expanded after a second tap`);
    }
  }
  await b.close();
  return failures;
}

let failures = [];
for (const [name, engine, dev] of TARGETS) failures = failures.concat(await run(name, engine, dev, false));

/* Prove the check can fail. A guard nobody has watched fail is a guard nobody has tested. */
const control = await run("webkit", webkit, "iPhone 14", true);
if (!control.length) {
  failures.push(
    "NEGATIVE CONTROL DID NOT FIRE: with the toggle removed from the keep-live set the check " +
      "still passed, so it is not measuring what it claims to measure",
  );
}

if (failures.length) {
  console.error("check-overlay-controls: FAIL");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(
  `check-overlay-controls: OK (${TARGETS.length} device/engine pairs, negative control fired with ` +
    `${control.length} finding(s))`,
);
