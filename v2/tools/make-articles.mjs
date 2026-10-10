#!/usr/bin/env node
// Builds the articles under /articles/ from their Markdown sources (2026-10-05).
//
//   node v2/tools/make-articles.mjs
//
// The sources live in v2/tools/articles-src/*.md, copies of the files the company keeps in
// E:\Taskivator\_shared\articles\bugit (front matter: title, slug, description, hero, hero_alt,
// tags). This script writes v2/articles/<slug>/index.html and v2/articles/index.html. Those pages
// are published by build.js; this folder (v2/tools) never ships. Run it again after editing a
// source, and commit both the source and the pages it wrote.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const V2 = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(V2, "tools", "articles-src");
const OUT = path.join(V2, "articles");
const DATE = "2026-10-05";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function parse(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`${file}: no front matter`);
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1");
  }
  const tg = /^tags:\s*\[(.*)\]\s*$/m.exec(m[1]);
  fm.tags = tg ? tg[1].split(",").map((t) => t.trim()).filter(Boolean) : [];
  fm.minutes = Math.max(1, Math.round(m[2].split(/\s+/).length / 220));
  for (const k of ["title", "slug", "description", "hero", "hero_alt"]) if (!fm[k]) throw new Error(`${file}: front matter lacks ${k}`);
  if (fm.title.length > 60) throw new Error(`${file}: title is over 60 characters`);
  if (fm.description.length > 160) throw new Error(`${file}: description is over 160 characters`);
  return { fm, body: m[2] };
}

const asset = (s) => s.replace(/^images\//, "/v2/articles/images/");
const link = (u) => u.replace(/^https:\/\/bugit\.dev(\/articles\/)/, "$1");

// The free bug report tools on taskivator.com. Each article links all three, the one that matches
// its subject first (SEO audit 2026-10-10: the tools already linked here, the articles did not link
// back). Descriptions are the tools' own, shortened; the template builder lays out Jira and Azure
// DevOps only, so it must not be described as covering GitHub.
const TOOLS = {
  steps: { url: "https://taskivator.com/steps-to-reproduce-checklist/", title: "Steps to reproduce checklist", desc: "A checklist and a live template you fill in and copy. It runs in your browser." },
  severity: { url: "https://taskivator.com/bug-severity-helper/", title: "Bug severity helper", desc: "Answer three questions and copy a suggested severity with its reason into your ticket." },
  template: { url: "https://taskivator.com/bug-report-template-builder/", title: "Bug report template builder", desc: "Fill in the parts and copy a report laid out for Jira or Azure DevOps." },
};
const toolOrder = (slug) =>
  /reproduc|sometimes|regression|logs/.test(slug) ? ["steps", "template", "severity"]
  : /severity|triage/.test(slug) ? ["severity", "template", "steps"]
  : ["template", "steps", "severity"];

// Structured data. No rating and no price: an article page makes no offer (owner copy rules).
const jsonLd = (o) => `<script type="application/ld+json">\n${JSON.stringify(o, null, 1).replace(/</g, "\\u003c")}\n</script>\n`;

function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => `<img src="${asset(src)}" alt="${alt}" width="1200" height="630" loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => `<a href="${link(u)}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s;
}

function render(body) {
  const lines = body.split("\n");
  const out = [];
  const toc = [];
  let open = false;
  let i = 0;
  const close = () => {
    if (open) { out.push("</section>"); open = false; }
  };
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<div class="code"><button type="button" class="copy" aria-label="Copy this text">Copy</button><pre><code>${esc(buf.join("\n"))}</code></pre></div>`);
    } else if (/^# /.test(l)) {
      i++;
    } else if (/^## /.test(l)) {
      close();
      const text = l.slice(3).trim();
      const id = slugify(text);
      const kind = /^the takeaway/i.test(text) ? " takeaway" : /^where bugit fits/i.test(text) ? " fits" : "";
      toc.push({ id, text });
      out.push(`<section id="${id}" class="sec${kind}">`);
      open = true;
      out.push(`<h2>${inline(text)}</h2>`);
      i++;
    } else if (/^!\[/.test(l)) {
      out.push(`<figure class="hero">${inline(l.trim())}</figure>`);
      i++;
    } else if (/^\d+\. /.test(l) || /^- /.test(l)) {
      const ordered = /^\d+\. /.test(l);
      const re = ordered ? /^\d+\. / : /^- /;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(re, ""))}</li>`);
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>\n${items.join("\n")}\n</${tag}>`);
    } else if (l.trim() === "") {
      i++;
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() !== "" && !/^(#|```|- |\d+\. |!\[)/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join(" "))}</p>`);
    }
  }
  close();
  return { html: out.join("\n"), toc };
}

const head = (title, desc, url, type, current, ld = "") => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="/consent.js"></script>
<link rel="icon" type="image/png" sizes="32x32" href="/public/brand/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/public/brand/favicon-16.png">
<link rel="apple-touch-icon" href="/public/brand/favicon-180.png">
<link rel="icon" href="/public/brand/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0b0614">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Taskivator">
<meta property="og:title" content="${esc(title)} · BugIt">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://bugit.dev/public/brand/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="BugIt by Taskivator, the QA agent that learns your workflow.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)} · BugIt">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="https://bugit.dev/public/brand/og-image.png">
<title>${esc(title)} · BugIt</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="/v2/v2.css">
<link rel="stylesheet" href="/v2/consent.css">
<link rel="stylesheet" href="/v2/articles/articles.css">
<script src="/v2/articles/articles.js" defer></script>
${ld}</head>
<body class="article-page is-home">
<a class="skip" href="#main">Skip to content</a>
<span class="read-progress" id="readProgress" aria-hidden="true"></span>

<header class="nav">
  <a class="nav-brand" href="/" aria-label="BugIt home">
    <img class="blip-logo" src="/public/brand/blip-logo.svg" alt="" width="54" height="54">
    <span class="nav-name">BugIt<small>by Taskivator</small></span>
  </a>
  <nav class="nav-links" aria-label="Main">
    <a href="/#how">How it works</a>
    <a href="/#pricing">Pricing</a>
    <a href="/docs/">Docs</a>
    <a href="/articles/"${current ? ' aria-current="page"' : ""}>Articles</a>
  </nav>
  <div class="nav-end">
    <a class="btn btn-sm btn-primary" href="https://portal.bugit.dev/pricing">Get BugIt</a>
  </div>
</header>
`;

const foot = `
<footer class="foot">
  <span>BugIt by <a href="https://taskivator.com/bugit/">Taskivator</a></span>
  <nav aria-label="Footer"><a href="/docs/">Docs</a><a href="/articles/">Articles</a><a href="/docs/#/docs/privacy">Privacy</a><a href="/docs/#/docs/refund">Refunds</a><a href="/docs/#/docs/commerce">Commercial Transactions</a><a href="/docs/#/docs/security">Security</a><button type="button" class="foot-link" data-consent-open>Cookie preferences</button></nav>
</footer>

<script src="/v2/nav.js"></script>
<script src="/v2/consent-ui.js"></script>
</body>
</html>
`;

const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".md")).sort();
const all = files.map((f) => parse(path.join(SRC, f))).sort((a, b) => (Number(a.fm.order) || 99) - (Number(b.fm.order) || 99) || a.fm.slug.localeCompare(b.fm.slug));

// Remove pages of a slug that no longer has a source.
if (fs.existsSync(OUT)) {
  for (const e of fs.readdirSync(OUT, { withFileTypes: true })) {
    if (e.isDirectory() && e.name !== "images" && !all.some((a) => a.fm.slug === e.name)) fs.rmSync(path.join(OUT, e.name), { recursive: true });
  }
}

for (const { fm, body } of all) {
  const { html, toc } = render(body);
  const url = `https://bugit.dev/articles/${fm.slug}/`;
  const more = all
    .filter((a) => a.fm.slug !== fm.slug)
    .slice(0, 3)
    .map((a) => `<li><a href="/articles/${a.fm.slug}/"><span class="mc-t">${esc(a.fm.title)}</span><span class="mc-d">${esc(a.fm.description)}</span></a></li>`)
    .join("\n");
  const tags = fm.tags.slice(0, 3).map((t) => `<li>${esc(t)}</li>`).join("");
  const tocHtml = toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join("\n");
  const tools = toolOrder(fm.slug)
    .map((k) => TOOLS[k])
    .map((t) => `<li><a href="${t.url}"><span class="mc-t">${esc(t.title)}</span><span class="mc-d">${esc(t.desc)}</span></a></li>`)
    .join("\n");
  const date = fm.date || DATE;
  const ld = jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: fm.title,
        description: fm.description,
        image: "https://bugit.dev" + asset(fm.hero),
        datePublished: date,
        dateModified: fm.updated || date,
        inLanguage: "en",
        mainEntityOfPage: url,
        author: { "@type": "Organization", name: "Taskivator", url: "https://taskivator.com/" },
        publisher: { "@type": "Organization", name: "Taskivator", url: "https://taskivator.com/", logo: { "@type": "ImageObject", url: "https://taskivator.com/assets/brand/icon-512.png" } },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "BugIt", item: "https://bugit.dev/" },
          { "@type": "ListItem", position: 2, name: "Articles", item: "https://bugit.dev/articles/" },
          { "@type": "ListItem", position: 3, name: fm.title, item: url },
        ],
      },
    ],
  });
  const page =
    head(fm.title, fm.description, url, "article", false, ld) +
    `
<main id="main" class="article" tabindex="-1">
  <header class="a-hero">
    <p class="crumbs"><a href="/articles/">Articles</a><span aria-hidden="true"> / </span><span>${esc(fm.tags[0] || "Article")}</span></p>
    <h1>${esc(fm.title)}</h1>
    <p class="a-sum">${esc(fm.description)}</p>
    <p class="a-meta"><span>BugIt by Taskivator</span><span><time datetime="${date}">${date}</time></span><span>${fm.minutes} min read</span></p>
    <ul class="a-tags" aria-label="Topics">${tags}</ul>
  </header>
  <div class="a-grid">
    <nav class="a-toc" aria-label="On this page"><p class="a-toc-h">On this page</p><ol>
${tocHtml}
</ol></nav>
    <article class="a-body">
${html}
    </article>
  </div>
  <section class="more" aria-labelledby="tools-h">
    <h2 id="tools-h">Free tools for this</h2>
    <ul class="more-grid">
${tools}
    </ul>
  </section>
  <section class="more" aria-labelledby="more-h">
    <h2 id="more-h">Keep reading</h2>
    <ul class="more-grid">
${more}
    </ul>
  </section>
</main>
` +
    foot;
  const dir = path.join(OUT, fm.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page);
}

const cards = all
  .map(({ fm }, n) => `<li class="card"><a href="/articles/${fm.slug}/"><span class="card-n" aria-hidden="true">${String(n + 1).padStart(2, "0")}</span><span class="card-meta">${esc(fm.tags[0] || "Article")} · ${fm.minutes} min read</span><h2>${esc(fm.title)}</h2><p>${esc(fm.description)}</p><span class="card-go">Read the article <span aria-hidden="true">→</span></span></a></li>`)
  .join("\n");
fs.writeFileSync(
  path.join(OUT, "index.html"),
  head("Articles for developers and QA", "Practical articles on writing bug reports, catching duplicate bugs, reproducing a bug and attaching useful evidence, from the makers of BugIt.", "https://bugit.dev/articles/", "website", true) +
    `
<main id="main" class="article idx" tabindex="-1">
  <header class="a-hero idx-hero">
    <p class="kicker">Articles</p>
    <h1>Write better bugs. Fix them faster.</h1>
    <p class="a-sum">Short, practical articles for people who write, triage and fix bugs, from the team behind <a href="https://bugit.dev/">BugIt</a>, a QA agent that turns a rough description into a complete bug report. More about the product is at <a href="https://taskivator.com/bugit/">taskivator.com/bugit</a>.</p>
  </header>
  <ul class="cards">
${cards}
  </ul>
</main>
` +
    foot,
);
console.log(`make-articles: ${all.length} article(s) written`);

// /llms.txt (llmstxt.org): a plain summary for AI crawlers. Written here, from the same sources as
// the articles, so the article list in it cannot fall behind the site. build.js publishes it.
const llms = `# BugIt

> BugIt is a QA agent made by Taskivator. It runs inside the AI assistant you already use (GitHub Copilot Chat in VS Code, the Claude extension, or a terminal), turns a rough note into a complete bug report, and files it to your tracker, such as Jira, GitHub or Azure DevOps, only after you type FILE IT.

Your tickets, specs and settings stay on your machine and go only to the tools you connect and your own AI model.

## Product

- [BugIt home](https://bugit.dev/): what BugIt does, how it works and pricing
- [Documentation](https://bugit.dev/docs/): install, activate, user guide, FAQ and every BugIt policy
- [Get BugIt](https://portal.bugit.dev/pricing): plans and purchase

## Articles

${all.map(({ fm }) => `- [${fm.title}](https://bugit.dev/articles/${fm.slug}/): ${fm.description}`).join("\n")}

## Free tools

${Object.values(TOOLS).map((t) => `- [${t.title}](${t.url}): ${t.desc}`).join("\n")}

## Company

- [Taskivator](https://taskivator.com/): the company that makes BugIt
- [BugIt on YouTube](https://www.youtube.com/@BugItByTaskivator): short videos on every feature
`;
fs.writeFileSync(path.join(V2, "..", "llms.txt"), llms);
console.log("make-articles: llms.txt written");
