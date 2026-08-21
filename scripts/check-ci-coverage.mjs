#!/usr/bin/env node
/**
 * Meta-guard: every guard in scripts/ must actually run somewhere.
 *
 * WHY THIS EXISTS. On 2026-08-09 the repo had 21 `scripts/check-*.mjs` guards. CI ran 12 of
 * them. Eight more were declared in `scripts/test-all.mjs` but never reached a CI step, and
 * `check-chrome-a11y.mjs` appeared in neither list, so it had no runner at all. The result was
 * the worst possible shape: `npm test` failed locally, every push was green, and one of the
 * unrun guards (`check-legal-dataflow.mjs`) was failing because the published privacy policy had
 * stopped disclosing the activation fields the agent genuinely transmits.
 *
 * Writing a guard is cheap. Remembering to wire it is what fails. So this asserts the wiring:
 *
 *   1. every scripts/check-*.mjs is referenced by .github/workflows/ci.yml, and
 *   2. every suite named in test-all.mjs SUITES is also referenced by ci.yml, so the two
 *      lists cannot drift apart again.
 *
 * It deliberately excludes itself: nothing needs to check the checker's own presence, and
 * requiring it would be circular.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SELF = "check-ci-coverage.mjs";

const guards = fs
  .readdirSync(path.join(ROOT, "scripts"))
  .filter((f) => /^check-.*\.mjs$/.test(f) && f !== SELF)
  .sort();

const ci = fs.readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
const suitesSrc = fs.readFileSync(path.join(ROOT, "scripts/test-all.mjs"), "utf8");
const suites = (suitesSrc.match(/"check-[a-z0-9-]+\.mjs"/g) || []).map((s) => s.replace(/"/g, ""));

const failures = [];

for (const g of guards) {
  if (!ci.includes(g)) failures.push(`${g} exists in scripts/ but is never run by ci.yml`);
  // ...AND THE OTHER DIRECTION, which this file did not check and should have. On 2026-08-22
  // the repo had 50 guards; ci.yml ran all of them and `npm test` ran 45. check-hairlines,
  // check-mission-box, check-mobile-chrome and check-menu-keyboard were each written to answer
  // a defect the owner had reported, and none of them could ever fail on the machine where the
  // page is actually being looked at. That is the same failure this file was written for,
  // pointed the other way: CI-only coverage means a regression is found by a push, not by the
  // person who caused it, and it means `npm test` reads as a full sweep when it is not.
  if (!suites.includes(g)) {
    failures.push(`${g} exists in scripts/ but is not in test-all.mjs SUITES, so \`npm test\` never runs it`);
  }
}
for (const s of suites) {
  if (!ci.includes(s)) failures.push(`${s} is declared in test-all.mjs SUITES but is never run by ci.yml`);
  if (!guards.includes(s) && s !== SELF) failures.push(`${s} is declared in test-all.mjs SUITES but no such file exists`);
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  console.error(
    `\ncheck-ci-coverage: ${failures.length} guard(s) not wired.\n` +
      `Wire it into BOTH .github/workflows/ci.yml and scripts/test-all.mjs SUITES, or delete it. ` +
      `A guard that never runs is worse than no guard: it reads as coverage.`
  );
  process.exit(1);
}

console.log(
  `check-ci-coverage: OK — all ${guards.length} guards run in CI AND in \`npm test\`, ` +
    `and all ${suites.length} declared suites are among them.`
);
