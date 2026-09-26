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
 *   node scripts/check-live-delivery.mjs --base=http://127.0.0.1:<port> --dist=<dir>
 *                                                          # a local fixture origin and tree
 *
 * UNREACHABLE IS NOT ABSENT (CR-08-F18). The half of this check that asserts private paths are
 * NOT served used to record only an HTTP 200 as a leak, so a transport error, a timeout, a 5xx
 * or a redirect all counted as "not served", and a run against an origin that was down printed
 * "none of the N unpublished repo paths is served". Every absence probe is now one of three
 * outcomes: CONFIRMED not served (404/410, or 401/403 refused), SERVED, or UNVERIFIED, and an
 * unverified one fails the run. Likewise an empty or near-empty dist, or a capped sweep, is an
 * incomplete subject rather than a clean one. This runs AFTER the upload, so failing here can
 * neither block nor alter a publish; it only stops a run from claiming what it did not see.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseHeadersFile, cacheControlRulesFor, maxAgeOf } from "./lib/headers-file.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argDist = process.argv.find((a) => a.startsWith("--dist="));
const DIST = argDist ? argDist.slice(7) : join(ROOT, "dist");

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
const PROBE_TIMEOUT_MS = 30000;
// Fewer targets than this means dist is unbuilt or gutted. It used to be asserted only under
// --self-test, so an ordinary run over an empty dist verified zero files and passed.
const MIN_TARGETS = 20;

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
    // A hung socket must become a verdict, not a run that never ends.
    const r = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "bugit-delivery-check" },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const body = Buffer.from(await r.arrayBuffer());
    return {
      ok: true,
      status: r.status,
      body,
      hash: sha(body),
      type: r.headers.get("content-type") || "",
      cache: r.headers.get("cf-cache-status") || "-",
      // The BROWSER cache policy, as opposed to the edge one above. _headers can ASK for a
      // value the edge declines to honour, and the only way to know is to read it back.
      cc: r.headers.get("cache-control") || "",
      // Age matters only in company with cf-cache-status, and then it is decisive: a MISS that
      // arrives ALREADY OLD means the edge had nothing and fetched from a layer above the zone
      // -- the layer `purge_cache` cannot clear. Without Age, that case is indistinguishable
      // from an ordinary miss, and a purge that will never work looks like one worth retrying.
      age: r.headers.get("age"),
      location: r.headers.get("location") || "",
    };
  } catch (e) {
    return { ok: false, status: 0, body: Buffer.alloc(0), hash: "", type: "", cache: "-", cc: "", age: null, error: String(e.message || e) };
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

const incomplete = [];
if (!indexFile) incomplete.push("dist has no index.html; the site itself is not in the subject");
if (targets.length < MIN_TARGETS) {
  incomplete.push(`only ${targets.length} target(s) in ${DIST}; dist looks unbuilt (need at least ${MIN_TARGETS}). Run node build.js first`);
}

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
  // NO SILENT CAPS. A sweep that stops at the fold used to print the same green as one that
  // finished, with a NOTE above it. The unchecked remainder is now an incomplete result. The cap
  // itself stays: this must not grow into a wider sweep of sensitive paths.
  incomplete.push(`${absentTargets.length} unpublished paths, only the first ${PROBE_CAP} probed; ` +
    `${absentTargets.length - PROBE_CAP} NOT checked: ${absentTargets.slice(PROBE_CAP).join(", ")}`);
}

/* One request per sensitive path, never a retry. A redirect is followed exactly one same-origin
 * hop (that second request is to the DESTINATION, not the private path), because a redirect is
 * not proof of absence: Pages answers /x.html with 308 -> /x, and /x may then serve the bytes.
 * A destination that answers 200 with the bytes of a file dist PUBLISHES (a clean-URL rule
 * sending /license to the home page, say) is not a leak; any other 200 is. */
const publishedHashes = new Set(local.map((f) => sha(f.bytes)));
const REFUSED = [401, 403, 404, 410];
function classifyAbsence(first, second) {
  if (!first.ok) return { kind: "unverified", why: `unreachable: ${first.error}` };
  if (REFUSED.includes(first.status)) return { kind: "absent" };
  if (first.status === 200) return { kind: "served", r: first };
  if (![301, 302, 303, 307, 308].includes(first.status)) {
    return { kind: "unverified", why: `answered HTTP ${first.status}, which neither serves nor denies it` };
  }
  if (!second) return { kind: "unverified", why: `HTTP ${first.status} with no usable same-origin Location (${first.location || "none"})` };
  if (!second.ok) return { kind: "unverified", why: `redirect destination unreachable: ${second.error}` };
  if (REFUSED.includes(second.status)) return { kind: "absent" };
  if (second.status === 200) {
    return publishedHashes.has(second.hash)
      ? { kind: "absent", note: "redirects to published content" }
      : { kind: "served", r: second, via: first.location };
  }
  return { kind: "unverified", why: `redirect destination answered HTTP ${second.status}` };
}
async function probeAbsence(rel) {
  const url = BASE + "/" + rel;
  const first = await probe(url);
  let second = null;
  if (first.ok && [301, 302, 303, 307, 308].includes(first.status) && first.location) {
    let next = null;
    try { next = new URL(first.location, url); } catch { /* unparseable: stays unverified */ }
    if (next && next.origin === new URL(url).origin) second = await probe(next.href);
  }
  return classifyAbsence(first, second);
}

const leaked = [];
const unverifiedAbsent = [];
let confirmedAbsent = 0;
const leakResults = await inBatches(probing, 6, async (rel) => ({ rel, c: await probeAbsence(rel) }));
for (const { rel, c } of leakResults) {
  if (c.kind === "served") leaked.push({ rel, r: c.r, via: c.via });
  else if (c.kind === "unverified") unverifiedAbsent.push({ rel, why: c.why });
  else confirmedAbsent++;
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
  ({ rel, r, via }) => `/${rel}  HTTP 200  ${r.body.length} bytes  cf-cache:${r.cache}` +
    (via ? `  (after a redirect to ${via})` : "") + cacheNote({ ...r, rel }));
say("ABSENCE UNVERIFIED  (no answer that shows these private paths are not served)", unverifiedAbsent,
  ({ rel, why }) => `/${rel}  ${why}`);
say("INCOMPLETE SUBJECT  (the sweep did not cover what it must)", incomplete, (m) => m);

// Not a finding: the origin canonicalised the URL and delivered the right bytes there. Printed
// so a redirect that appears for a NEW reason is visible rather than absorbed in silence.
if (redirected.length) {
  console.log(`
CANONICALISED (delivered, at the origin's own URL) -- ${redirected.length}`);
  for (const { t, r } of redirected) console.log(`  · ${t.label}  -> ${new URL(r.finalUrl).pathname}`);
}

/* -------------------------------------------------- what the edge ACTUALLY caches
 *
 * _headers is a REQUEST, not a guarantee, and check-cache-headers.mjs only reads the request.
 * It asserts the file says `max-age=0` and has been green throughout, while the live origin
 * served `max-age=14400` for the two paths it mattered most for. On 2026-09-21 that cost the
 * owner a night of looking at a Guide that had been fixed and deployed hours earlier: his
 * browser was entitled to hold the previous guide.css and guide.js for four hours and did.
 *
 * Measured that day: sources.json and the prepared answer bank are served max-age=0 exactly as
 * written; guide.css, guide.js and 404.js are bumped to the edge's own four hour browser TTL,
 * which it applies by EXTENSION. So the rule worked on the data and was defeated on the code.
 *
 * This is the check that would have caught it: for every file whose _headers rule promises a
 * short life, read what the origin actually says. A promise nobody verifies is a comment.
 */
const headerRules = parseHeadersFile(ROOT);
const cachePolicy = [];
const ambiguous = [];
for (const { t, r } of results) {
  if (!r.ok || r.status !== 200) continue;
  const urlPath = t.label.split("  ")[0];

  /* AMBIGUOUS ON THE WIRE. Two max-age directives in one Cache-Control header, which is what
   * Cloudflare produces when two `_headers` rules match one path: it emits both values, joined.
   * RFC 9111 does not say which one a client must take, so the answer is whatever that reader's
   * browser does. check-cache-headers.mjs forbids the overlap statically; this catches the same
   * thing from outside, which matters because the static check can only see rules THIS
   * repository wrote, and anything the platform adds of its own would be invisible to it. */
  const ages = [...(r.cc || "").matchAll(/max-age\s*=\s*(\d+)/gi)].map((m) => Number(m[1]));
  if (ages.length > 1) ambiguous.push({ t, r, ages });

  const matching = cacheControlRulesFor(headerRules, urlPath);
  if (matching.length !== 1) continue; // an overlap is reported above, not compared
  const want = maxAgeOf(matching[0].cacheControl);
  const got = ages.length === 1 ? ages[0] : maxAgeOf(r.cc);
  if (want === null || got === null) continue;
  // Only one direction is a finding. The edge serving something SHORTER than asked costs a
  // revalidation; serving something LONGER means a correction cannot reach anyone, which is
  // the failure this exists for.
  if (got > want) cachePolicy.push({ t, r, promise: matching[0], want, got });
}

say("SERVED WITH MORE THAN ONE max-age  (no client is obliged to resolve it our way)", ambiguous,
  ({ t, r, ages }) => `${t.label}  ${ages.join(" and ")}  ->  ${r.cc}`);

say("CACHED LONGER THAN _headers ASKS  (a fix cannot reach a reader who already has one)", cachePolicy,
  ({ t, promise, want, got }) =>
    `${t.label}  asked max-age=${want} via "${promise.pattern}", served max-age=${got}` +
    (got >= 3600 ? `  <- up to ${Math.round(got / 3600)}h stale for a returning visitor` : ""));

const findings =
  dead.length +
  badStatus.length +
  mismatch.length +
  wrongType.length +
  leaked.length +
  unverifiedAbsent.length +
  incomplete.length +
  cachePolicy.length +
  ambiguous.length;

/* -------------------------------------------------- negative controls
 * Three ways this check could be quietly useless, each proven wrong against the live origin. */
let selfTestFailed = false;
if (SELF_TEST) {
  console.log("\n--- self-test ---");
  const fails = [];

  // 1. A path that cannot exist must be caught by STATUS, and its body must not be mistaken
  //    for content. This is the exact failure the header comment describes.
  const ghost = await probeFollowingOneHop(BASE + "/__delivery_probe_that_cannot_exist__.txt");
  // Exactly 404 or 410. "Anything but 200" let a transport failure (status 0) or a 5xx stand in
  // for the negative answer this control exists to observe.
  if (!ghost.ok || ![404, 410].includes(ghost.status)) {
    fails.push(`an absent path answered ${ghost.ok ? "HTTP " + ghost.status : "nothing (" + ghost.error + ")"}, not 404/410; absence cannot be verified against this origin`);
  } else console.log(`  absent path answered HTTP ${ghost.status} (${ghost.body.length} bytes of page body) -- caught by status, never hashed`);

  // 2. A byte that differs must be seen. Mutate a real local file's expected hash.
  const sample = served.find((f) => f.rel === "index.html") || served[0];
  const live = await probeFollowingOneHop(BASE + "/" + sample.rel);
  if (live.status === 200) {
    const mutated = sha(Buffer.concat([sample.bytes, Buffer.from("x")]));
    if (mutated === live.hash) fails.push("a mutated file hashed identically; the comparison is not comparing");
    else console.log(`  one added byte to ${sample.rel} changes its hash — the comparison fires`);
  } else {
    // A skipped control is not a passed one.
    fails.push(`byte control could not run: ${sample.rel} answered ${live.ok ? "HTTP " + live.status : "nothing"}`);
  }

  // 3. The sweep must actually have a subject. An empty dist would sail through every check
  //    above and print a confident zero.
  // (The subject minimum is now enforced in every mode, above; this line only reports it.)
  console.log(`  ${targets.length} targets enumerated from dist (minimum ${MIN_TARGETS}, enforced on every run)`);

  // 4. The absence classifier, over inert records: failures must never read as absence.
  const rec = (status, extra = {}) => ({ ok: true, status, body: Buffer.alloc(0), hash: "", location: "", ...extra });
  const dead = { ok: false, status: 0, error: "ECONNRESET" };
  const cases = [
    ["transport error", classifyAbsence(dead, null), "unverified"],
    ["HTTP 500", classifyAbsence(rec(500), null), "unverified"],
    ["HTTP 429", classifyAbsence(rec(429), null), "unverified"],
    ["redirect with no Location", classifyAbsence(rec(308), null), "unverified"],
    ["redirect to a dead destination", classifyAbsence(rec(308, { location: "/x" }), dead), "unverified"],
    ["redirect to a 200 that is not published", classifyAbsence(rec(308, { location: "/x" }), rec(200, { hash: "f".repeat(64) })), "served"],
    ["HTTP 404", classifyAbsence(rec(404), null), "absent"],
    ["HTTP 200", classifyAbsence(rec(200), null), "served"],
  ];
  for (const [what, got, want] of cases) {
    if (got.kind !== want) fails.push(`absence classifier called ${what} "${got.kind}", expected "${want}"`);
  }
  if (!fails.some((f) => f.startsWith("absence classifier"))) {
    console.log(`  absence classifier: ${cases.length} inert cases, transport/5xx/redirect never read as absent`);
  }

  for (const f of fails) console.log("  SELF-TEST FAILED: " + f);
  if (fails.length) selfTestFailed = true;
}

/* process.exitCode, not process.exit(): on Windows, Node aborts with a libuv assertion (exit 127)
 * when process.exit() runs while fetch's keep-alive sockets are still open. Still non-zero, but
 * an operator reading a native crash after a deploy would be right to distrust the whole run. */
if (findings || selfTestFailed) {
  if (findings) {
    console.log(`\n${findings} DELIVERY FINDING(S) -- ${BASE} is not verified as serving what dist holds and nothing more`);
  }
  process.exitCode = 1;
} else {
  console.log(`\ncheck-live-delivery OK: all ${targets.length} files in dist arrive from ${BASE} with HTTP 200, ` +
    `byte-identical and correctly typed; all ${confirmedAbsent} of the ${probing.length} unpublished repo paths ` +
    `were CONFIRMED not served (404/410/401/403).`);
}
