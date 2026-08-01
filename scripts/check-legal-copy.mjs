// Legal / commercial copy regression guard.
//
// Complements check-billing-copy (subscription wording) and check-activation-copy
// (license-key flow). This guards the corrections made for the 1.1.0 legal review:
//  - the Privacy Policy stays COMPLETE (processors, international transfers,
//    retention, data-subject rights, and the controller residual-risk disclosure);
//  - no document makes a FALSE legal-certification claim (the owner accepted a
//    residual legal risk; nothing may claim full compliance / attorney approval /
//    external certification);
//  - the Japan 特定商取引法 page exists, carries the exact owner-approved omission
//    statement, and is wired into the site;
//  - no FAQ answer is written in the wrong language (the French-answer-in-Spanish
//    class of bug), and the Team capacity is never mis-stated as "5 devices".

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const docs = path.join(root, "public", "docs");

let fails = 0;
const check = (ok, label, detail) => {
  if (ok) return;
  fails++;
  console.error(`FAIL: ${label}${detail ? `\n      ${detail}` : ""}`);
};

const app = read("app.js");
const index = read("index.html");
const docFiles = fs
  .readdirSync(docs)
  .filter((f) => f.endsWith(".md") || f.endsWith(".txt"))
  .map((f) => ["public/docs/" + f, fs.readFileSync(path.join(docs, f), "utf8")]);

// --- 1. Privacy Policy completeness (English source) ---------------------------
// Flatten whitespace so a phrase that wraps across a line still matches.
const privacy = read("public/docs/PRIVACY.md").replace(/\s+/g, " ");
const PRIVACY_SECTIONS = [
  ["processors section", /processor|service providers/i],
  ["international-transfer section", /international transfer|Standard Contractual Clauses|transfer basis/i],
  ["retention section", /retention|how long we keep/i],
  ["data-subject-rights section", /your rights|right to|data-subject/i],
  ["controller residual-risk disclosure", /has not received external legal approval/i],
  ["controller-identity honesty", /trading name alone does not satisfy/i],
];
for (const [label, re] of PRIVACY_SECTIONS) {
  check(re.test(privacy), `PRIVACY.md is missing the ${label}`);
}

// --- 2. No FALSE legal-certification wording anywhere --------------------------
// Affirmative claims only — negated statements ("has NOT been certified", "not a
// claim of full compliance") are exactly what we DO want and must not trip this.
const FALSE_CERT = [
  /\battorney[- ]approved\b/i,
  /\blegally certified\b/i,
  /\bcertified compliant\b/i,
  /\bfully compliant with\b/i,
  /\bfull legal compliance\b/i,
  /\bguarantee[sd]?\s+(?:full\s+)?legal\s+compliance\b/i,
  /\blegal(?:ly)?\s+guarantee/i,
];
for (const [name, text] of [["app.js", app], ["index.html", index], ...docFiles]) {
  for (const re of FALSE_CERT) {
    const m = text.match(re);
    check(!m, `${name} makes a false legal-certification claim`, m ? `matched: "${m[0]}"` : "");
  }
}

// --- 3. Japan 特定商取引法 page: present, honest, and wired ---------------------
const OMISSION =
  "Certain seller identification details are not published by owner decision. " +
  "Requests may be directed to the published support email. This disclosure has " +
  "not been certified as satisfying all applicable statutory seller-identification requirements.";
check(fs.existsSync(path.join(docs, "TOKUSHOHO.md")), "TOKUSHOHO.md (English) is missing");
check(fs.existsSync(path.join(docs, "TOKUSHOHO.ja.md")), "TOKUSHOHO.ja.md (Japanese) is missing");
if (fs.existsSync(path.join(docs, "TOKUSHOHO.md"))) {
  const tk = read("public/docs/TOKUSHOHO.md").replace(/\s+/g, " ");
  check(tk.includes(OMISSION), "TOKUSHOHO.md is missing the exact owner-approved omission statement");
}
check(/docRoutes=\[[^\]]*'docs\/commerce'/.test(app), "app.js docRoutes does not register docs/commerce");
check(/#\/docs\/commerce/.test(index), "index.html does not link the Commercial Transactions page");
check(/data-t="docs\.commerce"/.test(index), "index.html footer/docs-strip has no docs.commerce link");

// --- 4. No FAQ answer written in the wrong language (fr-in-Spanish class) -------
// A French-question FAQ item whose answer carries Spanish-exclusive tokens.
const FR_Q_SPANISH_A =
  /"(?:Que |Qu'|Quelle|Quels|Puis-je|Comment|Dois-je|Est-ce)[^"]*\?","[^"]*(?:está|licencia|año|única|único|El plan Team ya|también está|gestiona de forma)/g;
const frBug = app.match(FR_Q_SPANISH_A);
check(!frBug, "a French FAQ question is paired with a Spanish answer", frBug ? frBug[0].slice(0, 120) : "");

// --- 5. Team capacity is 5 MEMBERS, never "5 devices" --------------------------
for (const [name, text] of [["app.js", app], ["index.html", index], ...docFiles]) {
  const m = text.match(/\b(?:5|five)\s+(?:device seats|devices)\b/i);
  check(!m, `${name} mis-states Team capacity as devices (should be up to 5 members)`, m ? `matched: "${m[0]}"` : "");
}

// --- 6. No affirmative license-key wording in the legal docs -------------------
for (const [name, text] of docFiles) {
  const m = text.match(/\b(?:enter|paste|copy|reveal|type)\s+(?:your\s+)?(?:license|activation)\s+key\b/i);
  check(!m, `${name} still describes a license-key flow`, m ? `matched: "${m[0]}"` : "");
}

if (fails) {
  console.error(`\nLegal-copy check FAILED with ${fails} problem(s).`);
  process.exit(1);
}
console.log("Legal-copy check passed.");
