// Publish the two values the shipped verifier tells every customer to compare against.
//
// WHY THIS EXISTS. `python tools/verify_release.py` ships inside every buyer package and ends,
// on a PASSING run, with:
//
//     This proves the download is internally consistent and signed by the key
//     above. It does NOT by itself prove who signed it: this verifier ships
//     inside the archive, so anyone who replaces one can replace the other.
//     Compare BOTH values with https://bugit.dev before you trust the bytes.
//
// bugit.dev published neither of them. Not the release key id, not any archive checksum, not a
// word about verification anywhere on the site. So the one instruction that turns a self-check
// into an actual proof of origin -- the whole point of the paragraph -- pointed at nothing, and
// a customer who followed it found no value to compare and no page telling them there was none.
//
// That is the same shape as the defect that prompted this: a promise made in shipped copy, whose
// other half nobody owned. Signing produced the sidecars and nothing served them; the verifier
// names an anchor and nothing published it.
//
// GENERATED, NEVER TYPED. Both values are read from the agent's SIGNED provenance manifest. A
// hand-maintained number on a marketing page is a number that goes stale at the next release and
// is then worse than absent, because it disagrees with a genuine download and accuses it.
//
// Run: node scripts/sync-release-identity.mjs --agent ../generic-qa-agent
//      node scripts/sync-release-identity.mjs --agent ../generic-qa-agent --check

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const check = argv.includes("--check");
const agentArg = argv[argv.indexOf("--agent") + 1];
const agent = resolve(root, agentArg && !agentArg.startsWith("--") ? agentArg : "../generic-qa-agent");

/** The published artifact's signed manifest: staging first (frozen bytes), then dist. */
function findManifest() {
  const places = [join(agent, "..", "release-staging"), join(agent, "dist")];
  const found = [];
  for (const dir of places) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".zip.manifest.json")) found.push(join(dir, name));
    }
  }
  if (!found.length) return null;
  // Highest version wins, so a leftover older artifact cannot publish itself.
  const ver = (p) => (p.match(/(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  found.sort((a, b) => {
    const [A, B] = [ver(a), ver(b)];
    for (let i = 0; i < 3; i++) if ((A[i] ?? 0) !== (B[i] ?? 0)) return (B[i] ?? 0) - (A[i] ?? 0);
    return 0;
  });
  return found[0];
}

/** The key id the shipped verifier pins. Read from the tool, so the two cannot disagree. */
function keyIdFromVerifier() {
  const src = readFileSync(join(agent, "tools", "verify_release.py"), "utf8");
  const m = /_PINNED_RELEASE_PUBKEY\s*=\s*["']([0-9a-fA-F]{64})["']/.exec(src);
  return m ? m[1].slice(0, 16).toLowerCase() : null;
}

const manifestPath = findManifest();
if (!manifestPath) {
  console.error("FAIL: no signed manifest found beside the agent checkout, so there is nothing " +
    "to publish. Build and sign a release first.");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const keyId = keyIdFromVerifier();
if (!keyId) {
  console.error("FAIL: could not read the pinned release key id out of tools/verify_release.py. " +
    "Publishing a key id this script GUESSED would be worse than publishing none.");
  process.exit(1);
}

const identity = {
  _comment: "The values `python tools/verify_release.py` tells you to compare. Generated from " +
    "the signed provenance manifest; never typed by hand.",
  version: manifest.version,
  archive_sha256: manifest.package_sha256,
  release_key_id: keyId,
  files: manifest.files ? Object.keys(manifest.files).length : undefined,
};

const out = join(root, "public", "verify.json");
const next = JSON.stringify(identity, null, 2) + "\n";
const current = existsSync(out) ? readFileSync(out, "utf8") : "";

if (check) {
  if (current !== next) {
    console.error("FAIL: public/verify.json does not describe the current release.\n" +
      `  published: ${JSON.parse(current || "{}").version ?? "(none)"} / ` +
      `${(JSON.parse(current || "{}").archive_sha256 ?? "").slice(0, 16)}\n` +
      `  artifact : ${identity.version} / ${identity.archive_sha256.slice(0, 16)}\n` +
      "The shipped verifier tells customers to compare against this. A stale value here does not " +
      "fail safe: it disagrees with a genuine download and tells the customer their bytes are wrong.\n" +
      "  fix: node scripts/sync-release-identity.mjs --agent " + agentArg);
    process.exit(1);
  }
  console.log(`verify.json is current: ${identity.version} ${identity.archive_sha256.slice(0, 16)} ` +
    `key ${identity.release_key_id}`);
  process.exit(0);
}

writeFileSync(out, next, "utf8");
console.log(`wrote public/verify.json  version=${identity.version} ` +
  `sha256=${identity.archive_sha256.slice(0, 16)}... key=${identity.release_key_id}`);
console.log(`  read from ${manifestPath}`);
