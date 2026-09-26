#!/usr/bin/env node
/**
 * Evict URLs from the bugit.dev edge cache -- and PROVE the eviction happened.
 *
 *   npm run purge -- https://bugit.dev/public/docs/guide.pdf [more urls...]
 *   npm run purge -- --everything
 *   npm run purge -- --check https://bugit.dev/server.js     (measure only, purge nothing)
 *   node scripts/purge-cache.mjs --self-test                    (the verdict over inert records)
 *
 * WHY THIS EXISTS. For three weeks this repository's notes recorded that the estate could
 * publish but not evict, and that a stale asset therefore had only two remedies: wait for the
 * TTL, or ask the owner to purge from the dashboard. That was measured once, against the stored
 * `wrangler login` OAuth, whose 29 scopes contain nothing resembling cache purge -- and then
 * generalised to "no credential here can purge", which was never true of the API token in
 * .env.deploy.local. A capability the tools believe they lack is a capability nobody uses:
 * on 2026-08-07 five superseded guides sat at the edge for hours behind exactly that belief.
 *
 * WHY IT VERIFIES RATHER THAN REPORTS. `POST /purge_cache` answering 200 means Cloudflare
 * ACCEPTED the request. It does not mean the object is gone. On 2026-08-29 this exact call
 * returned 200 four times, including a purge_everything, while https://bugit.dev/server.js went
 * on answering 200 -- because that object is held ABOVE the zone cache, where zone purge does
 * not reach, and every request came back MISS carrying an Age of 34 hours. A purge that reports
 * the API's answer instead of the URL's answer would have called that a fix four times over.
 * So: purge, let it propagate, then re-probe, and say plainly which URLs actually changed.
 *
 * SECRET HYGIENE. The token is read from a gitignored env file BY THIS PROCESS and used only in
 * an Authorization header to Cloudflare. It is never printed, never interpolated into a URL or a
 * shell command, never passed in argv. Only its source, length and an 8-char fingerprint are
 * ever shown -- enough to tell two copies apart, never enough to be one.
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.cloudflare.com/client/v4";
const ZONE_NAME = "bugit.dev";

/* ------------------------------------------------------------------ the credential
 * Searched in the order that puts the most explicit source first. The portal's file is the one
 * that actually holds it today.
 *
 * THE SIBLING PATH IS NOT ENOUGH ON ITS OWN. `../bugit-portal` assumes this checkout sits
 * beside the portal in the workspace, which is true of the live tree and false of every git
 * worktree -- and a worktree is where an urgent purge gets run from, because that is where the
 * fix was just built. On 2026-09-21 this reported "No Cloudflare API token found" while the
 * token sat exactly where it has always sat, and the run was a purge of three files the edge
 * was serving with an ambiguous cache header. That is the failure already recorded against
 * env-status.mjs, repeated: a path mistake rendered as an ABSENT, so "I looked in the wrong
 * place" and "the value does not exist" printed the same word, and the stronger one was
 * reported.
 *
 * SO ASK GIT WHERE THE MAIN CHECKOUT IS. A worktree does not know, but git does:
 * `rev-parse --git-common-dir` resolves to the ORIGINAL repository's .git even from a linked
 * worktree, and the portal sits beside that. The first attempt at this fix pasted an absolute
 * path from one machine instead, and check-ci-coverage.mjs rejected it on the same run for the
 * reason it exists: this repository is public, and a path inside one person's home directory
 * only ever works for that person. */
function mainCheckoutSibling(name, file) {
  try {
    const common = execFileSync(
      "git",
      ["-C", ROOT, "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    // .../bugit-website/.git -> .../bugit-website -> .../<workspace>/<name>/<file>
    return common ? join(dirname(common), "..", name, file) : null;
  } catch {
    return null; // no git, or not a checkout: the other sources still apply
  }
}

/* A null PATH means "the process environment" to the reader below, so a lookup that failed to
 * resolve must be dropped rather than passed along as one -- otherwise a missing git would
 * silently re-read the environment under a label claiming it read a file. */
/* Built on first use, not at import: even LOCATING the credential files (the git call above) is
 * credential discovery, and --check must do none of it (CR-08-F26). */
const credentialSources = () => [
  ["process env", null],
  [".env.deploy.local", join(ROOT, ".env.deploy.local")],
  ["../bugit-portal/.env.deploy.local", join(ROOT, "..", "bugit-portal", ".env.deploy.local")],
  ["<main checkout>/../bugit-portal/.env.deploy.local", mainCheckoutSibling("bugit-portal", ".env.deploy.local")],
].filter(([label, p]) => label === "process env" || p !== null);
const NAMES = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_TOKEN_PURGE", "CLOUDFLARE_TOKEN_DEPLOY"];

function findToken() {
  // A tripwire, not a courtesy. --check branches before this is ever reached; if a later edit
  // moves a credential read above that branch, the inspection fails loudly instead of quietly
  // growing a secret prerequisite again.
  if (CHECK_ONLY) throw new Error("--check reached credential discovery; it must never need a credential");
  for (const [label, path] of credentialSources()) {
    if (path === null) {
      for (const n of NAMES) if (process.env[n]) return { label: `${label}:${n}`, value: process.env[n] };
      continue;
    }
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const n of NAMES) {
      const m = new RegExp("^\\s*(?:export\\s+)?" + n + "\\s*=\\s*(.*)$", "m").exec(text);
      const v = m?.[1]?.trim().replace(/^["']|["']$/g, "");
      if (v) return { label: `${label}:${n}`, value: v };
    }
  }
  return null;
}

const fp = (v) => createHash("sha256").update("bugit-env-fingerprint-v1:").update(v).digest("hex").slice(0, 8);

/* ------------------------------------------------------------------ arguments */
const argv = process.argv.slice(2);
const EVERYTHING = argv.includes("--everything");
const CHECK_ONLY = argv.includes("--check");
const SELF_TEST = argv.includes("--self-test");
const urls = argv.filter((a) => !a.startsWith("--"));

if (!EVERYTHING && !urls.length && !SELF_TEST) {
  console.error("usage: npm run purge -- <url> [url...]   |   --everything   |   --check <url>");
  process.exit(2);
}
for (const u of urls) {
  if (!/^https:\/\/(www\.)?bugit\.dev\//.test(u)) {
    // Purging is scoped to the zone this token holds. A URL from anywhere else is a mistake
    // worth stopping on rather than a request Cloudflare will silently ignore.
    console.error(`refusing ${u}: not a https://bugit.dev/ URL`);
    process.exit(2);
  }
}

/* ------------------------------------------------------------------ probing
 * Status FIRST, then bytes. A 404 body hashes just as happily as a real one, and reading the
 * body before the status is how a missing file once passed as a delivered one. */
/* Every record carries a KIND, because "the request failed" and "the URL answered" are different
 * facts (CR-08-F27). A transport error used to be status 0 with an empty digest, which differs
 * from any real answer, so a successful BEFORE followed by a dead socket AFTER counted as
 * "CHANGED" and the run ended "evicted, verified at the edge". Now:
 *   observed     -- the origin answered with a status below 500 (200, a redirect, a 404 or 410)
 *   server-error -- it answered 5xx: something is wrong, nothing about the cache is learned
 *   unreachable  -- no answer at all (DNS, reset, timeout)
 * Only two OBSERVED records can be compared. */
const PROBE_TIMEOUT_MS = 30000;
const kindOf = (p) => (p.status === 0 ? "unreachable" : p.status >= 500 ? "server-error" : "observed");
async function probe(url) {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "bugit-purge-check" },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const body = res.status === 200 ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
    return {
      status: res.status,
      cache: res.headers.get("cf-cache-status") || "-",
      age: res.headers.get("age") || "-",
      bytes: body.length,
      sha: body.length ? createHash("sha256").update(body).digest("hex").slice(0, 12) : "-",
    };
  } catch (e) {
    return { status: 0, cache: "-", age: "-", bytes: 0, sha: "-", error: String(e.message || e) };
  }
}

const fmt = (p) => p.status === 0
  ? `UNREACHABLE  ${p.error}`
  : `HTTP ${p.status}  cf-cache:${p.cache}  age:${p.age}  ${p.bytes} bytes  ${p.sha}` +
    (kindOf(p) === "server-error" ? "  <- SERVER ERROR, not an observation of the cache" : "");

/* The post-purge verdict for one URL, as a pure function of its BEFORE and AFTER records, so the
 * self-test below can hold it to inert fixtures without purging anything. Only an OBSERVED after
 * can clear a URL, and only an observed pair can differ: a before that was observed and an after
 * that failed is the exact pair that used to read as "CHANGED". */
function judge(b, a) {
  const afterSeen = kindOf(a) === "observed";
  const changed = afterSeen && kindOf(b) === "observed" && (a.status !== b.status || a.sha !== b.sha);
  const age = a.age === "-" ? null : Number(a.age);
  const freshMiss = afterSeen && a.cache === "MISS" && (age === null || age <= 60);
  const staleMiss = afterSeen && a.cache === "MISS" && age !== null && age > 60;
  let verdict;
  if (!afterSeen) verdict = `UNVERIFIED -- the re-probe was ${kindOf(a)}; nothing is known about this URL`;
  else if (changed) verdict = "CHANGED -- the URL now serves something different";
  else if (freshMiss) verdict = "EVICTED -- refetched from origin; same bytes, which is correct";
  else if (staleMiss) verdict = "NOT EVICTED -- served from ABOVE the zone cache";
  else verdict = `NOT EVICTED -- still ${a.cache}`;
  return { cleared: changed || freshMiss, staleMiss, verdict };
}

/* --self-test: no network, no credential, no purge. Each row is a before/after pair and whether
 * it may count as evicted. The first two rows are the pairs the old `changed` accepted. */
if (SELF_TEST) {
  const ok200 = { status: 200, cache: "HIT", age: "3000", bytes: 10, sha: "aaaaaaaaaaaa" };
  const rows = [
    ["200 HIT, then a transport error", ok200, { status: 0, cache: "-", age: "-", bytes: 0, sha: "-", error: "ECONNRESET" }, false],
    ["200 HIT, then HTTP 503", ok200, { status: 503, cache: "-", age: "-", bytes: 0, sha: "-" }, false],
    ["200 HIT, then the same bytes still HIT", ok200, { ...ok200 }, false],
    ["200 HIT, then a MISS already 34h old", ok200, { ...ok200, cache: "MISS", age: "124511" }, false],
    ["unreachable before, then 200 HIT", { status: 0, cache: "-", age: "-", bytes: 0, sha: "-" }, { ...ok200 }, false],
    ["200, then 404 (a removed file)", ok200, { status: 404, cache: "-", age: "-", bytes: 0, sha: "-" }, true],
    ["200, then new bytes", ok200, { ...ok200, cache: "MISS", age: "0", sha: "bbbbbbbbbbbb" }, true],
    ["200, then the same bytes on a fresh MISS", ok200, { ...ok200, cache: "MISS", age: "-" }, true],
  ];
  let bad = 0;
  for (const [what, b, a, want] of rows) {
    const got = judge(b, a).cleared;
    console.log(`  ${got === want ? "ok  " : "FAIL"}  ${what}: ${got ? "counts as evicted" : "not evicted"}`);
    if (got !== want) bad++;
  }
  console.log(bad ? `\npurge-cache self-test: ${bad} FAILED` : "\npurge-cache self-test: OK");
  process.exit(bad ? 1 : 0);
}

/* ------------------------------------------------------------------ --check
 * A PUBLIC INSPECTION NEEDS NO CREDENTIAL (CR-08-F26). This branch used to sit after findToken()
 * and an authenticated `zones?name=` query, so measuring public URLs read a deploy token (from
 * a SIBLING repository's env file if need be) and contacted the Cloudflare account, and on a
 * clean reviewer machine it failed with "No Cloudflare API token found" before measuring
 * anything. It also exited 0 when every probe had failed. It now runs first, touches only the
 * public URLs it was given, and exits non-zero when any of them could not be observed. */
if (CHECK_ONLY) {
  if (!urls.length) {
    console.error("--check needs at least one https://bugit.dev/ URL to measure");
    process.exit(2);
  }
  let unobserved = 0;
  for (const u of urls) {
    const p = await probe(u);
    if (kindOf(p) !== "observed") unobserved++;
    console.log(`now     ${u}\n        ${fmt(p)}`);
  }
  console.log("");
  if (unobserved) {
    console.log(`--check: nothing purged. ${unobserved} of ${urls.length} URL(s) could NOT be observed; this is not a measurement of them.`);
    process.exit(1);
  }
  console.log("--check: nothing purged. No credential was read and the Cloudflare API was not contacted.");
  process.exit(0);
}

/* ------------------------------------------------------------------ run */
const cred = findToken();
if (!cred) {
  console.error("No Cloudflare API token found. Looked for " + NAMES.join(", ") +
    " in the process env, ./.env.deploy.local and ../bugit-portal/.env.deploy.local.\n" +
    "NOTE: the stored `wrangler login` CANNOT purge -- its scopes include pages:write but " +
    "nothing for cache. Deploying and purging need different credentials.");
  process.exit(1);
}
console.log(`credential: ${cred.label}  (len ${cred.value.length}, fp ${fp(cred.value)})\n`);

const cf = async (path, init = {}) => {
  const res = await fetch(`${API}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${cred.value}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, ok: res.ok, body };
};
const errs = (b) => (b?.errors || []).map((e) => `${e.code}: ${e.message}`).join("; ") || "(no detail)";

const zr = await cf(`zones?name=${ZONE_NAME}`);
const zoneId = zr.body?.result?.[0]?.id;
if (!zoneId) {
  console.error(`cannot resolve the ${ZONE_NAME} zone: HTTP ${zr.status} ${errs(zr.body)}`);
  process.exit(1);
}

// BEFORE. Without this the "after" measurement has nothing to be different from.
const before = new Map();
for (const u of urls) {
  const p = await probe(u);
  before.set(u, p);
  console.log(`before  ${u}\n        ${fmt(p)}`);
}
if (urls.length) console.log("");

const payload = EVERYTHING ? { purge_everything: true } : { files: urls };
const res = await cf(`zones/${zoneId}/purge_cache`, { method: "POST", body: JSON.stringify(payload) });
// Cloudflare's envelope carries its own verdict. An HTTP 200 whose JSON says success:false, or
// that is not JSON at all, is not an accepted purge.
if (!res.ok || res.body?.success !== true) {
  console.error(`purge REFUSED: HTTP ${res.status} success=${res.body?.success} ${errs(res.body)}`);
  if (res.status === 401 || res.status === 403) {
    console.error("This credential cannot purge. It needs Zone > Cache Purge on bugit.dev.");
  }
  process.exit(1);
}
console.log(EVERYTHING ? "purge_everything accepted by Cloudflare" : `purge accepted by Cloudflare for ${urls.length} url(s)`);

// --everything with URLs used to skip verifying the URLs it had been given. Only a run with no
// URL at all has nothing to verify, and it says so rather than claiming an eviction.
if (!urls.length) {
  console.log("ACCEPTED, NOT VERIFIED: nothing to verify by URL. Re-run with explicit URLs to prove an eviction.");
  process.exit(0);
}

// Propagation is not instant, and a request issued too early re-populates the entry it was
// meant to evict -- which is exactly how this was misdiagnosed for an hour. Wait, then look once.
const WAIT_MS = 20000;
console.log(`\nwaiting ${WAIT_MS / 1000}s for propagation, then re-probing once each...\n`);
await new Promise((r) => setTimeout(r, WAIT_MS));

/* Two different questions, and conflating them makes this tool useless in one of the two cases
 * it exists for:
 *   1. did what the URL SERVES change?  -- the stale-guide and removed-file case
 *   2. was the cache ENTRY evicted?     -- the routine refresh, where the new bytes are
 *                                          identical and nothing about the response differs
 *                                          except that the edge had to go and get it
 * Judging only by (1) would report a perfectly successful refresh as a failure, and a tool that
 * cries wolf on its ordinary path is one nobody reads on the day it is right. */
const failed = [];
for (const u of urls) {
  const b = before.get(u);
  const a = await probe(u);
  const { cleared, staleMiss, verdict } = judge(b, a);

  console.log(`after   ${u}\n        ${fmt(a)}\n        ${verdict}`);
  if (staleMiss) {
    // The signature that says the object is not in the layer this API can clear. Seen on
    // 2026-08-29: /server.js answered MISS with age 124511 after four accepted purges.
    console.log(`        A MISS carrying age ${a.age}s is the tell: the response came from a layer`);
    console.log(`        ABOVE the zone cache, which purge_cache does not reach. It leaves when`);
    console.log(`        its own TTL expires, or when the origin stops being asked for that path.`);
  }
  if (!cleared) failed.push(u);
}

console.log("");
if (failed.length) {
  console.log(`${failed.length} of ${urls.length} URL(s) were NOT evicted or could not be verified. Cloudflare ` +
    `accepted the purge; the edge did not show it. Do not record these as purged:`);
  for (const u of failed) console.log(`  - ${u}`);
  process.exit(1);
}
console.log(`All ${urls.length} URL(s) evicted. Verified at the edge, not merely requested.`);
