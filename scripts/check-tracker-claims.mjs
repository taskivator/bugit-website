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
import { publishedCopy, publishedLangs, htmlText } from "./lib/published-copy.mjs";

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

// 5. TEST MANAGEMENT IS NOT A WORKING CONNECTION, so the homepage must not present one.
//    Until 2026-09-26 the "Connect what you already use" section showed TestRail and Xray under
//    "CRASH & TEST", above "Turn on a supported tool in setup", and every locale's lede said test
//    management connects "so your assistant can read them". A code audit that day found the
//    agent's TestRail, Xray, Zephyr and Qase link clients unreachable: setup writes an MCP server
//    entry and nothing more, and in VS Code the agent grants none of those tools. The Guide and
//    the Overview already said the true thing ("setup guidance only"); the homepage did not.
//    The claim was removed rather than reworded. If test case linking ever ships, this is the
//    list to change, after the agent repo proves it.
const NOT_CONNECTED = ["testrail", "xray", "zephyr", "qase"];
for (const r of rows) {
  for (const t of r.tools) {
    if (NOT_CONNECTED.includes(t)) problems.push(`${t} is shown under "integrations.${r.group}" on the homepage, but test management is setup guidance only: the agent's link clients are not reachable.`);
  }
}
// Every locale's word for it, as the homepage and FAQ copy used it.
const TEST_MGMT_TERMS = ["test management", "testmanagement", "テスト管理", "gestión de pruebas", "gestion des tests",
  "gestão de testes", "gestione dei test", "테스트 관리", "测试管理", "управление тестами", "إدارة الاختبارات"];
for (const [name, text] of [["index.html", html], ["app.js", app]]) {
  const low = text.toLowerCase();
  for (const term of TEST_MGMT_TERMS) {
    if (low.includes(term.toLowerCase())) problems.push(`${name} names "${term}" among the services that connect: test management is setup guidance only (the Guide and the Overview say so), not a connection the assistant can use.`);
  }
}
// And the group heading that carried the two logos, in every definition of it.
const TEST_WORDS = /test|prueba|テスト|테스트|测试|тест|اختبار/i;
for (const m of app.matchAll(/["']?crash["']?:\s*["']([^"']*)["']/g)) {
  if (TEST_WORDS.test(m[1])) problems.push(`the integrations.crash heading "${m[1]}" still names testing; the group holds crash tools only.`);
}
const crashHead = /<h3 data-t="integrations\.crash">([^<]*)<\/h3>/.exec(html);
if (crashHead && TEST_WORDS.test(crashHead[1])) problems.push(`the no-JS integrations.crash heading "${crashHead[1]}" still names testing.`);

// 6. THE PUBLISHED COPY (2026-10-04). bugit.dev now serves the redesign: v2/index.html is the
//    homepage, its other languages are v2/i18n/<lang>.json, the docs are v2/docs/, and the logo
//    row is drawn by v2/v2.js from its NAMES table. Checks 1 to 5 above read index.html and app.js,
//    which still ship but are no longer what a visitor reads, so on their own they would stay green
//    while the live page said anything at all. The same properties are asserted here against what
//    scripts/lib/published-copy.mjs says is published, without restating its file list:
//      a. the tracker row the homepage draws is exactly FILEABLE (no test management logo, no
//         tracker missing, nothing added that the agent does not file to);
//      b. the trackers eyebrow (key t103) states the count in every published language;
//      c. no published text denies filing, names test management as a connection, or gives any
//         tracker count in English other than eleven.
//    Each scan is a function so it can also be run over a synthetic copy holding the defect: if
//    that negative control is not flagged, the guard fails, because a scan that cannot fail proves
//    nothing. Logo NAMES are not a count claim; only a number in the copy is.

COUNT_WORDS.push("أحد عشر"); // Arabic "eleven", as the v2 homepage eyebrow spells it.
const DENIAL = /does not file to (those|them)/i;
const EN_NUMBER = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|\\d+";
const EN_COUNT = new RegExp(`\\b(${EN_NUMBER})\\s+(?:issue\\s+|bug\\s+)?trackers\\b`, "gi");

/** a. The homepage tracker row, from the NAMES table in a published script. */
function scanLogoRow(entries) {
  const out = [];
  const tables = [];
  for (const e of entries.filter((x) => x.kind === "script")) {
    const m = /var\s+NAMES\s*=\s*\{([^}]*)\}/.exec(e.text);
    if (m) tables.push({ file: e.file, keys: [...m[1].matchAll(/([a-z]+)\s*:/g)].map((k) => k[1]) });
  }
  if (tables.length !== 1) { out.push(`expected exactly one tracker NAMES table in the published scripts, found ${tables.length}; has the logo row been restructured?`); return out; }
  const { file, keys } = tables[0];
  for (const t of FILEABLE) if (!keys.includes(t)) out.push(`${file}: the homepage tracker row omits ${t}, which BugIt files to directly.`);
  for (const t of keys) {
    if (NOT_CONNECTED.includes(t)) out.push(`${file}: the homepage tracker row shows ${t}, but test management is setup guidance only: the agent's link clients are not reachable.`);
    else if (!FILEABLE.includes(t)) out.push(`${file}: the homepage tracker row shows ${t}, which is not in FILEABLE; check tools/tracker_routing.py before advertising it.`);
  }
  return out;
}

/** b. The trackers eyebrow (t103) in each language states the count. */
function eyebrowOf(e) {
  if (e.kind === "page") {
    const m = /<[a-z0-9]+[^>]*\sdata-k="t103"[^>]*>([\s\S]*?)<\/[a-z0-9]+>/.exec(e.text);
    return m ? htmlText(m[1]) : null;
  }
  if (e.kind === "home") {
    // The joined text has no keys, so read t103 from the entry's own file (a synthetic entry
    // carries it inline instead).
    return e.t103 !== undefined ? e.t103 : JSON.parse(fs.readFileSync(path.join(ROOT, e.file), "utf8")).t103 ?? null;
  }
  return undefined;
}
function scanEyebrows(entries, langs) {
  const out = [];
  const seen = new Set();
  for (const e of entries) {
    const text = eyebrowOf(e);
    if (text === undefined) continue;
    if (e.kind === "page" && text === null) continue; // only the homepage carries the trackers section
    seen.add(e.lang);
    if (text === null) { out.push(`${e.file}: no t103 (trackers eyebrow) string.`); continue; }
    if (!COUNT_WORDS.some((w) => text.toLowerCase().includes(w.toLowerCase())))
      out.push(`${e.file} [${e.lang}]: the trackers eyebrow does not state the tracker count: "${text}" (expected one of: ${COUNT_WORDS.join(", ")}).`);
  }
  for (const l of langs) if (!seen.has(l)) out.push(`no published trackers eyebrow (t103) found for language ${l}.`);
  return out;
}

/** c. Denials, test management connection claims, and English tracker counts other than eleven. */
function scanCopy(entries) {
  const out = [];
  for (const e of entries) {
    const low = e.text.toLowerCase();
    if (DENIAL.test(e.text)) out.push(`${e.file}: says BugIt "does not file to" some trackers. It files to all eleven. This is audit finding F-08.`);
    for (const term of TEST_MGMT_TERMS) {
      if (low.includes(term.toLowerCase())) out.push(`${e.file} names "${term}" among the services that connect: test management is setup guidance only, not a connection the assistant can use.`);
    }
    if (e.lang === "en" || e.lang === null) {
      const visible = e.kind === "page" ? htmlText(e.text) : e.text;
      for (const m of visible.matchAll(EN_COUNT)) {
        const n = m[1].toLowerCase();
        if (n !== "eleven" && n !== String(FILEABLE.length)) out.push(`${e.file}: "${m[0]}" states a tracker count other than ${FILEABLE.length}.`);
      }
    }
  }
  return out;
}

const published = publishedCopy();
const langs = publishedLangs();
const pubChars = published.reduce((n, e) => n + e.text.length, 0);
// Positive control: the published copy was really read, so an empty scan cannot pass.
if (published.length < 20 || pubChars < 100000)
  problems.push(`published copy scan read only ${published.length} entries / ${pubChars} characters; expected at least 20 / 100000.`);
const pubProblems = [...scanLogoRow(published), ...scanEyebrows(published, langs), ...scanCopy(published)];
problems.push(...pubProblems.map((p) => `published copy: ${p}`));

// Negative controls, in memory only. Each synthetic copy carries one defect the scan must flag.
const fakeScript = (names) => ({ file: "synthetic/v2.js", lang: null, kind: "script", text: `var NAMES = { ${names.map((n) => `${n}: "${n}"`).join(", ")} };` });
const controls = [
  ["logo row showing TestRail", () => scanLogoRow([fakeScript([...FILEABLE, "testrail"])])],
  ["logo row missing Trello", () => scanLogoRow([fakeScript(FILEABLE.filter((t) => t !== "trello"))])],
  ["eyebrow without a count", () => scanEyebrows([{ file: "synthetic/fr.json", lang: "fr", kind: "home", text: "", t103: "Outils de suivi" }], ["fr"])],
  ["page eyebrow without a count", () => scanEyebrows([{ file: "synthetic/index.html", lang: "en", kind: "page", text: '<p class="eyebrow" data-k="t103">Many trackers</p>' }], ["en"])],
  ["filing denial", () => scanCopy([{ file: "synthetic/en.json", lang: "en", kind: "docs", text: "BugIt does not file to those." }])],
  ["test management claim", () => scanCopy([{ file: "synthetic/ja.json", lang: "ja", kind: "home", text: "テスト管理ツールと接続" }])],
  ["wrong tracker count", () => scanCopy([{ file: "synthetic/index.html", lang: "en", kind: "page", text: "<p>Files to <b>ten</b> trackers.</p>" }])],
];
for (const [name, run] of controls) {
  if (!run().length) problems.push(`negative control did not fire: the published copy scan did not flag a synthetic ${name}.`);
}

if (problems.length) {
  for (const p of problems) console.error(`FAIL: ${p}`);
  console.error(`\ncheck-tracker-claims: ${problems.length} problem(s). The site is advertising a ` +
                `capability that does not match tools/tracker_routing.py::FILEABLE.`);
  process.exit(1);
}
console.log(`check-tracker-claims: OK — all ${FILEABLE.length} fileable trackers are shown as directly filed, ` +
            `no fileable tracker is under an MCP heading, and every lede states the count. Published copy: ` +
            `${published.length} entries (${pubChars} characters) scanned, ${controls.length} negative controls fired.`);
