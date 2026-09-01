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

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const agent = resolve(here, "..", "..", "generic-qa-agent");

const r = spawnSync(process.execPath,
  [join(here, "sync-release-identity.mjs"), "--agent", agent, "--check"],
  { stdio: "inherit" });

if (r.error) {
  console.error("check-release-identity: could not run the sync script:", r.error.message);
  process.exit(1);
}
process.exit(r.status ?? 1);
