#!/usr/bin/env node
/**
 * The security headers the site MUST send, asserted against _headers.
 *
 * WHY THIS EXISTS. check-cache-headers.mjs already parses this file, but it only ever asks about
 * caching, so the security half of `_headers` had nothing standing over it. The 2026-08-19 audit
 * found the site sending no Cross-Origin-Opener-Policy at all: not because anyone decided
 * against it, but because there was no list saying which headers the site sends and therefore
 * nothing that could notice one missing. Every other header was present, which is exactly the
 * shape that reads as "the headers are handled".
 *
 * An absence is invisible to a scan that only looks at what is written. So this asserts REQUIRED
 * CONTENT — the header must be present on the catch-all rule, and its value must match — rather
 * than scanning for anything forbidden.
 *
 * It reads the repository's `_headers`, which is what Cloudflare Pages deploys. It does NOT
 * prove the live site sends them; that needs a request against bugit.dev, and a deploy is not
 * delivery. Verify after deploying:
 *   curl -sI https://bugit.dev/ | grep -i cross-origin
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ALLOWED_ACAO, cspProblems, parseHeadersRules, routeProblems,
} from "./lib/headers-policy.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// HEADERS_FILE points the guard at a planted copy, so a weakened policy can be proven to fail
// without editing the real _headers. Unset, it reads the repository's own file.
const HEADERS_PATH = process.env.HEADERS_FILE ? path.resolve(process.env.HEADERS_FILE) : path.join(ROOT, "_headers");
const raw = fs.readFileSync(HEADERS_PATH, "utf8");

// --- Parse _headers. An unindented line opens a rule, an indented "Name: value" adds a header to
//     it, "! Name" detaches one, and a line whose first non-space character is '#' is a comment
//     even when indented. Every occurrence is kept: see scripts/lib/headers-policy.mjs.
const rules = parseHeadersRules(raw);
for (const r of rules) {
  r.byName = {};
  for (const { name, value } of r.headers) if (!(name in r.byName)) r.byName[name] = value;
}

const catchAll = rules.find((r) => r.pattern === "/*");

let fails = 0;
const check = (ok, label, detail) => {
  if (ok) return;
  fails++;
  console.error(`FAIL: ${label}${detail ? `\n      ${detail}` : ""}`);
};

check(Boolean(catchAll), "_headers must have a /* rule that every response inherits");
if (!catchAll) {
  console.error("\ncheck-security-headers: cannot continue without the /* rule.");
  process.exit(1);
}

/**
 * Each entry is [header, test, description]. The test takes the value as written.
 *
 * Values are checked by SHAPE, not by exact string, wherever a longer value is still correct —
 * an exact-match assertion on the CSP would fail every time a legitimate host is added and would
 * be "fixed" by pasting in the new value, which is not a check.
 */
const REQUIRED = [
  [
    "strict-transport-security",
    (v) => /max-age=(\d+)/.test(v) && Number(/max-age=(\d+)/.exec(v)[1]) >= 31536000
      && /includeSubDomains/i.test(v) && /preload/i.test(v),
    "at least a year, includeSubDomains, preload (the site is on the HSTS preload list)",
  ],
  ["x-content-type-options", (v) => v.toLowerCase() === "nosniff", "must be exactly nosniff"],
  [
    "x-frame-options",
    (v) => /^(sameorigin|deny)$/i.test(v),
    "SAMEORIGIN or DENY; frame-ancestors in the CSP is the modern half and both are sent",
  ],
  [
    "referrer-policy",
    (v) => /^(strict-origin-when-cross-origin|no-referrer|same-origin|strict-origin)$/i.test(v),
    "must not leak full URLs cross-origin",
  ],
  [
    "permissions-policy",
    (v) => /camera=\(\)/.test(v) && /microphone=\(\)/.test(v) && /geolocation=\(\)/.test(v),
    "camera, microphone and geolocation must all be denied outright",
  ],
  [
    "content-security-policy",
    // Parsed and judged per directive and per source (CR-08-F22). This used to test four
    // substrings, so `frame-ancestors *`, `script-src *` or `'unsafe-inline'` on scripts all
    // passed as long as the four words survived. See scripts/lib/headers-policy.mjs.
    (v) => cspProblems(v).length === 0,
    "default-src 'self', object-src 'none', base-uri 'self', frame-ancestors 'self' or 'none', " +
      "script-src and form-action stated; every source 'self', a reviewed https host, " +
      "'unsafe-inline' only on style-src and data: only on img-src/font-src",
  ],
  [
    "cross-origin-opener-policy",
    (v) => /^same-origin(-allow-popups)?$/i.test(v),
    // The site takes the stricter value because it calls window.open nowhere; the portal allows
    // popups because it has flows that keep the handle. Both are accepted here so this guard
    // does not have to be edited if the site ever grows a popup, only if COOP disappears.
    "same-origin, or same-origin-allow-popups if the site ever needs to keep a popup handle",
  ],
  [
    "access-control-allow-origin",
    // Exactly the site origin. `v !== "*"` also passed `null` and any foreign origin.
    (v) => ALLOWED_ACAO.includes(v),
    `Cloudflare's default is '*'; public marketing content needs no cross-origin sharing, so it must be exactly ${ALLOWED_ACAO.join(" or ")}`,
  ],
];

/** Every problem with one parsed _headers, as strings. Pure, so the negative controls below can
 *  run it over planted inputs. */
function headerProblems(ruleSet) {
  const out = [];
  const all = ruleSet.find((r) => r.pattern === "/*");
  if (!all) return ["_headers must have a /* rule that every response inherits"];
  for (const [header, ok, description] of REQUIRED) {
    const value = all.byName[header];
    if (value === undefined) out.push(`/* does not send ${header}\n      ${description}`);
    else if (!ok(value)) {
      const extra = header === "content-security-policy" ? cspProblems(value).map((p) => `\n      - ${p}`).join("") : "";
      out.push(`/* sends ${header}, but the value is wrong\n      ${description}\n      got: ${value}${extra}`);
    }
  }
  // Cloudflare applies EVERY matching rule, so the catch-all is not the whole answer: a later
  // rule can set a second copy or detach one with "! Name" for the paths it matches.
  out.push(...routeProblems(ruleSet));
  return out;
}

for (const p of headerProblems(rules)) check(false, p);

/* NEGATIVE CONTROLS, run every time. Each plants one weakening into an in-memory copy of the real
 * rules and requires headerProblems to see it. If the predicate ever goes soft again, the guard
 * fails on its own reach instead of printing a PASS it cannot back. */
{
  const csp = catchAll.byName["content-security-policy"] || "";
  const withCsp = (next) => rules.map((r) => r === catchAll
    ? { ...r, headers: r.headers.map((h) => h.name === "content-security-policy" ? { ...h, value: next } : h),
        byName: { ...r.byName, "content-security-policy": next } }
    : r);
  const setDir = (name, val) => csp.replace(new RegExp(`(^|;\\s*)${name}\\s[^;]*`), `$1${name} ${val}`);
  const dropDir = (name) => csp.replace(new RegExp(`(^|;)\\s*${name}\\s[^;]*;?`), "$1");
  const planted = [
    ["frame-ancestors *", withCsp(setDir("frame-ancestors", "*"))],
    ["frame-ancestors with a foreign host", withCsp(setDir("frame-ancestors", "'self' https://evil.example"))],
    ["script-src *", withCsp(setDir("script-src", "*"))],
    ["script-src 'self' https:", withCsp(setDir("script-src", "'self' https:"))],
    ["script-src 'unsafe-inline'", withCsp(setDir("script-src", "'self' 'unsafe-inline'"))],
    ["an unreviewed wildcard host in connect-src", withCsp(setDir("connect-src", "'self' https://*.google.com"))],
    ["object-src 'self'", withCsp(setDir("object-src", "'self'"))],
    ["base-uri missing", withCsp(dropDir("base-uri"))],
    ["form-action missing", withCsp(dropDir("form-action"))],
    ["script-src missing", withCsp(dropDir("script-src"))],
    ["a looser duplicate default-src first", withCsp(`default-src *; ${csp}`)],
    ["ACAO null", rules.map((r) => r === catchAll ? { ...r, byName: { ...r.byName, "access-control-allow-origin": "null" } } : r)],
    ["a route rule detaching the CSP", [...rules, { pattern: "/public/*", headers: [], detached: ["content-security-policy"], byName: {} }]],
    ["a route rule adding a second ACAO", [...rules, { pattern: "/x/*", headers: [{ name: "access-control-allow-origin", value: "*" }], detached: [], byName: {} }]],
  ];
  for (const [what, ruleSet] of planted) {
    check(headerProblems(ruleSet).length > 0, `self-test: the guard ACCEPTED a planted weakening (${what})`);
  }
}

// The guard's own reach. A list that silently shrinks passes; this fails instead.
check(
  REQUIRED.length >= 8,
  "the required-header list has shrunk",
  `expected at least 8 headers, the list has ${REQUIRED.length}`,
);

if (fails) {
  console.error(
    `\ncheck-security-headers: ${fails} problem(s) in _headers.\n` +
      "A missing security header is not visible to any scan that looks for what is written. " +
      "Add it to the /* rule, and say why in a comment beside it.",
  );
  process.exit(1);
}

console.log(
  `check-security-headers: PASS — /* sends all ${REQUIRED.length} required security headers ` +
    `(COOP: ${catchAll.byName["cross-origin-opener-policy"]}; CSP judged per directive; every planted weakening refused).`,
);
