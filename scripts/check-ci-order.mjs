#!/usr/bin/env node
/**
 * RC3 — CI ordering guard (Approval 1).
 *
 * The Website CI runs the fast deterministic guards (including the Option A consent
 * behavioural test) BEFORE the slow ~2970-assertion browser overflow sweep, so
 * Option A is proven independently and an unrelated responsive failure is surfaced
 * precisely — WITHOUT weakening the overflow gate.
 *
 * This proves the ordering is an ordering change only, not a weakening:
 *  1. Option A runs before the overflow sweep.
 *  2. The overflow sweep remains present (mandatory).
 *  3. The overflow sweep can still fail the workflow (no continue-on-error).
 *  4. No content gate was deleted.
 *  5. No condition excludes pull requests.
 *  6. No branch-specific bypass exists.
 *  7. No locale or viewport was removed from the sweep.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ci = fs.readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
const overflow = fs.readFileSync(path.join(ROOT, "scripts/check-overflow.mjs"), "utf8");

let fails = 0;
const check = (ok, msg) => { if (!ok) { console.error(`FAIL: ${msg}`); fails++; } };

const OPTION_A = "check-consent-option-a.mjs";
const OVERFLOW = "check-overflow.mjs";

// The complete set of content gates that must all remain wired.
const REQUIRED_STEPS = [
  "check-assets.mjs", "check-doc-links.mjs", "check-docs.mjs", "check-logo.mjs",
  "check-trust-icons.mjs", "check-ads-tag.mjs", "check-consent-option-a.mjs",
  "check-cache-headers.mjs", "check-csp-telemetry.mjs", "check-billing-copy.mjs",
  "check-overflow.mjs",
];

// 1. Option A before overflow.
const aAt = ci.indexOf(OPTION_A);
const oAt = ci.indexOf(OVERFLOW);
check(aAt !== -1, "the Option A consent test step is missing from CI");
check(oAt !== -1, "the overflow sweep step is missing from CI");
check(aAt !== -1 && oAt !== -1 && aAt < oAt, "Option A must run BEFORE the overflow sweep");

// 2 + 4. Every required gate is present exactly once (nothing deleted).
for (const step of REQUIRED_STEPS) {
  const n = ci.split(step).length - 1;
  check(n === 1, `content gate ${step} must appear exactly once in CI (found ${n})`);
}

// Strip comment lines so prose (e.g. "no continue-on-error") never trips the
// key checks below — only real YAML keys should match.
const yamlNoComments = ci.replace(/^\s*#.*$/gm, "");

// 3. Overflow (and the whole job) must not be softened to non-failing.
check(!/^\s*continue-on-error\s*:/im.test(yamlNoComments), "CI must not use a continue-on-error key (a gate could then pass while failing)");

// 5. No pull-request exclusion. The workflow is push-triggered; assert no step or
//    job carries an `if:` key that could skip validation on a PR/branch.
check(!/^\s*if\s*:/im.test(yamlNoComments), "CI must contain no step/job `if:` conditions (no PR/branch bypass)");

// 6. No branch-specific bypass around the overflow sweep specifically.
const overflowBlock = yamlNoComments.slice(Math.max(0, yamlNoComments.indexOf(OVERFLOW) - 200), yamlNoComments.indexOf(OVERFLOW) + 120);
check(!/github\.ref|github\.event_name|^\s*if\s*:/im.test(overflowBlock), "the overflow sweep must have no branch/event bypass");

// 7. No locale or viewport removed from the sweep.
check(/\[320,\s*720\]/.test(overflow), "the 320px viewport must remain in the overflow sweep");
for (const loc of ["en", "ja", "fr", "de", "es", "pt-br", "it", "ko", "zh", "ru"]) {
  check(new RegExp(`['"]${loc}['"]`).test(overflow.match(/const LANGS[^\]]*\]/)?.[0] || ""),
    `locale ${loc} must remain in the overflow sweep`);
}
const vpCount = (overflow.match(/\[\d+,\s*\d+\]/g) || []).length;
check(vpCount >= 11, `the sweep must keep at least 11 viewports (found ${vpCount})`);

if (fails) {
  console.error(`\ncheck-ci-order: ${fails} failure(s).`);
  process.exit(1);
}
console.log("check-ci-order: OK — Option A before overflow; overflow mandatory & failing; no gate/locale/viewport removed; no PR/branch bypass.");
