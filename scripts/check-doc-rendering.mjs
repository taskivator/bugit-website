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
import { publishedLangs } from "./lib/published-copy.mjs";

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
  // licenseInline is formatLicense's half of the inline markup rules: the licence renderer used
  // to escape `**bold**` and print the asterisks on ten translated legal pages. Lifting a
  // function means lifting what it CALLS, or this guard fails on the fix rather than on a bug.
  ["escapeHtml", "allowBdi", "licenseInline", "formatLicense", "formatMarkdownDoc"].map(lift).join("\n") +
    "; return { formatLicense, formatMarkdownDoc };"
)();

const DASH = /[‒–—―]/;
// A cell whose whole content is a dash means "not applicable" and is a VALUE. Same
// exemption, and the same narrowness, as the agent repo's customer-copy guard.
const NA_CELL = /\|\s*[‒–—―]\s*\|/g;

const failures = [];
let rendered = 0;
let bdiElements = 0;

const APP_ELEMENTS = ["p", "h2", "h3", "ul", "li", "a", "strong", "code", "b", "bdi", "span", "blockquote", "ol"];

// The five rules, as a function, so the same assertions run over app.js's renderers, over the
// published docs page's renderers (section below), and over planted defects. Returns the number
// of bdi elements the rendered HTML carries.
function inspect(name, text, html, allowedElements, failures, numberedH2 = false) {
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
    if (!allowedElements.includes(el)) {
      failures.push(`${name}: renders an unexpected <${el}> element`);
    }
  }

  // 4. NO MARKDOWN LEADER MAY SURVIVE INTO THE READER'S TEXT.
  //
  //    Rule 1 above catches a TAG that renders as text. It cannot see a markdown marker
  //    that renders as text, because the marker is not a tag -- and one had been shipping
  //    in fifty documents. Every translated document opens with the machine-translation
  //    notice as a blockquote, formatMarkdownDoc() had no blockquote branch, and so ten
  //    languages of PRIVACY, GETTING_STARTED and OVERVIEW each printed a literal `>` in
  //    front of the paragraph that says which version of a legal text governs.
  //
  //    Checked on the rendered OUTPUT and on the text a reader actually sees, so it fails
  //    for a marker the renderer ignored and for a marker a translator introduced alike.
  const LEADERS = [
    [/^>\s/, "a blockquote marker"],
    [/^#{1,6}\s/, "a heading marker"],
    [/^[-*+]\s/, "a list marker"],
    [/^\d+\. \s*\S/, "an ordered-list marker"],
    [/^\|/, "a table row"],
    [/^\u0060\u0060\u0060/, "a code fence"],
  ];
  //    One narrow exception, for docs.js's license() only: it turns "1. Grant." into the
  //    heading <h2>1. Grant</h2> on purpose, so the clause number at the very START of an h2
  //    it built is the renderer's numbering, not a marker that leaked. Nothing else is exempt.
  const leaderHtml = numberedH2 ? html.replace(/<h2>\d+\. /g, "<h2>") : html;
  for (const chunk of leaderHtml.replace(/<[^>]+>/g, "\n").split("\n")) {
    const t = chunk.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").trim();
    if (!t) continue;
    for (const [re, what] of LEADERS) {
      if (re.test(t)) {
        failures.push(`${name}: ${what} renders as visible text: ${t.slice(0, 90)}`);
        break;
      }
    }
  }

  // 5. The no-dash rule, on the rendered string.
  const lines = html.replace(/<\/(p|li|h2|h3)>/g, "\n").split("\n");
  lines.forEach((line) => {
    if (DASH.test(line.replace(NA_CELL, "||"))) {
      failures.push(`${name}: en/em dash in rendered copy: ${line.replace(/<[^>]+>/g, "").trim().slice(0, 110)}`);
    }
  });
  return open;
}

const docSources = fs.readdirSync(docsDir).sort()
  .filter((name) => /\.(md|txt)$/.test(name) && fs.statSync(path.join(docsDir, name)).isFile())
  .map((name) => ({ name, text: fs.readFileSync(path.join(docsDir, name), "utf8") }));

for (const { name, text } of docSources) {
  const html = name.startsWith("LICENSE")
    ? render.formatLicense(text)
    : render.formatMarkdownDoc(text);
  rendered++;
  bdiElements += inspect(name, text, html, APP_ELEMENTS, failures);
}

if (rendered < 60) {
  failures.push(`only ${rendered} documents rendered; public/docs should hold every locale of six documents`);
}
if (bdiElements < 100) {
  failures.push(`only ${bdiElements} bdi elements rendered; the Arabic documents alone carry 194`);
}

// THE PUBLISHED DOCS PAGE HAS ITS OWN RENDERERS (2026-10-04). bugit.dev now serves
// v2/docs/index.html as /docs/, and it renders the same public/docs sources through
// v2/docs/docs.js: markdown(), license(), inline(), esc() and bdi(), written to follow
// formatMarkdownDoc and formatLicense "rule for rule", which is a claim, not a proof. Everything
// above renders through app.js, which still ships but is referenced by no published page, so on
// its own it proved nothing about what a reader of /docs/ sees. So every document is rendered a
// second time through docs.js's OWN functions, lifted out of the shipped file the same way, and
// held to the same five rules. The FAQ is not a document on that page but docs.js's faq() over
// v2/docs/content.<lang>.json, and its answers are inserted as HTML unescaped, so each language's
// FAQ goes through the real faq() too. The language list comes from
// scripts/lib/published-copy.mjs. A planted defect is rendered first and must be reported.
const v2Source = fs.readFileSync(path.join(root, "v2", "docs", "docs.js"), "utf8");
function liftV2(name) {
  const start = v2Source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`v2/docs/docs.js defines no ${name}()`);
  let depth = 0;
  for (let i = v2Source.indexOf("{", start); i < v2Source.length; i++) {
    if (v2Source[i] === "{") depth++;
    else if (v2Source[i] === "}" && --depth === 0) return v2Source.slice(start, i + 1);
  }
  throw new Error(`${name}() is unterminated in v2/docs/docs.js`);
}
// inline() turns an old #/docs/... link into the page's real address (2026-10-10) through pathOf(),
// which reads ALIAS: both are one-line declarations, lifted as they ship.
function liftV2Line(prefix) {
  const start = v2Source.indexOf(prefix);
  if (start === -1) throw new Error(`v2/docs/docs.js declares no ${prefix}`);
  return v2Source.slice(start, v2Source.indexOf("\n", start));
}
// `C` is docs.js's loaded content.<lang>.json; faq() reads it, the document renderers do not.
const v2Renderers = new Function(
  "C",
  [liftV2Line("var ALIAS ="), liftV2Line("var pathOf ="), ...["esc", "bdi", "inline", "markdown", "license", "faq"].map(liftV2)].join("\n") + "; return { markdown, license, faq };"
);
// markdown() renders a blockquote as <aside class="callout"> and license() a clause number as <b>;
// faq() wraps each answer in details/summary/div and an <i> marker. Nothing else is expected.
const V2_ELEMENTS = [...APP_ELEMENTS, "aside"];
const V2_FAQ_ELEMENTS = [...V2_ELEMENTS, "details", "summary", "div", "i"];

{
  const r = v2Renderers({ faq: [["Q", "A <b>ok</b>"]] });
  const planted = [];
  inspect("planted.md", "", r.markdown("Para with a dash — here.\n\n| a | b |"), V2_ELEMENTS, planted);
  inspect("planted-faq", "", v2Renderers({ faq: [["Q", "Answer <table><tr><td>x</td></tr></table>"]] }).faq(), V2_FAQ_ELEMENTS, planted);
  // The licence exemption must stay narrow: a numbered paragraph is still a leaked marker.
  inspect("planted-license", "", "<h2>1. Grant</h2><p>2. leaked clause text</p>", V2_ELEMENTS, planted, true);
  const clean = [];
  inspect("clean.md", "", r.markdown("## Heading\n\nA plain paragraph."), V2_ELEMENTS, clean);
  inspect("clean-faq", "", r.faq(), V2_FAQ_ELEMENTS, clean);
  if (!planted.some((f) => /dash/.test(f)) || !planted.some((f) => /table row/.test(f)) ||
      !planted.some((f) => /<table>/.test(f)) || !planted.some((f) => /leaked clause/.test(f)) ||
      planted.some((f) => /1\. Grant/.test(f)) || clean.length) {
    failures.push(
      "v2 docs: negative control did not fire; a planted dash, table row or unexpected element was not reported " +
        `(planted: ${planted.length}, clean: ${JSON.stringify(clean)})`
    );
  }
}

let v2Rendered = 0;
let v2Bdi = 0;
for (const { name, text } of docSources) {
  const r = v2Renderers(null);
  const isLicense = name.startsWith("LICENSE");
  const html = isLicense ? r.license(text) : r.markdown(text);
  v2Rendered++;
  v2Bdi += inspect(`v2 docs ${name}`, text, html, V2_ELEMENTS, failures, isLicense);
}
let faqLangs = 0;
for (const lang of publishedLangs()) {
  const content = JSON.parse(fs.readFileSync(path.join(root, "v2", "docs", `content.${lang}.json`), "utf8"));
  if (!Array.isArray(content.faq) || !content.faq.length) {
    failures.push(`v2/docs/content.${lang}.json has no FAQ to render`);
    continue;
  }
  inspect(`v2/docs/content.${lang}.json faq`, "", v2Renderers(content).faq(), V2_FAQ_ELEMENTS, failures);
  faqLangs++;
  // The page chrome from the same file (titles, intros, card descriptions) goes through esc(),
  // so only the dash rule can fail there.
  for (const group of ["docPages", "docs", "dl", "ui"]) {
    for (const [key, value] of Object.entries(content[group] || {})) {
      if (typeof value === "string" && DASH.test(value)) {
        failures.push(`v2/docs/content.${lang}.json ${group}.${key}: en/em dash in rendered copy: ${value.slice(0, 110)}`);
      }
    }
  }
}
if (v2Rendered < 60) failures.push(`v2 docs: only ${v2Rendered} documents rendered through docs.js`);
if (v2Bdi < 100) failures.push(`v2 docs: only ${v2Bdi} bdi elements rendered through docs.js; the Arabic documents alone carry 194`);
if (faqLangs < publishedLangs().length) failures.push(`v2 docs: FAQ rendered for ${faqLangs} of ${publishedLangs().length} published languages`);

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
  `check-doc-rendering OK: ${rendered} documents rendered through app.js's own renderers ` +
    `(${bdiElements} bdi) and ${v2Rendered} through the published docs page's (${v2Bdi} bdi), ` +
    `plus the FAQ in ${faqLangs} languages; no tag text, no markdown leader, no en/em dash in customer copy.`
);
