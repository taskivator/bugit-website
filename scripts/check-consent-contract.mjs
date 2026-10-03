// THE CONSENT COOKIE IS ONE CONTRACT WRITTEN TWICE, AND THE TWO COPIES DISAGREED.
//
// `bugit_consent` is set on `.bugit.dev`, so the marketing site and the portal read the same
// bytes. Both files open by saying so — consent.js: "SHARED CONSENT CONTRACT … MUST stay
// identical on both surfaces"; lib/analytics/consent.ts says the same thing. They were not
// identical:
//
//   portal   if (o.v !== CONSENT_VERSION) return null;      ad_storage: o.ad_storage === true
//   website  (v ignored entirely)                           ad_storage: !!o.ad_storage
//
// The website failed OPEN and the portal failed CLOSED, on the field that decides whether
// Google's tag loads. The day CONSENT_VERSION becomes 2, a visitor carrying a v1 cookie gets the
// banner on the portal and silent advertising on bugit.dev. It was latent, not harmless: the
// sentence promising it could not happen was sitting in both files while it was true.
//
// This guard reads the portal's module as the source of truth, so the copies cannot drift again
// without failing here. It is a STATIC read — no browser, no network — and complements
// check-consent-network.mjs, which proves the runtime behaviour but only for the current version
// number.
//
// The portal lives outside this repository, so its absence is a SKIP with exit 0 and a visible
// line, never a silent pass: a checkout with no sibling portal must not look like agreement.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishedCopy, publishedLangs } from "./lib/published-copy.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const portalConsent =
  process.env.PORTAL_CONSENT_PATH ||
  path.join(root, "..", "bugit-portal", "lib", "analytics", "consent.ts");

let fails = 0;
const check = (ok, label, detail) => {
  if (ok) return;
  fails++;
  console.error(`FAIL: ${label}${detail ? `\n      ${detail}` : ""}`);
};

const websiteSrc = readFileSync(path.join(root, "consent.js"), "utf8");

// --- What this side does, read from the source rather than assumed.
const CONSENT_FIELDS = ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"];

check(
  /var CONSENT_VERSION = (\d+);/.test(websiteSrc),
  "consent.js must name the contract version in one place",
  "a literal `v: 1` at each use is how the two sides drifted",
);

check(
  /if \(o\.v !== CONSENT_VERSION\) return null;/.test(websiteSrc),
  "readConsent must reject a cookie from a different contract version",
  "ignoring `v` means a stale record keeps granting advertising after the contract changes",
);

// analytics_storage is not in this list on purpose. Since 2026-09-24 nothing can grant it (see
// the Analytics-switch block below), and a `true` stored while the switch existed must NOT be
// replayed: the visitor has no control left to withdraw it. So both parsers read it as the
// constant false, and that is pinned separately below.
const GRANTABLE_FIELDS = CONSENT_FIELDS.filter((f) => f !== "analytics_storage");
const READS_ANALYTICS_AS_DENIED = /analytics_storage: false,/;

for (const field of GRANTABLE_FIELDS) {
  check(
    new RegExp(`${field}: o\\.${field} === true`).test(websiteSrc),
    `readConsent must require a literal true for ${field}`,
    "`!!o.field` treats 1, \"false\" and any object as a grant",
  );
}
check(
  READS_ANALYTICS_AS_DENIED.test(websiteSrc) && !/analytics_storage: o\.analytics_storage/.test(websiteSrc),
  "readConsent must read analytics_storage as denied, whatever the cookie says",
  "a stored grant from the retired Analytics switch would otherwise be replayed with no way to withdraw it",
);
check(
  !/analytics_storage: !!c\.analytics_storage/.test(websiteSrc),
  "writeConsent must not copy analytics_storage from its caller",
);

check(
  /hasDecision: function \(\) \{ return readConsent\(\) !== null; \}/.test(websiteSrc),
  "hasDecision must agree with readConsent",
  "answering true for a cookie readConsent rejects suppresses the banner while the visitor sits " +
    "at the denied default with no way back to the choice",
);

// --- WITHDRAWAL, which is a different promise from refusal (CR-08-F06).
//
// The site tells visitors that rejecting advertising means no further Google request fires and
// nothing is kept. Stopping new writes is not that: the `bugit_gclid` click id already written
// under an earlier grant survived the rejection for its full ninety days and kept travelling to
// the Portal on the shared .bugit.dev domain. And the reload that purges the loaded Google
// runtime fired only in the document that wrote the denial, so any other open tab carried on.
check(
  /function deleteCookie\(/.test(websiteSrc),
  "consent.js must be able to delete a cookie, not only write one",
  "setCookie only ever takes a positive lifetime, so nothing could remove stored attribution",
);

// Brace-tolerant: writeConsent's denial branch started as a bare statement
// (`if (...) deleteCookie(...);`) and grew a second call alongside it
// (W1 F2, 2026-09-24 audit) as `if (...) { deleteCookie(...); clearGoogleAdCookies(); }`.
// Pinning the exact old text would have made a correct second call to a hollow guard.
check(
  /if \(!payload\.ad_storage\) \{?\s*deleteCookie\(GCLID_COOKIE\);/.test(websiteSrc),
  "writing a denial must delete the stored click id",
  "refusing to write a new one leaves the old one in place for ninety days",
);

// --- GOOGLE'S OWN COOKIE, not only the site's (W1 F2, 2026-09-24 audit).
//
// bugit_gclid is this file's own cookie; the Ads tag can write its own _gcl_au (and other
// _gcl_* names) itself while ad_storage is granted, and nothing here ever wrote those, so
// deleting bugit_gclid alone left them for their own ~90-day lifetime after a refusal. Pinned
// the same way the deletion above is: a denial must clear them, from both paths that write one.
check(
  /function clearGoogleAdCookies\(\)/.test(websiteSrc) && /\/\^_gcl_\//.test(websiteSrc),
  "consent.js must be able to clear every _gcl_* cookie by name, not a fixed list",
  "the Ads tag can write a _gcl_ name this file never listed; matching by prefix still clears it",
);
check(
  /if \(!payload\.ad_storage\) \{?\s*deleteCookie\(GCLID_COOKIE\);\s*clearGoogleAdCookies\(\);/.test(websiteSrc),
  "writing a denial must also clear Google's own _gcl_* cookies",
  "bugit_gclid going away is not the same promise as removing what Google itself wrote",
);
check(
  /deleteCookie\(GCLID_COOKIE\);\s*clearGoogleAdCookies\(\);\s*try \{ location\.reload/.test(websiteSrc),
  "a tab reconciling a revoked decision must also clear Google's own _gcl_* cookies",
  "a background tab that revokes on refocus must leave the visitor in the same state a " +
    "same-tab revoke does",
);

check(
  /document\.cookie = name \+ dead \+ domainAttr\(\) \+ secureAttr\(\);/.test(websiteSrc) &&
    /document\.cookie = name \+ dead \+ secureAttr\(\);/.test(websiteSrc),
  "the deletion must cover both cookie scopes",
  "a cookie is identified by name+Domain+Path, so deleting the host-only one leaves the " +
    "Domain=.bugit.dev one exactly where it was",
);

check(
  /function reconcileWithStoredDecision\(\)/.test(websiteSrc) &&
    /visibilitychange/.test(websiteSrc) &&
    /window\.addEventListener\('focus', reconcileWithStoredDecision\)/.test(websiteSrc),
  "a tab must re-read the decision when it comes back to the foreground",
  "cookies raise no storage event, so a tab that was open when another one revoked consent " +
    "keeps running the tag it loaded under the old grant",
);

check(
  /if \(!window\.__bugitTagLoaded\) return;/.test(websiteSrc),
  "reconciliation must do nothing unless the tag is actually loaded",
  "without that guard the reload condition stays true after the reload and the page loops",
);

// --- THERE IS NO ANALYTICS SWITCH, and there must not be one again (2026-09-24).
//
// The preferences panel offered an "Analytics" toggle that controlled nothing. Nothing on this
// site is analytics the visitor can switch: the only Google tag is the Ads tag, gated on
// ad_storage, and there is no Google Analytics. The Cloudflare Web Analytics beacon is
// cookieless, injected at the edge, allowed before consent on purpose (check-consent-network)
// and disclosed in the privacy policy as always on, so a toggle could not have stopped it. A
// switch that changes nothing is a false promise of choice, so this asserts its ABSENCE.
//
// The analytics_storage FIELD is a different matter and stays: it is part of the cookie
// contract above, and the Portal's parser requires it. So the banner must still write it, and
// write it as false, from every path (Accept all, Reject, Save).
const indexSrc = readFileSync(path.join(root, "index.html"), "utf8");
const appSrc = readFileSync(path.join(root, "app.js"), "utf8");
check(
  !indexSrc.includes('id="consentAnalytics"') && !indexSrc.includes('data-t="consent.analytics'),
  "index.html must not offer an Analytics consent switch",
  "no visitor-switchable analytics exists on this site; the toggle would control nothing",
);
check(
  !appSrc.includes("getElementById('consentAnalytics')"),
  "the consent controller must not read an Analytics switch",
);
const consentTable = (appSrc.match(/const consentI18n = \{([\s\S]*?)\n\};/) || [])[1];
check(consentTable !== undefined, "app.js consentI18n table not found");
check(
  consentTable === undefined || !/\banalytics(?:Desc)?\s*:/.test(consentTable),
  "consentI18n must not carry analytics/analyticsDesc labels for a switch that does not exist",
);
check(
  appSrc.includes("analytics_storage:false});"),
  "the banner must still write analytics_storage, always false",
  "the field is part of the shared cookie contract even though nothing grants it",
);
check(
  !/analytics_storage:(?!false\})/.test(appSrc),
  "analytics_storage must never be written from a variable or as true",
);

// --- THE PUBLISHED PAGES ARE THE OTHER SIDE OF consent.js NOW (2026-10-04).
//
// On that day bugit.dev became the redesign: build.js publishes v2/index.html as / and
// v2/docs/index.html as /docs/. Everything above about the banner reads index.html and app.js,
// which still ship but are referenced by no published page, so on their own they described a
// banner no visitor sees. The banner the pages actually show is v2/consent-ui.js, which builds its
// own markup and drives the decision through window.BugitConsent. The contract between consent.js
// and a published page is therefore:
//
//   * the page loads /consent.js in <head>, before any other script, so the denied Consent Mode
//     default and the decision exist before anything else runs;
//   * the page loads /v2/consent-ui.js (after consent.js) and /v2/consent.css, and offers a
//     [data-consent-open] control so a decision can be revisited from the page;
//   * no Analytics switch, on the page or in the banner, for the same reason as above;
//   * consent-ui.js keeps the ids other code depends on (consentBanner, which guide.js refuses to
//     cover, and the three buttons), calls only methods consent.js actually exports, shows itself
//     only when hasDecision() is false, writes analytics_storage as the constant false on every
//     path, and carries its strings for every published language.
//
// The page list comes from scripts/lib/published-copy.mjs; the predicates are functions, run first
// over planted defects in memory, and a control that does not fire fails this guard.
const uiRel = "v2/consent-ui.js";
const uiSrc = readFileSync(path.join(root, uiRel), "utf8");
const exported = new Set(
  [...((websiteSrc.match(/window\.BugitConsent = \{([\s\S]*?)\n\s*\};/) || [])[1] || "").matchAll(/^\s*(\w+):/gm)].map((m) => m[1]),
);
check(exported.has("read") && exported.has("write") && exported.has("hasDecision"),
  "consent.js must export read, write and hasDecision on window.BugitConsent",
  `found: ${[...exported].join(", ") || "(none)"}`);

function pageConsentProblems(html) {
  const problems = [];
  const headEnd = html.search(/<\/head>/i);
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map((m) => ({
    at: m.index,
    src: (m[0].match(/\ssrc="([^"]+)"/) || [])[1] || null,
    tag: m[0],
  }));
  const consent = scripts.find((s) => s.src === "/consent.js");
  const ui = scripts.find((s) => s.src === "/v2/consent-ui.js");
  if (!consent) problems.push("does not load /consent.js");
  else {
    if (headEnd === -1 || consent.at > headEnd) problems.push("loads /consent.js outside <head>");
    if (/\s(?:async|defer)\b|type="module"/.test(consent.tag)) problems.push("loads /consent.js async, deferred or as a module, so it may run after other scripts");
    const before = scripts.filter((s) => s.at < consent.at && !/type="application\/ld\+json"/.test(s.tag));
    if (before.length) problems.push(`runs ${before.map((s) => s.src || "an inline script").join(", ")} before /consent.js`);
  }
  if (!ui) problems.push("does not load /v2/consent-ui.js, so no visitor is ever asked");
  else if (consent && ui.at < consent.at) problems.push("loads /v2/consent-ui.js before /consent.js");
  if (!/<link\b[^>]*href="\/v2\/consent\.css"/.test(html)) problems.push("does not load /v2/consent.css");
  if (!/\sdata-consent-open[\s>=]/.test(html)) problems.push("offers no [data-consent-open] control to revisit the decision");
  if (/consentAnalytics|data-ck="analytics/.test(html)) problems.push("offers an Analytics consent switch");
  return problems;
}

function uiProblems(src, langs) {
  const problems = [];
  for (const id of ["consentBanner", "consentAccept", "consentReject", "consentManage"]) {
    if (!new RegExp(`id: "${id}"`).test(src)) problems.push(`no longer builds #${id}`);
  }
  if (!/var C = window\.BugitConsent;/.test(src)) problems.push("does not take its API from window.BugitConsent");
  for (const m of new Set([...src.matchAll(/\bC\.(\w+)\(/g)].map((x) => x[1]))) {
    if (!exported.has(m)) problems.push(`calls C.${m}(), which consent.js does not export`);
  }
  if (!/if \(!C\.hasDecision\(\)\) open\(false\);/.test(src)) problems.push("does not open itself exactly when hasDecision() is false");
  if (!/closest\("\[data-consent-open\]"\)/.test(src)) problems.push("does not reopen from [data-consent-open]");
  const writes = [...src.matchAll(/C\.write\(\{([^}]*)\}\)/g)].map((m) => m[1]);
  if (!writes.length) problems.push("never writes a decision through C.write({...})");
  for (const w of writes) {
    if (!/analytics_storage: false\s*$/.test(w.trim()) && !/analytics_storage: false,/.test(w)) {
      problems.push("writes a decision without analytics_storage as the constant false");
    }
  }
  if (/analytics_storage:(?!\s*false\b)/.test(src)) problems.push("writes analytics_storage from something other than the constant false");
  if (/consentAnalytics/.test(src) || /\banalytics(?:Desc)?\s*:/.test(src)) problems.push("carries an Analytics switch or its labels");
  const table = (src.match(/var STRINGS = \{([\s\S]*?)\n {2}\};/) || [])[1];
  if (!table) problems.push("STRINGS table not found");
  else {
    const have = new Set([...table.matchAll(/^ {4}"([a-z-]+)": \{/gm)].map((m) => m[1]));
    const absent = langs.filter((l) => !have.has(l));
    if (absent.length) problems.push(`has no strings for published language(s) ${absent.join(", ")}`);
  }
  return problems;
}

// Negative controls, in memory: each planted defect must be reported, the clean shapes must not.
{
  const goodPage =
    '<html><head><script src="/consent.js"></script><link rel="stylesheet" href="/v2/consent.css"></head>' +
    '<body><button data-consent-open>x</button><script src="/v2/consent-ui.js"></script></body></html>';
  const pagesPlanted = [
    goodPage.replace('<script src="/consent.js"></script>', '<script src="/v2/route.js"></script><script src="/consent.js"></script>'),
    goodPage.replace('<script src="/consent.js"></script>', "").replace("</body>", '<script src="/consent.js"></script></body>'),
    goodPage.replace(' data-consent-open', ""),
    goodPage.replace('<script src="/v2/consent-ui.js"></script>', ""),
  ];
  const fired = pagesPlanted.filter((p) => pageConsentProblems(p).length).length;
  const uiPlanted = uiSrc.replace("analytics_storage: false", "analytics_storage: advertising");
  check(
    pageConsentProblems(goodPage).length === 0 && fired === pagesPlanted.length &&
      uiPlanted !== uiSrc && uiProblems(uiPlanted, publishedLangs()).length > 0 &&
      uiProblems(uiSrc.replace('id: "consentBanner"', 'id: "cookieNotice"'), publishedLangs()).length > 0,
    "negative control did not fire: a planted consent defect on a published page or in consent-ui.js went unreported",
    `page controls fired ${fired}/${pagesPlanted.length}; the clean page reported ${JSON.stringify(pageConsentProblems(goodPage))}`,
  );
}

const publishedPages = publishedCopy().filter((e) => e.kind === "page");
check(publishedPages.length >= 2, "the published pages were found", `got ${publishedPages.map((e) => e.file).join(", ") || "none"}`);
for (const page of publishedPages) {
  for (const p of pageConsentProblems(page.text)) check(false, `${page.file} ${p}`);
}
for (const p of uiProblems(uiSrc, publishedLangs())) check(false, `${uiRel} ${p}`);

// --- And now the same questions of the portal, which is the other half of the contract.
if (!existsSync(portalConsent)) {
  console.log(
    `check-consent-contract: ${fails ? `${fails} failure(s) on this side; ` : ""}` +
      `portal module not found at ${portalConsent} — the cross-surface comparison was SKIPPED. ` +
      "Set PORTAL_CONSENT_PATH to run it.",
  );
  process.exit(fails ? 1 : 0);
}

const portalSrc = readFileSync(portalConsent, "utf8");

const websiteVersion = websiteSrc.match(/var CONSENT_VERSION = (\d+);/)?.[1];
const portalVersion = portalSrc.match(/export const CONSENT_VERSION = (\d+);/)?.[1];
check(
  websiteVersion !== undefined && websiteVersion === portalVersion,
  "both surfaces must be on the same contract version",
  `website ${websiteVersion ?? "(not found)"} vs portal ${portalVersion ?? "(not found)"}`,
);

check(
  /if \(o\.v !== CONSENT_VERSION\) return null;/.test(portalSrc),
  "the portal must still reject a wrong-version cookie",
  "if the portal relaxed instead, this guard would be pinning the wrong behaviour",
);

for (const field of GRANTABLE_FIELDS) {
  check(
    new RegExp(`${field}: o\\.${field} === true`).test(portalSrc),
    `the portal must still require a literal true for ${field}`,
  );
}
check(
  READS_ANALYTICS_AS_DENIED.test(portalSrc) && !/analytics_storage: o\.analytics_storage/.test(portalSrc),
  "the portal must read analytics_storage as denied too",
  "if one surface replays a stored analytics grant and the other does not, the shared cookie means two things",
);

// The field list itself is part of the contract: one side gaining a category the other ignores is
// the same defect in a new place.
for (const field of CONSENT_FIELDS) {
  check(
    websiteSrc.includes(field) && portalSrc.includes(field),
    `${field} must exist on both surfaces`,
  );
}

if (fails) {
  console.error(`\ncheck-consent-contract: ${fails} failure(s).`);
  process.exit(1);
}
console.log(
  `check-consent-contract: OK — both surfaces parse v${websiteVersion} identically, ` +
    "strictly, and for the same four categories; " +
    `${publishedPages.length} published pages and ${uiRel} hold the consent.js contract (controls fired).`,
);
