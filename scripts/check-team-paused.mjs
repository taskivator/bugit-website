#!/usr/bin/env node
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
  check(/\$39\.99/.test(src), `${name} lost the $39.99 Solo price`);
}

// --- no shared-key instruction and no personal address ----------------------
for (const [name, src] of SOURCES) {
  check(
    !/p\.pedram01@gmail\.com/i.test(src),
    `${name} exposes a personal email address`,
  );
}

if (failures) {
  console.error(`\ncheck-team-paused: ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  TEAM_PAUSED
    ? "check-team-paused: OK — paused: no user-count claims, no live Team CTA, Solo intact."
    : "check-team-paused: OK — launched: Team checkout CTA present, no stale unavailable copy, Solo intact.",
);
