#!/usr/bin/env node
/**
 * THE PREVIEW'S TRIAL LINK KEEPS THE CHANNEL (owner brief 2026-10-30).
 *
 * A visitor who arrives on /demo/?utm_source=bluesky&utm_campaign=testers-2026-10 used to lose the
 * channel at the trial button, whose link was fixed. v2/demo/demo.js now builds the link from the page
 * URL with the SAME rule the portal applies (bugit-portal lib/attribution/trial-utm.ts cleanUtmValue):
 * trim, lowercase, then 1 to 64 characters of a-z 0-9 . _ - starting with a letter or digit; anything
 * else is dropped, never cleaned. Incoming utm_source becomes utm_medium, incoming utm_campaign replaces
 * demo_v1, utm_source stays bugit_demo.
 *
 * WHAT THIS RUNS: the pure function, cut out of demo.js between its TRIAL-LINK markers and executed in
 * a node vm with no DOM (so if it ever grows a DOM dependency this fails), plus static assertions that
 * the page applies it to #trial-btn, that the beacon is unchanged, and that the file adds no cookie,
 * storage or network call for it. The portal's rule is read from the portal checkout when it is beside
 * this repo (it is not in CI), and a copy of its pattern is asserted equal.
 *
 *   node scripts/check-demo-trial-link.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "v2/demo/demo.js"), "utf8");
const html = readFileSync(join(ROOT, "v2/demo/index.html"), "utf8");
const failures = [];
let checks = 0;
const eq = (got, want, what) => { checks++; if (got !== want) failures.push(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
const ok = (c, what) => { checks++; if (!c) failures.push(what); };

const m = /\/\* TRIAL-LINK-BEGIN[\s\S]*?\*\/([\s\S]*?)\/\* TRIAL-LINK-END \*\//.exec(src);
if (!m) { console.error("check-demo-trial-link: the TRIAL-LINK markers are gone from demo.js; this guard has no subject"); process.exit(1); }
const sandbox = { URLSearchParams, out: null };
vm.createContext(sandbox);
vm.runInContext(m[1] + "\nout = { trialHref: trialHref, cleanUtm: cleanUtm };", sandbox);
const { trialHref, cleanUtm } = sandbox.out;

const BASE = "https://portal.bugit.dev/dashboard/free-trial?utm_source=bugit_demo&utm_medium=web&utm_campaign=demo_v1";
const hrefAttr = /id="trial-btn" href="([^"]+)"/.exec(html);
ok(!!hrefAttr, "index.html: #trial-btn has no href attribute to read");
eq(hrefAttr && hrefAttr[1].replace(/&amp;/g, "&"), BASE, "the button's static href");
const noscript = /<noscript>[\s\S]*?href="([^"]+)"/.exec(html);
eq(noscript && noscript[1].replace(/&amp;/g, "&"), BASE, "the noscript link (no script runs there, so it stays the fixed link)");

// 1. no incoming tags: the old link byte for byte
for (const s of ["", "?", "?x=1", "?utm_medium=social", "?utm_term=a", "?note=hello", "?utm_source=&utm_campaign="]) eq(trialHref(BASE, s), BASE, `no usable tags (${JSON.stringify(s)})`);
// 2. valid tags are carried
eq(trialHref(BASE, "?utm_source=bluesky&utm_medium=social&utm_campaign=testers-2026-10"),
  "https://portal.bugit.dev/dashboard/free-trial?utm_source=bugit_demo&utm_medium=bluesky&utm_campaign=testers-2026-10", "both tags carried");
eq(trialHref(BASE, "?utm_source=youtube"), "https://portal.bugit.dev/dashboard/free-trial?utm_source=bugit_demo&utm_medium=youtube&utm_campaign=demo_v1", "source only");
eq(trialHref(BASE, "?utm_campaign=spring.2026_a-b"), "https://portal.bugit.dev/dashboard/free-trial?utm_source=bugit_demo&utm_medium=web&utm_campaign=spring.2026_a-b", "campaign only");
eq(trialHref(BASE, "?utm_source=" + "a".repeat(64)), "https://portal.bugit.dev/dashboard/free-trial?utm_source=bugit_demo&utm_medium=" + "a".repeat(64) + "&utm_campaign=demo_v1", "64 characters is the longest allowed");
eq(trialHref(BASE, "?utm_source=%20YouTube%20"), "https://portal.bugit.dev/dashboard/free-trial?utm_source=bugit_demo&utm_medium=youtube&utm_campaign=demo_v1", "trim and lowercase first, exactly as the portal does");
// 3. crafted values are dropped, and a valid sibling survives alone
const CRAFT = [
  ["spaces", "two words"], ["a space inside", "a b"], ["uppercase plus a symbol", "BlueSky!"], ["65 characters", "a".repeat(65)],
  ["script text", "<script>alert(1)</script>"], ["quote and ampersand", 'x"&utm_source=evil'], ["leading hyphen", "-abc"], ["leading dot", ".abc"],
  ["a slash", "a/b"], ["a percent escape that decodes to a space", "a%20b"], ["unicode", "büg"], ["a newline", "a%0Ab"],
];
for (const [name, v] of CRAFT) {
  const q = encodeURIComponent(v).replace(/%25/g, "%");
  eq(trialHref(BASE, "?utm_source=" + encodeURIComponent(v)), BASE, `crafted utm_source dropped (${name})`);
  eq(trialHref(BASE, "?utm_campaign=" + encodeURIComponent(v)), BASE, `crafted utm_campaign dropped (${name})`);
  eq(trialHref(BASE, "?utm_source=" + encodeURIComponent(v) + "&utm_campaign=ok-1"), "https://portal.bugit.dev/dashboard/free-trial?utm_source=bugit_demo&utm_medium=web&utm_campaign=ok-1", `crafted source dropped, valid campaign kept (${name})`);
  void q;
}
ok(cleanUtm(undefined) === undefined && cleanUtm(null) === undefined && cleanUtm(5) === undefined, "a non-string is dropped");
// the link never grows a parameter we did not name
const t = trialHref(BASE, "?utm_source=a&utm_campaign=b&utm_medium=c&utm_term=d&utm_content=e&ref=f");
eq(t, "https://portal.bugit.dev/dashboard/free-trial?utm_source=bugit_demo&utm_medium=a&utm_campaign=b", "only the three named parameters, an incoming utm_medium is ignored");

// 4. the portal's rule is the same rule (when the portal checkout is beside this repo)
const portal = join(ROOT, "..", "bugit-portal", "lib", "attribution", "trial-utm.ts");
if (existsSync(portal)) {
  const p = readFileSync(portal, "utf8");
  ok(p.includes("const VALUE = /^[a-z0-9][a-z0-9._-]{0,63}$/;"), "the portal's rule changed; this page's copy must follow (lib/attribution/trial-utm.ts)");
  ok(/raw\.trim\(\)\.toLowerCase\(\)/.test(p), "the portal no longer trims and lowercases first; this page's copy must follow");
} else console.log("check-demo-trial-link: the portal checkout is not beside this repo; its rule was not compared (CI case)");
ok(m[1].includes("/^[a-z0-9][a-z0-9._-]{0,63}$/") && /raw\.trim\(\)\.toLowerCase\(\)|trim\(\)\.toLowerCase\(\)/.test(m[1]), "demo.js does not carry the portal's pattern");

// 5. static: applied to the button, beacon unchanged, nothing persisted, no new network call
ok(/\$\('trial-btn'\)\.setAttribute\('href', trialHref\(\$\('trial-btn'\)\.getAttribute\('href'\), location\.search\)\)/.test(src), "demo.js does not apply trialHref to #trial-btn from location.search");
ok(src.includes("navigator.sendBeacon(TRIAL_BEACON, JSON.stringify({ name: 'trial_clicked' }))"), "the trial_clicked beacon changed");
ok(!/document\.cookie|localStorage|sessionStorage|indexedDB/.test(m[0]) , "the trial link code touches a cookie or storage");
ok(!/fetch\(|XMLHttpRequest|sendBeacon|new Image|WebSocket/.test(m[1]), "the trial link code makes a network call");
const fetches = (src.match(/\bfetch\(/g) || []).length;
ok(fetches === 2, `demo.js has ${fetches} fetch( calls; HEAD had 2, so a new network call needs a look`);

if (failures.length) { console.error(`check-demo-trial-link: FAIL (${failures.length} of ${checks})\n - ` + failures.join("\n - ")); process.exit(1); }
console.log(`check-demo-trial-link OK: ${checks} checks (no tags keeps the old link byte for byte, valid tags carried, ${CRAFT.length} crafted shapes dropped for each tag)`);
