#!/usr/bin/env node
/**
 * Guard: while the Team plan is paused, bugit.dev must not present it as
 * purchasable, and must carry no user-count claim in any language.
 *
 * This exists because the site advertised "5 devices (5 users)" in all ten
 * locales while the backend implemented one account with five DEVICE
 * activations — a claim the product could not honour. The copy has been
 * corrected and the plan paused; this check fails the build if either regresses.
 *
 * Checks SOURCE and BUILT OUTPUT. dist/ is what customers actually receive, and
 * a stale hashed bundle would keep serving the old copy long after the source
 * was fixed.
 *
 * WHEN TEAM SALES RESUME: do not delete this file. Flip TEAM_PAUSED to false —
 * the user-count and availability assertions then relax, but the "no bare 5
 * SEATS / no shared-key instruction" assertions stay, because those were wrong
 * independently of the pause.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TEAM_PAUSED = true;

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

// --- no user-count claim, in any language ----------------------------------
// Every phrasing the site has ever shipped. Deliberately broad: a claim that
// slips through in one locale is the same commercial problem as ten.
const USER_CLAIM = new RegExp(
  [
    String.raw`5\s*users`, String.raw`5\s*usuarios`, String.raw`5\s*utilisateurs`,
    String.raw`5\s*Benutzer`, String.raw`5\s*Nutzer`, String.raw`5\s*usuários`,
    String.raw`5\s*utenti`, String.raw`5\s*пользовател`,
    "5\\s*ユーザー", "5\\s*명", "5\\s*位用户", "5\\s*个用户", "사용자\\s*5\\s*명",
  ].join("|"),
  "i",
);

for (const [name, src] of SOURCES) {
  check(!USER_CLAIM.test(src), `${name} still claims a Team user count (the product has no multi-user model yet)`);
}

// --- no functioning purchase CTA while paused -------------------------------
if (TEAM_PAUSED) {
  for (const name of ["index.html", "dist/index.html"]) {
    const src = SOURCES.find(([n]) => n === name)[1];
    check(
      !/href="https:\/\/portal\.bugit\.dev\/pricing\?plan=team"/.test(src),
      `${name} still links a working Team checkout CTA while Team sales are paused`,
    );
  }
  // The plan must be visibly marked unavailable rather than silently removed —
  // a vanished plan reads as discontinued and strands buyers mid-decision.
  for (const name of ["app.js", ...distJs.map((f) => `dist/${f}`)]) {
    const src = SOURCES.find(([n]) => n === name)[1];
    check(
      /Temporarily unavailable/i.test(src),
      `${name} does not state that the Team plan is temporarily unavailable`,
    );
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
console.log("check-team-paused: OK — no user-count claims, no live Team CTA, Solo intact.");
