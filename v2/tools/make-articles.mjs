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
import { loadDocs } from "../../scripts/lib/doc-pages.mjs";

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
  <nav aria-label="Footer"><a href="/docs/">Docs</a><a href="/articles/">Articles</a><a href="/templates/">Templates</a><a href="/docs/privacy/">Privacy</a><a href="/docs/refund/">Refunds</a><a href="/docs/commerce/">Commercial Transactions</a><a href="/docs/security/">Security</a><button type="button" class="foot-link" data-consent-open>Cookie preferences</button></nav>
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
  .map(({ fm }, n) => `<li class="card"><a href="/articles/${fm.slug}/"><span class="card-n" aria-hidden="true">${String(n + 1).padStart(2, "0")}</span><span class="card-meta">${esc(fm.tags[0] || "Article")} · ${fm.minutes} min read</span><h3>${esc(fm.title)}</h3><p>${esc(fm.description)}</p><span class="card-go">Read the article <span aria-hidden="true">→</span></span></a></li>`)
  .join("\n");

/* THE ARTICLES HUB IS THE PILLAR PAGE (owner 2026-10-10: "make it the articles hub", so the
   article count stays where the owner set it). /articles/ is "How to write a bug report": the parts
   of a report in the order you write them, each step linking the article that goes deeper, then
   every article. Owner copy rules: no dashes, no prices, no counts, no absolutes. A link to an
   article that has no source fails the build below, so a renamed slug cannot leave a dead link. */
const A = (slug, text) => {
  if (!all.some((a) => a.fm.slug === slug)) throw new Error(`make-articles: the hub links /articles/${slug}/, which has no source`);
  return `<a href="/articles/${slug}/">${text}</a>`;
};
const T_ = (k) => `<a href="${TOOLS[k].url}">${TOOLS[k].title.toLowerCase()}</a>`;
const GUIDE = [
  ["check-it-is-new", "Before you write, check it is new", `<p>A second ticket for the same bug splits the conversation and wastes the time of whoever picks up the copy. Search the tracker with the error text, the screen name and a word or two from the symptom before you start. ${A("catch-duplicate-bugs-before-filing", "Catch duplicate bugs before you file them")} explains why duplicates happen, and ${A("search-for-duplicate-bugs-jira-github-azure-devops", "the duplicate search cheat sheet")} gives searches you can paste into Jira, GitHub and Azure DevOps.</p>`],
  ["title", "Write a title that names the problem", `<p>The title is what people scan in a list, so it should say what broke, where, and under what condition: "Checkout total ignores the discount code on mobile Safari" tells a developer more than "Checkout broken". Keep opinions and urgency out of it; severity has its own field.</p>`],
  ["steps", "Write steps someone else can follow", `<p>Reproduction steps are the heart of the report. Start from a known place, number each action, include the exact data you typed, and stop at the moment it fails. ${A("how-to-write-reproduction-steps-checklist", "How to write reproduction steps")} has a checklist and a before and after example, and the free ${T_("steps")} gives you a template to fill in.</p>`],
  ["expected-actual", "Say what you expected and what happened", `<p>Write the two side by side. "Expected: the total drops by 10%. Actual: the total stays the same and no error appears." The gap between them is the bug, and writing it down makes it hard to misread.</p>`],
  ["evidence", "Add the environment and the evidence", `<p>Name the version or build, the device, the browser or OS, and the account type. Then attach what shows the failure: ${A("screenshots-and-recordings-for-bug-reports", "a cropped screenshot or a short recording")}, and the part of the log around the failing moment. ${A("reproduce-a-bug-from-logs", "Reproduce a bug from a log file")} shows how to find that moment and trim the rest. Keep passwords, tokens and personal data out of everything you attach.</p>`],
  ["hard-bugs", "When the bug is hard to pin down", `<p>Some bugs do not appear on every run. Count your attempts, note what changes between them, and say so in the report: ${A("report-a-bug-that-only-happens-sometimes", "how to report a bug that only happens sometimes")}. If something that used to work has stopped, find the last version that worked and the first that failed: ${A("report-a-regression-bug", "how to report a regression")}.</p>`],
  ["severity", "Set severity and priority", `<p>Severity is how bad the failure is; priority is how soon the team should fix it. They are separate decisions, often made by different people. ${A("severity-vs-priority-bug-triage-matrix", "Severity vs priority")} has a matrix with examples, ${A("bug-triage-checklist", "the bug triage checklist")} keeps the triage meeting short, and the free ${T_("severity")} suggests a severity with a reason you can paste into the ticket.</p>`],
  ["template", "Use a template for your tracker", `<p>A template makes reports arrive with the same parts in the same place. ${A("bug-report-template-developers-read", "A bug report template developers will actually read")} explains each part, ${A("bug-report-template-jira-github-azure-devops", "the tracker templates")} give a version for Jira, GitHub Issues and Azure DevOps, and ${A("bug-report-examples-good-and-bad", "the good and bad examples")} show weak reports rewritten. The free ${T_("template")} lays a report out for Jira or Azure DevOps, and <a href="/templates/">the free template pack</a> has these templates as files to download.</p>`],
];
const guideToc = GUIDE.map(([id, h]) => `<li><a href="#${id}">${esc(h)}</a></li>`).join("\n");
const guideBody = GUIDE.map(([id, h, body]) => `<section id="${id}" class="sec">\n<h2>${esc(h)}</h2>\n${body}\n</section>`).join("\n");
const HUB_TITLE = "How to write a bug report: a practical guide";
const HUB_DESC = "How to write a bug report a developer can act on: check for duplicates, write clear steps, add evidence and set severity, with templates and examples.";
if (HUB_TITLE.length > 60 || HUB_DESC.length > 160) throw new Error("make-articles: the hub title or description is too long");
const hubLd = jsonLd({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: HUB_TITLE,
      description: HUB_DESC,
      image: "https://bugit.dev/public/brand/og-image.png",
      datePublished: "2026-10-10",
      dateModified: "2026-10-10",
      inLanguage: "en",
      mainEntityOfPage: "https://bugit.dev/articles/",
      author: { "@type": "Organization", name: "Taskivator", url: "https://taskivator.com/" },
      publisher: { "@type": "Organization", name: "Taskivator", url: "https://taskivator.com/", logo: { "@type": "ImageObject", url: "https://taskivator.com/assets/brand/icon-512.png" } },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "BugIt", item: "https://bugit.dev/" },
        { "@type": "ListItem", position: 2, name: "How to write a bug report", item: "https://bugit.dev/articles/" },
      ],
    },
  ],
});
fs.writeFileSync(
  path.join(OUT, "index.html"),
  head(HUB_TITLE.replace(/: a practical guide$/, ""), HUB_DESC, "https://bugit.dev/articles/", "article", true, hubLd) +
    `
<main id="main" class="article idx" tabindex="-1">
  <header class="a-hero idx-hero">
    <p class="kicker">Guide</p>
    <h1>How to write a bug report</h1>
    <p class="a-sum">A good bug report lets someone who has never seen the problem find it, understand it and fix it. This guide walks through the parts of a report in the order you write them, with a deeper article for each step. It comes from the team behind <a href="https://bugit.dev/">BugIt</a>, a QA agent that turns a rough description into a complete bug report; more about the product is at <a href="https://taskivator.com/bugit/">taskivator.com/bugit</a>.</p>
  </header>
  <div class="a-grid">
    <nav class="a-toc" aria-label="On this page"><p class="a-toc-h">On this page</p><ol>
${guideToc}
<li><a href="#all-articles">All articles</a></li>
</ol></nav>
    <article class="a-body">
${guideBody}
<section id="in-short" class="sec takeaway">
<h2>The short version</h2>
<p>Check it is new, name the problem in the title, write steps a stranger can follow, say what you expected and what happened, attach the evidence without personal data, and set severity and priority as two separate calls.</p>
</section>
<section id="where-bugit-fits" class="sec fits">
<h2>Where BugIt fits</h2>
<p>BugIt writes a report with these parts filled in from a rough note, checks it, and files it to your tracker after you type FILE IT. See how it works at <a href="https://bugit.dev/">bugit.dev</a> or read about it at <a href="https://taskivator.com/bugit/">taskivator.com/bugit</a>.</p>
</section>
    </article>
  </div>
  <section class="more" id="all-articles" aria-labelledby="all-h">
    <h2 id="all-h">All articles</h2>
    <ul class="cards">
${cards}
    </ul>
  </section>
</main>
` +
    foot,
);
console.log(`make-articles: ${all.length} article(s) written`);

/* THE FREE TEMPLATE PACK (owner OK 2026-10-10), /templates/. A tools page, not an article, so it
   does not count toward the article cap. The files are copies of the approved pack in
   E:\Taskivator\_shared\templates\bugit\<date>\ (see PROVENANCE.md there), kept in
   v2/templates/files/ so the build never reads outside the repo; build.js publishes them at
   /templates/files/. Each one is shown in full with a Copy button and a Download link, and links the
   article that explains it. A missing file or article fails here rather than shipping a dead link. */
const TPL_DIR = path.join(V2, "templates");
const PACK = [
  ["bug-report-template.md", "General bug report template", "A template with a place for each fact a developer asks for first. Paste it into your tracker or a shared team template.", "bug-report-template-developers-read"],
  ["jira-bug-report-template.txt", "Jira bug report template", "The same layout as plain text that pastes cleanly into a Jira description. The title goes in the Summary field.", "bug-report-template-jira-github-azure-devops"],
  ["bug_report.yml", "GitHub issue form", "A form with labelled boxes for new bug reports. Save it in your repository as .github/ISSUE_TEMPLATE/bug_report.yml.", "bug-report-template-jira-github-azure-devops"],
  ["azure-devops-bug-template.txt", "Azure DevOps bug template", "What goes in each field of an Azure DevOps bug, from Title to Related.", "bug-report-template-jira-github-azure-devops"],
  ["steps-to-reproduce-checklist.md", "Steps to reproduce checklist", "A checklist for steps a stranger can follow, with a template to paste.", "how-to-write-reproduction-steps-checklist"],
  ["severity-and-priority-guide.md", "Severity and priority guide", "Severity and priority scales you can copy, examples of each combination, and a rule for disagreements.", "severity-vs-priority-bug-triage-matrix"],
];
const tplSections = PACK.map(([file, title, desc, slug]) => {
  const p = path.join(TPL_DIR, "files", file);
  if (!fs.existsSync(p)) throw new Error(`make-articles: the template pack lacks ${file}`);
  const text = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n").trimEnd();
  const id = file.replace(/\.[a-z]+$/, "").replace(/_/g, "-");
  return `<section id="${id}" class="sec">
<h2>${esc(title)}</h2>
<p>${esc(desc)} ${A(slug, "Read the article behind it")}.</p>
<div class="code"><button type="button" class="copy" aria-label="Copy this template">Copy</button><pre><code>${esc(text)}</code></pre></div>
<p><a class="btn btn-ghost btn-sm" href="/templates/files/${file}" download="${file}">Download ${esc(file)}</a></p>
</section>`;
}).join("\n");
const TPL_TITLE = "Free bug report templates";
const TPL_DESC = "The manual way: free bug report templates for Jira, GitHub and Azure DevOps, a steps checklist and a severity guide. BugIt fills them in for you.";
if (TPL_DESC.length > 160) throw new Error("make-articles: the templates description is too long");
const tplLd = jsonLd({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", name: TPL_TITLE, description: TPL_DESC, url: "https://bugit.dev/templates/", inLanguage: "en", publisher: { "@type": "Organization", name: "Taskivator", url: "https://taskivator.com/" } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "BugIt", item: "https://bugit.dev/" },
      { "@type": "ListItem", position: 2, name: TPL_TITLE, item: "https://bugit.dev/templates/" },
    ] },
  ],
});
fs.writeFileSync(
  path.join(TPL_DIR, "index.html"),
  head(TPL_TITLE, TPL_DESC, "https://bugit.dev/templates/", "website", false, tplLd).replace('<body class="article-page is-home">', '<body class="article-page is-home templates-page">') +
    `
<main id="main" class="article" tabindex="-1">
  <header class="a-hero">
    <p class="kicker">Free templates</p>
    <h1>${esc(TPL_TITLE)}</h1>
    <p class="a-sum">Copy a template straight into your tracker, or download the file and share it with your team. They are free to use, copy and adapt. Each links the article that explains how to fill it in, and <a href="/articles/">How to write a bug report</a> walks through the whole report.</p>
    <p class="a-sum">A template is the manual way: you fill in each box yourself. <a href="https://bugit.dev/">BugIt</a> does the filling in for you. From a rough note it writes the whole report in your team's house style, reads your glossary, and for a full report searches your tracker for duplicates. It checks that the steps, expected and actual results and build are there, and files it when you type FILE IT.</p>
  </header>
  <div class="a-grid">
    <nav class="a-toc" aria-label="On this page"><p class="a-toc-h">On this page</p><ol>
${PACK.map(([file, title]) => `<li><a href="#${file.replace(/\.[a-z]+$/, "").replace(/_/g, "-")}">${esc(title)}</a></li>`).join("\n")}
</ol></nav>
    <article class="a-body">
${tplSections}
<section id="where-bugit-fits" class="sec fits">
<h2>Where BugIt fits</h2>
<p>These templates show the shape of a good report. BugIt writes that report for you from a rough note, in your house style. For a full report it searches your tracker for duplicates first, it checks the draft, and it files nothing until you type FILE IT. See how it works at <a href="https://bugit.dev/">bugit.dev</a> or read about it at <a href="https://taskivator.com/bugit/">taskivator.com/bugit</a>.</p>
</section>
    </article>
  </div>
</main>
` +
    foot,
);
console.log(`make-articles: templates page written (${PACK.length} templates)`);

// /llms.txt (llmstxt.org): a plain summary for AI crawlers. Written here, from the same sources as
// the articles, so the article list in it cannot fall behind the site. build.js publishes it.
// The documentation pages, from the docs registry itself (titles and descriptions as the docs show them).
const DOCS_REG = loadDocs(path.join(V2, ".."));
const docsList = DOCS_REG.docs.map((d) => `- [${d.t}](https://bugit.dev${DOCS_REG.R.pathOf(d.r)})${d.desc ? ": " + d.desc : ""}`).join("\n");
const llms = `# BugIt

> BugIt is a QA agent made by Taskivator. It runs inside the AI assistant you already use (GitHub Copilot Chat in VS Code, the Claude extension, or a terminal), turns a rough note into a complete bug report, and files it to your tracker, such as Jira, GitHub or Azure DevOps, only after you type FILE IT.

Your tickets, specs and settings go only to the tools you connect and the AI assistant you choose.

## Product

- [BugIt home](https://bugit.dev/): what BugIt does, how it works and pricing
- [Documentation](https://bugit.dev/docs/): install, activate, customize and use BugIt
- [Get BugIt](https://portal.bugit.dev/pricing): plans and purchase

## Documentation

${docsList}

## Articles

- [How to write a bug report](https://bugit.dev/articles/): the parts of a good report in the order you write them, with a deeper article for each step
${all.map(({ fm }) => `- [${fm.title}](https://bugit.dev/articles/${fm.slug}/): ${fm.description}`).join("\n")}

## Free templates

- [Free bug report templates](https://bugit.dev/templates/): ${PACK.map(([, title]) => title).join(", ")}, to copy or download. A template is the manual way: you fill in each box yourself. BugIt does the filling in for you, from a rough note.

## Free tools

${Object.values(TOOLS).map((t) => `- [${t.title}](${t.url}): ${t.desc}`).join("\n")}

## Company

- [Taskivator](https://taskivator.com/): the company that makes BugIt
- [BugIt on YouTube](https://www.youtube.com/@BugItByTaskivator): short films on BugIt's features
`;
fs.writeFileSync(path.join(V2, "..", "llms.txt"), llms);
console.log("make-articles: llms.txt written");
