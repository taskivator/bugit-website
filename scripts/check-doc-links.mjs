import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishedCopy } from "./lib/published-copy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = join(root, "public", "docs");

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return extname(entry.name).toLowerCase() === ".md" ? [path] : [];
  });
}

const files = markdownFiles(docsRoot);
if (files.length === 0) {
  console.error("No Markdown documentation files found.");
  process.exit(1);
}

const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
let checked = 0;
let missing = 0;

/* SITE ROUTES ARE LINKS TOO (2026-09-24). This file used to skip every `#` link, which was
   harmless while the documents linked raw files such as /public/docs/PRIVACY.md. They now link
   the site's own pages instead (#/docs/privacy, #/docs/security), so the skip had quietly become
   "check nothing": the last file link went and this reported 0 links exercised. A `#/...` link
   is a claim that a route exists, and `docRoutes` in app.js is the authority for that, the same
   one scripts/check-seo.mjs reads for _redirects. A bare in-page anchor (`#section`) is still
   out of scope. */
const appSource = readFileSync(join(root, "app.js"), "utf8");
const routeTable = appSource.match(/const docRoutes=\[([^\]]*)\];/);
if (!routeTable) {
  console.error("Could not read docRoutes out of app.js, so no #/ link can be checked.");
  process.exit(1);
}
const docRoutes = new Set([...routeTable[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(linkPattern)) {
    const href = match[1];
    if (href.startsWith("#/")) {
      checked++;
      const route = href.slice(2).split("?", 1)[0];
      const display = relative(root, file).replaceAll("\\", "/");
      if (docRoutes.has(route)) {
        console.log(`  ok       ${display} -> ${href}`);
      } else {
        console.error(`  MISSING  ${display} -> ${href} (no such route in app.js docRoutes)`);
        missing++;
      }
      continue;
    }
    if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) continue;

    checked++;
    const pathOnly = decodeURIComponent(href.split("#", 1)[0].split("?", 1)[0]);
    const target = pathOnly.startsWith("/")
      ? join(root, pathOnly)
      : resolve(dirname(file), pathOnly);
    const display = relative(root, file).replaceAll("\\", "/");

    if (existsSync(target)) {
      console.log(`  ok       ${display} -> ${href}`);
    } else {
      console.error(`  MISSING  ${display} -> ${href}`);
      missing++;
    }
  }
}

console.log(`\nChecked ${checked} local documentation links, ${missing} missing.`);
if (checked === 0) {
  console.error("Documentation link check did not exercise any local links.");
  process.exit(1);
}
if (missing === 0) console.log("Documentation link check passed for public/docs against app.js.");

/* THE PUBLISHED PAGES ARE LINKS TOO (2026-10-04). On that day bugit.dev became the redesign:
   build.js publishes v2/index.html as / and v2/docs/index.html as /docs/, and the documentation
   now lives at /docs/#/docs/... and is routed by v2/docs/docs.js, not by app.js. Everything above
   still runs, because app.js and public/docs still ship, but it was checking the links of a page
   nobody is served, while the links a visitor actually clicks (the homepage HTML, its ten language
   files, the docs page, the docs content, and hrefs written into the v2 scripts) sat behind nothing.

   So this section asks two more questions, of the copy scripts/lib/published-copy.mjs says is
   published (the list is read from there, never restated here):
     1. Every `#/...` link in public/docs must ALSO be a route of the new docs page, since
        docs.js renders those documents and keeps the hash link on /docs/.
     2. Every local href/src in the published copy must reach something production serves:
        `#/route` and `/docs/#/route` must be a route in docs.js (its `r:` table plus ALIAS, the
        same authority scripts/check-seo.mjs reads), a bare `#id` on the homepage must be an id
        in v2/index.html, and a path must be a file in the tree. A path to /v2/ or /v2/docs/ is
        refused outright: build.js publishes the two pages at / and /docs/ and deliberately does
        not copy them under /v2/, so such a link is the not-found page in production while it
        resolves perfectly on a local preview of the source tree. build.js refuses that shape in
        the page HTML it writes, but never sees the language files, which is where it was found.
   The scan is a function so it can be run over planted defects in memory first; if any planted
   defect is not reported this guard fails rather than trusting its own zero. */
const docsJs = readFileSync(join(root, "v2", "docs", "docs.js"), "utf8");
const v2Routes = new Set([
  "docs",
  ...[...docsJs.matchAll(/\{\s*r:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...(docsJs.match(/var ALIAS\s*=\s*\{([^}]*)\}/)?.[1] ?? "").matchAll(/"([^"]+)"\s*:/g)].map((m) => m[1]),
]);
if (v2Routes.size < 8) {
  console.error(`Read only ${v2Routes.size} route(s) out of v2/docs/docs.js; the route table moved, so no published link can be checked.`);
  process.exit(1);
}
const homeIds = new Set(
  [...readFileSync(join(root, "v2", "index.html"), "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]),
);

// The route a `#/...` fragment names, with docs.js's own normalisation (the leading `#/` dropped).
const routeOf = (fragment) => fragment.replace(/^#\/?/, "").split("?", 1)[0];
const OTHER_ORIGIN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** Why one href from a published entry does not resolve, or null when it does. */
function publishedLinkProblem(entry, href) {
  if (OTHER_ORIGIN.test(href)) return null;
  if (href.startsWith("#/")) {
    return v2Routes.has(routeOf(href)) ? null : `no route "${routeOf(href)}" in v2/docs/docs.js`;
  }
  if (href.startsWith("#")) {
    // Only the homepage's anchors are static; the docs page builds its contents ids at run time.
    const onHome = entry.file === "v2/index.html" || entry.kind === "home";
    if (!onHome || href === "#") return null;
    return homeIds.has(href.slice(1)) ? null : `no element with id="${href.slice(1)}" in v2/index.html`;
  }
  const hashAt = href.indexOf("#");
  const pathPart = decodeURIComponent((hashAt === -1 ? href : href.slice(0, hashAt)).split("?", 1)[0]);
  const fragment = hashAt === -1 ? "" : href.slice(hashAt);
  const base = entry.file.startsWith("v2/docs/") || entry.kind === "docs" ? "/docs/" : "/";
  const abs = pathPart.startsWith("/") ? pathPart : base + pathPart;
  if (/^\/v2\/(?:docs\/?)?(?:index\.html)?$/.test(abs)) {
    return "a /v2/ page: build.js publishes the pages at / and /docs/ only and refuses this shape in page HTML; production reaches it only via a 302 in _redirects";
  }
  if (abs.split("/").some((seg) => seg.startsWith("_")) || abs.startsWith("/v2/tools/")) {
    return "a path build.js does not publish";
  }
  let file;
  if (abs === "/" || abs === "/index.html") file = join(root, "v2", "index.html");
  else if (/^\/docs\/?(?:index\.html)?$/.test(abs)) file = join(root, "v2", "docs", "index.html");
  else if (abs.startsWith("/articles/")) file = join(root, "v2", abs.replace(/\/$/, "/index.html").slice(1));
  else file = join(root, abs.replace(/\/$/, "/index.html"));
  if (!existsSync(file)) return `nothing at ${abs} in the source tree`;
  if (fragment.startsWith("#/")) {
    if (file !== join(root, "v2", "docs", "index.html")) return "a #/ route on a page that is not the docs page";
    if (!v2Routes.has(routeOf(fragment))) return `no route "${routeOf(fragment)}" in v2/docs/docs.js`;
  }
  return null;
}

/** Every local link in one published entry: attribute values, and route literals in scripts. */
function scanPublishedLinks(entry) {
  const hrefs = new Set();
  for (const m of entry.text.matchAll(/(?:href|src)\s*=\s*(["'])([^"'\s]*?)\1/g)) if (m[2]) hrefs.add(m[2]);
  if (entry.kind === "script") {
    for (const m of entry.text.matchAll(/(["'])((?:\/v2)?(?:\/docs\/)?#\/(?:docs|support)[^"'\s]*)\1/g)) hrefs.add(m[2]);
  }
  return [...hrefs].filter((h) => !OTHER_ORIGIN.test(h)).map((href) => ({ href, problem: publishedLinkProblem(entry, href) }));
}

// Negative control, in memory only: each planted defect must be reported, the good one must not.
{
  const planted = [
    { href: "/docs/#/docs/nonesuch", bad: true },
    { href: "/v2/docs/#/docs/refund", bad: true },
    { href: "/public/docs/NO_SUCH_FILE.md", bad: true },
    { href: "#/docs/nonesuch", bad: true },
    { href: "#nonesuch-section", bad: true },
    { href: "/docs/#/docs/refund", bad: false },
  ];
  const synthetic = {
    file: "v2/i18n/xx.json", lang: "xx", kind: "home",
    text: planted.map((p) => `<a href="${p.href}">x</a>`).join("\n"),
  };
  const found = new Map(scanPublishedLinks(synthetic).map((r) => [r.href, r.problem]));
  let broken = 0;
  for (const p of planted) {
    if (!found.has(p.href)) { console.error(`  CONTROL  ${p.href} was not even extracted`); broken++; continue; }
    if (Boolean(found.get(p.href)) !== p.bad) {
      console.error(`  CONTROL  ${p.href} ${p.bad ? "was NOT reported" : "was reported"}: ${found.get(p.href)}`);
      broken++;
    }
  }
  if (broken) {
    console.error("Published-page link check: negative control did not fire; the scan cannot be trusted.");
    process.exit(1);
  }
}

let publishedChecked = 0;
let publishedMissing = 0;
const pagesSeen = new Set();
for (const file of files) {
  for (const match of readFileSync(file, "utf8").matchAll(linkPattern)) {
    const href = match[1];
    if (!href.startsWith("#/")) continue;
    publishedChecked++;
    if (!v2Routes.has(routeOf(href))) {
      console.error(`  MISSING  ${relative(root, file).replaceAll("\\", "/")} -> ${href} (no such route in v2/docs/docs.js)`);
      publishedMissing++;
    }
  }
}
for (const entry of publishedCopy()) {
  for (const { href, problem } of scanPublishedLinks(entry)) {
    publishedChecked++;
    if (entry.kind === "page") pagesSeen.add(entry.file);
    if (problem) {
      console.error(`  MISSING  ${entry.file} -> ${href} (${problem})`);
      publishedMissing++;
    }
  }
}
console.log(`Checked ${publishedChecked} links against the published pages and the v2 docs routes, ${publishedMissing} missing.`);
if (pagesSeen.size < 2) {
  console.error(`Only ${pagesSeen.size} published page(s) yielded any link; the published copy was not actually scanned.`);
  process.exit(1);
}
if (missing > 0 || publishedMissing > 0) process.exit(1);
console.log("Documentation link check passed.");
