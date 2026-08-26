// A CONTROL THAT OPENS SOMETHING MUST ALSO CLOSE IT — including in Safari.
//
// WHY THIS EXISTS. Owner, 2026-08-21: "language select on mobile view does not collapse by
// tapping the language select button." Every guard in this folder passed, at every width, with a
// real touch gesture, because every one of them runs Chromium. In WebKit on an iPhone 14 and an
// iPhone SE the second tap left aria-expanded="true".
//
// The whole difference is one line of the event trace. Safari does not move focus to a <button>
// on tap, so tapping the button while the menu is open blurs the focused ROW to nothing:
//
//   Chrome/Android   pointerdown -> focusout: BUTTON[en] -> langButton   (relatedTarget is
//                    inside the menu, nothing closes) -> click -> CLOSE
//   Safari/iOS       pointerdown -> focusout: BUTTON[en] -> null         -> CLOSE
//                    -> click -> the toggle finds a closed menu -> OPEN
//
// Closed and reopened inside one gesture, so the reader sees a menu that will not close. This is
// the SECOND Safari-only defect on this surface -- the external audit's F-06 was the first -- and
// both were invisible to a Chromium-only test suite. So this one runs both engines.
//
// WHAT IT ASSERTS. The subject is computed, never typed: every visible element carrying
// `aria-expanded` is a disclosure control by its own declaration, and every one of them must
//
//   1. report itself collapsed to begin with,
//   2. report itself expanded after one activation, and
//   3. report itself collapsed again after a second — by the same gesture, in the same place.
//
// Each control is measured on a FRESH page, because opening the mobile menu makes everything
// behind it `inert` and a sweep that reused one page would be measuring the previous control's
// side effects.
//
// A control that declares itself unavailable (`aria-disabled="true"`) is skipped and counted:
// the report disclosure is refused while the instrument is still writing, which is deliberate,
// and is check-mission-pause.mjs's subject rather than this one's.
//
// Run: `node scripts/check-disclosure.mjs` (or `npm run test:disclosure`).
// Needs both engines: `npx playwright install chromium webkit`.
import { chromium, webkit, devices } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

/* ---------- the harness -------------------------------------------------- */
const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
});
let serverExit = null;
server.on("exit", (c, s) => { serverExit = s || `code ${c}`; });
const base = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60 && !serverExit; i++) {
  try { const r = await fetch(base + "/"); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 120));
}
if (serverExit) {
  console.error(`check-disclosure: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}
const done = () => {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
};

/* ---------- the subject, read out of the rendered page ------------------- */
// A stable handle for each control: its own id where it has one, otherwise a path of nth-child
// steps, so the same control can be found again on a freshly loaded page.
const CONTROLS = () => {
  const pathTo = (el) => {
    if (el.id) return "#" + CSS.escape(el.id);
    const steps = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const i = [...e.parentElement.children].indexOf(e) + 1;
      steps.unshift(`${e.tagName.toLowerCase()}:nth-child(${i})`);
    }
    return "body > " + steps.join(" > ");
  };
  return [...document.querySelectorAll("[aria-expanded]")]
    .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed")
    .map((el) => ({
      sel: pathTo(el),
      label: (el.getAttribute("aria-label") || el.textContent || el.id || el.tagName).trim().replace(/\s+/g, " ").slice(0, 34),
      state: el.getAttribute("aria-expanded"),
      disabled: el.getAttribute("aria-disabled") === "true",
    }));
};

/* ---------- measure ------------------------------------------------------ */
const VIEWS = [
  { engine: "webkit", device: "iPhone 14", touch: true },
  { engine: "webkit", device: null, size: { width: 1440, height: 900 }, touch: false },
  { engine: "chromium", device: "Pixel 7", touch: true },
  { engine: "chromium", device: null, size: { width: 1440, height: 900 }, touch: false },
];

let measured = 0, skipped = 0;
for (const view of VIEWS) {
  const type = view.engine === "webkit" ? webkit : chromium;
  let browser;
  try {
    browser = await type.launch();
  } catch (e) {
    // NOT a skip. A guard that quietly stops running is the failure mode this repo keeps
    // finding: it reads as coverage for as long as nobody looks. The Safari-only defect that
    // caused this file existed because nothing here had ever launched WebKit.
    fail.push(`${view.engine} could not be launched, so the contract was never checked in it: ` +
              `${String(e).split("\n")[0]}. Run \`npx playwright install ${view.engine}\`.`);
    continue;
  }
  const ctxOpts = view.device ? { ...devices[view.device] } : { viewport: view.size };
  const where = `${view.engine}/${view.device || `${view.size.width}x${view.size.height}`}`;

  // One pass to enumerate, then one fresh page per control.
  const ctx0 = await browser.newContext(ctxOpts);
  const p0 = await ctx0.newPage();
  await p0.goto(base + "/", { waitUntil: "load" });
  try { await p0.click("#consentReject", { timeout: 2500 }); } catch {}
  await p0.waitForTimeout(900);
  const controls = await p0.evaluate(CONTROLS);
  const consent = await ctx0.cookies();
  await ctx0.close();

  if (!controls.length) {
    fail.push(`[${where}] no element declares aria-expanded at all: the scan did not run, and an ` +
              `empty sweep must never read as a clean one.`);
    await browser.close();
    continue;
  }

  for (const c of controls) {
    const ctx = await browser.newContext(ctxOpts);
    await ctx.addCookies(consent);
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "load" });
    await page.waitForTimeout(800);
    const el = page.locator(c.sel).first();
    if (!(await el.count())) { await ctx.close(); continue; }

    // The report disclosure declares itself unavailable while the instrument is writing, which
    // is deliberate. Give it the time it asks for; if it is still refused, count it as skipped
    // rather than pretend it was tested.
    if (c.disabled) {
      await page.evaluate(() => document.querySelector(".mission")?.scrollIntoView({ block: "center" }));
      await page.mouse.move(0, 0);      // it also pauses under the pointer, deliberately
      try { await page.waitForSelector(`${c.sel}:not([aria-disabled="true"])`, { timeout: 20000 }); }
      catch { skipped++; await ctx.close(); continue; }
    }

    /* THE CONTRACT IS THE ROUND TRIP, NOT A PARTICULAR STARTING STATE.

       This used to require every disclosure to begin collapsed, and it failed Mission Control
       on the desktop for it. That control is SUPPOSED to begin expanded there: the step list is
       the instrument, and section 100 collapses it to a single live row only on a phone, where
       the panel would otherwise be 1100px tall. Demanding `false` everywhere was a rule written
       from one example -- the language menu -- and generalised without asking whether it was a
       property of disclosures or a property of that menu.

       What is genuinely required is weaker in one way and stronger in two:

         - the control must DECLARE a state, not omit it or invent a third one;
         - that declaration must MATCH what is on screen. `aria-expanded="true"` beside a hidden
           panel is a control lying about itself, which is worse than either state, and a rule
           that only ever looked for the string "false" could never see it;
         - and one activation must flip it, a second must flip it back -- to wherever it began.

       The Safari focusout/click race that this whole file exists for is caught by the round
       trip, which is what it always actually tested. */
    const start = await el.getAttribute("aria-expanded");
    if (start !== "false" && start !== "true") {
      fail.push(`[${where}] "${c.label}" declares aria-expanded="${start}", which is neither state.`);
      await ctx.close();
      continue;
    }
    /* HOW MUCH OF IT IS SHOWING, not whether it is display:none.

       The first version of this cross-check asked whether the controlled panel was rendered at
       all, and it called Mission Control a liar for saying "false" while its step list was on
       screen. It was not lying. Collapsed, that list still shows ONE row -- the step the agent is
       on -- because a phone needs a summary rather than a 1100px panel or a blank space. A
       disclosure does not have to disappear to be collapsed.

       So the truth of the declaration is measured instead of assumed: the panel is measured in
       both states, and the state that calls itself expanded has to be the bigger one. That holds
       for a menu that vanishes, for a list that collapses to a summary, and for anything else a
       disclosure might do -- and it still catches the thing worth catching, a control whose
       aria-expanded runs backwards or never moves. */
    const panelSize = () => page.evaluate((sel) => {
      const t = document.querySelector(sel);
      const id = t && t.getAttribute("aria-controls");
      const p = id && document.getElementById(id);
      if (!p) return null;                       /* nothing named: nothing to measure */
      const cs = getComputedStyle(p);
      if (cs.display === "none" || cs.visibility === "hidden" || p.hasAttribute("hidden")) return 0;
      const r = p.getBoundingClientRect();
      const rows = [...p.querySelectorAll("*")].filter((n) => {
        const s = getComputedStyle(n);
        return s.display !== "none" && s.visibility !== "hidden";
      }).length;
      return Math.round(r.width * r.height) + rows;
    }, c.sel);
    const sizeAtStart = await panelSize();
    // Activate, and report an interception rather than throwing on it: a full-screen overlay
    // legitimately covers the control that opened it.
    const act = async () => {
      try {
        if (view.touch) await el.tap({ timeout: 5000 }); else await el.click({ timeout: 5000 });
        await page.waitForTimeout(450);
        return null;
      } catch (e) { return String(e).split("\n")[0]; }
    };
    /* ONE RETRY, AND ONLY FOR A CONTROL THAT WENT UNAVAILABLE AGAIN.

       The report disclosure is re-disabled every time the instrument starts a new report --
       "A NEW REPORT IS A NEW DECISION", deliberately -- so a control that was available when the
       wait above cleared can be unavailable again by the time the press lands, and the press
       then times out on an actionability check rather than on anything being wrong. It failed
       exactly once, on a machine that was also running CI and two other browser sweeps, which is
       where a five-second window gets eaten.

       Wait for it to come back and try once more. A control still refusing after that is a
       finding. Anything failing for a different reason is reported on the first attempt, with no
       second one to muddy what it says. */
    let openErr = await act();
    if (openErr && /Timeout|not enabled|aria-disabled/i.test(openErr)) {
      const available = await page
        .waitForSelector(`${c.sel}:not([aria-disabled="true"])`, { timeout: 20000 })
        .then(() => true, () => false);
      if (available) {
        await page.mouse.move(0, 0);   // it also pauses under the pointer, deliberately
        openErr = await act();
      }
    }
    if (openErr) {
      fail.push(`[${where}] "${c.label}" (${c.sel}) could not be activated at all: ${openErr}`);
      await ctx.close();
      continue;
    }
    const opened = await el.getAttribute("aria-expanded");
    const sizeAtOpen = await panelSize();

    // THE CONTRACT IS "IT CLOSES AGAIN", NOT "THIS EXACT BUTTON CLOSES IT". The mobile menu is a
    // full-screen overlay that covers its own opener and puts everything behind it `inert`,
    // which is correct: it carries its own close control at the same corner, and that control is
    // what a reader reaches for. So when the second activation is intercepted, the thing doing
    // the intercepting is pressed instead -- and the disclosure must still end up collapsed.
    let closedBy = "the same control";
    let closeErr = await act();
    if (closeErr) {
      const cover = await page.evaluate((sel) => {
        const t = document.querySelector(sel);
        if (!t) return null;
        const r = t.getBoundingClientRect();
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!top || top === t || t.contains(top)) return null;
        const btn = top.closest("button,a,[role='button']") || top;
        return { id: btn.id, label: (btn.getAttribute("aria-label") || btn.textContent || btn.tagName).trim().slice(0, 30) };
      }, c.sel);
      if (cover && cover.id) {
        closeErr = null;
        closedBy = `"${cover.label}"`;
        try { const b = page.locator("#" + cover.id).first(); view.touch ? await b.tap() : await b.click(); await page.waitForTimeout(450); }
        catch (e) { closeErr = String(e).split("\n")[0]; }
        /* NOT EVERY INTERCEPTOR IS THE OVERLAY'S OWN CLOSE CONTROL, and the paragraph above only
           holds for the ones that are. On 2026-08-24 this reported the report disclosure as "did
           not come back" on a WebKit iPhone and named the Safari focusout race as the cause. The
           cause was the CONSENT BANNER: it is fixed to the bottom of a 664px screen, it lay over
           the toggle, the second tap was intercepted by it, and the guard pressed "Reject
           non-essential" and then asked whether the disclosure had collapsed. It could not have.
           Nothing had been pressed that could collapse it.
           So: if pressing the interceptor left the disclosure exactly where it was, it was not
           the control that closes this overlay. Dismissing it has cleared the way, so press the
           real one again and judge that. */
        if (!closeErr) {
          const still = await el.getAttribute("aria-expanded");
          if (still === opened) {
            const retry = await act();
            if (retry) closeErr = retry;
            else closedBy = `"${cover.label}", which changed nothing, then the control itself`;
          }
        }
      }
    }
    if (closeErr) {
      fail.push(`[${where}] "${c.label}" (${c.sel}) could not be closed: ${closeErr}`);
      await ctx.close();
      continue;
    }
    const closed = await el.getAttribute("aria-expanded");
    measured++;

    const flipped = start === "true" ? "false" : "true";
    if (opened !== flipped) {
      fail.push(`[${where}] "${c.label}" (${c.sel}) did not change state: it began "${start}" and is ` +
                `still "${opened}" after one ${view.touch ? "tap" : "click"}.`);
    } else if (closed !== start) {
      fail.push(`[${where}] "${c.label}" (${c.sel}) did not come back (pressed ${closedBy}): it began "${start}" and is "${closed}" ` +
                `after a second ${view.touch ? "tap" : "click"} on the control that changed it. ` +
                `TWO CAUSES ARE WORTH SEPARATING BEFORE EITHER IS BELIEVED. On Safari this is ` +
                `often the focusout/click race: the browser does not focus a button on tap, so ` +
                `anything focused inside the panel blurs with relatedTarget=null, a "focus has ` +
                `left" handler closes the panel during pointerdown, and the click that follows ` +
                `reopens it. But if the press was intercepted, look first at WHAT intercepted it: ` +
                `something unrelated lying over the control -- the consent banner has done this -- ` +
                `is not evidence of a race at all.`);
    } else if (sizeAtOpen !== null && sizeAtStart !== null && sizeAtOpen === sizeAtStart) {
      fail.push(`[${where}] "${c.label}" (${c.sel}) reports aria-expanded="${opened}" but the panel it ` +
                `names did not change at all, so the state it declares is not a state it is in.`);
    } else if (sizeAtOpen !== null && sizeAtStart !== null &&
               (start === "true") !== (sizeAtStart > sizeAtOpen)) {
      fail.push(`[${where}] "${c.label}" (${c.sel}) has aria-expanded backwards: it calls itself ` +
                `"${start}" while showing ${sizeAtStart} and "${opened}" while showing ${sizeAtOpen}.`);
    }
    /* AND NOT "IT CAME BACK TO THE SAME PIXELS". That rule was here for one run and it failed
       Mission Control, correctly measuring 12157 before and 12324 after -- because the instrument
       is RUNNING. It advances a step while the two taps happen, so the panel legitimately holds a
       different amount of content at the end than at the start. A live region is not a broken
       disclosure. What has to come back is the STATE, and that is asserted above. */
    await ctx.close();
  }
  await browser.close();
}

note(`${measured} disclosure control(s) opened and closed across ${VIEWS.length} engine/viewport pairs` +
     (skipped ? `, ${skipped} skipped while declaring themselves unavailable` : ""));
if (measured < 8) {
  fail.push(`only ${measured} control activations were measured across four engine/viewport pairs: too few to mean anything.`);
}

done();
if (fail.length) {
  for (const f of fail) console.error("FAIL: " + f);
  console.error(`\ncheck-disclosure: ${fail.length} finding(s).`);
  process.exit(1);
}
console.log("check-disclosure OK: every control that opens something closes it again — by tap and by click, in WebKit and in Chromium.");
