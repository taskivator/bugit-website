// Documentation completeness + version-neutrality gate for the marketing site.
//
// Fails the build if, for any supported guide language: a localized highlights file
// is missing, a full PDF guide (User Guide / Overview) is missing, or any highlights
// file carries a BugIt version number. The supported-language list is read from
// app.js `docGuideLangs` so the site and this gate can never drift apart.
//
// Run: `node scripts/check-docs.mjs` (npm run test:guides). No dependencies.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = join(root, "public", "docs");
const guides = join(docs, "guides");

const appjs = readFileSync(join(root, "app.js"), "utf8");
const match = appjs.match(/const docGuideLangs=\[([^\]]*)\]/);
if (!match) {
  console.error("FAIL: could not find `docGuideLangs` in app.js");
  process.exit(1);
}
const langs = match[1]
  .split(",")
  .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
  .filter(Boolean);
if (!langs.includes("en")) {
  console.error("FAIL: docGuideLangs must include the English ('en') baseline");
  process.exit(1);
}

let errors = 0;
const fail = (msg) => { console.error("  MISSING  " + msg); errors++; };
const ok = (msg) => console.log("  ok       " + msg);

// 1) Localized highlights + 2) full PDF guides for every supported language.
for (const lang of langs) {
  for (const stem of ["OVERVIEW", "GETTING_STARTED"]) {
    const file = lang === "en" ? `${stem}.web.md` : `${stem}.${lang}.web.md`;
    existsSync(join(docs, file)) ? ok(`highlights ${file}`) : fail(`highlights ${file}`);
  }
  for (const pdf of ["user-guide.pdf", "overview.pdf"]) {
    existsSync(join(guides, lang, pdf))
      ? ok(`pdf guides/${lang}/${pdf}`)
      : fail(`pdf guides/${lang}/${pdf}`);
  }
}

// 3) No BugIt release-version numbers (v1.0.x / 1.0.x) in customer-facing site copy:
// the highlights files, plus the site shell (app.js i18n, index.html). The "v1.x"
// update-entitlement phrasing is deliberately allowed; only pinned x.y.z-style
// release numbers that would date the site are rejected.
const releaseRe = /v1\.0\.\d|\b1\.0\.\d\b|\(v1\.0\)|3\.10\s*\+/i;
for (const name of readdirSync(docs).filter((n) => n.endsWith(".web.md"))) {
  if (releaseRe.test(readFileSync(join(docs, name), "utf8"))) {
    fail(`version number in highlights ${name}`);
  }
}
for (const rel of ["app.js", "index.html"]) {
  const m2 = readFileSync(join(root, rel), "utf8").match(releaseRe);
  if (m2) fail(`version number in site copy ${rel} (found "${m2[0]}")`);
}

console.log(`\nlanguages: ${langs.length} · highlights + PDF guides + version-neutrality · errors: ${errors}`);
process.exit(errors ? 1 : 0);
