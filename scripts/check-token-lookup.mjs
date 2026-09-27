#!/usr/bin/env node
/**
 * THE CLOUDFLARE TOKEN IS FOUND IN ONE PLACE, AND IT IS FOUND FROM A WORKTREE.
 *
 * Three times a website script said the token was missing when it was not, each time because it
 * was run from a git worktree, where `../bugit-portal` does not exist. The second time the fix
 * reached one of the two copies of the search; the third time (the 1.4.3 release deploy,
 * 2026-09-27) the other copy refused the deploy. So:
 *
 *   1. ONE COPY. No script under scripts/ other than lib/cloudflare-token.mjs may name the deploy
 *      env file as a path it reads. A second copy is how a fix reaches half the callers.
 *   2. FROM A REAL WORKTREE. A throwaway workspace is built with a website repository, a sibling
 *      bugit-portal holding a FAKE token, and a linked worktree placed OUTSIDE that workspace,
 *      which is where a scratchpad worktree lives. The lookup must find the token from the
 *      worktree, and must find nothing once the file is gone (the control).
 *
 * Nothing here reads a real credential: the token is fabricated, and the process environment's
 * token names are cleared before the lookup runs.
 *
 *   node scripts/check-token-lookup.mjs
 */
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { findCloudflareToken } from "./lib/cloudflare-token.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = join(ROOT, "scripts");
const LIB = join(SCRIPTS, "lib", "cloudflare-token.mjs");
const NAMES = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_TOKEN_DEPLOY", "CLOUDFLARE_TOKEN_PURGE"];

let failed = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => { failed++; console.error(`  FAIL  ${m}`); };

// ----------------------------------------------------------------- 1. one copy
// A path argument naming the file: `join(..., ".env.deploy.local")` or a bare literal passed to a
// reader. Prose that merely mentions the file inside a longer message is not a read.
const READS_THE_FILE = /[,(]\s*["'`]\.env\.deploy\.local["'`]/;
function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(mjs|js|cjs)$/.test(e)) acc.push(p);
  }
  return acc;
}
const copies = walk(SCRIPTS).filter((p) => p !== LIB && p !== fileURLToPath(import.meta.url))
  .filter((p) => READS_THE_FILE.test(readFileSync(p, "utf8")));
if (copies.length) {
  bad("these scripts search for the deploy env file themselves; use lib/cloudflare-token.mjs:\n        "
      + copies.map((p) => relative(ROOT, p)).join("\n        "));
} else {
  ok("only lib/cloudflare-token.mjs names the deploy env file as a path to read");
}
// The rule must be able to fire: the library itself carries the shape it forbids elsewhere.
if (!READS_THE_FILE.test(readFileSync(LIB, "utf8").replace("const FILE = \".env.deploy.local\";",
    "join(root, \".env.deploy.local\")"))) {
  bad("the one-copy rule matches nothing, so it proves nothing");
}

// ----------------------------------------------------------------- 2. from a real worktree
const git = (cwd, ...args) => execFileSync("git", ["-C", cwd, ...args],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const saved = Object.fromEntries(NAMES.map((n) => [n, process.env[n]]));
for (const n of NAMES) delete process.env[n];
const tmp = mkdtempSync(join(tmpdir(), "token-lookup-"));
try {
  const workspace = join(tmp, "workspace");
  const site = join(workspace, "bugit-website");
  const portal = join(workspace, "bugit-portal");
  const outside = join(tmp, "elsewhere", "wt-site");        // a scratchpad-style worktree
  mkdirSync(site, { recursive: true });
  mkdirSync(portal, { recursive: true });
  mkdirSync(dirname(outside), { recursive: true });
  git(site, "init", "-q");
  writeFileSync(join(site, "README"), "x\n");
  git(site, "add", "README");
  git(site, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "-m", "x");
  git(site, "worktree", "add", "-q", "-b", "wt", outside);
  const FAKE = "fabricated-not-a-token-" + "0".repeat(16);
  const envFile = join(portal, ".env.deploy.local");
  writeFileSync(envFile, `CLOUDFLARE_API_TOKEN=${FAKE}\n`);

  const fromMain = findCloudflareToken(site, NAMES);
  if (fromMain?.value === FAKE) ok("found from the main checkout");
  else bad("not found from the main checkout, where ../bugit-portal exists");

  const fromWorktree = findCloudflareToken(outside, NAMES);
  if (fromWorktree?.value === FAKE && fromWorktree.label.startsWith("<main checkout>")) {
    ok("found from a linked worktree outside the workspace, through git's main checkout");
  } else {
    bad("NOT found from a linked worktree outside the workspace: the defect that refused the "
        + "1.4.3 deploy");
  }

  rmSync(envFile);
  if (findCloudflareToken(outside, NAMES) === null) ok("CONTROL: with the file gone, nothing is found");
  else bad("CONTROL: a token was found after the file was removed, so the lookup reads something else");
} finally {
  for (const n of NAMES) if (saved[n] !== undefined) process.env[n] = saved[n];
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* a leftover temp folder holds only a fabricated value */
  }
}

if (failed) {
  console.error(`\ncheck-token-lookup: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\ncheck-token-lookup: the token is found in one place, and from a worktree");
