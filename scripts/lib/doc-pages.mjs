// The documentation as real pages (2026-10-10, SEO audit, owner OK).
//
// Until now /docs/ was one HTML document that drew every page in the browser from a #/docs/...
// fragment. A crawler sees one URL with an empty <main>, so the privacy statement, the refund
// policy, the licence and the user guide were not pages to a search engine at all.
//
// build.js calls this after it has written dist/docs/index.html (assets already hashed). For each
// page in the docs registry it writes dist/docs/<slug>/index.html: the same shell, its own
// canonical, title, description and breadcrumb data, and the page itself already rendered in
// English, so it reads with JavaScript off. The rendering is NOT reimplemented here: v2/docs/docs.js
// is run in a sandbox and its own renderers (markdown, licence, FAQ, support, sidebar) produce the
// HTML, so the page a crawler reads and the page a visitor's browser draws cannot drift apart.
// In the browser, docs.js keeps that English page on first load and re-renders it only for another
// language (data-prerendered).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ORIGIN = "https://bugit.dev";
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The docs registry and renderers, from docs.js itself. */
export function loadDocs(root) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "v2", "docs", "docs.js"), "utf8"), sandbox, { filename: "v2/docs/docs.js" });
  const R = sandbox.BugItDocs;
  if (!R) throw new Error("doc-pages: v2/docs/docs.js did not export its renderers (BugItDocs); the build-time branch moved");
  const content = JSON.parse(fs.readFileSync(path.join(root, "v2", "docs", "content.en.json"), "utf8"));
  const docs = R.load(content);
  return { R, docs, content };
}

/** Every page with its address, for the sitemap and the gates. */
export function docPaths(root) {
  const { R, docs } = loadDocs(root);
  return ["/docs/", ...docs.map((d) => R.pathOf(d.r))];
}

/** The source file of a page, relative to the repo root, or null (FAQ and support live in content.en.json). */
export function docSource(doc) {
  return doc.src ? doc.src[0].replace(/^\//, "") : null;
}

function bodyOf(R, doc, root) {
  if (doc.kind === "faq") return R.faq();
  if (doc.kind === "support") return R.support();
  const file = path.join(root, docSource(doc));
  if (!fs.existsSync(file)) throw new Error(`doc-pages: ${docSource(doc)} is missing, so ${R.pathOf(doc.r)} would be published empty`);
  const text = fs.readFileSync(file, "utf8");
  return doc.kind === "license" ? R.license(text) : R.markdown(text);
}

function swap(html, re, value, what, page) {
  if (!re.test(html)) throw new Error(`doc-pages: the docs shell lost its ${what}, so ${page} cannot be written`);
  return html.replace(re, () => value);
}

/** Writes dist/docs/index.html (pre-rendered) and dist/docs/<slug>/index.html. Returns the paths written. */
export function writeDocPages({ root, dist }) {
  const { R, docs, content } = loadDocs(root);
  const shellPath = path.join(dist, "docs", "index.html");
  const shell = fs.readFileSync(shellPath, "utf8");
  const written = [];
  const homeDesc = (shell.match(/<meta name="description" content="([^"]*)"/) || [])[1];

  for (const doc of [null, ...docs]) {
    const r = doc ? doc.r : "docs";
    const p = R.pathOf(r);
    const url = ORIGIN + p;
    const title = doc ? `${doc.t} · BugIt` : `${content.docPages.homeTitle} · BugIt`;
    const desc = doc ? (doc.desc ? `${doc.desc} BugIt by Taskivator.` : homeDesc) : homeDesc;
    const main = doc ? R.docPage(doc, bodyOf(R, doc, root)) : R.homePage();
    let html = shell;
    html = swap(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`, "canonical", p);
    html = swap(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`, "og:url", p);
    html = swap(html, /<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`, "title", p);
    html = swap(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(title)}">`, "og:title", p);
    html = swap(html, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${attr(title)}">`, "twitter:title", p);
    for (const [re, tag] of [[/<meta name="description" content="[^"]*">/, 'name="description"'], [/<meta property="og:description" content="[^"]*">/, 'property="og:description"'], [/<meta name="twitter:description" content="[^"]*">/, 'name="twitter:description"']]) {
      html = swap(html, re, `<meta ${tag} content="${attr(desc)}">`, tag, p);
    }
    if (doc) {
      const ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "BugIt", item: ORIGIN + "/" },
          { "@type": "ListItem", position: 2, name: "Docs", item: ORIGIN + "/docs/" },
          { "@type": "ListItem", position: 3, name: doc.t, item: url },
        ],
      };
      html = swap(html, /<\/head>/, `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n</head>`, "</head>", p);
    }
    html = swap(html, /<body class="docs-page is-home">/, `<body class="docs-page${doc ? "" : " is-home"}">`, "body class", p);
    html = swap(html, /<span id="sideCurrent">[^<]*<\/span>/, `<span id="sideCurrent">${doc ? doc.t.replace(/</g, "&lt;") : "Overview"}</span>`, "sideCurrent", p);
    html = swap(html, /<nav class="side" id="side"><\/nav>/, `<nav class="side" id="side">${R.sidebar(doc ? doc.r : "docs")}</nav>`, "sidebar", p);
    html = swap(html, /<main id="docsMain" class="docs-main" tabindex="-1"><\/main>/, `<main id="docsMain" class="docs-main" tabindex="-1" data-prerendered="${r}">${main}</main>`, "main", p);
    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) throw new Error(`doc-pages: ${p} has ${h1s} h1 elements; a page has exactly one`);
    const out = path.join(dist, ...p.split("/").filter(Boolean), "index.html");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    written.push(p);
  }
  return written;
}
