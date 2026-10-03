// Documentation completeness + version-neutrality gate for the marketing site.
//
// Fails the build if, for any supported guide language: a localized highlights file
// is missing, a full PDF guide (User Guide / Overview) is missing, or any highlights
// file carries a BugIt version number. The supported-language list is read from
// app.js `docGuideLangs` so the site and this gate can never drift apart.
//
// Run: `node scripts/check-docs.mjs` (npm run test:guides). No dependencies.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishedCopy, publishedLangs } from "./lib/published-copy.mjs";

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

// 2b) The PDFs must be the bytes scripts/sync-guides.mjs copied from the agent's published
// guides — not merely present.
//
// EXISTENCE IS NOT FRESHNESS. Every guide above passed while all twenty were a release behind:
// the site kept its own copies, nothing tied them to the originals, and a stale file satisfies
// `existsSync` exactly as well as a current one. The site's guides then described a bundled VS
// Code extension and an MCP filing path that had both been removed from the product.
//
// guides-manifest.json is written by the sync and records, per file, the sha256 served and the
// HTML source it was printed from. Comparing against it proves the served bytes are the ones that
// were synced; running `node scripts/sync-guides.mjs --agent <path> --check` proves those are
// still what the agent publishes (it needs the agent repo, so it is a seller step, not a CI one).
//
// A COUNT IS NOT COVERAGE (CR-08-F17). This used to check only that the manifest listed
// languages x 2 entries and that each LISTED entry hashed correctly. The presence loop above and
// this hash loop never compared path identities, so a manifest that listed en/overview.pdf twice
// and fr/user-guide.pdf not at all had the right count, every listed hash matched, and the
// unlisted guide was served with no integrity check at all. The manifest's path set must now equal
// the expected set exactly: no duplicate, no missing, no extra, and no path that is not one of the
// literal expected identities (which also rules out "../" escapes and absolute paths, since only
// "<lang>/<file>.pdf" strings drawn from docGuideLangs can match). Every entry needs a 64-hex digest.
const GUIDE_PDFS = ["user-guide.pdf", "overview.pdf"];
function manifestCoverageProblems(entries, langList) {
  const problems = [];
  if (!Array.isArray(entries)) return ["guides-manifest.json has no `guides` array"];
  const expectedSet = new Set(langList.flatMap((l) => GUIDE_PDFS.map((p) => `${l}/${p}`)));
  const seen = new Set();
  for (const g of entries) {
    const file = g?.file;
    if (typeof file !== "string" || !expectedSet.has(file)) {
      problems.push(`guides-manifest.json lists an unexpected or unsafe path ${JSON.stringify(file)}`);
      continue;
    }
    if (seen.has(file)) problems.push(`guides-manifest.json lists ${file} more than once`);
    seen.add(file);
    if (typeof g.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(g.sha256)) {
      problems.push(`guides-manifest.json entry ${file} has no valid sha256`);
    }
  }
  for (const want of expectedSet) {
    if (!seen.has(want)) problems.push(`guides-manifest.json has no integrity entry for ${want}`);
  }
  return problems;
}

// Negative control, run every time: the exact shape that used to pass (right count, one guide
// duplicated, one missing) must be reported, and a complete unique set must not be. If the
// predicate ever stops seeing the planted defect, this gate refuses to believe its own zero.
{
  const h = "0".repeat(64);
  const good = ["en", "fr"].flatMap((l) => GUIDE_PDFS.map((p) => ({ file: `${l}/${p}`, sha256: h })));
  const dup = good.map((g) => ({ ...g }));
  dup[3] = { ...dup[0] }; // fr/overview.pdf replaced by a second en/user-guide.pdf; count unchanged
  const escape = good.map((g) => ({ ...g }));
  escape[1] = { file: "en/../../../secret.pdf", sha256: h };
  if (manifestCoverageProblems(good, ["en", "fr"]).length) {
    fail("self-test: coverage predicate rejects a complete unique manifest");
  }
  if (!manifestCoverageProblems(dup, ["en", "fr"]).some((p) => /fr\/overview\.pdf/.test(p))) {
    fail("self-test: coverage predicate accepted a duplicate entry hiding a missing guide");
  }
  if (!manifestCoverageProblems(escape, ["en", "fr"]).some((p) => /unsafe/.test(p))) {
    fail("self-test: coverage predicate accepted a path outside the expected guide set");
  }
}

const manifestPath = join(guides, "guides-manifest.json");
if (!existsSync(manifestPath)) {
  fail("guides-manifest.json (run scripts/sync-guides.mjs)");
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const expected = langs.length * GUIDE_PDFS.length;
  if (manifest.guides?.length !== expected) {
    fail(`guides-manifest.json lists ${manifest.guides?.length} guides, expected ${expected}`);
  }
  const coverage = manifestCoverageProblems(manifest.guides, langs);
  for (const p of coverage) fail(p);
  if (!coverage.length) ok(`guides-manifest.json covers exactly the ${expected} expected guides`);
  const expectedSet = new Set(langs.flatMap((l) => GUIDE_PDFS.map((p) => `${l}/${p}`)));
  for (const g of Array.isArray(manifest.guides) ? manifest.guides : []) {
    // Only literal expected identities are ever joined onto the guide tree.
    if (!expectedSet.has(g?.file)) continue;
    const path = join(guides, g.file);
    if (!existsSync(path)) {
      fail(`guides-manifest.json references a missing ${g.file}`);
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
    actual === g.sha256
      ? ok(`hash guides/${g.file}`)
      : fail(`guides/${g.file} does not match guides-manifest.json — re-run scripts/sync-guides.mjs`);
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
    .filter((r) => !["docs/getting-started", "docs/user-guide", "docs/overview"].includes(r))
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

// 5) THE PUBLISHED DOCS PAGE (2026-10-04). bugit.dev now serves v2/docs/index.html as /docs/,
// driven by v2/docs/docs.js and v2/docs/content.<lang>.json. Sections 1 to 4 read app.js, which
// still ships but is referenced by no published page, so on their own they said nothing about the
// documentation a visitor reads. The same four properties, asked of what is published (the file
// list comes from scripts/lib/published-copy.mjs and is not restated here):
//
//   5a. Every published language has its highlights and its two PDFs, and docs.js's own
//       PDF_LANGS (which picks the PDF a reader downloads, English otherwise) names exactly the
//       published languages, so no language silently downloads the English guide.
//   5b. No pinned release number in any published copy: pages, language files, docs content,
//       scripts.
//   5c. Docs chrome completeness. docs.js does NOT merge a language file onto English: it fetches
//       content.<lang>.json and reads it as is, so a key missing there renders "undefined" (or the
//       English fallback where the code supplies one). Every language must therefore carry every
//       string content.en.json carries, the same number of FAQ entries, and every key docs.js
//       reads must exist in content.en.json in the first place. Likewise every V2T("d.*") label
//       docs.js asks for must be in each translated v2/i18n/<lang>.json, or it falls back to
//       English inside a translated page.
// Each predicate runs first over a planted defect in memory and must report it.
const pubLangs = publishedLangs();
const v2DocsJs = readFileSync(join(root, "v2", "docs", "docs.js"), "utf8");
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));

// 5a
for (const lang of pubLangs) {
  if (!langs.includes(lang)) {
    for (const stem of ["OVERVIEW", "GETTING_STARTED"]) {
      const file = lang === "en" ? `${stem}.web.md` : `${stem}.${lang}.web.md`;
      existsSync(join(docs, file)) ? ok(`highlights ${file}`) : fail(`highlights ${file} (published language ${lang})`);
    }
    for (const pdf of GUIDE_PDFS) {
      existsSync(join(guides, lang, pdf)) ? ok(`pdf guides/${lang}/${pdf}`) : fail(`pdf guides/${lang}/${pdf} (published language ${lang})`);
    }
  }
}
const pdfLangDecl = v2DocsJs.match(/var PDF_LANGS\s*=\s*\[([^\]]*)\]/);
if (!pdfLangDecl) {
  fail("could not find `var PDF_LANGS = [...]` in v2/docs/docs.js");
} else {
  const pdfLangs = [...pdfLangDecl[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
  const missingPdf = pubLangs.filter((l) => !pdfLangs.includes(l));
  const extraPdf = pdfLangs.filter((l) => !pubLangs.includes(l));
  missingPdf.length || extraPdf.length
    ? fail(`v2/docs/docs.js PDF_LANGS disagrees with the published languages (missing: ${missingPdf.join(", ") || "none"}; extra: ${extraPdf.join(", ") || "none"})`)
    : ok(`v2/docs/docs.js PDF_LANGS names the ${pubLangs.length} published languages`);
}

// 5b
const releaseHits = (entries) => entries.flatMap((e) => {
  const m = e.text.match(releaseRe);
  return m ? [`version number in published copy ${e.file} (found "${m[0]}")`] : [];
});
if (!releaseHits([{ file: "planted", text: "<p>New in BugIt v1.0.4</p>" }]).length) {
  fail("self-test: negative control did not fire; a planted v1.0.4 in published copy was not reported");
}
const published = publishedCopy();
if (!published.some((e) => e.kind === "page") || !published.some((e) => e.kind === "docs")) {
  fail("published copy yielded no page or no docs content; nothing published was scanned");
}
for (const p of releaseHits(published)) fail(p);

// 5c
function leafPaths(v, prefix = "", out = []) {
  if (Array.isArray(v)) out.push([prefix, v]);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) leafPaths(x, prefix ? `${prefix}.${k}` : k, out);
  else out.push([prefix, v]);
  return out;
}
function contentGaps(dict, base) {
  const gaps = [];
  for (const [key, want] of leafPaths(base)) {
    const got = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);
    if (Array.isArray(want)) {
      if (!Array.isArray(got) || got.length !== want.length) {
        gaps.push(`${key} has ${Array.isArray(got) ? got.length : 0} entries, English has ${want.length}`);
      } else if (got.some((x, i) => Array.isArray(want[i]) && (!Array.isArray(x) || x.length !== want[i].length || x.some((s) => typeof s !== "string" || !s.trim())))) {
        gaps.push(`${key} has an incomplete entry`);
      }
    } else if (typeof got !== "string" || !got.trim()) {
      gaps.push(`${key} is missing`);
    }
  }
  return gaps;
}
const contentEn = readJson("v2/docs/content.en.json");
{
  const planted = JSON.parse(JSON.stringify(contentEn));
  delete planted.docPages.refundTitle;
  planted.faq = planted.faq.slice(1);
  const g = contentGaps(planted, contentEn);
  if (!g.some((x) => /refundTitle/.test(x)) || !g.some((x) => /^faq /.test(x)) || contentGaps(contentEn, contentEn).length) {
    fail("self-test: negative control did not fire; the docs content completeness predicate missed a planted gap");
  }
}
// The keys docs.js reads, so content.en.json cannot itself be the thing that is short. A name
// preceded by a quote is a V2T label ("d.gGuides"), not a content read, and is checked below.
function liftFn(name) {
  const start = v2DocsJs.indexOf(`function ${name}(`);
  if (start === -1) return "";
  let depth = 0;
  for (let i = v2DocsJs.indexOf("{", start); i < v2DocsJs.length; i++) {
    if (v2DocsJs[i] === "{") depth++;
    else if (v2DocsJs[i] === "}" && --depth === 0) return v2DocsJs.slice(start, i + 1);
  }
  return "";
}
const readKeys = new Set([...v2DocsJs.matchAll(/C\.(docPages|docs|dl|ui)\.(\w+)/g)].map((m) => `${m[1]}.${m[2]}`));
for (const fn of ["buildDocs", "homePage", "support"]) {
  const body = liftFn(fn);
  if (!body) { fail(`v2/docs/docs.js has no ${fn}(); the keys it reads cannot be checked`); continue; }
  if (/var d = C\.docPages/.test(body)) for (const m of body.matchAll(/(?<!["'\w.])d\.(\w+)/g)) readKeys.add(`docPages.${m[1]}`);
  if (/\bl = C\.docs\b/.test(body)) for (const m of body.matchAll(/(?<!["'\w.])l\.(\w+)/g)) readKeys.add(`docs.${m[1]}`);
  if (/\bdl = C\.dl\b/.test(body)) for (const m of body.matchAll(/(?<!["'\w.])dl\.(\w+)/g)) readKeys.add(`dl.${m[1]}`);
}
if (readKeys.size < 15) fail(`only ${readKeys.size} content keys read out of v2/docs/docs.js; the reader changed shape`);
for (const key of readKeys) {
  const [group, k] = key.split(".");
  typeof contentEn[group]?.[k] === "string" && contentEn[group][k].trim()
    ? ok(`content.en.json ${key} (read by docs.js)`)
    : fail(`v2/docs/docs.js reads ${key} but v2/docs/content.en.json has no such string`);
}
if (!Array.isArray(contentEn.faq) || !contentEn.faq.length) fail("v2/docs/content.en.json has no faq entries");
for (const lang of pubLangs.filter((l) => l !== "en")) {
  const gaps = contentGaps(readJson(`v2/docs/content.${lang}.json`), contentEn);
  for (const g of gaps) fail(`v2/docs/content.${lang}.json: ${g}`);
  if (!gaps.length) ok(`v2/docs/content.${lang}.json carries every docs string`);
}
const labelKeys = [...new Set([...v2DocsJs.matchAll(/\bT\("(d\.[\w.]+)"/g)].map((m) => m[1]))];
if (labelKeys.length < 10) fail(`only ${labelKeys.length} V2T("d.*") labels read out of v2/docs/docs.js`);
for (const lang of pubLangs.filter((l) => l !== "en")) {
  const dict = readJson(`v2/i18n/${lang}.json`);
  const absent = labelKeys.filter((k) => typeof dict[k] !== "string" || !dict[k].trim());
  absent.length
    ? fail(`v2/i18n/${lang}.json lacks docs label(s) ${absent.join(", ")} (would show English)`)
    : ok(`v2/i18n/${lang}.json carries all ${labelKeys.length} docs labels`);
}

console.log(`\nlanguages: ${langs.length} · locales: ${generated.length} · published languages: ${pubLangs.length} · published entries scanned: ${published.length} · highlights + PDF guides + version-neutrality + locale chrome (app.js and v2) · errors: ${errors}`);
process.exit(errors ? 1 : 0);
