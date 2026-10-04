// Prepares an external review round of bugit.dev in Google Drive, the way BugIt does it
// (procedure: E:\Taskivator\BugIt\10-seller-legal-and-handoffs\external-audit-procedure-for-other-products-2026-09-30.md).
// Adapted 2026-10-04 from taskivator.com's tools/audit-drop.mjs (owner: "add the dist and prompt for
// bugit.dev too in a seperate folder following the same format as other external audits").
//
//   node scripts/audit-drop.mjs              dry run: prints what it would do, screens, writes nothing
//   node scripts/audit-drop.mjs --write      writes the Drive folder
//   node scripts/audit-drop.mjs --self-test  proves the screen catches what it exists to catch
//
// What it does:
//   1. Proves which commit is LIVE. bugit.dev keeps no deploy log (Cloudflare Pages takes direct
//      uploads), so the proof is the delivery check itself: with a clean tracked tree, HEAD is built
//      and scripts/check-live-delivery.mjs must find every file of that build on https://bugit.dev
//      byte identical. If it does not, nothing is written: the live site is not HEAD.
//   2. Builds the snapshot with `git archive` of that commit (tracked files only: no .env, no
//      node_modules, no history, nothing untracked), never by zipping the folder.
//   3. Screens every file in it, and the brief, with the taskivator.com build's own guards
//      (src/identity-guard.mjs there: secret shapes and the owner's private denylist), the exact
//      values of BugIt's local credential files, forbidden file names, and this repo's own
//      scripts/check-committed-secrets.mjs. Any hit stops everything. Hits are reported by file
//      and line, never by value.
//   4. Places ONE snapshot in 01-DIST-TO-AUDIT (older ones removed), with its .sha256 and
//      README-FIRST.txt, and a round folder 02-AUDIT-REPORTS\<date>_<sha>\ with the brief and the
//      owner's HANDOVER-WHAT-TO-SEND.txt. A second run for the same snapshot APPENDS a round block.
// The Drive folder is never shared. The owner downloads what the handover lists.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes('--write');
const SELF_TEST = process.argv.includes('--self-test');
const DRIVE = process.env.BUGIT_WEBSITE_AUDIT_DRIVE || 'F:\\My Drive\\5-BugIt Website Google Drive';
// ONE home for the identity and secret guards: the taskivator.com build's module, imported rather
// than copied, so a term added to the denylist or a pattern added there protects this drop too.
const GUARD = process.env.BUGIT_IDENTITY_GUARD || 'E:\\Taskivator\\Taskivator website\\01-repos-live-code\\taskivator-website\\src\\identity-guard.mjs';
// BugIt's own credential files: their exact values must never appear in a snapshot.
const BUGIT_SECRETS_DIR = process.env.BUGIT_SECRETS_DIR || 'E:\\Taskivator\\BugIt\\05-secrets-and-tokens';
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const today = new Date().toLocaleDateString('sv-SE'); // the owner's local date, not UTC
const stop = (m) => { console.log('STOPPED: ' + m); process.exit(1); };

if (!fs.existsSync(GUARD)) stop(`the identity guard is not at ${GUARD}: refusing to screen blind (set BUGIT_IDENTITY_GUARD)`);
const { SECRET, secretHit, EXACT_SECRETS, DENY, DENY_FILE, denyHits, binaryText, BINARY_EXT } = await import(pathToFileURL(GUARD).href);

// Exact values from BugIt's credential files: each line's value (after `=` or `:` if any), 20+
// characters with no spaces. Held in memory, compared, never printed.
const bugitExact = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (fs.statSync(p).size < 1 << 20) {
  const buf = fs.readFileSync(p); if (buf.includes(0)) continue;
  for (const line of buf.toString('utf8').split(/\r?\n/)) { const v = line.replace(/^[^=:]*[=:]\s*/, '').trim().replace(/^["']|["']$/g, ''); if (v.length >= 20 && !/\s/.test(v)) bugitExact.push(v); }
} } };
if (fs.existsSync(BUGIT_SECRETS_DIR)) walk(BUGIT_SECRETS_DIR);
for (const f of fs.readdirSync(ROOT)) if (/^\.env|^\.dev\.vars$/.test(f) && fs.statSync(path.join(ROOT, f)).isFile()) {
  for (const line of fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/)) { const v = line.replace(/^[^=]*=\s*/, '').trim().replace(/^["']|["']$/g, ''); if (v.length >= 20 && !/\s/.test(v)) bugitExact.push(v); }
}
const exact = [...EXACT_SECRETS, ...bugitExact];

const FORBIDDEN_NAME = /(^|\/)(\.env[^/]*|.*\.pem|.*\.key|.*cloudflare-token.*|.*private-denylist.*|.*\.local(\.json)?|\.dev\.vars|\.wrangler\/.*|.*secrets?-and-tokens.*)$/i;
const hits = [];
const screenText = (label, text) => {
  if (SECRET.test(text)) hits.push(`${label}: looks like a secret, line ${text.slice(0, text.search(SECRET)).split('\n').length}`);
  if (exact.some((t) => text.includes(t))) hits.push(`${label}: contains the exact value of a local credential file`);
  else if (!SECRET.test(text) && secretHit(text, { markup: /\.(html|svg)$/i.test(label) })) hits.push(`${label}: looks like a secret once its character references are decoded`);
  for (const h of denyHits(text, { markup: /\.(html|svg)$/i.test(label) })) hits.push(`${label}: private denylist entry ${h.entry} in its ${h.where}${h.line ? `, line ${h.line}` : ''}`);
};

if (!DENY || !DENY.length) stop(`the private denylist (${DENY_FILE}) is missing or empty: refusing to screen blind`);
if (SELF_TEST) {
  const before = hits.length;
  screenText('selftest-secret', 'key = re_' + 'A1b2C3d4E5f6G7h8J9k0');
  screenText('selftest-encoded.html', '<p>key = &#114;e_' + 'A1b2C3d4E5f6G7h8J9k0</p>');
  if (bugitExact.length) screenText('selftest-bugit-exact', 'x ' + bugitExact[0] + ' y');
  const src = DENY[0].source;
  const digitGap = '[\\s().+-]*';
  const term = src.includes(digitGap) ? src.split(digitGap).join('') : src.split('\\s+').join(' ').replace(/\\(.)/g, '$1');
  screenText('selftest-denylist', 'hello ' + term + ' there');
  const names = ['.env', 'a/.env.local', 'x/private-denylist.txt', 'cloudflare-token.txt', 'k.pem', '05-secrets-and-tokens/a.txt'];
  const namesCaught = names.every((n) => FORBIDDEN_NAME.test(n));
  const caught = hits.slice(before);
  const got = (p) => caught.some((h) => h.startsWith(p));
  const exactOk = !bugitExact.length || got('selftest-bugit-exact');
  console.log(`self-test: fake secret ${got('selftest-secret') ? 'caught' : 'MISSED'}, encoded secret ${got('selftest-encoded') ? 'caught' : 'MISSED'}, BugIt credential value (${bugitExact.length} known) ${exactOk ? 'caught' : 'MISSED'}, denylist term ${got('selftest-denylist') ? 'caught' : 'MISSED'}, forbidden names ${namesCaught ? 'caught' : 'MISSED'}`);
  process.exit(got('selftest-secret') && got('selftest-encoded') && exactOk && got('selftest-denylist') && namesCaught ? 0 : 1);
}

// 1. The live commit: HEAD, proven by the delivery check.
if (git('status', '--porcelain', '--untracked-files=no')) stop('tracked files have uncommitted changes: commit first, so the snapshot names exactly what was built');
const commit = git('rev-parse', 'HEAD');
const short = commit.slice(0, 7);
console.log(`building ${short} and checking it against https://bugit.dev ...`);
const run = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
const b = run(['build.js']); if (b.status !== 0) stop('the build failed: ' + (b.stderr || b.stdout).slice(-400));
const v = run(['scripts/check-live-delivery.mjs']);
if (v.status !== 0) stop(`https://bugit.dev is not serving the build of ${short} (check-live-delivery failed). Deploy it, or check out what is live, then run again.`);
const deployedAt = new Date().toISOString();
console.log(`live commit ${short} (${commit}): every file of its build verified on https://bugit.dev at ${deployedAt}`);
const s = run(['scripts/check-committed-secrets.mjs']);
if (s.status !== 0) stop('scripts/check-committed-secrets.mjs found a credential shape in a tracked file (it names the files; run it directly)');

// 2. The snapshot, in memory first.
const zipName = `bugit-website-${short}.zip`;
const prefix = `bugit-website-${short}/`;
const zip = execFileSync('git', ['archive', '--worktree-attributes', '--format=zip', `--prefix=${prefix}`, commit], { cwd: ROOT, maxBuffer: 1 << 30 });
const zipSha = sha256(zip);
// The entries actually IN the zip, read from its central directory, so the screen covers exactly
// what the reviewer receives rather than what git would list.
const zipEntries = (buf) => {
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) stop('the snapshot is not a readable zip');
  const count = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const names = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) stop('the snapshot zip directory is damaged');
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    names.push(buf.toString('utf8', p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
  }
  return names;
};
const entries = zipEntries(zip);
if (entries.some((n) => !n.startsWith(prefix))) stop('a zip entry sits outside the snapshot folder');
const files = entries.filter((n) => !n.endsWith('/')).map((n) => n.slice(prefix.length));
console.log(`snapshot ${zipName}: ${files.length} files, ${(zip.length / 1024).toFixed(0)} KB, sha256 ${zipSha}`);

// 3. Screening.
let screened = 0, binaries = 0;
for (const f of files) {
  if (FORBIDDEN_NAME.test(f)) { hits.push(`${f}: file name not allowed in a snapshot`); continue; }
  const buf = execFileSync('git', ['show', `${commit}:${f}`], { cwd: ROOT, maxBuffer: 1 << 30 });
  if (buf.includes(0) || BINARY_EXT.test(f)) { // binary: screen the text pulled out of it
    const tmp = path.join(os.tmpdir(), `bugit-audit-drop-${process.pid}${path.extname(f)}`);
    fs.writeFileSync(tmp, buf);
    try { screenText(f + ' (embedded text)', binaryText(tmp).text); binaries++; } catch { hits.push(`${f}: its embedded text could not be read, so it was not screened`); } finally { fs.rmSync(tmp, { force: true }); }
    continue;
  }
  screenText(f, buf.toString('utf8')); screened++;
}

// The brief and the READMEs, generated now and screened before anything is written.
const BRIEF_DIR = path.join(ROOT, 'scripts', 'audit-brief');
const tpl = fs.readFileSync(path.join(BRIEF_DIR, 'EXTERNAL-AUDIT-PROMPT.template.txt'), 'utf8');
const digest = fs.readFileSync(path.join(BRIEF_DIR, 'DIGEST.txt'), 'utf8');
const digestDate = (digest.match(/DIGESTED UP TO:\s*(\d{4}-\d{2}-\d{2})/) || [])[1];
if (!digestDate) stop('scripts/audit-brief/DIGEST.txt has no "DIGESTED UP TO: <date>" line');
const roundDir = path.join(DRIVE, '02-AUDIT-REPORTS', `${today}_${short}`);
const briefPath = path.join(roundDir, 'EXTERNAL-AUDIT-PROMPT.txt');
// --replace-unsent: regenerate a brief no report has come back to yet. Otherwise a rerun appends a round.
const reportsBack = fs.existsSync(roundDir) && fs.readdirSync(roundDir).some((f) => /^AUDIT-(REPORT|FIXES)/i.test(f) || /^\d{4}-\d{2}-\d{2}_[0-9a-f]{7}_external-audit-/.test(f));
if (process.argv.includes('--replace-unsent') && reportsBack) stop('this round already has a report back: its brief cannot be replaced, only appended to');
const existing = fs.existsSync(briefPath) && !process.argv.includes('--replace-unsent') ? fs.readFileSync(briefPath, 'utf8') : null;
const roundNo = existing ? (existing.match(/^ROUND \d+/gm) || []).length + 1 : 1;
const roundBlock = [
  `ROUND ${roundNo}`, '-------', `  Prepared ... ${new Date().toISOString()}`, `  Snapshot ... ${zipName}`, `  SHA256 ..... ${zipSha}`, `  Commit ..... ${commit}`,
  roundNo > 1 ? '  This is a further review of the SAME snapshot as the rounds above.' : '  First review of this snapshot.', '',
].join('\n');
const fill = (t) => t.replaceAll('{{ZIP}}', zipName).replaceAll('{{SHA256}}', zipSha).replaceAll('{{COMMIT}}', commit)
  .replaceAll('{{DEPLOYED}}', deployedAt).replaceAll('{{DIGEST_DATE}}', digestDate).replaceAll('{{DIGEST}}', digest.replace(/^DIGESTED UP TO:.*\r?\n/, '').trim());
const brief = existing ? existing.trimEnd() + '\n\n' + roundBlock : fill(tpl).replace('{{ROUNDS}}', roundBlock);
if (/\{\{[A-Z_]+\}\}/.test(brief)) stop('the brief still has an unfilled {{PLACEHOLDER}}');
const readmeFirst = [
  'README FIRST: the bugit.dev snapshot for external review', '',
  `Snapshot ....... ${zipName}`, `SHA256 ......... ${zipSha}`, `Commit ......... ${commit}`, `Verified live .. ${deployedAt} on https://bugit.dev/`, '',
  'This is `git archive` of the commit that is live: tracked source only, no history, no credentials.',
  'It builds with Node 22 (`npm ci`, then `node build.js` writes dist/), but you do not need to build it.',
  'Read the brief first:',
  `02-AUDIT-REPORTS\\${today}_${short}\\EXTERNAL-AUDIT-PROMPT.txt`, '',
].join('\r\n');
const handover = [
  'HANDOVER: WHAT TO SEND (for the OWNER only; never send this file)', '',
  'Download exactly these files and give them to GPT-6 Astra (the auditor until further notice), in a NEW chat for each review:',
  `  1. 01-DIST-TO-AUDIT\\${zipName}`, `  2. 01-DIST-TO-AUDIT\\${zipName}.sha256`, '  3. 01-DIST-TO-AUDIT\\README-FIRST.txt',
  `  4. 02-AUDIT-REPORTS\\${today}_${short}\\EXTERNAL-AUDIT-PROMPT.txt   (ATTACH it as a file; a paste gets cut off)`, '',
  'Do not share the Drive folder itself, and do not send this file.', '',
  'When the review comes back: drop AUDIT-REPORT.txt and AUDIT-FIXES.txt, unrenamed, into',
  `02-AUDIT-REPORTS\\${today}_${short}\\ and tell Claude "new audit". Claude files, confirms and fixes them.`, '',
  `Screened before placing (${new Date().toISOString()}):`,
  `  ${screened} text files and ${binaries} binary files (their embedded text) of the snapshot, plus the brief and README-FIRST.txt:`,
  '  secret shapes, the owner\'s private identity denylist, the exact values of BugIt\'s local credential files,',
  '  forbidden file names, and this repository\'s own committed-secrets scan.',
  `  Live proof: every file of ${short}'s build was fetched from https://bugit.dev and found byte identical.`,
  `  Result: ${hits.length ? hits.length + ' problem(s): NOT PLACED' : '0 problems'}.`, '',
].join('\r\n');
screenText('EXTERNAL-AUDIT-PROMPT.txt', brief);
screenText('README-FIRST.txt', readmeFirst);
screenText('HANDOVER-WHAT-TO-SEND.txt', handover);
console.log(`screened ${screened} text + ${binaries} binary files + 3 generated files against ${DENY.length} denylist terms and ${exact.length} exact credential values`);
if (hits.length) { hits.slice(0, 40).forEach((h) => console.log('  FAIL  ' + h)); stop(`${hits.length} screening problem(s); nothing written`); }
console.log('screening: 0 problems');

// 4. Place it.
const dist = path.join(DRIVE, '01-DIST-TO-AUDIT');
const plan = [
  `${dist}\\${zipName} (+ .sha256, README-FIRST.txt); older bugit-website-*.zip removed`,
  `${briefPath} (${existing ? 'round ' + roundNo + ' appended' : 'new'})`,
  `${path.join(roundDir, 'HANDOVER-WHAT-TO-SEND.txt')}`,
];
if (!WRITE) { console.log('DRY RUN, would write:\n  ' + plan.join('\n  ') + '\nRe-run with --write.'); process.exit(0); }
if (!fs.existsSync(path.dirname(DRIVE))) stop(`${path.dirname(DRIVE)} is not there: is Google Drive for desktop running? (check the drive letter before believing it is unmounted)`);
fs.mkdirSync(dist, { recursive: true }); fs.mkdirSync(roundDir, { recursive: true });
for (const f of fs.readdirSync(dist)) if (/^bugit-website-[0-9a-f]{7}\.zip(\.sha256)?$/.test(f) && !f.startsWith(`bugit-website-${short}.`)) fs.unlinkSync(path.join(dist, f));
fs.writeFileSync(path.join(dist, zipName), zip);
fs.writeFileSync(path.join(dist, zipName + '.sha256'), `${zipSha}  ${zipName}\r\n`);
fs.writeFileSync(path.join(dist, 'README-FIRST.txt'), readmeFirst);
fs.writeFileSync(briefPath, brief.replace(/\r?\n/g, '\r\n'));
fs.writeFileSync(path.join(roundDir, 'HANDOVER-WHAT-TO-SEND.txt'), handover);
const readme = path.join(DRIVE, 'README.txt');
if (!fs.existsSync(readme)) fs.writeFileSync(readme, [
  'BugIt website (bugit.dev): external review drops', '',
  '01-DIST-TO-AUDIT   ONE snapshot of bugit.dev, the commit that is live, with its sha256 and README-FIRST.txt.',
  '02-AUDIT-REPORTS   one folder per snapshot reviewed: <date>_<commit>\\ holding the brief (EXTERNAL-AUDIT-PROMPT.txt),',
  '                   the owner\'s HANDOVER-WHAT-TO-SEND.txt, and the returned reports.', '',
  'This folder is never shared. To run a review: open HANDOVER-WHAT-TO-SEND.txt in the newest round folder and follow it.',
  'To return a review: drop AUDIT-REPORT.txt and AUDIT-FIXES.txt, unrenamed, into that round folder and tell Claude "new audit".',
  'Claude renames them to <date>_<commit>_external-audit-<reviewer>(-fixes).txt once they are filed; a renamed report is handled.',
  'Made by bugit-website/scripts/audit-drop.mjs. The BugIt agent\'s own drop is in 1-BugIt Google Drive.', '',
].join('\r\n'));
// Read back what was written and compare by hash: a write is not a delivery.
if (sha256(fs.readFileSync(path.join(dist, zipName))) !== zipSha) stop('the zip on the Drive does not match what was built');
console.log('written and read back:\n  ' + plan.join('\n  '));
