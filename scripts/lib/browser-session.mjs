/* OPENING A BROWSER SESSION, WITH A CLOCK ON IT.
 *
 * Extracted from check-routing.mjs so the wedge it exists to prevent can be PROVED rather
 * than described. The behaviour was correct there and untestable there: reproducing it needs
 * a browser whose renderer has died, and nothing can ask Chromium for that on demand. Behind
 * this seam a two-line fake does it in milliseconds, which is what check-browser-session.mjs
 * uses.
 *
 * THE DEFECT THIS IS ABOUT. `browser.isConnected()` reports the state of the CDP pipe, and
 * the pipe outlives the renderer. It returns true for a browser that can no longer open
 * anything, so code that guards with it decides no relaunch is needed and then blocks inside
 * `newContext()` or `newPage()` with no deadline and nothing to catch it. `npm test` never
 * returned, the 28 suites listed after check-routing never ran, and the command still looked
 * like it was working.
 *
 * SO THERE IS NO LIVENESS PREDICATE HERE, deliberately. Every session is opened under a
 * clock, and a timeout IS the diagnosis.
 */

/** Race a promise against a deadline. */
export const withDeadline = (p, ms, what) => {
  /* The promise that LOSES can still reject afterwards, with nobody listening. Node turns
     that into an unhandled rejection and ends the run reporting the stale error instead of
     the deadline that actually fired: the wrong diagnosis for the right problem. */
  p.catch(() => { /* the deadline already spoke for this one */ });

  /* CLEARED WHEN THE RACE ENDS, NEVER UNREF'D.
   *
   * This timer was `.unref()`d so a finished check would not sit waiting for a deadline it
   * no longer needs. But an unref'd timer cannot hold the event loop open, so when the thing
   * being awaited is the ONLY work left -- exactly the case here, a browser that has stopped
   * answering -- Node runs out of work and exits with "Detected unsettled top-level await".
   * The deadline never fires, and a silent exit with no verdict is worse than the hang it
   * replaced: the run reports nothing at all rather than reporting a timeout.
   *
   * Clearing on settle gives both halves: the deadline is real while the race is live, and
   * nothing lingers once it is decided. */
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const e = new Error(`${what} did not return within ${ms}ms`);
      e.deadline = true; // so a caller can tell "it never answered" from "it answered no"
      reject(e);
    }, ms);
  });
  return Promise.race([p, deadline]).finally(() => clearTimeout(timer));
};

/* A RESOURCE THAT ARRIVES AFTER ITS DEADLINE IS STILL A RESOURCE (CR-08-F29).
 *
 * When the deadline wins, the promise that lost is not cancelled; it can still resolve, a
 * second later or a minute later, with a live context or a whole Chromium process that nobody
 * holds a handle to. That is a leaked browser and a leaked temp profile per timeout. So a race
 * that times out attaches a disposer to the loser, and whatever it eventually yields is closed
 * (once) the moment it arrives. */
async function raceOrDispose(p, ms, what) {
  try {
    return await withDeadline(p, ms, what);
  } catch (e) {
    if (e && e.deadline) {
      p.then((late) => { disposeWithin(late, 10_000, `late ${what}`); }, () => { /* never arrived */ });
    }
    throw e;
  }
}

/**
 * Close a browser, context or page under a clock. Never throws, never waits past `ms`.
 * Resolves true when the close completed, false when it failed or did not return in time.
 *
 * `close()` is exactly as able to hang as `newContext()`: it is a request to the same process
 * that has stopped answering. A `.catch()` handles a rejection and does nothing for a promise
 * that never settles, so every cleanup `await x.close().catch(...)` was a place to wait forever.
 */
export async function disposeWithin(resource, ms, what = "close") {
  if (!resource || typeof resource.close !== "function") return false;
  try {
    await withDeadline(Promise.resolve().then(() => resource.close()), ms, what);
    return true;
  } catch {
    return false; // already gone, or not answering: either way we have stopped waiting
  }
}

/**
 * A context opener that relaunches ONCE when the browser stops answering.
 *
 * THE WHOLE RECOVERY IS UNDER ONE CLOCK (CR-08-F29). Only the first open used to be raced
 * against a deadline; the recovery then awaited `current.close()` and `launch()` with none, so a
 * close that never settled (the likeliest thing a wedged browser does) blocked the relaunch and
 * the second open forever, and the per-language verdict the deadline existed to guarantee was
 * never printed. Now close, launch and reopen share `recoveryMs`: the close gets a slice and is
 * abandoned if it overruns, and launch and reopen each get what is left. Late arrivals from any
 * stage are disposed. The first failure and the recovery failure are both kept in the message.
 *
 * @param {object} opts
 * @param {() => Promise<any>} opts.launch       how to get a new browser
 * @param {(b: any) => Promise<any>} opts.open   how to open a context on one
 * @param {any} opts.browser                     the browser to start from
 * @param {number} [opts.timeoutMs]              deadline for an ordinary open
 * @param {number} [opts.recoveryMs]             total budget for close + launch + reopen
 * @param {number} [opts.closeMs]                the most the close of a dead browser may take
 * @returns {{ context(what: string): Promise<any>, current(): any, relaunches(): number,
 *             dispose(ms?: number): Promise<boolean> }}
 */
export function browserSession({
  launch, open, browser, timeoutMs = 30_000, recoveryMs = 2 * timeoutMs, closeMs = Math.min(10_000, timeoutMs),
}) {
  let current = browser;
  let relaunches = 0;
  return {
    current: () => current,
    relaunches: () => relaunches,
    dispose: (ms = closeMs) => disposeWithin(current, ms, "close browser"),
    async context(what) {
      const failedOn = current;
      let first;
      try {
        return await raceOrDispose(Promise.resolve().then(() => open(failedOn)), timeoutMs, what);
      } catch (e) {
        first = e;
      }
      // Not "is it connected" -- it did not answer, which is the only evidence there is.
      const endsAt = Date.now() + recoveryMs;
      const left = () => Math.max(1, endsAt - Date.now());
      const why = (e) => String(e && e.message ? e.message : e);
      try {
        // ATTEMPT OWNERSHIP: if another caller already replaced the browser this attempt failed
        // on, the replacement is not ours to close; just try again on it.
        if (current === failedOn) {
          await disposeWithin(failedOn, Math.min(closeMs, left()), `${what}: close the unresponsive browser`);
          current = await raceOrDispose(Promise.resolve().then(() => launch()), left(), `${what}: relaunch`);
          relaunches += 1;
        }
        return await raceOrDispose(Promise.resolve().then(() => open(current)), left(), `${what} after relaunch`);
      } catch (e) {
        throw new Error(`${why(e)} (first failure: ${why(first)}; recovery budget ${recoveryMs}ms)`);
      }
    },
  };
}
