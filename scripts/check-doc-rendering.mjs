// What the reader actually SEES on the six documentation routes.
//
// WHY THIS EXISTS. Two findings of the 2026-08-17 external audit were invisible to every
// guard here, and for the same reason: everything checked the Markdown SOURCE, and the
// defect was in what the source turns into.
//
//   F-05  The Arabic documents wrap every Latin run in <bdi dir="ltr"> so the bidi
//         algorithm does not reorder "VS Code" or "python tools/connect.py jira" inside
//         a right-to-left sentence. The renderer escapes HTML, so all 194 of those became
//         VISIBLE TAG TEXT: readers saw "bdi>" mid-sentence in the license, the privacy
//         statement and the commercial disclosure. Nothing was malformed in the source.
//
//   F-06  The owner's no-dash rule was applied by reading the Markdown. 45 lines across
//         nine languages still carried U+2013/U+2014, and the audit found them on the
//         LIVE PAGES, which is the only place anyone was ever going to.
//
// So this guard renders each document through app.js's OWN renderers -- the real
// formatMarkdownDoc and formatLicense, sliced out of the shipped bundle, never a
// reimplementation that could agree with a broken original -- and asserts on the HTML.
//
// Run it against a specific bundle to prove it fails:  node scripts/check-doc-rendering.mjs <app.js>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "app.js");
const source = fs.readFileSync(target, "utf8");
const docsDir = path.join(root, "public", "docs");

// Lift a top-level function out of the bundle by brace matching. app.js is a browser
// script that touches `document` at load, so it cannot simply be imported.
function lift(name) {
  const start = source.indexOf(`function ${name}`);
  if (start === -1) throw new Error(`${path.basename(target)} defines no ${name}()`);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name}() is unterminated in ${path.basename(target)}`);
}

const render = new Function(
  ["escapeHtml", "allowBdi", "formatLicense", "formatMarkdownDoc"].map(lift).join("\n") +
    "; return { formatLicense, formatMarkdownDoc };"
)();

const DASH = /[‒–—―]/;
// A cell whose whole content is a dash means "not applicable" and is a VALUE. Same
// exemption, and the same narrowness, as the agent repo's customer-copy guard.
const NA_CELL = /\|\s*[‒–—―]\s*\|/g;

const failures = [];
let rendered = 0;
let bdiElements = 0;

for (const name of fs.readdirSync(docsDir).sort()) {
  const file = path.join(docsDir, name);
  if (!fs.statSync(file).isFile()) continue;
  if (!/\.(md|txt)$/.test(name)) continue;
  const text = fs.readFileSync(file, "utf8");
  const html = name.startsWith("LICENSE")
    ? render.formatLicense(text)
    : render.formatMarkdownDoc(text);
  rendered++;

  // 1. No tag text may reach the reader. Checked on the OUTPUT, so it catches both a
  //    renderer that escapes what it should honour and a source that grew a new tag.
  const escapedTags = (html.match(/&lt;\/?[a-z]+/gi) || []).length;
  if (escapedTags) {
    failures.push(
      `${name}: ${escapedTags} HTML tag(s) render as visible text; ` +
        `first: ${(html.match(/&lt;\/?[a-z]+[^&]{0,40}/i) || [""])[0]}`
    );
  }

  // 2. The bidi isolation must survive as real elements, and they must be balanced.
  const open = (html.match(/<bdi dir="ltr">/g) || []).length;
  const close = (html.match(/<\/bdi>/g) || []).length;
  bdiElements += open;
  if (open !== close) {
    failures.push(`${name}: ${open} <bdi> opened but ${close} closed in the rendered HTML`);
  }
  if (/\.ar\./.test(name) && open === 0 && /<bdi/.test(text)) {
    failures.push(`${name}: source isolates Latin runs but the rendered page has no bdi element`);
  }

  // 3. Nothing but bdi may be emitted as markup from the source. A doc source is
  //    translated content, not a template; if a second tag ever starts rendering, that
  //    is a decision to make deliberately, not to discover.
  for (const tag of html.match(/<([a-z]+)[ >]/gi) || []) {
    const el = tag.slice(1).trim().replace(">", "").toLowerCase();
    if (!["p", "h2", "h3", "ul", "li", "a", "strong", "code", "b", "bdi", "span"].includes(el)) {
      failures.push(`${name}: renders an unexpected <${el}> element`);
    }
  }

  // 4. The no-dash rule, on the rendered string.
  const lines = html.replace(/<\/(p|li|h2|h3)>/g, "\n").split("\n");
  lines.forEach((line) => {
    if (DASH.test(line.replace(NA_CELL, "||"))) {
      failures.push(`${name}: en/em dash in rendered copy: ${line.replace(/<[^>]+>/g, "").trim().slice(0, 110)}`);
    }
  });
}

if (rendered < 60) {
  failures.push(`only ${rendered} documents rendered; public/docs should hold every locale of six documents`);
}
if (bdiElements < 100) {
  failures.push(`only ${bdiElements} bdi elements rendered; the Arabic documents alone carry 194`);
}

if (failures.length) {
  for (const f of failures.slice(0, 40)) console.error(`FAIL: ${f}`);
  if (failures.length > 40) console.error(`... and ${failures.length - 40} more`);
  console.error(
    `\ncheck-doc-rendering: ${failures.length} problem(s) in what the documentation pages ` +
      `actually render. Source that reads correctly is not the claim; the page is.`
  );
  process.exit(1);
}

console.log(
  `check-doc-rendering OK: ${rendered} documents rendered through app.js's own renderers; ` +
    `${bdiElements} bdi elements intact, no tag text, no en/em dash in customer copy.`
);
