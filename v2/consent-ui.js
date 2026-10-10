/* The cookie notice for the v2 pages (2026-10-04).

   WHAT THIS IS. The banner the old single page site showed (index.html #consentBanner plus
   initConsent() in app.js), carried over with the same behaviour and restyled for v2. It builds its
   own markup, so a page needs no banner HTML: only /consent.js in <head> (unchanged, it owns the
   decision, the cookie and the Google tag) and this file plus /v2/consent.css.

   WHAT IT GUARANTEES, the same as before:
     * It shows itself only when window.BugitConsent.hasDecision() is false. Nothing here loads
       Google: consent.js loads the tag only after a decision that grants advertising.
     * Accept all grants ad_storage, ad_user_data and ad_personalization together; Reject
       non-essential and an unticked Save deny all three. analytics_storage is always false
       (there is no analytics switch; see the note above initConsent in app.js).
     * Any element with [data-consent-open] reopens it with the preferences shown, and so does
       window.BugitConsentUI.open().
     * While it is up, the page grows by exactly its height (--consent-h, html.consent-open), so
       the footer under it stays reachable. html.consent-managing is derived from the panel.
     * The element keeps the id "consentBanner" and toggles the `hidden` attribute, because
       /public/guide/guide.js refuses to open over an element with that id and guide.css hides
       its launcher while it is up. Renaming it would silently let the Guide cover the notice.
     * Pressing the hero Ask bar while the notice is up points at the notice (focus on Accept
       all, a brief outline), as app.js did, rather than doing nothing.

   STRINGS are the old consentI18n table, copied byte for byte from app.js (2026-10-04), in the
   same eleven languages. The language follows window.V2Lang() and re-renders on `v2:lang`.

   No inline script or handler anywhere: the site CSP is script-src 'self'. */
(function () {
  "use strict";

  var STRINGS = {
    "en": {
      title: "Cookies and measurement",
      body: "We use essential cookies to run this site, plus a cookieless Cloudflare measurement of page performance that does not track you across sites. With your permission we also use Google cookies to measure our advertising. You can change your choice at any time.",
      privacyLink: "Read our Privacy Policy",
      manage: "Manage preferences",
      save: "Save preferences",
      reject: "Reject non-essential",
      accept: "Accept all",
      essential: "Essential",
      essentialDesc: "Required for the site to function.",
      always: "Always on",
      advertising: "Advertising",
      advertisingDesc: "Helps us understand whether our advertising leads to purchases.",
      advMeasureTitle: "Advertising measurement",
      advProviderLabel: "Provider",
      advProvider: "Google",
      advPurposeLabel: "Purpose",
      advPurpose: "Advertising performance and purchase attribution",
      advInfoLabel: "Information that may be processed",
      advInfo: "Advertising interaction information, purchase value, currency, and a non personal order reference",
      prefsLink: "Cookie preferences"
    },
    "ja": {
      title: "Cookieと計測",
      body: "当サイトの動作に必要なCookieと、Cookieを使わず、サイトをまたいで追跡しないCloudflareのパフォーマンス計測を使用します。ご同意いただいた場合は、広告の効果測定のためにGoogleのCookieも使用します。設定はいつでも変更できます。",
      privacyLink: "プライバシーポリシーを読む",
      manage: "設定を管理",
      save: "設定を保存",
      reject: "必須以外を拒否",
      accept: "すべて許可",
      essential: "必須",
      essentialDesc: "サイトの動作に必要です。",
      always: "常に有効",
      advertising: "広告",
      advertisingDesc: "広告が購入につながっているかどうかの把握に役立ちます。",
      advMeasureTitle: "広告計測",
      advProviderLabel: "提供者",
      advProvider: "Google",
      advPurposeLabel: "目的",
      advPurpose: "広告のパフォーマンスと購入のアトリビューション",
      advInfoLabel: "処理される可能性のある情報",
      advInfo: "広告操作に関する情報、購入金額、通貨、および個人を特定しない注文参照",
      prefsLink: "Cookie設定"
    },
    "fr": {
      title: "Cookies et mesure",
      body: "Nous utilisons des cookies essentiels pour faire fonctionner le site, ainsi qu’une mesure de performance Cloudflare sans cookie qui ne vous suit pas d’un site à l’autre. Avec votre accord, nous utilisons aussi des cookies Google pour mesurer notre publicité. Vous pouvez modifier votre choix à tout moment.",
      privacyLink: "Lire notre politique de confidentialité",
      manage: "Gérer les préférences",
      save: "Enregistrer les préférences",
      reject: "Refuser les non essentiels",
      accept: "Tout accepter",
      essential: "Essentiels",
      essentialDesc: "Nécessaires au fonctionnement du site.",
      always: "Toujours actifs",
      advertising: "Publicité",
      advertisingDesc: "Nous aide à comprendre si notre publicité génère des achats.",
      advMeasureTitle: "Mesure publicitaire",
      advProviderLabel: "Fournisseur",
      advProvider: "Google",
      advPurposeLabel: "Finalité",
      advPurpose: "Performance publicitaire et attribution des achats",
      advInfoLabel: "Informations susceptibles d’être traitées",
      advInfo: "Informations sur l’interaction publicitaire, montant de l’achat, devise et une référence de commande non personnelle",
      prefsLink: "Préférences des cookies"
    },
    "de": {
      title: "Cookies und Messung",
      body: "Wir verwenden notwendige Cookies für den Betrieb der Website sowie eine cookielose Cloudflare-Messung der Seitenleistung, die Sie nicht websiteübergreifend verfolgt. Mit Ihrer Einwilligung nutzen wir außerdem Google-Cookies, um unsere Werbung zu messen. Sie können Ihre Auswahl jederzeit ändern.",
      privacyLink: "Datenschutzerklärung lesen",
      manage: "Einstellungen verwalten",
      save: "Einstellungen speichern",
      reject: "Nicht notwendige ablehnen",
      accept: "Alle akzeptieren",
      essential: "Notwendig",
      essentialDesc: "Für den Betrieb der Website erforderlich.",
      always: "Immer aktiv",
      advertising: "Werbung",
      advertisingDesc: "Hilft uns zu verstehen, ob unsere Werbung zu Käufen führt.",
      advMeasureTitle: "Werbemessung",
      advProviderLabel: "Anbieter",
      advProvider: "Google",
      advPurposeLabel: "Zweck",
      advPurpose: "Werbeleistung und Kaufzuordnung",
      advInfoLabel: "Möglicherweise verarbeitete Informationen",
      advInfo: "Informationen zu Werbeinteraktionen, Kaufwert, Währung und eine nicht personenbezogene Bestellreferenz",
      prefsLink: "Cookie-Einstellungen"
    },
    "es": {
      title: "Cookies y medición",
      body: "Usamos cookies esenciales para el funcionamiento del sitio y una medición de rendimiento de Cloudflare sin cookies que no te rastrea de un sitio a otro. Con tu permiso, también usamos cookies de Google para medir nuestra publicidad. Puedes cambiar tu elección en cualquier momento.",
      privacyLink: "Leer nuestra Política de Privacidad",
      manage: "Gestionar preferencias",
      save: "Guardar preferencias",
      reject: "Rechazar no esenciales",
      accept: "Aceptar todo",
      essential: "Esenciales",
      essentialDesc: "Necesarias para el funcionamiento del sitio.",
      always: "Siempre activas",
      advertising: "Publicidad",
      advertisingDesc: "Nos ayuda a saber si nuestra publicidad genera compras.",
      advMeasureTitle: "Medición de publicidad",
      advProviderLabel: "Proveedor",
      advProvider: "Google",
      advPurposeLabel: "Finalidad",
      advPurpose: "Rendimiento publicitario y atribución de compras",
      advInfoLabel: "Información que puede procesarse",
      advInfo: "Información sobre la interacción con anuncios, el valor de la compra, la moneda y una referencia de pedido no personal",
      prefsLink: "Preferencias de cookies"
    },
    "pt-br": {
      title: "Cookies e medição",
      body: "Usamos cookies essenciais para o funcionamento do site e uma medição de desempenho da Cloudflare sem cookies que não rastreia você entre sites. Com sua permissão, também usamos cookies do Google para medir nossa publicidade. Você pode mudar sua escolha a qualquer momento.",
      privacyLink: "Ler nossa Política de Privacidade",
      manage: "Gerenciar preferências",
      save: "Salvar preferências",
      reject: "Recusar não essenciais",
      accept: "Aceitar tudo",
      essential: "Essenciais",
      essentialDesc: "Necessários para o funcionamento do site.",
      always: "Sempre ativos",
      advertising: "Publicidade",
      advertisingDesc: "Ajuda-nos a entender se a nossa publicidade gera compras.",
      advMeasureTitle: "Medição de publicidade",
      advProviderLabel: "Provedor",
      advProvider: "Google",
      advPurposeLabel: "Finalidade",
      advPurpose: "Desempenho da publicidade e atribuição de compras",
      advInfoLabel: "Informações que podem ser processadas",
      advInfo: "Informações sobre a interação com anúncios, valor da compra, moeda e uma referência de pedido não pessoal",
      prefsLink: "Preferências de cookies"
    },
    "it": {
      title: "Cookie e misurazione",
      body: "Usiamo cookie essenziali per far funzionare il sito e una misurazione delle prestazioni di Cloudflare senza cookie che non ti traccia da un sito all’altro. Con il tuo consenso usiamo anche cookie di Google per misurare la nostra pubblicità. Puoi cambiare la tua scelta in qualsiasi momento.",
      privacyLink: "Leggi la nostra Informativa sulla privacy",
      manage: "Gestisci preferenze",
      save: "Salva preferenze",
      reject: "Rifiuta non essenziali",
      accept: "Accetta tutto",
      essential: "Essenziali",
      essentialDesc: "Necessari al funzionamento del sito.",
      always: "Sempre attivi",
      advertising: "Pubblicità",
      advertisingDesc: "Ci aiuta a capire se la nostra pubblicità genera acquisti.",
      advMeasureTitle: "Misurazione pubblicitaria",
      advProviderLabel: "Fornitore",
      advProvider: "Google",
      advPurposeLabel: "Finalità",
      advPurpose: "Prestazioni pubblicitarie e attribuzione degli acquisti",
      advInfoLabel: "Informazioni che possono essere trattate",
      advInfo: "Informazioni sull’interazione con gli annunci, valore dell’acquisto, valuta e un riferimento d’ordine non personale",
      prefsLink: "Preferenze cookie"
    },
    "ko": {
      title: "쿠키 및 측정",
      body: "사이트 운영에 필요한 필수 쿠키와, 쿠키를 사용하지 않고 사이트 간에 추적하지 않는 Cloudflare 성능 측정을 사용합니다. 동의하시면 광고 성과 측정을 위해 Google 쿠키도 사용합니다. 선택은 언제든지 변경할 수 있습니다.",
      privacyLink: "개인정보처리방침 보기",
      manage: "기본 설정 관리",
      save: "기본 설정 저장",
      reject: "필수 외 거부",
      accept: "모두 허용",
      essential: "필수",
      essentialDesc: "사이트 작동에 필요합니다.",
      always: "항상 켜짐",
      advertising: "광고",
      advertisingDesc: "광고가 구매로 이어지는지 파악하는 데 도움이 됩니다.",
      advMeasureTitle: "광고 측정",
      advProviderLabel: "제공자",
      advProvider: "Google",
      advPurposeLabel: "목적",
      advPurpose: "광고 성과 및 구매 기여도 분석",
      advInfoLabel: "처리될 수 있는 정보",
      advInfo: "광고 상호작용 정보, 구매 금액, 통화, 개인정보가 아닌 주문 참조",
      prefsLink: "쿠키 기본 설정"
    },
    "zh": {
      title: "Cookie 与衡量",
      body: "我们使用必要的 Cookie 来运行本网站，以及不使用 Cookie、不跨网站追踪你的 Cloudflare 性能衡量。在你同意后，我们还会使用 Google 的 Cookie 来衡量广告效果。你可以随时更改你的选择。",
      privacyLink: "阅读我们的隐私政策",
      manage: "管理偏好设置",
      save: "保存偏好设置",
      reject: "拒绝非必要",
      accept: "全部接受",
      essential: "必要",
      essentialDesc: "网站运行所必需。",
      always: "始终开启",
      advertising: "广告",
      advertisingDesc: "帮助我们了解广告是否带来购买。",
      advMeasureTitle: "广告衡量",
      advProviderLabel: "提供方",
      advProvider: "Google",
      advPurposeLabel: "用途",
      advPurpose: "广告效果与购买归因",
      advInfoLabel: "可能处理的信息",
      advInfo: "广告互动信息、购买金额、币种以及不含个人信息的订单编号",
      prefsLink: "Cookie 偏好设置"
    },
    "ru": {
      title: "Файлы cookie и измерение",
      body: "Мы используем необходимые файлы cookie для работы сайта, а также измерение производительности страниц Cloudflare без файлов cookie, которое не отслеживает вас на других сайтах. С вашего согласия мы также используем файлы cookie Google для оценки нашей рекламы. Вы можете изменить свой выбор в любое время.",
      privacyLink: "Читать нашу Политику конфиденциальности",
      manage: "Управление настройками",
      save: "Сохранить настройки",
      reject: "Отклонить необязательные",
      accept: "Принять все",
      essential: "Необходимые",
      essentialDesc: "Необходимы для работы сайта.",
      always: "Всегда включены",
      advertising: "Реклама",
      advertisingDesc: "Помогает нам понять, приводит ли наша реклама к покупкам.",
      advMeasureTitle: "Измерение рекламы",
      advProviderLabel: "Поставщик",
      advProvider: "Google",
      advPurposeLabel: "Цель",
      advPurpose: "Эффективность рекламы и атрибуция покупок",
      advInfoLabel: "Информация, которая может обрабатываться",
      advInfo: "Информация о взаимодействии с рекламой, сумма покупки, валюта и обезличенный номер заказа",
      prefsLink: "Настройки cookie"
    },
    "ar": {
      title: "ملفات تعريف الارتباط والقياس",
      body: "نستخدم ملفات تعريف ارتباط أساسية لتشغيل هذا الموقع، إضافة إلى قياس أداء الصفحات من Cloudflare بلا ملفات تعريف ارتباط ودون تتبّعك عبر المواقع. بإذنك، نستخدم أيضًا ملفات تعريف ارتباط من Google لقياس إعلاناتنا. يمكنك تغيير اختيارك في أي وقت.",
      privacyLink: "اقرأ سياسة الخصوصية",
      manage: "إدارة التفضيلات",
      save: "حفظ التفضيلات",
      reject: "رفض غير الأساسية",
      accept: "قبول الكل",
      essential: "أساسية",
      essentialDesc: "مطلوبة لعمل الموقع.",
      always: "مفعّلة دائمًا",
      advertising: "الإعلانات",
      advertisingDesc: "تساعدنا على معرفة ما إذا كانت إعلاناتنا تؤدي إلى عمليات شراء.",
      advMeasureTitle: "قياس الإعلانات",
      advProviderLabel: "المزوّد",
      advProvider: "Google",
      advPurposeLabel: "الغرض",
      advPurpose: "أداء الإعلانات وإسناد المشتريات",
      advInfoLabel: "المعلومات التي قد تُعالَج",
      advInfo: "معلومات التفاعل الإعلاني وقيمة الشراء والعملة ومرجع طلب غير شخصي",
      prefsLink: "تفضيلات ملفات تعريف الارتباط"
    }
  };

  var CODES = ["en", "ja", "fr", "de", "es", "pt-br", "it", "ko", "zh", "ru", "ar"];
  var C = window.BugitConsent;

  function norm(l) {
    l = String(l || "").toLowerCase();
    if (CODES.indexOf(l) >= 0) return l;
    if (/^pt/.test(l)) return "pt-br";
    if (/^zh/.test(l)) return "zh";
    var b = l.split("-")[0];
    return CODES.indexOf(b) >= 0 ? b : null;
  }
  function currentLang() {
    var l = null;
    try { if (typeof window.V2Lang === "function") l = norm(window.V2Lang()); } catch (e) {}
    return l || norm(document.documentElement.lang) || "en";
  }
  function t(lang, k) {
    var d = STRINGS[lang] || STRINGS.en;
    return d[k] != null ? d[k] : STRINGS.en[k];
  }

  /* The privacy policy link follows the page's own footer link to it, so it stays right when the
     pages move from /v2/ to the root. The fallback is where it lives today. */
  function privacyHref() {
    var a = document.querySelector('footer a[href*="docs/privacy"]') || document.querySelector('a[href*="#/docs/privacy"]');
    return a ? a.getAttribute("href") : "/docs/privacy/";
  }

  var banner, prefs, adv, bManage, bSave, bReject, bAccept, link;
  var lastReserve = -1, opener = null;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var a in attrs) {
      if (a === "class") n.className = attrs[a];
      else if (a === "text") n.textContent = attrs[a];
      else n.setAttribute(a, attrs[a]);
    }
    if (kids) for (var i = 0; i < kids.length; i++) if (kids[i]) n.appendChild(kids[i]);
    return n;
  }
  /* Every translated node carries data-ck="<key>", so a language change rewrites text in place
     and keeps the open panel, the switch and the focus exactly where they were. */
  function tx(tag, key, attrs) {
    attrs = attrs || {};
    attrs["data-ck"] = key;
    return el(tag, attrs);
  }

  function build() {
    banner = el("div", {
      id: "consentBanner", "class": "consent", role: "dialog", "aria-modal": "false",
      "aria-labelledby": "consentTitle", "aria-describedby": "consentBody", tabindex: "-1", hidden: ""
    });
    adv = el("input", { type: "checkbox", id: "consentAdvertising", "class": "consent-switch",
      "aria-describedby": "consentAdvDesc" });
    link = tx("a", "privacyLink", { "class": "consent-link", href: privacyHref() });

    var copy = el("div", { "class": "consent-copy" }, [
      tx("h2", "title", { id: "consentTitle", "class": "consent-title" }),
      tx("p", "body", { id: "consentBody" }),
      link
    ]);

    var essential = el("div", { "class": "consent-opt" }, [
      el("span", { "class": "consent-opt-text" }, [tx("b", "essential", { id: "consentEssTitle" }), tx("small", "essentialDesc")]),
      tx("span", "always", { "class": "consent-fixed-tag" })
    ]);
    var advertising = el("label", { "class": "consent-opt", "for": "consentAdvertising" }, [
      el("span", { "class": "consent-opt-text" }, [tx("b", "advertising"), tx("small", "advertisingDesc", { id: "consentAdvDesc" })]),
      adv
    ]);
    function row(lk, vk) { return el("div", null, [tx("dt", lk), tx("dd", vk)]); }
    var detail = el("div", { "class": "consent-detail" }, [
      tx("b", "advMeasureTitle"),
      el("dl", { "class": "consent-meta" }, [
        row("advProviderLabel", "advProvider"),
        row("advPurposeLabel", "advPurpose"),
        row("advInfoLabel", "advInfo")
      ])
    ]);
    prefs = el("div", { "class": "consent-prefs", id: "consentPrefs", hidden: "" }, [essential, advertising, detail]);

    /* ONE SCROLLPORT, AND THE BUTTONS OUTSIDE IT (styles.css section 118 on the old site): the copy
       and the preferences scroll together inside a dvh ceiling, and the controls that answer the
       notice can never be scrolled away or covered. */
    var scroll = el("div", { "class": "consent-scroll" }, [copy, prefs]);

    bManage = tx("button", "manage", { type: "button", id: "consentManage", "class": "consent-btn ghost" });
    bSave = tx("button", "save", { type: "button", id: "consentSave", "class": "consent-btn ghost", hidden: "" });
    bReject = tx("button", "reject", { type: "button", id: "consentReject", "class": "consent-btn ghost" });
    bAccept = tx("button", "accept", { type: "button", id: "consentAccept", "class": "consent-btn primary" });
    var actions = el("div", { "class": "consent-actions" }, [bManage, bSave, bReject, bAccept]);

    banner.appendChild(el("div", { "class": "consent-inner" }, [scroll, actions]));
    document.body.appendChild(banner);
  }

  function render() {
    var lang = currentLang();
    if (!banner) return;
    var nodes = banner.querySelectorAll("[data-ck]");
    for (var i = 0; i < nodes.length; i++) {
      var v = t(lang, nodes[i].getAttribute("data-ck"));
      if (nodes[i].textContent !== v) nodes[i].textContent = v;
    }
    banner.setAttribute("lang", lang === "pt-br" ? "pt-BR" : lang);
    link.setAttribute("href", privacyHref());
    // The reopen controls the pages place in their footers take their label from here too, so a
    // page needs no translation of its own for them. One that brings its own text (data-k) keeps it.
    var opens = document.querySelectorAll("[data-consent-open]");
    for (var j = 0; j < opens.length; j++) {
      if (opens[j].hasAttribute("data-k")) continue;
      var p = t(lang, "prefsLink");
      if (opens[j].textContent !== p) opens[j].textContent = p;
    }
    reserve();
  }

  /* THE BANNER RESERVES ITS OWN HEIGHT, measured, not guessed: it changes with the viewport, the
     language and by a few hundred pixels when the preferences open. The ResizeObserver is kept on
     the element because an observer nothing references is collectable and simply stops calling. */
  function reserve() {
    var on = !banner.hidden;
    var root = document.documentElement;
    root.classList.toggle("consent-open", on);
    root.classList.toggle("consent-managing", on && !prefs.hidden);
    // Measured AFTER the classes, because the classes are what cap the height.
    var h = on ? Math.ceil(banner.getBoundingClientRect().height) : 0;
    moreHint();
    if (h === lastReserve) return;
    lastReserve = h;
    root.style.setProperty("--consent-h", h + "px");
  }

  // Fades the lower edge of the scrollport while there is more of it below (consent.css).
  function moreHint() {
    var sc = banner.querySelector(".consent-scroll");
    var more = !banner.hidden && !!sc && sc.scrollHeight - sc.clientHeight - sc.scrollTop > 2;
    banner.classList.toggle("has-more", more);
  }

  function open(managing) {
    var cur = C.read();
    adv.checked = !!(cur && cur.ad_storage);
    prefs.hidden = !managing;
    bSave.hidden = !managing;
    bManage.hidden = !!managing;
    banner.hidden = false;
    // The scrollport opens at its beginning, so the reader sees what it is about first.
    var sc = banner.querySelector(".consent-scroll"); if (sc) sc.scrollTop = 0;
    reserve();
    try { banner.focus({ preventScroll: true }); } catch (e) { try { banner.focus(); } catch (_) {} }
  }
  function close() {
    banner.hidden = true;
    reserve();
    // Focus goes back to whatever reopened the notice, so a keyboard user is not dropped at the top.
    var back = opener; opener = null;
    if (back && document.contains(back)) { try { back.focus({ preventScroll: true }); } catch (e) {} }
  }
  function collapsePrefs() {
    prefs.hidden = true; bSave.hidden = true; bManage.hidden = false;
    reserve();
    try { bManage.focus(); } catch (e) {}
  }
  function decide(advertising) {
    // consent.js writes the cookie, updates Consent Mode, loads the tag on a grant and reloads on
    // a withdrawal of an earlier grant (which does not return).
    C.write({ ad_storage: advertising, ad_user_data: advertising, ad_personalization: advertising, analytics_storage: false });
    close();
  }

  /* Pressing the Ask bar (or the Guide launcher) while the notice is up: the Guide refuses to open
     over it, so show the visitor the choice that is in the way instead of a dead button. */
  function point() {
    if (!banner || banner.hidden || !banner.getClientRects().length) return false;
    try { bAccept.focus({ preventScroll: true }); } catch (e) { try { bAccept.focus(); } catch (_) {} }
    banner.classList.remove("is-pointed");
    void banner.offsetWidth; // restart the animation on a repeat press
    banner.classList.add("is-pointed");
    setTimeout(function () { banner.classList.remove("is-pointed"); }, 2200);
    return true;
  }

  function wire() {
    bAccept.addEventListener("click", function () { decide(true); });
    bReject.addEventListener("click", function () { decide(false); });
    // Focus stays on the notice itself, which open() puts at its first sentence. Focusing the
    // switch scrolled the notice past that sentence on a small or sideways phone
    // (check-notice-fits.mjs), and focusing it without scrolling left keyboard focus on a switch
    // the reader could not see (Codex review, 2026-10-04). Tab reaches the switch from here.
    bManage.addEventListener("click", function () { open(true); });
    bSave.addEventListener("click", function () { decide(!!adv.checked); });
    banner.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !prefs.hidden) { e.preventDefault(); collapsePrefs(); }
    });
    // Delegated, so a footer link added after this script ran still works.
    document.addEventListener("click", function (e) {
      var o = e.target && e.target.closest ? e.target.closest("[data-consent-open]") : null;
      if (o) { e.preventDefault(); opener = o; open(true); return; }
      var a = e.target && e.target.closest ? e.target.closest("#askBar, .bgd-launch") : null;
      if (a) point();
    });
    if (window.ResizeObserver) {
      banner.__consentRO = new ResizeObserver(function () { reserve(); });
      banner.__consentRO.observe(banner);
    }
    window.addEventListener("resize", reserve);
    banner.querySelector(".consent-scroll").addEventListener("scroll", moreHint, { passive: true });
    document.addEventListener("v2:lang", render);
  }

  function start() {
    if (!C || typeof C.read !== "function" || typeof C.write !== "function") {
      // consent.js is missing: there is nothing to decide with, so hide the reopen controls rather
      // than leave a control that does nothing.
      var dead = document.querySelectorAll("[data-consent-open]");
      for (var i = 0; i < dead.length; i++) dead[i].hidden = true;
      return;
    }
    if (document.getElementById("consentBanner")) return; // a second include is inert
    build();
    wire();
    render();
    window.BugitConsentUI = {
      open: function () { opener = document.activeElement; open(true); },
      close: close,
      isOpen: function () { return !!banner && !banner.hidden; }
    };
    if (!C.hasDecision()) open(false);
  }

  /* Built synchronously when the body exists (this file sits at the end of <body>), so the banner
     is in the DOM before /public/guide/guide.js, a deferred module, looks it up by id. */
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
