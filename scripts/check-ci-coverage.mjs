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

/* A guard that CANNOT run in CI, with the reason it cannot. This is an escape hatch and it is
 * meant to stay nearly empty: an entry here is a guard nobody is forced to run, which is the
 * exact shape this file exists to prevent. Each one therefore has to say what it needs that CI
 * has not got, so the next reader can tell an honest exemption from a parked failure. */
const POST_DEPLOY = new Map([
  ["check-live-delivery.mjs",
   "measures what a deployed origin SERVES. CI has no deployed site, and running it before " +
   "the deploy would assert that the deploy had not happened yet. Run by hand after every " +
   "publish: npm run verify:live"],
]);

const allGuardFiles = fs
  .readdirSync(path.join(ROOT, "scripts"))
  .filter((f) => /^check-.*\.mjs$/.test(f) && f !== SELF)
  .sort();

for (const [name] of POST_DEPLOY) {
  if (!allGuardFiles.includes(name)) {
    console.error(`FAIL: ${name} is exempted as post-deploy but no such file exists. Remove the exemption.`);
    process.exit(1);
  }
}

const guards = allGuardFiles.filter((f) => !POST_DEPLOY.has(f));

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

/* AND A GUARD MUST BE ABLE TO RUN ON A MACHINE THAT IS NOT THIS ONE.
 *
 * `scripts/_title.mjs` opened with `const ROOT = "c:/Users/Ppedr/Desktop/BugIt/..."`. On any
 * other machine, on CI, or simply after the folder is renamed, it reads a file that is not
 * there and dies -- and because it is a helper rather than a check-* guard, nothing above
 * would ever have noticed. Every other file in this directory derives its root from
 * `import.meta.url`, which is correct everywhere; this makes that the rule rather than the
 * habit. The subject is every script in the directory, not a list of the ones known to be
 * wrong.
 *
 * NOT every absolute path is this defect, and the first version of this rule got that wrong.
 * `check-overflow.mjs` and `check-mission-pause.mjs` carry a list of Chrome install locations
 * -- `C:/Program Files/...`, `/Applications/...`, `/usr/bin/...` -- tried in turn behind
 * `existsSync` after the CHROME_BIN environment variables. That is the correct way to find an
 * external binary on an unknown machine and it is portable BECAUSE it names all three. Two
 * shapes are machine-specific no matter how they are written, so those are what this asks for:
 * a path inside somebody's home directory, and a literal absolute path bound to the script's
 * own root. */
const HOME_PATH = /(["'`])(?:[A-Za-z]:[\\/]Users[\\/]|\/home\/|\/Users\/)[^"'`\n]{4,}\1/i;
const LITERAL_ROOT = /\b(?:const|let|var)\s+(?:ROOT|root|DIST|dist|BASE_DIR|REPO)\s*=\s*(["'`])((?:[A-Za-z]:[\\/]|\/)[^"'`\n]{4,})\1/;
for (const f of fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => /\.mjs$/.test(f)).sort()) {
  const src = fs.readFileSync(path.join(ROOT, "scripts", f), "utf8");
  // Strip comments first: this file, and several guards, QUOTE the bad path while explaining it.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const home = code.match(HOME_PATH);
  if (home) {
    failures.push(
      `${f} hardcodes ${home[0]}, a path inside one person's home directory — it can only ` +
        `run on that account. Derive it from import.meta.url, or read it from the environment.`,
    );
  }
  const rooted = code.match(LITERAL_ROOT);
  if (rooted && !home) {
    failures.push(
      `${f} binds its root to the literal path ${rooted[2]} — it breaks the moment the ` +
        `checkout moves. Derive it from import.meta.url the way every other script here does.`,
    );
  }
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
    `and all ${suites.length} declared suites are among them; no script hardcodes an absolute path.`
);
for (const [name, why] of POST_DEPLOY) console.log(`  post-deploy, not in CI: ${name} — ${why}`);
