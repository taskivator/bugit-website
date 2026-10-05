/* The old single page addresses, forwarded (2026-10-04).
 *
 * Until the redesign, bugit.dev was one page that routed on the fragment: /#/docs/privacy,
 * /#/support, /#features. Those addresses are printed in places that cannot be edited any more:
 * the VS Code agent (including releases that are frozen), the PDF guides customers already
 * downloaded, the portal, emails, posts and ads. A fragment never reaches the server, so
 * _redirects cannot catch them; only the page can. This runs in <head>, before anything paints,
 * so an old link lands on the right place without showing the homepage first.
 *
 *   /#/docs, /#/docs/<page>, /#/support  ->  /docs/#/...   (the documentation moved to /docs/)
 *   /#features                           ->  /#how         (the section was renamed)
 *   /#faq                                ->  /docs/#/docs/faq
 *   anything else                        ->  left alone
 */
(function () {
  /* The same forwarding runs on load AND on every later hashchange (audit 2026-10-05 F-03). The
     Guide's source chips are still written in the old form ("#/docs/getting-started"), and a chip
     clicked on the homepage only changes the fragment: no navigation, so a check made once at load
     never saw it and the visitor stayed on the homepage with no document. Listening for hashchange
     forwards that click, and any other old style link added to the page later, the same way a fresh
     visit is forwarded. Only the homepage loads this file (v2/index.html); the docs page does not,
     so /docs/#/docs/... is never forwarded again and there is no loop. Returns true when the page
     is being replaced, so the reload block below is skipped. */
  function forward(e) {
    var h = location.hash;
    if (/^#\/(docs|support)(\/|$)/.test(h)) {
      location.replace("/docs/" + h);
      return true;
    }
    if (h === "#faq") {
      location.replace("/docs/#/docs/faq");
      return true;
    }
    var moved = { "#features": "#how", "#top": "#main" };
    if (moved[h] && history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search + moved[h]);
      /* On load the browser has not scrolled yet and finds #how itself. After load the browser has
         already tried the old id, found nothing and stayed put, and replaceState never scrolls, so
         the renamed section is scrolled to here. */
      var t = e && document.getElementById(moved[h].slice(1));
      if (t && t.scrollIntoView) t.scrollIntoView();
    }
    return false;
  }
  window.addEventListener("hashchange", forward);
  if (forward()) return;

  /* A RELOAD STARTS AT THE TOP (owner 2026-10-04: "when i pull the page up to refresh the page
     jumps down in the middle instead of top"). A menu tap leaves the section in the address
     (/#pricing), and a phone's pull to refresh reloads that address, so the browser jumped back to
     the section. On a reload only, the section is dropped and the page opens at the top. A link
     that arrives with #pricing on a FIRST visit still lands on pricing. */
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var reloaded = nav ? nav.type === "reload" : (performance.navigation && performance.navigation.type === 1);
    if (reloaded) {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      if (location.hash && history.replaceState) history.replaceState(null, "", location.pathname + location.search);
      window.addEventListener("load", function () { window.scrollTo(0, 0); });
    }
  } catch (e) {}
})();
