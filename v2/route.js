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
})();
