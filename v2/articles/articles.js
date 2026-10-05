/* The guides at /articles/ (2026-10-05): a reading progress hairline, a contents list that follows
   the reader, and a Copy button on every code block. Nothing here is needed to read a guide, and
   nothing leaves the page: no network calls, no storage. */
(function () {
  "use strict";

  var bar = document.getElementById("readProgress");
  var article = document.querySelector(".a-body");
  var links = [].slice.call(document.querySelectorAll(".a-toc a"));

  function progress() {
    if (!bar || !article) return;
    var r = article.getBoundingClientRect();
    var total = r.height - window.innerHeight * 0.6;
    var done = Math.min(Math.max(-r.top + window.innerHeight * 0.2, 0), total);
    bar.style.transform = "scaleX(" + (total > 0 ? done / total : 0) + ")";
  }

  if (bar && article) {
    window.addEventListener("scroll", progress, { passive: true });
    window.addEventListener("resize", progress);
    progress();
  }

  if (links.length && "IntersectionObserver" in window) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
      var first = Object.keys(byId).filter(function (id) { return seen[id]; })[0];
      if (first) links.forEach(function (a) { a.classList.toggle("is-on", a === byId[first]); });
    }, { rootMargin: "-90px 0px -55% 0px" });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }

  [].slice.call(document.querySelectorAll(".code .copy")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var code = btn.parentNode.querySelector("code");
      if (!code) return;
      var text = code.textContent;
      var done = function (ok) {
        btn.textContent = ok ? "Copied" : "Press Ctrl C";
        setTimeout(function () { btn.textContent = "Copy"; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        var range = document.createRange();
        range.selectNodeContents(code);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        done(false);
      }
    });
  });
})();
