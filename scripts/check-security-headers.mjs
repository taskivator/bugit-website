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

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const raw = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");

// --- Parse _headers into [{ pattern, headers }]. Same grammar check-cache-headers.mjs uses:
//     an unindented line opens a rule, an indented "Name: value" adds a header to it, and a
//     line whose first non-space character is '#' is a comment even when indented.
const rules = [];
let current = null;
for (const line of raw.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  if (!/^\s/.test(line)) {
    current = { pattern: line.trim(), headers: {} };
    rules.push(current);
  } else if (current) {
    const m = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (m) current.headers[m[1].toLowerCase()] = m[2].trim();
  }
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
    (v) =>
      /default-src\s+'self'/.test(v) &&
      /object-src\s+'none'/.test(v) &&
      /base-uri\s+'self'/.test(v) &&
      /frame-ancestors/.test(v),
    "must set default-src 'self', object-src 'none', base-uri 'self' and frame-ancestors",
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
    (v) => v !== "*",
    "Cloudflare's default is '*'; public marketing content needs no cross-origin sharing",
  ],
];

for (const [header, ok, description] of REQUIRED) {
  const value = catchAll.headers[header];
  if (value === undefined) {
    check(false, `/* does not send ${header}`, description);
  } else {
    check(ok(value), `/* sends ${header}, but the value is wrong`, `${description}\n      got: ${value}`);
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
    `(COOP: ${catchAll.headers["cross-origin-opener-policy"]}).`,
);
