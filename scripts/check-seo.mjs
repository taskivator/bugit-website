/**
 * Search-visibility guard for bugit.dev.
 *
 * WHY THIS EXISTS. On 2026-09-23 this project ran its first search-visibility audit. Eighty-five
 * gate scripts covered this site at the time, and the total search coverage among them was two
 * assertions in check-assets.mjs saying robots.txt and sitemap.xml return 200. Nothing checked
 * whether anything was reachable, indexable, or correctly described.
 *
 * What that absence was hiding:
 *   - seventeen of seventeen obvious entry points answered 404, including /privacy and /terms,
 *     the two a customer or a regulator is most likely to type by hand;
 *   - forty-odd raw .md and .txt sources under /public/docs were fully indexable with no
 *     canonical and no noindex, competing with the pages they are the source of;
 *   - four searches, one of them an exact-phrase search for this site's own meta description,
 *     returned bugit.dev nowhere and the public GitHub repository first.
 *
 * WHAT THIS CHECKS, AND WHY EACH ONE IS HERE RATHER THAN ASSUMED.
 *
 * The important assertion is the redirect one. `_redirects` is a list of CLAIMS that routes
 * exist. A redirect whose destination has been renamed does not fail loudly: it answers 200 and
 * shows the wrong page, which is strictly worse than the 404 it replaced. So every destination
 * is resolved against the authorities that actually define the routes: `docRoutes` in app.js for
 * the /#/... targets and the id attributes in index.html for the /#... ones. That is the same
 * discipline as check-tracker-claims.mjs, which resolves advertised trackers against
 * tracker_routing.FILEABLE rather than against a list someone typed.
 *
 * This gate is deliberately OFFLINE. It reads the source tree, so it runs in CI, on a branch and
 * before a deploy rather than after one. Live delivery is check-live-delivery.mjs's job.
 *
 * Every parser below is self-tested first. A gate whose parser silently returns nothing reports
 * a clean pass over a file it never understood, which is the failure this project has recorded
 * more often than any other.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

let fails = 0;
const check = (ok, what, detail = "") => {
  if (ok) {
    console.log("  ok   " + what);
    return true;
  }
  fails++;
  console.error("  FAIL " + what + (detail ? "\n       " + detail : ""));
  return false;
};

// ---------------------------------------------------------------- parsers, and their self-tests

/** Cloudflare `_redirects`: `#` is a comment ONLY at the start of a line, so fragments parse. */
function parseRedirects(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const [from, to, code] = line.trim().split(/\s+/);
    if (from && to) out.push({ from, to, code: code || "302" });
  }
  return out;
}

/** Cloudflare `_headers`: a bare path starts a rule, indented `Name: value` lines belong to it. */
function parseHeaders(text) {
  const rules = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (!raw.startsWith(" ") && !raw.startsWith("\t")) {
      cur = { pattern: line, headers: {} };
      rules.push(cur);
      continue;
    }
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m && cur) cur.headers[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return rules;
}

console.log("check-seo: parser self-tests");
{
  const r = parseRedirects("# a comment\n/pricing /#pricing 302\n\n/x /y\n");
  check(
    r.length === 2 && r[0].to === "/#pricing" && r[1].code === "302",
    "the redirect parser keeps a mid-line fragment and defaults the status",
    "got " + JSON.stringify(r),
  );
  const h = parseHeaders("# c\n/*\n  A: 1\n/public/docs/*\n  X-Robots-Tag: noindex\n");
  check(
    h.length === 2 && h[1].headers["x-robots-tag"] === "noindex",
    "the headers parser attaches indented headers to the preceding rule",
    "got " + JSON.stringify(h),
  );
}

// ---------------------------------------------------------------- 1. redirects point at real routes
console.log("\ncheck-seo: every redirect destination is a route that exists");
const app = read("app.js");
const html = read("index.html");

const mDoc = app.match(/const docRoutes\s*=\s*\[([^\]]*)\]/);
const docRoutes = mDoc ? [...mDoc[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
check(
  docRoutes.length >= 5,
  "docRoutes was read out of app.js",
  "found " + docRoutes.length + ": " + docRoutes.join(", ") +
    " -- if this is empty the declaration moved and every check below is vacuous",
);

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
check(
  ids.has("pricing") && ids.has("features"),
  "section ids were read out of index.html",
  ids.size + " ids found -- a positive control on two that must exist",
);

const redirects = parseRedirects(read("_redirects"));
check(redirects.length > 0, "_redirects has rules", redirects.length + " parsed");

const seenFrom = new Set();
for (const { from, to, code } of redirects) {
  if (seenFrom.has(from)) {
    check(false, "_redirects maps " + from + " twice", "the first rule wins; the second is dead and misleading");
  }
  seenFrom.add(from);

  if (!["301", "302", "303", "307", "308"].includes(code)) {
    check(false, from + " uses status " + code, "Cloudflare Pages supports 301, 302, 303, 307 and 308 for redirects");
  }

  if (to.startsWith("/#/")) {
    const slug = to.slice(3);
    check(
      docRoutes.includes(slug),
      from + " -> " + to + " names a real SPA route",
      '"' + slug + '" is not in docRoutes. A redirect to a renamed route answers 200 and shows the wrong page.',
    );
  } else if (to.startsWith("/#")) {
    const anchor = to.slice(2);
    check(
      ids.has(anchor),
      from + " -> " + to + " names a real section id",
      'no element in index.html has id="' + anchor + '"',
    );
  } else if (!to.startsWith("http")) {
    check(fs.existsSync(path.join(root, to.replace(/^\//, ""))), from + " -> " + to + " resolves to a file");
  }
}

// ---------------------------------------------------------------- 2. raw sources are not indexable
console.log("\ncheck-seo: the raw documentation sources are not offered as search results");
const headerRules = parseHeaders(read("_headers"));
const docsRule = headerRules.find((r) => r.pattern === "/public/docs/*");
check(Boolean(docsRule), "_headers has a /public/docs/* rule");
check(
  Boolean(docsRule) && /noindex/.test(docsRule.headers["x-robots-tag"] || ""),
  "/public/docs/* sends X-Robots-Tag: noindex",
  "without it every .md and .txt source under that path is a candidate search result competing " +
    "with the page it came from",
);

const catchAll = headerRules.find((r) => r.pattern === "/*");
check(Boolean(catchAll), "_headers still has its /* rule");
check(
  !catchAll || !/noindex/.test(catchAll.headers["x-robots-tag"] || ""),
  "/* does NOT send noindex",
  "a noindex on the catch-all rule removes the entire site from search and is invisible in a browser",
);

// ---------------------------------------------------------------- 3. crawl entry points
console.log("\ncheck-seo: robots.txt and sitemap.xml agree with the site");
const robots = read("robots.txt");
check(/^\s*User-agent:\s*\*/im.test(robots), "robots.txt has a User-agent: * group");
check(!/^\s*Disallow:\s*\/\s*$/im.test(robots), "robots.txt does not disallow the whole site");
const smLine = robots.match(/^\s*Sitemap:\s*(\S+)/im);
check(Boolean(smLine), "robots.txt names a sitemap");
check(
  Boolean(smLine) && smLine[1] === "https://bugit.dev/sitemap.xml",
  "the sitemap it names is the absolute production URL",
  smLine ? "got " + smLine[1] : "",
);

const sitemap = read("sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check(locs.length > 0, "sitemap.xml lists at least one URL");
for (const loc of locs) {
  check(loc.startsWith("https://bugit.dev/"), loc + " is an absolute production URL");
  check(
    !loc.includes("#"),
    loc + " carries no fragment",
    "a hash is never sent to a server, so a fragment URL is not a valid sitemap entry",
  );
}

// ---------------------------------------------------------------- 4. the page describes itself
console.log("\ncheck-seo: the homepage carries the tags a search engine reads");
const one = (re, what) => {
  const m = html.match(re);
  check(Boolean(m), what, m ? "" : "not found in index.html");
  return m ? m[1] : null;
};
const canonical = one(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i, "a canonical link is present");
check(canonical === "https://bugit.dev/", "the canonical is the absolute production origin", "got " + canonical);
const ogUrl = one(/<meta[^>]*property="og:url"[^>]*content="([^"]*)"/i, "og:url is present");
check(ogUrl === canonical, "og:url agrees with the canonical", "og:url " + ogUrl + " vs canonical " + canonical);
one(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i, "a meta description is present");

const h1s = (html.match(/<h1[\s>]/g) || []).length;
check(h1s === 1, "the static homepage has exactly one h1", "found " + h1s);
check(!/<meta[^>]*name="robots"[^>]*noindex/i.test(html), "index.html carries no noindex");

// ---------------------------------------------------------------- 5. structured data
console.log("\ncheck-seo: structured data parses and says what it should");
const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (check(Boolean(ld), "index.html has a JSON-LD block")) {
  let parsed = null;
  try {
    parsed = JSON.parse(ld[1]);
  } catch (e) {
    check(false, "the JSON-LD parses", e.message);
  }
  if (parsed) {
    const nodes = parsed["@graph"] || [parsed];
    const types = nodes.map((n) => n["@type"]);
    for (const t of ["WebSite", "Organization", "SoftwareApplication"]) {
      check(types.includes(t), "the graph declares a " + t + " node", "got: " + types.join(", "));
    }
    const appNode = nodes.find((n) => n["@type"] === "SoftwareApplication");
    if (appNode) {
      for (const k of ["name", "applicationCategory", "operatingSystem", "offers"]) {
        check(Boolean(appNode[k]), "SoftwareApplication declares " + k);
      }
    }
    const site = nodes.find((n) => n["@type"] === "WebSite");
    if (site) check(Boolean(site.name), "WebSite declares the name Google prints above a result");

    // Claims about features this site does not have.
    check(
      !JSON.stringify(parsed).includes("SearchAction"),
      "no SearchAction is declared",
      "Google retired the sitelinks searchbox in 2023 and this site has no search endpoint",
    );
    check(
      !types.includes("FAQPage"),
      "no FAQPage node is declared",
      "Google removed the FAQ search appearance in June 2026; marking it up changes nothing and " +
        "has to be maintained",
    );
  }
}

console.log(
  fails
    ? "\ncheck-seo: " + fails + " FAILURE(S)"
    : "\ncheck-seo OK: " + redirects.length + " redirects all resolve to routes that exist, the raw " +
      "doc sources are noindex, the site is crawlable, and the structured data claims nothing untrue.",
);
process.exit(fails ? 1 : 0);
