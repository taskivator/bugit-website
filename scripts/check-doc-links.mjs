import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
if (missing > 0) process.exit(1);
console.log("Documentation link check passed.");
