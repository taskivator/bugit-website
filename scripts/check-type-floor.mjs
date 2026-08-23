// THE TYPE FLOOR IS A CLAIM, SO IT IS MEASURED.
//
// styles.css section 28 is titled "The type scale, off the floor" and says, in its own words,
// "Nothing renders below 11.5px now". That is a promise about every rendered page, and until
// 2026-08-23 nothing checked it: the brand byline, "by Taskivator", computed to 11px at every
// width from 786px up -- desktop included. It was found by an Android device sweep, which is
// where a floor is felt first, and it had been under the floor since the scale was raised.
//
// WHAT IT ASSERTS. No element that renders its own text computes a font-size below the floor,
// at phone, tablet and desktop widths, in every language the site ships -- because a floor set
// against English is a floor that a longer language's own size step can slip under.
//
// THE FLOOR IS NOT TYPED HERE. It is read out of the stylesheet's own `--t-3xs` custom property,
// the smallest step in the scale, so raising or lowering the scale moves this guard with it and
// the guard can never disagree with the design it is checking. It is taken at the NARROWEST
// viewport in the sweep, because --t-3xs is a clamp that grows with the window: its value at
// 1440px is 12.2px, and comparing a fixed size against that would fail every deliberate small
// label on a wide screen. The claim is a floor -- the bottom of the clamp -- not a moving target.
//
// Excluded, deliberately and narrowly, and each exclusion is computed rather than listed:
//
//   * text a reader never sees -- parked off screen, clipped to nothing, or transparent;
//   * an element with no text of its OWN, whose size is inherited and whose children are
//     measured where they are;
//   * the monospace micro-labels inside the Mission Control panel. That panel is a rendered
//     mock of a tool's own interface, and its field captions are set in the mono stack at
//     9-9.5px with wide tracking BY DESIGN -- the same way a screenshot of a real product
//     would be. They are the reason section 28's sentence had to be corrected rather than the
//     design changed: the scale governs the page's prose and its chrome, and it never governed
//     the simulated panel. Recognised by the two things that are true of them and of nothing
//     else -- a monospace family, inside the instrument -- so a new label there is exempt and a
//     new label anywhere else is not.
//
// Run: `node scripts/check-type-floor.mjs` (or `npm run test:type-floor`).
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const WIDTHS = [360, 412, 786, 1024, 1440];
const LANGS = ["en", "de", "ru", "ja", "ar"];

/* PROVE IT CAN FAIL, WITH THE DEFECT THAT WAS ACTUALLY UNDER THE FLOOR.
   This guard reads its own floor out of the stylesheet, which is the right way round -- and it is
   also the way it could go quietly blind: if `--t-3xs` ever failed to resolve the floor would fall
   to nothing and every page on earth would clear it. So the byline is put back at the 11px it
   shipped at, by serving the old stylesheet, and a run that stays green means this file is not
   reading the page. The size is the one an Android sweep found on 2026-08-23, not an invented one:
   a control that injures the page in a way it was never injured proves less than it appears to. */
const BREAK_FROM = ".brand em{font-size:11.5px;margin-top:5px}";
const BREAK_TO = ".brand em{font-size:11px;margin-top:5px}/*NEGATIVE CONTROL: the byline is back under the floor.*/";
let mutationBit = false;

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
  if (!up) { console.error("check-type-floor: the dev server never answered."); stop(); process.exit(1); }
}
function stop() {
  if (!server) return;
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
}

const MEASURE = () => {
  // The floor the stylesheet itself declares: the low end of the smallest step in the scale.
  const decl = getComputedStyle(document.documentElement).getPropertyValue("--t-3xs").trim();
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;font-size:var(--t-3xs)";
  probe.textContent = "x";
  document.body.appendChild(probe);
  const floor = parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();

  const parked = (el, r) => {
    const cs = getComputedStyle(el);
    if (/inset\(\s*50%/.test(cs.clipPath || "")) return true;
    if (/rect\(\s*0(px)?[,\s]/.test(cs.clip || "")) return true;
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return true;
    return r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= window.innerWidth;
  };

  const under = [];
  for (const el of document.querySelectorAll("body *")) {
    // Only elements that render text of their own; a wrapper's size is inherited and its
    // children are measured where they are.
    let own = "";
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
    own = own.trim();
    if (own.length < 2) continue;
    const r = el.getBoundingClientRect();
    if (parked(el, r)) continue;
    const cs2 = getComputedStyle(el);
    if (/mono|courier/i.test(cs2.fontFamily) && el.closest(".mission, .report-panel")) continue;
    const px = parseFloat(cs2.fontSize);
    if (px && px < floor - 0.05) {
      under.push({
        px: Math.round(px * 10) / 10,
        what: (el.id ? "#" + el.id : el.tagName.toLowerCase()) +
          (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""),
        text: own.replace(/\s+/g, " ").slice(0, 30),
      });
    }
  }
  return { floor, decl, under };
};

const browser = await chromium.launch();
let measured = 0, floorSeen = 0, FLOOR = 0;

async function render({ width, lang, broken }) {
  const found = [];
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: lang });
  if (broken) {
    await ctx.route("**/styles*.css", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      if (body.includes(BREAK_FROM)) mutationBit = true;
      route.fulfill({ response: res, body: body.split(BREAK_FROM).join(BREAK_TO) });
    });
  }
  const page = await ctx.newPage();
  try {
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    if (lang !== "en") {
      await page.evaluate((l) => { try { document.cookie = `lang=${l};path=/;max-age=600`; } catch {} }, lang);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
    }
    try { await page.evaluate(() => document.getElementById("consentReject")?.click()); } catch {}
    await page.waitForTimeout(150);
    const r = await page.evaluate(MEASURE);
    if (!r.floor || !Number.isFinite(r.floor)) {
      found.push(`${width}px ${lang}: the stylesheet declares no --t-3xs, so this guard has no floor to check against`);
    } else {
      if (!FLOOR) FLOOR = r.floor;          // the narrowest width comes first: the clamp's bottom
      floorSeen = FLOOR;
      if (!broken) measured++;
      for (const u of r.under) {
        if (u.px >= FLOOR - 0.05) continue;
        found.push(`${width}px ${lang}: ${u.what} renders at ${u.px}px, under the ${FLOOR}px floor the scale declares -- "${u.text}"`);
      }
    }
  } catch (e) {
    found.push(`${width}px ${lang}: ${String(e).split("\n")[0]}`);
  }
  await ctx.close();
  return found;
}

for (const width of WIDTHS) {
  for (const lang of LANGS) {
    for (const f of await render({ width, lang, broken: false })) fail.push(f);
  }
}

/* At 1024px, where the byline was under the floor and nothing noticed for as long as it shipped. */
const control = await render({ width: 1024, lang: "en", broken: true });
if (!mutationBit) {
  fail.push(
    "NEGATIVE CONTROL NEVER APPLIED: this file's copy of the byline rule no longer appears in " +
      "styles.css, so the mutation changed nothing and proved nothing",
  );
} else if (!control.length) {
  fail.push(
    "NEGATIVE CONTROL DID NOT FIRE: with the byline put back at the 11px it shipped at, this " +
      "check still found nothing under the floor, so it is not reading the page",
  );
}

await browser.close();
stop();

if (measured < WIDTHS.length) {
  console.error(`check-type-floor: only ${measured} of ${WIDTHS.length * LANGS.length} renders were measured, so this proved little.`);
  process.exit(1);
}
if (fail.length) {
  console.error(`\ncheck-type-floor: FAIL (${fail.length})`);
  for (const f of [...new Set(fail)].slice(0, 25)) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-type-floor: OK (${measured} renders across ${WIDTHS.length} widths x ${LANGS.length} languages; nothing renders below the ${floorSeen}px the scale declares; negative control fired with ${control.length} finding(s))`);
