// Legal / commercial copy regression guard.
//
// Complements check-billing-copy (subscription wording) and check-activation-copy
// (license-key flow). It guards the 2026-08-02 legal copy remediation:
//
//  - the public legal corpus must never again carry self-incriminating or
//    alarming wording ("owner decision", "accepted legal risk", "not certified",
//    "seller legal name: not published", and the Japanese equivalents). That copy
//    damaged customer trust and told buyers nothing useful;
//  - the seller's identifying details are disclosed ON REQUEST, so the approved
//    request-based wording must be present in English and Japanese and the support
//    address must appear on every legal surface;
//  - no public surface may carry a personal name, private address, or personal
//    telephone number. The check is pattern-based on purpose: a private value must
//    never be hardcoded into a test just to assert its absence;
//  - Commercial Transactions stays reachable from the footer and from the purchase
//    flow, but is no longer a Documentation card;
//  - every supported Privacy Policy and License translation exists and is complete;
//  - no document makes a FALSE legal-certification claim, and no FAQ answer is
//    written in the wrong language.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const docs = path.join(root, "public", "docs");
const flat = (s) => s.replace(/\s+/g, " ");

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
const surfaces = [["app.js", app], ["index.html", index], ...docFiles];

// The locales the site ships legal copy in. "" is the English source file.
const LOCALES = ["", "de", "es", "fr", "it", "ja", "ko", "pt-br", "ru", "zh"];

// --- 1. The alarming wording must be gone, in every language -------------------
// Each entry is a phrase that must not appear on ANY public surface. These are the
// exact strings (and close variants) removed in the remediation.
const BANNED_EN = [
  "owner decision",
  "accepted legal risk",
  "accepted risk",
  "residual legal risk",
  "legal-compliance risk",
  "legal compliance risk",
  "external legal approval",
  "has not been certified",
  "not been certified",
  "requirement is not satisfied",
  "honestly disclosed",
  "seller legal name: not published",
  "elected not to publish",
  "personal controller",
  "placeholder information",
  "dummy information",
];
// Japanese equivalents of the same removed wording.
const BANNED_JA = [
  "事業者の判断により", // "by the operator's decision"
  "受容したリスク", // "accepted risk"
  "認証されたものではありません", // "has not been certified"
  "満たすものではなく", // "does not satisfy the requirement"
  "ダミー情報", // "dummy information"
  "販売事業者名：非公開", // "seller legal name: not published"
  "所在地：非公開",
  "電話番号：非公開",
];
for (const [name, text] of surfaces) {
  const low = text.toLowerCase();
  for (const phrase of BANNED_EN) {
    check(!low.includes(phrase), `${name} still contains removed legal wording`, `matched: "${phrase}"`);
  }
  for (const phrase of BANNED_JA) {
    check(!text.includes(phrase), `${name} still contains removed Japanese legal wording`, `matched: "${phrase}"`);
  }
}

// --- 2. The approved request-based disclosure is present -----------------------
const EN_DISCLOSURE =
  "The seller's legal name, business address, and telephone number will be " +
  "provided without delay upon request before purchase.";
const JA_DISCLOSURE = "遅滞なく開示"; // "disclose without delay"
const JA_TITLE = "特定商取引法に基づく表記";

check(fs.existsSync(path.join(docs, "TOKUSHOHO.md")), "TOKUSHOHO.md (English) is missing");
check(fs.existsSync(path.join(docs, "TOKUSHOHO.ja.md")), "TOKUSHOHO.ja.md (Japanese) is missing");

const tkEn = flat(read("public/docs/TOKUSHOHO.md"));
check(tkEn.includes(EN_DISCLOSURE),
  "TOKUSHOHO.md is missing the approved English disclosure-on-request wording");
check(tkEn.includes("support@bugit.dev"),
  "TOKUSHOHO.md does not give support@bugit.dev as the request address");

const tkJa = read("public/docs/TOKUSHOHO.ja.md");
check(tkJa.includes(JA_DISCLOSURE),
  "TOKUSHOHO.ja.md is missing the approved 遅滞なく開示 wording");
check(tkJa.includes(JA_TITLE),
  "TOKUSHOHO.ja.md has lost the statutory title 特定商取引法に基づく表記");
check(tkJa.includes("support@bugit.dev"),
  "TOKUSHOHO.ja.md does not give support@bugit.dev as the request address");

// The Privacy Policy discloses the operator on request rather than naming them.
const privacy = flat(read("public/docs/PRIVACY.md"));
check(/requests? for the operator's legal name and business contact details/i.test(privacy),
  "PRIVACY.md no longer explains that operator details are provided on request");
check(/provided without delay/i.test(privacy),
  "PRIVACY.md no longer promises the operator information without delay");

// --- 3. No personal identity, address, or telephone number on a public surface --
// Pattern-based by design: no private value is ever written into this file.
const PERSONAL_PATTERNS = [
  [/\+\d{1,3}[\s-]?\(?\d{1,4}\)?[\s-]?\d{2,4}[\s-]?\d{3,4}/, "international telephone number"],
  [/\b0\d{1,3}-\d{2,4}-\d{4}\b/, "Japanese domestic telephone number"],
  [/〒\s?\d{3}-?\d{4}/, "Japanese postal code (address block)"],
  [/\d+\s?(?:丁目|番地|号室)/, "Japanese street address"],
  [/\b\d{1,5}\s+[A-Z][a-z]+\s+(?:Street|St\.|Road|Rd\.|Avenue|Ave\.|Lane|Drive|Dr\.)\b/,
    "street address"],
];
for (const [name, text] of surfaces) {
  for (const [re, what] of PERSONAL_PATTERNS) {
    const m = text.match(re);
    // Report the pattern that tripped, never the captured value.
    check(!m, `${name} appears to publish a ${what}`, `pattern: ${re}`);
  }
}
// The only contact address the public surfaces may advertise is the support one.
for (const [name, text] of docFiles) {
  // Each label must end on a word character, so a sentence-final "." is not
  // swallowed into the address and mistaken for a different one.
  const addrs = [...text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map((m) => m[0].toLowerCase());
  const foreign = addrs.filter((a) => a !== "support@bugit.dev");
  check(foreign.length === 0, `${name} publishes an email address other than support@bugit.dev`,
    foreign.length ? `${foreign.length} other address(es) found` : "");
}

// --- 4. Presentation: footer + purchase flow yes, Documentation card no ---------
check(/docRoutes=\[[^\]]*'docs\/commerce'/.test(app),
  "app.js docRoutes no longer registers docs/commerce (bookmarked route would break)");

const footer = index.match(/<footer[\s\S]*?<\/footer>/);
check(!!footer && /#\/docs\/commerce/.test(footer[0]),
  "the footer no longer links the Commercial Transactions page");

const pricingNote = index.match(/<p class="pricing-note">[\s\S]*?<\/p>/);
check(!!pricingNote && /#\/docs\/commerce/.test(pricingNote[0]),
  "the purchase flow (pricing note) no longer links the Commercial Transactions page");

const docCards = index.match(/<div class="doc-cards">[\s\S]*?<\/div>/);
check(!!docCards && !/#\/docs\/commerce/.test(docCards[0]),
  "Commercial Transactions is still a Documentation card (it should only be in the footer and purchase flow)");

// It must stay in the docs sidebar so the page is navigable once opened.
check(/\['#\/docs\/commerce',labels\.commerce\]/.test(app),
  "app.js docs sidebar no longer lists the Commercial Transactions page");

// Every locale must actually carry the commerce keys. app.js declares each locale
// TWICE: a readable literal near the top, then a generated add("<code>", {...})
// line. add() rebuilds the dictionary from the English base, so the LATER call
// wins and the earlier literal is inert. Checking the literal would pass while the
// live site still showed the English label, so parse the generated lines instead.
const generated = [...app.matchAll(/^add\("([a-z-]+)", (\{.*\})\);$/gm)];
check(generated.length > 0, "app.js has no generated add() locale dictionaries to check");
for (const [, code, json] of generated) {
  let dict;
  try {
    dict = JSON.parse(json);
  } catch {
    check(false, `app.js generated dictionary for "${code}" is not valid JSON`);
    continue;
  }
  check(!!dict.docs?.commerce,
    `app.js locale "${code}" has no docs.commerce label, so its footer link would fall back to English`);
  check(!!dict.docPages?.commerceTitle,
    `app.js locale "${code}" has no docPages.commerceTitle, so its commerce page would show the English heading`);
  check(!!dict.docPages?.commerceIntro,
    `app.js locale "${code}" has no docPages.commerceIntro`);

  // Refund Policy chrome. The REFUND.<code>.md bodies were translated long before
  // the UI around them was, so every locale rendered an English "Refund Policy"
  // heading above a fully translated document. Tie the rendered page title to the
  // document's own H1 so the two can never drift apart again.
  check(!!dict.docs?.refund,
    `app.js locale "${code}" has no docs.refund label, so its footer link would fall back to English`);
  check(!!dict.docPages?.refundTitle,
    `app.js locale "${code}" has no docPages.refundTitle, so the refund page would show an English heading`);
  check(!!dict.docPages?.refundIntro,
    `app.js locale "${code}" has no docPages.refundIntro`);
  const refundDoc = path.join(docs, `REFUND.${code}.md`);
  if (fs.existsSync(refundDoc) && dict.docPages?.refundTitle) {
    const h1 = fs.readFileSync(refundDoc, "utf8").split("\n")[0].replace(/^#\s*/, "").trim();
    check(h1 === dict.docPages.refundTitle,
      `app.js locale "${code}" refundTitle does not match the REFUND.${code}.md heading`,
      `page title "${dict.docPages.refundTitle}" vs document heading "${h1}"`);
  } else if (dict.docPages?.refundTitle) {
    check(false, `public/docs/REFUND.${code}.md is missing but locale "${code}" links to it`);
  }

  if (code === "ja") {
    // The Japanese label and heading must stay legally recognizable.
    check(dict.docs.commerce === JA_TITLE,
      `app.js ja docs.commerce is "${dict.docs.commerce}", expected ${JA_TITLE}`);
    check(dict.docPages.commerceTitle === JA_TITLE,
      `app.js ja commerceTitle is "${dict.docPages.commerceTitle}", expected ${JA_TITLE}`);
  }
}

// --- 5. Every supported translation exists and is complete ---------------------
for (const loc of LOCALES) {
  const privacyFile = loc ? `PRIVACY.${loc}.md` : "PRIVACY.md";
  const licenseFile = loc ? `LICENSE.${loc}.txt` : "LICENSE.txt";
  for (const f of [privacyFile, licenseFile]) {
    const p = path.join(docs, f);
    check(fs.existsSync(p), `${f} is missing`);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    check(text.trim().length > 1500, `${f} looks truncated`, `${text.trim().length} chars`);
    check(text.includes("support@bugit.dev"), `${f} does not give the support address`);
  }
  // Each License translation must carry all 15 clauses, so no locale silently
  // drops the consumer-rights, liability, or package-identifier terms.
  const licPath = path.join(docs, licenseFile);
  if (fs.existsSync(licPath)) {
    const lic = fs.readFileSync(licPath, "utf8");
    for (const n of [7, 8, 10, 11, 13, 14, 15]) {
      check(new RegExp(`(^|\\n)${n}\\.\\s`).test(lic),
        `${licenseFile} is missing clause ${n}`);
    }
  }
}

// --- 6. No em/en dash punctuation in the rewritten legal copy ------------------
const REWRITTEN = [
  "TOKUSHOHO.md", "TOKUSHOHO.ja.md",
  ...LOCALES.map((l) => (l ? `PRIVACY.${l}.md` : "PRIVACY.md")),
  ...LOCALES.map((l) => (l ? `LICENSE.${l}.txt` : "LICENSE.txt")),
];
for (const f of REWRITTEN) {
  const p = path.join(docs, f);
  if (!fs.existsSync(p)) continue;
  const text = fs.readFileSync(p, "utf8");
  const m = text.match(/[–—]/);
  check(!m, `public/docs/${f} uses em/en dash punctuation in customer-facing prose`);
}

// --- 7. No FALSE legal-certification wording anywhere --------------------------
// Affirmative claims only. We no longer publish the negated forms either, but a
// claim of certification would be worse, so the guard stays.
const FALSE_CERT = [
  /\battorney[- ]approved\b/i,
  /\blegally certified\b/i,
  /\bcertified compliant\b/i,
  /\bfully compliant with\b/i,
  /\bfull legal compliance\b/i,
  /\bguarantee[sd]?\s+(?:full\s+)?legal\s+compliance\b/i,
  /\blegal(?:ly)?\s+guarantee/i,
];
for (const [name, text] of surfaces) {
  for (const re of FALSE_CERT) {
    const m = text.match(re);
    check(!m, `${name} makes a false legal-certification claim`, m ? `matched: "${m[0]}"` : "");
  }
}

// --- 8. No FAQ answer written in the wrong language (fr-in-Spanish class) -------
const FR_Q_SPANISH_A =
  /"(?:Que |Qu'|Quelle|Quels|Puis-je|Comment|Dois-je|Est-ce)[^"]*\?","[^"]*(?:está|licencia|año|única|único|El plan Team ya|también está|gestiona de forma)/g;
const frBug = app.match(FR_Q_SPANISH_A);
check(!frBug, "a French FAQ question is paired with a Spanish answer", frBug ? frBug[0].slice(0, 120) : "");

// --- 9. Team capacity is 5 MEMBERS, never "5 devices" --------------------------
for (const [name, text] of surfaces) {
  const m = text.match(/\b(?:5|five)\s+(?:device seats|devices)\b/i);
  check(!m, `${name} mis-states Team capacity as devices (should be up to 5 members)`, m ? `matched: "${m[0]}"` : "");
}

// --- 10. No affirmative license-key wording in the legal docs ------------------
for (const [name, text] of docFiles) {
  const m = text.match(/\b(?:enter|paste|copy|reveal|type)\s+(?:your\s+)?(?:license|activation)\s+key\b/i);
  check(!m, `${name} still describes a license-key flow`, m ? `matched: "${m[0]}"` : "");
}

if (fails) {
  console.error(`\nLegal-copy check FAILED with ${fails} problem(s).`);
  process.exit(1);
}
console.log("Legal-copy check passed.");
