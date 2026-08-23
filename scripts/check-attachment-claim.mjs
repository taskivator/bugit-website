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
 * WHAT IT ASSERTS. In every shipped language, the FAQ answer that enumerates the eleven trackers
 * also states how many take an upload and NAMES the three that do not. Both halves are required:
 * "eight of eleven" alone leaves a Bugzilla buyer to work out which eight, and Bugzilla is
 * precisely the one that gets dropped from every list that carries only a number.
 *
 * THE SUBJECT IS THE SITE'S OWN LOCALE TABLE, not a list typed here: every locale app.js defines
 * is checked, so a twelfth language is covered the day it is added.
 *
 * The authority for the eight/three split is the agent repo, which this repo cannot import --
 * the same situation as check-tracker-claims.mjs, and handled the same way: the three refusers
 * are mirrored below with a pointer, and the COUNT is cross-checked against them, so a mirror
 * that goes stale disagrees with itself and fails here rather than shipping quietly.
 *
 * Run: `node scripts/check-attachment-claim.mjs` (or `npm run test:attachment-claim`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

// Mirrors generic-qa-agent/tools/attachment_reality.py -- which holds no list either, and reads
// `add_attachment` in each tools/<provider>_rest.py. Eleven fileable, three of them refuse.
const REFUSERS = ["GitHub Issues", "GitLab Issues", "Bugzilla"];
const FILEABLE_TOTAL = 11;
const UPLOADS = FILEABLE_TOTAL - REFUSERS.length;   // 8, derived, never typed twice

// How each language may write "eight". A locale that spells it a way this does not know is a
// FAILURE here, not a silent pass: the point is that the number reaches the reader.
const EIGHT = [
  "8", "eight", "ocho", "huit", "acht", "oito", "otto",
  "\u0432\u043e\u0441\u044c\u043c\u0438", "\u0432\u043e\u0441\u0435\u043c\u044c",   // ru
  "\u516b",                                                                          // ja/zh
  "\uc5ec\ub35f", "\uc5ec\ub35f \uac1c",                                             // ko
  "\u062b\u0645\u0627\u0646\u064a\u0629",                                            // ar
];

const problems = [];
const decode = (t) => t.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

/** Every top-level [q,a] pair inside one faq items array. */
function faqPairs(text) {
  return [...text.matchAll(/\["((?:\\.|[^"\\])*)","((?:\\.|[^"\\])*)"\]/g)]
    .map((m) => [decode(m[1]), decode(m[2])]);
}

// --- collect the effective answer set per locale ---------------------------- //
// add("xx",{...}) overrides win at runtime; anything they do not cover falls back to bugitV16Faq.
const answers = new Map();

for (const m of app.matchAll(/add\(\s*"([a-z]{2}(?:-[a-z]{2})?)"\s*,\s*\{/g)) {
  const seg = app.slice(m.index, m.index + 80000);
  const fi = seg.indexOf('"faq"');
  if (fi < 0) continue;
  answers.set(m[1], faqPairs(seg.slice(fi, fi + 50000)).map((p) => p[1]));
}

const v16 = app.indexOf("const bugitV16Faq");
if (v16 > 0) {
  const seg = app.slice(v16, app.indexOf("};", v16) + 2);
  for (const m of seg.matchAll(/(?:^|[{,])\s*'?([a-z]{2}(?:-[a-z]{2})?)'?\s*:\s*\[/g)) {
    if (answers.has(m[1])) continue;
    const arr = seg.slice(m.index);
    answers.set(m[1], [...arr.matchAll(/'((?:\\.|[^'\\])*)'\s*\]/g)].map((x) => x[1]));
  }
}

if (answers.size < 2) {
  problems.push("could not read the FAQ out of app.js at all, so this guard proved nothing");
}

// --- the assertion ----------------------------------------------------------- //
for (const [lang, list] of [...answers].sort()) {
  const joined = list.join("\n");
  // The answer that enumerates the trackers is the one that names several of them.
  const enumerates = list.filter((a) => /Jira Cloud/.test(a) && /Trello/.test(a));
  if (!enumerates.length) {
    problems.push(`${lang}: no FAQ answer enumerates the trackers, so there is nowhere the ` +
      `upload limitation could be stated`);
    continue;
  }
  const target = enumerates.join("\n");
  const saysCount = EIGHT.some((w) => target.includes(w));
  const missing = REFUSERS.filter((r) => !target.includes(r.split(" ")[0]));

  if (!saysCount) {
    problems.push(`${lang}: the tracker answer never says how many of the ${FILEABLE_TOTAL} take ` +
      `an upload (expected ${UPLOADS}). A reader is left to assume all of them do.`);
  }
  if (missing.length) {
    problems.push(`${lang}: the tracker answer does not name ${missing.join(", ")} among the ` +
      `${REFUSERS.length} that refuse a file. A count with no names leaves a Bugzilla buyer to ` +
      `guess, and Bugzilla is the one that always gets dropped.`);
  }
  // A claim that uploads reach ALL of them is worse than silence.
  if (/all eleven[^.\n]{0,40}(upload|attach)|(upload|attach)[^.\n]{0,40}all eleven/i.test(joined)) {
    problems.push(`${lang}: the FAQ claims uploads reach all ${FILEABLE_TOTAL} trackers`);
  }
}

if (problems.length) {
  console.error(`\ncheck-attachment-claim: FAIL (${problems.length})`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`check-attachment-claim: OK (${answers.size} languages; each states that ${UPLOADS} of ` +
  `the ${FILEABLE_TOTAL} trackers take an upload and names ${REFUSERS.join(", ")} as the ones that do not)`);
