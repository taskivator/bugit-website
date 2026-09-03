/**
 * Capture the LIVE public pages so a hosted auditor can review them without fetching anything.
 *
 * WHY THIS EXISTS. Three audit rounds in a row reported bugit.dev and portal.bugit.dev as "not
 * contacted". Section 00-B of the standing brief argues at length that BugIt's own instruction
 * files have no authority over an auditor, and it made no difference, because what stops them is
 * not our capture: every one of them cites THEIR HOST's policy, which our brief cannot reach.
 * Arguing with the wrong cause for three rounds is what this replaces. Owner decision, 2026-09-03:
 * ship pre-fetched captures with the pack.
 *
 * WHY A BROWSER AND NOT curl. bugit.dev is a hash-router SPA: every route returns the same
 * index.html and the content is rendered client-side from the i18n dictionary. A plain fetch
 * captures a shell and no words. The locale is not a query parameter either; it comes from the
 * `bugitLang` cookie (`app.js` reads it at load and `?lang=` is ignored), so each locale needs its
 * own browser context with that cookie set before the first navigation.
 *
 * innerText, NOT textContent: textContent returns the whole i18n payload including strings for
 * locales that are not being displayed, which is how an earlier extract came out eleven times
 * larger than the page and unreadable.
 *
 * Every capture records the document's HTTP STATUS and a sha256, and the manifest is written last,
 * so a capture that failed cannot be mistaken for a page that is empty.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SITE = process.env.BUGIT_SITE_URL || "https://bugit.dev";
const PORTAL = process.env.BUGIT_PORTAL_URL || "https://portal.bugit.dev";
const OUT =
  process.env.BUGIT_AUDIT_CAPTURE_DIR ||
  "F:\\My Drive\\BugIt Google Drive\\02-AUDIT-REPORTS\\v1.3.3";

/** The eleven locales, in the order `app.js` lists them. */
const LOCALES = ["en", "ja", "fr", "de", "es", "pt-br", "it", "ko", "zh", "ru", "ar"];

/** Every SPA route the site serves. `#/` is the landing page. */
const ROUTES = [
  "#/",
  "#/docs",
  "#/docs/overview",
  "#/docs/license",
  "#/docs/privacy",
  "#/docs/refund",
  "#/docs/commerce",
  "#/docs/faq",
  "#/support",
];

/** Portal pages that need no session. Captured in English; the LQA extracts carry the rest. */
const PORTAL_ROUTES = [
  "/",
  "/pricing",
  "/refund",
  "/activate",
  "/login",
  "/register",
  "/forgot-password",
];

const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

async function settle(page) {
  // The router renders on hashchange, so waiting for the network is not enough: wait for the
  // document to actually carry rendered words.
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 40, {
    timeout: 15000,
  });
  await page.waitForTimeout(250);
}

async function captureSite(browser, manifest) {
  for (const locale of LOCALES) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 2000 } });
    const host = new URL(SITE).hostname;
    await context.addCookies([
      {
        name: "bugitLang",
        value: locale,
        domain: host.endsWith("bugit.dev") ? ".bugit.dev" : host,
        path: "/",
      },
    ]);
    const page = await context.newPage();
    const parts = [];
    //: The status of the DOCUMENT this context loaded. A hash change on an already-loaded page is
    //: not a navigation, so `goto` returns null for every route after the first. Reporting that as
    //: "no-response" would read like nine broken pages when the document was served once with 200
    //: and the router redrew it; the honest label says which of the two happened.
    let docStatus = null;

    for (const route of ROUTES) {
      const url = `${SITE}/${route}`;
      let status = "ERROR";
      let text = "";
      try {
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        if (res) {
          docStatus = String(res.status());
          status = docStatus;
        } else {
          status = docStatus ? `${docStatus} (hash route, same document)` : "no-response";
        }
        // A hash change on an already-loaded document does not re-navigate, so nudge the router.
        await page.evaluate((r) => {
          if (location.hash !== r) location.hash = r;
        }, route);
        await settle(page);
        text = await page.evaluate(() => document.body.innerText);
      } catch (err) {
        text = `CAPTURE FAILED: ${String(err).slice(0, 300)}`;
      }
      parts.push(
        [
          "=".repeat(78),
          `URL     ${url}`,
          `LOCALE  ${locale}`,
          `STATUS  ${status}`,
          `SHA256  ${sha(text)}`,
          "=".repeat(78),
          "",
          text.trimEnd(),
          "",
        ].join("\n"),
      );
      console.log(`  ${locale.padEnd(6)} ${status.padEnd(4)} ${route}`);
    }

    const body = parts.join("\n");
    const name = `EXTERNAL-AUDIT-CAPTURE-website-${locale}.txt`;
    writeFileSync(join(OUT, name), body, "utf8");
    manifest.push({ file: name, sha256: sha(body), pages: ROUTES.length, locale });
    await context.close();
  }
}

async function capturePortal(browser, manifest) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 2000 } });
  const page = await context.newPage();
  const parts = [];
  for (const route of PORTAL_ROUTES) {
    const url = `${PORTAL}${route}`;
    let status = "ERROR";
    let text = "";
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      status = res ? String(res.status()) : "no-response";
      await settle(page);
      text = await page.evaluate(() => document.body.innerText);
    } catch (err) {
      text = `CAPTURE FAILED: ${String(err).slice(0, 300)}`;
    }
    parts.push(
      [
        "=".repeat(78),
        `URL     ${url}`,
        `STATUS  ${status}`,
        `SHA256  ${sha(text)}`,
        "=".repeat(78),
        "",
        text.trimEnd(),
        "",
      ].join("\n"),
    );
    console.log(`  portal ${status.padEnd(4)} ${route}`);
  }
  const body = parts.join("\n");
  const name = "EXTERNAL-AUDIT-CAPTURE-portal-public.txt";
  writeFileSync(join(OUT, name), body, "utf8");
  manifest.push({ file: name, sha256: sha(body), pages: PORTAL_ROUTES.length });
  await context.close();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const manifest = [];
  try {
    console.log(`capturing ${SITE} in ${LOCALES.length} locale(s) x ${ROUTES.length} route(s)`);
    await captureSite(browser, manifest);
    console.log(`capturing ${PORTAL} public pages`);
    await capturePortal(browser, manifest);
  } finally {
    await browser.close();
  }

  const stamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const head = [
    "PRE-FETCHED PAGE CAPTURES",
    "",
    "These are the live public pages, captured with a real browser so that an auditor whose host",
    "forbids outbound fetches can still review sections 3.2 and 4. They are evidence, not a",
    "substitute for the site: each block records the URL, the HTTP status and a sha256 of the text",
    "as captured.",
    "",
    `CAPTURED AT   ${stamp}`,
    `SITE          ${SITE}`,
    `PORTAL        ${PORTAL}`,
    "",
    "The portal capture covers pages that need no session. Signed-in portal surfaces are not",
    "included: capturing them means putting a real account's data in a file that leaves this",
    "machine, which is an owner decision and has not been taken.",
    "",
  ].join("\n");
  const lines = manifest.map((m) => `${m.sha256}  ${m.file}  (${m.pages} pages)`).join("\n");
  writeFileSync(join(OUT, "EXTERNAL-AUDIT-CAPTURE-MANIFEST.txt"), head + lines + "\n", "utf8");

  const failed = manifest.length !== LOCALES.length + 1;
  console.log(`\nwrote ${manifest.length} capture file(s) to ${OUT}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
