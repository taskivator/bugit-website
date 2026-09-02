// bugit.dev must publish the two values the shipped verifier tells customers to compare against.
//
// This is the CHECK half of scripts/sync-release-identity.mjs, and it exists as its own
// `check-*` file for one reason: `check-ci-coverage.mjs` sweeps `scripts/check-*` to decide what
// must run in CI. A guard named anything else is outside the meta-guard, which is exactly how
// `sync-guides.mjs` came to be a step nothing verified was wired up.
//
// What it protects: `python tools/verify_release.py` ends a PASSING run by telling the customer
// to compare the archive sha256 and the release key id "with https://bugit.dev". The site
// published neither, so the instruction that turns a self-check into a proof of origin pointed at
// nothing. Now it points at /verify.json, and this fails the build if that file stops describing
// the release the agent checkout actually produced.
//
// A STALE VALUE HERE IS WORSE THAN A MISSING ONE. It does not fail safe: it disagrees with a
// genuine download and tells the customer their bytes are wrong.

//
// A GUARD THAT IS RED FOR A REASON NOBODY IN CI CAN FIX IS A GUARD NOBODY READS. Until
// 2026-09-03 this exited 1 on every CI run, always with the same sentence -- "no signed manifest
// found beside the agent checkout" -- because CI checks out the WEBSITE and the agent tree is a
// sibling directory that only exists on the owner's machine. It was not reporting a defect; it
// was reporting where it was running.
//
// On 2026-09-02 it had something real to say. bugit.dev was publishing 1.3.1's values while
// 1.3.2 was the release, so every customer who ran the verification this product advertises on
// a genuine download was told their bytes were wrong. The finding sat inside the same red step
// it always produced, in runs that were red for other reasons too, and it went unread for a day.
//
// So the two situations are now told apart:
//
//   agent tree ABSENT   -- CI. It cannot compare, says so loudly, and checks what it CAN: that
//                          verify.json exists, parses, and carries four well-formed values
//                          rather than a placeholder or a truncation. Exit 0, because a step
//                          that can never go green teaches everyone to skip it.
//   agent tree PRESENT  -- the owner's machine, `npm test`, and the release checklist. It
//                          compares, and a stale value FAILS. That is where the comparison can
//                          actually be made and where somebody can act on it.
//
// The release checklist in the agent repository carries the other half: it has both trees, and
// it now refuses to publish while bugit.dev's values do not describe the published artifact.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const agent = resolve(here, "..", "..", "generic-qa-agent");
const agentPresent = existsSync(join(agent, "tools", "verify_release.py"));

if (!agentPresent) {
  // NOT a pass. What can be checked here is checked here, and the rest is named.
  const p = resolve(here, "..", "verify.json");
  if (!existsSync(p)) {
    console.error("FAIL: verify.json is missing. The shipped verifier tells customers to compare " +
                  "their download against it, so its absence breaks the check we advertise.");
    process.exit(1);
  }
  let v;
  try { v = JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { console.error("FAIL: verify.json is not valid JSON: " + e.message); process.exit(1); }
  const bad = [];
  if (!/^\d+\.\d+\.\d+$/.test(String(v.version || ""))) bad.push(`version=${v.version}`);
  if (!/^[0-9a-f]{64}$/.test(String(v.archive_sha256 || ""))) bad.push(`archive_sha256=${v.archive_sha256}`);
  if (!/^[0-9a-f]{16}$/.test(String(v.release_key_id || ""))) bad.push(`release_key_id=${v.release_key_id}`);
  if (!(Number.isInteger(v.files) && v.files > 0)) bad.push(`files=${v.files}`);
  if (bad.length) {
    console.error("FAIL: verify.json does not carry four well-formed values: " + bad.join(", "));
    process.exit(1);
  }
  console.log(`NOT CHECKED HERE: verify.json is well formed (${v.version}, ` +
              `${String(v.archive_sha256).slice(0, 16)}..., key ${v.release_key_id}, ${v.files} files), ` +
              "but whether it describes the CURRENT release cannot be decided in this checkout: " +
              "the agent tree is not beside it. The comparison runs where both trees are -- " +
              "`npm test` on the owner's machine, and `release_checklist.py --phase pre`, which " +
              "refuses to publish while these values are stale.");
  process.exit(0);
}

const r = spawnSync(process.execPath,
  [join(here, "sync-release-identity.mjs"), "--agent", agent, "--check"],
  { stdio: "inherit" });

if (r.error) {
  console.error("check-release-identity: could not run the sync script:", r.error.message);
  process.exit(1);
}
process.exit(r.status ?? 1);
