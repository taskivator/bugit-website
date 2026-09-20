// THE GUIDE ON EVERY ENGINE AND EVERY SIZE SOMEONE ACTUALLY HOLDS.
//
// WHY THIS EXISTS. scripts/check-guide.mjs is the Guide's behaviour guard and it is thorough
// about WHAT the Guide says and what leaves the browser -- but it opens exactly one browser,
// Chromium, at exactly one size, 1280x900. So on 2026-09-20 the customer-facing chatbot had
// never once been opened by this repository in Firefox, in WebKit (which is every browser on
// iOS, not just Safari), on a phone, or on a tablet. A guard that is thorough in one
// configuration reads as coverage for all of them, which is the failure shape this workspace
// keeps meeting.
//
// The risk is not hypothetical for the mark added the same day. The Guide's blip is an inline
// SVG whose speech bubble is positioned with `transform-box: view-box` and a transform-origin
// in user units. Engines have disagreed about exactly that, and the way it fails is not an
// error: the bubble renders somewhere else on the body, silently, and only on the engine
// nobody opened. So this measures where the bubble actually lands, per engine.
//
// WHAT IT ASSERTS, per engine x viewport:
//   1. the page loads with no page error and no console error
//   2. the Guide can be opened -- by tap on touch devices, by click otherwise
//   3. the panel fits the viewport and the page never scrolls sideways
//   4. the mark renders, and its speech bubble lands on the body rather than off it
//   5. a question the bank knows is answered word for word
//   6. the composer and the send control are reachable and large enough to hit
//   7. Escape closes the panel
//   8. nothing left the origin
//
// Run: node scripts/check-guide-devices.mjs
//      node scripts/check-guide-devices.mjs --only=webkit    (one engine, while iterating)
import { chromium, firefox, webkit } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bank = JSON.parse(readFileSync(path.join(ROOT, "public/guide/prepared/en.json"), "utf8"));
const entry = bank.items.find((i) => i.kind === "entry");

const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);

const ENGINES = [
  { name: "chromium", launch: chromium },
  { name: "firefox", launch: firefox },
  { name: "webkit", launch: webkit },
].filter((e) => !only || e.name === only);

// Real sizes, not round ones. The phone is an iPhone 14/15 class viewport, the small tablet is
// an iPad mini in portrait, the large one is an iPad Air in landscape -- the width at which a
// tablet stops being a big phone and the desktop rules take over, which is where a breakpoint
// written for "mobile" and "desktop" has nowhere to put it.
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, touch: true, dsf: 3 },
  { name: "tablet-portrait", width: 744, height: 1133, touch: true, dsf: 2 },
  { name: "tablet-landscape", width: 1133, height: 744, touch: true, dsf: 2 },
  { name: "desktop", width: 1440, height: 900, touch: false, dsf: 1 },
];

const PORT = await new Promise((res, rej) => {
  const p = net.createServer();
  p.on("error", rej);
  p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); });
});
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}/`;
await new Promise((r) => setTimeout(r, 900));

const failures = [];
let checks = 0;
const check = (where, name, ok, detail = "") => {
  checks++;
  if (ok) return;
  failures.push(`[${where}] ${name}${detail ? ` -- ${detail}` : ""}`);
};

// The minimum comfortable touch target. 44 is the number the rest of this repo already uses
// (see the doc-crumb rules in styles.css), so this does not invent a second standard.
const TOUCH_MIN = 44;

async function run(engine, vp) {
  const where = `${engine.name}/${vp.name}`;
  const browser = await engine.launch.launch();
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
    hasTouch: vp.touch,
    isMobile: vp.touch && engine.name === "chromium", // only Chromium implements isMobile
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const offsite = [];
  page.on("pageerror", (e) => {
    const t = String(e);
    if (t.includes("portal.bugit.dev/api/session-status")) return;   // WebKit reports it here too
    pageErrors.push(t);
  });
  /* The site asks the portal whether anyone is signed in. check-guide.mjs:90 already names that
     request as expected. From 127.0.0.1 it fails CORS, because that origin is not one the portal
     has any reason to allow: the failure is the TEST's address, not the product's behaviour.

     Filtering on the message TEXT is not enough, and the first attempt at this failed because of
     it. A blocked fetch produces TWO console errors, and only one of them names the URL. The
     other is bare -- "Failed to load resource: net::ERR_FAILED" in Chromium, and in WebKit a line
     that names the origin it refused rather than the resource it refused to fetch. Neither can be
     matched against a URL that is not in it.

     So the REQUESTS are tracked instead, and a resource-load complaint is dropped only while
     every request that actually failed is one we expect. The moment anything else fails, the
     bare messages stop being ignored and the run goes red -- which is the property worth keeping,
     because "Failed to load resource" is exactly how a missing stylesheet or a broken script
     would announce itself. */
  const EXPECTED_URLS = ["portal.bugit.dev/api/session-status"];
  const expectedUrl = (u) => EXPECTED_URLS.some((e) => u.includes(e));
  const failedUrls = [];
  page.on("requestfailed", (r) => failedUrls.push(r.url()));
  /* WebKit blocks the cross-origin READ, not the request: the response arrives with "Status code:
     200" and no requestfailed event ever fires, so a gate that waits for a failed request never
     engages. Two more signals close that hole without blunting the check. `sawExpected` says the
     expected call really was made, and `badResponses` catches the case this must never swallow --
     a stylesheet or script that 404s, which produces the same bare "Failed to load resource" line
     and no failed request either. */
  let sawExpected = false;
  const badResponses = [];
  page.on("request", (r) => { if (expectedUrl(r.url())) sawExpected = true; });
  page.on("response", (r) => {
    if (r.status() >= 400 && !expectedUrl(r.url())) badResponses.push(`${r.status()} ${r.url()}`);
  });
  // A complaint that carries no subject of its own. Only ignorable while nothing unexpected failed.
  const BARE_LOAD_FAILURE = /Failed to load resource|is not allowed by Access-Control-Allow-Origin|due to access control checks/i;
  // Ignorable only while the expected call is the ONLY thing that could have produced the line.
  const onlyExpectedFailed = () =>
    sawExpected && failedUrls.every(expectedUrl) && badResponses.length === 0;
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    const loc = (m.location() && m.location().url) || "";
    if (expectedUrl(t) || expectedUrl(loc)) return;              // names the expected request
    if (BARE_LOAD_FAILURE.test(t) && onlyExpectedFailed()) return; // its unnamed twin
    consoleErrors.push(t);
  });
  page.on("request", (r) => {
    const u = r.url();
    if (u.startsWith(base) || u.startsWith("data:") || u.startsWith("blob:")) return;
    // app.js asks the Portal whether this visitor is signed in, on every page, with or without
    // the Guide. It is the site's one consentless offsite request and is not the Guide.
    if (u === "https://portal.bugit.dev/api/session-status") return;
    offsite.push(u);
  });

  try {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.getElementById("consentBanner")?.remove());
    await page.waitForTimeout(700);

    check(where, "the page renders without a script error", pageErrors.length === 0, pageErrors.join(" | "));
    check(where, "the page renders without a console error", consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));

    // ---- the hero bar, which is the entry point the owner asked for ----------
    const bar = await page.$("#askBar");
    check(where, "the hero Ask BugIt bar is present", Boolean(bar));
    if (bar) {
      const b = await bar.boundingBox();
      check(where, "the Ask bar is on screen", Boolean(b) && b.y >= 0 && b.x >= 0 && b.x + b.width <= vp.width + 0.5,
            b ? `x=${b.x.toFixed(0)} w=${b.width.toFixed(0)} vp=${vp.width}` : "no box");
      check(where, "the Ask bar is big enough to hit", Boolean(b) && b.height >= TOUCH_MIN,
            b ? `${b.height.toFixed(0)}px tall` : "no box");

      // The mark, and specifically where its speech bubble lands. transform-box:view-box is the
      // part engines have disagreed about; if it is ignored the bubble is placed against the
      // wrong reference box and ends up off the body entirely.
      const orb = await page.$(".askbar-orb img");
      check(where, "the Guide mark renders in the Ask bar", Boolean(orb));
      if (orb) {
        const ob = await orb.boundingBox();
        check(where, "the mark has real size", Boolean(ob) && ob.width > 20 && ob.height > 20,
              ob ? `${ob.width.toFixed(0)}x${ob.height.toFixed(0)}` : "no box");
      }
    }

    // ---- no sideways scroll, at any width -----------------------------------
    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    check(where, "the page does not scroll sideways", overflow.scrollW <= overflow.clientW + 1,
          `scrollWidth ${overflow.scrollW} vs ${overflow.clientW}`);

    // ---- open the Guide the way this device would ---------------------------
    if (vp.touch) await page.tap("#askBar");
    else await page.click("#askBar");
    await page.waitForSelector("#bgd-panel", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(500);

    const panel = await page.$("#bgd-panel");
    const pb = await panel.boundingBox();
    check(where, "the Guide opens", Boolean(pb) && pb.width > 0 && pb.height > 0);
    check(where, "the panel fits the screen", Boolean(pb) &&
          pb.x >= -1 && pb.y >= -1 && pb.x + pb.width <= vp.width + 1 && pb.y + pb.height <= vp.height + 1,
          pb ? `x=${pb.x.toFixed(0)} y=${pb.y.toFixed(0)} ${pb.width.toFixed(0)}x${pb.height.toFixed(0)} in ${vp.width}x${vp.height}` : "no box");

    // The panel's own mark, inline this time, with the bubble measured against the body.
    const bubble = await page.evaluate(() => {
      const svg = document.querySelector("#bgd-panel .bgd-blip");
      if (!svg) return null;
      const tool = svg.querySelector(".b-tool");
      const body = svg.querySelector('rect[rx="20"]');
      if (!tool || !body) return { missing: true };
      const t = tool.getBoundingClientRect(), s = svg.getBoundingClientRect();
      // Where the bubble sits INSIDE the mark, as a fraction of the mark's box. Fractions rather
      // than pixels so the assertion holds at every rendered size.
      return { fx: (t.x + t.width / 2 - s.x) / s.width, fy: (t.y + t.height / 2 - s.y) / s.height, w: t.width, sw: s.width };
    });
    check(where, "the panel header draws the Guide mark", bubble !== null);
    if (bubble && !bubble.missing) {
      // Authored at translate(66 64) in a 0..100 viewBox, so the bubble's centre belongs at
      // roughly 0.66 / 0.64 of the mark. A generous window: this is catching "the engine put it
      // somewhere else entirely", not a sub-pixel difference.
      const placed = bubble.fx > 0.5 && bubble.fx < 0.85 && bubble.fy > 0.45 && bubble.fy < 0.85;
      check(where, "the speech bubble lands on the body, not off it", placed,
            `centre at ${(bubble.fx * 100).toFixed(0)}%,${(bubble.fy * 100).toFixed(0)}% of the mark`);
      check(where, "the bubble has real width", bubble.w > 0 && bubble.w / bubble.sw > 0.15,
            `${bubble.w.toFixed(1)}px of a ${bubble.sw.toFixed(1)}px mark`);
    } else if (bubble && bubble.missing) {
      check(where, "the mark carries its speech bubble", false, "no .b-tool inside .bgd-blip");
    }

    // ---- the composer is usable on this device ------------------------------
    const input = await page.$("#bgd-input");
    check(where, "the composer is present", Boolean(input));
    const send = await page.$(".bgd-send");
    check(where, "the send control is present", Boolean(send));
    if (send) {
      const sb = await send.boundingBox();
      check(where, "the send control is big enough to hit", Boolean(sb) && Math.min(sb.width, sb.height) >= 28,
            sb ? `${sb.width.toFixed(0)}x${sb.height.toFixed(0)}` : "no box");
    }

    // ---- it actually answers ------------------------------------------------
    await page.fill("#bgd-input", entry.question);
    if (vp.touch) await page.tap(".bgd-send");
    else await page.click(".bgd-send");
    await page.waitForSelector(".bgd-bot .bgd-answer p", { timeout: 20000 });
    const answered = await page.textContent(".bgd-bot .bgd-answer");
    const first = entry.answer.split("\n")[0].replace(/[*`]/g, "").slice(0, 40);
    check(where, "a question the bank knows is answered word for word", answered.includes(first), `wanted "${first}"`);

    // The answer must be readable, not clipped by a panel that is too short for this device.
    const answerFits = await page.evaluate(() => {
      const a = document.querySelector(".bgd-bot .bgd-answer");
      // The SCROLLER, not .bgd-hand -- that is the hand-off-to-a-human card, which is absent
      // precisely when the bank answers, so measuring against it returned null every time.
      const hand = document.querySelector(".bgd-scroll");
      if (!a || !hand) return null;
      const r = a.getBoundingClientRect(), h = hand.getBoundingClientRect();
      return { visible: r.width > 0 && r.height > 0, insideScroller: r.right <= h.right + 1 && r.left >= h.left - 1 };
    });
    check(where, "the answer is inside the conversation, not spilling out of it",
          answerFits && answerFits.visible && answerFits.insideScroller, JSON.stringify(answerFits));

    // ---- Escape closes it ---------------------------------------------------
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const stillOpen = await page.evaluate(() => {
      const p = document.getElementById("bgd-panel");
      if (!p) return false;
      const cs = getComputedStyle(p);
      return cs.display !== "none" && cs.visibility !== "hidden" && !p.hidden;
    });
    check(where, "Escape closes the Guide", !stillOpen);

    check(where, "nothing left the origin", offsite.length === 0, offsite.slice(0, 3).join(", "));
  } catch (err) {
    check(where, "the run completed", false, String(err).split("\n")[0]);
  } finally {
    await browser.close();
  }
  console.log(`  ${where.padEnd(28)} ${failures.filter((f) => f.startsWith(`[${where}]`)).length === 0 ? "ok" : "FAIL"}`);
}

for (const engine of ENGINES) {
  for (const vp of VIEWPORTS) await run(engine, vp);
}

/* NEGATIVE CONTROL. Every assertion above could be vacuously true if the selectors had gone
 * stale -- a missing element and a passing check look identical from the outside, and that is
 * how a guard becomes decoration. So prove the bubble measurement can fail: move the tool and
 * confirm this file notices. Chromium only; the control is about THIS script's arithmetic,
 * which is the same on every engine. */
{
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.getElementById("consentBanner")?.remove());
  await page.click("#askBar");
  await page.waitForSelector("#bgd-panel", { state: "visible", timeout: 15000 });
  await page.waitForTimeout(400);
  const moved = await page.evaluate(() => {
    const svg = document.querySelector("#bgd-panel .bgd-blip");
    const tool = svg && svg.querySelector(".b-tool");
    if (!tool) return null;
    tool.querySelector("g").setAttribute("transform", "translate(8 8) scale(1.16)");
    const t = tool.getBoundingClientRect(), s = svg.getBoundingClientRect();
    return { fx: (t.x + t.width / 2 - s.x) / s.width, fy: (t.y + t.height / 2 - s.y) / s.height };
  });
  const wouldFail = moved && !(moved.fx > 0.5 && moved.fx < 0.85 && moved.fy > 0.45 && moved.fy < 0.85);
  checks++;
  if (!wouldFail) failures.push("[control] moving the speech bubble off the body did NOT fail the placement check, so that check proves nothing");
  else console.log(`  negative control fired: a displaced bubble measured ${(moved.fx * 100).toFixed(0)}%,${(moved.fy * 100).toFixed(0)}%`);
  await browser.close();
}

/* SECOND NEGATIVE CONTROL: the console filter must still see a real broken resource.
   This guard deliberately ignores one cross-origin call the product is meant to make, and the
   bare "Failed to load resource" line it produces. That suppression is the kind that rots into
   blindness: a 404 stylesheet announces itself with the SAME bare line and, like the CORS case,
   without a failed request. So a missing resource is injected here and the filter must let it
   through. If this stops firing, the ignore list has grown over the defect it was meant to skip
   around, and the "no console error" assertion above means nothing. */
{
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const seen = [];
  const EXPECTED_URLS = ["portal.bugit.dev/api/session-status"];
  const expectedUrl = (u) => EXPECTED_URLS.some((e) => u.includes(e));
  const failedUrls = [];
  let sawExpected = false;
  const badResponses = [];
  page.on("requestfailed", (r) => failedUrls.push(r.url()));
  page.on("request", (r) => { if (expectedUrl(r.url())) sawExpected = true; });
  page.on("response", (r) => { if (r.status() >= 400 && !expectedUrl(r.url())) badResponses.push(`${r.status()} ${r.url()}`); });
  const BARE = /Failed to load resource|is not allowed by Access-Control-Allow-Origin|due to access control checks/i;
  const onlyExpected = () => sawExpected && failedUrls.every(expectedUrl) && badResponses.length === 0;
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    const loc = (m.location() && m.location().url) || "";
    if (expectedUrl(t) || expectedUrl(loc)) return;
    if (BARE.test(t) && onlyExpected()) return;
    seen.push(t);
  });
  /* The 404 has to be MANUFACTURED. server.js falls back to index.html for every unknown path,
     so a link to a missing stylesheet comes back 200 with HTML and the browser complains about
     the MIME type at most -- measured, after the first version of this control sat silent. The
     route below returns a real 404 for one URL, which is both the honest shape of a broken asset
     and the branch of the filter worth proving: an unexpected bad response must defeat the
     suppression. */
  await page.route("**/control-broken-asset.css", (route) =>
    route.fulfill({ status: 404, contentType: "text/plain", body: "not found" }));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "/control-broken-asset.css";
    document.head.appendChild(l);
  });
  await page.waitForTimeout(1500);
  checks++;
  if (!seen.length) {
    failures.push("[control] a 404 stylesheet produced no console error the filter would report, " +
                  "so the \"no console error\" assertion cannot see a broken resource");
  } else {
    console.log(`  negative control fired: a missing stylesheet still reported (${seen[0].slice(0, 60)})`);
  }
  await browser.close();
}

server.kill();

console.log();
if (failures.length) {
  console.log(`check-guide-devices FAILED: ${failures.length} of ${checks} checks, across ${ENGINES.length} engine(s) x ${VIEWPORTS.length} viewports.`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`check-guide-devices OK: the Guide opens, answers, fits and closes on ${ENGINES.map((e) => e.name).join(", ")} at ${VIEWPORTS.map((v) => v.name).join(", ")} -- ${checks} checks, and a displaced mark still fails.`);
