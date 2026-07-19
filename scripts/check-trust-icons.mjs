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

if (failures > 0) {
  console.error(`\nTrust-card icon check FAILED (${failures} problem(s)).`);
  process.exit(1);
}
console.log(
  `Trust-card icon check passed (${checked} title strings, ${TITLE_KEYS.length} markup anchors).`,
);
