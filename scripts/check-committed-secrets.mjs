#!/usr/bin/env node
/**
 * Guard: no committed file matches a known credential shape.
 *
 * WHY THIS IS A SCRIPT AND NOT SIX LINES IN ci.yml, WHICH IS WHAT IT WAS.
 *
 * On 2026-09-23 `npm test` passed on the exact tree that was then pushed to main, and CI went
 * red on that commit. Both were correct. The full local suite ran 29 guards and none of them
 * was the secret scan, because the secret scan existed ONLY as an inline `run:` block in
 * ci.yml. scripts/check-ci-coverage.mjs already forbids the opposite drift -- a guard in
 * scripts/ that no CI step runs -- but it is directional, and an inline CI step with no local
 * counterpart is invisible to it. So a green `npm test` did not predict CI, and the way that
 * surfaced was a red main.
 *
 * Putting it here fixes that in both directions at once: `npm test` now runs it, and
 * check-ci-coverage now REQUIRES ci.yml to keep running it, because that is what it does to
 * every scripts/check-*.mjs.
 *
 * It also gives the pattern set ONE home. It used to be written out in full in ci.yml, and the
 * portal's copy had already drifted from it in two ways that mattered.
 *
 * TWO PROPERTIES THIS KEEPS, BOTH LEARNED THE HARD WAY:
 *
 *   It names FILES and never prints the matching TEXT. The version this replaces used
 *   `git grep -n` and said "see matches above", so the scan published the string it had just
 *   called a secret into the build log of a PUBLIC repository, where it is durable and
 *   world-readable.
 *
 *   It reads git grep's EXIT STATUS: 0 found, 1 nothing found, anything else could not run.
 *   The `if git grep ...; then` form it replaces treated 1 and 2 alike, so a scan that failed
 *   to run reported a clean tree.
 *
 * And it positive-controls itself. A scanner that reports zero is worth nothing until it has
 * been shown to report ONE, so before trusting a clean tree this plants a synthetic credential
 * in a temp file and requires the same git-grep machinery to find it.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* The credential shapes. Kept identical to the portal's list so the two repos cannot drift.
 * Every literal here is ASSEMBLED, never written whole: this file is scanned by the very
 * pattern it defines, and a fixture that trips its own guard is how CI went red on bd981cb. */
const PATTERN = [
  "sk_live_[0-9a-zA-Z]{20}",
  "sk-ant-api[0-9a-zA-Z_-]{20}",
  "-----BEGIN [A-Z ]*PRIVATE KEY-----",
  "sbp_[0-9a-f]{40}",
  "re_[0-9a-zA-Z]{24}",
].join("|");

function gitGrep(args, cwd) {
  try {
    const out = execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, out };
  } catch (e) {
    /* execFileSync throws for any non-zero exit. status 1 is the ordinary "nothing found". */
    if (typeof e.status === "number") return { status: e.status, out: String(e.stdout || ""), err: String(e.stderr || "") };
    return { status: -1, out: "", err: String(e.message || e) };
  }
}

/* ---- POSITIVE CONTROL -------------------------------------------------------------------
 * Plant a synthetic credential OUTSIDE the repository and require the same machinery to find
 * it. Outside, because a control file written inside a git tree is one forgotten cleanup away
 * from being committed -- which this guard would then report as a real finding forever. */
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bugit-secretscan-"));
const controlFile = path.join(tmpDir, "planted.txt");
try {
  fs.writeFileSync(controlFile, "token=" + "sk_live_" + "A1b2C3d4E5f6G7h8I9j0" + "\n", "utf8");
  /* Relative to cwd on purpose: `git grep --no-index` refuses an absolute path as "outside the
   * directory tree", which on Windows it reports for the temp dir it was just handed. */
  const control = gitGrep(["grep", "--no-index", "-lIE", PATTERN, "--", path.basename(controlFile)], tmpDir);
  if (control.status !== 0 || !control.out.trim()) {
    console.error(
      "FAIL: the committed-secret scan could not find a credential it planted itself.\n" +
      `      git grep exit=${control.status} ${control.err ? "stderr=" + control.err.trim() : ""}\n` +
      "      A clean result from this scanner would mean nothing, so it is not reporting one."
    );
    process.exit(1);
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/* ---- THE REAL SCAN ---------------------------------------------------------------------- */
const scan = gitGrep(["grep", "-lIE", PATTERN], ROOT);

if (scan.status === 0) {
  console.error("FAIL: potential committed secret detected. The file(s) are named below; the matching text is deliberately NOT printed.");
  for (const f of scan.out.split(/\r?\n/).filter(Boolean)) console.error("  - " + f);
  console.error("\nIf this is a synthetic test fixture, assemble the literal from two pieces so it is");
  console.error("not present in the file as one string -- do not exempt the path, which would carve a");
  console.error("hole in the scan to accommodate a test.");
  process.exit(1);
}

if (scan.status !== 1) {
  console.error(`FAIL: the committed-secret scan could not run (git grep exit ${scan.status}), so nothing was checked.`);
  if (scan.err) console.error("      " + scan.err.trim());
  process.exit(1);
}

console.log("check-committed-secrets OK: no tracked file matches a known credential shape (scanner positive-controlled against a planted secret).");
