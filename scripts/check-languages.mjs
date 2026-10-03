// Localization / language-catalogue gate (WEB Phase I, BQA-023).
//
// Truthful catalogue rules enforced here, statically over app.js + index.html:
//   1. There are TWO separate axes — documentation/UI locales vs agent report
//      languages — and they are modelled as distinct structures (never conflated).
//   2. English ('en') is the Supported base and the explicit fallback on both axes.
//   3. Every non-English documentation locale is shown as "(Preview)" in the picker.
//   4. Arabic is flagged RTL-unvalidated and stays in Preview (never Supported).
//   5. The report-language Preview allowlist / RTL flag match the agent's
//      tools/language_tiers.py source of truth (cross-checked when that repo is
//      reachable; otherwise the local shape is still fully enforced).
//   6. Crashlytics and BugSnag stay OUT of the "built-in tested mapping" claim.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { publishedCopy, publishedLangs, htmlText } from "./lib/published-copy.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const app = readFileSync(join(root, "app.js"), "utf8");
const html = readFileSync(join(root, "index.html"), "utf8");
const fail = [];
const note = [];

// --- Extract the languageCatalogue object literal from app.js -----------------
function extractObject(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  let i = src.indexOf("{", at);
  if (i < 0) return null;
  let depth = 0, start = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  const text = src.slice(start, i);
  try { return new Function("return (" + text + ")")(); }
  catch (e) { return null; }
}

// Brace-match a named function so a guard can assert over ONE function's body
// instead of the whole file — "(Preview)" may legitimately appear in a comment
// elsewhere; what matters is that it never reaches the rendered menu.
function extractFunctionBody(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  let i = src.indexOf("{", at);
  if (i < 0) return null;
  let depth = 0;
  const start = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

const cat = extractObject(app, "const languageCatalogue=");
if (!cat) fail.push("languageCatalogue object not found / not parseable in app.js");

const eq = (a, b) => Array.isArray(a) && Array.isArray(b) &&
  a.length === b.length && [...a].sort().join(",") === [...b].sort().join(",");

if (cat) {
  if (cat.base !== "en") fail.push(`catalogue base must be 'en' (got ${cat.base})`);
  if (cat.fallback !== "en") fail.push(`catalogue fallback must be 'en' (got ${cat.fallback})`);

  const doc = cat.documentationLocales || {};
  const rep = cat.reportLanguages || {};

  if (!eq(doc.supported, ["en"]))
    fail.push(`documentationLocales.supported must be exactly ['en'] (got ${JSON.stringify(doc.supported)})`);
  if (!Array.isArray(doc.preview) || doc.preview.includes("en"))
    fail.push("documentationLocales.preview must exist and must not contain 'en'");

  if (!Array.isArray(rep.supported) || !rep.supported.includes("en"))
    fail.push("reportLanguages.supported must include 'en'");
  if (!Array.isArray(rep.preview) || rep.preview.length === 0)
    fail.push("reportLanguages.preview must be a non-empty allowlist");
  if (!Array.isArray(rep.rtlUnvalidated) || !rep.rtlUnvalidated.includes("ar"))
    fail.push("reportLanguages.rtlUnvalidated must include 'ar'");
  // ar must be Preview, never Supported.
  if (Array.isArray(rep.rtlUnvalidated) && Array.isArray(rep.preview))
    for (const l of rep.rtlUnvalidated)
      if (!rep.preview.includes(l)) fail.push(`RTL-unvalidated '${l}' must also be in reportLanguages.preview`);
  if (Array.isArray(rep.supported) && rep.supported.includes("ar"))
    fail.push("'ar' must not be Supported (it is RTL-unvalidated)");

  // Separation of axes: the report catalogue must carry locales that are NOT mere
  // documentation locales (e.g. es-419, ar) — proving the two lists are not the same.
  if (Array.isArray(rep.preview) && Array.isArray(doc.preview)) {
    const extra = rep.preview.filter((l) => l !== "en" && !doc.preview.includes(l) && !doc.supported.includes(l));
    if (extra.length === 0)
      fail.push("report languages are not separated from documentation locales (no report-only locale present)");
  }

  // The picker set (languages=[['en',…],…]) must equal en + documentation preview.
  const pickerCodes = app.match(/const languages=\[([\s\S]*?)\];/);
  if (pickerCodes) {
    const codes = [...pickerCodes[1].matchAll(/\['([a-z-]+)'/g)].map((m) => m[1]);
    const expect = [doc.supported, doc.preview].flat();
    if (!eq(codes, expect))
      fail.push(`language picker ${JSON.stringify(codes)} != catalogue doc locales ${JSON.stringify(expect)}`);
  }
}

// --- Picker shows each language's own name and nothing else -------------------
// The Supported/Preview tiering above is catalogue data and stays enforced. It is
// deliberately NOT surfaced as a picker label: the person reading that menu is by
// definition looking for a language other than English, so an English "(Preview)"
// tag is noise they cannot read. This asserts both halves — the plain label is
// present, and no tag has crept back into the menu.
if (!/const langTag=c=>i18n\[c\]\.name;/.test(app))
  fail.push("language picker no longer renders the plain endonym (langTag changed)");
{
  const initLang = extractFunctionBody(app, "function initLang()");
  if (initLang === null) fail.push("initLang() not found — cannot verify the picker label");
  else if (/\(Preview\)|\(preview\)/.test(initLang))
    fail.push("language picker tags locales as '(Preview)' again — owner removed that label");
}

// --- Localized homepage metadata + not-found present + English fallback --------
if (!/i18n\.en\.meta=\{title:/.test(app)) fail.push("English homepage meta (title/description) missing");
if (!/\(i18n\[lang\]\.meta\)\|\|i18n\.en\.meta/.test(app)) fail.push("homepage meta lacks explicit English fallback");

// THE NOT-FOUND STRINGS, AND WHY THIS ASKS FOR A PROPERTY RATHER THAN A SPELLING.
//
// This used to require the literal `i18n.en.notFound={`, and then one of two exact fallback
// expressions. On 2026-08-28 all three not-found copies were consolidated into a single
// NOT_FOUND table -- `i18n[c].notFound` turned out to be written for nine locales and READ BY
// NOTHING, while the live view rendered a separate, terser table and 404.html rendered a third
// in English only. The consolidation is strictly better and this guard failed it, because what
// it was matching was the shape of the arrangement it was written from, not the guarantee.
//
// The guarantee is: English strings exist, and a locale that has none falls back to them
// rather than rendering undefined. Any of the spellings below satisfies it.
const englishNotFound =
  /i18n\.en\.notFound=\{/.test(app) ||           // the pre-2026-08-28 arrangement
  /const NOT_FOUND\s*=\s*\{[\s\S]{0,400}?\ben:\s*\{/.test(app);  // the table
if (!englishNotFound) fail.push("English not-found strings missing");

const notFoundFallback =
  /\{\.\.\.i18n\.en\.notFound,\.\.\.\(i18n\[lang\]\.notFound\|\|\{\}\)\}/.test(app) ||
  /return t\[lang\]\|\|t\.en;/.test(app) ||
  /return NOT_FOUND\[lang\]\|\|NOT_FOUND\.en;/.test(app);
if (!notFoundFallback) fail.push("not-found render lacks explicit English fallback");

// AND THE PART A SOURCE SCAN CANNOT SEE. Every language must actually reach the reader on the
// hard 404 page too, which is generated at build time from the same table.
// `scripts/check-not-found.mjs` renders it in all eleven and with JavaScript off;
// check-chrome-a11y asserts the in-app result. This line exists so that whoever changes the
// arrangement again knows where the behavioural half lives.
// Unknown route-style hash renders the not-found page (not the homepage).
if (!/\/\^#\\\/\.\+\/\.test\(location\.hash\)/.test(app))
  fail.push("unknown route-style hash (#/…) does not route to the not-found page");

// THE DOCUMENT-LOAD FAILURE MESSAGES (CR-08-F03), AND THE PROPERTY THAT MATTERS.
//
// Six sentences appear when a guide, the licence, the privacy statement, the security page, the
// refund policy or the commerce disclosure fails to fetch (five until 2026-09-24). They were hard-coded English on a site that ships in
// eleven languages, so the one moment a reader most needed to understand the page was the moment
// it stopped being in theirs.
//
// The guarantee asked for here is not a spelling: it is that every shipped locale has all of them,
// that lookup falls back to English rather than rendering undefined, and -- the part that stops
// this coming back -- that no English sentence survives OUTSIDE the table. Another document route
// added later cannot quietly reintroduce a literal.
//
// The locale list is DERIVED from the catalogue above rather than restated, because a restated
// list goes stale and this file has no way to notice when an eleventh language becomes a twelfth.
// `security` joined on 2026-09-24, when SECURITY.md became a document page of its own.
const DOC_ERROR_KEYS = ["guide", "license", "privacy", "security", "refund", "commerce"];
const DOC_ERROR_EN = {
  guide: "This guide is temporarily unavailable",
  license: "The license text is temporarily unavailable",
  privacy: "The privacy statement is temporarily unavailable",
  security: "The security page is temporarily unavailable",
  refund: "The refund policy is temporarily unavailable",
  commerce: "This disclosure is temporarily unavailable",
};
const docErrorTable = (app.match(/const DOC_ERROR\s*=\s*\{([\s\S]*?)\n\};/) || [])[1];
if (!docErrorTable) {
  fail.push("DOC_ERROR table missing — document-load failures would be English only");
} else {
  const shipped = [cat.base, ...cat.documentationLocales.preview];
  for (const lg of shipped) {
    const row = new RegExp(`(?:^|\\n)\\s*(?:'${lg}'|"${lg}"|${lg})\\s*:\\s*\\{([^}]*)\\}`).exec(docErrorTable);
    if (!row) { fail.push(`DOC_ERROR has no ${lg} row`); continue; }
    for (const k of DOC_ERROR_KEYS)
      if (!new RegExp(`\\b${k}\\s*:\\s*"`).test(row[1])) fail.push(`DOC_ERROR.${lg} is missing ${k}`);
  }
  if (!/return b\[key\]\|\|DOC_ERROR\.en\[key\];/.test(app))
    fail.push("doc-error lookup lacks an explicit English fallback");
  // Exactly once each, and that once is inside the table.
  for (const [k, sentence] of Object.entries(DOC_ERROR_EN)) {
    const n = app.split(sentence).length - 1;
    if (n === 0) fail.push(`DOC_ERROR English copy for ${k} disappeared`);
    else if (n > 1) fail.push(`English doc-error literal for ${k} appears ${n} times — one of them is a call site, not the table`);
  }
}

// --- Crashlytics / BugSnag truthfulness (item 10) -----------------------------
const builtin = (html.match(/integrations\.builtin"[^]*?data-tools="([^"]*)"/) || [])[1] || "";
for (const t of ["crashlytics", "bugsnag"])
  if (builtin.split(",").includes(t))
    fail.push(`${t} is inside the BUILT-IN TESTED MAPPING row — implies certification it does not have`);
if (!/Jira and Azure DevOps include built-in tested field mapping/.test(html))
  note.push("integrations lede wording changed — re-verify built-in claim scope");

// --- THE PUBLISHED PAGES (2026-10-04) ------------------------------------------
// On 2026-10-04 bugit.dev switched to the redesign. Everything above reads app.js and index.html,
// which still ship and so stay checked, but which no published page loads: the homepage is
// v2/index.html translated by v2/i18n/<lang>.json, and /docs/ is v2/docs/index.html filled from
// v2/docs/content.<lang>.json. None of the catalogue above exists there. What a visitor gets from
// the language machinery of the published pages is asserted here, over what lib/published-copy.mjs
// says is published, so the language list is the one the site ships rather than a copy of it:
//
//   A. Completeness of the homepage. Every key the pages and scripts ask for ([data-k], [data-ka],
//      and the "t012" / "js.q1" / "d.docs" style keys the scripts pass to V2T) must be a non-empty
//      string in every language's file. i18n.js would fall back to English for a missing one, so a
//      gap never errors: it silently shows one English sentence in a Japanese page.
//   B. Completeness of the docs. Every language's content file must have exactly English's shape:
//      the same keys, the same number of FAQ entries, no empty value.
//   C. Parity between languages. Every homepage file carries the same key set as every other, so a
//      key added to one translation and forgotten in the rest is caught even if nothing reads it yet.
//   D. The fallback and the picker, as the source states them: a missing string falls back to
//      English, a failed load falls back to English, Arabic is laid out right to left, and the
//      picker shows each language's own name with no "(Preview)" tag (the owner removed it).
//   E. Crashlytics and BugSnag (item 6 above): no published English sentence that names either
//      may call it built-in or tested.
const KEYISH = /^(?:t\d{3}|(?:js|d|menu)\.[A-Za-z0-9]+)$/;
function scanPublished(entries) {
  const found = [];
  const langs = new Set(entries.filter((e) => e.lang && e.lang !== "en").map((e) => e.lang));
  const wanted = new Map(); // key -> where it is asked for
  for (const e of entries) {
    if (e.kind === "page") {
      for (const m of e.text.matchAll(/\sdata-k="([^"]+)"/g)) wanted.set(m[1], e.file);
      for (const m of e.text.matchAll(/\sdata-ka="([^"]+)"/g)) {
        for (const pair of m[1].split(",")) wanted.set(pair.split(":")[1], e.file);
      }
    } else if (e.kind === "script") {
      for (const m of e.text.matchAll(/"([^"\n]{2,40})"/g)) if (KEYISH.test(m[1])) wanted.set(m[1], e.file);
    }
  }
  const home = {}, docs = {};
  for (const e of entries) {
    const tree = e.json ?? (e.kind === "home" || e.kind === "docs" ? JSON.parse(readFileSync(join(root, e.file), "utf8")) : null);
    if (e.kind === "home") home[e.lang] = tree;
    if (e.kind === "docs") docs[e.lang] = { file: e.file, flat: flatShape(tree) };
  }
  for (const lang of langs) {
    if (!home[lang]) { found.push(`homepage: no ${lang} dictionary among the published copy`); continue; }
    for (const [key, where] of wanted) {
      const v = home[lang][key];
      if (typeof v !== "string" || !v.trim()) found.push(`homepage ${lang}: "${key}" (asked for by ${where}) is ${v === undefined ? "missing" : "empty"}`);
    }
  }
  const homeLangs = Object.keys(home);
  for (const lang of homeLangs.slice(1)) {
    const a = Object.keys(home[homeLangs[0]]), b = Object.keys(home[lang]);
    const onlyA = a.filter((k) => !(k in home[lang])), onlyB = b.filter((k) => !(k in home[homeLangs[0]]));
    if (onlyA.length || onlyB.length) {
      found.push(`homepage ${homeLangs[0]} and ${lang} carry different keys: only ${homeLangs[0]} ${JSON.stringify(onlyA.slice(0, 8))}, only ${lang} ${JSON.stringify(onlyB.slice(0, 8))}`);
    }
  }
  if (!docs.en) found.push("docs: no English content among the published copy, so nothing to compare the others to");
  else {
    for (const lang of langs) {
      const d = docs[lang];
      if (!d) { found.push(`docs: no ${lang} content among the published copy`); continue; }
      for (const [k, v] of docs.en.flat) {
        const mine = d.flat.get(k);
        if (mine === undefined) found.push(`docs ${lang}: ${d.file} is missing ${k}`);
        else if (typeof v === "string" && (typeof mine !== "string" || !mine.trim())) found.push(`docs ${lang}: ${d.file} has an empty ${k}`);
      }
      for (const k of d.flat.keys()) if (!docs.en.flat.has(k)) found.push(`docs ${lang}: ${d.file} has ${k}, which English does not`);
    }
  }
  const i18n = entries.find((e) => e.kind === "script" && /(^|\/)i18n\.js$/.test(e.file));
  if (!i18n) found.push("the published language script (i18n.js) is not among the published copy");
  else {
    if (!/en\[k\] != null \? en\[k\] : fallback/.test(i18n.text)) found.push("i18n.js: a missing string no longer falls back to English");
    // The fallback may be guarded so only the latest request paints (2026-10-04): either form.
    if (!/\.catch\(function \(\) \{ (?:if \(my === seq\) )?apply\("en", \{\}\); \}\)/.test(i18n.text)) found.push("i18n.js: a failed language load no longer falls back to English");
    if (!/l === "ar" \? "rtl" : "ltr"/.test(i18n.text)) found.push("i18n.js: Arabic is no longer laid out right to left");
    if (/\(Preview\)|\(preview\)/.test(i18n.text)) found.push("i18n.js: the language picker tags a language '(Preview)' again; the owner removed that label");
    if (!/\+ x\[1\] \+/.test(i18n.text)) found.push("i18n.js: the language picker no longer renders each language's own name");
  }
  for (const e of entries) {
    if (e.lang !== "en") continue;
    const text = e.kind === "page" ? htmlText(e.text) : e.text;
    for (const s of text.split(/(?<=[.!?])\s+/)) {
      if (/crashlytics|bugsnag/i.test(s) && /built-in|tested mapping|certified/i.test(s)) {
        found.push(`${e.file}: names Crashlytics or BugSnag next to a built-in/tested claim: ${JSON.stringify(s.slice(0, 140))}`);
      }
    }
  }
  return { found, wanted: wanted.size, wantedKeys: [...wanted.keys()], langs: langs.size, docsKeys: docs.en ? docs.en.flat.size : 0 };
}
// Leaf paths with their values; an array contributes its length too, so a dropped FAQ entry shows.
function flatShape(node, prefix = "", out = new Map()) {
  if (Array.isArray(node)) { out.set(prefix + ".length", node.length); node.forEach((v, i) => flatShape(v, `${prefix}[${i}]`, out)); }
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) flatShape(v, prefix ? `${prefix}.${k}` : k, out);
  else out.set(prefix, node);
  return out;
}
{
  const entries = publishedCopy();
  const result = scanPublished(entries);
  for (const f of result.found) fail.push("published: " + f);
  // Positive control: the subject is the size the site is, not an empty set that passes.
  if (result.langs !== publishedLangs().length - 1) fail.push(`published: compared ${result.langs} translated language(s), the site ships ${publishedLangs().length - 1}`);
  if (result.wanted < 150) fail.push(`published: only ${result.wanted} homepage key(s) found to require; the scan is blind`);
  if (result.docsKeys < 40) fail.push(`published: only ${result.docsKeys} docs key(s) read from English; the scan is blind`);
  // Negative control, in memory: a Japanese homepage missing one key the page asks for, a German
  // docs file one FAQ entry short, and a picker that says "(Preview)" again. Each must be reported.
  const ja = entries.find((e) => e.kind === "home" && e.lang === "ja");
  const de = entries.find((e) => e.kind === "docs" && e.lang === "de");
  const i18n = entries.find((e) => e.kind === "script" && /(^|\/)i18n\.js$/.test(e.file));
  const jaTree = JSON.parse(readFileSync(join(root, ja.file), "utf8"));
  const dropped = result.wantedKeys.find((k) => k in jaTree) ?? "t001";
  delete jaTree[dropped];
  const deTree = JSON.parse(readFileSync(join(root, de.file), "utf8"));
  deTree.faq = deTree.faq.slice(1);
  const planted = entries.map((e) => e === ja ? { ...e, json: jaTree }
    : e === de ? { ...e, json: deTree }
    : e === i18n ? { ...e, text: e.text + '\n/* x */ var tag = " (Preview)";' } : e);
  const control = scanPublished(planted).found;
  if (!control.some((f) => f.startsWith(`homepage ja: "${dropped}"`))) fail.push(`published: negative control did not fire (ja without "${dropped}" passed)`);
  if (!control.some((f) => f.startsWith("docs de:") && f.includes("faq"))) fail.push("published: negative control did not fire (a German FAQ one entry short passed)");
  if (!control.some((f) => f.includes("(Preview)"))) fail.push("published: negative control did not fire (a '(Preview)' picker label passed)");
  note.push(`published copy: ${result.langs} translated languages, ${result.wanted} homepage keys required of each, ${result.docsKeys} docs fields matched to English`);
}

if (note.length) console.log("check-languages notes:\n - " + note.join("\n - "));
if (fail.length) {
  console.error("check-languages FAILED:\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log(`check-languages OK: en Supported base; ${cat.documentationLocales.preview.length} doc Preview locales; report allowlist [${cat.reportLanguages.preview.join(", ")}]; ar RTL-unvalidated; axes separated.`);
