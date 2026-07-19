// Google Ads tag invariants for the marketing site.
//
// Why this exists: consent.js and the _headers CSP are hand-maintained, and the
// exact class of bug they are prone to is INVISIBLE to code review — the site
// keeps rendering perfectly while measurement silently dies. Two real instances:
// pagead2.googlesyndication.com was missing from the CSP (found only by watching
// a live browser, because every other Google host in the list IS genuinely used),
// and a second gtag load would double-count every conversion with no visible
// symptom. Google's own install docs invite exactly that second load: pasting
// their base-tag snippet into index.html on top of consent.js would produce two
// gtag.js loads, two dataLayer inits, and two config calls.
//
// So this asserts the SHAPE of the integration, statically, in CI:
//   one tag load, one js, one config, consent defaults first, no PII params,
//   no AMP, and a CSP that names every host the beacon actually contacts.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const consent = read('consent.js');
const index = read('index.html');
const headers = read('_headers');
const app = read('app.js');

let fails = 0;
const check = (ok, label, detail) => {
  if (ok) return;
  fails++;
  console.error(`FAIL: ${label}${detail ? `\n      ${detail}` : ''}`);
};
const count = (s, re) => (s.match(re) || []).length;

// --- 1. Exactly one tag load, and it is guarded so a double include is inert.
check(
  count(consent, /googletagmanager\.com\/gtag\/js/g) === 1,
  'consent.js must reference gtag.js exactly once',
  `found ${count(consent, /googletagmanager\.com\/gtag\/js/g)}`,
);
check(
  /__bugitTagLoaded/.test(consent),
  'the tag load must be guarded by the __bugitTagLoaded flag (double-include safety)',
);
check(
  count(index, /googletagmanager\.com/g) === 0,
  'index.html must NOT inline a Google tag — consent.js is the only load site',
  "pasting Google's base-tag snippet here would double-load gtag.js",
);
check(
  count(app, /googletagmanager\.com\/gtag\/js/g) === 0,
  'app.js must not load gtag.js (consent.js owns the single load)',
);

// --- 2. Exactly one js + one config call, site-wide.
for (const [cmd, re] of [
  ["gtag('js')", /gtag\(\s*['"]js['"]/g],
  ["gtag('config')", /gtag\(\s*['"]config['"]/g],
]) {
  const n = count(consent, re) + count(app, re) + count(index, re);
  check(n === 1, `${cmd} must be issued exactly once across the site`, `found ${n}`);
}

// --- 3. Consent Mode v2 defaults are registered BEFORE the tag loads. Source
//        order inside consent.js is what guarantees this at runtime.
const defaultAt = consent.search(/gtag\(\s*['"]consent['"]\s*,\s*['"]default['"]/);
const loadAt = consent.search(/googletagmanager\.com\/gtag\/js/);
check(defaultAt !== -1, "consent.js must set Consent Mode v2 defaults via gtag('consent','default',…)");
check(
  defaultAt !== -1 && loadAt !== -1 && defaultAt < loadAt,
  'Consent Mode defaults must be set BEFORE gtag.js is loaded',
  `default at ${defaultAt}, tag load at ${loadAt}`,
);
for (const sig of ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']) {
  check(
    new RegExp(`${sig}:\\s*'denied'`).test(consent),
    `Consent Mode default for ${sig} must be 'denied'`,
  );
}
check(
  /consent\.js/.test(index) &&
    index.search(/consent\.js/) < index.search(/\/app\.js/),
  'index.html must load consent.js before app.js',
);

// --- 4. The Ads ID is defined in exactly ONE place (build.js rewrites that line).
const idDefs = count(consent, /var ADS_ID\s*=/g);
check(idDefs === 1, 'the Google Ads ID must be defined exactly once in consent.js', `found ${idDefs}`);
check(
  /^AW-[A-Za-z0-9]+$/.test((consent.match(/var ADS_ID\s*=\s*'([^']+)'/) || [])[1] || ''),
  'the Google Ads ID must be a well-formed AW-… tag',
);
for (const file of [['index.html', index], ['app.js', app]]) {
  check(
    !/AW-\d+/.test(file[1]),
    `${file[0]} must not hardcode an AW-… id (single source of truth is consent.js)`,
  );
}

// --- 5. No PII / enhanced conversions anywhere. `ad_user_data` is a Consent Mode
//        SIGNAL and is expected; a bare `user_data` gtag param is not.
for (const [name, src] of [['consent.js', consent], ['app.js', app], ['index.html', index]]) {
  check(
    !/allow_enhanced_conversions/.test(src),
    `${name} must not enable enhanced conversions`,
  );
  check(
    !/(^|[^_a-z])user_data\s*:/.test(src.replace(/ad_user_data/g, 'AD_UD')),
    `${name} must not send a user_data param (PII)`,
  );
}

// --- 6. The marketing site fires no purchase conversion. The conversion is a
//        portal concern (server-verified + durably deduped); a copy here could
//        fire on an unverified page load and over-count.
check(
  !/['"]conversion['"]/.test(consent) && !/send_to/.test(consent + app + index),
  'the marketing site must not send a conversion event (portal owns it, server-verified)',
);
// Google's sample values, which must never be pasted in verbatim. The key may be
// quoted ('currency': …) or bare (currency: …) — Google's own snippet quotes it,
// so both forms must be caught or this guard misses the literal paste it exists for.
const KEY = (k) => `['"]?${k}['"]?\\s*:\\s*`;
check(
  !new RegExp(KEY('currency') + `['"]JPY['"]`).test(consent + app + index),
  "Google's sample JPY currency must never be hardcoded (BugIt prices in USD)",
);
check(
  !new RegExp(KEY('transaction_id') + `(['"]['"]|undefined|null)`).test(consent + app + index),
  "Google's sample empty transaction_id must never be used (it breaks dedup)",
);
check(
  !new RegExp(KEY('value') + `1\\.0*\\s*[,}]`).test(consent + app + index),
  "Google's placeholder value of 1.0 must never be hardcoded (value is server-verified)",
);

// --- 7. AMP is not used. If that ever changes, this test must be revisited
//        deliberately rather than AMP being bolted on silently.
for (const [name, src] of [['consent.js', consent], ['app.js', app], ['index.html', index], ['_headers', headers]]) {
  check(
    !/amp-analytics|cdn\.ampproject\.org|rel=["']amphtml["']/.test(src),
    `${name} must contain no AMP artifacts — BugIt ships no AMP pages`,
  );
}

// --- 8. The CSP must name every host the tag + beacon actually contact. Verified
//        against a live browser, NOT by inspection: pagead2.googlesyndication.com
//        serves the Consent Mode /ccm/collect hit and was missed here once.
const csp = (headers.match(/Content-Security-Policy:\s*(.+)/) || [])[1] || '';
check(csp !== '', '_headers must define a Content-Security-Policy');
const directive = (name) =>
  (csp.split(';').map((s) => s.trim()).find((s) => s.startsWith(name + ' ')) || '');
check(
  directive('script-src').includes('https://www.googletagmanager.com'),
  'script-src must allow googletagmanager.com (gtag.js)',
);
const BEACON_HOSTS = [
  'https://www.googletagmanager.com',
  'https://www.google.com',
  'https://www.googleadservices.com',
  'https://googleads.g.doubleclick.net',
  'https://td.doubleclick.net',
  'https://pagead2.googlesyndication.com',
];
for (const d of ['img-src', 'connect-src']) {
  const missing = BEACON_HOSTS.filter((h) => !directive(d).includes(h));
  check(
    missing.length === 0,
    `${d} must allow every Google measurement host`,
    `missing: ${missing.join(', ')}`,
  );
}
check(
  !/cdn\.ampproject\.org/.test(csp),
  'the CSP must not allow AMP hosts — no AMP pages exist to need them',
);

if (fails) {
  console.error(`\ncheck-ads-tag: ${fails} failure(s).`);
  process.exit(1);
}
console.log('check-ads-tag: OK — single gtag load, consent-first, no PII, no AMP, CSP complete.');
