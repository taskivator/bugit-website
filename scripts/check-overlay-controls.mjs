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

/* The SECOND negative control, for the second way this has now shipped: the close control was
   reachable and live, and the scroll lock carried it off the top of the screen. Removing the
   pin restores that build exactly. */
const CSS_BREAK_FROM = "body.menu-open header.nav.shell{position:fixed;top:0;left:0;right:0;z-index:90}";
const CSS_BREAK_TO = "/*NEGATIVE CONTROL: the header is no longer pinned while the menu is open.*/";

/* THE SECOND LINE OF DEFENCE, AND WHY THE CONTROL ABOVE HAD TO GROW.
   On 2026-08-23 the CSS negative control stopped firing, and the guard reported that about
   itself rather than passing quietly -- which is the only reason this was ever noticed. The
   mutation was still being applied and the string was still present; what had changed is that
   the product now HEALS the injury. `open()` checks the toggle can be reached and closes the
   overlay if it cannot, so un-pinning the header no longer strands the reader: the menu simply
   refuses to stay open. Measured, Pixel 7 at scrollY 900:

       shipped                          aria-expanded=true   toggle top 12     on screen
       header un-pinned                 aria-expanded=FALSE  page unlocked, nobody trapped
       header un-pinned + no self-close  aria-expanded=true   toggle top -888   off screen

   So the mutation must now remove BOTH, or it reproduces a build that never shipped and proves
   nothing. And the healing itself is a promise, so it is asserted below rather than assumed. */
const SELFCLOSE_FROM = "requestAnimationFrame(()=>{ if(isOpen()&&!canReach(toggle))close(); });";
const SELFCLOSE_TO = "/*NEGATIVE CONTROL: the overlay no longer closes itself when its control cannot be reached.*/";

/* A mutation that matches nothing is a negative control that cannot fail, and it dies in
   silence: `split(x).join(y)` on a string that has moved on returns the source untouched and
   the run goes green. Every rewrite below records whether it actually bit. */
const staleMutations = [];
const rewrite = (body, from, to, what) => {
  if (!body.includes(from)) { staleMutations.push(what); return body; }
  return body.split(from).join(to);
};

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
  if (broken === "js" || broken === true) {
    await ctx.route("**/app*.js", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      route.fulfill({ response: res, body: rewrite(body, BREAK_FROM, BREAK_TO, "the keep-live set") });
    });
  }
  /* "css" is the shipped build of the second defect, and "css-only" is the build we ship TODAY:
     the header un-pinned with the self-close still in place. The first must strand the reader,
     the second must not. */
  if (broken === "css" || broken === "css-only") {
    await ctx.route("**/styles*.css", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      route.fulfill({ response: res, body: rewrite(body, CSS_BREAK_FROM, CSS_BREAK_TO, "the header pin") });
    });
  }
  if (broken === "css") {
    await ctx.route("**/app*.js", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      route.fulfill({ response: res, body: rewrite(body, SELFCLOSE_FROM, SELFCLOSE_TO, "the self-close") });
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

  /* WHERE THE READER HAD GOT TO BEFORE THEY OPENED IT.
     Every pass this file ever made opened its controls from the top of the page, and the mobile
     menu's close button only goes missing when the page has been SCROLLED: the overlay locks
     the body with `position:fixed;top:-<scrollY>`, and a sticky header then renders at its
     document offset, which that negative top has just moved off the screen. Measured 400px down
     on 2026-08-23: the toggle's rect was top -388 with the menu open, and the page frozen behind
     it. So each control is exercised twice, and the second time from part-way down. */
  for (const c of controls) {
   for (const from of ["top", "scrolled"]) {
    const loc = page.locator("#" + c.id);
    /* ONLY A CONTROL THAT TRAVELS WITH THE VIEWPORT CAN BE OPENED FROM ANYWHERE.
       The hamburger lives in a sticky header, so a reader meets it at any scroll position; the
       Mission Control disclosure sits in the page flow 1,400px down and can only ever be pressed
       where it is. Testing the second one "from a scroll position" would be testing this file's
       ability to scroll, and the sweep below already does that job properly. */
    if (from === "scrolled") {
      const travels = await page.evaluate((elId) => {
        for (let n = document.getElementById(elId); n; n = n.parentElement) {
          const pos = getComputedStyle(n).position;
          if (pos === "sticky" || pos === "fixed") return true;
        }
        return false;
      }, c.id);
      if (!travels) continue;
      await page.evaluate(() => {
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: Math.min(900, max), behavior: "instant" });
      });
      await page.waitForTimeout(200);
    } else {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(150);
    }
    const startedAt = await page.evaluate(() => Math.round(window.scrollY));
    if (from === "scrolled" && startedAt === 0) continue;   // nothing to scroll on this page
    const at = `opened at scrollY ${startedAt}`;
    /* NO SWEEP ON THE SCROLLED PASS. `scrollClear` begins with `scrollIntoView({block:"center"})`,
       and on a sticky control that resolves to its natural document position -- the top of the
       page. It therefore undid the very scroll this pass exists to create, and the scrolled case
       became a silent second copy of the top case: run against the build that shipped this bug it
       reported the missing close button as perfectly reachable. */
    if (from === "top") {
      const blockedOpen = await scrollClear(page, c.id);
      if (blockedOpen && blockedOpen !== "off screen") {
        failures.push(
          `${where}: #${c.id} is covered by ${blockedOpen} at every scroll position, so there is ` +
            `no way to tap it at all`,
        );
        continue;
      }
    }
    /* AFTER the sweep, not before it: `scrollClear` moves the page around looking for a gap and
       does not always put it back, so a reading taken earlier is about a position the reader was
       never at. */
    /* And after Playwright's own pre-tap scroll, which is the other thing that moves the page
       between a reading and a press: `tap()` brings its target into view first, so a position
       read before that is not the one the product will save. */
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const beforeOpen = await page.evaluate(() => Math.round(window.scrollY));
    try {
      await loc.tap({ timeout: 4000 });                    // honest tap, no force
    } catch {
      failures.push(`${where}: #${c.id} could not be tapped to OPEN (${at})`);
      continue;
    }
    await page.waitForTimeout(300);
    /* Only a control that LOCKS the page promises to give the reader their place back. The
       language and disclosure controls do not lock anything, and asserting restoration for them
       would be asserting a promise nobody made. */
    const locked = await page.evaluate(() => getComputedStyle(document.body).position === "fixed");
    const expanded = await loc.getAttribute("aria-expanded");
    if (expanded !== "true") continue;                     // did not open a disclosure; not ours

    const inert = await inertAncestor(page, c.id);
    if (inert) {
      failures.push(
        `${where}: #${c.id} is inside an inert <${inert}> while the thing it controls is open, ` +
          `so the control that closes it cannot be reached`,
      );
    }
    /* WHILE THE PAGE IS LOCKED, DO NOT SWEEP: THE SWEEP IS WHAT HIDES THE DEFECT.
       `scrollClear` starts with `scrollIntoView`, and a locked page still answers that -- the
       body is fixed, so a finger cannot scroll, but a script scrolling the documentElement moves
       the view anyway and drags the missing control back onto the screen. Run against the build
       that shipped this bug, the sweep reported the close button perfectly reachable while its
       rect was 888px above the viewport. An instrument that can move its own subject cannot be
       used on it, so when the overlay has locked the page the control is read WHERE IT IS. */
    const blockedClose = locked
      ? await page.evaluate((elId) => {
          const el = document.getElementById(elId);
          if (!el) return "the control is no longer in the document";
          const r = el.getBoundingClientRect();
          /* WHOLLY inside the viewport, not merely touching it. With the header unpinned and the
             reader 34px down, the toggle sat at top -22 with 24 of its 46 pixels showing: a
             clipped target on a page that cannot be scrolled, which is not something to pass.
             The exact scroll position cannot be dictated here -- Playwright's own tap scrolls
             before it presses, differently per engine -- so the assertion is about the state the
             reader is left IN rather than the number they got there by. */
          if (r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth) {
            return `off screen (rect top ${Math.round(r.top)}, bottom ${Math.round(r.bottom)}, ` +
                   `viewport ${window.innerHeight})`;
          }
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!top || top === el || el.contains(top) || top.contains(el)) return null;
          return top.tagName.toLowerCase() + (top.id ? "#" + top.id : "");
        }, c.id)
      : await scrollClear(page, c.id);
    /* "OFF SCREEN" IS A FAILURE ON THIS SIDE, AND IT USED TO BE AN EXEMPTION.
       Before opening, a control that is off screen is ordinary: the sweep scrolls to it. While
       what it controls is OPEN the page is scroll-locked, so nothing can bring it back, and this
       line is the exact spot where the shipped defect passed. */
    if (String(blockedClose).startsWith("off screen")) {
      failures.push(
        `${where}: #${c.id} is ${blockedClose} while what it controls is open (${at}), and the ` +
          `page is locked, so there is no way to close it but a reload`,
      );
      continue;
    }
    if (blockedClose) {
      failures.push(
        `${where}: #${c.id} is covered by ${blockedClose} at every scroll position while what it ` +
          `controls is open (${at}), so it can never be closed`,
      );
      continue;
    }
    try {
      await loc.tap({ timeout: 4000 });                    // honest tap again: it must CLOSE
    } catch {
      failures.push(`${where}: #${c.id} could not be tapped to CLOSE while open (${at})`);
      continue;
    }
    await page.waitForTimeout(300);
    if ((await loc.getAttribute("aria-expanded")) !== "false") {
      failures.push(`${where}: #${c.id} stayed expanded after a second tap (${at})`);
    }
    /* NOT ASSERTED HERE: that the reader gets their exact place back.
       It is a real property and it holds -- measured on 2026-08-23 at three device sizes in both
       engines, scrolled 400, 800 and 1500px, restored to the pixel. But it cannot be measured
       from inside THIS file, because this file scrolls the page itself: `scrollClear` sweeps for
       a gap before each tap and does not always put the page back, and Playwright's own tap
       brings its target into view first. Both happen between the reading and the press, so the
       number this check would compare against is a position the reader was never at -- it
       produced five confident failures about a restore that works. A measurement whose subject
       is disturbed by the instrument belongs in a harness that holds the page still, and
       `locked` above records the state that promise depends on. */
   }
  }
  await b.close();
  return failures;
}

let failures = [];
for (const [name, engine, dev] of TARGETS) failures = failures.concat(await run(name, engine, dev, false));

/* Prove the check can fail, once per way it has actually failed in production. A guard nobody
   has watched fail is a guard nobody has tested, and this one passed a shipped defect because it
   had never been red for THIS reason. */
const control = await run("webkit", webkit, "iPhone 14", "js");
if (!control.length) {
  failures.push(
    "NEGATIVE CONTROL DID NOT FIRE: with the toggle removed from the keep-live set the check " +
      "still passed, so it is not measuring what it claims to measure",
  );
}
const cssControl = await run("chromium", chromium, "Pixel 7", "css");
if (!cssControl.length) {
  failures.push(
    "NEGATIVE CONTROL DID NOT FIRE: with the header un-pinned AND the overlay's self-close " +
      "removed the close button goes off the top of a scrolled page, and this check still passed",
  );
}

/* THE HEALING IS A PROMISE, SO IT IS MEASURED.
   The negative control above removes the self-close in order to reproduce the old build. That
   leaves the self-close itself unasserted, and an unasserted behaviour is one that can be
   deleted next month without anything going red -- at which point the guard would keep passing
   and the reader would be trapped again. So the same injury is inflicted WITHOUT removing it,
   and the product is required to do the one thing that keeps a reader free: never hold an
   overlay open around a control they cannot reach, and hand the page back when it lets go. */
async function selfCloseHolds(engineName, engine, deviceName) {
  const found = [];
  const b = await engine.launch();
  const ctx = await b.newContext({ ...devices[deviceName] });
  await ctx.route("**/styles*.css", async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    route.fulfill({ response: res, body: rewrite(body, CSS_BREAK_FROM, CSS_BREAK_TO, "the header pin") });
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  try { await page.evaluate(() => document.getElementById("consentReject")?.click()); } catch {}
  await page.waitForTimeout(150);
  const where = `${engineName}/${deviceName}`;
  for (const c of await controlsOn(page)) {
    const loc = page.locator("#" + c.id);
    await page.evaluate(() => {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.min(900, max), behavior: "instant" });
    });
    await page.waitForTimeout(200);
    if ((await page.evaluate(() => Math.round(window.scrollY))) === 0) continue;
    try { await loc.tap({ timeout: 4000 }); } catch { continue; }
    await page.waitForTimeout(400);
    const st = await page.evaluate((elId) => {
      const el = document.getElementById(elId);
      const r = el.getBoundingClientRect();
      return {
        expanded: el.getAttribute("aria-expanded") === "true",
        reachable: r.top >= -1 && r.bottom <= window.innerHeight + 1 &&
                   r.left >= -1 && r.right <= window.innerWidth + 1,
        locked: getComputedStyle(document.body).position === "fixed",
        top: Math.round(r.top),
      };
    }, c.id);
    if (st.expanded && !st.reachable) {
      found.push(
        `${where}: with the header un-pinned, #${c.id} stayed OPEN around a control at top ` +
          `${st.top}, off the screen of a locked page -- the overlay must close itself instead`,
      );
    }
    if (!st.expanded && st.locked) {
      found.push(`${where}: #${c.id} closed itself but left the page still scroll-locked`);
    }
  }
  await b.close();
  return found;
}
for (const [name, engine, dev] of [["chromium", chromium, "Pixel 7"], ["webkit", webkit, "iPhone SE"]]) {
  failures = failures.concat(await selfCloseHolds(name, engine, dev));
}

/* A mutation that no longer matches its source rewrites nothing and the control goes green for
   the wrong reason. Reported by name, because "the negative control did not fire" and "the
   negative control was never applied" are different faults with different fixes. */
if (staleMutations.length) {
  for (const m of [...new Set(staleMutations)]) {
    failures.push(
      `NEGATIVE CONTROL NEVER APPLIED: this file's copy of ${m} no longer appears in the source ` +
        `it rewrites, so that mutation changed nothing and proved nothing`,
    );
  }
}

if (failures.length) {
  console.error("check-overlay-controls: FAIL");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(
  `check-overlay-controls: OK (${TARGETS.length} device/engine pairs x {top, scrolled}; ` +
    `negative controls fired with ${control.length} and ${cssControl.length} finding(s); ` +
    `and with the header un-pinned the overlay closes itself rather than trap the reader)`,
);
