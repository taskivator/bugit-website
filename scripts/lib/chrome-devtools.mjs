/* WAITING FOR CHROME'S DEVTOOLS ENDPOINT, AND SAYING WHICH WAY IT FAILED.
 *
 * THE INCIDENT. On 2026-09-04 `check-overflow.mjs` failed in CI with
 *
 *     check-overflow: Chrome DevTools endpoint never came up.
 *
 * and passed on the same commit locally with 3300 assertions over 3,037,150 element
 * measurements. The wait was `for (let i = 0; i < 80; i++)` with a 150ms sleep: twelve
 * seconds, chosen against a machine where Chrome is already warm. A hosted runner cold-starts
 * it from disk on a shared CPU, so twelve seconds is a coin toss there, and the guard came
 * back red for a reason that has nothing to do with the page it guards. A gate that flakes is
 * a gate people learn to re-run instead of read, which costs more than the gate is worth.
 *
 * TWO FAILURES WORE ONE SENTENCE. "Never came up" covered both "Chrome is still starting" and
 * "Chrome is already dead" -- a missing shared library, a rejected flag, a port in use. Those
 * need opposite responses: the first is a slow machine, the second is a real defect that
 * re-running will reproduce forever. The old code could not tell them apart because it threw
 * Chrome's stderr away (`stdio: 'ignore'`) and never watched the child for an exit.
 *
 * SO: sixty seconds, and the diagnosis is whatever was actually observed. If the child has
 * exited, that is reported with its code and its own last words. If it is alive and silent,
 * that is reported as what it is. Neither message asserts a cause it did not establish.
 *
 * Callers must spawn with stderr piped -- `stdio: ['ignore', 'ignore', 'pipe']` -- or the
 * second case loses the only evidence it has.
 */

// EXPORTED so the guard can assert the number rather than only the mechanism. The incident
// was a ceiling of 12s (80 polls x 150ms); anything back under ~30s reopens it.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_TIMEOUT_MS = 60_000;
const POLL_MS = 150;
// One attempt's ceiling. Well under DEFAULT_TIMEOUT_MS so a hung socket costs a few seconds and
// then the loop asks again, rather than spending the whole budget inside one await. DevTools on
// loopback answers in single-digit milliseconds when it answers at all.
const ATTEMPT_MS = 5_000;

/** `p`, but rejecting if it has not settled within `ms`. */
function withTimeout(p, ms, message) {
  let timer;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
  ]);
}
const STDERR_KEEP = 4000; // enough for a loader error; bounded so a chatty Chrome cannot eat memory

/**
 * Wait for a spawned Chrome to answer /json/version, or throw an Error saying which way it failed.
 *
 * @param {import('node:child_process').ChildProcess} child  the spawned browser
 * @param {number} port                                      its --remote-debugging-port
 * @param {{ name?: string, timeoutMs?: number }} [opts]
 * @returns {Promise<object>} the parsed /json/version payload
 */
export async function waitForDevTools(child, port, opts = {}) {
  const name = opts.name || "check";
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;

  let stderr = "";
  if (child.stderr) {
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-STDERR_KEEP);
    });
  }

  // Recorded rather than polled: `child.exitCode` is null while running and a number after,
  // but the 'exit' event is what carries a SIGNAL kill, which has no exit code at all.
  let exited = null;
  child.on("exit", (code, signal) => { exited = { code, signal }; });

  // WHOSE CHROME ANSWERED? The port is a fixed number in each caller (9411, 9416), and this used
  // to return the first parseable reply that came back on it. A browser left behind by a killed
  // run — which happens here — is listening on that same port, so the guard would adopt it,
  // measure a page it does not own, and report green about a window it never opened. The fresh
  // `--user-data-dir` the caller made was bypassed entirely.
  //
  // Chrome writes DevToolsActivePort INSIDE the profile directory once it is listening, and each
  // caller mkdtemps a new one per run, so a file there is proof the answer came from our child.
  // A leftover browser has a different profile and cannot produce it.
  const userDataDir = opts.userDataDir || null;
  const ownsEndpoint = () => {
    if (!userDataDir) return true;
    try {
      const raw = readFileSync(join(userDataDir, "DevToolsActivePort"), "utf8");
      return Number(raw.split("\n")[0].trim()) === Number(port);
    } catch {
      return false;
    }
  };

  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  let sawForeignEndpoint = false;
  while (Date.now() < deadline) {
    try {
      // BOUNDED, BECAUSE THE LOOP CONDITION ONLY BOUNDS LOOP ENTRY. `while (Date.now() <
      // deadline)` is checked before an attempt and never again, so a socket that accepts the
      // connection and then never answers -- a half-open connection, a process stopped at a
      // breakpoint, something else entirely holding the port -- parks inside this `await`
      // forever. The guard then hangs rather than failing, which in CI is a forty-minute job
      // timeout reported as `cancelled` with nothing saying why. The remaining time is the
      // budget, so no attempt can outlive the deadline it was started under.
      const left = deadline - Date.now();
      if (left <= 0) break;
      const res = await fetch(`http://127.0.0.1:${port}/json/version`,
                              { signal: AbortSignal.timeout(Math.min(left, ATTEMPT_MS)) });
      // The body read is bounded too. A response whose headers arrive and whose body does not
      // is the same hang one line later, and it is the likelier half: the headers are what a
      // listening socket produces cheaply.
      const payload = await withTimeout(res.json(), Math.min(left, ATTEMPT_MS),
                                        `${name}: the DevTools reply on port ${port} never finished`);
      if (ownsEndpoint()) return payload;
      // Something is listening, and it is not ours. Keep waiting: our child may still be coming
      // up, and saying so at the end is more useful than timing out with no explanation.
      sawForeignEndpoint = true;
    } catch (err) {
      lastError = err;
    }
    // Checked AFTER the fetch attempt, not before: a browser that starts, answers and exits
    // immediately would otherwise be reported as dead when it had in fact done its job.
    if (exited) {
      throw new Error(
        `${name}: Chrome exited before its DevTools endpoint came up ` +
        `(${exited.signal ? `signal ${exited.signal}` : `exit code ${exited.code}`}). ` +
        `This reproduces on every run; it is not a slow machine.` +
        (stderr.trim() ? `\nChrome said:\n${stderr.trim()}` : "\nChrome said nothing on stderr."),
      );
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  if (sawForeignEndpoint) {
    throw new Error(
      `${name}: port ${port} is answering, but the browser on it is NOT the one this run ` +
      `started. Its profile at ${userDataDir} never wrote a DevToolsActivePort for that port. ` +
      `Almost always a Chrome left behind by an earlier killed run. Close it and run again. ` +
      `Adopting it would have measured a window this guard does not own and reported the result ` +
      `as if it did.`,
    );
  }

  throw new Error(
    `${name}: Chrome is still running but did not open its DevTools endpoint on port ${port} ` +
    `within ${Math.round(timeoutMs / 1000)}s` +
    (lastError ? ` (last attempt: ${lastError.message})` : "") +
    (stderr.trim() ? `\nChrome said:\n${stderr.trim()}` : ""),
  );
}
