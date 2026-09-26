/* THE WEDGE THAT STOPPED 28 SUITES, PROVED IN A SECOND INSTEAD OF DESCRIBED IN A COMMENT.
 *
 * check-routing.mjs crashed a Chromium renderer and then blocked forever. `isConnected()`
 * stays true for a browser whose renderer has died, so nothing relaunched, and the next
 * `newContext()` waited with no deadline. `npm test` never returned; the 28 suites listed
 * after check-routing never ran; the command still looked like it was working.
 *
 * It survived three separate fixes to check-routing because it could not be REPRODUCED
 * there: nothing can ask Chromium to die on cue, so every fix was reasoned about and none
 * was run against the failure. The helpers now live behind a seam (scripts/lib/browser-
 * session.mjs) and a fake browser that never answers reproduces it exactly, in milliseconds.
 *
 * Each case below is written so that the PRE-FIX behaviour is a hang, and a hang here is a
 * recorded failure rather than a stopped clock: every case runs under its own deadline.
 */
import { browserSession, disposeWithin, withDeadline } from "./lib/browser-session.mjs";

const fail = [];
const ok = (m) => console.log(`  ok    ${m}`);

/** A browser that answers. */
const liveBrowser = (name) => ({
  name,
  closed: false,
  async newContext() { return { on: name }; },
  async close() { this.closed = true; },
});

/** A browser whose renderer has died: the pipe is up, so `isConnected()` would say true,
 *  and every request simply never comes back. This is the real failure mode. */
const deadRendererBrowser = (name) => ({
  name,
  isConnected: () => true,
  closed: false,
  newContext() { return new Promise(() => { /* never settles, exactly like the real one */ }); },
  async close() { this.closed = true; },
});

/** Every case gets its own clock, so a regression is a FINDING and not a stopped run. */
async function within(ms, what, fn) {
  try {
    await withDeadline(fn(), ms, what);
    return true;
  } catch (e) {
    fail.push(`${what}: ${String(e && e.message ? e.message : e).slice(0, 200)}`);
    return false;
  }
}

/* --- 1. the deadline itself -------------------------------------------- */
await within(2_000, "a promise that never settles is rejected, not awaited", async () => {
  const started = Date.now();
  let rejected = false;
  try {
    await withDeadline(new Promise(() => {}), 120, "never");
  } catch (e) {
    rejected = true;
    if (!/did not return within 120ms/.test(e.message)) {
      fail.push(`the deadline error must name what timed out and how long it waited: ${e.message}`);
    }
  }
  if (!rejected) fail.push("withDeadline resolved a promise that never settles");
  if (Date.now() - started > 1_500) fail.push("withDeadline waited far longer than its deadline");
  else ok("a promise that never settles is rejected at the deadline");
});

/* --- 2. a losing promise must not take the run down afterwards ---------- */
await within(3_000, "a promise that loses the race does not become an unhandled rejection", async () => {
  let unhandled = null;
  const onUnhandled = (e) => { unhandled = e; };
  process.on("unhandledRejection", onUnhandled);
  // Rejects AFTER the deadline has already fired: nobody is listening by then.
  const late = new Promise((_, rej) => setTimeout(() => rej(new Error("late")), 60));
  try { await withDeadline(late, 20, "late"); } catch { /* the deadline, as expected */ }
  await new Promise((r) => setTimeout(r, 250));
  process.off("unhandledRejection", onUnhandled);
  if (unhandled) fail.push(`a losing promise crashed the run later: ${unhandled.message}`);
  else ok("a losing promise is absorbed, so the deadline stays the reported cause");
});

/* --- 3. THE WEDGE ------------------------------------------------------- */
await within(5_000, "a browser whose renderer died is replaced, not waited on", async () => {
  const dead = deadRendererBrowser("dead");
  let launched = 0;
  const session = browserSession({
    browser: dead,
    timeoutMs: 150,
    launch: async () => { launched += 1; return liveBrowser(`fresh-${launched}`); },
    open: (b) => b.newContext(),
  });

  const ctx = await session.context("newContext");
  if (!ctx || ctx.on !== "fresh-1") fail.push(`expected a context on a fresh browser, got ${JSON.stringify(ctx)}`);
  if (launched !== 1) fail.push(`expected exactly one relaunch, saw ${launched}`);
  if (!dead.closed) fail.push("the dead browser was left open, so its process leaks");
  if (session.relaunches() !== 1) fail.push("the relaunch was not recorded");
  ok("a dead renderer is detected by asking, not by isConnected(), and replaced once");
});

/* --- 4. the healthy path must not relaunch ------------------------------ */
await within(5_000, "a healthy browser is reused", async () => {
  const live = liveBrowser("live");
  const session = browserSession({
    browser: live, timeoutMs: 1_000,
    launch: async () => { fail.push("a healthy browser was relaunched"); return liveBrowser("wrong"); },
    open: (b) => b.newContext(),
  });
  const ctx = await session.context("newContext");
  if (ctx.on !== "live") fail.push(`expected the original browser, got ${JSON.stringify(ctx)}`);
  if (live.closed) fail.push("a healthy browser was closed");
  ok("a healthy browser is reused, so this costs nothing on a good run");
});

/* --- 5. a replacement that is also dead must give up, not hang ---------- */
await within(5_000, "when the replacement is dead too, it reports rather than waits", async () => {
  const session = browserSession({
    browser: deadRendererBrowser("dead-1"), timeoutMs: 120,
    launch: async () => deadRendererBrowser("dead-2"),
    open: (b) => b.newContext(),
  });
  let raised = null;
  try { await session.context("newContext"); } catch (e) { raised = e; }
  if (!raised) fail.push("a second dead browser produced a context out of nowhere");
  else if (!/after relaunch/.test(raised.message)) {
    fail.push(`the second failure must say it was after a relaunch: ${raised.message}`);
  } else ok("a second dead browser is a reported failure, not a second infinite wait");
});

/* --- 7. THE RECOVERY IS BOUNDED TOO (CR-08-F29) -------------------------
 * Only the first open used to be under a clock. The recovery then awaited `close()` and
 * `launch()` with none, and a wedged browser's close is exactly as likely to never answer as its
 * newContext. Before the fix this case is a hang, which `within` records as a failure. */
const wedgedBrowser = (name) => ({
  name,
  closeCalls: 0,
  newContext() { return new Promise(() => {}); },
  close() { this.closeCalls += 1; return new Promise(() => { /* never settles */ }); },
});

await within(3_000, "a close that never settles does not stop the relaunch", async () => {
  const wedged = wedgedBrowser("wedged");
  const session = browserSession({
    browser: wedged, timeoutMs: 120, recoveryMs: 600, closeMs: 100,
    launch: async () => liveBrowser("fresh"),
    open: (b) => b.newContext(),
  });
  const ctx = await session.context("newContext");
  if (!ctx || ctx.on !== "fresh") fail.push(`expected a context on the relaunched browser, got ${JSON.stringify(ctx)}`);
  if (wedged.closeCalls !== 1) fail.push(`the wedged browser's close should be attempted once, saw ${wedged.closeCalls}`);
  else ok("a never-settling close is abandoned at its slice of the budget and the relaunch proceeds");
});

await within(3_000, "a launch that never settles is a named failure inside the budget", async () => {
  const started = Date.now();
  const session = browserSession({
    browser: deadRendererBrowser("dead"), timeoutMs: 100, recoveryMs: 400,
    launch: () => new Promise(() => { /* never settles */ }),
    open: (b) => b.newContext(),
  });
  let raised = null;
  try { await session.context("newContext"); } catch (e) { raised = e; }
  const took = Date.now() - started;
  if (!raised) fail.push("a launch that never answered produced a context");
  else if (!/relaunch/.test(raised.message) || !/first failure/.test(raised.message)) {
    fail.push(`the failure must name the relaunch stage and keep the first failure: ${raised.message}`);
  } else if (took > 100 + 400 + 300) fail.push(`recovery overran its budget: ${took}ms`);
  else ok(`a never-settling launch fails in ${took}ms, naming the stage and the original failure`);
});

/* --- 8. resources that arrive after their deadline are disposed, once ---- */
await within(3_000, "late contexts and late browsers are closed when they arrive", async () => {
  // The first open answers, but only after its deadline: that context has no owner.
  const lateCtx = { closes: 0, close() { this.closes += 1; return Promise.resolve(); } };
  const slow = {
    name: "slow",
    closed: false,
    newContext() { return new Promise((r) => setTimeout(() => r(lateCtx), 200)); },
    async close() { this.closed = true; },
  };
  // The relaunch also answers only after the whole recovery budget has gone.
  const lateBrowser = { closes: 0, close() { this.closes += 1; return Promise.resolve(); } };
  const session = browserSession({
    browser: slow, timeoutMs: 80, recoveryMs: 150, closeMs: 50,
    launch: () => new Promise((r) => setTimeout(() => r(lateBrowser), 400)),
    open: (b) => b.newContext(),
  });
  try { await session.context("newContext"); } catch { /* expected: the relaunch overran */ }
  await new Promise((r) => setTimeout(r, 600)); // let both late arrivals land
  if (lateCtx.closes !== 1) fail.push(`a context that arrived after its deadline was closed ${lateCtx.closes} time(s), expected 1`);
  if (lateBrowser.closes !== 1) fail.push(`a browser that arrived after the budget was closed ${lateBrowser.closes} time(s), expected 1`);
  if (lateCtx.closes === 1 && lateBrowser.closes === 1) ok("a late context and a late browser are each disposed exactly once");
});

/* --- 9. disposeWithin itself never waits past its clock ------------------ */
await within(2_000, "disposeWithin gives up on a close that never settles", async () => {
  const started = Date.now();
  const closed = await disposeWithin(wedgedBrowser("w"), 100, "close");
  if (closed !== false) fail.push("disposeWithin reported a never-settling close as completed");
  else if (Date.now() - started > 1_000) fail.push("disposeWithin waited far past its deadline");
  else ok("disposeWithin returns false at its deadline instead of waiting");
});

/* --- 6. check-routing must actually USE this ---------------------------- */
await within(5_000, "check-routing opens every session through the seam", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./check-routing.mjs", import.meta.url), "utf8");
  // The predicate that caused this, in the file it caused it in. Its own header explains why
  // it cannot be trusted, and it was still being used at the bottom of the same file.
  if (/if\s*\(\s*!\s*browser\.isConnected\(\)\s*\)/.test(src)) {
    fail.push("check-routing decides whether to relaunch from browser.isConnected(), which " +
              "stays true for a browser whose renderer has died. That is the wedge.");
  }
  // Every newPage/newContext must be under a clock. A bare one is a place to hang.
  for (const m of src.matchAll(/^(?!.*withDeadline)(?!.*\*).*\b(?:await\s+)?\w+\.(newPage|newContext)\s*\(/gm)) {
    const line = m[0].trim();
    if (/const newSession|function |=>\s*b\./.test(line)) continue;  // the helper's own definition
    fail.push(`check-routing opens a session with no deadline, which can wait forever: ${line.slice(0, 100)}`);
  }
  // And every close must be under a clock: `await x.close().catch(...)` waits forever on a
  // close that never settles (CR-08-F29).
  for (const m of src.matchAll(/^(?!\s*(?:\/\/|\/?\*)).*\bawait\s+[\w.()]+\.close\(\)/gm)) {
    fail.push(`check-routing awaits a close with no deadline, which can wait forever: ${m[0].trim().slice(0, 100)}`);
  }
  if (!fail.length) ok("check-routing has no unguarded session opener, close, or isConnected() guard");
});

if (fail.length) {
  console.error(`\ncheck-browser-session FAILED (${fail.length}):\n - ` + fail.join("\n - "));
  process.exit(1);
}
console.log("\ncheck-browser-session OK: a dead renderer is replaced under a clock, and check-routing goes through it.");
