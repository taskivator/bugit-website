// Every browser-facing telemetry destination in the CSP must be (a) actually
// used and (b) disclosed in the privacy policy — and every telemetry service
// that IS running must be granted.
//
// WHY THIS EXISTS, and why it says the opposite of what its first draft said.
//
// I removed static.cloudflareinsights.com and cloudflareinsights.com from this
// CSP on the grounds that nothing loaded them and nothing disclosed them. Both
// halves of that were wrong, and each was wrong for an instructive reason:
//
//   "Nothing loads it."  Cloudflare Web Analytics is auto-installed at the EDGE
//     (rum/site_info: auto_install true, ruleset enabled for zone bugit.dev).
//     Cloudflare's HTML rewriter only injects the beacon for browser-like
//     requests, so a plain `curl` — no browser User-Agent, no text/html Accept
//     header — receives a page with no beacon in it. Fetching the same URL with
//     ordinary Chrome headers returns the script tag. A bare curl is not a
//     browser, and "I did not see it" is not "it is not there".
//
//   "Nothing discloses it."  https://bugit.dev/privacy is a 404: the policy
//     lives at /public/docs/PRIVACY.md. The 404 body naturally contained no
//     mention of Cloudflare, and I read that absence as evidence. The real
//     policy says plainly: "BugIt uses Cloudflare Web Analytics to understand
//     general website performance and visit counts."
//
// Removing the hosts therefore did not tidy a stale allowlist — it CSP-blocked a
// live, disclosed analytics service in production. The repository already warned
// about precisely this class of error ("do not prune this list by inspection;
// verify against a live page"), and the warning was followed with a client that
// could not observe the thing being verified.
//
// So the invariant is not "no telemetry hosts". It is CONSISTENCY: the CSP, the
// running service and the privacy policy must agree. Adding a destination
// requires a disclosure; removing one requires actually disabling the service.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

let fails = 0;
const check = (ok, label, detail) => {
  if (ok) return;
  fails++;
  console.error(`FAIL: ${label}${detail ? `\n      ${detail}` : ''}`);
};

const headers = read('_headers');
const csp = (headers.match(/Content-Security-Policy:.*/) ?? [''])[0];
const privacy = read('public/docs/PRIVACY.md');

check(csp.length > 0, '_headers defines a Content-Security-Policy');

const directive = (name) => {
  const m = csp.match(new RegExp(`(?:^|;)\\s*${name}\\s([^;]*)`));
  return m ? m[1] : '';
};

// --- active, disclosed telemetry must be GRANTED --------------------------
// Cloudflare Web Analytics is enabled at the zone level with auto_install, so
// the beacon is injected into browser responses whether or not this repository
// references it. The CSP has to allow what the edge inserts.
const CLOUDFLARE_TELEMETRY = [
  {
    host: 'https://static.cloudflareinsights.com',
    directive: 'script-src',
    what: 'serves beacon.min.js, injected at the edge by Cloudflare Web Analytics',
  },
  {
    host: 'https://cloudflareinsights.com',
    directive: 'connect-src',
    what: 'receives the RUM beacon (/cdn-cgi/rum)',
  },
];

for (const { host, directive: d, what } of CLOUDFLARE_TELEMETRY) {
  check(
    directive(d).includes(host),
    `${d} must allow ${host}`,
    `${what}. Removing it CSP-blocks a live analytics service. ` +
      'If Web Analytics has genuinely been turned off in the Cloudflare dashboard, ' +
      'remove this entry AND the privacy-policy paragraph in the same change.',
  );
}

// --- and it must be DISCLOSED --------------------------------------------
check(
  /cloudflare web analytics/i.test(privacy),
  'the privacy policy must disclose Cloudflare Web Analytics while the beacon runs',
  'A granted and running telemetry destination that customers were never told ' +
    'about is an undisclosed processor.',
);

// --- nothing else may appear ---------------------------------------------
// Any destination not on this list is either an accident or an undisclosed
// processor, and both should stop a build.
const APPROVED = [
  'static.cloudflareinsights.com',
  'cloudflareinsights.com',
  'www.googletagmanager.com',
  'www.google.com',
  'google.com',
  'www.google.co.jp',
  'www.googleadservices.com',
  'googleads.g.doubleclick.net',
  'td.doubleclick.net',
  'ad.doubleclick.net',
  'pagead2.googlesyndication.com',
  'www.google-analytics.com',
  'region1.google-analytics.com',
  'portal.bugit.dev',
];
for (const h of new Set([...csp.matchAll(/https:\/\/([a-z0-9.-]+)/g)].map((m) => m[1]))) {
  check(
    APPROVED.includes(h),
    `${h} is granted by the CSP but is not an approved destination`,
    'Add it here deliberately, with a privacy disclosure, or remove it from _headers.',
  );
}

// Undisclosed third-party analytics vendors: none are in use, and one arriving
// silently is exactly what this catches.
for (const vendor of ['sentry', 'datadog', 'segment', 'mixpanel', 'hotjar', 'fullstory', 'posthog', 'newrelic', 'amplitude']) {
  check(!new RegExp(vendor, 'i').test(csp), `${vendor} appears in the CSP with no disclosure`);
}

if (fails) {
  console.error(`\ncheck-csp-telemetry: ${fails} failure(s).`);
  process.exit(1);
}
console.log('check-csp-telemetry: OK — CSP, running services and privacy disclosure agree.');
