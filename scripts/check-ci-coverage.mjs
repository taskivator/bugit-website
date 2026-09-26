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
 *
 * "REFERENCED" MEANS INVOKED, NOT MENTIONED. Until 2026-09-26 both lists were read as text:
 * `ci.includes(name)` for the workflow, and every quoted "check-*.mjs" anywhere in test-all.mjs
 * for the suite. ci.yml is full of prose comments that name guards, so a guard whose step had
 * been deleted, commented out or given `if: false` still counted as wired as long as a comment
 * somewhere still said its name, and a suite named only in a test-all.mjs comment counted as a
 * suite. Both are now parsed (scripts/lib/ci-workflow.mjs): a guard counts as run by CI only when
 * a step whose condition this can model invokes `node scripts/<guard>` at command position, and a
 * suite counts only as a string literal inside the SUITES array the runner iterates. A step with
 * a condition it cannot model is a failure, never a guess. A synthetic workflow with the guard
 * only mentioned is run through the same predicates first, every time, and must not count.
 *
 * What this proves is DECLARED REACHABILITY: the step exists and nothing in the workflow stops it
 * running. Whether it then completed is what the run's own log says, not this file.
 *
 * Planted-input override, for proving it by hand: CI_COVERAGE_WORKFLOW=<path to a ci.yml copy>
 * and CI_COVERAGE_TEST_ALL=<path to a test-all.mjs copy>.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseWorkflow, classifyCondition, nodeScriptsInvoked, playwrightEnginesInstalled, parseSuitesArray, ENGINES,
} from "./lib/ci-workflow.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SELF = "check-ci-coverage.mjs";
const WORKFLOW_FILE = process.env.CI_COVERAGE_WORKFLOW || path.join(ROOT, ".github/workflows/ci.yml");
const TEST_ALL_FILE = process.env.CI_COVERAGE_TEST_ALL || path.join(ROOT, "scripts/test-all.mjs");

/* What the workflow INVOKES. Returns { runs: Map(guard -> [{ job, index, line }]), installs:
 * [{ job, index, engines }], problems: [string] }. Only steps whose `if:` is modelled count, and a
 * step whose condition reads a step id that is not declared EARLIER in the same job can never be
 * satisfied, so it counts as unreachable. */
function workflowInventory(text) {
  const runs = new Map();
  const installs = [];
  const problems = [];
  let wf;
  try { wf = parseWorkflow(text); } catch (e) { return { runs, installs, problems: [`ci.yml cannot be read strictly: ${e.message}`] }; }
  for (const job of wf.jobs) {
    const earlierIds = new Set();
    job.steps.forEach((s, index) => {
      const c = classifyCondition(s.if);
      const where = `job "${job.id}", step at ci.yml line ${s.line}${s.name ? ` ("${s.name}")` : ""}`;
      if (!c.ok) problems.push(`${where} has a condition this guard cannot model, so nothing in it counts as run: ${c.error}`);
      else if (c.stepRefs.some((id) => !earlierIds.has(id))) {
        problems.push(`${where} waits on a step id that no earlier step in the job declares (${c.stepRefs.join(", ")}), so it can never run`);
      } else if (s.run) {
        for (const g of nodeScriptsInvoked(s.run)) {
          if (!runs.has(g)) runs.set(g, []);
          runs.get(g).push({ job: job.id, index, line: s.line });
        }
        const engines = playwrightEnginesInstalled(s.run);
        if (engines.size) installs.push({ job: job.id, index, engines });
      }
      if (s.id) earlierIds.add(s.id);
    });
  }
  return { runs, installs, problems };
}

/* THE PERMANENT NEGATIVE CONTROL. Plant the shapes that used to satisfy this guard -- a guard
 * named only in a YAML comment, only in a shell comment inside a run block, only inside an echo
 * string, only in a step whose condition is `false`, and a suite named only in a comment beside
 * the SUITES array -- and require that none of them counts, while the one real invocation does.
 * If a later edit loosens a predicate, this fails before the real inventory is believed. */
function selfTest() {
  const bad = [];
  const wf = [
    "name: planted",
    "on:",
    "  push:",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      # node scripts/check-planted-yaml-comment.mjs",
    "      - name: real",
    "        id: real",
    "        run: node scripts/check-planted-real.mjs",
    "      - name: prose",
    "        run: |",
    "          # node scripts/check-planted-shell-comment.mjs",
    "          echo \"run node scripts/check-planted-echo.mjs by hand\"",
    "      - name: never",
    "        if: false",
    "        run: node scripts/check-planted-if-false.mjs",
    "      - name: dangling",
    "        if: ${{ !cancelled() && steps.nosuch.outcome == 'success' }}",
    "        run: node scripts/check-planted-dangling.mjs",
    "      - name: browser too early",
    "        run: node scripts/check-planted-browser.mjs",
    "      - name: install",
    "        run: npx playwright install --with-deps chromium",
  ].join("\n");
  const inv = workflowInventory(wf);
  if (!inv.runs.has("check-planted-real.mjs")) bad.push("a real `run: node scripts/<guard>` was not counted");
  for (const g of ["yaml-comment", "shell-comment", "echo", "if-false", "dangling"]) {
    if (inv.runs.has(`check-planted-${g}.mjs`)) bad.push(`a guard mentioned only as "${g}" counted as run by CI`);
  }
  if (!inv.problems.some((p) => /cannot model/.test(p))) bad.push("`if: false` was not reported as an unmodelled condition");
  if (!inv.problems.some((p) => /never run/.test(p))) bad.push("a condition on an undeclared step id was not reported");
  const early = inv.runs.get("check-planted-browser.mjs")?.[0];
  const inst = inv.installs[0];
  if (!early || !inst || !(early.index < inst.index) || !inst.engines.has("chromium") || inst.engines.has("webkit")) {
    bad.push("install ordering or the engines an install provides were not modelled");
  }
  try {
    parseWorkflow(wf.replace("        run: node scripts/check-planted-real.mjs", "        shell: pwsh\n        run: node scripts/check-planted-real.mjs"));
    bad.push("a step-level `shell:` was accepted instead of refused");
  } catch { /* refused, as it must be */ }
  const suitesSrc = [
    "const SUITES = [",
    "  // \"check-planted-suite-comment.mjs\" is only talked about here",
    "  \"check-planted-suite.mjs\",",
    "];",
    "const unrelated = \"check-planted-suite-string.mjs\";",
    "for (const s of SUITES) run(\"scripts/\" + s);",
  ].join("\n");
  let suites = [];
  try { suites = parseSuitesArray(suitesSrc); } catch (e) { bad.push(`the planted SUITES array did not parse: ${e.message}`); }
  if (!suites.includes("check-planted-suite.mjs")) bad.push("a real SUITES entry was not counted");
  if (suites.some((s) => s !== "check-planted-suite.mjs")) bad.push(`a suite mentioned only in a comment or an unrelated string counted: ${suites.join(", ")}`);
  return bad;
}

/* A guard that CANNOT run in CI, with the reason it cannot. This is an escape hatch and it is
 * meant to stay nearly empty: an entry here is a guard nobody is forced to run, which is the
 * exact shape this file exists to prevent. Each one therefore has to say what it needs that CI
 * has not got, so the next reader can tell an honest exemption from a parked failure. */
const POST_DEPLOY = new Map([
  ["check-deploy-safety.mjs",
   "compares the build about to be published against what the LIVE site already is: it reads " +
   "production's source commit from the Cloudflare API and the live homepage over the network, " +
   "neither of which exists in CI, and it needs a deploy credential CI must not be given. It is " +
   "a PRE-deploy gate, wired into `npm run deploy` so the documented publish path cannot skip " +
   "it. It exists because on 2026-09-23 a deploy from main removed the Ask bar and the Guide's " +
   "mark from bugit.dev while every CI gate passed."],
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

const failures = [];

for (const b of selfTest()) failures.push(`self-test: ${b}. The predicates below cannot be believed.`);

const ci = workflowInventory(fs.readFileSync(WORKFLOW_FILE, "utf8"));
failures.push(...ci.problems);
let suites = [];
try {
  suites = parseSuitesArray(fs.readFileSync(TEST_ALL_FILE, "utf8"));
} catch (e) {
  failures.push(`test-all.mjs SUITES cannot be read strictly: ${e.message}`);
}
if (!ci.runs.size) failures.push("ci.yml invokes no guard at all, which is not a state this repository can be in");
if (!suites.length) failures.push("test-all.mjs SUITES is empty, which is not a state this repository can be in");

for (const g of guards) {
  if (!ci.runs.has(g)) failures.push(`${g} exists in scripts/ but no reachable ci.yml step runs it (a mention in a comment or a string does not count)`);
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
  if (!ci.runs.has(s)) failures.push(`${s} is declared in test-all.mjs SUITES but no reachable ci.yml step runs it`);
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

/* AND A GUARD THAT DRIVES A BROWSER MUST BE WIRED AFTER THE BROWSER IS INSTALLED.
 *
 * `check-not-found.mjs` launches Chromium through Playwright and sat eight steps ABOVE the
 * `npx playwright install` that provides one. Nobody noticed, because it never got that far: it
 * died first on a preview server it could not start, so one defect hid the other and fixing the
 * server alone would have turned "server never came up" into "Executable doesn't exist" on the
 * next run.
 *
 * The subject is computed: every guard whose SOURCE imports playwright, not a list of the ones
 * known to need it today. Anchored on the FIRST install step, because a guard placed before it
 * is broken whichever browser it wanted. */
// BOTH ANCHORS ARE COMMANDS, NOT MENTIONS. The first draft searched for the guard's NAME and
// for the words "playwright install", and reported check-disclosure.mjs -- which runs at the
// very bottom of the file -- because ci.yml explains beside the install step why that guard
// needs WebKit. The comment is above the command it explains, so the mention came first. That
// is this repo's own "do not trust a substring for an absence", found by the guard being
// written rather than in production, which is the only cheap place to find it.
//
// NOW BY STEP, BY JOB AND BY ENGINE. The anchors used to be character offsets in the raw file,
// which cannot tell two jobs apart (a job has its own machine, so an install in another job
// provides nothing) and cannot tell which browser was installed: the Firefox install sits near
// the end of the file, and a Firefox guard placed after the Chromium install but before it passed.
// Each invocation is now checked against the install steps EARLIER IN ITS OWN JOB, for every
// engine the guard imports. The import is found in both spellings used here: the static
// `import { chromium } from "playwright"` and the dynamic `await import("playwright")` of
// check-consent-network.mjs, which the old static-only pattern never saw.
let anyBrowserGuard = false;
for (const g of guards) {
  const src = fs.readFileSync(path.join(ROOT, "scripts", g), "utf8");
  const stat = src.match(/^\s*import\s*\{([^}]*)\}\s*from\s+["']playwright["']/m);
  const dyn = src.match(/\{([^}]*)\}\s*=\s*await\s+import\(\s*["']playwright["']\s*\)/);
  if (!stat && !dyn && !/^\s*import[^\n]*from\s+["']playwright["']/m.test(src)) continue;
  anyBrowserGuard = true;
  const named = ENGINES.filter((e) => new RegExp(`\\b${e}\\b`).test((stat?.[1] ?? "") + (dyn?.[1] ?? "")));
  const engines = named.length ? named : ["chromium"];
  for (const at of ci.runs.get(g) ?? []) {
    const provided = new Set();
    for (const inst of ci.installs) if (inst.job === at.job && inst.index < at.index) for (const e of inst.engines) provided.add(e);
    const missing = engines.filter((e) => !provided.has(e));
    if (missing.length) {
      failures.push(
        `${g} launches ${missing.join(" and ")} through Playwright, but at ci.yml line ${at.line} no earlier step ` +
          `in job "${at.job}" has run \`playwright install\` for it. Move the step below the install, or it fails ` +
          `on a runner with no browser.`,
      );
    }
  }
}
if (anyBrowserGuard && !ci.installs.length) {
  failures.push("ci.yml never runs `playwright install`, yet guards in this repo drive Playwright browsers");
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
  `check-ci-coverage: OK -- all ${guards.length} guards are invoked by a reachable ci.yml step AND listed ` +
    `in the \`npm test\` SUITES array, all ${suites.length} declared suites are among them, every browser ` +
    `guard follows the install of each engine it imports, and no script hardcodes an absolute path. ` +
    `(Wired and reachable; whether a run completed is that run's log.)`
);
for (const [name, why] of POST_DEPLOY) console.log(`  post-deploy, not in CI: ${name} — ${why}`);
