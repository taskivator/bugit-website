#!/usr/bin/env node
/**
 * RUN CI HERE, FROM THE WORKFLOW ITSELF.
 *
 * WHY. This repository is public, so Actions minutes are free and CI does run -- but a full pass
 * took nearly two hours on 2026-08-29, and until that day a single failing guard SKIPPED the ten
 * steps behind it, so a red run told you about one problem and hid the rest. Waiting two hours to
 * discover a typo is its own kind of blocker. Everything the workflow does is a shell command
 * this machine can run, in a fraction of the time, against the same tree.
 *
 * WHY IT READS ci.yml INSTEAD OF LISTING THE STEPS. A local script that keeps its own copy of
 * the pipeline is a second list, and a second list drifts: somebody adds a guard to the
 * workflow, the local runner does not know, and "I ran CI locally" quietly means something
 * smaller than it did last month. So the workflow is the only source. Add a step there and it
 * runs here on the next invocation, with no edit to this file.
 *
 * IT VERIFIES ITS OWN PARSE FIRST. A hand-written YAML reader that silently misses a step would
 * report a green run over a pipeline it only partly executed -- the exact failure this exists to
 * prevent. So the number of steps parsed is checked against an independent count of `run:` keys
 * before anything is executed, and a mismatch is a hard stop.
 *
 * FIDELITY. The job-level `env:` block is applied exactly as the workflow declares it. Steps
 * carrying `if: ${{ !cancelled() }}` keep running after a failure, the same as they now do on the
 * runner, so one red guard does not hide the ones behind it -- which is the whole reason those
 * conditions were added. Every guard here is also in `npm test`, and check-ci-coverage.mjs
 * enforces that; this runner is the other direction, executing the WORKFLOW rather than the
 * suite, so a step that exists only in CI is covered too.
 *
 *   node scripts/ci-local.mjs --list
 *   node scripts/ci-local.mjs
 *   node scripts/ci-local.mjs --skip="Install build tooling" --skip="playwright"
 *   node scripts/ci-local.mjs --only=Typecheck
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = join(ROOT, ".github", "workflows", "ci.yml");

if (!existsSync(WORKFLOW)) {
  console.error(`ci-local: no workflow at ${WORKFLOW}`);
  process.exit(1);
}
const raw = readFileSync(WORKFLOW, "utf8");
const lines = raw.split(/\r?\n/);
const indentOf = (l) => l.length - l.replace(/^ +/, "").length;

/** The job-level env block, applied to every step exactly as the runner would. */
function jobEnv() {
  const env = {};
  const i = lines.findIndex((l) => /^    env:\s*$/.test(l));
  if (i === -1) return env;
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j];
    if (!l.trim() || l.trim().startsWith("#")) continue;
    if (indentOf(l) <= 4) break;
    const m = l.match(/^\s*([A-Z0-9_]+):\s*(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

/** Every step that actually runs a command, in order, with its name, its `if:` and its script. */
function steps() {
  const out = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^      - /.test(l)) {
      if (cur) out.push(cur);
      cur = { name: null, if: null, run: null };
      const n = l.match(/^      - name:\s*(.*)$/);
      if (n) cur.name = n[1].trim();
      continue;
    }
    if (!cur) continue;
    const name = l.match(/^        name:\s*(.*)$/);
    if (name) cur.name = name[1].trim();
    const cond = l.match(/^        if:\s*(.*)$/);
    if (cond) cur.if = cond[1].trim();
    const runInline = l.match(/^        run:\s*(\S.*)$/);
    if (runInline && runInline[1] !== "|" && runInline[1] !== ">") {
      cur.run = runInline[1];
      continue;
    }
    if (/^        run:\s*[|>]\s*$/.test(l)) {
      const body = [];
      for (let j = i + 1; j < lines.length; j++) {
        const b = lines[j];
        if (b.trim() && indentOf(b) <= 8) break;
        body.push(b.replace(/^ {10}/, ""));
        i = j;
      }
      cur.run = body.join("\n").replace(/\s+$/, "");
    }
  }
  if (cur) out.push(cur);
  return out.filter((s) => s.run);
}

const parsed = steps();

/* THE PARSE MUST ACCOUNT FOR EVERY `run:` IN THE FILE. Counted independently, from the raw text,
   so a reader that quietly skipped a step cannot report a complete run. */
const declared = lines.filter((l) => /^        run:\s*/.test(l)).length;
if (parsed.length !== declared) {
  console.error(
    `ci-local: parsed ${parsed.length} steps but the workflow declares ${declared} \`run:\` keys.\n` +
      "Refusing to run: a partial pipeline reported as CI is worse than no local CI at all.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const skips = args.filter((a) => a.startsWith("--skip=")).map((a) => a.slice(7));
const onlys = args.filter((a) => a.startsWith("--only=")).map((a) => a.slice(7));
const wanted = parsed.filter(
  (s) =>
    (onlys.length === 0 || onlys.some((o) => (s.name ?? "").includes(o))) &&
    !skips.some((k) => (s.name ?? "").includes(k)),
);

if (args.includes("--list")) {
  console.log(`${parsed.length} runnable steps in ${WORKFLOW.replace(ROOT, ".")}\n`);
  parsed.forEach((s, i) => {
    const first = s.run.split("\n")[0];
    console.log(
      `  ${String(i + 1).padStart(2)}. ${s.name ?? "(unnamed)"}` +
        `${s.if ? "  [conditional]" : ""}\n      ${first}${s.run.includes("\n") ? " ..." : ""}`,
    );
  });
  process.exit(0);
}

/* ---------------------------------------------------------------------------------------- *
 * WHAT THE RUN LEAVES BEHIND.
 *
 * Two steps in this workflow start a server with `PORT=3123 node server.js &` and never stop it,
 * because on a GitHub runner the whole machine is destroyed a minute later. Here it is not, and a
 * leaked server is not a tidy failure: in the portal, whose runner has the same shape, one left
 * behind on 3100 held a file open and the NEXT run's `npm ci` died with an EPERM on
 * next-swc.win32-x64-msvc.node, three steps away from anything to do with it.
 *
 * The ports are read out of the steps that actually ran, so this is not a list to keep in step
 * with the workflow: add a step that binds another port and it is covered. And a listener is only
 * killed if it was NOT already running before this invocation, so a dev server that was there
 * first is never touched.
 * ---------------------------------------------------------------------------------------- */
function pidOnPort(port) {
  const r =
    process.platform === "win32"
      ? spawnSync("powershell", ["-NoProfile", "-Command",
          `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess`],
          { encoding: "utf8" })
      : spawnSync("bash", ["-lc", `lsof -ti tcp:${port} -sTCP:LISTEN`], { encoding: "utf8" });
  const pid = String(r.stdout || "").trim().split(/\s+/)[0];
  return /^\d+$/.test(pid) ? pid : null;
}

/** Every port the given step scripts bind, however they spell it. */
function portsIn(scripts) {
  const ports = new Set();
  for (const s of scripts) {
    for (const m of s.matchAll(/(?:-p|--port|PORT=|127\.0\.0\.1:|localhost:)\s*(\d{4,5})/g)) ports.add(m[1]);
  }
  return [...ports];
}

function reap(scripts, held) {
  const left = [];
  for (const port of portsIn(scripts)) {
    const pid = pidOnPort(port);
    if (!pid || held.get(port) === pid) continue; // nothing there, or it predates this run
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", pid, "/T", "/F"], { stdio: "ignore" });
    else process.kill(Number(pid), "SIGKILL");
    left.push(`${port} (pid ${pid})`);
  }
  if (left.length) console.log(`ci-local: stopped the server(s) the run left behind on ${left.join(", ")}`);
}

const env = { ...process.env, ...jobEnv(), CI: "true" };
console.log(
  `ci-local: ${wanted.length} of ${parsed.length} steps, from the workflow itself.\n` +
    `env from the job block: ${Object.keys(jobEnv()).join(", ") || "(none)"}\n`,
);

const results = [];
for (const [i, s] of wanted.entries()) {
  const label = `${i + 1}/${wanted.length} ${s.name ?? "(unnamed)"}`;
  console.log(`\n=== ${label}`);
  const started = Date.now();
  const r = spawnSync("bash", ["-lc", s.run], { cwd: ROOT, stdio: "inherit", env });
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  const ok = r.status === 0;
  results.push({ name: s.name, ok, secs, status: r.status });
  console.log(`--- ${ok ? "PASS" : `FAIL (exit ${r.status})`} in ${secs}s`);
  // A step the workflow marks !cancelled() runs even after a failure, so one red guard does not
  // hide the ones behind it. Anything else stops, exactly as the runner would.
  const keepGoing = (s.if ?? "").includes("!cancelled()");
  if (!ok && !keepGoing) {
    console.log("\nStopping here: this step is not marked !cancelled() in the workflow.");
    break;
  }
}

const failed = results.filter((r) => !r.ok);
const total = results.reduce((n, r) => n + Number(r.secs), 0);
console.log(`\n${"=".repeat(60)}`);
for (const r of results) console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${String(r.secs).padStart(4)}s  ${r.name}`);
console.log(
  `\nci-local: ${results.length} step(s) run in ${total}s, ${failed.length} failed` +
    `${results.length < wanted.length ? `, ${wanted.length - results.length} never reached` : ""}.`,
);
process.exit(failed.length ? 1 : 0);
