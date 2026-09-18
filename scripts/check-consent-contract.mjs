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

for (const field of CONSENT_FIELDS) {
  check(
    new RegExp(`${field}: o\\.${field} === true`).test(websiteSrc),
    `readConsent must require a literal true for ${field}`,
    "`!!o.field` treats 1, \"false\" and any object as a grant",
  );
}

check(
  /hasDecision: function \(\) \{ return readConsent\(\) !== null; \}/.test(websiteSrc),
  "hasDecision must agree with readConsent",
  "answering true for a cookie readConsent rejects suppresses the banner while the visitor sits " +
    "at the denied default with no way back to the choice",
);

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

for (const field of CONSENT_FIELDS) {
  check(
    new RegExp(`${field}: o\\.${field} === true`).test(portalSrc),
    `the portal must still require a literal true for ${field}`,
  );
}

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
    "strictly, and for the same four categories.",
);
