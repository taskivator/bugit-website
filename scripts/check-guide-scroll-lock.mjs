// THE PAGE BEHIND THE GUIDE DOES NOT MOVE, AND THE MARK IS NOT WEARING A PLATE.
//
// WHY THIS EXISTS. The owner reported it from an iPhone on 2026-09-21: with the Guide open,
// swiping up and down scrolled the marketing page BEHIND the panel. At 560px and below the panel
// is `inset:auto 0 0 0` at `calc(100dvh - 10px)`, so the page being scrolled is one the reader
// cannot even see moving.
//
// WHY THE EXISTING DEFENCE COULD NOT HAVE CAUGHT IT. `.bgd-scroll` carries
// `overscroll-behavior:contain`, and that governs what happens when THAT element is scrolled to
// its end. A touch that starts on the header, on the composer, or on the panel's own padding is
// not inside the scroller at all, so the scroller's policy never applies to it. The fix is a body
// lock, the same one app.js already uses for the mobile menu.
//
// WHY THIS IS A RENDERED CHECK AND NOT A SOURCE SCAN. Both of the owner's reports tonight were
// invisible in the source and obvious on screen. The Ask bar mark declared 54px and rendered 44,
// because a global `img{max-width:100%}` further down the cascade clamped it. Reading the
// stylesheet would have confirmed the rule and missed the bug. So every number here is measured
// from a real layout.
//
// WHAT IT ASSERTS:
//   1. before the Guide opens, the page really does scroll -- otherwise every assertion below
//      passes against a page that was never going anywhere
//   2. with the Guide open at phone width, a scroll leaves the page behind exactly where it was
//   3. closing the Guide puts the reader back on the same pixel they left
//   4. at desktop width the page is deliberately NOT frozen, because there the Guide is a 452px
//      card over a page the reader can still see and may want to scroll
//   5. neither mark wears a background plate, and both render at the size their rule asks for
//   6. neither mark is clipped by the control that holds it
//
// NEGATIVE CONTROL. The lock is removed from guide.js at the wire, by rewriting the response, and
// assertion 2 must then fail. Without that, a green result here is equally consistent with a
// probe that cannot see scrolling at all.
//
// SCOPE, STATED HONESTLY. This is Playwright's WebKit at iPhone dimensions on Windows. It is the
// same engine family as iOS Safari and it is not iOS Safari; it cannot reproduce rubber-banding
// or the software keyboard. It proves the mechanism holds, not that the device is happy. The
// owner checking a phone after deploy is still the last word.
//
// Run: node scripts/check-guide-scroll-lock.mjs
import { chromium, webkit } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PORT = await new Promise((res, rej) => {
  const p = net.createServer();
  p.on("error", rej);
  p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); });
});
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}/`;
await new Promise((r) => setTimeout(r, 900));

const failures = [];
const check = (where, name, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} [${where}] ${name}${detail ? `  -- ${detail}` : ""}`);
  if (!ok) failures.push(`[${where}] ${name}${detail ? `: ${detail}` : ""}`);
};

/** A reference the reader can see. Its distance from the top of the viewport IS the page's
 *  scroll position, and unlike window.scrollY it keeps meaning something when the body is
 *  pinned with position:fixed, which collapses scrollY to 0 and would make a naive probe pass. */
async function markerTop(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".hero-title") || document.querySelector("h1") || document.body.firstElementChild;
    return Math.round(el.getBoundingClientRect().top);
  });
}

async function tryToScroll(page, by = 420) {
  // Both routes a reader has: the wheel/trackpad and the scripted one a swipe ends up driving.
  await page.mouse.wheel(0, by).catch(() => {});
  await page.evaluate((d) => window.scrollBy(0, d), by);
  await settle(page);
}

/* WAIT FOR THE SCROLL TO STOP MOVING BEFORE READING IT.
 * styles.css sets `html{scroll-behavior:smooth}`, so a scroll is an animation, not a jump. The
 * first version of this probe read the position 250ms in and got 409 where the page came to rest
 * at 420, then reported the product as restoring to the wrong pixel. WebKit only: Chromium
 * happened to settle inside the fixed wait, which is exactly how a racy probe stays plausible.
 * So: poll until the number stops changing, rather than guessing a duration. */
async function settle(page) {
  // A GRACE PERIOD FIRST, and this is the second bug in this one helper. Without it the loop
  // below reads 0, reads 0 again because the smooth animation has not started yet, calls that
  // "settled" and returns before the page has moved at all -- which is how the probe then
  // reported that the page does not scroll on a page that scrolls fine. Stability is only
  // evidence once the thing has had a chance to become unstable.
  await page.waitForTimeout(350);
  let last = null;
  let same = 0;
  for (let i = 0; i < 60; i += 1) {
    const y = await page.evaluate(() => Math.round(window.scrollY || window.pageYOffset || 0));
    same = y === last ? same + 1 : 0;
    if (same >= 2) return y;          // three identical samples in a row
    last = y;
    await page.waitForTimeout(50);
  }
  return last;
}

/* Opened by the LAUNCHER, not by the hero Ask bar, and that is load bearing.
 * Playwright scrolls an element into view before tapping it. The Ask bar lives at the top of the
 * page, so tapping it silently returned the page to 0 and the lock then recorded 0 as the
 * position to restore -- the probe's own action destroying the state it was about to measure.
 * `.bgd-launch` is position:fixed, so reaching it moves nothing. */
async function openGuide(page, touch) {
  if (touch) await page.tap(".bgd-launch"); else await page.click(".bgd-launch");
  await page.waitForSelector("#bgd-panel", { state: "visible", timeout: 15000 });
  await page.waitForTimeout(400);
  // WAIT FOR THE OPENING ANIMATION TO END, not for a guess at how long it takes. The panel rises in
  // with `bgd-rise`, from scale(.965): measured mid-animation, the 42px header box reads 41 and its
  // 52px mark reads 50. The fixed 400ms above was enough on this machine and not on GitHub's slower
  // Linux runner, which failed "the header mark renders at 52px -- measured 50x50 inside a 41x41
  // box" on c554eec while the site itself was correct (full-project review, 2026-09-23). Infinite
  // animations (the orbit, the pulse, the caret) never finish and are ignored, and so is anything
  // outside the panel: the marketing page has animations of its own that are not what is measured.
  await page.waitForFunction(
    () => {
      const panel = document.querySelector("#bgd-panel");
      return document.getAnimations().every((a) => {
        const target = a.effect && a.effect.target;
        if (!panel || !target || !(target === panel || panel.contains(target))) return true;
        const iterations = a.effect.getTiming ? a.effect.getTiming().iterations : 1;
        return iterations === Infinity || a.playState !== "running";
      });
    },
    null,
    { timeout: 10000 },
  );
}

/** One run. `breakLock` strips the body lock out of guide.js on the way to the browser, which is
 *  how the negative control is produced without editing a tracked file. */
async function run({ engineName, engine, viewport, touch, where, expectFrozen, breakLock = false, measureMarks = false }) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 3 : 1 });
  const page = await ctx.newPage();

  let mutated = false;
  if (breakLock) {
    // The Guide's code is content-hashed from 2026-09-21, so this pattern must not name the
    // unhashed file. If it ever stops matching, the `mutated` flag below fails the run loudly
    // rather than letting a control that applied nothing report success.
    await page.route("**/public/guide/guide*.js", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      const cut = body.replace(/document\.body\.classList\.add\("bgd-locked"\);/g, "/* removed by the negative control */");
      mutated = cut !== body;
      await route.fulfill({ response: res, body: cut, headers: { ...res.headers(), "content-type": "application/javascript" } });
    });
  }

  await page.goto(base, { waitUntil: "load" });
  await page.evaluate(() => document.getElementById("consentBanner")?.remove());
  await page.waitForTimeout(300);

  if (breakLock && !mutated) {
    check(where, "NEGATIVE CONTROL was actually applied", false,
          "guide.js did not contain the line this control removes, so it proved nothing. Update the control with the code.");
    await browser.close();
    return;
  }

  // ---- 1. the page really scrolls before anything is open ----------------------
  const rest = await markerTop(page);
  await tryToScroll(page, 420);
  const scrolled = await markerTop(page);
  check(where, "the page scrolls at all before the Guide is open", Math.abs(scrolled - rest) > 50,
        `marker ${rest} -> ${scrolled}`);
  const beforeOpen = await page.evaluate(() => Math.round(window.scrollY || window.pageYOffset || 0));

  // ---- 2. with the Guide open, the page behind stays put -----------------------
  await openGuide(page, touch);
  const atOpen = await markerTop(page);
  await tryToScroll(page, 500);
  const afterScroll = await markerTop(page);
  const moved = Math.abs(afterScroll - atOpen);

  if (expectFrozen) {
    check(where, "the page behind does not move while the Guide is open", moved <= 2,
          `marker ${atOpen} -> ${afterScroll} (moved ${moved}px)`);
    const locked = await page.evaluate(() => ({
      cls: document.body.classList.contains("bgd-locked"),
      pos: getComputedStyle(document.body).position,
      top: document.body.style.top,
    }));
    check(where, "the body carries the lock", locked.cls && locked.pos === "fixed",
          `class=${locked.cls} position=${locked.pos} top=${locked.top || "(none)"}`);
  } else {
    check(where, "the page is deliberately NOT frozen on desktop", moved > 50,
          `marker ${atOpen} -> ${afterScroll} (moved ${moved}px)`);
  }

  // ---- 5 and 6. the marks, WHILE THE PANEL IS STILL OPEN ------------------------
  // Measured before the close, not after: the header mark lives inside the panel, and a hidden
  // element measures 0x0 -- which is the same shape of mistake as a hidden element scoring a
  // perfect fit. The first run of this probe reported "measured 0x0" for exactly that reason.
  if (measureMarks) {
    const marks = await page.evaluate(() => {
      const read = (boxSel, svgSel) => {
        const box = document.querySelector(boxSel);
        const svg = box && box.querySelector(svgSel);
        if (!box || !svg) return null;
        const cs = getComputedStyle(box);
        const b = box.getBoundingClientRect();
        const s = svg.getBoundingClientRect();
        return {
          bg: cs.backgroundColor, bgImg: cs.backgroundImage, border: cs.borderTopWidth,
          w: Math.round(s.width), h: Math.round(s.height),
          boxW: Math.round(b.width), boxH: Math.round(b.height),
          // Is the mark inside the control that holds it, or hanging off one edge? A grid item
          // larger than its track resolves centring to the START edge, which is how the hero
          // mark ended up clipped, so this is measured rather than assumed.
          offCentreX: Math.round(Math.abs((s.left + s.right) / 2 - (b.left + b.right) / 2)),
          offCentreY: Math.round(Math.abs((s.top + s.bottom) / 2 - (b.top + b.bottom) / 2)),
        };
      };
      // The launcher is hidden while the panel is open, so reopen state does not matter here:
      // both are measured from the DOM with the panel shown.
      return { launcher: read(".bgd-launch-avatar", "svg"), header: read(".bgd-avatar", "svg") };
    });

    for (const [name, m] of Object.entries(marks)) {
      if (!m) { check(where, `the ${name} mark is present`, false, "not found in the DOM"); continue; }
      const plain = (m.bg === "rgba(0, 0, 0, 0)" || m.bg === "transparent") && m.bgImg === "none" && parseFloat(m.border) === 0;
      check(where, `the ${name} mark has no plate behind it`, plain,
            `background-color=${m.bg} background-image=${m.bgImg === "none" ? "none" : "(painted)"} border=${m.border}`);
      const wanted = name === "launcher" ? 54 : 52;
      check(where, `the ${name} mark renders at ${wanted}px`, Math.abs(m.w - wanted) <= 1 && Math.abs(m.h - wanted) <= 1,
            `measured ${m.w}x${m.h} inside a ${m.boxW}x${m.boxH} box`);
      check(where, `the ${name} mark is centred in its box, not anchored to one edge`,
            m.offCentreX <= 1 && m.offCentreY <= 1,
            `off centre by ${m.offCentreX}px x ${m.offCentreY}px`);
    }
  }

  // ---- 7. no dead band under the composer ---------------------------------------
  // The owner photographed a band of empty space between the disclaimer and the bottom of the
  // panel on Chrome for iOS. THIS CANNOT REPRODUCE THAT BUG, and saying so is the point: the
  // cause was a CSS reservation of `(100lvh - 100dvh)`, and in a Playwright viewport there is no
  // collapsing browser chrome, so that expression is 0 and the gap never appears. What this DOES
  // catch is the same band arriving from any source a headless viewport can see, which is the
  // regression the fix could plausibly introduce. The device remains the only witness for the
  // original report.
  if (expectFrozen) {
    const band = await page.evaluate(() => {
      const foot = document.querySelector('.bgd-foot');
      const panel = document.querySelector('#bgd-panel');
      if (!foot || !panel) return null;
      const last = foot.lastElementChild || foot;
      return {
        gap: Math.round(panel.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom),
        pad: getComputedStyle(foot).paddingBottom,
      };
    });
    if (!band) check(where, 'the Guide footer is present', false, 'not found');
    else check(where, 'no dead band between the last footer row and the panel edge', band.gap <= 40,
               `gap ${band.gap}px, padding-bottom ${band.pad}`);
  }

  // ---- 3. closing puts the reader back on the same pixel -----------------------
  // Only where a lock was actually taken. On desktop nothing is frozen by design, so the page is
  // wherever the reader scrolled it to and there is nothing to restore.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  if (expectFrozen) {
    const afterClose = await page.evaluate(() => Math.round(window.scrollY || window.pageYOffset || 0));
    check(where, "closing the Guide restores the exact scroll position", Math.abs(afterClose - beforeOpen) <= 2,
          `${beforeOpen} -> ${afterClose}`);
  }

  // ---- 8. a reload gives the reader their page back -----------------------------
  // Reported by the owner on 2026-09-21: refreshing with the Guide open left it open. It was
  // deliberate -- an `open` flag in sessionStorage -- and it reads as the widget refusing to go
  // away, which on a phone means the reader's own reload does not return their page. The
  // CONVERSATION is still kept, and that half is asserted too: dropping the panel is only
  // acceptable if nothing the reader typed is lost with it.
  await openGuide(page, touch);
  await page.evaluate(() => {
    // Put a turn in the store so the reload has something to preserve.
    try {
      const k = Object.keys(sessionStorage).find((n) => /guide/i.test(n));
      if (!k) return;
      const d = JSON.parse(sessionStorage.getItem(k) || '{}');
      d.turns = [{ role: 'user', text: 'a question from before the reload' }];
      // Written DELIBERATELY. The old build persisted this flag and reopened on it, so seeding
      // it here makes the assertion below prove the flag is IGNORED rather than merely absent:
      // a check that passes because nothing wrote the field would pass on a broken build too.
      d.open = true;
      sessionStorage.setItem(k, JSON.stringify(d));
    } catch (e) {}
  });
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.getElementById('consentBanner')?.remove());
  await page.waitForTimeout(700);
  const afterReload = await page.evaluate(() => {
    const panel = document.querySelector('#bgd-panel');
    let kept = false;
    try {
      const k = Object.keys(sessionStorage).find((n) => /guide/i.test(n));
      const d = k ? JSON.parse(sessionStorage.getItem(k) || '{}') : {};
      kept = Array.isArray(d.turns) && d.turns.length > 0;
    } catch (e) {}
    return { open: !!panel && !panel.hidden, kept, locked: document.body.classList.contains('bgd-locked') };
  });
  check(where, 'a reload leaves the Guide closed', !afterReload.open,
        afterReload.open ? 'the panel reopened itself' : 'panel hidden');
  check(where, 'the page is not left frozen after that reload', !afterReload.locked,
        `body.bgd-locked=${afterReload.locked}`);
  check(where, 'the conversation survives the reload', afterReload.kept,
        afterReload.kept ? 'turns restored' : 'the stored turns were lost with the panel');

  await browser.close();
}

const IPHONE = { width: 390, height: 664 };
const DESKTOP = { width: 1280, height: 900 };

await run({ engineName: "webkit", engine: webkit, viewport: IPHONE, touch: true,
            where: "webkit/iPhone 390x664", expectFrozen: true, measureMarks: true });
await run({ engineName: "chromium", engine: chromium, viewport: IPHONE, touch: true,
            where: "chromium/phone 390x664", expectFrozen: true });
await run({ engineName: "chromium", engine: chromium, viewport: DESKTOP, touch: false,
            where: "chromium/desktop 1280x900", expectFrozen: false, measureMarks: true });

// ---- the negative control ------------------------------------------------------
console.log("\n  -- negative control: the same phone run, with the body lock removed at the wire --");
const before = failures.length;
await run({ engineName: "webkit", engine: webkit, viewport: IPHONE, touch: true,
            where: "NEGATIVE CONTROL webkit/iPhone", expectFrozen: true, breakLock: true });
const controlFired = failures.length > before;
console.log(`  ${controlFired ? "ok  " : "FAIL"} [control] removing the lock makes this check fail`);
if (!controlFired) {
  failures.push("[control] the probe passed with the body lock REMOVED, so it is not measuring the lock");
} else {
  // The control's own failures are expected; they are not defects in the product.
  failures.length = before;
}

server.kill();

if (failures.length) {
  console.error(`\ncheck-guide-scroll-lock FAILED\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log("\ncheck-guide-scroll-lock OK: the page behind the Guide holds still on a phone, the reader is put back where they left, desktop is deliberately untouched, and both marks render unplated at their declared size -- proven by removing the lock and watching this fail");
