/* The phone menu for the v2 pages (2026-10-03).
   The owner asked that the phone view not repeat bugit.dev's mistakes. There, the phone menu is
   see-through (the page's text shows behind its links), it prints the BugIt name a second time
   under the one already in the bar, and the phone and the desktop offer different things. So:
   - the menu is BUILT FROM the desktop bar, by cloning it, so the two cannot drift: every link,
     Sign in, Get BugIt, plus the LinkedIn/YouTube links from the footer;
   - it is opaque;
   - it carries no second logo.
   Runs before v2/i18n.js, so the clones are translated with everything else. */
(function () {
  "use strict";
  var nav = document.querySelector(".nav"); if (!nav) return;
  var links = nav.querySelector(".nav-links"), end = nav.querySelector(".nav-end");
  var signin = nav.querySelector(".nav-signin"), get = end && end.querySelector(".btn-primary");
  var social = document.querySelector(".foot .social");

  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "nav-toggle"; btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "mnav");
  btn.setAttribute("aria-label", "Open menu"); btn.dataset.ka = "aria-label:menu.open";
  btn.innerHTML = "<span></span><span></span><span></span>";
  end.appendChild(btn);

  var menu = document.createElement("div");
  menu.className = "mnav"; menu.id = "mnav"; menu.hidden = true;
  var ul = document.createElement("nav"); ul.className = "mnav-links"; ul.setAttribute("aria-label", "Menu"); ul.dataset.ka = "aria-label:menu.label"; // translated by i18n.js, which runs after this
  if (links) [].forEach.call(links.querySelectorAll("a"), function (a) { ul.appendChild(a.cloneNode(true)); });
  if (signin) ul.appendChild(signin.cloneNode(true)).className = "mnav-signin";
  menu.appendChild(ul);
  if (get) { var g = get.cloneNode(true); g.className = "btn btn-primary btn-block"; menu.appendChild(g); }
  if (social) menu.appendChild(social.cloneNode(true)).classList.add("mnav-social");
  nav.appendChild(menu);

  function set(open) {
    menu.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", window.V2T ? window.V2T(open ? "menu.close" : "menu.open", open ? "Close menu" : "Open menu") : (open ? "Close menu" : "Open menu"));
    document.documentElement.classList.toggle("mnav-open", open);
  }
  btn.addEventListener("click", function () { set(menu.hidden); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { set(false); btn.focus(); } });
  // Back to a desktop width with the menu open: close it, or it would sit over the page.
  var mq = window.matchMedia("(min-width:981px)");
  (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(function (m) { if (m.matches) set(false); });
})();
