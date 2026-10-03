// Does any locale ship another locale's language?
//
// WHY THIS EXISTS. The v1.1.9 LQA audit found the Spanish integrations paragraph on
// bugit.dev written in Brazilian Portuguese. Every existing guard passed over it, and
// none of them was wrong to: key parity asks whether a key EXISTS, and the key existed.
// A key holding the wrong language is indistinguishable from a translated key unless
// something actually compares the VALUES.
//
// The cause is structural rather than a typo. Each locale is declared TWICE in app.js,
// a hand-written block and a later generated one, and the later `add()` wins. The
// generated Spanish block carried a Spanish heading, a Spanish title, and a Portuguese
// body, so reading the top of the block told you nothing about the paragraph below it.
//
// What this checks, and deliberately nothing more: two DIFFERENT locales must not ship
// the byte-identical prose string for the same key. Identical prose in two languages is
// either an untranslated copy or a paste from the wrong locale. Short strings are
// exempt because brand names, "FAQ", prices and protected commands are identical by
// design and always will be.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishedCopy, htmlText } from "./lib/published-copy.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// An explicit path makes the guard testable against a KNOWN-BAD bundle. A guard that has
// never been shown to fail is indistinguishable from one that cannot.
const target = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "app.js");
const source = fs.readFileSync(target, "utf8");

// Prose, not labels. Below this length the identical-string signal is all false
// positives; above it, two locales agreeing byte-for-byte is a real finding.
const PROSE = 40;

// Values that are identical across locales ON PURPOSE. Keep this list short and
// specific: every entry is a hole, so an entry that is not obviously safe does not
// belong here.
const ALLOWED = [
  /^https?:\/\//,               // URLs
  /^[\s\d.,$€¥%+\-/()]+$/,      // pure numbers, prices, punctuation
];

const locales = new Map();
const lines = source.split("\n");
lines.forEach((line, i) => {
  const m = /^\s*add\((['"])([a-z-]+)\1\s*,\s*(\{.*\})\s*\)\s*;?\s*$/.exec(line);
  if (!m) return;
  const [, , locale, literal] = m;
  let obj;
  try {
    obj = new Function(`"use strict"; return (${literal});`)();
  } catch {
    return; // not a dictionary literal; the CSS-class add() calls land here
  }
  if (!obj || typeof obj !== "object" || !obj.name) return;
  // The LATER declaration wins at runtime, so it is the one that must be correct.
  locales.set(locale, { line: i + 1, dict: obj });
});

function flatten(node, prefix, out) {
  if (typeof node === "string") {
    out.set(prefix, node);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
  return out;
}

const flat = new Map();
for (const [locale, { dict }] of locales) flat.set(locale, flatten(dict, "", new Map()));

const problems = [];
const names = [...flat.keys()];
for (let a = 0; a < names.length; a++) {
  for (let b = a + 1; b < names.length; b++) {
    const [A, B] = [names[a], names[b]];
    for (const [key, valueA] of flat.get(A)) {
      const valueB = flat.get(B).get(key);
      if (valueB === undefined || valueA !== valueB) continue;
      if (valueA.length < PROSE) continue;
      if (ALLOWED.some((rx) => rx.test(valueA))) continue;
      problems.push(
        `${A} and ${B} ship the identical string for ${key}\n` +
        `      ${JSON.stringify(valueA.slice(0, 110))}${valueA.length > 110 ? "…" : ""}`
      );
    }
  }
}

// THE PUBLISHED COPY (2026-10-04). On that day bugit.dev switched to the redesign, and the
// dictionaries above stopped being what anybody reads: the homepage is v2/index.html translated by
// v2/i18n/<lang>.json, and /docs/ is v2/docs/index.html filled from v2/docs/content.<lang>.json.
// app.js still ships, so it stays checked; the files a visitor is actually served are added here,
// asked of lib/published-copy.mjs rather than listed, so a twelfth language is covered the day it
// ships. Three checks, each the same question asked of a different shape:
//
//   1. The same key in two languages must not hold the same prose. As above, and now INCLUDING
//      English: the English of the homepage is read from the page itself (what i18n.js reads), and
//      a translation byte-identical to it is an untranslated string. Length is measured on the
//      VISIBLE text with product names removed, because the values are HTML and a shared
//      <a href="..."> wrapper, or a demo line that is nothing but product names, is not prose.
//   2. A language's file must not carry another WRITING SYSTEM's text: no Hangul outside Korean,
//      no kana outside Japanese, no Han outside Japanese and Chinese, no Cyrillic outside Russian,
//      no Arabic outside Arabic; and in Korean, Chinese, Russian and Arabic the language's own
//      script must be most of the letters. The one allowance is the Japanese statute name, which
//      every language cites in Japanese on purpose because that is its legal title.
//   3. The pair that actually broke. Spanish and Portuguese share a script, so (2) cannot tell
//      them apart; the letters only one of them uses can. Spanish must carry no ã, õ or -ção, and
//      Portuguese no ñ, ¿, ¡ or -ción.
const PRODUCT_NAMES = /BugIt|Taskivator|Copilot Chat|QA Agent|checkout-web/g;
const prose = (value) => htmlText(value).replace(PRODUCT_NAMES, "").replace(/[\s·|,.:;]+/g, " ").trim();
// The statute's own name, cited in Japanese in every language's commerce disclosure. Exact strings.
const STATUTE = /特定商取引法に基づく表記|特定商取引法/g;
const SCRIPTS = {
  Hangul: { re: /[가-힣ᄀ-ᇿ㄰-㆏]/gu, own: ["ko"] },
  kana: { re: /[぀-ヿ]/gu, own: ["ja"] },
  Han: { re: /\p{Script=Han}/gu, own: ["ja", "zh"] },
  Cyrillic: { re: /\p{Script=Cyrillic}/gu, own: ["ru"] },
  Arabic: { re: /\p{Script=Arabic}/gu, own: ["ar"] },
};
const MAJORITY = { ko: "Hangul", zh: "Han", ru: "Cyrillic", ar: "Arabic" };
const NOT_IN = {
  es: { re: /ção|ções|[ãõ]/gu, other: "Portuguese" },
  "pt-br": { re: /ción|[ñ¿¡]/gu, other: "Spanish" },
};
const tagSpan = (html, at) => {
  const name = /^<([a-zA-Z0-9]+)/.exec(html.slice(at))[1];
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, "gi");
  re.lastIndex = at;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(html.indexOf(">", at) + 1, m.index);
  }
  return null;
};
/** entries -> { kind: { lang: Map(key -> value) } }. A page's English is its [data-k] markup. */
function publishedDictionaries(entries) {
  const dicts = { home: {}, docs: {} };
  for (const e of entries) {
    if (e.kind === "page" && e.file.endsWith("/index.html") && !e.file.includes("/docs/")) {
      const map = (dicts.home.en ||= new Map());
      for (const m of e.text.matchAll(/<[a-zA-Z0-9]+\b[^>]*\sdata-k="([^"]+)"[^>]*>/g)) {
        const inner = tagSpan(e.text, m.index);
        if (inner !== null) map.set(m[1], inner);
      }
    } else if (e.kind === "home" || e.kind === "docs") {
      const tree = e.json ?? JSON.parse(fs.readFileSync(path.join(root, e.file), "utf8"));
      dicts[e.kind][e.lang] = flatten(tree, "", new Map());
    }
  }
  return dicts;
}
function scanPublished(entries) {
  const found = [];
  const dicts = publishedDictionaries(entries);
  let strings = 0;
  for (const [kind, byLang] of Object.entries(dicts)) {
    const langs = Object.keys(byLang);
    for (const l of langs) strings += byLang[l].size;
    for (let a = 0; a < langs.length; a++) {
      for (let b = a + 1; b < langs.length; b++) {
        const [A, B] = [langs[a], langs[b]];
        for (const [key, valueA] of byLang[A]) {
          if (byLang[B].get(key) !== valueA) continue;
          const p = prose(valueA);
          if (p.length < PROSE || ALLOWED.some((rx) => rx.test(p))) continue;
          found.push(`${kind}: ${A} and ${B} ship the identical string for ${key}\n` +
            `      ${JSON.stringify(p.slice(0, 110))}${p.length > 110 ? "…" : ""}`);
        }
      }
    }
  }
  for (const e of entries) {
    if (e.kind !== "home" && e.kind !== "docs") continue;
    const text = htmlText(e.text.replace(/\n/g, " \u0000 ")).replace(STATUTE, "");
    const lines = text.split("\u0000");
    for (const [name, { re, own }] of Object.entries(SCRIPTS)) {
      if (own.includes(e.lang)) continue;
      const line = lines.find((s) => s.match(re));
      if (line) found.push(`${e.file} (${e.lang}) carries ${name} text: ${JSON.stringify(line.trim().slice(0, 110))}`);
    }
    if (MAJORITY[e.lang]) {
      const mine = (text.match(SCRIPTS[MAJORITY[e.lang]].re) || []).length;
      const latin = (text.match(/\p{Script=Latin}/gu) || []).length;
      if (mine <= latin) {
        found.push(`${e.file} (${e.lang}) is mostly not ${MAJORITY[e.lang]}: ${mine} ${MAJORITY[e.lang]} letters against ${latin} Latin`);
      }
    }
    const marker = NOT_IN[e.lang];
    if (marker) {
      const line = lines.find((s) => s.match(marker.re));
      if (line) found.push(`${e.file} (${e.lang}) carries ${marker.other}: ${JSON.stringify(line.trim().slice(0, 110))}`);
    }
  }
  return { found, dicts, strings };
}
const publishedEntries = publishedCopy();
const published = scanPublished(publishedEntries);
const publishedProblems = [...published.found];
// Positive control: every published language was read in both shapes, and English came from the page.
const expectLangs = new Set(publishedEntries.filter((e) => e.lang).map((e) => e.lang));
const homeLangs = Object.keys(published.dicts.home), docsLangs = Object.keys(published.dicts.docs);
if (homeLangs.length !== expectLangs.size || docsLangs.length !== expectLangs.size) {
  publishedProblems.push(`published copy: read ${homeLangs.length} homepage and ${docsLangs.length} docs language(s), `
    + `expected ${expectLangs.size} of each; a language was not compared`);
}
if ((published.dicts.home.en?.size || 0) < 100 || published.strings < 2000) {
  publishedProblems.push(`published copy: only ${published.dicts.home.en?.size || 0} English homepage strings and `
    + `${published.strings} strings in all were read; the scan is blind`);
}
// Negative control, in memory: each of the three checks must fire on the defect it exists for.
const enHome = [...(published.dicts.home.en || new Map())].find(([, v]) => prose(v).length >= PROSE);
const synthetic = publishedEntries.filter((e) => e.kind === "page").concat([
  { file: "synthetic/es.json", lang: "es", kind: "home",
    json: enHome ? { [enHome[0]]: enHome[1], x: "La integração com o Jira funciona sem configuração adicional." } : {},
    text: "La integração com o Jira funciona sem configuração adicional." },
  { file: "synthetic/ko.json", lang: "ko", kind: "docs", json: {}, text: "Привет, это русский текст в корейском файле." },
]);
const control = scanPublished(synthetic).found;
const fired = {
  identical: control.some((f) => f.includes("es and en ship the identical string") || f.includes("en and es ship the identical string")),
  script: control.some((f) => f.includes("synthetic/ko.json") && f.includes("Cyrillic")),
  marker: control.some((f) => f.includes("synthetic/es.json") && f.includes("Portuguese")),
};
for (const [which, ok] of Object.entries(fired)) {
  if (!ok) publishedProblems.push(`negative control did not fire: the ${which} check missed its planted defect`);
}
if (publishedProblems.length) {
  console.error(`check-locale-crosstalk FAILED: ${publishedProblems.length} problem(s) in the published copy.`);
  for (const p of publishedProblems) console.error("  - " + p);
  process.exit(1);
}

if (!locales.size) {
  console.error("check-locale-crosstalk FAILED: parsed no locale dictionaries from app.js.");
  console.error("  That is a parser failure, not a clean result. A guard that reads nothing");
  console.error("  reports PASS forever, which is how the defect it was written for survived.");
  process.exit(1);
}

if (problems.length) {
  console.error(`check-locale-crosstalk FAILED: ${problems.length} cross-locale duplicate(s).`);
  for (const p of problems) console.error("  - " + p);
  console.error("\n  A key holding another language passes key parity. Translate the value,");
  console.error("  or if the strings are identical on purpose add a narrow ALLOWED entry.");
  process.exit(1);
}

console.log(
  `check-locale-crosstalk OK: ${locales.size} locales, ` +
  `${[...flat.values()].reduce((n, m) => n + m.size, 0)} strings, ` +
  `no locale ships another locale's prose. Published copy: ${homeLangs.length} homepage and ` +
  `${docsLangs.length} docs languages, ${published.strings} strings, no shared prose, no foreign script, ` +
  `no Portuguese in Spanish or Spanish in Portuguese.`
);
