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

// --- Crashlytics / BugSnag truthfulness (item 10) -----------------------------
const builtin = (html.match(/integrations\.builtin"[^]*?data-tools="([^"]*)"/) || [])[1] || "";
for (const t of ["crashlytics", "bugsnag"])
  if (builtin.split(",").includes(t))
    fail.push(`${t} is inside the BUILT-IN TESTED MAPPING row — implies certification it does not have`);
if (!/Jira and Azure DevOps include built-in tested field mapping/.test(html))
  note.push("integrations lede wording changed — re-verify built-in claim scope");

if (note.length) console.log("check-languages notes:\n - " + note.join("\n - "));
if (fail.length) {
  console.error("check-languages FAILED:\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log(`check-languages OK: en Supported base; ${cat.documentationLocales.preview.length} doc Preview locales; report allowlist [${cat.reportLanguages.preview.join(", ")}]; ar RTL-unvalidated; axes separated.`);
