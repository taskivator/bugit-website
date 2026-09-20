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
import { createHash, createPublicKey, verify as verifyEd25519 } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const check = argv.includes("--check");
const agentArg = argv[argv.indexOf("--agent") + 1];
const agent = resolve(root, agentArg && !agentArg.startsWith("--") ? agentArg : "../generic-qa-agent");

// THE SIGNATURE WAS SITTING UNREAD BESIDE THE FILE WE TRUSTED.
//
// "Read from the agent's SIGNED provenance manifest", above, described where the JSON came from
// and not what had been checked about it. Nothing opened `<pkg>.zip.manifest.sig`, and nothing
// hashed the `.zip` the manifest describes, so `package_sha256` was copied to a customer-facing
// URL on the strength of a filename ending in `.manifest.json`. A regenerated-but-unsigned
// manifest, or a stale sidecar left in release-staging, publishes a hash that does not match the
// bytes customers downloaded — and then the verifier we ship tells every honest buyer their
// genuine download is wrong. That is not hypothetical: on 2026-09-02 this file published 1.3.1's
// values while 1.3.2 shipped, which is why the header says a stale value here does not fail safe.
//
// So both halves are checked before anything is written: the manifest's own signature, against
// the same pinned key the shipped verifier uses, and the archive's hash, recomputed from the zip.

/** The bytes `<pkg>.manifest.sig` is computed over — see tools/verify_release.py. */
const CANONICAL_EXCLUDED = ["manifest_identity", "signature"];

/**
 * Python's `json.dumps(..., sort_keys=True, separators=(",", ":"), ensure_ascii=True)`.
 *
 * It has to match byte for byte or every signature fails, so: keys sorted at EVERY level (not
 * just the top, which is what a JSON.stringify replacer would give), no spaces, and non-ASCII
 * escaped the way ensure_ascii does it.
 */
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${canonicalJson(k)}:${canonicalJson(value[k])}`)
    .join(",")}}`;
}

function canonicalManifestBytes(manifest) {
  const trimmed = {};
  for (const [k, v] of Object.entries(manifest)) {
    if (!CANONICAL_EXCLUDED.includes(k)) trimmed[k] = v;
  }
  const ascii = canonicalJson(trimmed).replace(
    /[-￿]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  return Buffer.from(ascii, "utf8");
}

/** The 32-byte raw Ed25519 key as SPKI, which is the only form node's crypto accepts. */
function ed25519PublicKey(hex) {
  return createPublicKey({
    key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(hex, "hex")]),
    format: "der",
    type: "spki",
  });
}

/**
 * Check one candidate all the way through. Returns the manifest, or a reason it was rejected.
 *
 * A rejection is never silent: every candidate's verdict is printed, because "no manifest found"
 * and "the only manifest present does not verify" need very different responses from whoever ran
 * this, and the old code could not tell them apart.
 */
function verifyCandidate(manifestPath, pubkeyHex) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    return { ok: false, reason: `unreadable manifest: ${e.message}` };
  }

  const sigPath = `${manifestPath.slice(0, -".json".length)}.sig`;
  if (!existsSync(sigPath)) return { ok: false, reason: `no signature beside it (${sigPath})` };
  const sigHex = readFileSync(sigPath, "utf8").trim();
  if (!/^[0-9a-fA-F]{128}$/.test(sigHex)) {
    return { ok: false, reason: "the .manifest.sig is not a 64-byte hex signature" };
  }
  let signatureOk = false;
  try {
    signatureOk = verifyEd25519(
      null,
      canonicalManifestBytes(manifest),
      ed25519PublicKey(pubkeyHex),
      Buffer.from(sigHex, "hex"),
    );
  } catch (e) {
    return { ok: false, reason: `signature could not be checked: ${e.message}` };
  }
  if (!signatureOk) {
    return { ok: false, reason: "the manifest signature does not verify against the pinned key" };
  }

  // The signature proves the manifest. It says nothing about whether the zip beside it is the
  // one the manifest describes, and that zip is what the customer downloaded.
  const zipPath = manifestPath.slice(0, -".manifest.json".length);
  if (!existsSync(zipPath)) return { ok: false, reason: `the archive it describes is missing (${zipPath})` };
  const actual = createHash("sha256").update(readFileSync(zipPath)).digest("hex");
  if (actual.toLowerCase() !== String(manifest.package_sha256).toLowerCase()) {
    return {
      ok: false,
      reason:
        `the archive does not match its manifest (manifest ${String(manifest.package_sha256).slice(0, 16)}, ` +
        `zip ${actual.slice(0, 16)})`,
    };
  }
  return { ok: true, manifest, zipPath };
}

/**
 * The published artifact's VERIFIED manifest: staging first (frozen bytes), then dist.
 *
 * Selection is by the version INSIDE the manifest, not by a regex over the pathname. The old
 * `p.match(/(\d+)\.(\d+)\.(\d+)/)` read the whole path, so a directory named for some other
 * version decided which release the site advertised.
 */
function findManifest(pubkeyHex) {
  const places = [join(agent, "..", "release-staging"), join(agent, "dist")];
  const candidates = [];
  for (const dir of places) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".zip.manifest.json")) candidates.push(join(dir, name));
    }
  }
  if (!candidates.length) return { verified: [], rejected: [] };

  const verified = [];
  const rejected = [];
  for (const path of candidates) {
    const result = verifyCandidate(path, pubkeyHex);
    if (result.ok) verified.push({ path, manifest: result.manifest });
    else rejected.push({ path, reason: result.reason });
  }

  const ver = (m) => String(m.version ?? "").split(".").map(Number);
  verified.sort((a, b) => {
    const [A, B] = [ver(a.manifest), ver(b.manifest)];
    for (let i = 0; i < 3; i++) if ((A[i] ?? 0) !== (B[i] ?? 0)) return (B[i] ?? 0) - (A[i] ?? 0);
    return 0;
  });
  return { verified, rejected };
}

/**
 * The release key the shipped verifier pins. Read from the tool, so the two cannot disagree.
 *
 * It returns the WHOLE key now, not just the published id: the id is a label, and checking a
 * signature needs the key itself. Same source either way, so the published id still cannot drift
 * from the key that signs.
 */
function pinnedPubkeyFromVerifier() {
  const src = readFileSync(join(agent, "tools", "verify_release.py"), "utf8");
  const m = /_PINNED_RELEASE_PUBKEY\s*=\s*["']([0-9a-fA-F]{64})["']/.exec(src);
  return m ? m[1].toLowerCase() : null;
}

const pubkeyHex = pinnedPubkeyFromVerifier();
if (!pubkeyHex) {
  console.error("FAIL: could not read the pinned release key out of tools/verify_release.py, so " +
    "no signature here could be checked against anything. Publishing values this script could " +
    "not verify is what it exists to prevent.");
  process.exit(1);
}
const keyId = pubkeyHex.slice(0, 16).toLowerCase();

const { verified, rejected } = findManifest(pubkeyHex);
for (const r of rejected) {
  console.error(`REJECTED ${r.path}\n         ${r.reason}`);
}
if (!verified.length) {
  console.error(
    rejected.length
      ? "FAIL: every manifest beside the agent checkout failed verification (reasons above), so " +
          "there is nothing that may be published. This is the state a stale or unsigned sidecar " +
          "produces, and it used to be published anyway."
      : "FAIL: no signed manifest found beside the agent checkout, so there is nothing to " +
          "publish. Build and sign a release first.",
  );
  process.exit(1);
}
const manifestPath = verified[0].path;
const manifest = verified[0].manifest;
console.log(
  `verified ${manifestPath}\n  manifest signature OK against key ${keyId}, archive hash recomputed and matches`,
);

const identity = {
  _comment: "The values `python tools/verify_release.py` tells you to compare. Generated from " +
    "the signed provenance manifest; never typed by hand.",
  version: manifest.version,
  archive_sha256: manifest.package_sha256,
  release_key_id: keyId,
  files: manifest.files ? Object.keys(manifest.files).length : undefined,
};

// AT THE SITE ROOT, not under public/. build.js copies `public` as a directory, so a file
// written there is served at /public/verify.json -- and the shipped verifier and the audit
// note both name https://bugit.dev/verify.json. The first version of this wrote to public/
// and the URL 404ed; the CDN purge caught it because it checks the STATUS CODE first.
const out = join(root, "verify.json");
const next = JSON.stringify(identity, null, 2) + "\n";
const current = existsSync(out) ? readFileSync(out, "utf8") : "";

if (check) {
  /* COMPARED BY VALUE, NOT BY BYTES. This repo has no .gitattributes and core.autocrlf=true, so
     a Windows working tree holds verify.json with CRLF while this script writes LF, and the
     whole-file comparison then fails with every field identical. That is exactly how it read on
     2026-09-21: version, hash, key and file count all matched and it still called the release
     stale. On Linux CI the same tree passes, so the disagreement was invisible there. The subject
     of this check is the VALUES a customer compares against, and a line ending is not one. */
  const norm = (t) => t.split(String.fromCharCode(13)).join("");
  if (norm(current) !== norm(next)) {
    console.error("FAIL: verify.json does not describe the current release.\n" +
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
console.log(`wrote verify.json  version=${identity.version} ` +
  `sha256=${identity.archive_sha256.slice(0, 16)}... key=${identity.release_key_id}`);
console.log(`  read from ${manifestPath}`);
