#!/usr/bin/env node
/**
 * The guides this site serves must be the ones the agent last published.
 *
 * WHY THIS EXISTS. `sync-guides.mjs` has done the right thing since it was written: it reads the
 * agent's `docs/pdf-manifest.json` and copies exactly what the agent published, including the
 * five languages that ship under localized filenames. It was wired into NOTHING. Not
 * `package.json`, not `test-all.mjs`, not CI. Someone had to remember to run it.
 *
 * On 2026-08-31 the agent's 22 PDFs were reprinted to correct four false claims -- where a
 * tracker token is kept on Windows, what does and does not leave the machine, what `Undo last
 * filing` can do, and whose limitation the GitHub/GitLab/Bugzilla attachment gap is -- and
 * nobody ran the sync. An external auditor downloaded all 22 from bugit.dev the same day, hashed
 * them, extracted the text, and found every corrected claim still being served to customers.
 *
 * `check-docs.mjs` was green throughout, and correctly so: it verifies the SERVED bytes match
 * `guides-manifest.json`, which is a different question. A stale sync is perfectly
 * self-consistent. Nothing compared the site against the source.
 *
 * AND IT ESCAPED THE META-GUARD BY ITS NAME. `check-ci-coverage.mjs` asserts that every
 * `scripts/check-*.mjs` is referenced by CI -- so `sync-guides.mjs`, not matching that pattern,
 * was outside the guard that exists to catch exactly this. Hence this wrapper: it is named
 * `check-`, so the meta-guard sees it and requires it to stay wired.
 *
 *   node scripts/check-guides-fresh.mjs
 *   node scripts/check-guides-fresh.mjs --agent ../generic-qa-agent
 *
 * WHEN THE AGENT REPO IS NOT BESIDE US, as in CI, this cannot answer and says so rather than
 * passing. "I could not look" is a more useful sentence than a verdict, and a check that reports
 * clean over a question it never asked is the failure this whole file is about. Set
 * `BUGIT_GUIDES_FRESHNESS_UNVERIFIABLE=1` to acknowledge that and exit 0 with a loud line; the
 * deploy path must never set it.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const argv = process.argv.slice(2);
const flag = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const agent = resolve(ROOT, flag("--agent") ?? "../generic-qa-agent");

if (!existsSync(join(agent, "docs", "pdf-manifest.json"))) {
  const msg =
    `NOT VERIFIED: the agent repo is not at ${agent}, so this run did not check whether the ` +
    `guides on this site are the ones the agent last published.`;
  if (process.env.BUGIT_GUIDES_FRESHNESS_UNVERIFIABLE === "1") {
    console.log(`${msg}\n  Acknowledged by BUGIT_GUIDES_FRESHNESS_UNVERIFIABLE=1. ` +
                `The deploy path must not set this.`);
    process.exit(0);
  }
  console.error(`${msg}\n  Pass --agent <path to generic-qa-agent>, or set ` +
                `BUGIT_GUIDES_FRESHNESS_UNVERIFIABLE=1 to acknowledge that it could not be ` +
                `checked here.`);
  process.exit(2);
}

// One implementation of "is it current": the sync's own --check. A second comparison here would
// be a second answer to one question, and the second is the one that goes stale.
const run = spawnSync(process.execPath,
                      [join(HERE, "sync-guides.mjs"), "--agent", agent, "--check"],
                      { encoding: "utf8" });
process.stdout.write(run.stdout ?? "");
process.stderr.write(run.stderr ?? "");

if (run.status !== 0) {
  console.error(
    "\nThe guides this site serves are not what the agent published.\n" +
    "  Run:  node scripts/sync-guides.mjs --agent " + agent + "\n" +
    "  Then commit the updated PDFs and public/docs/guides/guides-manifest.json.\n" +
    "  A stale guide is a customer-facing claim about a product that has moved on.");
  process.exit(run.status ?? 1);
}
console.log("guides are current with the agent's published PDFs");
