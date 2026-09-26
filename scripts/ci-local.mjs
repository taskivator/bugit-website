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
 * IT REFUSES WHAT IT CANNOT MODEL, BEFORE RUNNING ANYTHING. The first version of this file read
 * a narrow indentation shape, kept `run:` and `if:` and dropped the rest, then "verified" itself
 * by counting `run:` keys with the same indentation rule -- two counts from one grammar, which
 * agree by construction. What it dropped mattered: check-guides-fresh's step sets its own `env:`
 * and ran here without it, every step ran under `bash -c` where the runner uses `bash -e` (so a
 * ten-guard step whose first guard failed reported the tenth guard's PASS), and after a failure
 * it consulted the FAILED step's condition instead of each later step's. The workflow is now read
 * by scripts/lib/ci-workflow.mjs, which must consume every line of the file and throws on any
 * construct it does not implement (a step's shell or working-directory, continue-on-error, job
 * needs or conditions, folded run blocks, expressions in run or env, unknown `uses:` actions).
 * A partial pipeline reported as CI is worse than no local CI at all.
 *
 * FIDELITY, STATED AS WHAT IT IS. Workflow, job and step `env:` are applied in that order, as on
 * the runner. Every step's `if:` is evaluated in turn against what has happened so far: a plain
 * step is skipped once anything failed, a `!cancelled()` step still runs, and
 * `steps.<id>.outcome == 'success'` reads the real outcome of that earlier step. Each script runs
 * under `bash -e`, the runner's default for an unspecified shell. The two `uses:` steps are not
 * executed: actions/checkout because this tree IS the checkout, and actions/setup-node because
 * the local node is used, with a warning when its major version differs from the declared one.
 * When --only/--skip deselects a step that a later condition reads, the condition treats it as
 * having succeeded and the plan says so, because the tree you are standing on is its result.
 *
 * WHAT THE RUN LEAVES BEHIND. Two steps start a server with `PORT=312x node server.js &` and never
 * stop it, because on a runner the machine is destroyed a minute later. Here it is not, and a
 * leaked server is not a tidy failure: in the portal, whose runner has the same shape, one left
 * behind held a file open and the NEXT run's `npm ci` died with an EPERM three steps away from
 * anything to do with it. This file used to define a port-based reaper and never call it, and had
 * it been called it would have killed whatever new listener appeared on a port, owned or not. Now
 * each script runs with an EXIT trap that stops the background jobs of THAT shell (`jobs -p`),
 * which are provably ours, on success, on failure and on Ctrl+C. Nothing is ever killed because
 * of the port it holds. A listener that is still on a step's port afterwards and was not there
 * before is REPORTED, with its pid, and left alone.
 *
 *   node scripts/ci-local.mjs --list          validate the workflow and print the plan; runs nothing
 *   node scripts/ci-local.mjs
 *   node scripts/ci-local.mjs --skip="Install build tooling" --skip="playwright"
 *   node scripts/ci-local.mjs --only="Secret scan"
 *
 * An empty selection is refused: zero steps run is not a pass. CI_LOCAL_WORKFLOW=<path> reads a
 * planted copy of the workflow instead, to prove a refusal without editing ci.yml.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseWorkflow, classifyCondition, evaluateCondition } from "./lib/ci-workflow.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// CI_LOCAL_WORKFLOW points this at a planted copy, to prove a refusal without editing ci.yml.
const WORKFLOW = process.env.CI_LOCAL_WORKFLOW || join(ROOT, ".github", "workflows", "ci.yml");

const refuse = (why) => {
  console.error(`ci-local: ${why}\nRefusing to run: a partial or different pipeline reported as CI is worse than no local CI at all.`);
  process.exit(1);
};

if (!existsSync(WORKFLOW)) refuse(`no workflow at ${WORKFLOW}`);
let wf;
try {
  wf = parseWorkflow(readFileSync(WORKFLOW, "utf8"));
} catch (e) {
  refuse(`the workflow uses something this runner does not model: ${e.message}`);
}
if (wf.jobs.length !== 1) refuse(`the workflow has ${wf.jobs.length} jobs; this runner models exactly one (no needs:, no parallel machines)`);
const job = wf.jobs[0];

const MODELLED_ACTIONS = /^actions\/(checkout|setup-node)@/;
const steps = job.steps.map((s, i) => {
  const cond = classifyCondition(s.if);
  if (!cond.ok) refuse(`step at ci.yml line ${s.line}: ${cond.error}`);
  const earlier = new Set(job.steps.slice(0, i).map((p) => p.id).filter(Boolean));
  const dangling = cond.stepRefs.filter((id) => !earlier.has(id));
  if (dangling.length) refuse(`step at ci.yml line ${s.line} reads steps.${dangling[0]}, which no earlier step declares`);
  if (s.uses && !MODELLED_ACTIONS.test(s.uses)) refuse(`step at ci.yml line ${s.line} uses ${s.uses}, which cannot be run or stood in for locally`);
  return { ...s, cond, label: s.name ?? (s.uses ? `uses ${s.uses}` : "(unnamed)") };
});

const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== "--list" && !a.startsWith("--skip=") && !a.startsWith("--only="));
if (unknown.length) refuse(`unknown argument(s): ${unknown.join(" ")}`);
const skips = args.filter((a) => a.startsWith("--skip=")).map((a) => a.slice(7));
const onlys = args.filter((a) => a.startsWith("--only=")).map((a) => a.slice(7));
const runnable = steps.filter((s) => s.run);
for (const s of runnable) {
  s.selected = (onlys.length === 0 || onlys.some((o) => (s.name ?? "").includes(o))) && !skips.some((k) => (s.name ?? "").includes(k));
}
const wanted = runnable.filter((s) => s.selected);
if (!wanted.length) refuse(`the selection (${args.join(" ") || "none"}) matches none of the ${runnable.length} run steps`);

const assumed = new Set();
for (const s of wanted) {
  for (const id of s.cond.stepRefs) {
    const ref = steps.find((p) => p.id === id);
    if (ref && ref.run && !ref.selected) assumed.add(`steps.${id} ("${ref.label}")`);
  }
}

const env = { ...process.env, ...wf.env, ...job.env, CI: "true" };
const nodeMajor = process.versions.node.split(".")[0];

function printPlan() {
  console.log(`ci-local: job "${job.id}" in ${WORKFLOW.replace(ROOT, ".")}: ${wanted.length} of ${runnable.length} run steps selected\n`);
  steps.forEach((s, i) => {
    const mark = s.uses ? "stand-in" : s.selected ? "run" : "deselected";
    const first = s.run ? s.run.split("\n")[0] : s.uses;
    console.log(`  ${String(i + 1).padStart(2)}. [${mark}] ${s.label}${s.if ? `\n      if: ${s.cond.text}` : ""}`);
    if (Object.keys(s.env).length) console.log(`      env: ${Object.keys(s.env).join(", ")}`);
    console.log(`      ${first}${s.run && s.run.includes("\n") ? " ..." : ""}`);
  });
  const envKeys = [...Object.keys(wf.env), ...Object.keys(job.env)];
  console.log(`\nworkflow/job env: ${envKeys.join(", ") || "(none)"}; every script runs under bash -e`);
  for (const a of assumed) console.log(`note: ${a} is deselected; conditions reading it treat it as succeeded`);
}

if (args.includes("--list")) {
  printPlan();
  process.exit(0);
}

/* Listeners, for REPORTING only. Read before and after a step on the ports its script names;
 * a new one that survives the step's own cleanup is printed and never killed, because a port is
 * not proof of who started the process holding it. */
function pidOnPort(port) {
  const r =
    process.platform === "win32"
      ? spawnSync("powershell", ["-NoProfile", "-Command",
          `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess`],
          { encoding: "utf8" })
      : spawnSync("bash", ["-c", `lsof -ti tcp:${port} -sTCP:LISTEN`], { encoding: "utf8" });
  const pid = String(r.stdout || "").trim().split(/\s+/)[0];
  return /^\d+$/.test(pid) ? pid : null;
}
const portsIn = (script) => [...new Set([...script.matchAll(/(?:--port[= ]|PORT=|127\.0\.0\.1:|localhost:)(\d{4,5})/g)].map((m) => m[1]))];

/* The EXIT trap is the ownership boundary: `jobs -p` lists only the background jobs this shell
 * started. INT and TERM are turned into exits so the trap also runs on Ctrl+C. The trap does not
 * change the step's exit status. */
const OWNED_CLEANUP = [
  "__ci_local_stop_own_jobs() { local p; p=$(jobs -p); if [ -n \"$p\" ]; then kill $p 2>/dev/null || true; fi; }",
  "trap __ci_local_stop_own_jobs EXIT",
  "trap 'exit 130' INT",
  "trap 'exit 143' TERM",
].join("\n");

printPlan();
const results = [];
const outcomes = new Map();
let failedSoFar = false;
let interrupted = false;
for (const s of steps) {
  if (interrupted) break;
  if (s.uses) {
    let note = "not run here: this tree is the checkout";
    if (/^actions\/setup-node@/.test(s.uses)) {
      const want = String(s.with["node-version"] ?? "");
      note = `not run here: using local node ${process.versions.node}`;
      if (want && want.split(".")[0] !== nodeMajor) note += ` -- WARNING: the workflow pins node ${want}`;
    }
    results.push({ name: s.label, state: "STAND-IN", secs: 0, note });
    if (s.id) outcomes.set(s.id, "success");
    continue;
  }
  if (!s.selected) {
    if (s.id) outcomes.set(s.id, "success"); // stated in the plan as an assumption
    results.push({ name: s.label, state: "DESELECTED", secs: 0 });
    continue;
  }
  if (!evaluateCondition(s.cond, failedSoFar, outcomes)) {
    if (s.id) outcomes.set(s.id, "skipped");
    results.push({ name: s.label, state: "SKIPPED", secs: 0, note: `if: ${s.cond.text}` });
    console.log(`\n=== SKIPPED by its condition: ${s.label}`);
    continue;
  }
  console.log(`\n=== ${s.label}`);
  const ports = portsIn(s.run);
  const before = new Map(ports.map((p) => [p, pidOnPort(p)]));
  const started = Date.now();
  const r = spawnSync("bash", ["-l", "-e", "-c", `${OWNED_CLEANUP}\n${s.run}`], {
    cwd: ROOT, stdio: "inherit", env: { ...env, ...s.env },
  });
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  const ok = r.status === 0;
  if (r.status === 130 || r.signal === "SIGINT") interrupted = true;
  for (const p of ports) {
    const now = pidOnPort(p);
    if (now && now !== before.get(p)) {
      console.log(`ci-local: WARNING port ${p} is still held by pid ${now} after this step. It was not killed: ` +
        "a port does not prove this run started it. Stop it yourself if it is ours.");
    }
  }
  results.push({ name: s.label, state: ok ? "PASS" : `FAIL (exit ${r.status ?? r.signal})`, secs, ok });
  console.log(`--- ${ok ? "PASS" : `FAIL (exit ${r.status ?? r.signal})`} in ${secs}s`);
  if (s.id) outcomes.set(s.id, ok ? "success" : "failure");
  if (!ok) failedSoFar = true;
}

const ran = results.filter((r) => "ok" in r);
const failed = ran.filter((r) => !r.ok);
const total = ran.reduce((n, r) => n + Number(r.secs), 0);
console.log(`\n${"=".repeat(60)}`);
for (const r of results) console.log(`  ${r.state.padEnd(10)} ${String(r.secs).padStart(4)}s  ${r.name}${r.note ? `  (${r.note})` : ""}`);
const skipped = results.filter((r) => r.state === "SKIPPED").length;
console.log(
  `\nci-local: ${ran.length} of ${wanted.length} selected step(s) run in ${total}s, ${failed.length} failed` +
    `${skipped ? `, ${skipped} skipped by their conditions` : ""}${interrupted ? ", INTERRUPTED" : ""}.`,
);
process.exit(failed.length || interrupted || ran.length === 0 ? 1 : 0);
