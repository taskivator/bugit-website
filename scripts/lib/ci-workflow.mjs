// Reading .github/workflows/ci.yml, in ONE place, and REFUSING what it cannot model.
//
// WHY THIS FILE EXISTS. Two scripts read the workflow and both used to read it loosely.
// check-ci-coverage.mjs asked `ci.includes("check-x.mjs")`, so a guard named only in a YAML
// comment, in an `echo` string, or in a step that can never run counted as wired. ci-local.mjs
// walked fixed indentation, kept `run:` and `if:` and dropped everything else: a step's own `env:`
// (check-guides-fresh needs one and ran locally without it), the declared shell (the runner uses
// `bash -e`, so a multi-line step stops at its first failing command; locally it ran on and
// reported the LAST command's status), and it "verified" its parse by counting `run:` keys with
// the same indentation assumption the parser made. Two counts from one grammar agree by
// construction, so that check could not fail for the reason it existed.
//
// So this is a STRICT reader of a small, named subset of GitHub Actions YAML. Every non-blank,
// non-comment line of the file must be consumed by a construct this reader models; anything else
// is a hard error naming the line. That replaces "count the run: keys" with a stronger claim:
// there is no line in the workflow this reader skipped. Supporting a new construct is an edit
// here, made on purpose, instead of a silent difference between CI and the local run.
//
// No YAML dependency, deliberately: this repository has no runtime dependencies and its dev
// dependencies are esbuild and playwright. A general parser would also accept (and so let the
// callers silently ignore) keys whose semantics they do not implement, which is the defect.
//
// The subset:
//   top level   name, on, concurrency, permissions (opaque: they choose WHEN CI runs, not what
//               it runs), env (a flat KEY: value map), jobs
//   a job       runs-on, name, timeout-minutes, permissions (opaque), env, steps
//   a step      name, id, if, run, uses, with (a flat map), env
//   run         a plain one-line scalar, or a `|` / `|-` literal block. `>` folds lines into one
//               and is refused rather than guessed.
//   if          see classifyCondition below.
// Refused on purpose, because a local runner that ignores them runs something different:
//   shell, working-directory, continue-on-error, defaults, needs, strategy, services,
//   container, a job-level `if`, and any `${{ }}` expression outside an `if:`.

const TOP_KEYS = new Set(["name", "on", "concurrency", "permissions", "env", "jobs"]);
const TOP_OPAQUE = new Set(["on", "concurrency", "permissions"]);
const JOB_KEYS = new Set(["runs-on", "name", "timeout-minutes", "permissions", "env", "steps"]);
const STEP_KEYS = new Set(["name", "id", "if", "run", "uses", "with", "env"]);

class WorkflowError extends Error {}

const indentOf = (l) => l.length - l.replace(/^ +/, "").length;
const isSkippable = (l) => !l.trim() || /^\s*#/.test(l);

/** A YAML scalar written inline after `key:`. Plain, or simply quoted; anything cleverer is refused. */
function scalar(raw, where) {
  const v = raw.trim();
  if (v.startsWith('"')) {
    const m = v.match(/^"([^"\\]*)"\s*(?:#.*)?$/);
    if (!m) throw new WorkflowError(`${where}: a double-quoted value with escapes or trailing text is not modelled`);
    return m[1];
  }
  if (v.startsWith("'")) {
    const m = v.match(/^'([^']*)'\s*(?:#.*)?$/);
    if (!m) throw new WorkflowError(`${where}: a single-quoted value with escapes or trailing text is not modelled`);
    return m[1];
  }
  if (/^[&*!|>{[]/.test(v)) throw new WorkflowError(`${where}: YAML anchors, tags, flow collections and block indicators are not modelled here`);
  // In a plain scalar, ` #` starts a comment. The old reader kept it as part of the command.
  return v.replace(/\s+#.*$/, "");
}

/**
 * Parse the workflow text. Returns { env, jobs: [{ id, env, steps: [{ line, name, id, if, run,
 * uses, with, env }] }] }. Throws WorkflowError on anything outside the subset.
 */
export function parseWorkflow(text) {
  const lines = text.split(/\r?\n/);
  const tab = lines.findIndex((l) => /^ *\t/.test(l));
  if (tab !== -1) throw new WorkflowError(`ci.yml line ${tab + 1}: a TAB in indentation is not YAML`);
  const wf = { env: {}, jobs: [] };
  let i = 0;
  const at = (n) => `ci.yml line ${n + 1}`;

  /** Consume every line indented deeper than `base`, verbatim (for opaque sections and maps). */
  function childrenOf(base) {
    const out = [];
    while (i < lines.length && (isSkippable(lines[i]) || indentOf(lines[i]) > base)) {
      if (!isSkippable(lines[i])) out.push(i);
      i++;
    }
    return out;
  }

  /** A flat `KEY: value` map whose entries sit at exactly one indent deeper than `base`. */
  function flatMap(base, what) {
    const map = {};
    const kids = childrenOf(base);
    const depth = kids.length ? indentOf(lines[kids[0]]) : 0;
    for (const n of kids) {
      const l = lines[n];
      if (indentOf(l) !== depth) throw new WorkflowError(`${at(n)}: nested values inside ${what} are not modelled`);
      const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
      if (!m || !m[2].trim()) throw new WorkflowError(`${at(n)}: ${what} must be flat KEY: value pairs`);
      const v = scalar(m[2], at(n));
      if (v.includes("${{")) throw new WorkflowError(`${at(n)}: an expression in ${what} is not modelled`);
      map[m[1]] = v;
    }
    return map;
  }

  /** The body of a `run: |` literal block, indentation removed. */
  function literalBlock(keyIndent, n) {
    const body = [];
    let content = -1;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) { body.push(""); i++; continue; }
      const ind = indentOf(l);
      if (content === -1) {
        if (ind <= keyIndent) break;
        content = ind;
      }
      if (ind < content) {
        if (ind > keyIndent && !/^\s*#/.test(l)) throw new WorkflowError(`${at(i)}: under-indented line inside a run block`);
        break;
      }
      body.push(l.slice(content));
      i++;
    }
    const script = body.join("\n").replace(/\s+$/, "");
    if (!script) throw new WorkflowError(`${at(n)}: empty run block`);
    return script;
  }

  function parseSteps(base) {
    const steps = [];
    let itemIndent = -1;
    while (i < lines.length) {
      const l = lines[i];
      if (isSkippable(l)) { i++; continue; }
      const ind = indentOf(l);
      if (ind <= base) break;
      const item = l.match(/^(\s*)- (.*)$/);
      if (!item) throw new WorkflowError(`${at(i)}: expected a step ("- key: value")`);
      if (itemIndent === -1) itemIndent = ind;
      if (ind !== itemIndent) throw new WorkflowError(`${at(i)}: step items at inconsistent indentation`);
      const step = { line: i + 1, name: null, id: null, if: null, run: null, uses: null, with: {}, env: {} };
      const keyIndent = ind + 2;
      // The first key sits on the `- ` line; the rest at keyIndent.
      lines[i] = " ".repeat(keyIndent) + item[2];
      while (i < lines.length) {
        const kl = lines[i];
        if (isSkippable(kl)) { i++; continue; }
        const kind = indentOf(kl);
        if (kind < keyIndent) break;
        if (kind > keyIndent) throw new WorkflowError(`${at(i)}: unexpected indentation inside a step`);
        const m = kl.match(/^\s*([A-Za-z-]+):(?:\s+(.*))?$/);
        if (!m) throw new WorkflowError(`${at(i)}: expected "key: value" inside a step`);
        const [, key, rest = ""] = m;
        if (!STEP_KEYS.has(key)) {
          throw new WorkflowError(`${at(i)}: step key "${key}" is not modelled (it would change what runs or how)`);
        }
        const n = i;
        i++;
        if (key === "with" || key === "env") {
          if (rest.trim()) throw new WorkflowError(`${at(n)}: inline ${key} maps are not modelled`);
          step[key] = flatMap(keyIndent, `a step's ${key}`);
          continue;
        }
        if (key === "run" && /^[|>]/.test(rest.trim())) {
          if (!/^\|-?\s*(?:#.*)?$/.test(rest.trim())) throw new WorkflowError(`${at(n)}: only "|" and "|-" run blocks are modelled; ">" folds lines and is refused`);
          step.run = literalBlock(keyIndent, n);
          continue;
        }
        if (!rest.trim()) throw new WorkflowError(`${at(n)}: "${key}" has no value`);
        step[key] = scalar(rest, at(n));
      }
      if (!step.run === !step.uses) throw new WorkflowError(`${at(step.line - 1)}: a step needs exactly one of run: or uses:`);
      if (step.run && step.run.includes("${{")) throw new WorkflowError(`${at(step.line - 1)}: an expression inside run: is not modelled`);
      if (step.run && Object.keys(step.with).length) throw new WorkflowError(`${at(step.line - 1)}: with: on a run step is not modelled`);
      steps.push(step);
    }
    return steps;
  }

  function parseJob(id, base) {
    const job = { id, env: {}, steps: [] };
    let sawSteps = false;
    while (i < lines.length) {
      const l = lines[i];
      if (isSkippable(l)) { i++; continue; }
      const ind = indentOf(l);
      if (ind <= base) break;
      const m = l.match(/^\s*([A-Za-z-]+):(?:\s+(.*))?$/);
      if (!m) throw new WorkflowError(`${at(i)}: expected a job key`);
      const [, key, rest = ""] = m;
      if (!JOB_KEYS.has(key)) throw new WorkflowError(`${at(i)}: job key "${key}" is not modelled (it would change what runs or when)`);
      i++;
      if (key === "steps") { job.steps = parseSteps(ind); sawSteps = true; }
      else if (key === "env") job.env = flatMap(ind, "the job env");
      else if (key === "permissions") { if (!rest.trim()) childrenOf(ind); }
      else if (!rest.trim()) throw new WorkflowError(`${at(i - 1)}: "${key}" has no value`);
    }
    if (!sawSteps || !job.steps.length) throw new WorkflowError(`job "${id}" has no steps`);
    return job;
  }

  while (i < lines.length) {
    const l = lines[i];
    if (isSkippable(l)) { i++; continue; }
    if (indentOf(l) !== 0) throw new WorkflowError(`${at(i)}: unexpected indentation at the top level`);
    const m = l.match(/^([A-Za-z-]+):(?:\s+(.*))?$/);
    if (!m) throw new WorkflowError(`${at(i)}: expected a top-level key`);
    const [, key, rest = ""] = m;
    if (!TOP_KEYS.has(key)) throw new WorkflowError(`${at(i)}: top-level key "${key}" is not modelled`);
    i++;
    if (TOP_OPAQUE.has(key)) { if (!rest.trim()) childrenOf(0); continue; }
    if (key === "name") continue;
    if (key === "env") { wf.env = flatMap(0, "the workflow env"); continue; }
    // jobs
    while (i < lines.length) {
      const jl = lines[i];
      if (isSkippable(jl)) { i++; continue; }
      if (indentOf(jl) === 0) break;
      const jm = jl.match(/^(\s+)([A-Za-z0-9_-]+):\s*$/);
      if (!jm) throw new WorkflowError(`${at(i)}: expected a job id`);
      i++;
      wf.jobs.push(parseJob(jm[2], jm[1].length));
    }
  }
  if (!wf.jobs.length) throw new WorkflowError("the workflow declares no jobs");
  const seen = new Set();
  for (const job of wf.jobs) {
    for (const s of job.steps) {
      if (!s.id) continue;
      if (seen.has(`${job.id}/${s.id}`)) throw new WorkflowError(`step id "${s.id}" is declared twice in job "${job.id}"`);
      seen.add(`${job.id}/${s.id}`);
    }
  }
  return wf;
}

/* CONDITIONS. The supported grammar is a conjunction (&&) of these terms, optionally wrapped in
 * ${{ }}:
 *   !cancelled()   always()   success()
 *   steps.<id>.outcome == 'success'      steps.<id>.conclusion == 'success'
 * As on the runner, an expression with no status function in it is implicitly ANDed with
 * success(). Anything else -- `false`, `failure()`, `||`, a github.* context, a comparison to
 * anything but 'success' -- is UNSUPPORTED, and a caller must refuse it or treat the step as
 * unreachable, never guess. Returns { ok, error?, needsSuccess, stepRefs, text }. */
export function classifyCondition(expr) {
  if (expr == null) return { ok: true, needsSuccess: true, stepRefs: [], text: "(none: success())" };
  let e = expr.trim();
  const wrapped = e.match(/^\$\{\{([\s\S]*)\}\}$/);
  if (wrapped) e = wrapped[1].trim();
  if (e.includes("${{")) return { ok: false, error: `nested expression in if: ${expr}` };
  const terms = e.split("&&").map((t) => t.trim());
  let statusFn = false;
  let needsSuccess = false;
  const stepRefs = [];
  for (const t of terms) {
    if (/^!\s*cancelled\(\)$/.test(t) || t === "always()") { statusFn = true; continue; }
    if (t === "success()") { statusFn = true; needsSuccess = true; continue; }
    const m = t.match(/^steps\.([A-Za-z0-9_-]+)\.(?:outcome|conclusion)\s*==\s*'success'$/);
    if (m) { stepRefs.push(m[1]); continue; }
    return { ok: false, error: `condition term "${t}" is not modelled (in: ${expr})` };
  }
  if (!statusFn) needsSuccess = true;
  return { ok: true, needsSuccess, stepRefs, text: e };
}

/** Evaluate a classified condition. `failedSoFar` = an earlier step of the job failed;
 *  `outcomes` = Map(step id -> "success" | "failure" | "skipped"). */
export function evaluateCondition(c, failedSoFar, outcomes) {
  if (c.needsSuccess && failedSoFar) return false;
  return c.stepRefs.every((id) => outcomes.get(id) === "success");
}

/* SHELL COMMANDS. What a run: script INVOKES, as opposed to what it merely mentions. A line is
 * dropped if it is a shell comment; a trailing ` # ...` is dropped; the rest is split on the
 * command separators (; && || | &) and a segment counts only if it STARTS with the command,
 * optionally after VAR=value assignments. So `echo "node scripts/check-x.mjs"` does not count,
 * and neither does `# node scripts/check-x.mjs`. Nor does `then node scripts/check-x.mjs` inside
 * an if/fi: that is deliberately conservative -- a real invocation this cannot see makes the
 * coverage guard fail loudly, which is the safe direction. */
export function commandSegments(script) {
  const joined = script.replace(/\\\n/g, " ");
  const segs = [];
  for (const raw of joined.split("\n")) {
    if (/^\s*#/.test(raw)) continue;
    const line = raw.replace(/(^|\s)#.*$/, "");
    for (const s of line.split(/&&|\|\||;|\||&/)) if (s.trim()) segs.push(s.trim());
  }
  return segs;
}

const ENV_PREFIX = String.raw`(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*`;
const NODE_SCRIPT = new RegExp(`^${ENV_PREFIX}node\\s+scripts/([A-Za-z0-9._-]+\\.mjs)(?:\\s|$)`);
const PW_INSTALL = new RegExp(`^${ENV_PREFIX}npx\\s+playwright\\s+install(?:\\s+(.*))?$`);
export const ENGINES = ["chromium", "firefox", "webkit"];

/** Every scripts/*.mjs the script runs with `node`, in order. */
export function nodeScriptsInvoked(script) {
  return commandSegments(script).map((s) => s.match(NODE_SCRIPT)?.[1]).filter(Boolean);
}

/** The engines a `npx playwright install ...` in this script provides (all three if it names none). */
export function playwrightEnginesInstalled(script) {
  const got = new Set();
  for (const s of commandSegments(script)) {
    const m = s.match(PW_INSTALL);
    if (!m) continue;
    const named = (m[1] || "").split(/\s+/).filter((a) => a && !a.startsWith("-"));
    for (const e of named.length ? named.filter((a) => ENGINES.includes(a)) : ENGINES) got.add(e);
  }
  return got;
}

/* THE SUITES ARRAY IN scripts/test-all.mjs, read as an array rather than grepped as text. The old
 * reader took every quoted "check-*.mjs" ANYWHERE in the file, so a suite named in a comment, or
 * in a string that is never run, counted as a suite. This finds `const SUITES = [`, walks to its
 * closing bracket skipping // and block comments, and accepts nothing inside it but plain string
 * literals and commas. A computed entry, a spread or a template is refused rather than guessed. */
export function parseSuitesArray(src) {
  const start = src.indexOf("const SUITES = [");
  if (start === -1 || src.indexOf("const SUITES = [", start + 1) !== -1) {
    throw new WorkflowError("test-all.mjs must declare `const SUITES = [` exactly once");
  }
  const out = [];
  let i = start + "const SUITES = [".length;
  for (;;) {
    if (i >= src.length) throw new WorkflowError("test-all.mjs SUITES has no closing bracket");
    const c = src[i];
    if (/\s|,/.test(c)) { i++; continue; }
    if (c === "]") break;
    if (src.startsWith("//", i)) { const nl = src.indexOf("\n", i); i = nl === -1 ? src.length : nl; continue; }
    if (src.startsWith("/*", i)) { const end = src.indexOf("*/", i + 2); if (end === -1) throw new WorkflowError("unterminated comment in SUITES"); i = end + 2; continue; }
    if (c === '"' || c === "'") {
      const end = src.indexOf(c, i + 1);
      const lit = end === -1 ? "" : src.slice(i + 1, end);
      if (end === -1 || /[\\\n]/.test(lit)) throw new WorkflowError("a SUITES entry is not a plain string literal");
      out.push(lit);
      i = end + 1;
      continue;
    }
    throw new WorkflowError(`SUITES holds something that is not a string literal, near: ${src.slice(i, i + 40).split("\n")[0]}`);
  }
  // ...and the array has to be what the runner iterates, with each entry run as scripts/<entry>.
  const code = src.split("\n").filter((l) => !/^\s*(\/\/|\/?\*)/.test(l)).join("\n");
  const loop = code.match(/for\s*\(\s*const\s+(\w+)\s+of\s+SUITES\s*\)/);
  if (!loop || !new RegExp(`"scripts/"\\s*\\+\\s*${loop[1]}\\b`).test(code)) {
    throw new WorkflowError("test-all.mjs no longer runs each SUITES entry as scripts/<entry>");
  }
  return out;
}

export { WorkflowError };
