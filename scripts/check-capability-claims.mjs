/**
 * No locale may tell a buyer that GitHub Copilot is required. It is not.
 *
 * WHY THIS EXISTS. The 2026-09-02 external audit of the 1.3.2 drop found (round 2, F-01) that
 * the "Runs in VS Code" card had been broadened in nine locales and not in two:
 *
 *   - ARABIC still carried the older, narrower sentence: "You will also need Copilot (or your
 *     own AI key) and Python." It never mentioned the Claude extension or a plain terminal.
 *   - FRENCH carried the NEW sentence and the OLD requirement together, so one paragraph said
 *     the Claude extension works and then said GitHub Copilot is required.
 *
 * A false purchase requirement, on the card directly above the pricing block, in the language
 * least likely to be spot-checked. The Arabic page's own FAQ answered "Do I need GitHub
 * Copilot?" correctly two cards away, so the page contradicted itself.
 *
 * WHY NOT THE TEST THE AUDIT PROPOSED. The report suggested comparing the SET of product tokens
 * each locale names against English's. That would have caught Arabic and PASSED FRENCH: French
 * names Copilot, Claude and a terminal, exactly as English does, and is still wrong. The report
 * says as much itself about a "Claude" keyword search, then proposes the same shape one size up.
 * The defect is not WHICH products are named, it is that one sentence names Copilot as the
 * requirement with no alternative beside it.
 *
 * WHAT IS ASSERTED, and both rules are needed because the two locales failed differently:
 *
 *   A. Every locale's card names BOTH Copilot and Claude.  (Arabic named only Copilot.)
 *   B. Within a locale's card, every SENTENCE naming Copilot also names Claude.
 *      (French's requirement sentence named Copilot alone.)
 *
 * Neither rule needs a per-language word list, because "Copilot" and "Claude" are Latin brand
 * names in all eleven locales including Arabic, Japanese, Korean, Chinese and Russian. That is
 * deliberate: a guard with a hand-written vocabulary per language is a guard that goes stale in
 * ten places at once.
 *
 * NO `\w` ANYWHERE. In JavaScript `\w` is ASCII-only, so any accented, Cyrillic, CJK or Arabic
 * word silently drops out of a word-boundary match and the guard passes on text it never read.
 * That exact bug shipped in a ported guard on 2026-09-01. Sentence splitting here is done on
 * explicit terminators, and token detection on plain substring search.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishedCopy, publishedLangs, htmlText } from "./lib/published-copy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/** The key that carries the capability claim. */
const KEY = "trust.vscode";

/** Brand tokens, spelled the same way in every locale because they are product names. */
const COPILOT = "Copilot";
const CLAUDE = "Claude";

/**
 * Split into sentences on terminators used across the eleven locales: the ASCII full stop
 * (followed by whitespace or end), and the CJK ideographic full stop, which takes no space
 * after it. Arabic uses the ASCII full stop in this copy.
 */
function sentences(text) {
  return text
    .split(/(?<=。|！|？)|(?<=[.!?])(?=\s)/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** English, read from the no-JS fallback in index.html so the HTML and the dictionary agree. */
function englishClaim() {
  const m = new RegExp(`data-t="${KEY.replace(".", "\\.")}"\\s*>([^<]*)<`).exec(html);
  return m ? m[1] : null;
}

/**
 * Every localized dictionary, taken from `add('xx', {...})`. The LATER declaration of a locale
 * wins at runtime, so `set` deliberately overwrites: the last one is the one a reader sees.
 * This mirrors how check-locale-crosstalk.mjs reads the same file.
 */
function localizedClaims() {
  const out = new Map();
  for (const line of app.split("\n")) {
    const m = /^\s*add\((['"])([a-z-]+)\1\s*,\s*(\{.*\})\s*\)\s*;?\s*$/.exec(line);
    if (!m) continue;
    let dict;
    try {
      dict = new Function(`"use strict"; return (${m[3]});`)();
    } catch {
      continue;
    }
    if (!dict || typeof dict !== "object" || !dict.name) continue;
    const value = KEY.split(".").reduce((o, k) => (o == null ? o : o[k]), dict);
    if (typeof value === "string") out.set(m[2], value);
  }
  return out;
}

const problems = [];

const english = englishClaim();
if (!english) {
  problems.push(`could not read the English ${KEY} fallback from index.html; every comparison ` +
                `below would be vacuous.`);
}

const claims = localizedClaims();
if (english) claims.set("en", english);

// A guard whose subject has quietly emptied passes for the wrong reason. Eleven is the shipped
// locale count; fewer means the parser stopped seeing dictionaries, not that the site shrank.
const EXPECTED_LOCALES = 11;
if (claims.size < EXPECTED_LOCALES) {
  problems.push(`only ${claims.size} locales declare ${KEY} (expected ${EXPECTED_LOCALES}: ` +
                `${[...claims.keys()].sort().join(", ")}). A locale that does not declare it ` +
                `inherits the English text and shows English copy to a non-English reader.`);
}

for (const [locale, text] of [...claims].sort()) {
  const namesCopilot = text.includes(COPILOT);
  const namesClaude = text.includes(CLAUDE);

  // RULE A — both alternatives must be present somewhere in the card.
  if (!namesCopilot || !namesClaude) {
    const missing = [!namesCopilot && COPILOT, !namesClaude && CLAUDE].filter(Boolean);
    problems.push(
      `[${locale}] ${KEY} does not name ${missing.join(" or ")}. Nine locales say filing is a ` +
      `command that works the same with Copilot Chat, with the Claude extension and in a plain ` +
      `terminal; a locale naming only one of them states a requirement that does not exist.\n` +
      `        ${text}`);
    continue;
  }

  // RULE B — no sentence may name Copilot without naming an alternative beside it.
  for (const sentence of sentences(text)) {
    if (sentence.includes(COPILOT) && !sentence.includes(CLAUDE)) {
      problems.push(
        `[${locale}] this sentence names ${COPILOT} with no alternative in it, which reads as a ` +
        `requirement:\n        ${sentence}\n` +
        `        Naming Claude elsewhere in the card does not repair it. That is exactly how ` +
        `French shipped: the paragraph said the Claude extension works and then said GitHub ` +
        `Copilot is required.`);
    }
  }
}

/* RULE C — THE ONLINE GUIDES, the pages at /docs. Rules A and B read one dictionary key, and the
   Getting Started and Overview pages said "Windows 11 with VS Code and GitHub Copilot is the
   release-qualified client path" in all eleven locales, naming no alternative, while the homepage
   and the buyer's own guides said the Claude extension and a terminal work the same (full-project
   review, 2026-09-23). Each page must name Claude, and no sentence may pair Copilot with
   "Windows 11" (the platform claim) without naming Claude too. Pages are discovered, not listed. */
const DOCS = path.join(ROOT, "public", "docs");
const guidePages = fs.readdirSync(DOCS).filter((n) => /^(GETTING_STARTED|OVERVIEW)(\.[a-z-]+)?\.web\.md$/.test(n));
if (guidePages.length < 2 * EXPECTED_LOCALES) {
  problems.push(`only ${guidePages.length} online Getting Started / Overview pages found (expected ` +
                `${2 * EXPECTED_LOCALES}); the reader lost its subject`);
}
for (const name of guidePages.sort()) {
  const text = fs.readFileSync(path.join(DOCS, name), "utf8");
  if (!text.includes(CLAUDE)) {
    problems.push(`[${name}] never names ${CLAUDE}; the online guide reads as Copilot-only`);
  }
  for (const line of text.split(/\r?\n/)) {
    for (const sentence of sentences(line)) {
      if (sentence.includes(COPILOT) && sentence.includes("Windows 11") && !sentence.includes(CLAUDE)) {
        problems.push(`[${name}] a platform sentence names ${COPILOT} as the only path:\n        ${sentence}`);
      }
    }
  }
}

/* RULE D — THE PUBLISHED COPY, 2026-10-04. On that day bugit.dev switched to the redesign:
   build.js publishes v2/index.html as the homepage and v2/docs/index.html as /docs/. app.js and
   index.html, which rules A and B read, are still built but no published page references them,
   so the claim a buyer actually reads (the homepage in v2/i18n/<lang>.json, the docs FAQ in
   v2/docs/content.<lang>.json, the English written into the pages) was guarded by nothing.
   scripts/lib/published-copy.mjs is the one place that knows those files; this asks it.

   The trust.vscode key does not exist in the redesign, so rule B cannot be ported as written:
   the published FAQ legitimately has Copilot-only sentences ("Do I need GitHub Copilot?", "GitHub
   Copilot is the easiest setup and is recommended", the model-choice answer), and requiring
   Claude in every one would demand that the copy stop answering questions about Copilot. What
   is asserted instead:

     D1. Every published language's copy names both Copilot and Claude, and every entry that
         names Copilot also names Claude somewhere. (Arabic's 2026-09-02 failure: Copilot only.)
     D2. No sentence that names Copilot TOGETHER WITH a requirement anchor (Python, Windows 11,
         VS Code / Visual Studio Code) omits Claude. The requirement sentence is the one that
         lists what you need, and those anchors are Latin product names in all eleven languages,
         so no per language vocabulary is needed. (French's failure, in its shape.)

   Pages are reduced to visible text with block elements kept apart, so a requirement sentence
   in one paragraph cannot borrow "Claude" from the next. JSON values may carry inline markup
   (Arabic wraps product names in <bdi>), which is stripped per value. */
const ANCHORS = ["Python", "Windows 11", "VS Code", "Visual Studio Code"];
const BLOCK = /<\/?(?:p|li|ul|ol|div|section|article|header|footer|nav|main|aside|h[1-6]|br|td|th|tr|dt|dd|summary|details|figure|figcaption|button|blockquote)\b[^>]*>/gi;
const SEP = "";

function publishedUnits(entry) {
  if (entry.kind === "page") {
    return htmlText(entry.text.replace(BLOCK, ` ${SEP} `)).split(SEP);
  }
  return entry.text.split(/\r?\n/).map((v) => v.replace(/<[^>]+>/g, " "));
}

function checkPublishedEntry(entry) {
  const out = [];
  const units = publishedUnits(entry);
  const all = units.join("\n");
  if (all.includes(COPILOT) && !all.includes(CLAUDE)) {
    out.push(`[${entry.file}] names ${COPILOT} and never ${CLAUDE}; this copy reads as Copilot only`);
  }
  for (const unit of units) {
    for (const sentence of sentences(unit)) {
      if (sentence.includes(COPILOT) && !sentence.includes(CLAUDE) && ANCHORS.some((a) => sentence.includes(a))) {
        out.push(`[${entry.file}] a requirement sentence names ${COPILOT} as the only path:\n        ${sentence}`);
      }
    }
  }
  return out;
}

const published = publishedCopy();
const langs = publishedLangs();
// NEGATIVE CONTROLS, in memory only: Arabic's shape (Copilot, no Claude anywhere) and French's
// shape (Claude named, then a requirement sentence with Copilot alone). Both must be flagged.
const controls = [
  { file: "<control:ar>", lang: "ar", kind: "home", text: "ستحتاج أيضا إلى Copilot و Python." },
  { file: "<control:fr>", lang: "fr", kind: "docs",
    text: "L’extension Claude fonctionne aussi.\nBugIt fonctionne dans VS Code. GitHub Copilot et Python sont requis." },
  { file: "<control:page>", lang: "en", kind: "page",
    text: "<p>Use the Claude extension.</p><p>You need GitHub Copilot and Python 3.10.</p>" },
];
for (const c of controls) {
  if (checkPublishedEntry(c).length === 0) problems.push(`published copy: negative control did not fire (${c.file})`);
}
// POSITIVE CONTROL: every published language must have copy that names both brands, and the
// subject must be the size the site is, so an emptied reader cannot pass.
for (const lang of langs) {
  const text = published.filter((e) => e.lang === lang).map((e) => e.text).join("\n");
  if (!text) problems.push(`published copy: nothing read for ${lang}`);
  else if (!text.includes(COPILOT) || !text.includes(CLAUDE)) {
    problems.push(`published copy: [${lang}] does not name both ${COPILOT} and ${CLAUDE} anywhere`);
  }
}
const publishedChars = published.reduce((n, e) => n + e.text.length, 0);
if (published.length < 2 * langs.length || publishedChars < 100000) {
  problems.push(`published copy: only ${published.length} entries / ${publishedChars} characters read`);
}
for (const e of published) problems.push(...checkPublishedEntry(e));

if (problems.length) {
  for (const p of problems) console.error(`FAIL: ${p}`);
  console.error(`\ncheck-capability-claims: ${problems.length} problem(s). The site states a ` +
                `purchase requirement that is not true.`);
  process.exit(1);
}
console.log(`check-capability-claims: OK — all ${claims.size} locales name both Copilot and ` +
            `Claude in ${KEY}, and no sentence names Copilot as the sole option.`);
console.log(`  published copy: ${published.length} entries (${publishedChars} characters) across ` +
            `${langs.length} languages name both, no requirement sentence names Copilot alone; ` +
            `${controls.length} negative controls fired.`);
