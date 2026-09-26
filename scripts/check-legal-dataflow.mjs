#!/usr/bin/env node
/**
 * Guard (BugIt 1.1.0 Phase A containment): the public Legal/Privacy copy must
 * describe the BROWSER-ENTITLEMENT data model actually shipped in 1.0.9+, not the
 * retired license-KEY / user-typed SEAT-LABEL model. Fails on:
 *   - retired key-activation / seat-label claims (EN + per-language),
 *   - the retired "5 devices at a time" shared-key framing (EN + per-language),
 *   - the superseded 14-day post-expiry grace (owner decision = 3-day; EN + per-language),
 *   - missing browser-entitlement fields in the English privacy source,
 *   - English/translation structural mismatch (every locale must reference the Portal).
 *
 * Scans SOURCE + BUILT dist. Numbers published here (Team = 5 members / 5 devices,
 * 1 per member; 3-day grace) are the values enforced by Portal code + DB constraints
 * (see agent repo docs/audits/1.1.0-audit-remediation/LEGAL-PRIVACY-CORRECTION.md).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let failures = 0;
const fail = (msg) => { console.error(`FAIL: ${msg}`); failures++; };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/* THE SUBJECT IS COMPUTED, NEVER TYPED. This was `["", "de", "es", "fr", "it", "ja", "ko",
   "pt-br", "ru", "zh"]` -- ten locales, on a site that ships eleven. Arabic was never in it, so
   the Arabic privacy statement and the Arabic licence were outside this guard from the day they
   were added, and it reported OK throughout. Read from app.js and the eleventh language is
   covered by existing rather than by being remembered. */
const LOCALES = (() => {
  const table = fs.readFileSync(path.join(ROOT, "app.js"), "utf8").match(/const languages=(\[\[.*?\]\]);/s);
  if (!table) throw new Error("could not read the language table out of app.js");
  const codes = JSON.parse(table[1].replace(/'/g, '"')).map(([c]) => c);
  if (codes.length < 11) throw new Error(`the language table has only ${codes.length} entries`);
  /* English is the un-suffixed file: PRIVACY.md, not PRIVACY.en.md. */
  return codes.map((c) => (c === "en" ? "" : c));
})();
const privacyFile = (l) => `public/docs/PRIVACY${l ? "." + l : ""}.md`;
const licenseFile = (l) => `public/docs/LICENSE${l ? "." + l : ""}.txt`;

// ---------------------------------------------------------------------------
// FORBIDDEN: retired-model fragments (positive claims). Negations like
// "there is no license key" are fine; these exact stale fragments are not.
// ---------------------------------------------------------------------------
const FORBIDDEN = [
  // English retired-model claims
  "your **license key**", "seat label", "License keys & seats",
  "activation with a valid license key", "Team allows 5", "5 devices at a time",
  "14-day", "14 day",
  // per-language retired "5 … devices at a time" shared framing
  "5 dispositivos a la vez", "5 appareils à la fois", "5 Geräte gleichzeitig",
  "5 dispositivi alla volta", "5 dispositivos por vez", "同時に5デバイス",
  "5개 기기를 허용", "同时允许 5 台设备", "5 устройств одновременно",
  // per-language superseded 14-day grace
  "14 días de gracia", "14 jours de grâce", "14 Tage Schonfrist",
  "14 giorni di grazia", "14 dias de carência", "14日間の猶予",
  "14일의 유예", "14 天宽限期", "14 дней льготного",
];

const distJs = exists("dist")
  ? fs.readdirSync(path.join(ROOT, "dist")).filter((f) => /^app\.[0-9a-f]+\.js$/.test(f)).map((f) => `dist/${f}`)
  : [];
/* A MISSING DOCUMENT IS A FAILURE, NOT A SMALLER SCAN (CR-08-F19). This list used to end in
   `.filter(exists)`, and the parity loop below skipped any file that was not there, so a locale
   whose privacy statement or licence had gone missing simply dropped out of both, and the final
   line still reported the model "consistent across" every locale. Every shipped language must
   have both documents. Only the built dist bundle is optional: it exists after `node build.js`
   and not before, and the source it is built from is scanned either way. */
const REQUIRED_DOCS = [...LOCALES.map(privacyFile), ...LOCALES.map(licenseFile)];
for (const rel of REQUIRED_DOCS) {
  if (!exists(rel)) fail(`${rel} is missing, so this locale's data-flow disclosure cannot be checked at all`);
}
const SCAN = [...REQUIRED_DOCS.filter(exists), "app.js", ...distJs];

for (const rel of SCAN) {
  const src = read(rel);
  for (const frag of FORBIDDEN) {
    if (src.includes(frag)) fail(`${rel}: retired-model fragment present — "${frag}"`);
  }
}

// ---------------------------------------------------------------------------
// REQUIRED (English source of truth): browser-entitlement fields present.
// ---------------------------------------------------------------------------
const enPrivacy = exists(privacyFile("")) ? read(privacyFile("")) : "";
for (const [needle, why] of [
  ["no license key", "browser activation (no key)"],
  ["installation identifier", "installation id field"],
  ["hashed device fingerprint", "hashed fingerprint field"],
  ["device label", "device label field"],
  ["operating system name", "OS field"],
  ["BugIt version", "app version field"],
  ["activation material", "short-lived activation material"],
  ["signed entitlement", "signed entitlement received"],
  ["BugIt Portal", "browser Portal named"],
]) {
  if (!enPrivacy.includes(needle)) fail(`PRIVACY.md missing browser-entitlement disclosure: ${why} ("${needle}")`);
}
// The licence is a wrapped plain-text document, so a literal substring check is defeated by a
// line break falling inside the phrase: "up to 5 members" is stated, but with a newline after
// "5". Normalise whitespace first. Each requirement is then a set of accepted phrasings, because
// what has to be true is that the licence STATES the thing, not that it uses one exact wording.
// (An earlier revision of this guard demanded literals the document never used, so it failed on
// clauses that were present and correct. See the same trap in the agent repo's locale checks:
// an absence found by substring match is not evidence of an absence.)
const enLicense = (exists(licenseFile("")) ? read(licenseFile("")) : "").replace(/\s+/g, " ");
for (const [why, accepted] of [
  ["the Portal is named", ["BugIt Portal"]],
  ["entitlements/accounts clause", ["Entitlements, accounts", "Accounts and seats"]],
  ["Team member count", ["up to 5 members"]],
  ["per-device limit", ["one active device", "1 device at a time"]],
]) {
  if (!accepted.some((n) => enLicense.includes(n))) {
    fail(`LICENSE.txt missing browser/Team term: ${why} (none of ${JSON.stringify(accepted)})`);
  }
}

// ---------------------------------------------------------------------------
// PARITY: every locale privacy + license must reference the Portal (migrated).
// ---------------------------------------------------------------------------
/* A RULE DECIDES A QUESTION, NOT A SPELLING. The question is "does this document describe the
   browser/Portal activation model?", and for ten locales the answer happens to contain the
   English word "Portal". Arabic answers it correctly in Arabic -- «بوابة BugIt» -- and a literal
   substring test called that an unmigrated legal document. It was the first thing this guard
   said the day it was finally allowed to open the Arabic files, and it was wrong.
   Each locale that does not use the English word names the word it uses instead. */
const PORTAL_TERM = { ar: "بوابة" };  // بوابة — "portal"
for (const l of LOCALES) {
  const term = PORTAL_TERM[l] || "Portal";
  for (const f of [privacyFile(l), licenseFile(l)]) {
    // A missing file was already reported above; it is never a pass here.
    if (exists(f) && !read(f).includes(term)) fail(`${f}: not migrated to browser model (no "${term}" reference)`);
  }
}

// ---------------------------------------------------------------------------
// THE PORTAL ASSISTANT'S ACCOUNT SUMMARY, THE SELF-SERVE EXPORT, AND IP ADDRESSES (2026-09-26).
//
// The privacy statement said the Ask BugIt summary sent to Anthropic covered "your licenses,
// devices, Team, and open support tickets". Since portal 5e4401b (2026-09-22) it also carries the
// account's name and email, its orders with refunds and chargebacks, and up to five recent tickets
// of ANY status with the first 600 characters of each message. The data went out four days before
// the sentence describing it changed, and nothing here could notice, because nothing here knew
// what the summary contained. The same review found two facts the statement did not mention at
// all: the self-serve export (PDF and JSON) on the Portal account page, and the IP address and
// user agent stored with the checkout acknowledgement, with each activation request (IP only) and
// with each download.
//
// THE AUTHORITY is the portal repo, which this one cannot import: lib/assistant/account.ts
// (readAccountSnapshot), lib/assistant/facts.ts (accountFactsText: five tickets, 600 characters,
// the masked key), app/actions/privacy.ts (exportMyDataAction), lib/checkout/withdrawal-consent.ts,
// the activation_start client_ip column and app/api/download/route.ts. What is mirrored below is
// what the English statement must say about them. If the portal's summary grows again, this list
// and the policy move together, which is the moment to re-read the authority.
//
// Every locale is held to the tokens that do not need translating (600, PDF, JSON, IP, the date)
// in the section where they belong, and to the same number of summary items as English, so a
// locale left on the old sentence fails even though this file cannot read its language.
// ---------------------------------------------------------------------------
const sectionsOf = (md) => md.replace(/\r\n/g, "\n").split(/\n(?=## )/);
const bulletsIn = (text) => text.split("\n").filter((l) => /^- /.test(l)).length;
const ASK = 7, RIGHTS = 11, DATA = 6;   // positions; check-legal-copy holds every locale to English's section order
const enSecs = sectionsOf(enPrivacy);
const enAsk = (enSecs[ASK] || "").replace(/\s+/g, " ");
for (const [needle, why] of [
  ["your name and the email address you sign in with", "the summary carries the account's name and email"],
  ["your orders: amounts, payment dates, refunds, and chargebacks", "the summary carries orders, refunds and chargebacks"],
  ["five most recently updated tickets, whatever their status", "the summary carries five recent tickets of any status"],
  ["the first 600 characters of its message", "each ticket's message is sent, truncated to 600 characters"],
  ["the license key with all but its last group hidden", "the summary carries the MASKED licence key"],
  ["never contains a full license key or your card or bank details", "what the summary never carries"],
]) {
  if (!enAsk.includes(needle)) fail(`PRIVACY.md, Ask BugIt section: missing "${needle}" (${why}; portal lib/assistant/facts.ts)`);
}
if (/\(your licenses, devices, Team, and\s+open support tickets\)/.test(enPrivacy)) {
  fail(`PRIVACY.md still describes the assistant's summary as "licenses, devices, Team, and open support tickets", which it outgrew in portal 5e4401b`);
}
const enRights = (enSecs[RIGHTS] || "").replace(/\s+/g, " ");
if (!/download a copy of your account data yourself, as a PDF or as a machine-readable JSON file/.test(enRights)) {
  fail("PRIVACY.md, Your rights: the self-serve data export (PDF and JSON, portal app/actions/privacy.ts) is not mentioned");
}
const enData = (enSecs[DATA] || "").replace(/\s+/g, " ");
for (const needle of ["IP address and browser user agent stored with the acknowledgement you give at checkout",
                      "the IP address an activation request comes from",
                      "the IP address and user agent of each software download"]) {
  if (!enData.includes(needle)) fail(`PRIVACY.md, personal data list: missing "${needle}"`);
}
const enAskItems = bulletsIn(enSecs[ASK] || "");
const enDate = (enPrivacy.match(/^\*\*[^*]*\*\*/m) || [""])[0].match(/\d+/g) || [];
for (const l of LOCALES) {
  const f = privacyFile(l);
  if (!l || !exists(f)) continue;   // English is checked above; a missing file is reported above
  const secs = sectionsOf(read(f));
  const ask = secs[ASK] || "";
  if (!ask.includes("Anthropic")) { fail(`${f}: section ${ASK} is not the Ask BugIt section, so its summary cannot be checked`); continue; }
  if (!ask.includes("600")) fail(`${f}: the Ask BugIt section does not state the 600-character limit on each ticket message`);
  if (bulletsIn(ask) !== enAskItems) fail(`${f}: the Ask BugIt summary lists ${bulletsIn(ask)} items, English lists ${enAskItems}`);
  const rights = secs[RIGHTS] || "";
  if (!/PDF/.test(rights) || !/JSON/.test(rights)) fail(`${f}: the rights section does not mention the self-serve export (PDF and JSON)`);
  if (!/\bIP\b/.test(secs[DATA] || "")) fail(`${f}: the personal data list does not mention the IP addresses stored`);
  const date = (read(f).match(/^\*\*[^*]*\*\*/m) || [""])[0];
  for (const n of enDate) if (!date.includes(n)) fail(`${f}: its "last updated" line (${date}) does not carry ${n} from the English date`);
}

/* WHAT THE OK LINE MAY CLAIM. The field needles above are substrings of the English privacy
   statement, typed here. They show that the statement still NAMES each field; they are not a
   comparison with what the activation request actually sends, which lives in the agent repo and
   cannot be imported from this one (the payload-versus-disclosure comparison is that repo's
   gate). And "Portal" in a translation shows it was migrated, not that it says the same as the
   English. So the result line says what was checked and no more: it used to say the model was
   "consistent across" every locale, which is a claim about meaning this guard never tested. */
if (failures) {
  console.error(`\ncheck-legal-dataflow: ${failures} failure(s).`);
  process.exit(1);
}
console.log(`check-legal-dataflow: OK. All ${REQUIRED_DOCS.length} privacy/licence documents for ${LOCALES.length} ` +
  `locales exist; no retired-model fragment in them, app.js or dist (${SCAN.length} files); the English ` +
  `privacy statement names every activation field; every locale references the Portal and ` +
  `describes the assistant's account summary, the self-serve export and the stored IP addresses. ` +
  `(Presence checks, not a legal or translation review.)`);
