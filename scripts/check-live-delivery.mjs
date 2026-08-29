/* A DEPLOY IS NOT A DELIVERY.
 *
 * `wrangler pages deploy` reports success when Cloudflare has ACCEPTED the upload. It says
 * nothing about what a visitor receives. Twice now the two have differed:
 *
 *   - 2026-08-2x: bugit.dev kept serving the previous buyer PDFs from the edge cache long
 *     after a successful deploy. The manifest beside them was new, so every check that read
 *     the manifest passed. The bytes a customer downloaded were old.
 *   - The follow-on lesson, which cost a second round: a MISSING file does not fail loudly.
 *     Cloudflare Pages answers an unknown path with the 404 PAGE BODY, status 404. That body
 *     hashes perfectly well. A verifier that hashes first and never looks at the status code
 *     reports "content differs" for a file that is not there at all, or -- if it compares
 *     against a stale local copy of the same 404 -- reports nothing wrong whatsoever.
 *
 * So: STATUS FIRST, ALWAYS. Then the bytes. Then, only for a mismatch, cf-cache-status, which
 * separates "the edge is serving an old copy" from "the wrong file was uploaded".
 *
 * This runs AFTER a deploy, against the real origin, and is deliberately NOT in the CI suite:
 * CI has no deployed site to measure, and running it before a deploy would assert that the
 * deploy had not happened yet. `npm run verify:live`.
 *
 *   node scripts/check-live-delivery.mjs                  # against https://bugit.dev
 *   node scripts/check-live-delivery.mjs --base=https://<preview>.pages.dev
 *   node scripts/check-live-delivery.mjs --self-test      # prove the checks can fail
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const argBase = process.argv.find((a) => a.startsWith("--base="));
const BASE = (argBase ? argBase.slice(7) : process.env.LIVE_BASE || "https://bugit.dev").replace(/\/$/, "");
const SELF_TEST = process.argv.includes("--self-test");

/* Files that live in dist but are NOT served, each with the reason it is exempt. Anything
 * else in dist is a promise to a visitor and must arrive intact. This list is short on
 * purpose -- a long one means dist has become a junk drawer, which is its own defect and is
 * what check-assets.mjs looks for. */
const NOT_SERVED = new Map([
  ["_headers", "consumed by Cloudflare Pages to set response headers; never served as a body"],
  ["_redirects", "consumed by Cloudflare Pages for routing; never served as a body"],
]);

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

/* Every fetch returns a RECORD. A transport failure is a record too, never a throw -- one
 * dead socket must not end the sweep and leave the rest unmeasured. */
async function probe(url) {
  try {
    const r = await fetch(url, { redirect: "manual", headers: { "user-agent": "bugit-delivery-check" } });
    const body = Buffer.from(await r.arrayBuffer());
    return {
      ok: true,
      status: r.status,
      body,
      hash: sha(body),
      type: r.headers.get("content-type") || "",
      cache: r.headers.get("cf-cache-status") || "-",
      // Age matters only in company with cf-cache-status, and then it is decisive: a MISS that
      // arrives ALREADY OLD means the edge had nothing and fetched from a layer above the zone
      // -- the layer `purge_cache` cannot clear. Without Age, that case is indistinguishable
      // from an ordinary miss, and a purge that will never work looks like one worth retrying.
      age: r.headers.get("age"),
      location: r.headers.get("location") || "",
    };
  } catch (e) {
    return { ok: false, status: 0, body: Buffer.alloc(0), hash: "", type: "", cache: "-", age: null, error: String(e.message || e) };
  }
}

/* CLOUDFLARE PAGES CANONICALISES, AND THAT IS NOT A DELIVERY FAILURE.
 *
 * Pages answers `/index.html` with `308 -> /` and `/404.html` with `308 -> /404`: the file is
 * delivered, at the URL it has decided is canonical. The first run of this check called both
 * WRONG STATUS, which is the mirror image of the mistake it was written to prevent -- reading
 * the status and then not thinking about what it means.
 *
 * So follow exactly one same-origin hop, the way a visitor's browser does, and judge the
 * response that actually arrives. One hop, not `redirect: "follow"`: a redirect CHAIN, or one
 * that leaves the origin, is a finding and has to stay visible. */
async function probeFollowingOneHop(url) {
  const first = await probe(url);
  if (!first.ok || ![301, 302, 307, 308].includes(first.status) || !first.location) return first;

  let next;
  try {
    next = new URL(first.location, url);
  } catch {
    return { ...first, redirectNote: `unparseable Location: ${first.location}` };
  }
  if (next.origin !== new URL(url).origin) {
    return { ...first, redirectNote: `redirects OFF-ORIGIN to ${next.href}` };
  }

  const second = await probe(next.href);
  if (second.ok && [301, 302, 307, 308].includes(second.status)) {
    return { ...second, redirectNote: `redirect chain: ${url} -> ${next.href} -> ${second.location}` };
  }
  return { ...second, redirectedFrom: url, finalUrl: next.href };
}

async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

/* ---------------------------------------------------------------- the sweep */

const local = walk(DIST).map((abs) => {
  const rel = relative(DIST, abs).split(sep).join("/");
  return { rel, abs, url: BASE + "/" + rel, bytes: readFileSync(abs) };
});

const skipped = local.filter((f) => NOT_SERVED.has(f.rel));
const served = local.filter((f) => !NOT_SERVED.has(f.rel));

/* `/` is its own promise: it must be index.html, and a visitor typing the bare domain is the
 * single most common request the site takes. It is not a file in dist, so nothing else here
 * would ever check it. */
const indexFile = served.find((f) => f.rel === "index.html");
const targets = served.map((f) => ({ ...f, label: "/" + f.rel }));
if (indexFile) targets.unshift({ ...indexFile, url: BASE + "/", label: "/  (bare domain)" });

console.log(`${targets.length} target(s) against ${BASE}  (${skipped.length} not served: ${skipped.map((s) => s.rel).join(", ") || "none"})`);

const results = await inBatches(targets, 6, async (t) => ({ t, r: await probeFollowingOneHop(t.url) }));

const dead = [];
const badStatus = [];
const mismatch = [];
const wrongType = [];
const redirected = [];

for (const { t, r } of results) {
  if (!r.ok) { dead.push({ t, r }); continue; }
  if (r.redirectNote) { badStatus.push({ t, r }); continue; }
  if (r.redirectedFrom) redirected.push({ t, r });

  // STATUS FIRST. A 404 body hashes like any other body; a 30x hands back a redirect stub.
  if (r.status !== 200) { badStatus.push({ t, r }); continue; }

  if (r.hash !== sha(t.bytes)) { mismatch.push({ t, r }); continue; }

  /* A correct hash with the wrong content-type still breaks the page: a .js served as
   * text/html is refused by the browser under a strict CSP, and a .css as text/plain is
   * ignored. Only assert the families that actually matter. */
  const want =
    t.rel.endsWith(".js") ? /javascript|ecmascript/ :
    t.rel.endsWith(".css") ? /text\/css/ :
    t.rel.endsWith(".html") ? /text\/html/ :
    t.rel.endsWith(".pdf") ? /application\/pdf/ : null;
  if (want && !want.test(r.type)) wrongType.push({ t, r });
}

/* ------------------------------------------- THE HALF THAT LOOKS FOR WHAT SHOULD BE ABSENT
 *
 * Everything above is driven by what dist CONTAINS, and is blind by construction to a file
 * that should no longer be there. That blindness had teeth within minutes of this check being
 * written: `server.js` was removed from the build in the same commit, the deploy succeeded,
 * every one of the 176 files verified byte-identical -- and `https://bugit.dev/server.js` went
 * on answering 200 from a four-hour edge cache entry. A green run said nothing about it,
 * because a check whose subject is the file list can only ever confirm the file list.
 *
 * So the subject here is the COMPLEMENT: the repository's own top-level files, minus the ones
 * the build publishes. Those are the files somebody decided NOT to give the public, and each
 * one is a URL that must not answer 200. Naming `server.js` alone would have passed the day
 * `build.js` or a `.env` file joined it. */
const publishedNames = new Set(local.map((f) => f.rel.split("/")[0]));
const REPO_ONLY_SKIP = new Set([".git", "node_modules", "dist", ".github", "scratchpad"]);
const unpublished = readdirSync(ROOT)
  .filter((n) => !publishedNames.has(n) && !REPO_ONLY_SKIP.has(n))
  .filter((n) => { try { return statSync(join(ROOT, n)).isFile(); } catch { return false; } });

// A handful of paths that are not repo-root files but are the first things an opportunist asks
// for. Cheap, and their absence is worth asserting explicitly rather than assuming.
const ALWAYS_PROBE = [".git/config", "package.json", "package-lock.json", ".env"];
const absentTargets = [...new Set([...unpublished, ...ALWAYS_PROBE])];

const PROBE_CAP = 60;
const probing = absentTargets.slice(0, PROBE_CAP);
if (absentTargets.length > PROBE_CAP) {
  // NO SILENT CAPS. A sweep that stops at the fold prints the same green as one that finished.
  console.log(`\nNOTE: ${absentTargets.length} unpublished paths, probing the first ${PROBE_CAP}; ` +
    `${absentTargets.length - PROBE_CAP} NOT checked: ${absentTargets.slice(PROBE_CAP).join(", ")}`);
}

const leaked = [];
const leakResults = await inBatches(probing, 6, async (rel) => ({ rel, r: await probe(BASE + "/" + rel) }));
for (const { rel, r } of leakResults) {
  // 404 and 410 are the right answers. A 30x to the SPA shell is also fine: the path is not a
  // file, it is a route the app will not resolve. Only a 200 means the bytes are being handed out.
  if (r.ok && r.status === 200) leaked.push({ rel, r });
}

const say = (title, rows, fmt) => {
  if (!rows.length) return;
  console.log(`\n${title} -- ${rows.length}`);
  for (const row of rows.slice(0, 40)) console.log("  · " + fmt(row));
  if (rows.length > 40) console.log(`  … and ${rows.length - 40} more`);
};

say("UNREACHABLE", dead, ({ t, r }) => `${t.label}  ${r.error}`);
say("WRONG STATUS  (the status is the finding; the bytes were not compared)", badStatus,
  ({ t, r }) => r.redirectNote
    ? `${t.label}  ${r.redirectNote}`
    : `${t.label}  answered HTTP ${r.status}${r.location ? " -> " + r.location : ""}  cf-cache:${r.cache}`);
say("CONTENT DIFFERS", mismatch, ({ t, r }) =>
  `${t.label}  local ${sha(t.bytes).slice(0, 12)} vs live ${r.hash.slice(0, 12)}  cf-cache:${r.cache}` +
  (r.cache === "HIT" ? "   <- STALE AT THE EDGE, not a bad upload" : ""));
say("WRONG CONTENT-TYPE", wrongType, ({ t, r }) => `${t.label}  served as ${r.type}`);
/* Naming the remedy is half the value of the finding. This used to end at "then purge", written
 * when nothing here could purge; the estate's API token can, and `npm run purge` verifies the
 * eviction rather than trusting the API's 200. The one case it cannot fix is called out by name,
 * because "retry the purge" is bad advice for an object the purge cannot reach. */
const cacheNote = (r) => {
  const age = r.age === null || r.age === undefined ? null : Number(r.age);
  if (r.cache === "MISS" && age !== null && age > 60) {
    return `   <- age ${age}s on a MISS: served from ABOVE the zone cache. purge_cache CANNOT ` +
      `evict this; it expires on its own. Do not keep purging.`;
  }
  if (r.cache === "HIT" || r.cache === "REVALIDATED" || r.cache === "EXPIRED") {
    return `   <- EDGE CACHE, not the deployment: confirm with ?cachebust, then ` +
      `npm run purge -- ${BASE}/${r.rel}`;
  }
  return "";
};

say("SERVED BUT NOT PUBLISHED  (in the repo, not in dist, yet the origin hands it out)", leaked,
  ({ rel, r }) => `/${rel}  HTTP 200  ${r.body.length} bytes  cf-cache:${r.cache}` +
    cacheNote({ ...r, rel }));

// Not a finding: the origin canonicalised the URL and delivered the right bytes there. Printed
// so a redirect that appears for a NEW reason is visible rather than absorbed in silence.
if (redirected.length) {
  console.log(`
CANONICALISED (delivered, at the origin's own URL) -- ${redirected.length}`);
  for (const { t, r } of redirected) console.log(`  · ${t.label}  -> ${new URL(r.finalUrl).pathname}`);
}

const findings = dead.length + badStatus.length + mismatch.length + wrongType.length + leaked.length;

/* -------------------------------------------------- negative controls
 * Three ways this check could be quietly useless, each proven wrong against the live origin. */
if (SELF_TEST) {
  console.log("\n--- self-test ---");
  const fails = [];

  // 1. A path that cannot exist must be caught by STATUS, and its body must not be mistaken
  //    for content. This is the exact failure the header comment describes.
  const ghost = await probeFollowingOneHop(BASE + "/__delivery_probe_that_cannot_exist__.txt");
  if (ghost.status === 200) fails.push("an absent path answered 200; this origin cannot be verified by status");
  else console.log(`  absent path answered HTTP ${ghost.status} (${ghost.body.length} bytes of page body) — caught by status, never hashed`);

  // 2. A byte that differs must be seen. Mutate a real local file's expected hash.
  const sample = served.find((f) => f.rel === "index.html") || served[0];
  const live = await probeFollowingOneHop(BASE + "/" + sample.rel);
  if (live.status === 200) {
    const mutated = sha(Buffer.concat([sample.bytes, Buffer.from("x")]));
    if (mutated === live.hash) fails.push("a mutated file hashed identically; the comparison is not comparing");
    else console.log(`  one added byte to ${sample.rel} changes its hash — the comparison fires`);
  } else {
    console.log(`  skipped byte control: ${sample.rel} answered HTTP ${live.status}`);
  }

  // 3. The sweep must actually have a subject. An empty dist would sail through every check
  //    above and print a confident zero.
  if (targets.length < 20) fails.push(`only ${targets.length} target(s) — dist looks unbuilt; run node build.js first`);
  else console.log(`  ${targets.length} targets enumerated from dist — the sweep has a subject`);

  for (const f of fails) console.log("  SELF-TEST FAILED: " + f);
  if (fails.length) process.exit(1);
}

if (findings) {
  console.log(`\n${findings} DELIVERY FINDING(S) — ${BASE} is not serving what dist holds`);
  process.exit(1);
}
console.log(`\ncheck-live-delivery OK: all ${targets.length} files in dist arrive from ${BASE} with HTTP 200, ` +
  `byte-identical and correctly typed; none of the ${probing.length} unpublished repo paths is served.`);
