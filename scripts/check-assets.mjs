// Static link/asset check for the marketing site (zero dependencies).
// Parses index.html for local href/src references and verifies each asset
// resolves on disk at the site root. Route links (no file extension, e.g.
// "/login") are treated as app routes and skipped. Exits non-zero on any
// missing asset so CI fails loudly.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, sep } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");

const refs = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
const unique = [...new Set(refs)];

let missing = 0;
let checked = 0;
for (const ref of unique) {
  const hasExt = /\.[a-z0-9]+$/i.test(ref);
  if (!hasExt) {
    console.log(`  skip (route)   ${ref}`);
    continue;
  }
  checked++;
  const target = join(root, ref); // site root === repo root
  if (existsSync(target)) {
    console.log(`  ok             ${ref}`);
  } else {
    console.error(`  MISSING        ${ref}`);
    missing++;
  }
}

// ---------------------------------------------------------------------------
// THE PATHS A CLIENT ASKS FOR WITHOUT BEING TOLD.
//
// Everything above is driven by what index.html REFERENCES, which is the right subject for a
// link check and is blind by construction to anything nobody links. A browser requests
// /favicon.ico on a cold visit whether or not the page declares an icon, and so do bookmark
// managers, feed readers, link-preview fetchers and some crawlers. bugit.dev answered 404 to
// every one of them: the icon existed at public/brand/favicon.ico and had simply never been
// published where the default lookup goes.
//
// Checked in dist/, because these are things the BUILD is responsible for putting there, and
// a check against the source tree would have gone on passing.
const CONVENTIONAL = [
  ["favicon.ico", "requested on a cold visit whether or not the page declares an icon"],
  ["robots.txt", "the first thing a crawler asks for"],
  ["sitemap.xml", "named by robots.txt, so a 404 here makes that line a dead pointer"],
  ["404.html", "the page a wrong link lands on"],
  ["404.js", "the eleven-language strings 404.html swaps in; without it the page is English"],
];
const dist = join(root, "dist");
if (existsSync(dist)) {
  for (const [file, why] of CONVENTIONAL) {
    checked++;
    if (!existsSync(join(dist, file))) {
      missing++;
      console.error(`FAIL: dist/${file} is missing \u2014 ${why}`);
    }
  }
} else {
  missing++;
  console.error(
    "FAIL: dist/ does not exist, so the conventional root paths were not checked. Run the " +
      "build first; a skipped check here reads exactly like a passing one.",
  );
}

// ---------------------------------------------------------------------------
// AND NOTHING IN dist/ THAT A BROWSER CANNOT RUN.
//
// Everything dist holds is published to bugit.dev verbatim, so dist is a customer surface and
// its contents are a decision, not a side effect. On 2026-08-28 `https://bugit.dev/server.js`
// answered 200: build.js had been copying the local PREVIEW SERVER into dist since the day the
// build was written. Nothing read it there -- all 46 rendering guards spawn `server.js` from
// the repo root -- so it was pure seller tooling sitting on the marketing site, and no check
// looked, because every check was driven by what index.html references and index.html has
// never referenced it.
//
// The subject is COMPUTED, not listed: every script dist holds, whatever it is called. The
// test is the one thing that separates a browser bundle from a Node tool -- a Node builtin
// import. A browser bundle cannot contain one; a tool almost always does. Naming the files
// instead would pass the moment the next one arrives under a different name.
const scripts = [];
(function collect(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) collect(abs);
    else if (/\.(mjs|cjs|js)$/.test(name)) scripts.push(abs);
  }
})(dist);

const NODE_ONLY = [
  [/\bfrom\s*['"]node:[a-z_/]+['"]/, "imports a node: builtin"],
  [/\bimport\s*\(\s*['"]node:/, "dynamically imports a node: builtin"],
  [/\brequire\s*\(\s*['"](?:node:)?(?:fs|path|http|https|crypto|child_process|os|net|url|zlib|stream)['"]\s*\)/, "requires a Node core module"],
  [/\bprocess\s*\.\s*(?:argv|exit|cwd)\b/, "reads process.argv / calls process.exit / process.cwd"],
];
for (const abs of scripts) {
  checked++;
  const src = readFileSync(abs, "utf8");
  const hit = NODE_ONLY.find(([re]) => re.test(src));
  if (hit) {
    missing++;
    const rel = abs.slice(dist.length + 1).split(sep).join("/");
    console.error(
      `FAIL: dist/${rel} ${hit[1]} — a browser cannot run it, so it is developer tooling ` +
        `published to bugit.dev. Remove it from the copy list in build.js.`,
    );
  }
}

console.log(`\nChecked ${checked} assets, ${missing} missing.`);

if (missing > 0) {
  console.error("Asset check FAILED.");
  process.exit(1);
}
console.log("Asset check passed.");
