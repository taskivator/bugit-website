// WHAT A NEGATIVE CONTROL HAS TO PRODUCE BEFORE IT COUNTS AS PROOF.
//
// WHY THIS FILE EXISTS. Several browser guards here injure the page on purpose and require
// themselves to see the injury before they believe a clean run. Until 2026-09-26 two of them,
// check-close-control and check-compositor-budget, put everything that went wrong in the injured
// run into ONE list -- the measured violation they were looking for, and also any exception
// thrown while getting there -- and then asked only whether that list was empty. So a page.goto
// that timed out, a context that died, or an evaluate that threw on a page with no script at all
// was counted as "the control fired", and the guard printed that it could see the defect on a run
// in which the defect was never measured (external code review CR-08-F14).
//
// A control is proof only when the SPECIFIC invariant the guard exists for failed, measured, in a
// run that otherwise completed. Anything else is inconclusive, and an inconclusive control is a
// failed guard: it says nothing about whether the guard can see.
//
// So each result is recorded with a KIND. `error` is reserved for "the run did not complete";
// every measured finding carries the name of the rule it broke. `controlVerdict` then accepts a
// control only if it holds no `error` and at least one finding of an expected kind.

/** A measured finding: the page was looked at and broke `kind`. */
export const violation = (kind, msg) => ({ kind, msg });
/** The run did not complete, so nothing about the page was established. */
export const runError = (msg) => ({ kind: "error", msg });

/**
 * Decide whether one injured run proved anything.
 * @param {{kind:string,msg:string}[]} results what the injured run recorded
 * @param {string[]} expectedKinds the measured violations that injury is built to produce
 * @returns {{ok:boolean, reason:string, matched:number}}
 */
export function controlVerdict(results, expectedKinds) {
  const errors = results.filter((r) => r.kind === "error");
  if (errors.length) {
    return {
      ok: false, matched: 0,
      reason: `INCONCLUSIVE: the injured run did not complete (${errors[0].msg}), so it measured nothing`,
    };
  }
  const matched = results.filter((r) => expectedKinds.includes(r.kind)).length;
  if (!matched) {
    const other = [...new Set(results.map((r) => r.kind))];
    return {
      ok: false, matched: 0,
      reason: `the expected violation (${expectedKinds.join(" or ")}) was never measured` +
        (other.length ? `; it saw only ${other.join(", ")}, which is not the defect it injured` : ""),
    };
  }
  return { ok: true, matched, reason: "" };
}

/* THE JUDGE IS JUDGED TOO. Four inert result lists, run through the verdict every time a guard
   imports this, so a future edit that lets an error or an unrelated finding count as proof fails
   the guard instead of quietly returning to the old behaviour. */
export function selfTestControlVerdict() {
  const cases = [
    ["the expected violation, measured", [violation("outside", "x")], true],
    ["nothing at all", [], false],
    ["a navigation error and nothing else", [runError("page.goto: Timeout 30000ms exceeded")], false],
    ["the expected violation AND an error", [violation("outside", "x"), runError("Target closed")], false],
    ["an unrelated violation only", [violation("inert-left", "x")], false],
  ];
  const wrong = [];
  for (const [name, results, want] of cases) {
    const got = controlVerdict(results, ["outside"]).ok;
    if (got !== want) wrong.push(`${name}: judged ${got ? "proof" : "not proof"}`);
  }
  return wrong;
}
