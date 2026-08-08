/**
 * GENERATED FILE — do not hand-edit.
 *
 * Source: 03-brand-logo-assets/taskivator-brand-source-of-truth/src/check-brand-sync.mjs
 * Distributed to each consumer by sync.mjs, and listed in that consumer's own
 * SYNC-RECEIPT.json — so editing this copy makes the check fail on itself, which
 * is the point. A drift detector that is hand-copied into two repositories is
 * the exact thing it exists to catch.
 *
 *   node scripts/check-brand-sync.mjs
 *
 * WHY THIS EXISTS
 *
 * The brand source of truth lives outside every consumer repository, and outside
 * git. CI in a consumer therefore cannot regenerate the assets to compare against
 * them — which is precisely why brand drift kept going unnoticed. Two failures in
 * a row were silent:
 *
 *   - build.mjs resolved sharp through a path the folder reorganisation had
 *     deleted. The build could not start at all, and nobody noticed, because
 *     dist/ is committed and therefore still looked healthy.
 *   - sync.mjs mkdir'd two pre-reorg consumer paths that no longer existed,
 *     copied the whole bundle into them, and printed success. The real apps kept
 *     serving the branding they already had.
 *
 * Both times the pipeline reported that it had done its job. So this check does
 * not trust the pipeline's report. sync.mjs writes a receipt of what it wrote and
 * the hash of each file; this re-hashes those files here, now, in the tree that
 * is actually being built. A mismatch means one of two things, and the message
 * says which:
 *
 *   - a generated file was hand-edited, or
 *   - the assets were rebuilt and the sync was never re-run.
 *
 * Files that land OUTSIDE the shared asset folder deserve the most attention and
 * are named individually in the output. In the portal those are the icons Next
 * serves by file convention from app/ — app/icon.svg, app/favicon.ico,
 * app/apple-icon.png — which nobody thinks of as living in "the brand folder",
 * which makes them the easiest to edit by hand and the least likely to be
 * noticed when they drift. favicon.ico was in fact hand-made from a different
 * source than everything else for most of this product's life.
 *
 * WHAT IS COMPARED, AND WHY
 *
 * Text is compared with CR stripped. git checks these files out CRLF on Windows
 * and LF on Linux; hashing raw bytes would make this check red on one platform
 * and green on the other, and a check that is red for a reason nobody can act on
 * is a check that gets switched off.
 *
 * Binary IS hashed raw, and that is a deliberate choice with a known cost:
 * upgrading sharp can re-encode a PNG to the same pixels with a different
 * deflate window and trip this check. That happened on the very first run — the
 * committed favicon-16/32/48.png differed from a rebuild in six bytes of the
 * IDAT stream (zlib header 78da -> 38cb, a smaller window for a small image)
 * while the decoded pixels hashed identically. Comparing decoded pixels instead
 * would have hidden that, and would also hide a file that decodes the same but
 * serves different bytes. The question this answers is "did these exact files
 * come from the pipeline", so the honest comparison is the bytes, and the remedy
 * for an encoder upgrade is the same single line as for any other drift.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECEIPT_REL = path.join("public", "brand", "SYNC-RECEIPT.json");
const RECEIPT = path.join(repo, RECEIPT_REL);

const REBUILD =
  "  cd 03-brand-logo-assets/taskivator-brand-source-of-truth\n" +
  "  node build.mjs && node sync.mjs\n";

const TEXT = new Set([".svg", ".css", ".tsx", ".mjs", ".js", ".json", ".txt", ".md"]);
function brandHash(file) {
  const buf = fs.readFileSync(file);
  const body = TEXT.has(path.extname(file).toLowerCase())
    ? Buffer.from(buf.toString("utf8").replace(/\r/g, ""), "utf8")
    : buf;
  return crypto.createHash("sha256").update(body).digest("hex");
}

if (!fs.existsSync(RECEIPT)) {
  // Not "no receipt, nothing to check". A missing receipt means the brand sync
  // has never run against this tree, which is the exact state both silent
  // failures left behind.
  console.error(
    `No brand sync receipt at ${RECEIPT_REL.replace(/\\/g, "/")}.\n\n` +
    `The brand assets in this repo are unverifiable. Re-run the pipeline:\n${REBUILD}`,
  );
  process.exit(1);
}

const receipt = JSON.parse(fs.readFileSync(RECEIPT, "utf8"));
const entries = Object.entries(receipt.files || {});
if (entries.length === 0) {
  console.error(`${RECEIPT_REL.replace(/\\/g, "/")} lists no files. Re-run sync.mjs.`);
  process.exit(1);
}

const missing = [];
const drifted = [];
for (const [rel, expected] of entries) {
  const abs = path.join(repo, rel);
  if (!fs.existsSync(abs)) { missing.push(rel); continue; }
  const actual = brandHash(abs);
  if (actual !== expected) drifted.push({ rel, expected, actual });
}

if (missing.length || drifted.length) {
  console.error("Brand assets do not match the brand pipeline.\n");
  for (const rel of missing) console.error(`  MISSING  ${rel}`);
  for (const d of drifted) {
    console.error(`  DRIFTED  ${d.rel}`);
    console.error(`             expected ${d.expected.slice(0, 16)}…  found ${d.actual.slice(0, 16)}…`);
  }
  console.error(
    `\nEither a generated file was hand-edited, or the assets were rebuilt and\n` +
    `the sync never re-run. Do NOT fix this by editing the file here — it is\n` +
    `generated, and the next sync overwrites it. Fix the source, then:\n${REBUILD}`,
  );
  process.exit(1);
}

// Name the files that live outside the shared asset folder. A check that only
// ever prints a count gives no sign it is covering them.
const outside = entries.map(([r]) => r).filter((r) => !r.startsWith("public/brand/"));
console.log(`Brand assets match the pipeline: ${entries.length} files verified.`);
console.log(`  outside public/brand: ${outside.join(", ") || "(none)"}`);
