// Self-contained aggregate test runner (AUD-1.1.0-011): one command that BUILDS, starts the
// production server on a disposable port, waits for readiness, runs every declared suite against
// that server, tears the server down, and exits non-zero on ANY failure — no pre-existing dist,
// browser server, or CONSENT_TEST_URL required. Run with: npm test
import { spawn, spawnSync } from "node:child_process";

function step(label, cmd, args, env) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...(env || {}) }, shell: process.platform === "win32" });
  return r.status === 0;
}

// 1. Build (so dist-dependent suites like team-paused have their input).
if (!step("build", "node", ["build.js"])) { console.error("build failed"); process.exit(1); }

// 2. Start the server on a disposable port.
const port = 3200 + Math.floor(Math.random() * 700);
const base = `http://localhost:${port}`;
// NO `shell` HERE, and that is the whole point. With shell:true on Windows this spawns
// cmd.exe, which spawns node; `srv.kill()` then kills the SHELL and leaves the server
// running forever. Every `npm test` on Windows leaked one: 16 were found alive on the dev
// machine, the oldest four days old, each still holding its port.
//
// The leak is worse than a stray process, because the orphan INHERITS this process's stdout.
// `npm test | tail` therefore never sees EOF and hangs after the suite has already finished,
// so the run looks like it is still going and its output is lost. That is how it was found.
//
// `node` is directly executable on all three platforms, so no shell is needed to launch it.
const srv = spawn("node", ["server.js"], { stdio: "inherit", env: { ...process.env, PORT: String(port) } });
const shutdown = () => {
  try { srv.kill(); } catch {}
  // Belt: if the child ever gains children of its own, kill the tree rather than the parent.
  if (process.platform === "win32" && srv.pid) {
    try { spawnSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
};
process.on("exit", shutdown);
process.on("SIGINT", () => { shutdown(); process.exit(130); });

// 3. Wait for readiness (poll, never a fixed sleep). Fail loudly if the server never comes up.
let ready = false;
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(base + "/"); if (r.ok) { ready = true; break; } } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 250));
}
if (!ready) { console.error(`server did not become ready at ${base}`); shutdown(); process.exit(1); }

// 4. Run every declared suite against the served site.
const SUITES = [
  // FIRST, and static: if a guard is not wired, say so in a second rather than after a
  // twenty-minute browser sweep that was never the full sweep it looked like.
  "check-ci-coverage.mjs",
  // check-assets and check-chrome-a11y used to run only in CI, or nowhere at all, so a local
  // `npm test` could pass while CI failed and vice versa. Both lists are now checked against
  // each other by scripts/check-ci-coverage.mjs.
  "check-assets.mjs", "check-chrome-a11y.mjs",
  "check-doc-links.mjs", "check-docs.mjs", "check-overflow.mjs", "check-mission-pause.mjs", "check-logo.mjs",
  // check-logo.mjs proves the rendered logo has no clipping artifact; this proves
  // the asset it renders is the one the brand pipeline produced and was not
  // hand-edited afterwards. The two are complements, not duplicates.
  "check-brand-sync.mjs",
  "check-trust-icons.mjs", "check-tracker-claims.mjs", "check-ads-tag.mjs", "check-cache-headers.mjs", "check-csp-telemetry.mjs",
  // check-cache-headers asks what may be cached; this asks what protects the response. Split
  // because the site shipped with no Cross-Origin-Opener-Policy at all, and an absence is
  // invisible to a guard that only inspects what is written.
  "check-security-headers.mjs",
  "check-billing-copy.mjs", "check-team-paused.mjs", "check-activation-copy.mjs", "check-legal-copy.mjs", "check-consent-network.mjs",
  "check-legal-dataflow.mjs", "check-a11y.mjs", "check-languages.mjs", "check-doc-hygiene.mjs", "check-doc-duplicates.mjs", "check-spa-routing.mjs",
  // check-languages proves each locale HAS its keys; this proves the values are not
  // another locale's language. The Spanish integrations paragraph shipped in Brazilian
  // Portuguese and every guard above passed, because a present key and a translated key
  // look identical until something compares the strings.
  "check-locale-crosstalk.mjs",
  // ...and this one asks what those strings turn into. Every guard above reads the doc
  // SOURCE; the 2026-08-17 audit found 194 bidi tags printing as visible text and 45
  // dashed lines on the live pages, none of which the source can show you.
  "check-doc-rendering.mjs",
  // ...and this one asks what CSS then does to them. "BugIt QA Agent" and "BugIt Mission
  // Control" both rendered the name as "BUGIT" in every locale, from text-transform on a
  // shared rule. Every guard above reads strings; this one reads the rendered page.
  "check-brand-casing.mjs",
  // ...and this one asks whether the sheet that produces it is still structurally sound.
  // A stray brace unlayers the redesign silently; the visible symptom is the page losing
  // its single content edge, so the structure and the geometry are checked together.
  "check-alignment.mjs",
  // The page animates now, and the way that breaks is silent: content held at the `from`
  // state of a reveal is invisible while the markup, the a11y tree and every other guard
  // here stay perfectly correct.
  "check-motion.mjs",
  // The channel holds two cuts of every film and the page shipped pointing ten of its twelve
  // tiles at the vertical one, inside a 16:9 stage. Valid markup, real ids, posters that
  // loaded: the only way to see it was to press play. This presses play.
  "check-channel.mjs",
  "check-ground.mjs",
  "check-reading.mjs",
  // ...and these three are the 2026-08-21 audit, kept. Every guard above reads one thing about
  // the page; these three read the page the way a reader meets it.
  //
  // check-space     eleven languages x five viewports x every route, measuring panning,
  //                 escaping boxes, clipped text, collisions and invisible ink at every scroll
  //                 position. It found an Arabic page that cut 104px off itself at 320px, a
  //                 Mission Control stream line that truncated in ALL ELEVEN languages, and six
  //                 clamps sized for English. `--full` widens it to twelve viewports.
  // check-routing   every route entered cold, by click, by reload and by history, in every
  //                 language, plus the dead-link sweep.
  // check-instrument-size  the owner's rule that the instrument may not change size when the
  //                 report opens, or on its own while it runs.
  "check-dev-server.mjs",
  "check-space.mjs",
  "check-routing.mjs",
  "check-progress-label.mjs",
  "check-instrument-size.mjs",
  // check-untranslated  reads the RENDERED page and asks the reader's question: on the Japanese
  //                 page, is this sentence in Japanese? Every other language guard here reads
  //                 the i18n object, and the film wall's twenty-four English strings were never
  //                 in it -- they were written straight into index.html, where a parity check
  //                 cannot see them.
  // check-chrome    the header lockup, the language menu, the social labels and the footer
  //                 links: the parts present on every route, whose defects are properties of an
  //                 INTERACTION or of one narrow width and so survive a page-level sweep.
  "check-doc-markup.mjs",
  "check-untranslated.mjs",
  "check-chrome.mjs",
  // check-reveal    every scroll-driven reveal, at every width and in every language, must reach
  //                 the end of its range and finish fully opaque. check-motion already claims
  //                 this ground and passes on the broken tree: it renders one viewport, reads
  //                 only what is on screen, and its threshold is 0.9. Three cards shipped
  //                 stranded at 0.31, 0.57 and 0.71 underneath it.
  // check-report-bar the report's pinned action bar must be opaque and must paint nothing over
  //                 the report above it. Two veils were stacked there and the stylesheet's own
  //                 correction for one of them had never applied, because an identical rule
  //                 later in the same layer put it back.
  "check-reveal.mjs",
  "check-report-bar.mjs",
  // check-disclosure  the only guard here that runs a second BROWSER ENGINE. Every control that
  //                 declares aria-expanded must open and close again, by tap and by click, in
  //                 WebKit as well as Chromium. The language menu would not close on Safari --
  //                 tapping it closed and reopened the menu inside one gesture -- and forty
  //                 Chromium guards saw nothing, because the difference is that Safari does not
  //                 focus a button on tap.
  "check-disclosure.mjs",
  // check-overlay-controls  a control that OPENS an overlay must still work once the overlay
  //                 is open. The mobile menu inerted every body child except itself, and the
  //                 hamburger that closes it lives in the header -- so opening the menu
  //                 removed its own close button from hit-testing, on a page whose scroll was
  //                 already locked. Reported as "tapping it again crashes Chrome". Taps are
  //                 honest here: no force anywhere, because force() dispatches the event a
  //                 finger cannot. Chromium and WebKit, and it carries its own negative
  //                 control -- it rewrites app.js on the wire to restore the bug and fails
  //                 if that still passes.
  "check-overlay-controls.mjs",
  // check-close-control  the control that CLOSES a page-locking overlay must be on the screen.
  //                 Below 150 CSS px it was not: the header row could not fit, the controls were
  //                 pushed past the right edge, and html{overflow-x:clip} meant the reader could
  //                 not scroll to what left. With the page locked and everything behind it inert,
  //                 a reload was the only way out -- which is what "Chrome is crashing" was.
  "check-close-control.mjs",
  // check-compositor-budget  Chrome on iOS is WebKit in a WKWebView, and when the whole APP dies
  //                 rather than one tab it is iOS jetsam. This page asked a phone for 145.6 MB of
  //                 compositor buffers at rest and 1312 MB at 3x zoom, 53 MB of which was a
  //                 backdrop-filter behind fully opaque backgrounds and rendered nothing.
  "check-compositor-budget.mjs",
  // check-menu-keyboard   the language menu declares role="menu", which is a PROMISE about
  //                 keyboard behaviour: arrows move, Escape closes, Home/End jump. It had none
  //                 of it. Declared ARIA is checked by operating the control, not by reading it.
  // check-mission-box     eleven languages x four phone widths x two states x two engines: on a
  //                 phone Mission Control is ONE box, and collapsed it shows one live row.
  // check-mobile-chrome   the four things a phone does that a desktop never does: zoom on focus
  //                 into a sub-16px field, honest taps, the URL bar eating 100vh, and text
  //                 auto-boosting. Chromium and WebKit.
  // check-hairlines       a separator is ONE line. Measured from PIXELS, at rest and mid-reveal,
  //                 because "does this look like two lines" is not a question source can answer.
  //                 It reported the same defect the owner reported, twice, after I had twice
  //                 declared it fixed by reading the stylesheet.
  // check-demo-stage      the channel picker and the stage are ONE column, the channel that is
  //                 playing is the only one marked, and nothing a hover paints leaves the
  //                 instrument. Photographed and pixel-diffed, because what the owner saw
  //                 escaping the box was a background and a shadow, and what replaced it is a
  //                 2px mark on the seam the rail and the stage share -- neither of which is
  //                 the button's own rectangle.
  "check-menu-keyboard.mjs",
  "check-mission-box.mjs",
  "check-mobile-chrome.mjs",
  "check-hairlines.mjs",
  // check-overlay-contents  what an overlay CONTAINS has to work, not just the control that
  //                 opened it. The mobile menu inerted its own links, its account rows and its
  //                 own close button: every one of them visible, opaque and completely dead.
  //                 check-overlay-controls passed throughout, because the control it taps was
  //                 the one element deliberately kept live.
  // check-watch-inline    a tap on a film plays it HERE. For one day it called window.open on a
  //                 youtube.com/watch URL, which both mobile platforms hand to the YouTube app,
  //                 so every visitor who pressed play on a phone left the site. Every tile, on
  //                 three phones, in both engines.
  "check-demo-stage.mjs",
  // check-mission-live-row  the collapsed panel's ONE line must be the row the run has reached.
  //                 The stylesheet used to infer it from `.active`, and a step is only active
  //                 between its start and its finish, so in each of the seven gaps the line
  //                 flipped to "Awaiting your approval" and back while the bar was still
  //                 climbing. A photograph cannot see that; this samples a whole cycle.
  // check-phone-height    the two boxes that stayed on a small screen uninvited: a contents
  //                 rail still sticky with no column to be sticky in, which the document then
  //                 scrolled through, and a header taking a fifth of a landscape phone.
  "check-overlay-contents.mjs",
  "check-watch-inline.mjs",
  "check-mission-live-row.mjs",
  "check-phone-height.mjs",
  // check-report-reveal   pressing "Show full report" has to show some of the report. The
  //                 instrument is the same size open or closed and the report opens into a
  //                 scroller that starts at the top, so the press put 28px of 714 in front of
  //                 the reader and changed one word on a button.
  // check-mission-marker  the step marker is centred with a transform, and both of the
  //                 animations it runs are written in `transform`, which replaces it: the
  //                 marker spent every moving frame 8px below the centre of its row, and on a
  //                 phone that row is a pill.
  // check-dim-on-screen   the reveal's exit fade is measured against the scrollport, and a
  //                 phone held sideways has 390px of one: five blocks were painting at nothing
  //                 while sitting whole on the screen with clear space above them.
  // check-docs-chrome    the documentation's chrome must not lie about where the reader is and
  //                 must not move sideways: Support is the one route short enough to fit a
  //                 screen, so it took the scrollbar away and read 100% on a page nobody had
  //                 scrolled.
  // check-rule-pair      the two hairlines beside a section eyebrow, photographed: one of the
  //                 pair held an animated transform for ever, which composites it, and a
  //                 composited hairline snaps to whole device pixels while its twin does not.
  "check-report-reveal.mjs",
  "check-mission-marker.mjs",
  "check-dim-on-screen.mjs",
  "check-docs-chrome.mjs",
  "check-rule-pair.mjs",
];
const failed = [];
for (const s of SUITES) {
  if (!step(s, "node", ["scripts/" + s], { CONSENT_TEST_URL: base, BASE_URL: base, PORT: String(port) })) failed.push(s);
}

// 5. Tear down + propagate.
shutdown();
if (failed.length) { console.error("\nFAILED SUITES: " + failed.join(", ")); process.exit(1); }
console.log("\nALL WEBSITE SUITES PASSED against " + base);
process.exit(0);
