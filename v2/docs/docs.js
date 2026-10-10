/* BugIt docs, 2026-10-03 prototype in the new look.
   Same sources as the live site (public/docs/*), same hash routes (#/docs, #/docs/license, ...),
   so moving it onto bugit.dev later changes no URL anyone has bookmarked or linked.
   The renderers below follow app.js formatLicense / formatMarkdownDoc rule for rule: escape
   everything, then restore only links with a safe scheme, **bold**, `code` and the one allowed
   tag (<bdi dir="ltr">, which the Arabic sources need). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var C = null; // content.<lang>.json
  var T = function (key, en) { return window.V2T ? window.V2T(key, en) : en; };
  var LANG = function () { return window.V2Lang ? window.V2Lang() : "en"; };
  var PDF_LANGS = ["en", "ja", "es", "fr", "de", "pt-br", "it", "ko", "zh", "ru", "ar"];
  // Each document in the reader's language, the English original as the fallback (as on bugit.dev).
  var src = function (stem, ext) { var l = LANG(); return l === "en" ? ["/public/docs/" + stem + ext] : ["/public/docs/" + stem + "." + l + ext, "/public/docs/" + stem + ext]; };
  var pdf = function (f) { return "/public/docs/guides/" + (PDF_LANGS.indexOf(LANG()) >= 0 ? LANG() : "en") + "/" + f; };

  var ICON = {
    guide: '<path d="M5 4.5h9.5L19 9v10.5H5z"/><path d="M14 4.5V9h5"/><path d="M8.5 13h7M8.5 16.5h5"/>',
    overview: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8v4l2.5 2.5"/>',
    faq: '<path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4 3.5v-3.5h-.5a2 2 0 0 1-2-2z"/><path d="M10 9.2a2 2 0 1 1 2.7 1.9c-.5.2-.7.6-.7 1.1v.3M12 14.6h.01"/>',
    license: '<path d="M7 3.5h10v17H7z"/><path d="M10 8h4M10 11.5h4M10 15h2"/>',
    privacy: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    security: '<path d="M12 3.2 4.6 6v5.4c0 4.5 3.1 8.1 7.4 9.4 4.3-1.3 7.4-4.9 7.4-9.4V6z"/><path d="M9.4 12.1l1.9 1.9 3.6-3.8"/>',
    refund: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v3.7h3.7"/><path d="M12 8.5v7M10 10h3a1.3 1.3 0 0 1 0 2.5h-2a1.3 1.3 0 0 0 0 2.5h3"/>',
    commerce: '<path d="M4 9.5 5.5 4.5h13L20 9.5"/><path d="M5 9.5h14v10H5z"/><path d="M10 19.5v-5h4v5"/>',
    support: '<rect x="2.9" y="4.4" width="18.2" height="12.4" rx="2.6"/><path d="M8.6 16.8v3.5l4.1-3.5"/><path d="M7.5 9.3h9M7.5 12.3h5.6"/>'
  };
  var icon = function (k) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + "</svg>";
  };

  /* One table drives the sidebar, the home page, prev/next, search and the router. */
  var DOCS = [];
  function buildDocs() {
    var d = C.docPages, l = C.docs, dl = C.dl || {};
    DOCS = [
      { r: "docs/user-guide", g: T("d.gGuides", "Guides"), i: "guide", t: dl.userGuide || "User Guide", desc: dl.ugDesc || "The complete step by step setup and usage guide.", src: src("GETTING_STARTED", ".web.md"), kind: "md", pdf: pdf("user-guide.pdf"), pdfName: "BugIt-User-Guide.pdf" },
      { r: "docs/overview", g: T("d.gGuides", "Guides"), i: "overview", t: dl.overview || "QA Agent Overview", desc: dl.ovDesc || "A concise overview of the BugIt QA Agent.", src: src("OVERVIEW", ".web.md"), kind: "md", pdf: pdf("overview.pdf"), pdfName: "BugIt-QA-Agent-Overview.pdf" },
      { r: "docs/faq", g: T("d.gGuides", "Guides"), i: "faq", t: d.faqTitle, desc: l.faqDesc, kind: "faq" },
      { r: "docs/license", g: T("d.gPolicies", "Policies"), i: "license", t: d.licenseTitle, desc: l.licenseDesc, src: src("LICENSE", ".txt"), kind: "license" },
      { r: "docs/privacy", g: T("d.gPolicies", "Policies"), i: "privacy", t: d.privacyTitle, desc: l.privacyDesc, src: src("PRIVACY", ".md"), kind: "md" },
      { r: "docs/security", g: T("d.gPolicies", "Policies"), i: "security", t: d.securityTitle, desc: l.securityDesc, src: src("SECURITY", ".md"), kind: "md" },
      { r: "docs/refund", g: T("d.gPolicies", "Policies"), i: "refund", t: d.refundTitle, desc: l.refundDesc, lede: d.refundIntro, src: src("REFUND", ".md"), kind: "md" },
      { r: "docs/commerce", g: T("d.gPolicies", "Policies"), i: "commerce", t: d.commerceTitle, desc: l.commerceDesc, lede: d.commerceIntro, src: src("TOKUSHOHO", ".md"), kind: "md" },
      { r: "support", g: T("d.gHelp", "Help"), i: "support", t: d.supportTitle, desc: l.supportDesc, lede: d.supportIntro, kind: "support" }
    ];
  }
  var ALIAS = { "docs/getting-started": "docs/user-guide" };
  var find = function (r) { r = ALIAS[r] || r; for (var i = 0; i < DOCS.length; i++) if (DOCS[i].r === r) return DOCS[i]; return null; };

  /* REAL ADDRESSES since 2026-10-10 (SEO audit, owner OK). Every page is /docs/<slug>/, written out
     by build.js with its English content already in it, so a crawler gets one URL, one title and one
     H1 per page instead of a single /docs/ that turned into everything. The page is still read from
     the address here, so a language switch re-renders it exactly as before.
     The old #/docs/... addresses are printed where nothing can edit them any more (frozen agent
     releases, downloaded PDFs, posts, emails), and a fragment never reaches the server, so
     _redirects cannot see them: forwardLegacy() replaces them with the real address. */
  var pathOf = function (r) { r = ALIAS[r] || r; return r === "docs" ? "/docs/" : "/docs/" + r.replace(/^docs\//, "") + "/"; };
  var LEGACY = /^#\/((?:docs|support)(?:\/[a-z-]+)?)\/?$/;
  function forwardLegacy() { var m = LEGACY.exec(location.hash); if (!m) return false; location.replace(pathOf(m[1])); return true; }

  /* ── renderers ─────────────────────────────────────────────────────────────────────────── */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function bdi(s) { return s.replace(/&lt;bdi dir=(?:&quot;|')ltr(?:&quot;|')&gt;([\s\S]*?)&lt;\/bdi&gt;/g, '<bdi dir="ltr">$1</bdi>'); }
  function inline(s) {
    return bdi(esc(s)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_m, label, href) {
        // a docs link inside a document (#/docs/x, /#/docs/x, /docs/#/docs/x) goes to the real page
        var lm = /^(?:\/|\/docs\/)?#\/((?:docs|support)(?:\/[a-z-]+)?)$/.exec(href);
        var h = lm ? pathOf(lm[1]) : href;
        return /^(?:https?:\/\/|mailto:|\/|#)[^\s"'<>]+$/.test(h) ? '<a href="' + h + '">' + label + "</a>" : label;
      })
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>"));
  }
  function markdown(txt) {
    var src = txt.replace(/\r\n/g, "\n")
      .replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2")
      .replace(/(^|\n)(#{1,6}\s[^\n]*)\n(?!\n)/g, "$1$2\n\n");
    var out = "";
    src.split(/\n\s*\n/).map(function (b) { return b.replace(/\n[ \t]+/g, " ").trim(); }).filter(Boolean).forEach(function (b) {
      if (/^#\s+/.test(b)) return; // the page H1 already says it
      if (/^###\s+/.test(b)) { out += "<h3>" + inline(b.replace(/^###\s+/, "")) + "</h3>"; return; }
      if (/^##\s+/.test(b)) { out += "<h2>" + inline(b.replace(/^##\s+/, "")) + "</h2>"; return; }
      var lines = b.split("\n");
      if (lines.every(function (x) { return /^>\s?/.test(x); })) { out += '<aside class="callout">' + inline(lines.map(function (x) { return x.replace(/^>\s?/, ""); }).join(" ")) + "</aside>"; return; }
      if (lines.every(function (x) { return /^\d+\.\s+/.test(x); })) { out += "<ol>" + lines.map(function (x) { return "<li>" + inline(x.replace(/^\d+\.\s+/, "")) + "</li>"; }).join("") + "</ol>"; return; }
      if (lines.every(function (x) { return /^[-*]\s+/.test(x); })) { out += "<ul>" + lines.map(function (x) { return "<li>" + inline(x.replace(/^[-*]\s+/, "")) + "</li>"; }).join("") + "</ul>"; return; }
      if (/^\*\*Last updated[^*]*\*\*$/i.test(b)) { out += '<p class="updated">' + inline(b) + "</p>"; return; }
      out += "<p>" + inline(b.replace(/\n/g, " ")) + "</p>";
    });
    return out;
  }
  function license(txt) {
    var blocks = txt.replace(/\r\n/g, "\n").split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean);
    return blocks.map(function (b, i) {
      if (i === 0) { var l = b.split("\n"); return '<p class="updated">' + inline(l.slice(1).join(" ") || "") + "</p>"; }
      var m = b.match(/^(\d+)\.\s+([^\n.]{2,80}?)(?:\.|\n)([\s\S]*)$/);
      if (m && m[3].trim() && m[2].split(/\s+/).length <= 6) return "<h2>" + m[1] + ". " + inline(m[2]) + "</h2><p>" + inline(m[3].trim()).replace(/\n/g, " ") + "</p>";
      var n = b.match(/^(\d+)\.\s/);
      if (n) return '<p class="clause"><b>' + n[1] + ".</b> " + inline(b.replace(/^\d+\.\s/, "")).replace(/\n/g, " ") + "</p>";
      return "<p>" + inline(b).replace(/\n/g, " ") + "</p>";
    }).join("");
  }
  function faq() {
    return '<div class="acc">' + C.faq.map(function (qa, i) {
      return '<details class="acc-item"' + (i === 0 ? " open" : "") + '><summary><h2>' + esc(qa[0]) + '</h2><i aria-hidden="true"></i></summary><div class="acc-body"><p>' + qa[1] + "</p></div></details>";
    }).join("") + "</div>";
  }
  function support() {
    var d = C.docPages;
    return '<div class="support">'
      + '<div class="sup-card sup-main"><span class="ic">' + icon("support") + "</span><h2>" + esc((C.ui && C.ui.openTicket) || "Open a support ticket") + "</h2>"
      + "<p>" + T("d.supSignIn", "Sign in to your BugIt dashboard and open a ticket. Replies come by email.") + "</p>"
      + '<a class="btn btn-primary" href="https://portal.bugit.dev/dashboard/support">' + esc((C.ui && C.ui.openTicket) || "Open a support ticket") + ' <span aria-hidden="true">→</span></a>'
      + '<p class="sup-fine">' + esc(d.englishOnly) + "</p></div>"
      + '<div class="sup-card"><span class="ic">' + icon("security") + "</span><h2>" + esc(d.before) + "</h2><p>" + esc(d.beforeText) + "</p></div>"
      + '<div class="sup-card"><span class="ic">' + icon("faq") + "</span><h2>" + T("d.supCheck", "Check the answers first") + "</h2><p>" + T("d.supCheckText", "Most setup questions are answered in the FAQ and the User Guide.") + "</p>"
      + '<div class="sup-links"><a href="' + pathOf("docs/faq") + '">' + esc(C.docPages.faqTitle) + ' <span aria-hidden="true">→</span></a><a href="' + pathOf("docs/user-guide") + '">' + esc((C.dl && C.dl.userGuide) || "User Guide") + ' <span aria-hidden="true">→</span></a></div></div>'
      + "</div>";
  }

  /* ── fetch with a cache, so search and navigation share one download per file ──────────── */
  var cache = {};
  function get1(url) { return cache[url] || (cache[url] = fetch(url).then(function (x) { if (!x.ok) throw 0; return x.text(); })); }
  function get(urls) { return urls.reduce(function (p, u) { return p.catch(function () { return get1(u); }); }, Promise.reject()); }
  function bodyFor(doc) {
    if (doc.kind === "faq") return Promise.resolve(faq());
    if (doc.kind === "support") return Promise.resolve(support());
    return get(doc.src).then(doc.kind === "license" ? license : markdown);
  }

  /* ── page chrome ───────────────────────────────────────────────────────────────────────── */
  function sidebar(active) {
    var groups = {}, order = [];
    DOCS.forEach(function (d) { if (!groups[d.g]) { groups[d.g] = []; order.push(d.g); } groups[d.g].push(d); });
    return '<a class="side-home' + (active === "docs" ? " on" : "") + '" href="/docs/">' + T("d.overview", "Overview") + '</a>'
      + order.map(function (g) {
        return '<p class="side-group">' + g + "</p>" + groups[g].map(function (d) {
          var on = d.r === active;
          return '<a class="side-link' + (on ? " on" : "") + '"' + (on ? ' aria-current="page"' : "") + ' href="' + pathOf(d.r) + '">' + icon(d.i) + "<span>" + esc(d.t) + "</span></a>";
        }).join("");
      }).join("");
  }
  function homePage() {
    var d = C.docPages;
    var guides = DOCS.filter(function (x) { return x.pdf; });
    var rest = DOCS.filter(function (x) { return !x.pdf; });
    return '<section class="dhero"><p class="kicker"><span class="dot"></span>' + esc(d.homeTitle) + '</p>'
      + '<h1>' + T("d.heroTitle", "Everything you need to <span class=\"grad\">run BugIt.</span>") + '</h1>'
      + '<p class="lede">' + T("d.heroLede", "Everything you need to install, activate, customize and use BugIt safely.") + "</p>"
      + '<button class="search-trigger" type="button" data-open-search><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><span>' + T("d.search", "Search the docs") + '</span><kbd>Ctrl K</kbd></button></section>'
      + '<section class="guides">' + guides.map(function (g, n) {
        return '<article class="guide g' + n + '"><span class="ic">' + icon(g.i) + "</span>"
          + '<p class="eyebrow">' + T("d.guideN", "Guide {n} · PDF + web").replace("{n}", String(n + 1).padStart(2, "0")) + "</p><h2>" + esc(g.t) + "</h2><p>" + esc(g.desc) + "</p>"
          + '<div class="guide-cta"><a class="btn btn-primary btn-sm" href="' + pathOf(g.r) + '">' + T("d.readOnline", "Read online") + ' <span aria-hidden="true">→</span></a>'
          + '<a class="btn btn-ghost btn-sm" href="' + g.pdf + '" download="' + g.pdfName + '">' + T("d.downloadPdf", "Download PDF") + '</a></div></article>';
      }).join("") + "</section>"
      + '<section class="shelf">' + rest.map(function (x) {
        return '<a class="shelf-card" href="' + pathOf(x.r) + '"><span class="ic">' + icon(x.i) + '</span><span class="shelf-t">' + esc(x.t) + '</span><span class="shelf-d">' + esc(x.desc || "") + '</span><span class="go" aria-hidden="true">→</span></a>';
      }).join("") + "</section>"
      + '<p class="note">' + esc(d.englishOnly) + "</p>";
  }
  // bodyHtml is given only at build time, when the page is written out with its content in it.
  function docPage(doc, bodyHtml) {
    var i = DOCS.indexOf(doc), prev = DOCS[i - 1], next = DOCS[i + 1];
    var pn = '<nav class="pn" aria-label="' + T("d.prevNext", "Previous and next") + '">'
      + (prev ? '<a class="pn-prev" href="' + pathOf(prev.r) + '"><small>' + T("d.prev", "Previous") + '</small><b>' + esc(prev.t) + "</b></a>" : "<span></span>")
      + (next ? '<a class="pn-next" href="' + pathOf(next.r) + '"><small>' + T("d.next", "Next") + '</small><b>' + esc(next.t) + "</b></a>" : "<span></span>")
      + "</nav>";
    var tools = doc.pdf ? '<div class="doc-tools"><a class="btn btn-ghost btn-sm" href="' + doc.pdf + '" target="_blank" rel="noopener">' + T("d.openPdf", "Open PDF") + '</a><a class="btn btn-ghost btn-sm" href="' + doc.pdf + '" download="' + doc.pdfName + '">' + T("d.downloadPdf", "Download PDF") + '</a></div>' : "";
    return '<article class="doc"><header class="doc-head"><nav class="crumb" aria-label="' + esc((C.ui && C.ui.breadcrumb) || "Breadcrumb") + '"><a href="/docs/">' + T("d.docs", "Docs") + '</a><span aria-hidden="true">/</span><span>' + esc(doc.g) + "</span></nav>"
      + '<div class="doc-title"><span class="ic">' + icon(doc.i) + "</span><h1>" + esc(doc.t) + "</h1></div>"
      + (doc.lede ? '<p class="doc-lede">' + esc(doc.lede) + "</p>" : "")
      + '<p class="doc-meta" id="docMeta"></p>' + tools + "</header>"
      + (bodyHtml == null ? '<div class="prose" id="docBody" aria-busy="true">' + skeleton() + "</div>" : '<div class="prose" id="docBody">' + bodyHtml + "</div>") + pn + "</article>";
  }
  function skeleton() {
    return '<div class="skel">' + [60, 96, 88, 92, 70, 0, 45, 94, 90, 82, 66].map(function (w) { return w ? '<span style="width:' + w + '%"></span>' : "<br>"; }).join("") + "</div>";
  }

  /* ── contents list + scroll spy ────────────────────────────────────────────────────────── */
  var spy = null;
  function slug(s, used) {
    var b = s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section";
    var k = b, n = 2; while (used[k]) k = b + "-" + n++; used[k] = 1; return k;
  }
  function buildToc(body) {
    if (spy) { spy.disconnect(); spy = null; }
    var toc = $("#toc"), hs = [].slice.call(body.querySelectorAll("h2")), used = {};
    if (hs.length < 2 || body.querySelector(".support")) { toc.innerHTML = ""; toc.hidden = true; return; }
    hs.forEach(function (h) { h.id = slug(h.textContent, used); });
    toc.hidden = false;
    toc.innerHTML = '<p class="toc-t">' + esc((C.ui && C.ui.onThisPage) || "On this page") + '</p><ol>' + hs.map(function (h) {
      return '<li><a href="#' + h.id + '" data-to="' + h.id + '">' + esc(h.textContent) + "</a></li>";
    }).join("") + '</ol><button type="button" class="toc-top" data-top>' + esc((C.ui && C.ui.toTop) || "Back to top") + ' <span aria-hidden="true">↑</span></button>';
    var links = {}; [].forEach.call(toc.querySelectorAll("a"), function (a) { links[a.dataset.to] = a; });
    /* THE LAST SECTIONS MUST BE REACHABLE. bugit.dev had this bug: a section is "current" once its
       heading passes the line under the bar, but the closing sections of a page are too short to
       ever scroll that far, so at the very bottom the list kept pointing at an earlier one. So:
       at the bottom of the page the last heading wins; otherwise the last heading above the line;
       and a heading picked in the list is shown as picked while the page scrolls to it. */
    var picked = null, raf = 0;
    function paint() {
      raf = 0;
      var h = document.documentElement, cur = hs[0].id;
      if (h.scrollTop + h.clientHeight >= h.scrollHeight - 4) cur = hs[hs.length - 1].id;
      else for (var j = hs.length - 1; j >= 0; j--) if (hs[j].getBoundingClientRect().top < 140) { cur = hs[j].id; break; }
      if (picked) { var t = document.getElementById(picked); if (t && Math.abs(t.getBoundingClientRect().top - 110) > 4 && h.scrollTop + h.clientHeight < h.scrollHeight - 4) cur = picked; else picked = null; }
      Object.keys(links).forEach(function (k) { links[k].classList.toggle("on", k === cur); });
    }
    var onScroll = function () { if (!raf) raf = requestAnimationFrame(paint); };
    var onPick = function (e) { var a = e.target.closest("a[data-to]"); if (a) { picked = a.dataset.to; paint(); setTimeout(function () { picked = null; onScroll(); }, 900); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    toc.addEventListener("click", onPick);
    spy = { disconnect: function () { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); toc.removeEventListener("click", onPick); } };
    paint();
  }

  /* ── router ────────────────────────────────────────────────────────────────────────────── */
  var token = 0;
  function route() { var m = /^\/docs\/([a-z-]+)\/?$/.exec(location.pathname); return m ? (m[1] === "support" ? "support" : "docs/" + m[1]) : "docs"; }
  // A fragment that is not a route ("#install") is a section of this page: a search result or a
  // shared link to a heading. Its id exists only once the contents list has named the headings.
  function toSection() { var h = location.hash; if (h.length < 2 || h.charAt(1) === "/") return; var t = document.getElementById(decodeURIComponent(h.slice(1))); if (t) t.scrollIntoView(); }
  function minRead(body) {
    var words = body.textContent.trim().split(/\s+/).length;
    $("#docMeta").textContent = T("d.minRead", "{n} min read").replace("{n}", Math.max(1, Math.round((/^(ja|zh|ko)$/.test(LANG()) ? body.textContent.length / 2.2 : words) / 230)));
  }
  function render() {
    var r = route();
    var main = $("#docsMain"), my = ++token;
    /* The build wrote this page out in English with its content in place. In English the first
       render keeps it (no skeleton flash, nothing fetched) and only adds what needs a browser: the
       reading time, the contents list and its scroll spy. Any other language, and every later
       render, builds the page as before. */
    var pre = main.getAttribute("data-prerendered");
    if (pre !== null) main.removeAttribute("data-prerendered");
    if (pre !== null && pre === r && LANG() === "en") {
      var kept = r === "docs" ? null : find(r);
      if (kept && $("#docBody")) { var pb = $("#docBody"); minRead(pb); buildToc(pb); toSection(); }
      return;
    }
    var doc = r === "docs" ? null : find(r);
    $("#side").innerHTML = sidebar(doc ? doc.r : "docs");
    $("#sideCurrent").textContent = doc ? doc.t : T("d.overview", "Overview");
    document.body.classList.toggle("is-home", !doc);
    closeSide();
    if (r !== "docs" && !doc) {
      main.innerHTML = '<section class="nf"><p class="kicker">404</p><h1>' + T("d.nfTitle", "Page not found") + '</h1><p class="lede">' + T("d.nfBody", "That page doesn’t exist. The link may be mistyped, or the page may have moved.") + '</p><p><a class="btn btn-primary" href="/docs/">' + T("d.nfBack", "Back to the docs") + '</a></p></section>';
      $("#toc").hidden = true; document.title = T("d.nfTitle", "Page not found") + " · BugIt"; return;
    }
    if (!doc) {
      main.innerHTML = homePage(); $("#toc").hidden = true; $("#toc").innerHTML = "";
      document.title = C.docPages.homeTitle + " · BugIt"; window.scrollTo(0, 0); return;
    }
    main.innerHTML = docPage(doc);
    document.title = doc.t + " · BugIt";
    window.scrollTo(0, 0);
    var body = $("#docBody");
    bodyFor(doc).then(function (html) {
      if (my !== token) return;
      body.innerHTML = html; body.removeAttribute("aria-busy");
      minRead(body);
      buildToc(body);
      toSection();
    }).catch(function () {
      if (my !== token) return;
      body.removeAttribute("aria-busy");
      body.innerHTML = '<p class="err">' + T("d.err", "This page is temporarily unavailable. Please refresh the page, or contact <a href=\"mailto:support@bugit.dev\">support@bugit.dev</a>.") + '</p>';
    });
  }

  /* ── mobile sidebar ────────────────────────────────────────────────────────────────────── */
  function closeSide() { var b = $("#sideToggle"); if (b) { b.setAttribute("aria-expanded", "false"); $("#side").classList.remove("open"); } }

  /* ── search (Ctrl K): every heading and paragraph of every page, fetched on first open ──── */
  var index = null;
  function buildIndex() {
    if (index) return index;
    index = Promise.all(DOCS.map(function (d) {
      return bodyFor(d).then(function (html) {
        var box = document.createElement("div"); box.innerHTML = html;
        var rows = [{ d: d, h: null, text: d.t + " " + (d.desc || "") }], cur = null, used = {};
        [].forEach.call(box.querySelectorAll("h2,p,li"), function (el) {
          if (el.tagName === "H2") { cur = { text: el.textContent, id: slug(el.textContent, used) }; rows.push({ d: d, h: cur, text: cur.text }); }
          else rows.push({ d: d, h: cur, text: el.textContent });
        });
        return rows;
      }).catch(function () { return [{ d: d, h: null, text: d.t }]; });
    })).then(function (all) { return [].concat.apply([], all); });
    return index;
  }
  function openSearch() {
    var dlg = $("#search"); if (dlg.open) return;
    dlg.showModal(); var q = $("#q"); q.value = ""; q.setAttribute("aria-expanded", "true"); q.focus(); results("");
    buildIndex().then(function () { if (dlg.open) results(q.value); });
  }
  /* Search is a combobox (audit 2026-10-05 F-08). Focus never leaves #q, so typing keeps refining,
     and the result the arrows have chosen is announced through aria-activedescendant. The class
     "sel" (what the eye sees), aria-selected (what a screen reader is told) and the input's
     aria-activedescendant are set in ONE place, here, so the three cannot disagree; before this the
     arrows moved the class only and the listbox held no options at all. Every render replaces the
     list, so every render ends by calling this: the old descendant id is removed first, and only
     an element in the list now can be named. i < 0 selects nothing. */
  function selectResult(i, scroll) {
    var q = $("#q"), all = [].slice.call(document.querySelectorAll("#results a[role=option]"));
    q.removeAttribute("aria-activedescendant");
    all.forEach(function (a, n) {
      var on = n === i;
      a.classList.toggle("sel", on); a.setAttribute("aria-selected", String(on));
      if (on) q.setAttribute("aria-activedescendant", a.id);
    });
    if (scroll && all[i]) all[i].scrollIntoView({ block: "nearest" });
  }
  // A row that is only a message (loading, no results) is a disabled option: a listbox may hold
  // nothing else, and the arrows and Enter skip it because they only look at the result links.
  function note(text) { return '<li class="r-empty" role="option" aria-disabled="true" aria-selected="false">' + text + "</li>"; }
  var asked = 0;
  function results(q) {
    var list = $("#results"), my = ++asked; q = q.trim().toLowerCase();
    if (!q) {
      list.innerHTML = DOCS.map(function (d, i) { return item(d, null, esc(d.desc || ""), i); }).join(""); selectResult(0); return;
    }
    if (!index) { list.innerHTML = note(T("d.loading", "Loading…")); selectResult(-1); return; }
    index.then(function (rows) {
      // A slower answer for an older query must not replace the list the newer one drew.
      if (my !== asked) return;
      var seen = {}, hits = [];
      rows.forEach(function (r) {
        var i = r.text.toLowerCase().indexOf(q); if (i < 0) return;
        var key = r.d.r + "|" + (r.h ? r.h.id : ""); if (seen[key]) return; seen[key] = 1;
        var a = Math.max(0, i - 40), snip = (a ? "…" : "") + r.text.slice(a, i + q.length + 70);
        var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
        hits.push({ d: r.d, h: r.h, s: esc(snip).replace(re, "<mark>$1</mark>"), score: (r.h ? 0 : 4) + (r.h && r.text === r.h.text ? 2 : 0) + (r.d.t.toLowerCase().indexOf(q) >= 0 ? 1 : 0) });
      });
      hits.sort(function (x, y) { return y.score - x.score; });
      list.innerHTML = hits.length ? hits.slice(0, 12).map(function (h, i) { return item(h.d, h.h, h.s, i); }).join("") : note(T("d.noResults", "No results for “{q}”").replace("{q}", esc(q)));
      selectResult(hits.length ? 0 : -1);
    });
  }
  // The id is the row's position in this render: unique by construction, and selectResult()
  // re-points the input after every render, so it never names a row that has gone.
  function item(d, h, snip, n) {
    return '<li role="presentation"><a id="docs-result-' + n + '" role="option" aria-selected="false" class="r" href="' + pathOf(d.r) + (h ? "#" + h.id : "") + '"' + (h ? ' data-section="' + h.id + '"' : "") + '><span class="ic">' + icon(d.i) + '</span><span class="r-t"><b>' + esc(d.t) + (h ? ' <em>› ' + esc(h.text) + "</em>" : "") + "</b><small>" + snip + "</small></span></a></li>";
  }

  /* ── wiring ────────────────────────────────────────────────────────────────────────────── */
  function wire() {
    window.addEventListener("hashchange", forwardLegacy);
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-open-search]"); if (t) { e.preventDefault(); openSearch(); return; }
      var to = e.target.closest("a[data-to]");
      if (to) { e.preventDefault(); var h = document.getElementById(to.dataset.to); if (h) h.scrollIntoView({ behavior: "smooth" }); return; }
      if (e.target.closest("[data-top]")) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      var r = e.target.closest("#results a");
      if (r) {
        $("#search").close();
        // A section of the page already open: scroll there. Another page: let the link load it,
        // and toSection() finds the heading once that page has drawn its contents list.
        if (r.dataset.section && r.pathname === location.pathname) { e.preventDefault(); var s = document.getElementById(r.dataset.section); if (s) s.scrollIntoView({ behavior: "smooth" }); }
      }
    });
    $("#sideToggle").addEventListener("click", function () {
      var open = this.getAttribute("aria-expanded") !== "true";
      this.setAttribute("aria-expanded", String(open)); $("#side").classList.toggle("open", open);
    });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    });
    $("#q").addEventListener("input", function () { results(this.value); });
    $("#q").addEventListener("keydown", function (e) {
      var all = [].slice.call(document.querySelectorAll("#results a[role=option]")), i = all.findIndex(function (a) { return a.classList.contains("sel"); });
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (!all.length) return;
        selectResult((i + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length, true);
      } else if (e.key === "Enter" && i >= 0) { e.preventDefault(); all[i].click(); }
    });
    $("#search").addEventListener("click", function (e) { if (e.target === this) this.close(); });
    // Every way the dialog closes (Esc, a click outside, choosing a result) ends here.
    $("#search").addEventListener("close", function () { var q = $("#q"); q.setAttribute("aria-expanded", "false"); q.removeAttribute("aria-activedescendant"); });
    // reading progress in the nav
    var bar = $("#progress");
    window.addEventListener("scroll", function () {
      var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 && !document.body.classList.contains("is-home") ? h.scrollTop / max : 0) + ")";
    }, { passive: true });
  }

  /* BUILD TIME. build.js runs this same file in a sandbox with no document, so the pages it writes
     out come from the renderers above and cannot drift from what the browser draws. */
  if (typeof document === "undefined") {
    globalThis.BugItDocs = {
      load: function (c) { C = c; buildDocs(); return DOCS; },
      pathOf: pathOf, markdown: markdown, license: license, faq: faq, support: support,
      sidebar: sidebar, homePage: homePage, docPage: docPage
    };
    return;
  }
  if (forwardLegacy()) return;

  var wired = false;
  function boot() {
    var l = LANG();
    return fetch("/v2/docs/content." + l + ".json").then(function (x) { if (!x.ok) throw 0; return x.json(); })
      .catch(function () { return fetch("/v2/docs/content.en.json").then(function (x) { return x.json(); }); })
      .then(function (c) { C = c; index = null; buildDocs(); if (!wired) { wired = true; wire(); } render(); });
  }
  document.addEventListener("v2:lang", function () { boot(); });
  boot().catch(function () {
    $("#docsMain").innerHTML = '<p class="err">' + T("d.loadFail", "The documentation could not load. Please refresh the page.") + '</p>';
  });
})();
