// Strict prior-consent tag-gating — BROWSER NETWORK PROOF (owner policy 2026-07-27).
//
// Consent Mode v2 denied-default pings are NOT sufficient for BugIt: no Google script
// and no Consent Mode ping may touch the network until the visitor explicitly clicks
// "Accept all" (or grants Advertising in Manage). This test drives a real Chromium via
// Playwright, captures every network request, and PROVES:
//   1. fresh context, before any choice        -> ZERO Google requests
//   2. after "Reject non-essential"            -> ZERO Google requests
//   3. after Reject + navigation/reload        -> ZERO Google requests
//   4. after "Accept all"                      -> ONLY the intended gtag.js (AW-… id) loads
//   5. after revoke + reload                   -> ZERO further Google requests
//   6. the page stays interactive after Reject (checkout/nav CTA still present)
//   7. NO Google advertising cookie exists before acceptance
//
// Every transition those lines score (Reject, reload, navigation, Accept, withdrawal) is first
// shown to have HAPPENED, and three planted swallowed clicks must be caught (CR-08-F16). Google's
// endpoints are answered by a local stub, so the proof never depends on, or reaches, Google.
//
// Run against a local production build (node build.js && PORT=3123 node server.js) or a
// deployed origin:  CONSENT_TEST_URL=https://bugit.dev node scripts/check-consent-network.mjs
// Requires playwright-core + a Chromium (CHROME_EXE overrides the executable path).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.CONSENT_TEST_URL || "http://localhost:3123";

// The single configured Ads id (source of truth is consent.js).
const consentSrc = readFileSync(path.join(root, "consent.js"), "utf8");
const ADS_ID = (consentSrc.match(/var ADS_ID\s*=\s*'([^']+)'/) || [])[1] || "AW-";

const GOOGLE = /googletagmanager\.com|google-analytics\.com|googleads\.g\.doubleclick\.net|pagead2?\.googlesyndication\.com|googleadservices\.com|doubleclick\.net|\/pagead\/|google\.com\/(ads|pagead|ccm)|\/ccm\/collect|region\d*\.google-analytics/i;
const AD_COOKIE = /^(_ga|_gcl|_gid|IDE|test_cookie|NID|1P_JAR|__gads|__gpi)/i;

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  try { ({ chromium } = await import("playwright-core")); }
  catch { console.error("SKIP: install a browser driver first (npm i -D playwright && npx playwright install chromium)"); process.exit(2); }
}

// PRECONDITION: the origin has to actually be serving the site.
//
// Six of the nine checks below are "ZERO Google requests" checks, and a page that never
// loaded makes zero requests of any kind. Run with nothing listening on the port, this
// harness printed six `ok` lines and failed only the three that need a rendered page — a
// consent gate reporting mostly-pass against a dead socket. The zero-request result is
// only evidence when there was a page that could have made one.
{
  let reachable = false, why = "";
  try {
    const res = await fetch(BASE, { redirect: "follow" });
    const body = await res.text();
    reachable = res.ok && /id="langList"|class="brand"/.test(body);
    why = res.ok ? "served a page with no BugIt markup in it" : `answered HTTP ${res.status}`;
  } catch (e) {
    why = e.code || e.message || String(e);
  }
  if (!reachable) {
    console.error(
      `check-consent-network CANNOT RUN: ${BASE} ${why}.\n` +
      "  Nothing was proven — a page that never loads makes zero Google requests too.\n" +
      "  Start the site first:  node build.js && PORT=3123 node server.js\n" +
      "  Or point the harness at a deployed origin:  CONSENT_TEST_URL=https://bugit.dev");
    process.exit(1);
  }
}

const EXE = process.env.CHROME_EXE || undefined;
let fails = 0;
const ok = (cond, label, extra) => { if (cond) { console.log(`  ok   ${label}`); } else { fails++; console.error(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };

// EVERY THIRD PARTY, NOT ONLY GOOGLE.
//
// Checks 1-7 all ask "did GOOGLE load", and they pass cleanly. The 2026-09-02 audit (round 2,
// F-04) pointed out that this is not the question the site's own consent dialog implies an
// answer to: it splits the world into essential cookies and Google cookies, and the
// Cloudflare Web Analytics beacon that loads before any choice is in neither bucket. A guard
// keyed to "no Google" cannot see a fourth party at all, so the day one is added it stays
// green. Keyed to an ALLOWLIST, an unexpected host fails on the day it appears.
//
// This asserts what is DISCLOSED, not what is forbidden: the Cloudflare beacon is expected
// here because the site names it in the consent dialog and in the "No Agent Telemetry" card.
// Adding a host to this list means committing to disclosing it too.
// EVERY ENTRY IS A HOLE, so each one states why it is not a third party in the consent sense
// and where it is disclosed. Nothing speculative belongs here: a first draft also listed
// fonts.googleapis.com and fonts.gstatic.com "in case", and the fonts are in fact entirely
// self-hosted from /public/fonts, so those two entries would have silently pre-authorised a
// real future regression.
const ALLOWED_BEFORE_CONSENT = [
  // Cookieless page-performance measurement, injected at the edge by Cloudflare Pages. It sets
  // no cookie and fingerprints nobody. Disclosed in consent.body, in trust.telemetry and in the
  // privacy section, in all eleven locales. Cloudflare already terminates TLS for this site, so
  // the marginal disclosure is the visitor's IP and page URL to a party that necessarily has
  // both. Absent from a local build, because the edge is what injects it.
  "static.cloudflareinsights.com",
  // The site's OWN Portal, same controller, not a third party. A read-only, CORS-restricted
  // status endpoint returning { authenticated, name, dashboardUrl } and no token, so the header
  // can render "Sign in" or the account menu. It has to run before a consent choice because it
  // decides what the header shows on first paint.
  "portal.bugit.dev",
];

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

/* THE GOOGLE ENDPOINTS ANSWER LOCALLY. Every request to a Google host is still RECORDED exactly
   as before -- the `request` event fires before routing -- but it is fulfilled here instead of
   leaving the machine. That keeps this proof independent of Google's reachability, and it gives
   the tag a body this harness can see run: the stub counts its own executions, so "the tag
   loaded" is a measured fact in the page rather than an inference from a URL in a list. */
const TAG_STUB = "window.__consentProofTagRan=(window.__consentProofTagRan||0)+1;";

async function trackedContext(browser, plant) {
  const ctx = await browser.newContext();
  const reqs = [];
  const thirdParty = new Set();
  const ownHost = hostOf(BASE);
  ctx.on("request", (r) => {
    const url = r.url();
    if (GOOGLE.test(url)) reqs.push(url);
    const host = hostOf(url);
    // data:, blob: and about: have no host; same-origin is not third party.
    if (host && host !== ownHost && host !== "localhost" && host !== "127.0.0.1") {
      thirdParty.add(host);
    }
  });
  await ctx.route((u) => GOOGLE.test(u.href), (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: /gtag\/js/.test(route.request().url()) ? TAG_STUB : "",
  }).catch(() => {}));
  if (plant) await ctx.addInitScript(plant);
  return { ctx, reqs, thirdParty };
}
const settle = (p, ms = 2500) => p.waitForTimeout(ms);

/* A TRANSITION IS ONLY SCORED ONCE IT IS SHOWN TO HAVE HAPPENED (external code review CR-08-F16).
   Every navigation, click, uncheck and reload used to end in `.catch(() => {})`, and every "zero
   requests" line after it passed on a page where nothing had changed: a Reject that never
   registered, an Accept that never loaded the tag it was about to withdraw, a reload that never
   ran. Zero requests is the answer a failed action gives too. So each action reports whether it
   happened, the state it should have produced is read back (the stored decision, whether the tag
   actually executed, whether the document was actually replaced), and only then is the network
   silence counted. */
const did = (p) => p.then(() => true, () => false);
async function storedDecision(ctx) {
  const c = (await ctx.cookies()).find((x) => x.name === "bugit_consent");
  if (!c) return null;
  try { return JSON.parse(decodeURIComponent(c.value)); } catch { return null; }
}
async function loadHome(page) {
  const loaded = await did(page.goto(BASE, { waitUntil: "load", timeout: 45000 }));
  // Idle is a best-effort wait for a page that streams video; the LOAD is the transition.
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  return loaded && await page.locator("#langList").count().then((n) => n > 0, () => false);
}
// A marker in the current document. After a real reload it is gone; after a swallowed one it is not.
const mark = (page) => page.evaluate(() => { window.__consentProofDoc = 1; }).then(() => true, () => false);
const replaced = (page) => page.evaluate(() => window.__consentProofDoc !== 1).catch(() => false);
const tagRan = (page) => page.evaluate(() => (window.__consentProofTagRan || 0) > 0).catch(() => false);

/* ---- 1 + 2 + 3 + 6 + 7 + 8: fresh load, then Reject, then navigation/reload ---- */
async function rejectScenario(browser, plant) {
  const checks = [];
  const ck = (cond, label, extra) => checks.push({ ok: !!cond, label, extra });
  const { ctx, reqs, thirdParty } = await trackedContext(browser, plant);
  try {
    const page = await ctx.newPage();
    ck(await loadHome(page), "0-pre. the site rendered in this context");
    await settle(page, 3000);
    ck(reqs.length === 0, "1. fresh context before choice: zero Google requests", reqs.join(", "));
    const unexpected = [...thirdParty].filter((h) => !ALLOWED_BEFORE_CONSENT.includes(h)).sort();
    ck(unexpected.length === 0,
       "8. before choice: every third-party host is one the site discloses",
       unexpected.length
         ? `${unexpected.join(", ")} -- either gate it behind consent or disclose it in ` +
           `consent.body (all eleven locales) and add it to ALLOWED_BEFORE_CONSENT here`
         : "");
    const adCookiesBefore = (await ctx.cookies()).filter((c) => AD_COOKIE.test(c.name));
    ck(adCookiesBefore.length === 0, "7. no Google advertising cookie before acceptance", adCookiesBefore.map((c) => c.name).join(", "));
    ck(await page.isVisible("#consentBanner").catch(() => false), "consent banner is shown before a choice");

    // ---- 2: Reject ----
    reqs.length = 0;
    // A CLICK THAT DID NOT HAPPEN IS NOT A REJECTION. The page already sends nothing before a choice,
    // so if #consentReject were renamed the swallowed click left that state in place and every "zero
    // requests after Reject" line below still passed (full-project review, 2026-09-23). Record it.
    ck(await did(page.click("#consentReject", { timeout: 5000 })), "2-pre. the Reject control exists and was clicked");
    await settle(page);
    ck(!(await page.isVisible("#consentBanner").catch(() => true)), "2-pre. the banner closed after Reject");
    // A click that registered is still not a rejection until it is STORED, because the next load
    // decides from the stored record alone.
    const d = await storedDecision(ctx);
    ck(d && d.ad_storage === false, "2-pre. the rejection was persisted (bugit_consent denies ad_storage)",
       d ? JSON.stringify(d) : "no readable bugit_consent cookie");
    ck(reqs.length === 0, "2. after Reject: zero Google requests", reqs.join(", "));

    // ---- 3: Reject + navigation/reload ----
    reqs.length = 0;
    await mark(page);
    ck(await did(page.reload({ waitUntil: "load", timeout: 30000 })) && await replaced(page),
       "3-pre. the reload happened (the document was replaced)");
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    ck(!(await page.isVisible("#consentBanner").catch(() => true)), "3-pre. the rejection survived the reload (no banner)");
    ck(await did(page.goto(BASE + "/#/docs", { waitUntil: "load", timeout: 30000 })), "3-pre. the navigation to /#/docs happened");
    const docShown = await page.waitForFunction(() => {
      const v = document.getElementById("docView");
      return v && !v.hidden && !!document.querySelector("#docContent h1");
    }, null, { timeout: 8000 }).then(() => true, () => false);
    ck(docShown, "3-pre. the documentation view rendered after that navigation");
    await settle(page);
    ck(reqs.length === 0, "3. after Reject + navigation/reload: zero Google requests", reqs.join(", "));

    // ---- 6: page still interactive after Reject ----
    // A COUNT OF LINKS IS NOT A USABLE LINK. This counted `a[href]` matches, hidden or covered
    // ones included. A trial click runs Playwright's full actionability check -- attached,
    // visible, stable, enabled, and the point it would press actually reaching the element --
    // without navigating away.
    const cta = page.locator("a[href*='portal.bugit.dev']:visible, a[href*='/checkout']:visible, nav a[href]:visible").first();
    const clickable = await did(cta.click({ trial: true, timeout: 5000 }));
    ck(clickable, "6. a checkout/navigation link is visible, enabled and accepts a click after Reject",
       clickable ? "" : "no visible link passed Playwright's actionability check");
  } finally {
    await ctx.close();
  }
  return checks;
}

/* ---- 4: Accept loads ONLY the intended gtag.js ---- */
async function acceptScenario(browser, plant) {
  const checks = [];
  const ck = (cond, label, extra) => checks.push({ ok: !!cond, label, extra });
  const { ctx, reqs } = await trackedContext(browser, plant);
  try {
    const page = await ctx.newPage();
    ck(await loadHome(page), "4-pre. the site rendered in this context");
    await settle(page, 1500);
    reqs.length = 0;
    ck(await did(page.click("#consentAccept", { timeout: 5000 })), "4-pre. the Accept control exists and was clicked");
    await settle(page, 4000);
    const d = await storedDecision(ctx);
    ck(d && d.ad_storage === true, "4-pre. the acceptance was persisted (bugit_consent grants ad_storage)",
       d ? JSON.stringify(d) : "no readable bugit_consent cookie");
    const gtag = reqs.filter((u) => /googletagmanager\.com\/gtag\/js/.test(u));
    ck(gtag.length >= 1, "4a. after Accept: the intended gtag.js loads", `gtag loads: ${gtag.length}`);
    ck(gtag.every((u) => u.includes(encodeURIComponent(ADS_ID)) || u.includes(ADS_ID)),
       `4b. the only tag id loaded is ${ADS_ID}`, gtag.join(", "));
    ck(await tagRan(page), "4c. the tag that loaded actually executed in the page");
  } finally {
    await ctx.close();
  }
  return checks;
}

/* ---- 5: revoke advertising + reload -> zero further Google requests ----
   IN ITS OWN CONTEXT, SO IT HAS TO PROVE ITS OWN GRANT. The Accept test above runs in a different
   context and says nothing about this one: if this Accept had silently failed, the tag was never
   loaded here, there was nothing to withdraw, and "zero requests after the withdrawal" was the
   page's ordinary silence. So the grant is established -- stored, requested, executed -- before
   the request log is cleared, and each step of the withdrawal is read back afterwards. */
async function withdrawScenario(browser, plant) {
  const checks = [];
  const ck = (cond, label, extra) => checks.push({ ok: !!cond, label, extra });
  const { ctx, reqs } = await trackedContext(browser, plant);
  try {
    const page = await ctx.newPage();
    ck(await loadHome(page), "5-pre. the site rendered in this context");
    ck(await did(page.click("#consentAccept", { timeout: 5000 })), "5-pre. the Accept control was clicked in this context");
    await settle(page, 3000);
    const granted = await storedDecision(ctx);
    const loaded = reqs.some((u) => /googletagmanager\.com\/gtag\/js/.test(u));
    const ran = await tagRan(page);
    ck(granted && granted.ad_storage === true && loaded && ran,
       "5-pre. Accept loaded the tag in THIS context before it was withdrawn",
       `stored grant: ${!!(granted && granted.ad_storage === true)}, gtag requested: ${loaded}, tag executed: ${ran}`);
    reqs.length = 0;
    await mark(page);
    // Reopen preferences, turn Advertising OFF, save -> consent.js reloads to purge runtime.
    const opened = await did(page.click("#consentManage", { timeout: 5000 })) ||
      await did(page.click("#cookiePrefsLink", { timeout: 3000 }));
    ck(opened, "5-pre. the consent preferences opened");
    ck(await did(page.uncheck("#consentAdvertising", { timeout: 5000 })), "5-pre. the Advertising switch was turned off");
    ck(await did(page.click("#consentSave", { timeout: 5000 })), "5-pre. the preferences were saved");
    await page.waitForTimeout(2000);
    await page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
    const withdrawn = await storedDecision(ctx);
    ck(withdrawn && withdrawn.ad_storage === false, "5-pre. the withdrawal was persisted (bugit_consent denies ad_storage)",
       withdrawn ? JSON.stringify(withdrawn) : "no readable bugit_consent cookie");
    ck(await did(page.reload({ waitUntil: "load", timeout: 30000 })) && await replaced(page),
       "5-pre. the reload happened (the document that ran the tag is gone)");
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await settle(page, 3000);
    ck(!(await tagRan(page)), "5-pre. the tag is not running in the reloaded document");
    ck(reqs.length === 0, "5. after revoke + reload: zero further Google requests", reqs.join(", "));
    // WITHDRAWING CONSENT HAS TO REMOVE WHAT CONSENT PUT THERE, and that is not only
    // `bugit_gclid`: the Ads tag can write its own `_gcl_au` (and other `_gcl_*` names) while
    // ad_storage is granted, at both the host-only and the Domain=.bugit.dev scope. A revoke
    // that only deletes the site's own cookie and reloads a page making zero requests would
    // still leave Google's cookie sitting on the visitor for its own lifetime.
    const gclCookiesAfter = (await ctx.cookies()).filter((c) => /^_gcl/.test(c.name));
    ck(gclCookiesAfter.length === 0,
       "5b. after revoke + reload: no _gcl cookie remains, at any scope",
       gclCookiesAfter.map((c) => `${c.name} (domain=${c.domain})`).join(", "));
  } finally {
    await ctx.close();
  }
  return checks;
}

/* ---- the transition checks are themselves checked ----
   Each control swallows ONE action inside the page -- the click lands, Playwright reports success,
   and the page's own handler never sees it -- which is the failure the old harness scored as a
   pass. Each must be caught by the specific transition check written for it; a control that
   fails some other way, or not at all, proves nothing about that check. */
const swallow = (sel) =>
  `window.addEventListener("click", function (e) { var t = e.target; ` +
  `if (t && t.closest && t.closest(${JSON.stringify(sel)})) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);`;
const CONTROLS = [
  ["a Reject click that never registers", rejectScenario, swallow("#consentReject"),
   "2-pre. the rejection was persisted (bugit_consent denies ad_storage)"],
  ["an Accept that never loaded the tag it is about to withdraw", withdrawScenario, swallow("#consentAccept"),
   "5-pre. Accept loaded the tag in THIS context before it was withdrawn"],
  ["a Save that never stored the withdrawal", withdrawScenario, swallow("#consentSave"),
   "5-pre. the withdrawal was persisted (bugit_consent denies ad_storage)"],
];

const browser = await chromium.launch({ headless: true, executablePath: EXE });
try {
  for (const scenario of [rejectScenario, acceptScenario, withdrawScenario]) {
    for (const c of await scenario(browser, null)) ok(c.ok, c.label, c.extra);
  }
  for (const [what, scenario, plant, expected] of CONTROLS) {
    const checks = await scenario(browser, plant);
    const hit = checks.find((c) => c.label === expected);
    ok(hit && !hit.ok, `control: ${what} is caught by "${expected}"`,
       hit ? "that check passed on a page where the action never took effect" : "that check never ran");
  }
} finally {
  await browser.close();
}

if (fails) { console.error(`\ncheck-consent-network: ${fails} failure(s) against ${BASE}`); process.exit(1); }
console.log(`\ncheck-consent-network: OK -- strict prior-consent gating proven against ${BASE} (tag id ${ADS_ID}); every scored transition was shown to have happened, and ${CONTROLS.length} swallowed-action controls were caught.`);
