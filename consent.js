/* BugIt marketing site — advertising measurement + Consent Mode v2 bootstrap.
   Loaded synchronously from <head> BEFORE app.js so the denied-by-default consent
   state is registered before the Google tag loads. Dependency-free and served from
   'self', so the site CSP needs no 'unsafe-inline' for this logic.

   SHARED CONSENT CONTRACT (must match the portal exactly):
   Cookie `bugit_consent`, Domain .bugit.dev, Path /, SameSite=Lax, Secure,
   ~180 days (Domain omitted on localhost). Value = URL-encoded JSON:
     {"v":1,"ad_storage":bool,"analytics_storage":bool,
      "ad_user_data":bool,"ad_personalization":bool,"ts":<unix>}
   Absence of the cookie means every signal is DENIED. The four booleans map 1:1
   to Consent Mode v2 signals.

   The banner UI lives in app.js (it needs the i18n system); this file exposes a
   tiny window.BugitConsent API for it to read/write the decision. */
(function () {
  // Build-time configurable Google Ads ID and the ONLY place it is defined.
  // build.js may overwrite the default from the BUGIT_ADS_ID env var. Never
  // hardcode the id anywhere else.
  var ADS_ID = 'AW-18322852127'; /* build:BUGIT_ADS_ID */

  var CONSENT_COOKIE = 'bugit_consent';
  // THE SHARED CONTRACT'S VERSION, AND THIS SIDE WAS NOT READING IT. The portal's
  // parseConsentCookie rejects a cookie whose `v` is not this number; this file hardcoded `v: 1`
  // on the way OUT and ignored `v` entirely on the way IN, so the two surfaces disagreed about
  // the same cookie. Both files say at the top that they must stay identical. The day this number
  // moves to 2, a v1 cookie makes the portal show the banner and deny, while bugit.dev reads the
  // stale record and loads the advertising tag: the website failing open on exactly the boundary
  // the portal fails closed on.
  var CONSENT_VERSION = 1;
  var GCLID_COOKIE = 'bugit_gclid';
  var CONSENT_DAYS = 180;
  var GCLID_DAYS = 90;
  var SIGNALS = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'];

  // --- Cookie helpers. On *.bugit.dev the cookie is shared across the apex and the
  //     portal subdomain (Domain=.bugit.dev); on localhost the Domain attribute is
  //     omitted and Secure is only set under https so dev cookies still store.
  function onBugit() { var h = location.hostname; return h === 'bugit.dev' || /\.bugit\.dev$/.test(h); }
  function domainAttr() { return onBugit() ? '; Domain=.bugit.dev' : ''; }
  function secureAttr() { return (onBugit() || location.protocol === 'https:') ? '; Secure' : ''; }
  function setCookie(name, value, days) {
    var exp = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + value + '; Path=/; Expires=' + exp +
      '; SameSite=Lax' + domainAttr() + secureAttr();
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? m[1] : null;
  }
  // WITHDRAWING CONSENT HAS TO REMOVE WHAT CONSENT PUT THERE. `captureAttribution` stopped
  // WRITING `bugit_gclid` the moment advertising was denied, and that is not the same as the
  // cookie being gone: one already written survives the refusal for its full ninety days and
  // keeps travelling to the Portal on the shared .bugit.dev domain. Somebody who grants, is
  // measured, and then rejects is still carrying the click id they rejected.
  //
  // Written with the SAME Domain and Path as `setCookie`, because a cookie is identified by
  // that triple: deleting `bugit_gclid` at the default host-only scope leaves the
  // `Domain=.bugit.dev` one exactly where it was, with nothing on screen saying so. Both
  // scopes are cleared, since a decision made on localhost and a decision made on the live
  // site must both end with the value gone.
  function deleteCookie(name) {
    var dead = '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = name + dead + domainAttr() + secureAttr();
    document.cookie = name + dead + secureAttr();
  }
  // GOOGLE WRITES ITS OWN COOKIE, AND REVOCATION HAS TO REMOVE THAT TOO. The Ads tag sets
  // `_gcl_au` (and sometimes other `_gcl_*` names) itself while ad_storage is granted; nothing
  // in this file ever wrote it, so `deleteCookie(GCLID_COOKIE)` alone leaves it behind for its
  // own lifetime -- documented as up to 90 days -- after a visitor rejects. Found by name rather
  // than listed, so a `_gcl_` cookie this file never named is still cleared: `document.cookie`
  // is read for every `_gcl_` prefix present right now, and each one is expired at both scopes
  // through the existing `deleteCookie`, the same host-only-plus-Domain=.bugit.dev pair used
  // for `bugit_gclid`.
  function clearGoogleAdCookies() {
    var seen = document.cookie.split(';');
    for (var i = 0; i < seen.length; i++) {
      var name = seen[i].split('=')[0].replace(/^\s+/, '');
      if (/^_gcl_/.test(name)) deleteCookie(name);
    }
  }

  // --- Consent state (read/normalize/write).
  function readConsent() {
    var raw = getCookie(CONSENT_COOKIE);
    if (!raw) return null;
    try {
      var o = JSON.parse(decodeURIComponent(raw));
      // Mirrors lib/analytics/consent.ts exactly: a wrong version is not a consent record, and a
      // grant is the literal `true`. `!!o.ad_storage` treated 1, "false" and any object as a
      // grant -- a coercion on the one field that decides whether advertising loads.
      if (o === null || typeof o !== 'object') return null;
      if (o.v !== CONSENT_VERSION) return null;
      return {
        v: CONSENT_VERSION,
        ad_storage: o.ad_storage === true,
        // A cookie saved while the Analytics switch still existed can carry `true`. The switch is
        // gone, so the visitor could never withdraw it; it is read as denied and never replayed
        // to Google. Mirrors parseConsentCookie in lib/analytics/consent.ts.
        analytics_storage: false,
        ad_user_data: o.ad_user_data === true,
        ad_personalization: o.ad_personalization === true,
        ts: o.ts || 0
      };
    } catch (e) { return null; }
  }
  function writeConsent(c) {
    var payload = {
      v: CONSENT_VERSION,
      ad_storage: !!c.ad_storage,
      // Always false: nothing on this site is analytics a visitor can grant (see app.js,
      // initConsent). The field stays because every reader of the shared cookie parses it.
      analytics_storage: false,
      ad_user_data: !!c.ad_user_data,
      ad_personalization: !!c.ad_personalization,
      ts: Math.floor(Date.now() / 1000)
    };
    var prev = readConsent();
    setCookie(CONSENT_COOKIE, encodeURIComponent(JSON.stringify(payload)), CONSENT_DAYS);
    applyToGtag(payload);
    // Cleared BEFORE the reload below, which does not return. Ordered this way deliberately:
    // the revocation path is exactly the one where the stored click id must not survive, and
    // it is also the only path that leaves this function early.
    if (!payload.ad_storage) { deleteCookie(GCLID_COOKIE); clearGoogleAdCookies(); }
    captureAttribution(payload);
    // STRICT GATING (owner policy 2026-07-27): the Google tag loads ONLY when advertising
    // is granted. If a prior grant is being REVOKED this session (the tag is already
    // loaded), reload so the loaded Google runtime state is purged and no further Google
    // request can fire (owner rule 9). No decision / Reject never loads the tag.
    if (prev && prev.ad_storage && !payload.ad_storage && window.__bugitTagLoaded) {
      try { location.reload(); } catch (e) {}
      return payload;
    }
    maybeLoadTag(payload);
    return payload;
  }
  function toState(c) {
    var s = {};
    for (var i = 0; i < SIGNALS.length; i++) s[SIGNALS[i]] = c[SIGNALS[i]] ? 'granted' : 'denied';
    return s;
  }

  // --- gtag + Consent Mode v2 defaults (denied), set before the tag configures.
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  function applyToGtag(c) { gtag('consent', 'update', toState(c)); }

  // Replay any prior decision before the tag configures.
  var stored = readConsent();
  if (stored) applyToGtag(stored);

  // --- Load the Google tag EXACTLY ONCE per page, and ONLY after advertising consent
  //     is GRANTED (owner strict-gating policy, 2026-07-27). Before any choice, and after
  //     "Reject non-essential", NO Google script and NO Consent Mode ping may touch the
  //     network — denied-default Consent Mode pings are explicitly NOT sufficient for
  //     BugIt. The __bugitTagLoaded guard also makes any accidental double include inert.
  function loadTag() {
    if (window.__bugitTagLoaded) return;
    window.__bugitTagLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ADS_ID);
    (document.head || document.documentElement).appendChild(s);
    gtag('js', new Date());
    gtag('config', ADS_ID);
  }
  // Load the tag iff advertising consent is (or becomes) granted. A null/absent decision
  // and a Reject decision both leave ad_storage false, so the tag is never loaded.
  function maybeLoadTag(c) {
    var consent = c || readConsent();
    if (consent && consent.ad_storage) loadTag();
  }
  // On page load, load the tag ONLY if a STORED decision granted advertising.
  maybeLoadTag(stored);

  // A DECISION IS SHARED AND THE REVOCATION WAS NOT. The cookie spans the apex and the Portal
  // subdomain, so a visitor can reject advertising in one tab while another tab, or the Portal
  // in another tab, is still running the Google tag that was loaded under the old grant. The
  // reload in `writeConsent` fires only in the document that did the writing, and a tab that
  // merely READS an already-denied cookie never met that condition at all. So the strict claim
  // -- that after a rejection no further Google request may fire -- held for one document.
  //
  // Cookies raise no `storage` event, so there is nothing to subscribe to. The moment a
  // background tab can act is the moment it comes back, which is exactly when it would resume
  // making requests, so that is when it re-reads the decision.
  //
  // THIS CANNOT LOOP. It reloads only while the tag is loaded, and after the reload the stored
  // decision denies, so `maybeLoadTag` above does not load it and the condition is false.
  function reconcileWithStoredDecision() {
    if (!window.__bugitTagLoaded) return;
    var now = readConsent();
    // No readable decision is not a grant. A cookie cleared in another tab, or expired, or
    // written by a newer contract version, all arrive here as null and all mean the same
    // thing: this document is running a tag that nothing currently authorises.
    if (now && now.ad_storage) return;
    applyToGtag(now || { ad_storage: false, analytics_storage: false,
                         ad_user_data: false, ad_personalization: false });
    deleteCookie(GCLID_COOKIE);
    clearGoogleAdCookies();
    try { location.reload(); } catch (e) {}
  }
  if (document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) reconcileWithStoredDecision();
    });
  }
  if (window.addEventListener) {
    window.addEventListener('focus', reconcileWithStoredDecision);
    // Coming back through the back/forward cache, where nothing else fires.
    window.addEventListener('pageshow', function (e) {
      if (e && e.persisted) reconcileWithStoredDecision();
    });
  }

  // --- gclid/gbraid/wbraid attribution capture. Stored in `bugit_gclid` ONLY when
  //     ad_storage is granted, so the portal can read attribution after the user
  //     navigates across the shared .bugit.dev cookie domain. Denied consent stores
  //     nothing. Re-runnable: the banner calls writeConsent(), which re-attempts
  //     capture the moment advertising is granted (the click ids are still in the URL).
  function captureAttribution(c) {
    var consent = c || readConsent();
    if (!consent || !consent.ad_storage) return; // consent truly gates ad storage
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var out = {}, found = false;
    ['gclid', 'gbraid', 'wbraid'].forEach(function (k) {
      var v = q.get(k);
      if (v) { out[k] = v; found = true; }
    });
    if (!found) return;
    out.ts = Math.floor(Date.now() / 1000);
    setCookie(GCLID_COOKIE, encodeURIComponent(JSON.stringify(out)), GCLID_DAYS);
  }
  captureAttribution(stored);

  // --- Minimal API for the consent banner (app.js).
  window.BugitConsent = {
    ADS_ID: ADS_ID,
    read: readConsent,
    write: writeConsent,
    // A DECISION IS A READABLE ONE. This answered true for a cookie that readConsent rejects, so
    // a corrupt or wrong-version record suppressed the banner while the visitor sat at the denied
    // default with nothing on screen offering them the choice again. Asking the same function
    // that decides everything else means the two can never disagree.
    hasDecision: function () { return readConsent() !== null; }
  };
})();
