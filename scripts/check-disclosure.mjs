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

    const start = await el.getAttribute("aria-expanded");
    if (start !== "false") {
      fail.push(`[${where}] "${c.label}" starts at aria-expanded="${start}" on a fresh page.`);
      await ctx.close();
      continue;
    }
    // Activate, and report an interception rather than throwing on it: a full-screen overlay
    // legitimately covers the control that opened it.
    const act = async () => {
      try {
        if (view.touch) await el.tap({ timeout: 5000 }); else await el.click({ timeout: 5000 });
        await page.waitForTimeout(450);
        return null;
      } catch (e) { return String(e).split("\n")[0]; }
    };
    const openErr = await act();
    if (openErr) {
      fail.push(`[${where}] "${c.label}" (${c.sel}) could not be activated at all: ${openErr}`);
      await ctx.close();
      continue;
    }
    const opened = await el.getAttribute("aria-expanded");

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
      }
    }
    if (closeErr) {
      fail.push(`[${where}] "${c.label}" (${c.sel}) could not be closed: ${closeErr}`);
      await ctx.close();
      continue;
    }
    const closed = await el.getAttribute("aria-expanded");
    measured++;

    if (opened !== "true") {
      fail.push(`[${where}] "${c.label}" (${c.sel}) did not open: aria-expanded="${opened}" after one ${view.touch ? "tap" : "click"}.`);
    } else if (closed !== "false") {
      fail.push(`[${where}] "${c.label}" (${c.sel}) will not close (pressed ${closedBy}): aria-expanded is still "${closed}" ` +
                `after a second ${view.touch ? "tap" : "click"} on the control that opened it. ` +
                `On Safari this is the focusout/click race: the browser does not focus a button on ` +
                `tap, so anything focused inside the panel blurs with relatedTarget=null, a ` +
                `"focus has left" handler closes the panel during pointerdown, and the click that ` +
                `follows reopens it.`);
    }
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
