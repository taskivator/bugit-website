/**
 * The six trust cards render an inline SVG icon next to a translated title.
 * Before that, each title carried a leading text glyph (▣ ◌ ✓ ◎ ◇ </>) which
 * WAS the icon.
 *
 * When the SVGs landed, the glyphs were stripped from the English strings and
 * from one of the two override blocks — but not from the generated per-locale
 * overrides. Result: all nine non-English locales rendered the new SVG icon AND
 * the old glyph, side by side, live. English looked correct, so a spot check
 * passed and the regression shipped.
 *
 * This gate makes that class of miss impossible: no trust-card title, in any
 * locale, may start with one of the retired glyphs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishedCopy, htmlText } from "./lib/published-copy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "app.js");
const INDEX = path.join(ROOT, "index.html");

const TITLE_KEYS = [
  "privateTitle",
  "telemetryTitle",
  "previewTitle",
  "backupsTitle",
  "updatesTitle",
  "vscodeTitle",
];
// Anchored and explicit. A blanket "strip non-letters" rule would also flag
// legitimate leading punctuation such as the French « or a locale that opens
// with a quotation mark.
const RETIRED_GLYPH = /^(?:▣|◌|✓|◎|◇|<\/>)\s*/u;

const app = fs.readFileSync(APP, "utf8");
const index = fs.readFileSync(INDEX, "utf8");

let failures = 0;
let checked = 0;

const re = new RegExp(
  `["']?(${TITLE_KEYS.join("|")})["']?\\s*:\\s*(["'])([^"']*)\\2`,
  "g",
);
let m;
while ((m = re.exec(app))) {
  checked++;
  const [, key, , value] = m;
  if (RETIRED_GLYPH.test(value)) {
    console.error(`  GLYPH IN TITLE  ${key} = ${JSON.stringify(value)}`);
    failures++;
  }
}

if (checked === 0) {
  console.error(
    "  NO TITLES FOUND  the trust-card title keys matched nothing in app.js — " +
      "this gate is silently inert, which is worse than failing. Update TITLE_KEYS.",
  );
  failures++;
}

// The markup side of the same contract: each title must be a <span data-t=...>
// INSIDE the <strong>, not the <strong> itself. If data-t sits on the <strong>,
// translation replaces its innerHTML and wipes out the sibling <svg> icon.
for (const key of TITLE_KEYS) {
  if (!new RegExp(`<span data-t="trust\\.${key}"`).test(index)) {
    console.error(
      `  BAD MARKUP  index.html: trust.${key} must live on a <span> inside <strong>, ` +
        "or the icon is destroyed when the locale is applied",
    );
    failures++;
  }
}

// THE PUBLISHED PAGES (2026-10-04). bugit.dev now serves the redesign, v2/index.html and
// v2/docs/index.html, and neither has the six trust cards: the TITLE_KEYS above exist only in
// app.js and index.html, which still ship and so stay checked, but which no published page loads.
// The PROPERTY has a direct analogue, though, and that is what is checked here, over whatever
// lib/published-copy.mjs says is published:
//
//   1. Markup. v2/i18n.js swaps the innerHTML of every [data-k] element with the translation, so
//      an icon <svg> INSIDE a [data-k] element is erased in every language but English, which is
//      the incident above in its new form. The v2 pages already follow the contract (the
//      LinkedIn and YouTube links put data-k on a <span> beside the <svg>); this keeps them to it.
//   2. Text. No translated string in any language, and no [data-k] text on the pages, may open
//      with one of the retired glyphs, and no translated string may carry an <svg> of its own
//      (an icon pasted into one language's copy is the per-locale override that bit last time).
const tagSpan = (html, at) => {
  // From the "<" of an opening tag, the end of its matching close, counting nested tags of the
  // same name. Enough for hand-written page markup; void elements never carry data-k here.
  const name = /^<([a-zA-Z0-9]+)/.exec(html.slice(at))[1];
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, "gi");
  re.lastIndex = at;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return { name, open: html.indexOf(">", at) + 1, close: m.index };
  }
  return null;
};
const scanPublished = (entries) => {
  const found = [];
  let keyed = 0, strings = 0;
  for (const e of entries) {
    if (e.kind === "page") {
      const open = /<[a-zA-Z0-9]+\b[^>]*\sdata-k="([^"]+)"[^>]*>/g;
      let m;
      while ((m = open.exec(e.text))) {
        keyed++;
        const span = tagSpan(e.text, m.index);
        if (!span) { found.push(`${e.file}: data-k="${m[1]}" has no matching close tag`); continue; }
        const inner = e.text.slice(span.open, span.close);
        if (/<svg\b/i.test(inner)) {
          found.push(`ICON INSIDE TRANSLATED ELEMENT  ${e.file}: <${span.name} data-k="${m[1]}"> contains an <svg>; `
            + "every other language replaces its innerHTML and erases the icon. Put data-k on a <span> beside it.");
        }
        if (RETIRED_GLYPH.test(htmlText(inner).trim())) {
          found.push(`GLYPH IN TITLE  ${e.file}: data-k="${m[1]}" = ${JSON.stringify(htmlText(inner).trim().slice(0, 60))}`);
        }
      }
    } else if (e.kind === "home" || e.kind === "docs") {
      for (const line of e.text.split("\n")) {
        strings++;
        if (RETIRED_GLYPH.test(htmlText(line).trim())) {
          found.push(`GLYPH IN TITLE  ${e.file} (${e.lang}): ${JSON.stringify(line.slice(0, 60))}`);
        }
        if (/<svg\b/i.test(line)) {
          found.push(`ICON IN TRANSLATION  ${e.file} (${e.lang}): ${JSON.stringify(line.slice(0, 60))}`);
        }
      }
    }
  }
  return { found, keyed, strings };
};
const published = scanPublished(publishedCopy());
for (const f of published.found) { console.error("  " + f); failures++; }
// Positive control: the pages' translated elements and the per-language strings were really read.
if (published.keyed < 50 || published.strings < 1000) {
  console.error(`  PUBLISHED COPY NOT READ  only ${published.keyed} [data-k] element(s) and ${published.strings} `
    + "translated string(s) were scanned; the redesign has far more. The scan is blind.");
  failures++;
}
// Negative control, in memory: the incident's markup and its glyph, in the shapes they would take now.
const control = scanPublished([
  { file: "synthetic/index.html", lang: "en", kind: "page",
    text: '<p><strong data-k="t999"><svg viewBox="0 0 1 1"><path d="M0 0"/></svg>Private by default</strong></p>' },
  { file: "synthetic/ko.json", lang: "ko", kind: "home", text: "fine\n▣ 기본적으로 비공개" },
]).found;
if (control.length !== 2) {
  console.error(`  NEGATIVE CONTROL DID NOT FIRE  the published-copy scan reported ${control.length} of 2 planted defects`);
  failures++;
}

if (failures > 0) {
  console.error(`\nTrust-card icon check FAILED (${failures} problem(s)).`);
  process.exit(1);
}
console.log(
  `Trust-card icon check passed (${checked} title strings, ${TITLE_KEYS.length} markup anchors; ` +
    `published copy: ${published.keyed} [data-k] elements hold no icon, ${published.strings} translated strings carry no retired glyph).`,
);
