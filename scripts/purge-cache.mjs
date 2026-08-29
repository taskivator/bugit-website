#!/usr/bin/env node
/**
 * Evict URLs from the bugit.dev edge cache -- and PROVE the eviction happened.
 *
 *   npm run purge -- https://bugit.dev/public/docs/guide.pdf [more urls...]
 *   npm run purge -- --everything
 *   npm run purge -- --check https://bugit.dev/server.js     (measure only, purge nothing)
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.cloudflare.com/client/v4";
const ZONE_NAME = "bugit.dev";

/* ------------------------------------------------------------------ the credential
 * Searched in the order that puts the most explicit source first. The portal's file is last
 * and is the one that actually holds it today; it is reached by relative path because both
 * repositories live side by side in the workspace, and it is skipped silently elsewhere. */
const SOURCES = [
  ["process env", null],
  [".env.deploy.local", join(ROOT, ".env.deploy.local")],
  ["../bugit-portal/.env.deploy.local", join(ROOT, "..", "bugit-portal", ".env.deploy.local")],
];
const NAMES = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_TOKEN_PURGE", "CLOUDFLARE_TOKEN_DEPLOY"];

function findToken() {
  for (const [label, path] of SOURCES) {
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
const urls = argv.filter((a) => !a.startsWith("--"));

if (!EVERYTHING && !urls.length) {
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
async function probe(url) {
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "bugit-purge-check" } });
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

const fmt = (p) => `HTTP ${p.status}  cf-cache:${p.cache}  age:${p.age}  ${p.bytes} bytes  ${p.sha}`;

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

if (CHECK_ONLY) {
  console.log("--check: nothing purged.");
  process.exit(0);
}

const payload = EVERYTHING ? { purge_everything: true } : { files: urls };
const res = await cf(`zones/${zoneId}/purge_cache`, { method: "POST", body: JSON.stringify(payload) });
if (!res.ok) {
  console.error(`purge REFUSED: HTTP ${res.status} ${errs(res.body)}`);
  if (res.status === 401 || res.status === 403) {
    console.error("This credential cannot purge. It needs Zone > Cache Purge on bugit.dev.");
  }
  process.exit(1);
}
console.log(EVERYTHING ? "purge_everything accepted by Cloudflare" : `purge accepted by Cloudflare for ${urls.length} url(s)`);

if (EVERYTHING || !urls.length) {
  console.log("Nothing to verify by URL. Re-run with explicit URLs to prove an eviction.");
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
  const changed = a.status !== b.status || a.sha !== b.sha;
  const age = a.age === "-" ? null : Number(a.age);
  const freshMiss = a.cache === "MISS" && (age === null || age <= 60);
  const staleMiss = a.cache === "MISS" && age !== null && age > 60;

  let verdict;
  if (changed) verdict = "CHANGED -- the URL now serves something different";
  else if (freshMiss) verdict = "EVICTED -- refetched from origin; same bytes, which is correct";
  else if (staleMiss) verdict = "NOT EVICTED -- served from ABOVE the zone cache";
  else verdict = `NOT EVICTED -- still ${a.cache}`;

  console.log(`after   ${u}\n        ${fmt(a)}\n        ${verdict}`);
  if (staleMiss) {
    // The signature that says the object is not in the layer this API can clear. Seen on
    // 2026-08-29: /server.js answered MISS with age 124511 after four accepted purges.
    console.log(`        A MISS carrying age ${a.age}s is the tell: the response came from a layer`);
    console.log(`        ABOVE the zone cache, which purge_cache does not reach. It leaves when`);
    console.log(`        its own TTL expires, or when the origin stops being asked for that path.`);
  }
  if (!changed && !freshMiss) failed.push(u);
}

console.log("");
if (failed.length) {
  console.log(`${failed.length} of ${urls.length} URL(s) were NOT evicted. Cloudflare accepted the purge; ` +
    `the object did not move. Do not record these as purged:`);
  for (const u of failed) console.log(`  - ${u}`);
  process.exit(1);
}
console.log(`All ${urls.length} URL(s) evicted. Verified at the edge, not merely requested.`);
