#!/usr/bin/env node
/**
 * Run, BEFORE a deploy, every check CI runs that needs no browser and starts no other process.
 *
 * WHY. `npm run deploy` ran three checks and CI runs about ninety, so a deploy could publish what
 * CI then failed. On 2026-09-29 exactly that happened: a Korean doc line used a spelling the LQA
 * round had retired, the deploy went out, and `check-retired-vocabulary.mjs` failed the website CI
 * run on the commit that was already live, two and a half hours later. The text checks take
 * seconds; the browser checks are what makes CI long, and they stay in CI.
 *
 * THE LIST IS READ OUT OF ci.yml, never written here. A hand copy of "the checks that matter"
 * is the thing that goes stale; this takes every `node scripts/check-*.mjs` any step invokes and
 * keeps the ones whose SOURCE imports no browser driver and no child_process. A check added to CI
 * tomorrow is run here tomorrow with nothing to remember.
 *
 * Exit 1 if any fails, naming each. Run after `node build.js`, which is how predeploy calls it.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflow = fs.readFileSync(path.join(ROOT, ".github", "workflows", "ci.yml"), "utf8");

// Every invocation in a step, single line or inside a `run: |` block. Comment lines are dropped
// first, so a check that is only mentioned in a comment is not run as if CI ran it.
const code = workflow.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join("\n");
const invoked = [...new Set([...code.matchAll(/node\s+scripts\/(check-[a-z0-9-]+\.mjs)/g)].map((m) => m[1]))].sort();

const SPAWNS = /from\s+["'](?:node:)?child_process["']|playwright|puppeteer|chrome-devtools/;
const text = [];
const skipped = [];
for (const name of invoked) {
  const file = path.join(ROOT, "scripts", name);
  if (!fs.existsSync(file)) {
    console.error(`FAIL: ci.yml runs scripts/${name}, which does not exist`);
    process.exit(1);
  }
  (SPAWNS.test(fs.readFileSync(file, "utf8")) ? skipped : text).push(name);
}
if (!text.length) {
  console.error("FAIL: found no text check in ci.yml at all, which means the reading broke");
  process.exit(1);
}

const failed = [];
for (const name of text) {
  const r = spawnSync(process.execPath, [path.join("scripts", name)], { cwd: ROOT, encoding: "utf8", timeout: 120000 });
  if (r.status !== 0) {
    failed.push(name);
    console.error(`FAIL  ${name}`);
    console.error(((r.stdout || "") + (r.stderr || "")).trim().split(/\r?\n/).slice(-12).map((l) => "      " + l).join("\n"));
  }
}
console.log(`predeploy: ${text.length - failed.length} of ${text.length} CI text checks passed; ${skipped.length} browser or process checks left to CI`);
process.exit(failed.length ? 1 : 0);
