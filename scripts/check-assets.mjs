// Static link/asset check for the marketing site (zero dependencies).
// Parses index.html for local href/src references and verifies each asset
// resolves on disk at the site root. Route links (no file extension, e.g.
// "/login") are treated as app routes and skipped. Exits non-zero on any
// missing asset so CI fails loudly.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

console.log(`\nChecked ${checked} assets, ${missing} missing.`);
if (missing > 0) {
  console.error("Asset check FAILED.");
  process.exit(1);
}
console.log("Asset check passed.");
