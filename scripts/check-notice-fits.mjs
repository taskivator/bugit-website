// A FIXED NOTICE MUST FIT THE SCREEN IT IS FIXED TO, IN EVERY STATE IT CAN REACH.
//
// WHY THIS EXISTS. Owner, 2026-09-03: "fix the coockie screen covering half the page and prove
// it working on mobile ... also make sure the coockie screen covering half the page is not
// happening on any other platform."
//
// Half the page was the half that had been measured. check-mobile-chrome's NOTICE rule reported
// the consent bar at 57% of an Android 360x640 and 54% of an iPhone SE, and it was right. But
// every rule anywhere in this repository measures that bar in the state it ARRIVES in and then
// presses a button to get rid of it, so the state a reader reaches by pressing "Manage
// preferences" had never been rendered by anything. MEASURED 2026-09-03, both engines:
//
//                              on arrival        opened
//     Android 360x640           362px  57%      869px  136%
//     iPhone SE 375x667         363px  54%      852px  128%
//     iPhone 750x340 sideways   109px  32%      782px  230%
//     Desktop 1280x800          211px  26%      621px   78%
//
// The bar is `position:fixed;bottom:0`, so past 100% it does not overflow downwards, it grows
// UPWARDS off the top of the screen -- and a fixed element cannot be scrolled to. At 136% the
// title, the explanation, the privacy-policy link and the first of the three toggles were above
// the top of the viewport with no gesture that could reach them. The reader was asked for a
// decision about text the page had put out of sight.
//
// WHAT IT ASSERTS, in both engines, at fifteen viewports from 320x568 to 1920x1080:
//
//   1. the notice is never above the top of the viewport, and never below its bottom,
//   2. on arrival it is at most half the screen -- the same line check-mobile-chrome draws,
//      so the two files cannot disagree about what "too big" means,
//   3. in any state it can be put into it is at most 85% of the screen,
//   4. every control inside it can be REACHED: scrolled into view within the notice, fully
//      inside the viewport, and a press at its centre lands on it (elementFromPoint, not a
//      guess about z-index),
//   5. the notice opens showing its beginning, so the reader sees what it is about before
//      they see the buttons that answer it,
//   6. the page reserves exactly the height the notice actually occupies, so the footer under
//      it stays reachable, and gives it back when the notice is dismissed.
//
// THE SUBJECT IS COMPUTED. Nothing here names #consentBanner, its buttons, or its classes: the
// notice is found by sweeping the DOM for a fixed, visible, page-blocking element that holds
// controls, and the states are found by pressing its own controls and keeping the ones that
// leave it on screen. A second notice, or a renamed one, is measured the day it ships. If no
// such element is found the run FAILS -- a sweep that quietly measures nothing reads exactly
// like a sweep that found nothing wrong.
//
// Run: `node scripts/check-notice-fits.mjs` (or `npm run test:notice-fits`).
import { chromium, webkit } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];

/* Two ends and the middle. The small end is where a notice eats the screen; the tall desktop
   end is where nobody looks, and a 1280x800 browser window dragged short is the same defect
   with none of the mobile styling. Landscape phones are here because a phone turned sideways
   is 340px tall, which is shorter than any desktop window anyone has. */
const VIEWPORTS = [
  ["320x568 small phone", 320, 568],
  ["360x640 Android floor", 360, 640],
  ["375x667 iPhone SE", 375, 667],
  ["390x844 iPhone", 390, 844],
  ["393x851 Android", 393, 851],
  ["412x915 Android", 412, 915],
  ["430x932 iPhone", 430, 932],
  ["750x340 phone sideways", 750, 340],
  ["863x360 phone sideways", 863, 360],
  ["932x430 phone sideways", 932, 430],
  ["834x1112 tablet", 834, 1112],
  ["1024x600 netbook", 1024, 600],
  ["1280x800 laptop", 1280, 800],
  ["1440x500 short window", 1440, 500],
  ["1920x1080 desktop", 1920, 1080],
];

/* ---------- the page under test ------------------------------------------ */
let base = process.env.BASE_URL || "";
let server = null;
if (!base) {
  const PORT = await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
  });
  server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  base = `http://127.0.0.1:${PORT}`;
  let up = false;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(base + "/"); if (r.ok) { up = true; break; } } catch {}
    await new Promise((r) => setTimeout(r, 120));
  }
  if (!up) {
    console.error("check-notice-fits: the dev server never answered.");
    process.exit(1);
  }
}
const done = (code) => { if (server) server.kill(); process.exit(code); };

/* ---------- finding the notice, and measuring it ------------------------- */
/* Returns null when the page has no page-blocking fixed notice at all, which is the state
   AFTER the reader answers it. The caller decides whether that is expected. */
const MEASURE = () => {
  const vis = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.01 &&
           r.width > 40 && r.height > 40;
  };
  /* A NOTICE IS A FIXED THING WITH CONTROLS ON IT. The header is fixed too and has controls,
     so it is separated by what makes a notice a notice: it spans the width of the screen and
     it is anchored to an edge the document does not scroll away from. Both are measured. */
  let notice = null;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") continue;
    if (!vis(el)) continue;
    if (!el.querySelector("button, a[href], input")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < window.innerWidth * 0.8) continue;
    if (r.height < window.innerHeight * 0.1) continue;
    if (!notice || r.height > notice.getBoundingClientRect().height) notice = el;
  }
  if (!notice) return null;

  const name = (el) => {
    const cls = typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const txt = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 22);
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + cls + (txt ? ' "' + txt + '"' : "");
  };
  const r = notice.getBoundingClientRect();
  const vh = window.innerHeight;

  /* THE READER MUST SEE THE BEGINNING. A notice whose scrollport opens part-way down shows
     the buttons and hides the sentence they answer.

     MEASURED FIRST, BEFORE ANYTHING BELOW SCROLLS. The reachability pass calls
     scrollIntoView on every control, which moves the notice's own scrollport; reading this
     afterwards reported "opens past its own beginning" on two sideways phones purely because
     the guard had just scrolled the notice itself. A check whose subject is moved by an
     earlier check in the same pass is measuring the guard, not the page. */
  const firstText = notice.querySelector("h1,h2,h3,h4,strong,b,p,span");
  let beginningVisible = true;
  if (firstText) {
    const fb = firstText.getBoundingClientRect();
    beginningVisible = fb.top >= r.top - 1 && fb.bottom <= vh + 1 && fb.top >= -1;
  }

  const reserved = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--consent-h")) || 0;

  /* EVERY CONTROL, REACHED. Not "is it on screen now" -- a notice is allowed to scroll inside
     itself, and the whole point of the fix this guards is that it does. So each control is
     first scrolled into view WITHIN the notice, and only then required to be inside the
     viewport and to answer a press at its own centre. A fixed element sitting above the top
     of the screen cannot be helped by any scroll, which is exactly the defect. */
  /* AND IT PUTS EVERYTHING BACK. scrollIntoView leaves the notice's scrollport where it
     scrolled it, and the next state measured on the same page inherits that -- which showed
     up as "opens past its own beginning" on three phones after Manage preferences, entirely
     because this loop had scrolled the notice before that press. A guard that leaves the page
     in a different state than it found it is writing its own next finding. */
  const scrollers = [notice, ...notice.querySelectorAll("*")]
    .map((el) => [el, el.scrollTop, el.scrollLeft])
    .filter(([el]) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
  const pageScroll = [window.scrollX, window.scrollY];

  const unreachable = [];
  for (const c of notice.querySelectorAll("button, a[href], input, select, [role=button]")) {
    if (!vis(c) && !(c.tagName === "INPUT" && c.offsetWidth > 0)) continue;
    if (c.disabled) continue;
    try { c.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) { /* ignore */ }
    const b = c.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    if (b.top < -1 || b.bottom > vh + 1 || b.left < -1 || b.right > window.innerWidth + 1) {
      unreachable.push({ el: name(c), why: `box [${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.width)},${Math.round(b.height)}] is outside the ${window.innerWidth}x${vh} viewport` });
      continue;
    }
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    if (!hit || !(hit === c || c.contains(hit) || hit.contains(c))) {
      unreachable.push({ el: name(c), why: `a press at its centre lands on ${hit ? name(hit) : "nothing"}` });
    }
  }
  for (const [el, top, left] of scrollers) { el.scrollTop = top; el.scrollLeft = left; }
  window.scrollTo(pageScroll[0], pageScroll[1]);

  return {
    el: name(notice),
    top: Math.round(r.top), bottom: Math.round(r.bottom),
    h: Math.round(r.height), vh, vw: window.innerWidth,
    pct: Math.round((r.height / vh) * 100),
    unreachable, beginningVisible, reserved: Math.round(reserved),
    buttons: [...notice.querySelectorAll("button")].filter((b) => vis(b)).map((b) => name(b)),
  };
};

const NO_NOTICE = () => {
  const r = document.documentElement.getBoundingClientRect;
  return { gone: true, reserved: Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--consent-h")) || 0) };
};

/* Press the notice's own Nth visible button. Returns whether the notice survived. */
const PRESS = (n) => {
  const vis = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.01 && r.width > 1 && r.height > 1;
  };
  let notice = null;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" || !vis(el)) continue;
    if (!el.querySelector("button")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < window.innerWidth * 0.8 || r.height < window.innerHeight * 0.1) continue;
    if (!notice || r.height > notice.getBoundingClientRect().height) notice = el;
  }
  if (!notice) return { pressed: false };
  const btns = [...notice.querySelectorAll("button")].filter(vis);
  if (!btns[n]) return { pressed: false };
  const label = (btns[n].textContent || "").trim().replace(/\s+/g, " ").slice(0, 26);
  btns[n].click();
  return { pressed: true, label };
};

/* ---------- the sweep ---------------------------------------------------- */
let cells = 0;
let noticesSeen = 0;
let statesSwept = 0;
/* Discovered once, on the first cell, then reused: the index of the notice's own control that
   OPENS it rather than answering it. Discovery is a press per button on a fresh page, which is
   too expensive to repeat thirty times; the property being guarded does not vary by engine. */
let expander = null;
let expanderLabel = "";

for (const eng of [{ n: "blink", b: chromium }, { n: "webkit", b: webkit }]) {
  const browser = await eng.b.launch();
  for (const [vname, w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      isMobile: w < 900, hasTouch: w < 900,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const at = `[${eng.n} ${vname}]`;

    const load = async () => {
      await page.goto(base + "/", { waitUntil: "load" });
      await page.waitForTimeout(320);
    };
    await load();
    cells++;

    const arrive = await page.evaluate(MEASURE);
    if (!arrive) {
      fail.push(`${at} no page-blocking notice was found on arrival, so nothing here was measured.`);
      await ctx.close();
      continue;
    }
    noticesSeen++;

    /* DISCOVER THE OPENING CONTROL ONCE. A press that leaves the notice on screen AND taller
       is a control that opens it; a press that removes it is a control that answers it. */
    if (expander === null) {
      for (let i = 0; i < arrive.buttons.length; i++) {
        await load();
        const p = await page.evaluate(PRESS, i);
        if (!p.pressed) continue;
        await page.waitForTimeout(300);
        const after = await page.evaluate(MEASURE);
        if (after && after.h > arrive.h + 20) { expander = i; expanderLabel = p.label; break; }
      }
      if (expander === null) expander = -1;
      await load();
    }

    const states = [["on arrival", arrive]];
    if (expander >= 0) {
      const p = await page.evaluate(PRESS, expander);
      if (p.pressed) {
        await page.waitForTimeout(320);
        const opened = await page.evaluate(MEASURE);
        if (!opened) {
          fail.push(`${at} pressing "${p.label}" removed the notice, but the same press opened it elsewhere.`);
        } else {
          states.push([`after "${p.label}"`, opened]);
        }
      }
    }

    for (const [state, m] of states) {
      statesSwept++;
      const where = `${at} ${m.el} ${state}`;
      /* 1. NEVER OFF THE TOP. This is the one that was 136%, and it is the sharp rule: a
            fixed notice that starts above the viewport has hidden text no gesture can reach. */
      if (m.top < -1) {
        fail.push(`${where} starts ${-m.top}px ABOVE the top of the ${m.vw}x${m.vh} viewport ` +
                  `(it is ${m.h}px tall, ${m.pct}% of the screen). It is fixed, so nothing the ` +
                  `reader does can bring that back into view.`);
      }
      if (m.bottom > m.vh + 1) {
        fail.push(`${where} ends ${m.bottom - m.vh}px below the bottom of the viewport.`);
      }
      /* 2 and 3. THE SHARE OF THE SCREEN. Half on arrival, the same line check-mobile-chrome
            draws; 85% once the reader has asked for the detail, which is a state they chose. */
      const cap = state === "on arrival" ? 50 : 85;
      if (m.pct > cap) {
        fail.push(`${where} covers ${m.pct}% of the screen (${m.h}px of ${m.vh}), over the ${cap}% ` +
                  `this state is allowed. A reader is looking mostly at a notice.`);
      }
      /* 4. EVERY CONTROL REACHABLE. */
      for (const u of m.unreachable.slice(0, 4)) {
        fail.push(`${where}: ${u.el} cannot be reached -- ${u.why}.`);
      }
      /* 5. THE BEGINNING IS ON SCREEN. */
      if (!m.beginningVisible) {
        fail.push(`${where} opens past its own beginning: the first thing it says is not on screen, ` +
                  `so the reader meets the buttons before the sentence they answer.`);
      }
      /* 6. THE PAGE RESERVES WHAT THE NOTICE OCCUPIES. */
      if (Math.abs(m.reserved - m.h) > 2) {
        fail.push(`${where} occupies ${m.h}px but the page reserves ${m.reserved}px for it, so the ` +
                  `${m.h - m.reserved}px difference of the document underneath it cannot be scrolled to.`);
      }
    }

    /* 6b. AND GIVES IT BACK. Answer the notice with its last control and require the reservation
          to return to zero -- a notice that is gone but still reserving pads the page forever. */
    const answered = await page.evaluate(PRESS, arrive.buttons.length - 1);
    if (answered.pressed) {
      await page.waitForTimeout(280);
      const after = await page.evaluate(MEASURE);
      const res = await page.evaluate(NO_NOTICE);
      if (after) {
        fail.push(`${at} pressing "${answered.label}" left the notice on screen (${after.h}px).`);
      } else if (res.reserved !== 0) {
        fail.push(`${at} the notice is dismissed but the page still reserves ${res.reserved}px for it.`);
      }
    }

    await ctx.close();
  }
  await browser.close();
}

/* ---------- the negative control ----------------------------------------- */
/* A GUARD THE PRODUCT CAN HEAL REPORTS THE FIX AS AN ABSENCE OF THE DEFECT. That happened the
   same hour this file was written: check-mobile-chrome's NOTICE control injected the bar's old
   flex COLUMN shape, and the new `max-height` ceiling clamped the injury, so the control stopped
   firing and said the rule "cannot see the thing it exists for". It could. The injury had been
   cured.

   So the injury here is the ceiling itself -- remove it and the scrollport, and what is left is
   the bar exactly as it measured 869px of a 640px phone. Two sizes and one engine: this proves
   the rules can still see, which does not need thirty renders. */
const INJURY =
  ".consent{max-height:none !important;display:block !important;" +
  "padding:18px 0 calc(18px + env(safe-area-inset-bottom)) !important}" +
  ".consent-inner{gap:14px !important;align-items:stretch !important}" +
  ".consent-scroll{overflow:visible !important;min-height:auto !important;display:block !important}" +
  ".consent-copy{max-height:none !important;overflow:visible !important}";

const ctl = await chromium.launch();
let fired = 0;
for (const [vname, w, h] of [["360x640 Android floor", 360, 640], ["375x667 iPhone SE", 375, 667]]) {
  const ctx = await ctl.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  await page.addStyleTag({ content: INJURY });
  await page.waitForTimeout(220);
  const a = await page.evaluate(MEASURE);
  if (a && a.pct > 50) fired++;
  if (expander >= 0) {
    await page.evaluate(PRESS, expander);
    await page.waitForTimeout(260);
    const m = await page.evaluate(MEASURE);
    if (m && (m.top < -1 || m.pct > 85)) fired++;
  }
  await ctx.close();
}
await ctl.close();
if (fired < 2) {
  fail.push(`NEGATIVE CONTROL DID NOT FIRE (${fired} of the expected rules saw the injected ` +
            `defect). With the ceiling removed the notice must measure over half the screen on ` +
            `arrival and must start above the top of it once opened. Seeing neither means these ` +
            `rules can no longer see what they exist for -- or that something else now clamps ` +
            `the bar and this injury has been healed rather than inflicted.`);
}

if (noticesSeen === 0) {
  console.error("FAIL: check-notice-fits found no page-blocking notice at any size, in either " +
                "engine. Either the consent banner has stopped appearing on a first visit -- " +
                "which is a consent defect, not a passing run -- or the way it is built no " +
                "longer matches what MEASURE looks for. Nothing was checked.");
  done(1);
}

if (fail.length) {
  console.error(`FAIL: ${fail.length} finding(s) across ${statesSwept} notice states.`);
  for (const f of fail) console.error("  " + f);
  done(1);
}

console.log(`OK check-notice-fits: ${statesSwept} notice states over ${cells} viewport renders ` +
            `(${VIEWPORTS.length} sizes x 2 engines)` +
            (expander >= 0 ? `, including the state behind "${expanderLabel}"` : ", arrival only") +
            `, plus a negative control on both rules. None taller than its screen, none above it, every control reachable.`);
done(0);
