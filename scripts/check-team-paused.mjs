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
    check(!STALE.test(src), `${name} still carries stale Team 'unavailable/coming soon' copy after launch`);
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
