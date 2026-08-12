/**
 * The site must not tell a buyer that a tracker BugIt files to needs an MCP server.
 *
 * WHY THIS EXISTS. The 2026-08-12 external audit of v1.1.6 found (F-08) that the
 * "Connect what you already use" section put Linear, Shortcut, ClickUp, Asana and Trello
 * under a "VIA YOUR MCP SERVER" heading, and that the no-JS fallback paragraph read
 * "BugIt does not file to those". BugIt files DIRECTLY to all eleven. Half the supported
 * trackers were advertised as unsupported, and a buyer could reasonably provision a server
 * the product does not need, or reject BugIt as incompatible with their tracker.
 *
 * It was not a typo, it was DRIFT: the localized lede had already been corrected to name
 * all eleven as directly filed, while the grouping and the static fallback beside it had
 * not. The section contradicted itself in the same viewport, and the two halves are edited
 * in different files, so nothing forced them to agree.
 *
 * THE AUTHORITY is tools/tracker_routing.py::FILEABLE in the agent repo — a separate repo
 * this one cannot import, so the list is mirrored below with that pointer. A mirror can go
 * stale, which is exactly why the count is also asserted against the site's own copy: if
 * BugIt gains or loses a fileable tracker, the lede's number and this list disagree and the
 * build fails, which is the moment to re-read the authority.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

// Mirrors tools/tracker_routing.py::FILEABLE (agent repo). Site icon keys, in its order.
const FILEABLE = ["jira", "azuredevops", "github", "gitlab", "bugzilla", "youtrack",
                  "linear", "shortcut", "clickup", "asana", "trello"];
// How the lede spells the count, per locale. A number that stops matching FILEABLE.length
// is the signal that this file's mirror needs re-checking against the agent repo.
const COUNT_WORDS = ["eleven", "once", "onze", "undici", "elf", "одиннадцать", "11", "十一", "열한", "11 の"];

const problems = [];

// 1. Every fileable tracker must be in the direct-filing (built-in) row.
const rows = [...html.matchAll(/<h3 data-t="integrations\.([a-z]+)">[^<]*<\/h3><div class="icon-row" data-tools="([^"]*)"/g)]
  .map((m) => ({ group: m[1], tools: m[2].split(",").filter(Boolean) }));
if (!rows.length) problems.push("could not find any integrations icon-row in index.html — has the section been restructured?");

const builtin = rows.find((r) => r.group === "builtin");
if (!builtin) problems.push('no "integrations.builtin" icon-row found; the direct-filing group is the one that must hold every fileable tracker.');
else {
  for (const t of FILEABLE) {
    if (!builtin.tools.includes(t)) {
      const other = rows.find((r) => r.group !== "builtin" && r.tools.includes(t));
      problems.push(`${t} is filed directly by BugIt but is ${other ? `grouped under "integrations.${other.group}"` : "not in the direct-filing row"}. This is audit finding F-08.`);
    }
  }
  for (const t of builtin.tools) {
    if (!FILEABLE.includes(t)) problems.push(`${t} is shown as directly filed but is not in FILEABLE — check tools/tracker_routing.py before advertising it.`);
  }
}

// 2. No fileable tracker may sit under an MCP heading, whatever that group is called.
for (const r of rows.filter((r) => r.group === "mcp")) {
  for (const t of r.tools) {
    if (FILEABLE.includes(t)) problems.push(`${t} is under the MCP group but BugIt files to it directly. This is audit finding F-08.`);
  }
}

// 3. The fallback paragraph (what no-JS and pre-hydration visitors read) must not deny
//    filing. This exact sentence is what shipped.
const lede = /<p class="integrations-lede" data-t="integrations\.lede">([\s\S]*?)<\/p>/.exec(html);
if (!lede) problems.push("the integrations lede paragraph is missing from index.html.");
else {
  if (/does not file to (those|them)/i.test(lede[1]))
    problems.push('the no-JS integrations lede still says BugIt "does not file to those". It files to all eleven. This is audit finding F-08.');
  if (!COUNT_WORDS.some((w) => lede[1].toLowerCase().includes(w)))
    problems.push(`the integrations lede no longer states how many trackers are filed directly (expected one of: ${COUNT_WORDS.join(", ")}).`);
}

// 4. Every localized lede must state the same count. This is the half that was already
//    correct while the HTML was not; asserting both keeps them from drifting apart again.
const ledes = [...app.matchAll(/lede:'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
if (ledes.length < 5) problems.push(`only ${ledes.length} localized integrations ledes found; expected the full set.`);
ledes.forEach((text, i) => {
  if (/does not file to (those|them)/i.test(text))
    problems.push(`localized lede #${i + 1} says BugIt does not file to some trackers. It files to all eleven.`);
  if (!COUNT_WORDS.some((w) => text.toLowerCase().includes(w)))
    problems.push(`localized lede #${i + 1} does not state the tracker count: ${text.slice(0, 60)}…`);
});

if (problems.length) {
  for (const p of problems) console.error(`FAIL: ${p}`);
  console.error(`\ncheck-tracker-claims: ${problems.length} problem(s). The site is advertising a ` +
                `capability that does not match tools/tracker_routing.py::FILEABLE.`);
  process.exit(1);
}
console.log(`check-tracker-claims: OK — all ${FILEABLE.length} fileable trackers are shown as directly filed, ` +
            `no fileable tracker is under an MCP heading, and every lede states the count.`);
