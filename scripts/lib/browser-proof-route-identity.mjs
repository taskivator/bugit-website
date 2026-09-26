// WHICH DOCUMENT DID THE BROWSER ACTUALLY RENDER? Asked of the page, never of the URL.
//
// WHY THIS FILE EXISTS. Two browser sweeps claimed multi-route coverage they did not have.
//
//   check-forced-colors built its routes as PATHNAMES ("/docs/user-guide") on a site whose router
//   reads `location.hash`. server.js answers any unknown path with index.html, so every "route"
//   rendered the home page, and the High Contrast sweep counted three renders of it as three
//   different templates (external code review CR-08-F34).
//
//   check-mobile-chrome had learned that lesson and added a check that the routes rendered
//   different documents -- and put `location.hash` into the fingerprint it compared. Different
//   requested hashes make different fingerprints by construction, so a router that rendered one
//   page under every hash still passed the check written to catch exactly that (CR-08-F20).
//
// Both are the same mistake: the address was used as evidence of the content. So identity here is
// read ONLY from what rendered -- which of the two views is showing, and the heading inside it --
// and the requested route is used for one thing, deciding what we EXPECTED to see. Distinctness
// is then compared on the rendered identity alone, with intentional aliases declared by name
// rather than tolerated by accident.

/** The router's own table of document routes, read from app.js source. */
export function docRoutesFrom(appJs) {
  return JSON.parse(appJs.match(/const docRoutes=(\[.*?\]);/s)[1].replace(/'/g, '"'));
}

/* TWO ROUTES THAT ARE ONE DOCUMENT ON PURPOSE. `docs/getting-started` and `docs/user-guide` both
   render the User Guide under the same heading (app.js `titles`). They are required to be EQUAL,
   not merely allowed to be: an alias that started rendering something else is also a change. */
export const ROUTE_ALIASES = { "docs/getting-started": "docs/user-guide" };

/** "/#/docs/refund", "#/docs/refund", "docs/refund" -> "docs/refund"; "/" and "" -> "". */
export function routeKey(route) {
  const s = String(route || "");
  const hash = s.includes("#") ? s.slice(s.indexOf("#") + 1) : s;
  return hash.replace(/^\/+/, "").replace(/\/+$/, "");
}
const canonical = (key) => ROUTE_ALIASES[key] || key;
export const expectedView = (key) => (key === "" ? "home" : "doc");

/* Runs IN THE PAGE. Self-contained, because Playwright serialises it. `view` is which <main> is
   showing, `h1` the heading inside it, `busy` whether the document body is still fetching (the
   router writes a skeleton with aria-busy and clears it when the text lands), `lang` the language
   the page says it rendered in. */
export const RENDERED_IDENTITY = () => {
  const shown = (el) => !!el && !el.hidden && getComputedStyle(el).display !== "none";
  const text = (el) => (el ? el.textContent : "").replace(/\s+/g, " ").trim();
  const home = document.getElementById("homeView");
  const doc = document.getElementById("docView");
  let view = "none", h1 = "", busy = false;
  if (shown(doc) && !shown(home)) {
    const c = document.getElementById("docContent");
    view = c && c.querySelector(".doc-notfound") ? "notfound" : "doc";
    h1 = text(c && c.querySelector("h1"));
    busy = !!(c && c.querySelector('[aria-busy="true"]'));
  } else if (shown(home) && !shown(doc)) {
    view = "home";
    h1 = text(home.querySelector("h1"));
  }
  return { view, h1, busy, lang: document.documentElement.lang || "" };
};

/** Wait until the page shows what `route` should show (or `timeout` passes), then read it. */
export async function readRouteIdentity(page, route, timeout = 8000) {
  const want = expectedView(routeKey(route));
  const ready = `(() => { const id = (${RENDERED_IDENTITY})(); ` +
    `return id.view === ${JSON.stringify(want)} && !!id.h1 && !id.busy; })()`;
  try { await page.waitForFunction(ready, null, { timeout }); } catch { /* judged below */ }
  return page.evaluate(RENDERED_IDENTITY);
}

/** One route's rendered identity against what that route should render. [] when it matches. */
export function judgeOne(route, id) {
  const want = expectedView(routeKey(route));
  const out = [];
  if (!id || id.view !== want) {
    out.push(`${route} rendered the ${id ? id.view : "no"} view, not the ${want} view it routes to` +
      (id && id.h1 ? ` (heading "${id.h1.slice(0, 40)}")` : ""));
    return out;
  }
  if (!id.h1) out.push(`${route} rendered the ${want} view with no heading, so which document it is was never established`);
  if (id.busy) out.push(`${route} was still loading its document when it was measured`);
  return out;
}

/**
 * Judge one cell (one device/engine/language) of routes: each rendered what it routes to, and
 * routes that are different documents rendered different documents. `rows` is [{route, id}].
 */
export function judgeRouteIdentities(rows) {
  const out = [];
  for (const { route, id } of rows) out.push(...judgeOne(route, id));
  // Signature is rendered content only. The route is deliberately NOT part of it (CR-08-F20).
  const sig = (id) => `${id.view}|${id.h1}`;
  const byCanon = new Map();
  for (const { route, id } of rows) {
    if (!id) continue;
    const c = canonical(routeKey(route));
    if (!byCanon.has(c)) byCanon.set(c, []);
    byCanon.get(c).push({ route, s: sig(id) });
  }
  for (const [c, list] of byCanon) {
    if (new Set(list.map((x) => x.s)).size > 1) {
      out.push(`the declared aliases of ${c || "/"} rendered different documents: ` +
        list.map((x) => `${x.route} -> ${x.s}`).join("; "));
    }
  }
  const owner = new Map();
  for (const [c, list] of byCanon) {
    const s = list[0].s;
    if (owner.has(s)) {
      out.push(`${owner.get(s) || "/"} and ${c || "/"} rendered the same document (${s.slice(0, 60)}), ` +
        `so one of them was never reached`);
    } else owner.set(s, c);
  }
  return out;
}

/* THE JUDGE IS JUDGED ON INERT RECORDS every time a guard imports it, so the day someone puts
   the requested hash back into the signature, the guard fails instead of trusting it again. */
export function selfTestRouteIdentity() {
  const H = { view: "home", h1: "The AI QA engineer", busy: false, lang: "en" };
  const D = (h1, busy = false) => ({ view: "doc", h1, busy, lang: "en" });
  const cases = [
    ["every hash rendering the home page (CR-08-F34)", [
      { route: "/", id: H }, { route: "/#/docs/refund", id: H }, { route: "/#/support", id: H }], false],
    ["one document under different hashes (CR-08-F20)", [
      { route: "/", id: H }, { route: "/#/docs/user-guide", id: D("Refund policy") },
      { route: "/#/docs/refund", id: D("Refund policy") }], false],
    ["a document still loading", [{ route: "/", id: H }, { route: "/#/docs/refund", id: D("Refund policy", true) }], false],
    ["an unknown route's not-found view", [{ route: "/#/docs/refund", id: { view: "notfound", h1: "Page not found", busy: false } }], false],
    ["distinct documents", [
      { route: "/", id: H }, { route: "/#/docs/user-guide", id: D("User Guide") },
      { route: "/#/docs/refund", id: D("Refund policy") }, { route: "/#/support", id: D("Support") }], true],
    ["a declared alias rendering its target", [
      { route: "/#/docs/getting-started", id: D("User Guide") }, { route: "/#/docs/user-guide", id: D("User Guide") }], true],
  ];
  const wrong = [];
  for (const [name, rows, want] of cases) {
    const got = judgeRouteIdentities(rows).length === 0;
    if (got !== want) wrong.push(`${name}: judged ${got ? "distinct and reached" : "a failure"}`);
  }
  return wrong;
}
