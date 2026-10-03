/* BugIt homepage prototype: the hero demo and the tracker row. No dependencies.
   The demo plays ONCE. A rough note types itself with a log attached, BugIt asks what is missing
   and gets an answer, then nine pieces of work run one after another and the ticket fills in
   section by section as each finishes. Then it waits for the visitor to type FILE IT, and only
   those two words file it. Reduced motion skips straight to that wait. */
(function () {
  "use strict";
  // Strings come through window.V2T (v2/i18n.js) so the demo speaks the visitor's language.
  var T = function (k, en) { return window.V2T ? window.V2T(k, en) : en; };
  var NOTE = function () { return T("js.note", "checkout total wrong with SAVE20 after switching to annual. jane@acme.com saw it too, prod. log attached"); };
  var ANSWER = function () { return T("js.answer", "2.14.1, every time"); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var demo = $("demo"), typed = $("typed"), typed2 = $("typed2"), ask = $("ask"), answer = $("answer"),
      attach = $("attach"), gate = $("gate"), input = $("gateInput"), btn = $("gateBtn"), filed = $("filed");
  var work = Array.prototype.slice.call(document.querySelectorAll("#work li"));
  var parts = Array.prototype.slice.call(document.querySelectorAll("#ticket [data-at]"));
  var timers = [];
  var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };

  /* ── On a phone, one pane at a time (owner 2026-10-04: "the copilot chat demo on mobile view is
     way too long"). Below 980px the three panes stacked to 1934px at 390 wide, more than two
     screens. A tab bar now shows one: it follows the demo (your note, then the work, then the
     draft) until the visitor taps a tab, which keeps their choice until Replay. The labels are the
     panes' own translated titles, so no new copy. Above 980px the bar is hidden and all three show. */
  var grid = demo.querySelector(".demo-grid");
  var PANES = [["chat", ".pane-chat"], ["work", ".pane-work"], ["draft", ".pane-draft"]];
  var tabs = document.createElement("div");
  tabs.className = "demo-tabs"; tabs.setAttribute("role", "tablist");
  var picked = false;
  var tabBtns = PANES.map(function (p) {
    var pane = grid.querySelector(p[1]);
    if (!pane.id) pane.id = "demoPane-" + p[0];
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-controls", pane.id); b.dataset.pane = p[0];
    b.addEventListener("click", function () { picked = true; showPane(p[0]); });
    tabs.appendChild(b);
    return b;
  });
  function labelTabs() {
    tabBtns.forEach(function (b, i) { var l = grid.querySelector(PANES[i][1] + " .pane-label"); b.textContent = l ? l.textContent : PANES[i][0]; });
  }
  function showPane(name) {
    grid.dataset.show = name;
    tabBtns.forEach(function (b) { var on = b.dataset.pane === name; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  }
  function follow(name) { if (!picked) showPane(name); }
  tabs.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    var i = tabBtns.indexOf(document.activeElement); if (i < 0) return;
    var n = tabBtns[(i + (e.key === "ArrowRight" ? 1 : -1) + tabBtns.length) % tabBtns.length];
    n.focus(); n.click();
  });
  grid.parentNode.insertBefore(tabs, grid);
  labelTabs(); showPane("chat");
  document.addEventListener("v2:lang", labelTabs);

  // ── Tracker logos ───────────────────────────────────────────────────────────
  var NAMES = { jira: "Jira", azuredevops: "Azure DevOps", github: "GitHub Issues", gitlab: "GitLab Issues",
    linear: "Linear", youtrack: "YouTrack", bugzilla: "Bugzilla", shortcut: "Shortcut", clickup: "ClickUp",
    asana: "Asana", trello: "Trello" };
  var L = window.BUGIT_LOGOS || {};
  var row = $("logos");
  if (row) row.innerHTML = Object.keys(NAMES).map(function (k) {
    return "<li>" + (L[k] || "") + "<span>" + NAMES[k] + "</span></li>";
  }).join("");
  var fl = $("filedLogo"); if (fl && L.jira) fl.innerHTML = L.jira;

  // ── Hero demo ───────────────────────────────────────────────────────────────
  function setHint(t) { $("gateHint").textContent = t; }
  function reveal(step) { parts.forEach(function (p) { if (Number(p.dataset.at) <= step) p.classList.add("on"); }); }
  function ready() {
    follow("draft");
    demo.classList.add("done"); input.disabled = false; btn.disabled = false;
    setHint(T("js.hintReady", "Anything else is refused. That is the point."));
  }
  function reset() {
    timers.forEach(clearTimeout); timers = [];
    picked = false; showPane("chat");
    demo.classList.remove("done");
    typed.textContent = ""; typed2.textContent = "";
    ask.hidden = true; answer.hidden = true; attach.hidden = true;
    work.forEach(function (w) { w.classList.remove("on", "busy"); });
    parts.forEach(function (p) { p.classList.remove("on"); });
    filed.hidden = true; gate.hidden = false; gate.classList.remove("wrong");
    input.value = ""; input.disabled = true; btn.disabled = true;
    setHint(T("js.hintWait", "BugIt is still writing. You approve what you have read."));
  }
  function finish() {
    typed.textContent = NOTE(); typed2.textContent = ANSWER();
    ask.hidden = false; answer.hidden = false; attach.hidden = false;
    work.forEach(function (w) { w.classList.add("on"); });
    reveal(99); ready();
  }
  function type(el, text, done) {
    var i = 0;
    (function tick() {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) later(tick, 16 + Math.random() * 24); else done();
    })();
  }
  function play() {
    reset();
    if (reduce) { finish(); return; }
    type(typed, NOTE(), function () {
      later(function () { attach.hidden = false; }, 250);
      // Work starts at once; step 3 ("asked what was missing") is the question, answered in chat.
      later(function () {
        work[0].classList.add("busy");
        later(function () { work[0].classList.replace("busy", "on"); reveal(1); work[1].classList.add("busy"); }, 520);
        later(function () { work[1].classList.replace("busy", "on"); reveal(2); work[2].classList.add("busy"); ask.hidden = false; }, 1040);
        later(function () {
          answer.hidden = false;
          type(typed2, ANSWER(), function () {
            later(function () {
              work[2].classList.replace("busy", "on"); reveal(3); follow("work");
              // the remaining six run on their own
              var rest = work.slice(3), t = 0;
              rest.forEach(function (w, k) {
                later(function () { w.classList.add("busy"); }, t);
                t += k === 1 ? 900 : 520;
                later(function () {
                  w.classList.replace("busy", "on"); reveal(k + 4);
                  if (k === rest.length - 1) ready();
                }, t);
              });
            }, 300);
          });
        }, 1900);
      }, 500);
    });
  }

  gate.addEventListener("submit", function (e) {
    e.preventDefault();
    if (input.disabled) return;
    // The real gate accepts exactly those two words as the whole reply. So does this one.
    if (input.value.trim().toUpperCase() === "FILE IT") {
      gate.hidden = true; filed.hidden = false;
    } else {
      gate.classList.remove("wrong"); void gate.offsetWidth; gate.classList.add("wrong");
      setHint(T("js.hintWrong", "Only FILE IT files. “{x}” does not.").replace("{x}", input.value.trim() || T("js.nothing", "nothing")));
    }
  });
  $("replay").addEventListener("click", play);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); play(); }
    }, { threshold: 0.3 });
    io.observe(demo);
  } else play();

  // ── Bento: light each check once as it arrives ──────────────────────────────
  var cells = document.querySelectorAll(".cell");
  if (!reduce && "IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target); e.target.classList.add("lit");
        setTimeout(function () { e.target.classList.remove("lit"); }, 1400);
      });
    }, { threshold: 0.6 });
    cells.forEach(function (c) { co.observe(c); });
  }
})();

/* Ask BugIt: the hero bar opens the Guide (window.BugitGuide, from /public/guide/guide.js), and
   types one example question at a time. Reduced motion shows one question and stops. */
(function () {
  var bar = document.getElementById("askBar"), out = document.getElementById("askQ");
  if (!bar || !out) return;
  var want = false;
  // Pressing the bar asks the question it is showing, so the visitor sees a real answer at once.
  function open() {
    var g = window.BugitGuide, q = asks[(qi || 0) % asks.length];
    if (g && typeof g.ask === "function") { g.ask(q); return; }
    if (g && typeof g.open === "function") { g.open(); return; }
    var l = document.querySelector(".bgd-launch"); if (l) { l.click(); return; }
    want = true;
  }
  bar.addEventListener("click", open);
  document.addEventListener("bugit-guide:ready", function () { if (want) { want = false; open(); } });
  // Questions a tester asks that the page itself does not answer. Each is SHOWN short and, when
  // pressed, ASKS the Guide's own wording of it (js.aN), which v2/tools/check-ask-questions.mjs
  // proves reaches the right prepared answer in all eleven languages.
  var QS = [
    ["js.q1", "Can a web page trick BugIt?", "js.a1", "Could text inside a ticket or web page trick BugIt into doing something?"],
    ["js.q2", "Checks closed tickets for dupes?", "js.a2", "Does the duplicate check include closed tickets?"],
    ["js.q3", "Can I try it without real tickets?", "js.a3", "How do I try BugIt without creating real tickets?"],
    ["js.q4", "What if my report has a password?", "js.a4", "What if my bug report contains a password or API key?"],
    ["js.q5", "Can it link bugs to TestRail?", "js.a5", "Can BugIt link bugs to test cases in TestRail, Xray, Zephyr or Qase?"],
    ["js.q6", "Does BugIt work offline?", "js.a6", "Does BugIt work offline?"],
    ["js.q7", "Can it fill required custom fields?", "js.a7", "What if my project requires custom or required fields?"],
    ["js.q8", "Can it attach screen recordings?", "js.a8", "Can BugIt attach screen recordings?"],
    ["js.q9", "How does it know the build number?", "js.a9", "How does BugIt know the build or version for my report?"],
    ["js.q10", "What if the network drops mid-filing?", "js.a10", "What happens if my network drops while BugIt is filing?"],
    ["js.q11", "Can it match our ticket style?", "js.a11", "Can BugIt match my team's existing ticket style?"],
    ["js.q12", "Can it use Sentry crash data?", "js.a12", "Can BugIt use crash data from Sentry or other crash tools in a report?"],
    ["js.q13", "Can it write retest comments?", "js.a13", "Can BugIt write verification or retest comments?"],
    ["js.q14", "Does severity set tracker priority?", "js.a14", "Does the severity I choose reach a priority field in my tracker?"],
    ["js.q15", "Does it work with Jira Data Center?", "js.a15", "Does BugIt support Jira Server or Jira Data Center?"],
    ["js.q16", "Could it file the same bug twice?", "js.a16", "Can BugIt accidentally file the same ticket twice?"]
  ];
  var qs = QS.map(function (q) { return q[1]; }), asks = QS.map(function (q) { return q[3]; });
  document.addEventListener("v2:lang", function () { qs = QS.map(function (q) { return window.V2T(q[0], q[1]); }); asks = QS.map(function (q) { return window.V2T(q[2], q[3]); }); qi = 0; ci = qs[0].length; dir = -1; out.textContent = qs[0]; base = 0; fit(qs[0]); });
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  if (reduce) { out.textContent = qs[0]; fit(qs[0]); return; }
  // Each question stays on screen 7 seconds once typed (owner, 2026-10-03: "make it stay 5 seconds longer").
  // ONE LINE, THE WHOLE QUESTION. Before a question types, its full width is measured and the
  // type eased down just enough to fit, never below 13px; check-ask-questions keeps them short
  // enough that this is a nudge, not a squeeze.
  var base = 0;
  function fit(q) {
    var box = out.parentElement;
    if (!base) base = parseFloat(getComputedStyle(box).fontSize) || 15;
    out.style.fontSize = ""; var keep = out.textContent; out.textContent = q;
    var size = base;
    while (size > 13 && out.scrollWidth > box.clientWidth - 4) { size -= 0.5; out.style.fontSize = size + "px"; }
    out.textContent = keep;
  }
  window.addEventListener("resize", function () { base = 0; fit(qs[qi % qs.length]); });
  fit(qs[0]);
  var qi = 0, ci = qs[0].length, dir = -1;
  (function tick() {
    var q = qs[qi % qs.length];
    if (dir > 0) { ci++; if (ci >= q.length) { dir = -1; return setTimeout(tick, 7200); } }
    else { ci--; if (ci <= 0) { dir = 1; qi++; q = qs[qi % qs.length]; fit(q); return setTimeout(tick, 300); } }
    out.textContent = q.slice(0, ci);
    setTimeout(tick, dir > 0 ? 45 : 22);
  })();
})();

/* A language change replays the demo in the new language. */
document.addEventListener("v2:lang", function (e) { if (e.detail && e.detail.replay !== false) { var r = document.getElementById("replay"); if (r) r.click(); } });

/* The corner launcher is visible from the moment the page loads (owner, 2026-10-03). It steps aside
   only while it would physically sit on top of the hero Ask bar, which happens on a phone; on a wider
   screen the two never touch, so there it is simply always there. */
(function () {
  var bar = document.getElementById("askBar"), raf = 0;
  if (!bar) return;
  function check() {
    raf = 0;
    var l = document.querySelector(".bgd-launch"); if (!l) return;
    var a = bar.getBoundingClientRect(), b = l.getBoundingClientRect();
    var hit = !(b.right < a.left || b.left > a.right || b.bottom < a.top || b.top > a.bottom);
    document.documentElement.classList.toggle("ask-in-view", hit);
  }
  var soon = function () { if (!raf) raf = requestAnimationFrame(check); };
  addEventListener("scroll", soon, { passive: true }); addEventListener("resize", soon);
  document.addEventListener("bugit-guide:ready", soon); setTimeout(check, 600); setTimeout(check, 2000);
})();
