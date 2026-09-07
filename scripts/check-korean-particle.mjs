// Korean particles attach by SOUND, and "BugIt" ends in a consonant.
//
// Korean picks between two forms of the same particle according to whether the word before it
// ends in a vowel or a consonant. "BugIt" is read 버그잇, which ends in a consonant, so it takes
// the consonant-final form every time:
//
//     topic     BugIt은      not  BugIt는
//     subject   BugIt이      not  BugIt가
//     object    BugIt을      not  BugIt를
//     with/and  BugIt과      not  BugIt와
//     by/with   BugIt으로    not  BugIt로
//
// WHAT WENT WRONG, 2026-09-07. A localization round filed eight exact spans of this and said in
// its own summary that "further repeated occurrences remain beyond the exact spans queued here;
// these are not a bulk cleanup instruction." Counted rather than assumed, there were 44 across
// three repositories and the print sources. NINETEEN were here, and the count only stopped
// growing when the subject was computed instead of listed: two in the app dictionary, seven in
// the Korean Getting Started page, three in the overview, and TEN in documents nobody had
// thought to look in -- five in the Korean Tokushoho disclosure and two in the refund policy,
// both of which are legal copy a customer reads before buying.
//
// That is why the file list below is a glob over public/docs and not a list of filenames. Every
// count taken by hand in this round was too low, including the two I took myself.
//
// WHY A GUARD AND NOT A ONE-TIME SWEEP. The wrong form is a single character. It is grammatical
// in isolation and reads as perfectly ordinary text to every person who has ever reviewed this
// site, because none of us reads Korean. It arrives one string at a time, so a sweep alone is
// undone by the next string anybody adds.
//
// WHY THE WORD-START EXCLUSION IS NOT OPTIONAL. 가, 는, 로 and 와 also begin ordinary words:
// "BugIt가이드" is "BugIt guide". A check that ignored what follows would demand it be rewritten
// to "BugIt이이드", which is nonsense, in a language its author cannot read. So a candidate
// counts only when the particle is NOT followed by another Hangul syllable.
//
// A SOURCE SCAN, deliberately, where most guards here drive a browser. This defect is in the
// text itself and is identical before and after rendering, so a browser would add minutes and
// answer the same question. What a browser IS needed for is whether that text fits its box, and
// that is check-overflow's job, not this one's.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** [wrong form, the form BugIt actually takes, what the particle does] */
const PARTICLES = [
  ["는", "은", "topic"],
  ["가", "이", "subject"],
  ["를", "을", "object"],
  ["와", "과", "with/and"],
  ["로", "으로", "by/with"],
];

/** The Hangul syllable block. A particle followed by one of these starts a word instead. */
const HANGUL = "[\\uAC00-\\uD7A3]";

const offences = (text) => {
  const found = [];
  for (const [wrong, right, role] of PARTICLES) {
    const re = new RegExp("BugIt" + wrong + "(?!" + HANGUL + ")", "g");
    for (const m of text.matchAll(re)) {
      found.push({
        wrong, right, role,
        line: text.slice(0, m.index).split("\n").length,
        quote: text.slice(Math.max(0, m.index - 30), m.index + 34).replace(/\s+/g, " "),
      });
    }
  }
  return found;
};

// The subject is COMPUTED: the dictionary plus every Korean document served under public/docs,
// so a new Korean page is covered the day it is added rather than when someone remembers.
const targets = [path.join(root, "app.js")];
const docs = path.join(root, "public", "docs");
for (const name of fs.readdirSync(docs).sort()) {
  if (/\.ko\.(web\.)?(md|txt)$/i.test(name)) targets.push(path.join(docs, name));
}

const fail = [];
let korean = 0;

for (const file of targets) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (/[가-힣]/.test(text)) korean += 1;
  for (const o of offences(text)) {
    fail.push(`${rel}:${o.line} — BugIt${o.wrong} (${o.role}) should be BugIt${o.right}\n`
      + `    ...${o.quote}...`);
  }
}

// A guard whose subject can quietly become empty passes forever. If the Korean dictionary block
// or the Korean doc page is renamed or dropped, this says so instead of reporting nothing wrong.
if (targets.length < 2) fail.push(`only ${targets.length} file(s) to read; the Korean pages are missing`);
if (korean < 2) fail.push(`only ${korean} of ${targets.length} file(s) contain any Korean at all`);

// THE NEGATIVE CONTROL. Without it a green run is equally consistent with a scanner that reads
// nothing. It drives the real sentence that shipped and the real word that must survive it.
const shipped = "다만 BugIt는 그전에";   // LQA-0051, as it shipped
if (offences(shipped).length === 0) {
  fail.push("negative control: the pattern no longer matches the wrong particle that shipped");
}
const word = "BugIt가이드";                          // "BugIt guide"
if (offences(word).length !== 0) {
  fail.push("negative control: the pattern matches BugIt가이드, so it would rewrite a Korean word "
    + "into nonsense");
}

if (fail.length) {
  console.error(`check-korean-particle FAILED: ${fail.length} finding(s)`);
  for (const f of fail) console.error("  " + f);
  process.exit(1);
}
console.log(`check-korean-particle OK: ${targets.length} file(s) read, ${korean} carrying Korean; `
  + "every particle after BugIt is the consonant-final form the name takes, and the scanner still "
  + "catches the sentence that shipped without touching BugIt가이드.");
