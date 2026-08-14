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
  `no locale ships another locale's prose.`
);
