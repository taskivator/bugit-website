#!/usr/bin/env node
/**
 * RC3 §26 — Option A (block advertising before consent) behavioural guard.
 *
 * The marketing site historically loaded the Google Ads tag on every page and
 * relied on Consent Mode to redact pings ("the tag is always loaded; consent
 * controls storage, not tag presence"). The owner selected Option A: the Google
 * Ads script must NOT load, and no advertising request/cookie/attribution id may
 * be issued, until the visitor EXPLICITLY grants advertising.
 *
 * This does not merely grep consent.js — it EXECUTES it inside a fabricated
 * browser (node:vm) and asserts the real runtime behaviour for each Option A rule
 * the site can technically enforce. Rules that depend on the visitor's browser or
 * on Google's servers (e.g. Google never re-transmitting a redacted ping) are
 * outside what this file can prove and are documented, not asserted.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONSENT_SRC = fs.readFileSync(path.join(ROOT, "consent.js"), "utf8");
const TAG_HOST = "googletagmanager.com/gtag/js";

let failures = 0;
const check = (ok, msg) => { if (!ok) { console.error(`FAIL: ${msg}`); failures++; } };

/* Build a fresh fake browser and execute consent.js in it.
 * opts.cookie   — initial document.cookie jar contents (raw "a=b; c=d")
 * opts.search   — initial location.search (for gclid capture tests)
 * opts.hostname — location.hostname (defaults to bugit.dev) */
function run(opts = {}) {
  const jar = new Map();
  if (opts.cookie) {
    for (const pair of opts.cookie.split("; ")) {
      const i = pair.indexOf("=");
      if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  const appended = [];
  const document = {
    get cookie() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(str) {
      const first = String(str).split(";")[0];
      const i = first.indexOf("=");
      if (i > 0) jar.set(first.slice(0, i).trim(), first.slice(i + 1));
    },
    createElement: () => ({ set src(v) { this._src = v; }, get src() { return this._src; } }),
    head: { appendChild: (node) => appended.push(node && node._src) },
    documentElement: { appendChild: (node) => appended.push(node && node._src) },
  };
  const location = {
    hostname: opts.hostname || "bugit.dev",
    protocol: "https:",
    search: opts.search || "",
  };
  // In a browser window === globalThis, so `window.dataLayer = ...` creates the
  // bare `dataLayer` global that gtag() reads. Model that: the sandbox object IS
  // the global, and window points back at it.
  const sandbox = { document, location, URLSearchParams, console };
  vm.createContext(sandbox);
  sandbox.window = sandbox;
  const window = sandbox;
  vm.runInContext(CONSENT_SRC, sandbox, { filename: "consent.js" });
  const adScripts = () => appended.filter((s) => s && s.includes(TAG_HOST));
  return { window, jar, appended, adScripts };
}

// 1. Fresh visit, no decision → NO advertising script, no tag-loaded flag. -----
{
  const t = run();
  check(t.adScripts().length === 0, "advertising tag loaded before any consent (Option A rule 1)");
  check(!t.window.__bugitTagLoaded, "__bugitTagLoaded set before consent");
  // Consent Mode default must be present and denied (defence in depth).
  const dl = t.window.dataLayer || [];
  const def = dl.find((a) => a && a[0] === "consent" && a[1] === "default");
  check(!!def && def[2] && def[2].ad_storage === "denied", "Consent Mode default is not denied ad_storage");
}

// 2. Reject non-essential → still NO advertising script. -----------------------
{
  const t = run();
  t.window.BugitConsent.write({ ad_storage: false, ad_user_data: false, ad_personalization: false, analytics_storage: false });
  check(t.adScripts().length === 0, "advertising tag loaded after REJECT (rules 8/9)");
}

// 3. Analytics-only grant → still NO advertising script. -----------------------
{
  const t = run();
  t.window.BugitConsent.write({ ad_storage: false, ad_user_data: false, ad_personalization: false, analytics_storage: true });
  check(t.adScripts().length === 0, "advertising tag loaded on analytics-only consent (rule 14 separation)");
}

// 4. Explicit advertising grant → EXACTLY ONE advertising script + granted update.
{
  const t = run();
  t.window.BugitConsent.write({ ad_storage: true, ad_user_data: true, ad_personalization: true, analytics_storage: true });
  check(t.adScripts().length === 1, `expected exactly one advertising tag after grant, got ${t.adScripts().length} (rule 11)`);
  const dl = t.window.dataLayer || [];
  const upd = dl.filter((a) => a && a[0] === "consent" && a[1] === "update").pop();
  check(!!upd && upd[2] && upd[2].ad_storage === "granted", "no granted Consent Mode update after accept");
}

// 5. Second grant write → still exactly one script (idempotent per page). -------
{
  const t = run();
  t.window.BugitConsent.write({ ad_storage: true, ad_user_data: true, ad_personalization: true, analytics_storage: true });
  t.window.BugitConsent.write({ ad_storage: true, ad_user_data: true, ad_personalization: true, analytics_storage: true });
  check(t.adScripts().length === 1, "advertising tag injected more than once (idempotency broken)");
}

// 6. Prior GRANTED decision (returning visitor) → tag replays on load. ----------
{
  const granted = encodeURIComponent(JSON.stringify({ v: 1, ad_storage: true, analytics_storage: true, ad_user_data: true, ad_personalization: true, ts: 1 }));
  const t = run({ cookie: `bugit_consent=${granted}` });
  check(t.adScripts().length === 1, "prior advertising grant did not replay the tag on load (rule 12 continuity)");
}

// 7. Prior DENIED decision → tag stays unloaded on load. ------------------------
{
  const denied = encodeURIComponent(JSON.stringify({ v: 1, ad_storage: false, analytics_storage: false, ad_user_data: false, ad_personalization: false, ts: 1 }));
  const t = run({ cookie: `bugit_consent=${denied}` });
  check(t.adScripts().length === 0, "a stored DENIED decision still loaded the advertising tag");
}

// 8. gclid attribution is NOT captured before consent, and IS after grant. ------
{
  const t = run({ search: "?gclid=TESTCLICK123" });
  check(!t.jar.has("bugit_gclid"), "attribution (gclid) stored before advertising consent (rules 4-7)");
  t.window.BugitConsent.write({ ad_storage: true, ad_user_data: true, ad_personalization: true, analytics_storage: true });
  check(t.jar.has("bugit_gclid"), "attribution (gclid) not captured after advertising grant");
}

// 9. Withdrawal: a granted session that revokes pushes a denied update, and a
//    FRESH load with the now-denied cookie does not load the tag (rule 12). -----
{
  const granted = encodeURIComponent(JSON.stringify({ v: 1, ad_storage: true, analytics_storage: true, ad_user_data: true, ad_personalization: true, ts: 1 }));
  const t = run({ cookie: `bugit_consent=${granted}` });
  t.window.BugitConsent.write({ ad_storage: false, ad_user_data: false, ad_personalization: false, analytics_storage: false });
  const dl = t.window.dataLayer || [];
  const upd = dl.filter((a) => a && a[0] === "consent" && a[1] === "update").pop();
  check(!!upd && upd[2] && upd[2].ad_storage === "denied", "withdrawal did not push a denied Consent Mode update");
  const reload = run({ cookie: t.document ? "" : "" }); // fresh load, cookie now denied in the same jar
  // Re-derive the denied cookie the withdrawal just wrote:
  const deniedCookie = [...t.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const after = run({ cookie: deniedCookie });
  check(after.adScripts().length === 0, "advertising tag loaded on a fresh page after withdrawal (rule 12)");
  void reload;
}

// 10. consent.js must not itself pull in a Cloudflare beacon — Cloudflare Web
//     Analytics is classified and disclosed separately (rule 15). --------------
check(!/cloudflareinsights|static\.cloudflare|beacon\.min\.js/i.test(CONSENT_SRC),
  "consent.js references a Cloudflare analytics beacon (must be classified separately, rule 15)");

if (failures) {
  console.error(`\ncheck-consent-option-a: ${failures} failure(s).`);
  process.exit(1);
}
console.log("check-consent-option-a: OK — no advertising before explicit consent (10 behavioural checks).");
