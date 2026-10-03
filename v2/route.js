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
  var h = location.hash;
  if (/^#\/(docs|support)(\/|$)/.test(h)) {
    location.replace("/docs/" + h);
    return;
  }
  var moved = { "#features": "#how", "#top": "#main" };
  if (h === "#faq") {
    location.replace("/docs/#/docs/faq");
    return;
  }
  if (moved[h] && history.replaceState) history.replaceState(null, "", location.pathname + location.search + moved[h]);

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
