/**
 * THE SITE MUST SAY WHICH TRACKERS TAKE A FILE, IN EVERY LANGUAGE.
 *
 * WHY THIS EXISTS. bugit.dev used to answer a FAQ question about screenshots with the sentence
 * "Uploads land on eight of the eleven trackers." On 2026-08-24 an audit found that no reader,
 * in any of the eleven languages, was being told that any more -- while the sentence was still
 * sitting in app.js, which is why grepping the source found it and reading the page did not.
 *
 * Nothing was deleted. The FAQ lives in three structures and the last writer wins:
 *
 *     Object.keys(bugitV16Faq).forEach(code=>{ if(i18n[code]) i18n[code].faq.items = bugitV16Faq[code]; });
 *
 * That is an ASSIGNMENT, not a merge. The v16 set replaced the base set wholesale, the base set
 * was where the screenshots question lived, and the qualification went with it. A question that
 * is overwritten rather than removed leaves no diff that looks like a deletion.
 *
 * It matters because BugIt uploads to EIGHT of the eleven. GitHub Issues, GitLab Issues and
 * Bugzilla each refuse a file by name, before any upload -- read `add_attachment` in
 * tools/<provider>_rest.py in the agent repo, or run tools/attachment_reality.py, which reports
 * it by parsing those methods rather than by holding a list. A buyer on Bugzilla who chose BugIt
 * for its evidence handling has been told nothing to the contrary.
 *
 * WHAT IT ASSERTS. In every shipped language, one FAQ answer states how many of the eleven take
 * an upload and NAMES the three that do not, as refusing. Both halves are required: "eight of
 * eleven" alone leaves a Bugzilla buyer to work out which eight, and Bugzilla is precisely the
 * one that gets dropped from every list that carries only a number.
 *
 * THE SUBJECT IS THE SITE'S OWN LOCALE TABLE, not a list typed here: every locale app.js ships
 * is checked, so a twelfth language is covered the day it is added.
 *
 * EACH LOCALE IS READ ON ITS OWN, FROM THE DICTIONARY A VISITOR GETS (CR-08-F10). This used to
 * take the 80,000 characters after each `add("xx", {` call and the 50,000 after its FAQ marker,
 * with no regard for where that locale's object ended, then join every matching answer and ask
 * whether the count and the three names appeared anywhere in the join. A locale whose answer had
 * been lost could borrow the next locale's correct one out of the window and pass. It was doing
 * so: the Korean tracker answer names none of the eleven, so it was never the "enumerating"
 * answer this looked for, and the Korean result was being produced from text that belonged to
 * another language. The dictionaries now come from scripts/lib/copy-effective-i18n.mjs, which
 * runs app.js and returns `i18n[code].faq.items` exactly as applyLang() reads it, and the set of
 * dictionaries must be exactly the site's `languages` table.
 *
 * AND THE SENTENCE MUST SAY THEY REFUSE, NOT MERELY NAME THEM. Provider names on their own are
 * not a limitation: "uploads reach GitHub Issues, GitLab Issues and Bugzilla" names all three.
 * So per locale, one sentence of the answer has to state the count ("eight of the eleven", in
 * that language's words) and one sentence of the SAME answer has to name all three refusers
 * together with that language's wording for "does not upload / is not supported". The word
 * lists are per language on purpose: an English "not supported" left behind in the Korean
 * dictionary is an untranslated answer, and it must not count as the Korean one. A new language
 * with no entry in LOCALE_WORDS fails until somebody writes down how that language says it.
 * This is a mechanical check that the statement is present and shaped as a refusal; it is not a
 * translation review.
 *
 * THE GUARD PROVES ITSELF FIRST. Before reading the live result it runs its own predicate over
 * planted copies of the real dictionaries (one locale's answer removed while its neighbours stay
 * correct, Bugzilla dropped, the names kept but the refusal reversed, a locale missing) and
 * exits 2 if any of them is accepted, or if a correct alternative wording is rejected.
 *
 * The authority for the eight/three split is the agent repo, which this repo cannot import --
 * the same situation as check-tracker-claims.mjs, and handled the same way: the three refusers
 * are mirrored below with a pointer, and the COUNT is derived from them, so a mirror that goes
 * stale disagrees with itself and fails here rather than shipping quietly.
 *
 * Run: `node scripts/check-attachment-claim.mjs` (or `npm run test:attachment-claim`).
 */
import { loadEffectiveI18n } from "./lib/copy-effective-i18n.mjs";

// Mirrors generic-qa-agent/tools/attachment_reality.py -- which holds no list either, and reads
// `add_attachment` in each tools/<provider>_rest.py. Eleven fileable, three of them refuse.
const REFUSERS = ["GitHub Issues", "GitLab Issues", "Bugzilla"];
const FILEABLE_TOTAL = 11;
const UPLOADS = FILEABLE_TOTAL - REFUSERS.length;   // 8, derived, never typed twice

// How each language writes "eight", "eleven" and "BugIt does not upload / it is not supported".
// A locale that says it a way this does not know is a FAILURE here, not a silent pass: the point
// is that the limitation reaches the reader. The digits are accepted in every language.
const D8 = /(^|[^\d])8([^\d]|$)/;
const D11 = /(^|[^\d])11([^\d]|$)/;
const LOCALE_WORDS = {
  en: { eight: /\beight\b/i, eleven: /\beleven\b/i,
    refuse: /\b(?:not supported|do(?:es)? not (?:upload|accept|take|support)|cannot (?:upload|attach)|refuses?)\b/i },
  ja: { eight: /八/, eleven: /十一/,
    refuse: /アップロード(?:しない|しません|できません)|非対応|対応していません/ },
  es: { eight: /\bocho\b/i, eleven: /\bonce\b/i,
    refuse: /\bno (?:sube|admite|acepta|permite)|\bno se (?:admite|suben|permiten)/i },
  fr: { eight: /\bhuit\b/i, eleven: /\bonze\b/i,
    refuse: /n[’'](?:envoie|accepte) pas|\bne (?:prend|sont) pas|pas pris en charge/i },
  de: { eight: /\bacht\b/i, eleven: /\belf\b/i,
    refuse: /lädt keine|keine Dateien|nicht unterstützt|nicht möglich/i },
  "pt-br": { eight: /\boito\b/i, eleven: /\bonze\b/i,
    refuse: /não (?:envia|aceita|suporta|há suporte)/i },
  it: { eight: /\botto\b/i, eleven: /\bundici\b/i,
    refuse: /\bnon (?:carica|accetta|supporta|è supportat)/i },
  ko: { eight: /여덟/, eleven: /열한/,
    refuse: /업로드하지 않|지원하지 않|지원되지 않/ },
  zh: { eight: /八/, eleven: /十一/,
    refuse: /不会[^，。]{0,80}上传|不支持|不能[^，。]{0,80}上传/ },
  ru: { eight: /восьм|восемь/i, eleven: /одиннадцат/i,
    refuse: /не (?:загружает|поддерж|принимает)/i },
  ar: { eight: /ثمان/, eleven: /أحد عشر/,
    refuse: /لا (?:يرفع|يدعم)|غير مدعوم/ },
};

/** Split an answer into sentences, in the scripts this site ships. A colon or semicolon does
 *  not end a sentence: "eight of the eleven; uploads to X are not supported" is one statement. */
const sentences = (text) => text.split(/(?<=[.!?؟])\s+|(?<=[。！？])|\n+/)
  .map((s) => s.trim()).filter(Boolean);

/**
 * The assertion, over one set of effective dictionaries. Returns the problems found; an empty
 * list means every locale in `codes` states the limitation in its OWN answer.
 */
function problemsFor(i18n, codes) {
  const problems = [];
  const have = Object.keys(i18n).sort().join(",");
  const want = [...codes].sort().join(",");
  if (have !== want) {
    problems.push(`the dictionaries app.js builds (${have}) are not the languages it ships (${want})`);
  }
  for (const lang of codes) {
    const words = LOCALE_WORDS[lang];
    if (!words) {
      problems.push(`${lang}: no entry in LOCALE_WORDS, so there is no way to tell whether this ` +
        `language states the upload limitation. Add how it writes "${UPLOADS}", ` +
        `"${FILEABLE_TOTAL}" and "does not upload".`);
      continue;
    }
    const items = i18n[lang] && i18n[lang].faq && i18n[lang].faq.items;
    if (!Array.isArray(items) || items.length === 0) {
      problems.push(`${lang}: the effective dictionary has no FAQ at all`);
      continue;
    }
    const answers = items.map((pair) => (Array.isArray(pair) ? String(pair[1] || "") : ""));
    const eight = (s) => words.eight.test(s) || D8.test(s);
    const eleven = (s) => words.eleven.test(s) || D11.test(s);
    const namesAll = (s) => REFUSERS.every((r) => s.includes(r));
    // The answer that carries the statement: one of its sentences gives the count, and one of
    // its sentences names all three refusers as refusing. Both must be in the SAME answer.
    let countOnly = false;
    let namesOnly = false;
    let found = false;
    for (const a of answers) {
      const ss = sentences(a);
      const saysCount = ss.some((s) => eight(s) && eleven(s));
      const refusal = ss.some((s) => namesAll(s) && words.refuse.test(s));
      if (saysCount && refusal) { found = true; break; }
      if (saysCount) countOnly = true;
      if (ss.some(namesAll)) namesOnly = true;
    }
    if (!found) {
      if (countOnly) {
        problems.push(`${lang}: the FAQ says ${UPLOADS} of ${FILEABLE_TOTAL} take an upload but no ` +
          `sentence of that answer names ${REFUSERS.join(", ")} as refusing a file. A count with ` +
          `no names leaves a Bugzilla buyer to guess, and Bugzilla is the one that always gets dropped.`);
      } else if (namesOnly) {
        problems.push(`${lang}: an FAQ answer names ${REFUSERS.join(", ")} but never states, in this ` +
          `language, that they refuse a file and that ${UPLOADS} of the ${FILEABLE_TOTAL} take one. ` +
          `Naming a provider is not stating a limitation.`);
      } else {
        problems.push(`${lang}: no FAQ answer states that ${UPLOADS} of the ${FILEABLE_TOTAL} ` +
          `trackers take an upload and that ${REFUSERS.join(", ")} do not. A reader is left to ` +
          `assume all of them do.`);
      }
    }
    // A claim that uploads reach ALL of them is worse than silence.
    const joined = answers.join("\n");
    if (/all eleven[^.\n]{0,40}(upload|attach)|(upload|attach)[^.\n]{0,40}all eleven/i.test(joined)) {
      problems.push(`${lang}: the FAQ claims uploads reach all ${FILEABLE_TOTAL} trackers`);
    }
  }
  return problems;
}

let effective;
try {
  effective = loadEffectiveI18n();
} catch (e) {
  console.error(`\ncheck-attachment-claim: FAIL\n  - ${e.message}`);
  process.exit(1);
}
const { i18n, codes } = effective;

// --- the self-test: the predicate must reject planted defects ---------------------------- //
// Runs on every invocation, over copies of the real dictionaries, so it keeps proving itself in
// CI. Each plant leaves every OTHER locale correct, which is exactly the situation the old
// character windows could not tell apart from a pass.
const problems = problemsFor(i18n, codes);
{
  // A plant counts as caught only if it adds a problem the live dictionaries do not already
  // have, so a live failure elsewhere cannot make every plant look rejected.
  const baseline = new Set(problems);
  const added = (dict) => problemsFor(dict, codes).filter((p) => !baseline.has(p));
  const clone = () => JSON.parse(JSON.stringify(i18n));
  const answerIndex = (dict, lang) => dict[lang].faq.items.findIndex(
    ([, a]) => REFUSERS.every((r) => String(a).includes(r)));
  const victim = codes.find((c) => c !== "en");
  const plants = [];
  {
    const d = clone();
    const i = answerIndex(d, victim);
    if (i >= 0) d[victim].faq.items.splice(i, 1);
    plants.push([`${victim} answer removed, neighbours intact`, d, i >= 0]);
  }
  {
    const d = clone();
    const i = answerIndex(d, "en");
    if (i >= 0) d.en.faq.items[i][1] = d.en.faq.items[i][1].split("Bugzilla").join("YouTrack");
    plants.push(["en answer drops Bugzilla", d, i >= 0]);
  }
  {
    const d = clone();
    const i = answerIndex(d, "en");
    if (i >= 0) d.en.faq.items[i][1] = "Uploads reach eight of the eleven, including GitHub Issues, " +
      "GitLab Issues and Bugzilla, which accept screenshots and logs.";
    plants.push(["en refusal reversed, names kept", d, i >= 0]);
  }
  {
    const d = clone();
    delete d[victim];
    plants.push([`${victim} dictionary missing`, d, true]);
  }
  for (const [label, dict, planted] of plants) {
    if (!planted) {
      console.error(`SELF-TEST FAILED: could not plant "${label}": the live answer no longer has ` +
        "the shape this self-test edits, so update the plant.");
      process.exit(2);
    }
    if (added(dict).length === 0) {
      console.error(`SELF-TEST FAILED: the planted defect "${label}" was accepted. This guard ` +
        "cannot fail for the reason it was written, so it proves nothing.");
      process.exit(2);
    }
  }
  // A correct alternative wording must still pass: the rule is the meaning, not one sentence.
  {
    const d = clone();
    const i = answerIndex(d, "en");
    d.en.faq.items[i][1] = "Eight of the eleven take screenshot and log uploads. GitHub Issues, " +
      "GitLab Issues and Bugzilla do not accept uploads, and BugIt tells you before you try.";
    const left = problemsFor(d, codes).filter((p) => p.startsWith("en:"));
    if (left.length) {
      console.error("SELF-TEST FAILED: a correct alternative English wording was rejected:\n  - " +
        left.join("\n  - "));
      process.exit(2);
    }
  }
  console.log(`self-test: ${plants.length} planted defects rejected, an alternative wording accepted`);
}

// --- the live dictionaries ---------------------------------------------------------------- //
if (problems.length) {
  console.error(`\ncheck-attachment-claim: FAIL (${problems.length})`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`check-attachment-claim: OK (${codes.length} languages, each read from its own effective ` +
  `dictionary; each states that ${UPLOADS} of the ${FILEABLE_TOTAL} trackers take an upload and ` +
  `names ${REFUSERS.join(", ")} as the ones that do not)`);
