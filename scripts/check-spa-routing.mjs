// SPA routing guard, in a real browser.
//
// A mistyped hash, a stale bookmark or a broken inbound link used to end the session: the
// 404 renderer replaced the whole of #docView, destroying the .docs-layout that holds
// #docNav and #docContent, and nothing ever rebuilt them. Every later docs link then threw
// "Cannot read properties of null (reading 'classList')" and re-rendered the 404, so the
// only way back to the documentation was a full page reload. External LQA report FUNC-001.
//
// Checked by driving the routes and reading the DOM, because the failure is a property of
// what the renderer leaves behind, not of any string in app.js.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";

// Ephemeral port, and the server's own exit is watched: a hardcoded port lets a harness
// answer to somebody else's server, which is how it passes against a stale build.
const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(), env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
});
let serverExit = null;
server.on("exit", (code, signal) => { serverExit = signal || `code ${code}`; });
const base = `http://127.0.0.1:${PORT}`;
const fail = [];

const state = (page) => page.evaluate(() => ({
  docNav: !!document.getElementById("docNav"),
  docContent: !!document.getElementById("docContent"),
  docView: !!document.getElementById("docView"),
  homeHidden: document.getElementById("homeView")?.hidden ?? null,
  docHidden: document.getElementById("docView")?.hidden ?? null,
  h1: document.querySelector("#docView h1")?.textContent?.trim() || "",
  // The DOCUMENT LIST, not every link in the sidebar. The sidebar carries a second list
  // now -- the contents of the document being read -- whose length is a property of that
  // document (fifteen clauses in the licence, twelve sections in the privacy statement, none
  // on the index). Counting both together compares two different things and calls the
  // difference a regression.
  navLinks: document.querySelectorAll("#docNav .docs-nav-list a").length,
  tocLinks: document.querySelectorAll("#docNav .doc-toc a").length,
}));

const go = async (page, hash) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(500);
  return state(page);
};

try {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error(`the site server exited before serving anything (${serverExit})`);
    try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 250)); }
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(base, { waitUntil: "networkidle" });
  await page.click("#consentReject").catch(() => {});
  await page.waitForTimeout(200);

  // A real docs route first, so the "after 404" numbers have something to be compared to.
  const good = await go(page, "#/docs/faq");
  if (!good.h1) fail.push("#/docs/faq did not render a heading before any 404 was involved");
  const navLinksWhenHealthy = good.navLinks;

  const missing = await go(page, "#/nonexistent");
  if (!missing.h1) fail.push("#/nonexistent rendered no not-found heading");
  for (const id of ["docView", "docNav", "docContent"]) {
    if (!missing[id]) fail.push(`the 404 view removed #${id} from the document`);
  }

  // The step that used to throw. Alternating proves recovery works in both directions,
  // not just once.
  for (const [from, to] of [["#/nonexistent", "#/docs/faq"], ["#/nope-again", "#/docs/privacy"],
                            ["#/still-nothing", "#/docs"]]) {
    await go(page, from);
    const back = await go(page, to);
    if (!back.docNav || !back.docContent)
      fail.push(`${from} -> ${to}: the docs containers are gone`);
    if (!back.h1 || /not found|introuvable|no encontrada/i.test(back.h1))
      fail.push(`${from} -> ${to}: still showing the not-found view ("${back.h1}")`);
    if (back.navLinks !== navLinksWhenHealthy)
      fail.push(`${from} -> ${to}: sidebar has ${back.navLinks} links, expected ${navLinksWhenHealthy}`);
  }

  // A bare "#anchor" is an in-page link, not an unknown route: it must not 404.
  await page.goto(base, { waitUntil: "networkidle" });
  const anchor = await go(page, "#pricing");
  if (anchor.homeHidden) fail.push("#pricing (an in-page anchor) left the homepage hidden");

  if (errors.length) fail.push("page errors: " + errors.join(" | "));
  await browser.close();
} finally {
  server.kill();
}

if (fail.length) {
  console.error("check-spa-routing FAILED:\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log("check-spa-routing OK: an unknown route is recoverable, and in-page anchors still work.");
