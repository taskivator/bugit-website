/* Languages for the v2 pages (2026-10-03). The same eleven as bugit.dev, the same cookie
   (bugitLang, shared with portal.bugit.dev, plus bugitLangSet='user' once a person chooses), so a
   choice made here follows the visitor to the portal and back.
   Text is tagged in the HTML: data-k="t012" swaps innerHTML, data-ka="aria-label:t013" swaps an
   attribute. English is read from the page itself, so en.json is only the source for translators.
   Other scripts read strings through window.V2T(key, english) and hear "v2:lang" on a change. */
(function () {
  "use strict";
  var LANGS = [["en", "English"], ["ja", "日本語"], ["fr", "Français"], ["de", "Deutsch"], ["es", "Español"],
    ["pt-br", "Português BR"], ["it", "Italiano"], ["ko", "한국어"], ["zh", "中文"], ["ru", "Русский"], ["ar", "العربية"]];
  var CODES = LANGS.map(function (l) { return l[0]; });
  var BASE = document.documentElement.getAttribute("data-i18n-base") || "/v2/i18n/";
  var dict = {}, en = {}, lang = "en";

  /* Reading can throw: document.cookie where cookies are refused, decodeURIComponent on a corrupted
     value. Either would stop this file before any text is applied, so a failed read is "nothing stored". */
  function cookie(name) { try { var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; } catch (e) { return null; } }
  function stored(name) { var v = cookie(name); if (!v) { try { v = localStorage.getItem(name); } catch (e) {} } return v; }
  function writeCookie(name, value) {
    try {
      var h = location.hostname, shared = h === "bugit.dev" || /\.bugit\.dev$/.test(h);
      if (shared) { document.cookie = name + "=;path=/;max-age=0;samesite=lax"; document.cookie = name + "=" + value + ";path=/;max-age=31536000;samesite=lax;domain=.bugit.dev"; }
      else document.cookie = name + "=" + value + ";path=/;max-age=31536000;samesite=lax";
    } catch (e) {}
  }
  function norm(l) {
    l = String(l || "").toLowerCase();
    if (CODES.indexOf(l) >= 0) return l;
    if (/^pt/.test(l)) return "pt-br";
    if (/^zh/.test(l)) return "zh";
    var base = l.split("-")[0]; return CODES.indexOf(base) >= 0 ? base : null;
  }
  /* THE SAME RULE AS THE PAGE THIS ONE REPLACES (app.js, 2026-09-07). A stored language is a choice
     only when bugitLangSet says 'user'. 'auto' is our own guess and is re-derived, so a new browser
     language changes the site. Absent is legacy: the old page stamped 'en' on every visitor for a
     year, so a legacy 'en' is not a choice, while any other legacy value can only have come from a
     click and is kept (and marked). Without this a Japanese visitor carrying that old stamp is
     served English forever. check-locale-fallback.mjs holds it. */
  /* ?lang= is a link's language, not the visitor's choice: it is shown and NOT stored, so it can
     never overwrite a language somebody picked (here or, through the shared cookie, the portal). */
  var fromQuery = false;
  function queryLang() { try { return new URLSearchParams(location.search).get("lang"); } catch (e) { return null; } }
  function initial() {
    var q = norm(queryLang());
    if (q) { fromQuery = true; return q; }
    var chosen = stored("bugitLang"), how = stored("bugitLangSet");
    if (chosen && !how && norm(chosen) && norm(chosen) !== "en") { mark("user"); how = "user"; }
    if (how === "user" && norm(chosen)) return norm(chosen);
    var tags = [];
    try { tags = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language]; } catch (e) {}
    for (var i = 0; i < tags.length; i++) { var c = norm(tags[i]); if (c) return c; }
    return "en";
  }
  /* A marker is only ever upgraded: 'auto' never overwrites a 'user' a click wrote. */
  function mark(kind) {
    if (kind !== "user" && stored("bugitLangSet") === "user") return;
    writeCookie("bugitLangSet", kind); try { localStorage.setItem("bugitLangSet", kind); } catch (e) {}
  }

  // English, read once from the page as written
  [].forEach.call(document.querySelectorAll("[data-k]"), function (el) { en[el.dataset.k] = el.innerHTML; });
  [].forEach.call(document.querySelectorAll("[data-ka]"), function (el) {
    el.dataset.ka.split(",").forEach(function (pair) { var a = pair.split(":"); en[a[1]] = el.getAttribute(a[0]); });
  });
  en["meta.title"] = document.title;
  var md = document.querySelector('meta[name="description"]'); if (md) en["meta.description"] = md.content;

  window.V2T = function (k, fallback) { return (dict[k] != null && dict[k] !== "") ? dict[k] : (en[k] != null ? en[k] : fallback); };
  window.V2Lang = function () { return lang; };

  function apply(l, d) {
    dict = d || {}; lang = l;
    var T = window.V2T;
    [].forEach.call(document.querySelectorAll("[data-k]"), function (el) { var v = T(el.dataset.k); if (v != null && el.innerHTML !== v) el.innerHTML = v; });
    [].forEach.call(document.querySelectorAll("[data-ka]"), function (el) {
      el.dataset.ka.split(",").forEach(function (pair) { var a = pair.split(":"), v = T(a[1]); if (v != null) el.setAttribute(a[0], v); });
    });
    if (en["meta.title"]) document.title = T("meta.title");
    if (md) md.content = T("meta.description");
    document.documentElement.lang = l === "pt-br" ? "pt-BR" : l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    paintPicker();
    document.dispatchEvent(new CustomEvent("v2:lang", { detail: { lang: l } }));
  }
  var cache = {};
  function load(l) {
    if (l === "en") return Promise.resolve({});
    return cache[l] || (cache[l] = fetch(BASE + l + ".json").then(function (r) { if (!r.ok) throw 0; return r.json(); }));
  }
  var seq = 0;
  function set(l, chosen, transient) {
    l = norm(l) || "en";
    var my = ++seq;
    // Only a CLICK is stored. A guess from the browser language is shown and not written: storing
    // it put two values in the visitor's cookies and storage before any consent decision, which
    // the consent contract (2.4) does not allow, and the portal never needed it, because it reads
    // Accept-Language itself and treats bugitLang as a click (portal lib/i18n/server.ts).
    // External audit 2026-10-05, F-04.
    if (chosen && !transient) { writeCookie("bugitLang", l); try { localStorage.setItem("bugitLang", l); } catch (e) {} mark("user"); }
    // Only the latest request may paint: choosing Japanese and then English while Japanese is
    // still loading must end in English.
    return load(l).then(function (d) { if (my === seq) apply(l, d); }).catch(function () { if (my === seq) apply("en", {}); });
  }
  window.V2SetLang = set;

  /* ── the picker ──────────────────────────────────────────────────────────────────────────── */
  var picker, btn, list;
  function build() {
    var end = document.querySelector(".nav-end"); if (!end) return;
    picker = document.createElement("div"); picker.className = "lang-pick";
    picker.innerHTML = '<button type="button" class="lang-btn" aria-haspopup="listbox" aria-expanded="false">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>'
      + '<span class="lang-now"></span><svg class="lang-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>'
      + '<ul class="lang-list" role="listbox" hidden>' + LANGS.map(function (x) {
        return '<li><button type="button" role="option" data-lang="' + x[0] + '"><span lang="' + x[0] + '"' + (x[0] === "ar" ? ' dir="rtl"' : "") + ">" + x[1] + '</span><small>' + x[0].toUpperCase() + "</small></button></li>";
      }).join("") + "</ul>";
    end.insertBefore(picker, end.firstChild);
    btn = picker.querySelector(".lang-btn"); list = picker.querySelector(".lang-list");
    btn.addEventListener("click", function () { toggle(list.hidden); });
    list.addEventListener("click", function (e) { var o = e.target.closest("[data-lang]"); if (!o) return; toggle(false); set(o.dataset.lang, true); btn.focus(); });
    document.addEventListener("click", function (e) { if (!picker.contains(e.target)) toggle(false); });
    picker.addEventListener("keydown", function (e) {
      var opts = [].slice.call(list.querySelectorAll("button")), i = opts.indexOf(document.activeElement);
      if (e.key === "Escape") { toggle(false); btn.focus(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (list.hidden) toggle(true);
        opts[(i + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length].focus();
      }
    });
  }
  function toggle(open) {
    if (!list) return; list.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    if (open) { var cur = list.querySelector('[aria-selected="true"]'); if (cur) cur.focus(); }
  }
  function paintPicker() {
    if (!btn) return;
    btn.querySelector(".lang-now").textContent = LANGS[CODES.indexOf(lang)][1];
    // The whole spoken name comes from the dictionary: a native language name behind an English
    // "Language:" left screen reader users with a half translated control.
    btn.setAttribute("aria-label", window.V2T("lang.ariaLabel", "Language: {language}").replace("{language}", LANGS[CODES.indexOf(lang)][1]));
    [].forEach.call(list.querySelectorAll("[data-lang]"), function (o) { o.setAttribute("aria-selected", String(o.dataset.lang === lang)); });
  }

  build();
  var first = initial();
  set(first, false, fromQuery);
})();
