// The marketing site's CSP must grant no telemetry destination it does not use.
//
// WHY THIS EXISTS. The CSP allow-listed static.cloudflareinsights.com on
// script-src and cloudflareinsights.com on connect-src for a Cloudflare Web
// Analytics beacon that was NOT loading: a fetch of the live homepage, pricing,
// privacy and terms pages contained zero references to it, /cdn-cgi/zaraz/i.js
// returned 404, and the privacy policy disclosed no Cloudflare browser
// telemetry. So the policy was advertising a data destination that nothing used
// and no customer had been told about.
//
// That combination is worse than it looks. A reader auditing the CSP reasonably
// concludes the site ships Cloudflare analytics — the allowlist is the only
// evidence they have — and a privacy review that starts from the CSP would find
// an undisclosed processor. Meanwhile the permission sits there ready to be used
// by anything that can inject a script tag.
//
// A CSP is a list of places the browser is ALLOWED to send data. Entries that
// exist "just in case" are not free.

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

check(csp.length > 0, '_headers defines a Content-Security-Policy');

// Retired: removed 2026-07-20 after confirming the beacon does not load and is
// not disclosed. If Cloudflare Web Analytics is ever genuinely adopted, adding
// the host back is fine — but it must arrive together with a privacy-policy
// disclosure and an actually-loading beacon, which is exactly what this guard
// forces someone to think about.
const RETIRED_TELEMETRY_HOSTS = [
  'static.cloudflareinsights.com',
  'cloudflareinsights.com',
];

for (const host of RETIRED_TELEMETRY_HOSTS) {
  check(
    !csp.includes(host),
    `${host} was retired from the CSP and must not return`,
    'It was allow-listed for a beacon that never loaded and was never disclosed.',
  );
}

// Nothing in the shipped source may load one either — the CSP and the code have
// to agree, otherwise removing the host just turns a silent grant into a silent
// block.
for (const file of ['index.html', 'app.js', 'consent.js', '404.html']) {
  const src = read(file);
  for (const host of RETIRED_TELEMETRY_HOSTS) {
    check(!src.includes(host), `${file} must not reference ${host}`);
  }
  check(
    !/cdn-cgi\/(zaraz|beacon)/.test(src),
    `${file} must not reference a Cloudflare injected-telemetry endpoint`,
  );
}

// Generic backstop: no third-party analytics destination may appear in the
// policy without someone deliberately editing this list.
const APPROVED_THIRD_PARTY = [
  'googletagmanager.com',
  'google.com',
  'google.co.jp',
  'googleadservices.com',
  'doubleclick.net',
  'googlesyndication.com',
  'google-analytics.com',
  'portal.bugit.dev',
];
const hosts = [...csp.matchAll(/https:\/\/([a-z0-9.-]+)/g)].map((m) => m[1]);
for (const h of new Set(hosts)) {
  check(
    APPROVED_THIRD_PARTY.some((a) => h === a || h.endsWith(`.${a}`) || h === a.replace(/^www\./, '')),
    `${h} is granted by the CSP but is not an approved destination`,
    'Add it here deliberately, with a disclosure, or remove it from _headers.',
  );
}

if (fails) {
  console.error(`\ncheck-csp-telemetry: ${fails} failure(s).`);
  process.exit(1);
}
console.log('check-csp-telemetry: OK — no unused or undisclosed telemetry destination in the CSP.');
