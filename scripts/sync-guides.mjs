#!/usr/bin/env node
/**
 * Copy the twenty customer PDFs from the agent repo into public/docs/guides, and record what was
 * copied.
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

  if (!CHECK_ONLY && !same) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(from, dest);
    copied++;
  }
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
  console.log(`\n${stale} of ${records.length} guide(s) differ from the agent's published PDFs.`);
  process.exit(stale ? 1 : 0);
}

records.sort((a, b) => a.file.localeCompare(b.file));
writeFileSync(
  MANIFEST,
  JSON.stringify(
    { schema: "bugit-site-guides/1", count: records.length, agent_generator: agent.generator, guides: records },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log(`\n${copied} updated, ${records.length - copied} already current. Wrote ${MANIFEST}.`);
