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

  // --- Consent state (read/normalize/write).
  function readConsent() {
    var raw = getCookie(CONSENT_COOKIE);
    if (!raw) return null;
    try {
      var o = JSON.parse(decodeURIComponent(raw));
      return {
        v: 1,
        ad_storage: !!o.ad_storage,
        analytics_storage: !!o.analytics_storage,
        ad_user_data: !!o.ad_user_data,
        ad_personalization: !!o.ad_personalization,
        ts: o.ts || 0
      };
    } catch (e) { return null; }
  }
  function writeConsent(c) {
    var payload = {
      v: 1,
      ad_storage: !!c.ad_storage,
      analytics_storage: !!c.analytics_storage,
      ad_user_data: !!c.ad_user_data,
      ad_personalization: !!c.ad_personalization,
      ts: Math.floor(Date.now() / 1000)
    };
    setCookie(CONSENT_COOKIE, encodeURIComponent(JSON.stringify(payload)), CONSENT_DAYS);
    applyToGtag(payload);
    captureAttribution(payload);
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

  // --- Load the Google tag EXACTLY ONCE per page. A hash-route change never
  //     re-executes this file, and the guard flag also defends against any
  //     accidental double include. Consent Mode redacts pings while denied, so
  //     the tag is always loaded; consent controls storage, not tag presence.
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
  loadTag();

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
    hasDecision: function () { return !!getCookie(CONSENT_COOKIE); }
  };
})();
