// Does the page ever show the product's name in a casing nobody typed?
//
// On 2026-08-20 the hero badge above the headline read "BUGIT QA AGENT". Nothing in the repo
// spells it that way: the string is "BugIt QA Agent" and a shared CSS rule
// (.pill, .eyebrow, .section-head span) applied text-transform:uppercase, which flattened the
// capital I and the lowercase g out of the product name in the most prominent place on the site.
//
// Grepping the source could never have found it, and neither could a check on textContent: the
// defect exists only after CSS has been applied, so this reads innerText out of a real browser,
// which is the only text a customer ever sees.
//
// WHAT IT CHECKS, and why it is shaped this way:
//   * It COMPUTES its subject. There is no list of elements to keep in step with the markup:
//     it walks every rendered leaf in the document and inspects each occurrence of the name.
//     A new badge, card or footer line is covered the day it is added.
//   * It runs in EVERY locale the page ships, because the name sits in a different place in
//     each sentence: leading in English and Japanese, trailing in French and Russian, and in
//     Arabic a Latin word inside an RTL line, which is where uppercasing it looks worst.
//   * It asserts BOTH directions. Turning the shared rule off everywhere would silence the
//     failure and quietly flatten four legitimate all-caps labels, so those must still be
//     uppercase when this passes.
//   * It PROVES it can see the defect. After the clean pass it re-applies the exact CSS that
//     caused the incident and requires its own scanner to report a violation, then stops.
//     Without that step a green run is equally consistent with a scanner that reads nothing.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";

const BRAND = "BugIt";

const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});
let serverExit = null;
server.on("exit", (code, signal) => { serverExit = signal || "code " + code; });
const base = "http://127.0.0.1:" + PORT;
const fail = [];
const note = (m) => console.log("  " + m);

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error("the site server exited before serving anything (" + serverExit + ")");
    try { await fetch(base); return true; } catch { await new Promise(r => setTimeout(r, 250)); }
  }
  return false;
};

// Runs inside the page. Returns every RENDERED occurrence of the name that is not the brand
// spelling, with enough context to find it by hand.
const SCAN = (brand) => {
  const wrong = [];
  let canonical = 0;
  const leaves = document.querySelectorAll("body *:not(script):not(style):not(noscript)");
  for (const el of leaves) {
    if (el.querySelector("*")) continue;              // leaves only, so text is counted once
    const text = el.innerText;                        // innerText, not textContent: CSS applied
    if (!text) continue;
    const re = new RegExp(brand, "gi");
    let m;
    while ((m = re.exec(text)) !== null) {
      const seen = m[0];
      if (seen === brand) { canonical++; continue; }
      // A lowercase run is legitimate inside a technical token: bugit.dev, portal.bugit.dev,
      // bugit-qa-agent.agent.md. Anything else, BUGIT or Bugit or bugIt, is the name misspelt.
      const before = text[m.index - 1] || "";
      const after = text[m.index + seen.length] || "";
      const inToken = /[./@_-]/.test(before) || /[./@_-]/.test(after);
      if (seen === brand.toLowerCase() && inToken) continue;
      const from = Math.max(0, m.index - 28);
      wrong.push({
        seen,
        context: text.slice(from, m.index + seen.length + 28).replace(/\s+/g, " ").trim(),
        where: el.className
          ? el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0]
          : el.tagName.toLowerCase(),
      });
    }
  }
  return { wrong, canonical };
};

try {
  if (!await waitForServer()) throw new Error("server never came up on " + base);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base, { waitUntil: "networkidle" });

  // The locale list comes from the page's own dictionary, never from a constant here. A locale
  // added to app.js is checked without anyone remembering to add it.
  const locales = await page.evaluate(() => Object.keys(i18n));
  if (locales.length < 2) {
    fail.push("read only " + locales.length + " locale(s) from the page: the scan never ran");
  }
  note("locales read from the page: " + locales.length + " (" + locales.join(", ") + ")");

  let totalCanonical = 0;
  for (const lang of locales) {
    await page.evaluate((l) => applyLang(l), lang);
    await page.waitForTimeout(60);
    const { wrong, canonical } = await page.evaluate(SCAN, BRAND);
    totalCanonical += canonical;
    if (canonical === 0) {
      fail.push("[" + lang + "] the name \"" + BRAND + "\" is not rendered anywhere: " +
                "the scan had nothing to look at");
    }
    for (const w of wrong) {
      fail.push("[" + lang + "] renders \"" + w.seen + "\" in " + w.where + ": \"" + w.context + "\"");
    }
  }
  await page.evaluate(() => applyLang("en"));
  await page.waitForTimeout(60);
  note(totalCanonical + " correctly-cased occurrences of \"" + BRAND + "\" across all locales");

  // Direction two: the labels that carry NO name must still read as caps. Computed from the
  // page, so this cannot be satisfied by an empty set.
  const caps = await page.$$eval(".eyebrow, .section-head span", (els) =>
    els.map((el) => ({ text: el.innerText.trim(), tt: getComputedStyle(el).textTransform })));
  if (!caps.length) fail.push("found no all-caps labels to check: the second direction never ran");
  for (const c of caps) {
    if (c.tt !== "uppercase") {
      fail.push("the label \"" + c.text + "\" lost its caps (text-transform:" + c.tt + "). " +
                "Fix the badge alone, not the shared rule.");
    }
  }
  note(caps.length + " name-free labels still uppercase");

  // The negative control. Put the incident back and require the scanner to catch it, otherwise
  // a pass above proves only that nothing was read.
  await page.addStyleTag({ content: ".pill{text-transform:uppercase !important}" });
  await page.waitForTimeout(60);
  const control = await page.evaluate(SCAN, BRAND);
  const caught = control.wrong.find((w) => w.seen === BRAND.toUpperCase());
  if (!caught) {
    fail.push("NEGATIVE CONTROL DID NOT FIRE: re-applying text-transform:uppercase to the badge " +
              "produced no finding, so this check cannot see the defect it exists for.");
  } else {
    note("negative control fired: scanner reported \"" + caught.context + "\"");
  }

  if (errors.length) fail.push("page errors during the scan: " + errors.join(" | "));
  await browser.close();
} catch (e) {
  fail.push(String(e && e.message ? e.message : e));
} finally {
  try { server.kill(); } catch {}
}

if (fail.length) {
  console.error("check-brand-casing FAILED: " + fail.length + " problem(s).");
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log("check-brand-casing OK: the product name renders as \"BugIt\" everywhere it appears, " +
            "in every locale, and the scanner was proven able to see the opposite.");
