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
    [/(?<![\p{L}\p{N}_])trackers?(?![\p{L}\p{N}_])/gu, "rastreador / rastreadores",
      "LQA-0057: the guide's Portuguese term is rastreador"],
    [/contra[^.<>]{0,40}?destino/gu, "no destino escolhido",
      "LQA-0057: verifica contra o seu destino preserves English syntax"],
  ],
  ja: [[/重要度/gu, "重大度", "LQA-0047, LQA-0048: 重大度 is the product's term for severity"]],
  ko: [[/리포트/gu, "보고서", "LQA-0049: the product standardised on 보고서"]],
  ru: [[/важност/gu, "серьёзност", "LQA-0062: важность is a third label for the severity field"]],
  zh: [[/您/gu, "你", "LQA-0001..: the Chinese product copy uses the direct register"]],
};

const isLegal = (name) => LEGAL.some((stem) => name.toUpperCase().startsWith(stem));

/** Every Markdown page under public/docs, grouped by the locale in its filename. */
function pagesByLocale() {
  const out = new Map();
  for (const name of readdirSync(docs)) {
    if (!name.endsWith(".md") || isLegal(name)) continue;
    // STEM.<locale>.web.md, or STEM.web.md for English.
    const m = /^[^.]+\.([a-z]{2}(?:-[a-z]{2})?)\.web\.md$/.exec(name);
    if (!m) continue;
    if (!out.has(m[1])) out.set(m[1], []);
    out.get(m[1]).push(name);
  }
  return out;
}

const pages = pagesByLocale();
if (pages.size === 0) {
  console.error("FAIL: found no localized doc pages under public/docs, so this guard checked nothing");
  process.exit(1);
}

const findings = [];
let scanned = 0;
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
  console.error(`FAIL: ${findings.length} retired term(s) on the online guides\n`);
  for (const f of findings) console.error("  " + f);
  console.error(
    "\nThese pages are what bugit.dev serves at /docs. A term corrected in the package guides " +
    "and the PDFs but not here means a reader of that language meets both words.");
  process.exit(1);
}
/* Say what was NOT looked at. A locale with no retired-term list is not a locale that passed,
   and a summary that reported only the pages it scanned would read like full coverage. */
console.log(
  `check-retired-vocabulary OK: ${scanned} of ${total} online guide page(s) carry no retired term ` +
  `(${covered} of ${pages.size} locales have a list).`);
if (uncovered.length) {
  console.log(`  no retired-term list yet, so NOT checked: ${uncovered.join(", ")}`);
}
console.log("  legal pages (LICENSE, PRIVACY, REFUND, SECURITY, TOKUSHOHO) are flag-only and out of scope.");
