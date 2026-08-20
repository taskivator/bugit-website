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
const SCAN = [
  ...LOCALES.map(privacyFile), ...LOCALES.map(licenseFile),
  "app.js", ...distJs,
].filter(exists);

for (const rel of SCAN) {
  const src = read(rel);
  for (const frag of FORBIDDEN) {
    if (src.includes(frag)) fail(`${rel}: retired-model fragment present — "${frag}"`);
  }
}

// ---------------------------------------------------------------------------
// REQUIRED (English source of truth): browser-entitlement fields present.
// ---------------------------------------------------------------------------
const enPrivacy = read(privacyFile(""));
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
const enLicense = read(licenseFile("")).replace(/\s+/g, " ");
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
    if (exists(f) && !read(f).includes(term)) fail(`${f}: not migrated to browser model (no "${term}" reference)`);
  }
}

if (failures) {
  console.error(`\ncheck-legal-dataflow: ${failures} failure(s).`);
  process.exit(1);
}
console.log(`check-legal-dataflow: OK — browser-entitlement model consistent across ${SCAN.length} source/dist files + ${LOCALES.length} locales.`);
