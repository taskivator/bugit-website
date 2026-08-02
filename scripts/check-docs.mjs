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

// 4) Locale CHROME completeness: every registered locale must carry every doc
// label and page title the site actually renders.
//
// app.js declares each locale twice — a readable literal near the top and a
// generated `add("<code>", {...})` line further down. `add()` rebuilds the
// dictionary from the English base, so the LATER call wins and the earlier
// literal is inert. A key present only in the literal is dead, and because the
// English base fills the gap the site silently renders an English label inside
// an otherwise translated page. That is exactly how the Commercial Transactions
// and Refund Policy pages ended up with English headings above translated
// documents. This derives the required keys from what index.html and app.js
// actually reference, so adding a new doc page automatically extends the gate.
const requiredDocLabels = [...new Set(
  [...readFileSync(join(root, "index.html"), "utf8").matchAll(/data-t="docs\.(\w+)"/g)]
    .map((m) => m[1]),
)];

// docRoutes drives the docs sidebar and the page-title lookup; each route needs
// its localized title. Route "docs/foo-bar" -> title key "fooBarTitle".
const routeMatch = appjs.match(/const docRoutes=\[([^\]]*)\]/);
if (!routeMatch) fail("could not find `docRoutes` in app.js");
const titleKeyFor = (route) => {
  if (route === "docs") return "homeTitle";
  if (route === "support") return "supportTitle";
  const stem = route.replace(/^docs\//, "").replace(/-(\w)/g, (_m, c) => c.toUpperCase());
  return `${stem}Title`;
};
const requiredTitles = [...new Set(
  (routeMatch ? routeMatch[1].split(",") : [])
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean)
    // getting-started / user-guide render their heading from docDownloadLabels,
    // not docPages, so they are covered by the guide checks above instead.
    .filter((r) => !["docs/getting-started", "docs/user-guide"].includes(r))
    .map(titleKeyFor),
)];

const generated = [...appjs.matchAll(/^add\("([a-z-]+)", (\{.*\})\);$/gm)];
if (!generated.length) fail("app.js has no generated add() locale dictionaries");
for (const [, code, json] of generated) {
  let dict;
  try {
    dict = JSON.parse(json);
  } catch {
    fail(`locale ${code}: generated dictionary is not valid JSON`);
    continue;
  }
  for (const key of requiredDocLabels) {
    dict?.docs?.[key]
      ? ok(`locale ${code} docs.${key}`)
      : fail(`locale ${code} is missing docs.${key} (would fall back to English)`);
  }
  for (const key of requiredTitles) {
    dict?.docPages?.[key]
      ? ok(`locale ${code} docPages.${key}`)
      : fail(`locale ${code} is missing docPages.${key} (page would show an English heading)`);
  }
}

console.log(`\nlanguages: ${langs.length} · locales: ${generated.length} · highlights + PDF guides + version-neutrality + locale chrome · errors: ${errors}`);
process.exit(errors ? 1 : 0);
