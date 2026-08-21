/*
 * CHROME ON A PHONE, WHICH IS TWO DIFFERENT BROWSERS.
 *
 * Owner, 2026-08-21: "test and optimize the webpage and portal for chrome in mobile, many users
 * use that browser."
 *
 * Chrome on Android is Blink. Chrome on iOS is WebKit -- Apple allows no other engine, so the
 * iPhone Chrome a reader is holding renders with Safari's engine and only Chrome's chrome. A
 * sweep that runs Chromium alone has tested half of "Chrome on mobile", and it is the half that
 * does not have the failure modes below. So every device here is rendered in BOTH engines.
 *
 * The four rules are the mobile-browser defects a desktop sweep structurally cannot see, each
 * measured on the rendered page rather than read out of the stylesheet:
 *
 *   ZOOM     A form field whose text is smaller than 16px makes iOS zoom the page in when it
 *            takes focus, and iOS does not zoom back out. The reader is left on a page a third
 *            too wide with no way back except pinching. It is the most common iPhone defect in
 *            an otherwise responsive site, and it is invisible at every desktop width.
 *   TAP      A control smaller than 44x44 CSS px is below the floor Apple's guidelines and WCAG
 *            2.5.5 both put on a touch target. Measured on the control's own hit box, with
 *            inline links inside running text excluded -- those are text, governed by line
 *            height, and enlarging them would break the paragraph they sit in.
 *   BOOST    Android Chrome inflates text it decides is body copy unless the page pins
 *            `text-size-adjust`. The inflation is per BLOCK, so it breaks a layout by making
 *            some paragraphs bigger than others, which reads as a broken build, not a setting.
 *   BAR      The address bar on a phone appears and disappears while the reader scrolls, so the
 *            viewport is two different heights during one visit. Anything sized in `100vh` is
 *            sized to the taller of the two and hangs its bottom off the screen while the bar is
 *            showing. Measured by rendering 90px shorter -- the bar's real height -- and
 *            requiring the open menu's controls to still be reachable.
 *
 * The subject is COMPUTED: every field, every control and every disclosure the page actually
 * has, at six phone sizes in two engines. Not a list of selectors to keep in step with markup.
 */
import { chromium, webkit } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

/* The phones people actually hold, smallest first. The two ends matter most: 360x640 is the
   floor Android still ships, and 430x932 is where a layout that only ever ran at 390 shows its
   seams. */
const DEVICES = [
  { name: "Android 360x640", size: [360, 640], dpr: 3 },
  { name: "Android 393x851", size: [393, 851], dpr: 2.75 },
  { name: "Android 412x915", size: [412, 915], dpr: 2.625 },
  { name: "iPhone SE 375x667", size: [375, 667], dpr: 2 },
  { name: "iPhone 390x844", size: [390, 844], dpr: 3 },
  { name: "iPhone 430x932", size: [430, 932], dpr: 3 },
];
const ROUTES = ["/", "/docs/user-guide", "/refund"];

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
  console.error(`check-mobile-chrome: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}

/* ---------- the probe ---------------------------------------------------- */
const PROBE = () => {
  const name = (el) => {
    const cls = typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const txt = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24);
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + cls + (txt ? ' "' + txt + '"' : "");
  };
  const seen = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.01;
  };

  /* ONLY THE FIELDS THAT ZOOM. iOS enlarges the page when a field the reader can TYPE into takes
     focus and its text is under 16px. A checkbox, a radio, a range or a file button has no text
     to read, and iOS does not zoom for them -- the first version of this rule flagged the two
     cookie-banner checkboxes on every page of the site, which is a false positive dressed as
     eleven findings. The list is the typing types plus select and textarea. */
  const TYPES = new Set(["text", "password", "email", "number", "search", "tel", "url", ""]);
  const zoom = [];
  for (const f of document.querySelectorAll("input, select, textarea")) {
    const cs = getComputedStyle(f);
    if (cs.display === "none") continue;
    if (f.tagName === "INPUT" && !TYPES.has((f.getAttribute("type") || "text").toLowerCase())) continue;
    const px = parseFloat(cs.fontSize);
    if (px < 16) zoom.push({ el: name(f), px: +px.toFixed(1) });
  }

  /* A CONTROL NOBODY CAN TAP IS NOT A TAP TARGET. Skip links and other sr-only affordances are
     laid out at full size and parked outside the viewport or clipped to nothing; they exist for
     the keyboard and a finger never meets them. Measured, not assumed: the box is off screen, or
     the clip is the sr-only clip. */
  const parked = (el, r) => {
    const cs = getComputedStyle(el);
    if (/inset\(\s*50%/.test(cs.clipPath || "")) return true;
    if (/rect\(\s*0(px)?[,\s]/.test(cs.clip || "")) return true;
    return r.right <= 0 || r.bottom <= 0 || r.left >= window.innerWidth || r.top >= window.innerHeight + window.scrollY + 4000;
  };
  /* A LINK INSIDE A SENTENCE IS TEXT. WCAG 2.5.5 exempts a target that is inline in a block of
     text, and it is right to: enlarging it would break the line it sits in. Both `inline` and
     `inline-block` count, which the first version missed. */
  const inSentence = (el, cs) => {
    const p = el.parentElement;
    if (!p || !/^(P|LI|SMALL|SPAN|TD|LABEL|H1|H2|H3|H4)$/.test(p.tagName)) return false;
    return cs.display === "inline" || cs.display === "inline-block";
  };
  /* MEASURED ON THE LAYOUT BOX, NOT THE PAINTED ONE. The first version read
     getBoundingClientRect(), which is the box AFTER every transform on every ancestor. The
     mission panel tilts three degrees on a `perspective()` as it settles, so in WebKit -- which
     had not finished the settle when the sweep reached it -- a button with `min-height:44px`
     measured 43. That is a real number about a moving element and a false statement about a
     touch target: what a finger needs is the CSS size, which is what offsetWidth/offsetHeight
     report. */
  const tap = [];
  const CONTROLS = "a[href], button, [role=button], summary, input, select, [tabindex]";
  for (const el of document.querySelectorAll(CONTROLS)) {
    if (el.getAttribute("tabindex") === "-1" && !/^(A|BUTTON|SUMMARY|INPUT|SELECT)$/.test(el.tagName)) continue;
    if (!seen(el)) continue;
    if (el.type === "checkbox" || el.type === "radio") continue;   // the LABEL is the target
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (parked(el, r) || inSentence(el, cs)) continue;
    const w = el.offsetWidth || r.width, h = el.offsetHeight || r.height;
    if (w < 44 || h < 44) tap.push({ el: name(el), w: Math.round(w), h: Math.round(h) });
  }

  const rootCs = getComputedStyle(document.documentElement);
  const adj = rootCs.webkitTextSizeAdjust || rootCs.textSizeAdjust || "";

  let over = null;
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) {
    let worst = 0;
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      const past = r.right - vw;
      if (past > worst && r.width > 0) { worst = past; over = { el: name(el), past: Math.round(past) }; }
    }
    if (!over) over = { el: "<unknown>", past: document.documentElement.scrollWidth - vw };
  }

  return { zoom, tap, adj, over };
};

/* Open the disclosure and report whether its controls are inside the visible viewport. This is
   the 100vh question asked the only way it cannot be answered wrong: by making the viewport the
   size it really is while the address bar is showing. */
const BAR_PROBE = () => {
  const toggle = document.querySelector("[aria-expanded][aria-controls]");
  if (!toggle) return { skipped: "no disclosure control on this route" };
  const panel = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!panel) return { skipped: "the control names a panel that is not here" };
  const off = [];
  for (const el of panel.querySelectorAll("a[href], button")) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === "hidden") continue;
    if (r.top >= window.innerHeight - 1 || r.bottom <= 1) {
      off.push({ el: (el.textContent || "").trim().slice(0, 24), top: Math.round(r.top), bottom: Math.round(r.bottom) });
    }
  }
  return { off, h: window.innerHeight, scrolls: panel.scrollHeight > panel.clientHeight + 1 };
};

/* ---------- measure ------------------------------------------------------ */
async function sweep(browser, engine, inject, dom) {
  const found = [];
  let cells = 0, fields = 0, controls = 0;
  for (const d of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: d.size[0], height: d.size[1] },
      deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    if (dom) await page.addInitScript(dom);
    if (inject) {
      await page.route("**/styles.css", async (route) => {
        const res = await route.fetch();
        route.fulfill({ response: res, body: (await res.text()) + "\n" + inject });
      });
    }
    for (const route of ROUTES) {
      await page.goto(base + route, { waitUntil: "load" });
      try { await page.click("#consentReject", { timeout: 1200 }); } catch {}
      await page.waitForTimeout(250);
      /* A render with no stylesheet is not a result. The portal's guard learned this the
         expensive way -- an HSTS header upgraded WebKit's stylesheet request to a port with no
         TLS, and 186 measurements of an unstyled document read as 186 defects. */
      const styled = await page.evaluate(() =>
        !/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(getComputedStyle(document.body).backgroundColor));
      if (!styled) {
        found.push(`${"["}${engine} ${d.name} ${route}] HARNESS: the page rendered with no ` +
                   `stylesheet, so nothing here was measured.`);
        cells++;
        continue;
      }
      const r = await page.evaluate(PROBE);
      cells++;
      fields += r.zoom.length;
      controls += r.tap.length;
      const at = `[${engine} ${d.name} ${route}]`;
      for (const z of r.zoom) {
        found.push(`${at} ZOOM ${z.el} sets ${z.px}px. iOS zooms the page in when a field under ` +
                   `16px takes focus, and does not zoom back out.`);
      }
      for (const t of r.tap.slice(0, 6)) {
        found.push(`${at} TAP ${t.el} is ${t.w}x${t.h}, under the 44x44 floor for a touch target.`);
      }
      /* TEXT BOOSTING IS A BLINK BEHAVIOUR, and WebKit does not expose the computed property
         at all -- it comes back as "" there, which the first version read as "not pinned" and
         reported on every WebKit render. Asked only where it can be both true and answerable. */
      if (engine === "blink" && !/^(100%|none)$/.test(String(r.adj))) {
        found.push(`${at} BOOST text-size-adjust computes to "${r.adj}". Android Chrome inflates ` +
                   `text per block unless this is pinned, which breaks a layout unevenly.`);
      }
      if (r.over) {
        found.push(`${at} the page scrolls sideways: ${r.over.el} runs ${r.over.past}px past the right edge.`);
      }
    }

    /* THE ADDRESS BAR. Same device, 90px shorter, disclosure open. */
    await page.goto(base + "/", { waitUntil: "load" });
    try { await page.click("#consentReject", { timeout: 1200 }); } catch {}
    await page.setViewportSize({ width: d.size[0], height: d.size[1] - 90 });
    await page.waitForTimeout(150);
    const toggle = await page.$("[aria-expanded][aria-controls]");
    if (toggle) {
      await toggle.click();
      await page.waitForTimeout(320);
      const bar = await page.evaluate(BAR_PROBE);
      if (bar.off && bar.off.length && !bar.scrolls) {
        for (const o of bar.off.slice(0, 4)) {
          found.push(`[${engine} ${d.name}] BAR with the address bar showing (${bar.h}px of viewport) ` +
                     `the menu item "${o.el}" sits at ${o.top}..${o.bottom}, off the screen, in a panel ` +
                     `that does not scroll. A full-height overlay must be sized in dvh, not vh.`);
        }
      }
    }
    await ctx.close();
  }
  return { found, cells, fields, controls };
}

const results = [];
for (const [engine, launcher] of [["blink", chromium], ["webkit", webkit]]) {
  const browser = await launcher.launch();
  const r = await sweep(browser, engine, null);
  results.push({ engine, ...r });
  for (const f of r.found) fail.push(f);
  await browser.close();
}
note(`${results.reduce((a, r) => a + r.cells, 0)} render(s) swept: ${DEVICES.length} phone sizes x ` +
     `${ROUTES.length} routes x 2 engines (Chrome on Android is Blink, Chrome on iOS is WebKit)`);

/* ---------- the negative controls ---------------------------------------- */
/* Each rule gets a defect built for it, and each must be seen. A sweep that quietly stopped
   finding subjects would otherwise report a clean site for ever. */
/* THE SITE HAS NO TEXT FIELD AT ALL -- its only inputs are the two consent checkboxes, and
   those do not make iOS zoom, so the refined rule correctly ignores them. Restyling what is not
   there proves nothing, so the ZOOM control ADDS a field and then makes it small. Without this
   the control reported "did not fire" on a page where there was nothing to fire at. */
const ZOOM_DOM = "document.addEventListener('DOMContentLoaded',function(){var i=document.createElement('input');" +
  "i.type='text';i.id='zoomControlField';i.style.fontSize='13px';document.body.appendChild(i);});";
const CONTROLS = [
  ["ZOOM", null, "ZOOM ", ZOOM_DOM],
  ["TAP", ".nav-toggle,.mm-cta,.footer nav a{width:20px !important;height:20px !important;min-height:0 !important;min-width:0 !important;padding:0 !important;overflow:hidden}", "TAP "],
  ["BOOST", "html{-webkit-text-size-adjust:200% !important;text-size-adjust:200% !important}", "BOOST "],
];
const ctlBrowser = await chromium.launch();
for (const [what, css, marker, dom] of CONTROLS) {
  const r = await sweep(ctlBrowser, "blink", css, dom);
  const n = r.found.filter((f) => f.includes(marker)).length;
  if (!n) {
    fail.push(`NEGATIVE CONTROL DID NOT FIRE: the ${what} rule saw nothing when the defect was ` +
              `injected, so it cannot see the thing it exists for.`);
  } else {
    note(`negative control ${what} fired: ${n} finding(s)`);
  }
}
await ctlBrowser.close();

server.kill();
if (process.platform === "win32" && server.pid) {
  try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
}

if (fail.length) {
  const shown = fail.slice(0, 40);
  for (const f of shown) console.error("FAIL: " + f);
  if (fail.length > shown.length) console.error(`... and ${fail.length - shown.length} more`);
  console.error(`\ncheck-mobile-chrome: ${fail.length} finding(s).`);
  process.exit(1);
}
console.log("check-mobile-chrome OK: no zoom-on-focus field, no undersized control, text-size-adjust " +
            "pinned, no sideways scroll and no overlay lost behind the address bar -- on six phone " +
            "sizes, in both of the engines Chrome ships on a phone.");
