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
    timer = setTimeout(() => reject(new Error(`${what} did not return within ${ms}ms`)), ms);
  });
  return Promise.race([p, deadline]).finally(() => clearTimeout(timer));
};

/**
 * A context opener that relaunches ONCE when the browser stops answering.
 *
 * @param {object} opts
 * @param {() => Promise<any>} opts.launch       how to get a new browser
 * @param {(b: any) => Promise<any>} opts.open   how to open a context on one
 * @param {any} opts.browser                     the browser to start from
 * @param {number} [opts.timeoutMs]
 * @returns {{ context(what: string): Promise<any>, current(): any, relaunches(): number }}
 */
export function browserSession({ launch, open, browser, timeoutMs = 30_000 }) {
  let current = browser;
  let relaunches = 0;
  return {
    current: () => current,
    relaunches: () => relaunches,
    async context(what) {
      try {
        return await withDeadline(open(current), timeoutMs, what);
      } catch {
        // Not "is it connected" -- it did not answer, which is the only evidence there is.
        try { await current.close(); } catch { /* already gone; that is the case handled */ }
        current = await launch();
        relaunches += 1;
        return await withDeadline(open(current), timeoutMs, `${what} after relaunch`);
      }
    },
  };
}
