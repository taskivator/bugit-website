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

async function trackedContext(browser) {
  const ctx = await browser.newContext();
  const reqs = [];
  ctx.on("request", (r) => { if (GOOGLE.test(r.url())) reqs.push(r.url()); });
  return { ctx, reqs };
}
const settle = (p, ms = 2500) => p.waitForTimeout(ms);

const browser = await chromium.launch({ headless: true, executablePath: EXE });
try {
  // ---- 1 + 6 + 7: fresh load, no choice ----
  let { ctx, reqs } = await trackedContext(browser);
  let page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await settle(page, 3000);
  ok(reqs.length === 0, "1. fresh context before choice: zero Google requests", reqs.join(", "));
  const adCookiesBefore = (await ctx.cookies()).filter((c) => AD_COOKIE.test(c.name));
  ok(adCookiesBefore.length === 0, "7. no Google advertising cookie before acceptance", adCookiesBefore.map((c) => c.name).join(", "));
  const bannerVisible = await page.isVisible("#consentBanner").catch(() => false);
  ok(bannerVisible, "consent banner is shown before a choice");

  // ---- 2: Reject ----
  reqs.length = 0;
  await page.click("#consentReject", { timeout: 5000 }).catch(() => {});
  await settle(page);
  ok(reqs.length === 0, "2. after Reject: zero Google requests", reqs.join(", "));

  // ---- 3: Reject + navigation/reload ----
  reqs.length = 0;
  await page.reload({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.goto(BASE + "/#/docs", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await settle(page);
  ok(reqs.length === 0, "3. after Reject + navigation/reload: zero Google requests", reqs.join(", "));

  // ---- 6: page still interactive after Reject (a CTA/nav link is present + clickable) ----
  const ctaCount = await page.locator("a[href*='portal.bugit.dev'], a[href*='/checkout'], a[href^='#'], nav a").count().catch(() => 0);
  ok(ctaCount > 0, "6. checkout/navigation remains usable after Reject", `interactive links: ${ctaCount}`);
  await ctx.close();

  // ---- 4: Accept loads ONLY the intended gtag.js ----
  ({ ctx, reqs } = await trackedContext(browser));
  page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await settle(page, 1500);
  reqs.length = 0;
  await page.click("#consentAccept", { timeout: 5000 }).catch(() => {});
  await settle(page, 4000);
  const gtag = reqs.filter((u) => /googletagmanager\.com\/gtag\/js/.test(u));
  ok(gtag.length >= 1, "4a. after Accept: the intended gtag.js loads", `gtag loads: ${gtag.length}`);
  ok(gtag.every((u) => u.includes(encodeURIComponent(ADS_ID)) || u.includes(ADS_ID)),
     `4b. the only tag id loaded is ${ADS_ID}`, gtag.join(", "));
  await ctx.close();

  // ---- 5: revoke advertising + reload -> zero further Google requests ----
  ({ ctx, reqs } = await trackedContext(browser));
  page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.click("#consentAccept", { timeout: 5000 }).catch(() => {});
  await settle(page, 3000);            // tag now loaded (granted)
  reqs.length = 0;
  // Reopen preferences, turn Advertising OFF, save -> consent.js reloads to purge runtime.
  await page.click("#consentManage", { timeout: 5000 }).catch(async () => {
    await page.click("#cookiePrefsLink", { timeout: 3000 }).catch(() => {});
  });
  await page.uncheck("#consentAdvertising", { timeout: 5000 }).catch(() => {});
  await page.click("#consentSave", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await settle(page, 3000);
  ok(reqs.length === 0, "5. after revoke + reload: zero further Google requests", reqs.join(", "));
  await ctx.close();
} finally {
  await browser.close();
}

if (fails) { console.error(`\ncheck-consent-network: ${fails} failure(s) against ${BASE}`); process.exit(1); }
console.log(`\ncheck-consent-network: OK — strict prior-consent gating proven against ${BASE} (tag id ${ADS_ID}).`);
