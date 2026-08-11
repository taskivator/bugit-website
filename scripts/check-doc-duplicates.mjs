#!/usr/bin/env node
/**
 * No customer document may say the same thing twice.
 *
 * WHY THIS EXISTS. OVERVIEW and GETTING_STARTED carried two consecutive bullets in one list:
 *
 *   - Guided knowledge source: Confluence Cloud through Atlassian Rovo MCP, with browser sign-in.
 *   - Guided knowledge source, read only: Confluence Cloud through Atlassian Rovo MCP, with
 *     browser sign-in. Sentry and Notion are experimental until their live checks pass.
 *
 * The second superseded the first, which was a leftover from before the "read only" clarification.
 * So the docs did not merely repeat themselves, they DISAGREED with themselves about whether
 * Confluence is read only. It was in all eleven languages of both documents: 22 files, live.
 *
 * Every check in this repo passed the whole time, because none of them compares a document to
 * itself. Nothing was invalid, nothing was untranslated, no link was broken, no claim was
 * unsupported. It just said it twice.
 *
 * THE SHAPE MATTERS. An exact-duplicate check finds nothing here: the stale bullet is a PREFIX of
 * its replacement, not a copy of it. That is what a superseded line usually looks like, because
 * the fix was written by editing a copy of the original and the original was never deleted. So
 * this compares each bullet against the OPENING of the one after it.
 *
 *   node scripts/check-doc-duplicates.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DOCS = "public/docs";
const NEAR = 0.8;         // similarity of the shorter bullet to the longer one's opening
const MIN_LEN = 30;       // below this a line is a label, not prose

/**
 * Pairs that LOOK superseded and are not. Each needs a reason, because an allowlist without one
 * is how a real duplicate gets waved through by the next person reading this file.
 */
const ALLOWED = [
  {
    files: /^REFUND\./,
    why: "'future activations stop' and 'future updates stop' are different consequences of a " +
         "refund, not one sentence written twice. They read alike because they are deliberately " +
         "parallel.",
  },
];

const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/[`*_]/g, "");
const norm = (s) => strip(s).replace(/\s+/g, " ").trim().toLowerCase();

/** Similarity by longest-common-subsequence length over the two strings. */
function ratio(a, b) {
  if (!a.length || !b.length) return 0;
  // Bounded: these are single bullets, not documents.
  const prev = new Array(b.length + 1).fill(0);
  let best = 0;
  for (let i = 1; i <= a.length; i++) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : Math.max(prev[j], prev[j - 1]);
      diag = tmp;
    }
  }
  best = prev[b.length];
  return (2 * best) / (a.length + b.length);
}

function docs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...docs(p));
    else if (/\.(md|txt)$/.test(name)) out.push(p);
  }
  return out;
}

function allowed(file) {
  const base = file.split(/[\\/]/).pop();
  return ALLOWED.find((a) => a.files.test(base));
}

let failures = 0;
let scanned = 0;
const files = docs(DOCS).sort();

for (const file of files) {
  scanned++;
  const lines = readFileSync(file, "utf8").split("\n");
  const bullets = [];
  lines.forEach((l, i) => {
    if (l.trim().startsWith("- ") && norm(l).length >= MIN_LEN) bullets.push([i + 1, l]);
  });

  for (let k = 0; k + 1 < bullets.length; k++) {
    const [la, ta] = bullets[k];
    const [lb, tb] = bullets[k + 1];
    if (lb !== la + 1) continue;                 // only ADJACENT bullets in one list
    const na = norm(ta);
    const nb = norm(tb);
    if (!na || !nb) continue;

    let verdict = null;
    if (na === nb) verdict = "identical";
    else {
      const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
      if (ratio(shorter, longer.slice(0, shorter.length)) >= NEAR) verdict = "superseded";
    }
    if (!verdict) continue;

    const waiver = allowed(file);
    if (waiver) continue;

    failures++;
    console.error(`FAIL ${file.replace(/\\/g, "/")} lines ${la} and ${lb}: ${verdict}`);
    console.error(`       ${ta.trim().slice(0, 140)}`);
    console.error(`       ${tb.trim().slice(0, 140)}`);
    console.error("       One of these is a leftover. Delete the one the other replaced.");
  }
}

if (failures) {
  console.error(`\ncheck-doc-duplicates FAILED: ${failures} duplicated passage(s) across ` +
                `${scanned} documents.`);
  process.exit(1);
}
console.log(`check-doc-duplicates OK: ${scanned} documents, no passage said twice ` +
            `(${ALLOWED.length} documented waiver group).`);
