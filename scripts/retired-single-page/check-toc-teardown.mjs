// A DOCUMENT THAT HAS GONE MUST STOP LISTENING (CR-08-F02).
//
// WHY THIS EXISTS. The contents list on every documentation page is driven by a scroll spy that
// puts six listeners on the WINDOW: scroll, resize, wheel, touchmove, mousedown and keydown. The
// list's own __detach is the only thing that removes them, and the code that called it looked
// for the old list in the page. It looked too late. renderDocRoute() had already rewritten
// #docNav (where the list lives below 1200px) and #docContent (where it lives above), so the
// old list was no longer in the document, the lookup found nothing, and its six listeners stayed
// behind. Every documentation click added six more, each one measuring the headings of a page
// the reader had left, for the rest of the visit. Nothing on screen showed it: the NEW list
// worked perfectly, which is why every guard that looks at the contents list passed.
//
// WHAT IT ASSERTS. The window's listeners of those six types are counted by wrapping
// addEventListener/removeEventListener before the page's own script runs. Then, at a wide and a
// narrow viewport (the list lives in a different container at each), the reader clicks through
// documents that have a contents list, lands on a mistyped route, returns to the homepage, and
// does it again:
//   1. every open document holds the same number of window listeners, visit after visit;
//   2. leaving a document releases exactly one list's worth (six);
//   3. the homepage and the not-found page do not gain listeners from one round to the next.
//
// NEGATIVE CONTROL. The same walk is run with app.js rewritten on the wire so the teardown calls
// at the top of renderDocRoute() and renderNotFound(), and the active-list handle, are gone
// again, which is the shape of the defect. Every rewrite must apply, the walk must complete, and the control must produce the
// specific violation this guard exists for (listeners growing across the walk). A control that
// throws, or that fails for some other reason, proves nothing and fails the guard.
//
// Run: `node scripts/check-toc-teardown.mjs` (or `npm run test:toc-teardown`).
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const TYPES = ["scroll", "resize", "wheel", "touchmove", "mousedown", "keydown"];

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
  console.error(`check-toc-teardown: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}
const done = () => {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
};

// Runs in the page before app.js. Counts LIVE window listeners of the six types by identity,
// the way the browser does: the same (type, fn, capture) added twice is one listener.
const COUNTER = (types) => {
  const live = new Map();
  const key = (t, f, o) => t + "|" + (typeof o === "boolean" ? o : !!(o && o.capture));
  const add = EventTarget.prototype.addEventListener;
  const rem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (t, f, o) {
    if (this === window && types.includes(t) && f) {
      const k = key(t, f, o);
      if (!live.has(f)) live.set(f, new Set());
      live.get(f).add(k);
    }
    return add.call(this, t, f, o);
  };
  EventTarget.prototype.removeEventListener = function (t, f, o) {
    if (this === window && types.includes(t) && f && live.has(f)) {
      live.get(f).delete(key(t, f, o));
      if (!live.get(f).size) live.delete(f);
    }
    return rem.call(this, t, f, o);
  };
  window.__tocListeners = () => { let n = 0; for (const s of live.values()) n += s.size; return n; };
};

// Documents whose contents list is built from a fetched file: the licence (clauses) and the
// privacy statement (headings). Both have far more than the three sections a list needs.
const WITH_TOC = ["#/docs/license", "#/docs/privacy", "#/docs/security"];

async function walk(page) {
  const count = () => page.evaluate(() => window.__tocListeners());
  const go = async (hash, expectToc) => {
    await page.evaluate((h) => { location.hash = h; }, hash);
    if (expectToc) {
      await page.waitForFunction(() => document.querySelectorAll("#docView .doc-toc a").length >= 3, null, { timeout: 15000 });
    } else {
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(250);
  };
  await page.goto(base + "/#/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  try { await page.locator("#consentReject").click({ timeout: 2500 }); } catch {}
  const baseline = await count();
  const rounds = [];
  for (let round = 0; round < 2; round++) {
    const open = [];
    for (const h of WITH_TOC) { await go(h, true); open.push(await count()); }
    await go("#/docs/no-such-page", false);
    const notFound = await count();
    await go("#/docs/license", true);
    open.push(await count());
    await go("#/", false);
    const home = await count();
    rounds.push({ open, notFound, home });
  }
  return { baseline, rounds };
}

function judge(r) {
  const v = [];
  const all = r.rounds.flatMap((x) => x.open);
  // Every document visit holds exactly one contents list, so every visit reads the same count.
  // A count that climbs from visit to visit is the leak itself.
  if (new Set(all).size !== 1) v.push(`listeners grew while moving between documents: ${all.join(", ")}`);
  const [a, b] = r.rounds;
  if (a.home !== b.home) v.push(`listeners grew on the homepage between rounds: ${a.home} then ${b.home}`);
  if (a.notFound !== b.notFound) v.push(`listeners grew on the not-found page between rounds: ${a.notFound} then ${b.notFound}`);
  // Leaving a document must hand back exactly one list's worth. (The homepage count after the
  // first visit can sit above the first-load count: the documentation view registers one
  // listener of its own the first time it opens, once, and keeps it. That is not a list.)
  for (const [i, x] of r.rounds.entries()) {
    const back = x.open[x.open.length - 1] - x.home;
    if (back !== TYPES.length) v.push(`round ${i + 1}: leaving a document released ${back} window listeners, one contents list holds ${TYPES.length}`);
    if (x.notFound >= Math.min(...x.open)) v.push(`round ${i + 1}: the not-found page holds ${x.notFound} listeners, as many as an open document (${Math.min(...x.open)})`);
  }
  return v;
}

// The defect, restored: no teardown before the containers are rewritten.
const BREAKS = [
  ["docRenderToken++;docTeardownToc();\n  nav.hidden=true;", "nav.hidden=true;", "renderNotFound teardown"],
  ["docRenderToken++;docTeardownToc();\n    const lang=", "const lang=", "homepage teardown"],
  ["docTeardownToc();\n  const _dn=", "const _dn=", "renderDocRoute teardown"],
  // and the handle, without which docBuildToc() is back to looking for the old list in the page.
  ["docSpy(toc,heads);\n  docActiveToc=toc;", "docSpy(toc,heads);", "the active-list handle"],
];
function breakTeardown(src) {
  let out = src.replace(/\r\n/g, "\n");
  for (const [from, to, what] of BREAKS) {
    if (!out.includes(from)) throw new Error(`negative control could not apply (${what} not found in app.js); update BREAKS`);
    out = out.replace(from, to);
  }
  return out;
}

let measured = 0;
const browser = await chromium.launch();
try {
  for (const [w, h] of [[1440, 900], [820, 900]]) {
    const layout = w >= 1200 ? "wide (list in the document)" : "narrow (list in the sidebar)";
    // Subject.
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      await ctx.addInitScript(COUNTER, TYPES);
      const page = await ctx.newPage();
      const r = await walk(page);
      measured++;
      if (r.rounds.some((x) => x.open.some((n) => n < r.baseline + TYPES.length))) {
        fail.push(`${w}px: a document with a contents list added no window listener at all, so the counter is not seeing the spy (baseline ${r.baseline}, open ${r.rounds.map((x) => x.open.join("/")).join(" ; ")})`);
      }
      for (const v of judge(r)) fail.push(`${w}px ${layout}: ${v}`);
      console.log(`  ${w}px ${layout}: homepage ${r.baseline}, documents ${r.rounds.map((x) => x.open.join("/")).join(" then ")}, not-found ${r.rounds.map((x) => x.notFound).join("/")}, home ${r.rounds.map((x) => x.home).join("/")}`);
      await ctx.close();
    }
    // Negative control.
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      await ctx.addInitScript(COUNTER, TYPES);
      let applied = false, rewriteError = null;
      await ctx.route("**/app*.js", async (route) => {
        const res = await route.fetch();
        try { const body = breakTeardown(await res.text()); applied = true; route.fulfill({ response: res, body }); }
        catch (e) { rewriteError = e; route.fulfill({ response: res }); }
      });
      const page = await ctx.newPage();
      let r = null, err = null;
      try { r = await walk(page); } catch (e) { err = e; }
      await ctx.close();
      if (rewriteError) { fail.push(`${w}px negative control: ${rewriteError.message}`); continue; }
      if (!applied) { fail.push(`${w}px negative control: app.js was never intercepted, so the control measured the fixed code`); continue; }
      if (err) { fail.push(`${w}px negative control did not complete (${String(err).split("\n")[0]}), so it proves nothing`); continue; }
      const grew = judge(r).some((v) => /grew while moving between documents/.test(v));
      if (!grew) fail.push(`${w}px negative control: with the teardown removed the listeners did NOT grow (${r.rounds.map((x) => x.open.join("/")).join(" then ")}), so this guard cannot see the defect`);
      else console.log(`  ${w}px negative control: teardown removed -> ${r.rounds.map((x) => x.open.join("/")).join(" then ")} (caught)`);
    }
  }
} catch (e) {
  fail.push(`harness: ${String(e).split("\n")[0]}`);
} finally {
  await browser.close().catch(() => {});
  done();
}

if (!measured) { console.error("check-toc-teardown: nothing was measured."); process.exit(1); }
if (fail.length) {
  console.error(`\ncheck-toc-teardown: FAIL (${fail.length})`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-toc-teardown: OK (${measured} viewports, listeners bounded by one contents list, negative control caught)`);
