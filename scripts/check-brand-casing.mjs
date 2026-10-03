// Does the page ever show the product's name in a casing nobody typed?
//
// On 2026-08-20 the hero badge above the headline read "BUGIT QA AGENT". Nothing in the repo
// spells it that way: the string is "BugIt QA Agent" and a shared CSS rule
// (.pill, .eyebrow, .section-head span) applied text-transform:uppercase, which flattened the
// capital I and the lowercase g out of the product name in the most prominent place on the site.
//
// Grepping the source could never have found it, and neither could a check on textContent: the
// defect exists only after CSS has been applied, so this reads the rendered casing out of a real
// browser, which is the only text a customer ever sees.
//
// WHAT IT CHECKS, and why it is shaped this way:
//   * It COMPUTES its subject. There is no list of elements to keep in step with the markup:
//     it walks every text node in the document and inspects each occurrence of the name.
//     A new badge, card or footer line is covered the day it is added.
//   * It runs in EVERY locale the page ships, because the name sits in a different place in
//     each sentence: leading in English and Japanese, trailing in French and Russian, and in
//     Arabic a Latin word inside an RTL line, which is where uppercasing it looks worst.
//   * It asserts BOTH directions. Turning the shared rule off everywhere would silence the
//     failure and quietly flatten the legitimate all-caps labels, so those must still be
//     uppercase when this passes.
//   * It PROVES it can see the defect. After the clean pass it re-applies the exact CSS that
//     caused the incident and requires its own scanner to report a violation, then stops.
//     Without that step a green run is equally consistent with a scanner that reads nothing.
//
// THE REDESIGN, 2026-10-04. On that day bugit.dev switched to v2: build.js publishes
// v2/index.html as the homepage and v2/docs/index.html as /docs/. This check used to evaluate the
// old page's global `i18n` object and call its `applyLang`, neither of which exists on v2, so it
// crashed with "i18n is not defined" and checked nothing. It now has two halves:
//
//   1. A STATIC scan, over every entry lib/published-copy.mjs returns (both pages, every
//      language's homepage and docs strings, the English fallbacks in the scripts) and, because
//      they still ship, app.js and index.html. It catches the name TYPED wrong: "Bugit", "BUGIT",
//      "bugIt" in any language. It cannot see CSS, which is what the second half is for.
//   2. The BROWSER scan, now against the v2 pages through their real DOM. The language list comes
//      from published-copy (which reads it from v2/i18n.js), each language is applied with the
//      page's own window.V2SetLang, and every text node is read with the text-transform its
//      element actually computes. The old scan read leaf elements only, which skipped the name in
//      any element that also had a child (a <b> or a link inside the sentence); text nodes do not.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import net from "node:net";
import { publishedCopy, publishedLangs, htmlText, ROOT } from "./lib/published-copy.mjs";

const BRAND = "BugIt";
const fail = [];
const note = (m) => console.log("  " + m);

// ── 1. THE STATIC SCAN ─────────────────────────────────────────────────────────────────────────
// A lowercase run is legitimate inside a technical token: bugit.dev, portal.bugit.dev,
// bugit-qa-agent.agent.md. Anything else, BUGIT or Bugit or bugIt, is the name misspelt.
// A match glued to letters or digits on either side is part of an identifier (bugitLang,
// BugitConsent) and not the name as prose, so it is not judged.
const brandScan = (text) => {
  const wrong = [];
  let canonical = 0;
  const re = new RegExp(BRAND, "gi");
  let m;
  while ((m = re.exec(text)) !== null) {
    const seen = m[0];
    const before = text[m.index - 1] || "";
    const after = text[m.index + seen.length] || "";
    if (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after)) continue;
    if (seen === BRAND) { canonical++; continue; }
    const inToken = /[./@_-]/.test(before) || /[./@_-]/.test(after);
    if (seen === BRAND.toLowerCase() && inToken) continue;
    wrong.push({ seen, context: text.slice(Math.max(0, m.index - 28), m.index + seen.length + 28).replace(/\s+/g, " ").trim() });
  }
  return { wrong, canonical };
};
// What a reader can see of each kind of entry. Pages: visible text plus the attributes a browser
// shows or reads aloud. Translations: each value as HTML. Scripts: string literals only, because
// identifiers and comments are not copy.
const ATTRS = /\s(?:alt|title|aria-label|placeholder|content)="([^"]*)"/g;
const readable = (entry) => {
  if (entry.kind === "page") return htmlText(entry.text) + "\n" + [...entry.text.matchAll(ATTRS)].map((m) => m[1]).join("\n");
  if (entry.kind === "script") return [...entry.text.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]).join("\n");
  return entry.text.split("\n").map(htmlText).join("\n");
};
const staticScan = (entries) => {
  const found = [];
  const canonical = new Map();
  for (const e of entries) {
    const { wrong, canonical: n } = brandScan(readable(e));
    canonical.set(e, n);
    for (const w of wrong) found.push(`${e.file} (${e.kind}, ${e.lang ?? "en"}) spells it "${w.seen}": "${w.context}"`);
  }
  return { found, canonical };
};
{
  const published = publishedCopy();
  // The old single page still ships, so it stays covered, read as the script and page it is.
  const legacy = [
    { file: "app.js", lang: null, kind: "script", text: readFileSync(join(ROOT, "app.js"), "utf8") },
    { file: "index.html", lang: "en", kind: "page", text: readFileSync(join(ROOT, "index.html"), "utf8") },
  ];
  const { found, canonical } = staticScan([...published, ...legacy]);
  fail.push(...found);
  // Positive control: the name is actually present in every language's homepage and docs copy, so
  // a scan that read nothing cannot pass. English homepage copy is the page itself.
  for (const e of published) {
    if ((e.kind === "home" || e.kind === "docs" || e.kind === "page") && canonical.get(e) === 0) {
      fail.push(`static: ${e.file} (${e.lang}) shows "${BRAND}" nowhere; the scan had nothing to look at there`);
    }
  }
  const total = [...canonical.values()].reduce((a, b) => a + b, 0);
  note(`static: ${published.length + legacy.length} entries read, ${total} correctly typed occurrences of "${BRAND}"`);
  // Negative control, in memory: the incident's string, a capitalised misspelling, and the token
  // that must survive. The same function the real scan used.
  const control = staticScan([
    { file: "synthetic/ja.json", lang: "ja", kind: "home", text: "<span>BUGIT QA AGENT</span>" },
    { file: "synthetic/content.de.json", lang: "de", kind: "docs", text: "Bugit erstellt das Ticket." },
    { file: "synthetic/v2.js", lang: null, kind: "script", text: 'var u = "https://portal.bugit.dev/";' },
  ]).found;
  if (control.length !== 2 || control.some((f) => f.includes("portal.bugit.dev"))) {
    fail.push(`static: NEGATIVE CONTROL DID NOT FIRE as expected: ${control.length} finding(s) for 2 planted misspellings `
      + "and one legitimate token");
  }
}

// ── 2. THE BROWSER SCAN ────────────────────────────────────────────────────────────────────────
const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});
let serverExit = null;
server.on("exit", (code, signal) => { serverExit = signal || "code " + code; });
const base = "http://127.0.0.1:" + PORT;

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error("the site server exited before serving anything (" + serverExit + ")");
    try { await fetch(base); return true; } catch { await new Promise(r => setTimeout(r, 250)); }
  }
  return false;
};

// Runs inside the page. Returns every RENDERED occurrence of the name that is not the brand
// spelling, with enough context to find it by hand. The casing is computed from the element's
// own text-transform (and small caps, which flatten the name the same way), not assumed.
const SCAN = (brand) => {
  const wrong = [];
  let canonical = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest("script,style,noscript,template")) continue;
    const raw = n.nodeValue;
    if (!raw || !new RegExp(brand, "i").test(raw)) continue;
    const cs = getComputedStyle(el);
    let text = raw;
    if (cs.textTransform === "uppercase" || /small-caps/.test(cs.fontVariantCaps || "")) text = raw.toUpperCase();
    else if (cs.textTransform === "lowercase") text = raw.toLowerCase();
    else if (cs.textTransform === "capitalize") text = raw.replace(/(^|\s)(\S)/g, (_, s, c) => s + c.toUpperCase());
    const re = new RegExp(brand, "gi");
    let m;
    while ((m = re.exec(text)) !== null) {
      const seen = m[0];
      const before = text[m.index - 1] || "";
      const after = text[m.index + seen.length] || "";
      if (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after)) continue;
      if (seen === brand) { canonical++; continue; }
      const inToken = /[./@_-]/.test(before) || /[./@_-]/.test(after);
      if (seen === brand.toLowerCase() && inToken) continue;
      const from = Math.max(0, m.index - 28);
      wrong.push({
        seen,
        context: text.slice(from, m.index + seen.length + 28).replace(/\s+/g, " ").trim(),
        where: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "")
          + (el.parentElement && el.parentElement.className && typeof el.parentElement.className === "string"
            ? " in ." + el.parentElement.className.split(" ")[0] : ""),
      });
    }
  }
  return { wrong, canonical };
};

const PAGES = [["homepage", "/"], ["docs", "/docs/"]];

try {
  if (!await waitForServer()) throw new Error("server never came up on " + base);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // The locale list comes from what the site ships (v2/i18n.js, via published-copy), never from a
  // constant here. A language added to the site is checked without anyone remembering to add it.
  const locales = publishedLangs();
  if (locales.length < 2) fail.push("read only " + locales.length + " locale(s): the scan never ran");
  note("locales the site ships: " + locales.length + " (" + locales.join(", ") + ")");

  let totalCanonical = 0;
  for (const [label, path] of PAGES) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    if (!await page.evaluate(() => typeof window.V2SetLang === "function")) {
      fail.push(label + ": window.V2SetLang is missing, so no language could be applied");
      continue;
    }
    for (const lang of locales) {
      await page.evaluate((l) => window.V2SetLang(l, false), lang);
      const want = lang === "pt-br" ? "pt-BR" : lang;
      const applied = await page.waitForFunction((w) => document.documentElement.lang === w, want, { timeout: 5000 })
        .then(() => true, () => false);
      if (!applied) { fail.push("[" + label + " " + lang + "] the page never switched to " + want); continue; }
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(80);
      const { wrong, canonical } = await page.evaluate(SCAN, BRAND);
      totalCanonical += canonical;
      if (canonical === 0) {
        fail.push("[" + label + " " + lang + "] the name \"" + BRAND + "\" is not rendered anywhere: " +
                  "the scan had nothing to look at");
      }
      for (const w of wrong) {
        fail.push("[" + label + " " + lang + "] renders \"" + w.seen + "\" in " + w.where + ": \"" + w.context + "\"");
      }
    }
  }
  note(totalCanonical + " correctly-cased rendered occurrences of \"" + BRAND + "\" across both pages and all locales");

  // Back to the homepage in English for the last two steps.
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => window.V2SetLang("en", false));
  await page.waitForTimeout(80);

  // Direction two: the labels that carry NO name must still read as caps. Computed from the
  // page, so this cannot be satisfied by an empty set.
  const caps = await page.$$eval(".eyebrow, .kicker", (els) =>
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
  // a pass above proves only that nothing was read. The target is COMPUTED (the first element
  // whose own text carries the name, as typed, in a casing that is currently fine), so a renamed
  // class cannot leave this injecting a rule that matches nothing, which is what happened to the
  // old page's version of this step on 2026-09-20.
  const target = await page.evaluate((brand) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest("script,style,noscript,template")) continue;
      if (n.nodeValue.includes(brand) && getComputedStyle(el).textTransform === "none") {
        el.setAttribute("data-brand-casing-control", "");
        el.style.setProperty("text-transform", "uppercase", "important");
        return el.tagName.toLowerCase();
      }
    }
    return null;
  }, BRAND);
  const control = target ? await page.evaluate(SCAN, BRAND) : { wrong: [] };
  const caught = control.wrong.find((w) => w.seen === BRAND.toUpperCase());
  if (!caught) {
    fail.push("NEGATIVE CONTROL DID NOT FIRE: re-applying text-transform:uppercase to " +
              (target ? "a <" + target + "> carrying the name" : "an element (none was found)") +
              " produced no finding, so this check cannot see the defect it exists for.");
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
console.log("check-brand-casing OK: the product name is typed and renders as \"BugIt\" everywhere it appears, " +
            "in every locale, and both scanners were proven able to see the opposite.");
