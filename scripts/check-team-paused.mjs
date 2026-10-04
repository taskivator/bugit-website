#!/usr/bin/env node
import { createHash } from "node:crypto";
/**
 * Guard: Team commercial state on bugit.dev. Team LAUNCHED 2026-07-27
 * (owner-authorized) — the site must present it as purchasable and must NOT
 * carry any stale "temporarily unavailable / coming soon" copy.
 *
 * History: the site once advertised "5 devices (5 users)" while the backend had
 * one account with five DEVICE activations, so Team was paused. Team was then
 * rebuilt as a genuine five-MEMBER product (portal accounts, invitations, seats,
 * per-member browser activation, max_members=5 enforced) and launched. A member
 * count is now TRUE and permitted; what must never regress is a stale
 * "unavailable" state or a missing checkout CTA.
 *
 * Checks SOURCE and BUILT OUTPUT. dist/ is what customers actually receive, and
 * a stale hashed bundle would keep serving old copy long after source was fixed.
 *
 * TO RE-PAUSE Team: flip TEAM_PAUSED to true — the paused assertions (no live
 * CTA, must show "temporarily unavailable") come back; the Solo-intact and
 * no-personal-address assertions hold in both states.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishedCopy } from "./lib/published-copy.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TEAM_PAUSED = false;

let failures = 0;
const check = (ok, msg) => { if (!ok) { console.error(`FAIL: ${msg}`); failures++; } };

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const distJs = fs.readdirSync(path.join(ROOT, "dist")).filter((f) => /^app\.[0-9a-f]+\.js$/.test(f));

const SOURCES = [
  ["app.js", read("app.js")],
  ["index.html", read("index.html")],
  ["dist/index.html", read("dist/index.html")],
  ...distJs.map((f) => [`dist/${f}`, read(`dist/${f}`)]),
];

check(distJs.length === 1, `expected exactly one hashed app bundle in dist, found ${distJs.length}`);

const TEAM_CTA = /href="https:\/\/portal\.bugit\.dev\/pricing\?plan=team"/;
// Every stale Team "coming soon / being rebuilt / unavailable-for-purchase"
// phrasing, any locale. Deliberately Team-SPECIFIC: a bare "temporarily
// unavailable" is excluded because it is also the generic doc-fetch error
// fallback ("This guide is temporarily unavailable"), which is legitimate and
// unrelated to Team. The Team CTA/term/FAQ carry the markers below instead.
const STALE = new RegExp(
  [
    "COMING SOON", "being rebuilt", "En reconstrucción", "Перерабатывается",
    "separate accounts and secure access", "cuentas separadas y acceso seguro",
    "PR[ÓO]XIMAMENTE", "近日公開", "СКОРО", "DEMN[ÄA]CHST", "BIENT[ÔO]T",
    "no está disponible para comprar", "temporairement pas disponible",
    "derzeit nicht käuflich", "temporariamente indisponível",
    "non è temporaneamente disponibile", "временно недоступен для покупки",
    "現在ご購入いただけません", "현재 구매할 수 없습니다", "暂时无法购买",
  ].join("|"),
  "i",
);

// THE TASKIVATOR FAMILY BAND (2026-09-30) lists sibling products with their taskivator.com status,
// "coming soon" in every locale. Those are Taskivator facts, not Team copy, so ONLY the STALE test
// looks past the band, and only between its own two markers (the <aside class="tk-family"> element
// and the familyI18n dictionary). Each may be removed at most once and be at most 20 KB, so a
// broken marker can never hide a whole file from this guard. Every other check reads whole files.
// The dictionary's end is found by matching its braces (quoted strings skipped), because the
// built bundle is minified onto one line and has no line structure to anchor on.
const SKIP_MAX = 20000;
const dictionarySpan = (src, from) => {
  const open = src.indexOf("{", from);
  let depth = 0, quote = null;
  for (let i = open; i < src.length && i - from <= SKIP_MAX; i++) {
    const c = src[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i + 1;
  }
  return -1;
};
const withoutFamily = (name, src) => {
  let out = src;
  const asides = out.match(/<aside class="tk-family[\s\S]*?<\/aside>/g) || [];
  check(asides.length <= 1, `${name}: the family band <aside> appears ${asides.length} times`);
  for (const a of asides) check(a.length <= SKIP_MAX, `${name}: the family band <aside> is ${a.length} bytes, too large to skip`);
  if (asides.length === 1) out = out.replace(asides[0], "");
  const starts = out.split("const familyI18n=").length - 1;
  check(starts <= 1, `${name}: familyI18n is declared ${starts} times`);
  if (starts === 1) {
    const from = out.indexOf("const familyI18n=");
    const end = dictionarySpan(out, from);
    check(end > from, `${name}: the familyI18n dictionary has no end within ${SKIP_MAX} bytes`);
    if (end > from) out = out.slice(0, from) + out.slice(end);
  }
  return out;
};

if (TEAM_PAUSED) {
  // Paused: no user-count claim, no live CTA, must be visibly "temporarily unavailable".
  const USER_CLAIM = new RegExp(
    [
      String.raw`5\s*users`, String.raw`5\s*usuarios`, String.raw`5\s*utilisateurs`,
      String.raw`5\s*Benutzer`, String.raw`5\s*Nutzer`, String.raw`5\s*usuários`,
      String.raw`5\s*utenti`, String.raw`5\s*пользовател`,
      "5\\s*ユーザー", "5\\s*名", "5\\s*명", "5\\s*位用户", "5\\s*个用户",
    ].join("|"),
    "i",
  );
  for (const [name, src] of SOURCES) check(!USER_CLAIM.test(src), `${name} claims a Team user count while paused`);
  for (const name of ["index.html", "dist/index.html"]) {
    const src = SOURCES.find(([n]) => n === name)[1];
    check(!TEAM_CTA.test(src), `${name} still links a working Team checkout CTA while Team sales are paused`);
  }
  for (const name of ["app.js", ...distJs.map((f) => `dist/${f}`)]) {
    const src = SOURCES.find(([n]) => n === name)[1];
    check(/Temporarily unavailable/i.test(src), `${name} does not state that the Team plan is temporarily unavailable`);
  }
} else {
  // Launched: Team MUST be purchasable and carry NO stale unavailable copy.
  for (const name of ["index.html", "dist/index.html"]) {
    const src = SOURCES.find(([n]) => n === name)[1];
    check(TEAM_CTA.test(src), `${name} is missing the Team checkout CTA — Team is live and must be purchasable`);
  }
  for (const [name, src] of SOURCES) {
    check(!STALE.test(withoutFamily(name, src)), `${name} still carries stale Team 'unavailable/coming soon' copy after launch`);
  }
}

// --- Solo must be untouched -------------------------------------------------
for (const name of ["index.html", "dist/index.html"]) {
  const src = SOURCES.find(([n]) => n === name)[1];
  check(
    /href="https:\/\/portal\.bugit\.dev\/pricing\?plan=solo"/.test(src),
    `${name} lost the Solo purchase CTA — Solo sales must remain available`,
  );
  // $59.99 since 2026-10-03, when the introductory $39.99 was retired (owner).
  check(/\$59\.99/.test(src), `${name} lost the $59.99 Solo price`);
}

// --- the owner's personal address, held as a FINGERPRINT, never as text (2026-10-04) ----------
// This file used to spell the address out in two places (the check and its negative control), so
// it travelled inside every snapshot handed to an external auditor; the audit drop's identity
// screen refused it. Every address on a page is now hashed and compared. The second fingerprint is
// a synthetic address the negative control plants, so the control proves the same code path.
const PERSONAL_ADDRESS_SHA256 = new Set([
  "4d98073dc6d929b921dc5ce1f748aff38a808a0630e4d6c3ee861c160e6452c4",
  "8f1358afcc390f0c944197b8e3ccc3c39f321d53128b5b65328366b8438d6c07", // CONTROL_ADDRESS below
]);
const CONTROL_ADDRESS = "owner.control@example.invalid";
const EMAIL_SHAPE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const exposesPersonalAddress = (text) =>
  (text.match(EMAIL_SHAPE) || []).some((a) => PERSONAL_ADDRESS_SHA256.has(createHash("sha256").update(a.toLowerCase()).digest("hex")));

// --- no shared-key instruction and no personal address ----------------------
for (const [name, src] of SOURCES) {
  check(
    !exposesPersonalAddress(src),
    `${name} exposes a personal email address`,
  );
}

// --- THE PUBLISHED COPY (2026-10-04) -----------------------------------------
// bugit.dev now serves the redesign: v2/index.html is the homepage, its other languages are
// v2/i18n/<lang>.json, the docs are v2/docs/, and v2/*.js carry English fallbacks. Every check
// above reads app.js and index.html, which still ship but are no longer what a buyer reads, so on
// their own they would stay green while the live pricing section said anything. The SAME
// assertions, in whichever state TEAM_PAUSED selects, are applied here to what
// scripts/lib/published-copy.mjs says is published (its file list is not restated):
//   launched: the homepage links the Team checkout; no published text carries stale Team
//             "unavailable / coming soon" copy;
//   paused:   no Team user-count claim, no live Team CTA on the homepage, and the homepage says
//             "temporarily unavailable";
//   always:   the homepage keeps the Solo checkout and the $59.99 price, and no published text
//             exposes the personal address.
// The scan is one function so it can also be run over a synthetic copy holding each defect: if a
// negative control is not flagged, the guard fails, because a scan that cannot fail proves nothing.
// The redesign has no family band, so the band allowance above is not needed here and not applied.
const HOMEPAGE = "v2/index.html";
// The redesign's generic page error (key d.err, "This page is temporarily unavailable. Please
// refresh...") is worded in Portuguese and Italian with the same phrase STALE carries for the old
// Team copy. It is the page error the STALE comment above already exempts in English, not Team
// copy, so ONLY that sentence, with its "this page" subject, is removed before the STALE test.
// Any other use of the phrase still fails.
const PAGE_ERROR = /Esta página está temporariamente indisponível\.|Questa pagina non è temporaneamente disponibile\./g;
const USER_CLAIM_ANY = new RegExp(
  [
    String.raw`5\s*users`, String.raw`5\s*usuarios`, String.raw`5\s*utilisateurs`,
    String.raw`5\s*Benutzer`, String.raw`5\s*Nutzer`, String.raw`5\s*usuários`,
    String.raw`5\s*utenti`, String.raw`5\s*пользовател`,
    "5\\s*ユーザー", "5\\s*名", "5\\s*명", "5\\s*位用户", "5\\s*个用户",
  ].join("|"),
  "i",
);
function scanPublished(entries, paused) {
  const out = [];
  const home = entries.find((e) => e.kind === "page" && e.file === HOMEPAGE);
  if (!home) { out.push(`${HOMEPAGE} is not in the published copy; the pricing section has nowhere to be checked.`); return out; }
  if (paused) {
    for (const e of entries) if (USER_CLAIM_ANY.test(e.text)) out.push(`${e.file} claims a Team user count while paused`);
    if (TEAM_CTA.test(home.text)) out.push(`${home.file} still links a working Team checkout CTA while Team sales are paused`);
    if (!/Temporarily unavailable/i.test(home.text)) out.push(`${home.file} does not state that the Team plan is temporarily unavailable`);
  } else {
    if (!TEAM_CTA.test(home.text)) out.push(`${home.file} is missing the Team checkout CTA; Team is live and must be purchasable`);
    for (const e of entries) {
      const m = STALE.exec(e.text.replace(PAGE_ERROR, ""));
      if (m) out.push(`${e.file} still carries stale Team 'unavailable/coming soon' copy after launch: "${m[0]}"`);
    }
  }
  if (!/href="https:\/\/portal\.bugit\.dev\/pricing\?plan=solo"/.test(home.text)) out.push(`${home.file} lost the Solo purchase CTA; Solo sales must remain available`);
  if (!/\$59\.99/.test(home.text)) out.push(`${home.file} lost the $59.99 Solo price`);
  for (const e of entries) if (exposesPersonalAddress(e.text)) out.push(`${e.file} exposes a personal email address`);
  return out;
}

const published = publishedCopy();
const pubChars = published.reduce((n, e) => n + e.text.length, 0);
// Positive control: the published copy was really read, so an empty scan cannot pass.
check(published.length >= 20 && pubChars >= 100000,
  `published copy scan read only ${published.length} entries / ${pubChars} characters; expected at least 20 / 100000`);
for (const p of scanPublished(published, TEAM_PAUSED)) check(false, `published copy: ${p}`);

// Negative controls, in memory only: a synthetic homepage that is clean in the current state,
// then one defect at a time.
const SOLO = '<a href="https://portal.bugit.dev/pricing?plan=solo">Get Solo</a> <b>$59.99</b>';
const TEAM = TEAM_PAUSED ? "Temporarily unavailable" : '<a href="https://portal.bugit.dev/pricing?plan=team">Get Team</a>';
const page = (text) => ({ file: HOMEPAGE, lang: "en", kind: "page", text });
const extra = (text) => ({ file: "synthetic/fr.json", lang: "fr", kind: "home", text });
const controls = [
  ["clean synthetic homepage flagged (control is wrong)", () => scanPublished([page(SOLO + TEAM)], TEAM_PAUSED).length === 0],
  ["missing Solo CTA", () => scanPublished([page("<b>$59.99</b>" + TEAM)], TEAM_PAUSED).length > 0],
  ["missing $59.99", () => scanPublished([page(SOLO.replace("$59.99", "$39.99") + TEAM)], TEAM_PAUSED).length > 0],
  ["personal address", () => scanPublished([page(SOLO + TEAM), extra(CONTROL_ADDRESS)], TEAM_PAUSED).length > 0],
  ...(TEAM_PAUSED
    ? [["Team user count while paused", () => scanPublished([page(SOLO + TEAM), extra("Team: 5 utilisateurs")], true).length > 0]]
    : [
        ["missing Team CTA", () => scanPublished([page(SOLO)], false).length > 0],
        ["stale Team copy", () => scanPublished([page(SOLO + TEAM), extra("Team BIENTÔT")], false).length > 0],
        ["stale Team copy beside the page error allowance", () => scanPublished([page(SOLO + TEAM),
          extra("Questa pagina non è temporaneamente disponibile.\nIl piano Team non è temporaneamente disponibile.")], false).length > 0],
        ["page error allowance (control is wrong)", () => scanPublished([page(SOLO + TEAM),
          extra("Esta página está temporariamente indisponível. Atualize a página.")], false).length === 0],
      ]),
];
for (const [name, ok] of controls) check(ok(), `negative control did not fire: ${name}`);

if (failures) {
  console.error(`\ncheck-team-paused: ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  (TEAM_PAUSED
    ? "check-team-paused: OK — paused: no user-count claims, no live Team CTA, Solo intact."
    : "check-team-paused: OK — launched: Team checkout CTA present, no stale unavailable copy, Solo intact.") +
    ` Published copy: ${published.length} entries (${pubChars} characters) scanned, ${controls.length} negative controls fired.`,
);
