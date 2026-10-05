// THE COPY A VISITOR IS SERVED, AS FILES, for the guards that scan text (2026-10-04).
//
// On 2026-10-04 bugit.dev switched to the redesign: build.js publishes v2/index.html as the
// homepage and v2/docs/index.html as /docs/. Every copy guard in this folder was written for the
// single page site and read app.js and index.html, which are still built but are no longer what
// anybody reads. Their passing said nothing about the pages that are live: the homepage's prices,
// claims and wording sat behind no guard at all. This module is the one place that knows where the
// published copy lives now, so a guard asks it instead of restating the list.
//
//   - v2/index.html and v2/docs/index.html: the pages, with the English copy written into them
//     (i18n.js reads English from the page itself; en.json is only a translator's source).
//   - v2/i18n/<lang>.json: the homepage in each other language.
//   - v2/docs/content.<lang>.json: the documentation chrome, intros and FAQ in each language.
//   - v2/*.js and v2/docs/docs.js: English fallback strings written into the scripts.
//
// The legal documents themselves (public/docs/*.md, *.txt) are unchanged and are fetched by the
// docs page; guards that already read public/docs keep doing so.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const rd = (rel) => readFileSync(join(ROOT, rel), "utf8");

/** The eleven published languages, read from v2/i18n.js so this cannot drift from what ships. */
export function publishedLangs() {
  const src = rd("v2/i18n.js");
  const decl = /var\s+LANGS\s*=\s*\[(.*?)\];/s.exec(src);
  if (!decl) throw new Error("published-copy: no LANGS array in v2/i18n.js");
  const langs = [...decl[1].matchAll(/\["([a-z-]+)"\s*,/g)].map((m) => m[1]);
  if (langs.length < 2) throw new Error("published-copy: parsed " + langs.length + " language(s) from v2/i18n.js");
  return langs;
}

/** The guides under /articles/, English pages with their own copy. */
function articlePages() {
  const dir = join(ROOT, "v2", "articles");
  if (!existsSync(dir)) return [];
  const slugs = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== "images").map((e) => `v2/articles/${e.name}/index.html`);
  return ["v2/articles/index.html", ...slugs];
}

/** Every string value in a JSON tree, in document order. */
function strings(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

/**
 * The published copy as a list of { file, lang, kind, text }.
 *   kind "page"   raw HTML of a published page (English as written)
 *   kind "home"   the homepage strings of one language (JSON values joined by newlines)
 *   kind "docs"   the docs content of one language (JSON values joined by newlines)
 *   kind "script" raw source of a published script (English fallbacks)
 * `lang` is null for a page or script, whose text is English.
 */
export function publishedCopy() {
  const out = [];
  for (const file of ["v2/index.html", "v2/docs/index.html", ...articlePages()]) {
    out.push({ file, lang: "en", kind: "page", text: rd(file) });
  }
  for (const lang of publishedLangs()) {
    const home = `v2/i18n/${lang}.json`;
    if (lang !== "en") {
      if (!existsSync(join(ROOT, home))) throw new Error(`published-copy: ${home} is missing`);
      out.push({ file: home, lang, kind: "home", text: strings(JSON.parse(rd(home))).join("\n") });
    }
    const docs = `v2/docs/content.${lang}.json`;
    if (!existsSync(join(ROOT, docs))) throw new Error(`published-copy: ${docs} is missing`);
    out.push({ file: docs, lang, kind: "docs", text: strings(JSON.parse(rd(docs))).join("\n") });
  }
  const scripts = readdirSync(join(ROOT, "v2")).filter((f) => f.endsWith(".js")).map((f) => "v2/" + f);
  scripts.push("v2/docs/docs.js");
  for (const file of scripts) out.push({ file, lang: null, kind: "script", text: rd(file) });
  return out;
}

/** Visible text of an HTML string: scripts, styles and tags removed, entities for spacing decoded. */
export function htmlText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}
