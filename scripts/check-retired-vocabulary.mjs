// The online guides must not keep a word the product has retired.
//
// WHY THIS EXISTS. bugit.dev renders `/public/docs/<STEM>.<lang>.web.md` as the online
// documentation in eleven languages. It is a THIRD copy of content that also exists as the
// package guides in the agent repository and as the printed PDF guides in this one, and until
// 2026-09-01 nothing compared it with either. So when the localization round replaced the
// Spanish filing verb and the "check X against Y" calque everywhere it could see, and the
// Korean report noun after that, this copy kept all three: the Spanish page still read
// "BugIt archiva" and "comprueba esa credencial contra tu destino" on a live customer page,
// months after both were corrected in the guides a buyer downloads.
//
// The round could not have caught it. What we hand an LQA auditor for the "website" surface is
// the app.js dictionary and nothing else, so these pages have never been in scope. That is our
// omission in what we extract, and this guard is the standing answer to it.
//
// WHAT IS COMPUTED AND WHAT IS LISTED, deliberately split. The FILES are computed -- every
// Markdown page under public/docs, per locale, discovered by reading the directory -- so a
// twelfth language, or a third guide, is covered the day it lands. The TERMS are listed,
// because "archiva is the wrong verb here" is a decision somebody made and no amount of
// scanning derives it. A guard that listed its files instead would go stale the first time a
// page was added, which is the failure this repository keeps rediscovering.
//
// LEGAL PAGES ARE OUT OF SCOPE, by the same rule the applier uses. LICENSE, PRIVACY, REFUND,
// SECURITY and TOKUSHOHO are flag-only: their wording is constrained by law and by what the
// payment processor requires, and the Chinese ones use the formal 您 throughout on purpose
// while the product copy uses 你. Sweeping them would either produce a permanent red or invite
// somebody to "fix" legal text to silence a guard.
//
// Run: `node scripts/check-retired-vocabulary.mjs`. No dependencies.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = join(root, "public", "docs");

/** Flag-only pages. Matched on the filename stem so one entry covers all eleven locales. */
const LEGAL = ["LICENSE", "PRIVACY", "REFUND", "SECURITY", "TOKUSHOHO"];

/**
 * Per locale: a word the product retired, what replaced it, and who decided.
 * Each entry names the finding that settled it so a reader can go and read the argument.
 */
const RETIRED = {
  es: [
    [/(?<![\p{L}\p{N}_])[Aa]rchiv(a|ar|an)(?![\p{L}\p{N}_])/gu, "registra tickets / registrar tickets",
      "LQA-0033, LQA-0036: archivar describes storage, not creating a ticket"],
    [/contra[^.<>]{0,40}?destino/gu, "en el destino elegido",
      "LQA-0033: comprobar contra su destino is a literal English calque"],
  ],
  "pt-br": [
    // CASE-INSENSITIVE, and that is not a detail: the two instances that survived the round in
    // the buyer's own guide were the capitalised ones, "Trackers (Jira/ADO)" and the heading
    // "**Trackers: onde o ticket de bug vive**". A case-sensitive rule reported the file clean.
    [/(?<![\p{L}\p{N}_])trackers?(?![\p{L}\p{N}_])/giu, "rastreador / rastreadores",
      "LQA-0057: the guide's Portuguese term is rastreador"],
    [/contra[^.<>]{0,40}?destino/gu, "no destino escolhido",
      "LQA-0057: verifica contra o seu destino preserves English syntax"],
  ],
  ja: [[/重要度/gu, "重大度", "LQA-0047, LQA-0048: 重大度 is the product's term for severity"]],
  ko: [
    [/리포트/gu, "보고서", "LQA-0049: the product standardised on 보고서"],
    // The spaced form reads as the verb phrase "to look in advance"; the unspaced one is the
    // lexicalised UI noun. Japanese and Chinese each use ONE word for both the UI preview and
    // the release stage, so Korean does too -- including "미리보기 상태" for "in Preview".
    [/미리 보기/gu, "미리보기", "LQA-0050: standardise the preview noun on 미리보기"],
  ],
  ru: [[/важност/gu, "серьёзност", "LQA-0062: важность is a third label for the severity field"]],
  zh: [[/您/gu, "你", "LQA-0001..: the Chinese product copy uses the direct register"]],
  ar: [[/إيداع/gu, "إنشاء التذكرة وإرسالها",
    "LQA-0066..0069: إيداع reads as depositing or lodging, not filing a ticket"]],
};

const isLegal = (name) => LEGAL.some((stem) => name.toUpperCase().startsWith(stem));

/** Every Markdown page under public/docs, grouped by the locale in its filename. */
function pagesByLocale() {
  const out = new Map();
  for (const name of readdirSync(docs)) {
    if (!name.endsWith(".md") || isLegal(name)) continue;
    // STEM.<locale>.web.md, or STEM.web.md for English. The locale group is OPTIONAL: the
    // comment said so and the regex did not, so GETTING_STARTED.web.md and OVERVIEW.web.md were
    // silently dropped and the guard's own totals understated its subject by two files. English
    // then appeared in neither the checked list nor the uncovered list, which is the worst of
    // the three states: invisible.
    const m = /^[^.]+(?:\.([a-z]{2}(?:-[a-z]{2})?))?\.web\.md$/.exec(name);
    if (!m) continue;
    const locale = m[1] ?? "en";
    if (!out.has(locale)) out.set(locale, []);
    out.get(locale).push(name);
  }
  return out;
}

const pages = pagesByLocale();
if (pages.size === 0) {
  console.error("FAIL: found no localized doc pages under public/docs, so this guard checked nothing");
  process.exit(1);
}

/**
 * THE SITE DICTIONARY, which is where all six live instances actually were.
 *
 * This guard shipped checking `public/docs` alone and reported "OK" while bugit.dev was serving
 * "전체 리포트 보기", "一貫した重要度とカテゴリ", "Единые уровни важности и категории",
 * "BugIt archiva en todos ellos" and "enviados ao seu tracker" to real readers. The site copy
 * lives in `app.js` -- twice, a hand-written block near the top and a generated one near the
 * bottom -- and the guard could not see the file at all. A green guard certifying the one
 * surface it does not read is worse than no guard.
 *
 * WHAT THIS CANNOT DO, STATED. `app.js` holds all eleven languages in one file, so a rule cannot
 * be attributed to a locale by filename the way it can for `NAME.ko.web.md`. Applying every
 * locale's rules to the whole file is wrong: the pt-br `trackers?` rule matches 131 times there,
 * because the ENGLISH copy says "tracker" everywhere and is right to.
 *
 * So this checks the terms that cannot collide with English: every non-Latin-script rule, plus
 * the exact Latin phrases the round retired. A NEW Latin-script term for a Latin-script locale
 * would need per-locale segmentation of the dictionary, which this does not attempt. That is a
 * real gap and it is written down rather than papered over.
 */
const DICTIONARY_FILES = ["app.js", "index.html"];
const isNonLatin = (re) => /[^\x00-\x7F]/.test(re.source) && !/[A-Za-z]/.test(re.source);

/**
 * `submitLabel` is a one-word noun in all eleven locales -- Submission, 提出, 제출, Envío,
 * Soumission, Einreichung, Envio, Invio, 提交, Отправка -- and the Arabic الإيداع is that label,
 * not the filing noun in running prose that LQA retired. Replacing it would break a dashboard
 * label and put Arabic out of step with the other ten. Narrow on purpose: the allowance is the
 * exact key-and-value pair, so the same word anywhere else in the file is still a finding.
 */
const DICTIONARY_ALLOWED = [
  /submitLabel"?\s*:\s*(['"])الإيداع\1/g,
];

function scanDictionary() {
  const out = [];
  const latinPhrases = [
    [/BugIt archiva/g, "BugIt registra tickets", "LQA-0033, LQA-0036 (site dictionary)"],
    [/ao seu tracker/g, "ao seu rastreador", "LQA-0057 (site dictionary)"],
    [/contra[^.<>]{0,40}?destino/g, "en el destino elegido / no destino escolhido", "LQA-0033"],
  ];
  for (const file of DICTIONARY_FILES) {
    let text;
    try {
      text = readFileSync(join(root, file), "utf8");
    } catch {
      continue;                        // an optional surface; absence is not a failure
    }
    let masked = text;
    for (const allow of DICTIONARY_ALLOWED) {
      masked = masked.replace(allow, (m) => " ".repeat(m.length));
    }
    const lines = masked.split(/\r?\n/);
    for (const [locale, rules] of Object.entries(RETIRED)) {
      for (const [pattern, replacement, why] of rules) {
        if (!isNonLatin(pattern)) continue;
        lines.forEach((line, i) => {
          for (const hit of line.matchAll(pattern)) {
            out.push(`${file}:${i + 1}  [${locale}] "${hit[0]}"  ->  ${replacement}\n      ${why}`);
          }
        });
      }
    }
    for (const [pattern, replacement, why] of latinPhrases) {
      lines.forEach((line, i) => {
        for (const hit of line.matchAll(pattern)) {
          out.push(`${file}:${i + 1}  "${hit[0]}"  ->  ${replacement}\n      ${why}`);
        }
      });
    }
  }
  return out;
}

const findings = [];
let scanned = 0;
findings.push(...scanDictionary());
for (const [locale, names] of [...pages].sort()) {
  const rules = RETIRED[locale];
  if (!rules) continue;
  for (const name of names.sort()) {
    scanned++;
    const text = readFileSync(join(docs, name), "utf8");
    const lines = text.split(/\r?\n/);
    for (const [pattern, replacement, why] of rules) {
      lines.forEach((line, i) => {
        for (const hit of line.matchAll(pattern)) {
          findings.push(`${name}:${i + 1}  "${hit[0]}"  ->  ${replacement}\n      ${why}`);
        }
      });
    }
  }
}

const total = [...pages.values()].reduce((n, v) => n + v.length, 0);
const covered = [...pages.keys()].filter((l) => RETIRED[l]).length;
const uncovered = [...pages.keys()].filter((l) => !RETIRED[l]).sort();
if (findings.length) {
  console.error(`FAIL: ${findings.length} retired term(s) on a live surface\n`);
  for (const f of findings) console.error("  " + f);
  console.error(
    "\nThese are what bugit.dev serves: the doc pages at /docs, and app.js, which is the site " +
    "copy itself. A term corrected in the package guides and the PDFs but not here means a " +
    "reader of that language meets both words.");
  process.exit(1);
}
/* Say what was NOT looked at. A locale with no retired-term list is not a locale that passed,
   and a summary that reported only the pages it scanned would read like full coverage. */
const dictScanned = DICTIONARY_FILES.filter((f) => {
  try { readFileSync(join(root, f), "utf8"); return true; } catch { return false; }
});
console.log(
  `check-retired-vocabulary OK: ${scanned} of ${total} online guide page(s) and ` +
  `${dictScanned.length} site dictionary file(s) (${dictScanned.join(", ")}) carry no retired ` +
  `term (${covered} of ${pages.size} locales have a list).`);
console.log(
  "  in the dictionary only non-Latin terms and the retired Latin PHRASES are checked, because " +
  "one file holds all eleven languages; see the note beside DICTIONARY_FILES.");
if (uncovered.length) {
  console.log(`  no retired-term list yet, so NOT checked: ${uncovered.join(", ")}`);
}
console.log("  legal pages (LICENSE, PRIVACY, REFUND, SECURITY, TOKUSHOHO) are flag-only and out of scope.");
