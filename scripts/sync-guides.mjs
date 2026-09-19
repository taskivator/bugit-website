#!/usr/bin/env node
/**
 * Copy the customer PDFs from the agent repo into public/docs/guides, and record what was copied.
 *
 * HOW MANY THERE ARE IS NOT WRITTEN HERE. This line said "the twenty customer PDFs" until
 * 2026-08-31; there have been 22 since Arabic joined on 2026-08-08, and the same stale count was
 * sitting in two seller docs and in the source tree's own README. The count belongs to
 * build_pdfs.py EXPECTED_TOTAL, and this script does not need it anyway: it copies whatever
 * docs/pdf-manifest.json lists, so a twelfth language is carried on the day it is printed.
 *
 * WHY THIS EXISTS. The site shipped its own copies of these guides and nothing tied them to the
 * originals, so when the agent's PDFs were regenerated for a release the site kept serving the
 * previous ones. `check-docs.mjs` only asked whether each file EXISTED, which a stale file passes
 * exactly as well as a current one — the guides on bugit.dev were a week behind the product and
 * every check was green.
 *
 * The agent side already solved its half: tools/build_pdfs.py derives its targets from the PDFs
 * that actually exist and writes docs/pdf-manifest.json binding each PDF to the HTML it was
 * printed from. This reads that manifest, so the site copies exactly what the agent published —
 * including the five languages that ship under localized filenames (BugIt-Benutzerhandbuch.de.pdf
 * and friends), which is the mapping that went wrong before.
 *
 * It then writes public/docs/guides/guides-manifest.json recording, per file, the sha256 of the
 * bytes served and the source they came from. check-docs.mjs verifies the served bytes still match
 * that record, so a guide cannot be silently replaced or half-copied.
 *
 *   node scripts/sync-guides.mjs --agent ../generic-qa-agent
 *   node scripts/sync-guides.mjs --agent ../generic-qa-agent --check   # report only, no writes
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const GUIDES = join(ROOT, "public", "docs", "guides");
const MANIFEST = join(GUIDES, "guides-manifest.json");

const argv = process.argv.slice(2);
const val = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const CHECK_ONLY = argv.includes("--check");
const agentRoot = resolve(ROOT, val("--agent") ?? "../generic-qa-agent");
const agentManifestPath = join(agentRoot, "docs", "pdf-manifest.json");

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

if (!existsSync(agentManifestPath)) {
  console.error(`no agent manifest at ${agentManifestPath} — pass --agent <path to generic-qa-agent>`);
  process.exit(2);
}
const agent = JSON.parse(readFileSync(agentManifestPath, "utf8"));
// Eleven languages x two documents, since Arabic joined the set on 2026-08-08.
const EXPECTED_PDFS = 22;
if (!Array.isArray(agent.pdfs) || agent.pdfs.length !== EXPECTED_PDFS) {
  // The agent's own builder refuses to run unless it finds exactly this many. If that ever
  // changes, this must be looked at rather than quietly copying whatever is there.
  console.error(`expected ${EXPECTED_PDFS} PDFs in the agent manifest, found ${agent.pdfs?.length}`);
  process.exit(2);
}

/** Which of the site's two filenames this entry is, derived from its SOURCE, not its title. */
function siteName(entry) {
  const src = (entry.source || "").toLowerCase();
  if (src.endsWith("user-guide.html")) return "user-guide.pdf";
  if (src.endsWith("overview.html")) return "overview.pdf";
  return null;
}

const records = [];
let copied = 0;
let stale = 0;
// Every copy this run intends to make, held until the whole set has validated.
const pending = [];
let missing = 0;

for (const e of agent.pdfs) {
  const name = siteName(e);
  if (!name) {
    console.error(`cannot classify ${e.pdf} from source ${e.source}`);
    process.exit(2);
  }
  const from = join(agentRoot, e.pdf);
  if (!existsSync(from)) {
    console.error(`MISSING in agent: ${e.pdf}`);
    missing++;
    continue;
  }
  const fromHash = sha(from);
  if (fromHash !== e.pdf_sha256) {
    // The agent's own PDF does not match its manifest: regenerate there before syncing here.
    console.error(`HASH MISMATCH in agent for ${e.pdf} — run tools/build_pdfs.py first`);
    process.exit(2);
  }

  const dest = join(GUIDES, e.language, name);
  const before = existsSync(dest) ? sha(dest) : null;
  const same = before === fromHash;
  if (!same) stale++;

  // DECIDED NOW, COPIED LATER. Copying inside this loop meant an abort further down left earlier
  // files already written and then printed "nothing written" -- and the process.exit(2) on the
  // next entry's hash mismatch abandons the run without rewriting the manifest, so the tree was
  // half synced and described by a manifest for the previous state.
  if (!CHECK_ONLY && !same) pending.push({ from, dest });
  console.log(
    `${same ? "current" : CHECK_ONLY ? "STALE  " : "updated"}  ${e.language}/${name}  <- ${e.pdf}`,
  );

  records.push({
    file: `${e.language}/${name}`,
    sha256: fromHash,
    bytes: e.bytes,
    pages: e.pages,
    language: e.language,
    agent_pdf: e.pdf,
    source: e.source,
    source_sha256: e.source_sha256,
  });
}

if (missing) {
  console.error(`\n${missing} PDF(s) missing from the agent repo — nothing written.`);
  process.exit(1);
}

if (CHECK_ONLY) {
  // AND THE MANIFEST, WHICH --check NEVER LOOKED AT. `stale` compares the PDF bytes on disk
  // against the agent's hashes, and nothing asked whether `guides-manifest.json` -- the file the
  // site actually serves this list from -- agrees with either of them. So a tree whose twenty-two
  // PDFs are all correct passed while the manifest beside them described a previous state, named
  // a different toolchain, or was missing altogether. That manifest is the only thing a reader
  // has that says WHICH build printed these; a check that cannot see it is checking half the
  // artifact. The full-run path below rewrites it from the same `records`, so the comparison is
  // against exactly what this script would write.
  let manifestStale = 0;
  if (!existsSync(MANIFEST)) {
    console.error(`MISSING: ${MANIFEST}: the site has the PDFs and nothing that describes them`);
    manifestStale = 1;
  } else {
    let have = null;
    try {
      have = JSON.parse(readFileSync(MANIFEST, "utf8"));
    } catch (e) {
      console.error(`UNREADABLE: ${MANIFEST} (${e.message})`);
      manifestStale = 1;
    }
    if (have) {
      const want = manifestBody(records);
      for (const [k, v] of Object.entries(want)) {
        if (k === "guides") continue;
        if (JSON.stringify(have[k]) !== JSON.stringify(v)) {
          console.error(`MANIFEST ${k}: ${JSON.stringify(have[k])}, expected ${JSON.stringify(v)}`);
          manifestStale++;
        }
      }
      if (JSON.stringify(have.guides) !== JSON.stringify(want.guides)) {
        console.error("MANIFEST guides: the entry list differs from what a sync would write");
        manifestStale++;
      }
    }
  }
  console.log(`\n${stale} of ${records.length} guide(s) differ from the agent's published PDFs; ` +
              `${manifestStale} manifest difference(s).`);
  process.exit(stale || manifestStale ? 1 : 0);
}

// Past every refusal: the copies are safe to make now, which is what makes the sentence above
// true whenever it is printed.
for (const { from, dest } of pending) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(from, dest);
  copied++;
}

writeFileSync(MANIFEST, JSON.stringify(manifestBody(records), null, 2) + "\n", "utf8");
console.log(`\n${copied} updated, ${records.length - copied} already current. Wrote ${MANIFEST}.`);

// ONE DEFINITION OF THE MANIFEST, so `--check` compares against exactly what a real run writes.
// Two copies of this shape would drift, and the drift would be invisible: the check would pass
// on a manifest the writer would never produce. It sorts a COPY, because --check runs before
// the write path and must not reorder the caller's array as a side effect.
function manifestBody(recs) {
  const guides = [...recs].sort((a, b) => a.file.localeCompare(b.file));
  return {
      schema: "bugit-site-guides/1",
      count: guides.length,
      // WHAT PRINTED THESE, carried across rather than restated. "weasyprint" alone is the half
      // of the answer that never changes, which is the half that cannot explain a change: on
      // 2026-09-01 all 22 of these files came back with new bytes from unedited sources, and
      // there was nothing recorded on either side to say why. The agent now records the four
      // versions and the SOURCE_DATE_EPOCH its build is pinned to -- pinned because the cause
      // turned out to be the wall clock landing in a font subset. Copied verbatim, and undefined
      // if an older agent manifest has neither, because inventing a value here is how the two
      // sides start disagreeing about the same bytes.
      agent_generator: agent.generator,
      agent_toolchain: agent.toolchain,
      agent_source_date_epoch: agent.source_date_epoch,
      guides,
  };
}
