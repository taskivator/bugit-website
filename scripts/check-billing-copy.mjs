// Billing wording must not read as a subscription.
//
// WHY THIS EXISTS. BugIt sells a ONE-TIME payment that grants a 365-day licence
// and never auto-renews. The site said "$39.99/year" and "Regular price
// $59.99/year", and the structured data tagged both offers `"category":
// "annual"`. Every one of those is a reasonable way to describe a recurring
// subscription, which is not what a customer is buying. A buyer who thinks
// they subscribed and later sees no renewal (or fears an unwanted charge) has
// been misled by the copy, not by the product.
//
// The failure mode is that "/year" is genuinely ambiguous: it can mean "per year,
// recurring" or "for a year, once". Only the first reading is wrong, and nothing
// in a rendered page disambiguates it. So the rule is that every locale must
// state the one-time nature explicitly somewhere in the pricing block.
//
// EVERY LOCALE MEANS EVERY LOCALE'S OWN DICTIONARY (CR-08-F12). The term checks used to collect
// every definition of `perYear`, `soloTerm` and `teamTerm` in app.js, in both quote styles, and
// check that the three counts were equal and that each value carried a marker from ONE shared
// list of every language's wording. A count of definitions is not a count of locales (a stale
// literal nothing reads any more is counted, a locale whose key is inherited from English is
// not), and a shared list lets an English "does not auto-renew" left in the Korean dictionary
// pass as the Korean statement. The no-renewal list also contained the bare substring
// "auto-renew", which "renews automatically; auto-renew is on" satisfies. The checks now read
// each shipped language's EFFECTIVE dictionary (scripts/lib/copy-effective-i18n.mjs, which runs
// app.js and returns what applyLang() reads) and hold each one to ITS OWN language's wording,
// and the no-renewal markers are negated phrases only.
//
// AND EVERY PRICE IS BOUND TO ITS PLAN. The price check at the end used to be
// `index.includes(price) || app.includes(price)`: four numbers, each allowed to be anywhere in
// either file. Solo and Team could swap prices and it stayed green; a visible price could change
// while an old copy in a comment or a dead literal kept the number "present". Prices now come
// from scripts/lib/copy-offers.mjs, which returns one record per displayed price with its plan,
// whether it is the current or the regular price, and the surface it is on, and every record
// must equal the approved figure for that plan and kind. This is the offline half. Whether the
// approved figures are still what the checkout charges is check-price-matches-checkout's
// question, answered against the portal's live price cards.
//
// The guard runs its own predicates over planted copies first (swapped plan prices, one locale's
// regular price moved while every other copy of the old one stays, an English term left in
// another locale, a locale's term deleted) and exits 2 if any of them is accepted.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEffectiveI18n } from './lib/copy-effective-i18n.mjs';
import { siteOffers, money, PLANS } from './lib/copy-offers.mjs';
import { publishedCopy, publishedLangs, htmlText } from './lib/published-copy.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

let fails = 0;
const check = (ok, label, detail) => {
  if (ok) return;
  fails++;
  console.error(`FAIL: ${label}${detail ? `\n      ${detail}` : ''}`);
};

const app = read('app.js');
const index = read('index.html');

let effective;
try {
  effective = loadEffectiveI18n(path.join(root, 'app.js'));
} catch (e) {
  console.error(`FAIL: ${e.message}`);
  process.exit(1);
}
const { i18n, codes } = effective;

// --- no recurring-cadence suffix survives anywhere -------------------------
// Localized cadence suffixes, in the languages this site ships.
const CADENCE = ['/year', '/yr', '/mo', '/month', '/年', '/año', '/ano', '/anno', '/년', '/год'];
for (const file of [['app.js', app], ['index.html', index]]) {
  for (const c of CADENCE) {
    check(
      !file[1].includes(c),
      `${file[0]} must not use the recurring-cadence suffix "${c}"`,
      'It reads as a subscription. BugIt is a 1-year license with no subscription.',
    );
  }
}

check(
  !/"category":\s*"annual"/.test(index),
  'structured data must not categorise the offers as "annual"',
  'Schema.org consumers read that as a recurring cadence.',
);
check(
  /"category":\s*"[^"]*no subscription[^"]*"/.test(index),
  'structured data must state the offers are not subscriptions',
);

// --- every locale states the one-time nature, the term and no renewal -------
// Per language, matched case-insensitively against that language's own effective value, so a
// translation can be reworded freely as long as it still carries the meaning in its own words.
// A shipped language with no entry here FAILS: add how it says these three things.
// OWNER, 2026-10-03: "the one time text in pricing is confusing, it's not one time if they have
// to renew in a year". So the non-recurring nature is now stated as NO SUBSCRIPTION, in the
// term line, and the price reads "for 1 year". `oneTime` keeps its name (it is the same
// obligation: say this is not a recurring charge) and is matched against the TERM lines.
const TERMS = {
  en: { oneTime: ['no subscription'], year: ['1-year', '1 year'],
    noRenew: ['does not auto-renew', 'never auto-renews', 'no auto-renewal', 'does not renew automatically'] },
  ja: { oneTime: ['サブスクリプションなし'], year: ['1年'], noRenew: ['自動更新なし'] },
  es: { oneTime: ['sin suscripción'], year: ['1 año'], noRenew: ['no se renueva'] },
  'pt-br': { oneTime: ['sem assinatura'], year: ['1 ano'], noRenew: ['não renova'] },
  it: { oneTime: ['nessun abbonamento'], year: ['1 anno'], noRenew: ['non si rinnova'] },
  ko: { oneTime: ['구독 없음'], year: ['1년'], noRenew: ['자동 갱신 없음'] },
  zh: { oneTime: ['非订阅'], year: ['1 年', '1年'], noRenew: ['不自动续订', '不会自动续订'] },
  // The second marker in ru, fr and zh below is the 2026-10-04 homepage's price card wording of
  // the same statement ("for 1 year", "is not renewed automatically", "no automatic renewal").
  ru: { oneTime: ['без подписки'], year: ['на 1 год', 'за 1 год'],
    noRenew: ['без автопродления', 'не продлевается автоматически'] },
  fr: { oneTime: ['sans abonnement'], year: ['1 an'],
    noRenew: ['sans reconduction automatique', 'pas de reconduction automatique'] },
  // Case-insensitive: German capitalises nouns ("1-Jahres-Solo-Lizenz").
  // "für 1 jahr" and "verlängert sich nicht automatisch" are the 2026-10-04 homepage's price card
  // wording for the same two facts (see THE PUBLISHED HOMEPAGE below).
  de: { oneTime: ['kein abo'], year: ['1-jahres', 'für 1 jahr'],
    noRenew: ['keine automatische verlängerung', 'verlängert sich nicht automatisch'] },
  // ar: "a single payment", "for a period of one year" (Arabic states the duration in words, not
  // as "1 ..."), "does not renew automatically".
  ar: { oneTime: ['بلا اشتراك'], year: ['لمدة سنة'], noRenew: ['لا يُجدَّد تلقائيًا'] },
};
const has = (value, markers) =>
  typeof value === 'string' && markers.some((m) => value.toLowerCase().includes(m.toLowerCase()));

function termProblems(dicts) {
  const out = [];
  for (const code of codes) {
    const t = TERMS[code];
    if (!t) {
      out.push(`${code}: no entry in TERMS, so nothing can tell whether this language states a ` +
        'no subscription, a 1-year term and no renewal');
      continue;
    }
    const p = (dicts[code] && dicts[code].pricing) || {};
    for (const key of ['soloTerm', 'teamTerm']) {
      if (!has(p[key], t.oneTime)) {
        out.push(`${code} pricing.${key} "${p[key]}" does not say it is not a subscription in this language`);
      }
      if (!has(p[key], t.year)) out.push(`${code} pricing.${key} "${p[key]}" does not state the 1-year term`);
      if (!has(p[key], t.noRenew)) {
        out.push(`${code} pricing.${key} "${p[key]}" does not state that it never auto-renews`);
      }
    }
  }
  return out;
}

// --- the claims that must NOT appear --------------------------------------
for (const [name, src] of [['app.js', app], ['index.html', index]]) {
  check(!/lifetime access|lifetime licen[cs]e|forever/i.test(src),
    `${name} must not claim lifetime access. The licence is 365 days`);
  check(!/auto-?renews\b|renews automatically|subscription will renew/i.test(src),
    `${name} must not describe automatic renewal`);
}

// --- the hero's "free updates" claim must be qualified, same as the price card -----
// W1 F5 (2026-09-24 audit): under.updates ("✓ Free software updates") was unqualified
// in every locale, while pricing.updates on the price card already said "while active"
// (or that locale's own equivalent). A buyer who read only the hero could expect
// updates past the 1-year term and be refused. Two passes. Every DEFINITION in the
// source is scanned against every language's qualifier, because a stale copy left
// unqualified is still wrong even if unreachable today; and every shipped language's
// EFFECTIVE value is held to its own language's qualifier, because the first pass
// counts definitions, not locales.
function scopedKeyValues(objectKey, innerKey) {
  const objRe = new RegExp('["\']?' + objectKey + '["\']?\\s*:\\s*\\{([^}]*)\\}', 'g');
  const innerRe = new RegExp('["\']?' + innerKey + '["\']?\\s*:\\s*["\']([^"\']*)["\']');
  const out = [];
  for (const m of app.matchAll(objRe)) {
    const im = innerRe.exec(m[1]);
    if (im) out.push(im[1]);
  }
  return out;
}

// The same qualifier wording the price card already uses, per shipped language.
const ACTIVE = {
  en: ['while active', 'year'],          // either wording states the limit
  ja: ['有効期間中'],
  es: ['mientras esté activa', 'activa'],
  fr: ['tant que la licence est active'],
  de: ['während der laufzeit'],
  'pt-br': ['enquanto ativa'],
  it: ['durante la licenza'],
  ko: ['활성 기간'],
  zh: ['有效期'],
  ru: ['активной лицензии'],
  ar: ['أثناء فترة الترخيص'],
};
const ACTIVE_ANY = Object.values(ACTIVE).flat();

const underUpdates = scopedKeyValues('under', 'updates');
check(underUpdates.length > 0, 'app.js defines under.updates somewhere', `found ${underUpdates.length}`);
for (const value of underUpdates) {
  check(
    has(value, ACTIVE_ANY),
    `under.updates "${value}" is not qualified the way the pricing card is`,
    'The hero must not claim unconditional free updates; reuse the pricing-card wording.',
  );
}
for (const code of codes) {
  const markers = ACTIVE[code];
  check(!!markers, `${code}: no entry in ACTIVE for the "while active" qualifier`);
  if (!markers) continue;
  for (const [obj, value] of [['under', i18n[code].under?.updates], ['pricing', i18n[code].pricing?.updates]]) {
    check(has(value, markers), `${code} ${obj}.updates "${value}" is not qualified in this language`,
      'The free-updates promise must say it lasts while the licence is active.');
  }
}

// --- the prices themselves are commercial truth and must not drift ----------
// Approved per plan and kind. Changing a price is a decision about a public offer, and the
// checkout (Stripe) must change with it; check-price-matches-checkout holds that side.
// Since 2026-10-03 the regular prices ARE the prices (owner retired the introductory offer).
// No "regular" figure is approved because none may be shown: copy-offers PROMOTION is false.
const APPROVED = {
  solo: { current: 5999 },
  team: { current: 24999 },
};
const docsDir = path.join(root, 'public', 'docs');

function priceProblems(indexHtml, dicts) {
  const { records, problems } = siteOffers({ indexHtml, i18n: dicts, codes, docsDir });
  const out = [...problems];
  for (const r of records) {
    const want = APPROVED[r.plan] && APPROVED[r.plan][r.kind];
    if (r.cents !== want) {
      out.push(`${r.where} shows ${money(r.cents)} as the ${r.kind} ${r.plan} price; the approved ` +
        `figure is ${want === undefined ? 'undefined' : money(want)}`);
    }
  }
  return { out, records };
}

// --- self-test: the predicates must reject planted defects ------------------
{
  const clone = () => JSON.parse(JSON.stringify(i18n));
  const other = codes.find((c) => c !== 'en');
  const swapCards = index.replace(/(<div class="price"><strong>)([^<]*)(<\/strong>[\s\S]*?<div class="price"><strong>)([^<]*)(<\/strong>)/,
    (_m, a, solo, b, team, c) => a + team + b + solo + c);
  // With no promotion, ANY regular price coming back in one language is the defect.
  const movedRegular = clone();
  movedRegular.fr.pricing.soloRegular = 'Prix normal 79,99 $';
  const englishTerm = clone();
  englishTerm[other].pricing.soloTerm = i18n.en.pricing.soloTerm;
  const noTerm = clone();
  delete noTerm[other].pricing.teamTerm;
  const affirmative = clone();
  affirmative.en.pricing.teamTerm = '1-year Team license · auto-renew on';
  const staleHidden = index.replace('</body>', '<div hidden>Was $29.99</div></body>');

  const plants = [
    ['Solo and Team card prices swapped', swapCards !== index && priceProblems(swapCards, i18n).out.length > 0],
    ['a struck-through regular price reappears in fr while no promotion runs', priceProblems(index, movedRegular).out.length > 0],
    ['a stale hidden price left in the page', priceProblems(staleHidden, i18n).out.length > 0],
    [`${other} term replaced by the English one`, termProblems(englishTerm).length > 0],
    [`${other} teamTerm deleted`, termProblems(noTerm).length > 0],
    ['en term says "auto-renew" affirmatively', termProblems(affirmative).length > 0],
  ];
  for (const [label, caught] of plants) {
    if (!caught) {
      console.error(`SELF-TEST FAILED: the planted defect "${label}" was accepted. This guard cannot ` +
        'fail for the reason it was written, so it proves nothing.');
      process.exit(2);
    }
  }
  console.log(`self-test: ${plants.length} planted defects rejected`);
}

// --- THE PUBLISHED HOMEPAGE, DOCS PAGE AND SCRIPTS (2026-10-04) --------------
// Everything above reads app.js and index.html. Since 2026-10-04 build.js publishes v2/index.html
// as the homepage and v2/docs/index.html as /docs/, and nothing a visitor is served reads app.js
// or index.html any more. So every rule above passed while the copy people actually read was held
// to none of them: the homepage could have said "$59.99/year" in German, or dropped "no
// subscription" from the Korean price card, and this guard would have stayed green. The rules
// below apply the same obligations to every entry of scripts/lib/published-copy.mjs (the pages,
// each language's homepage and docs JSON, and the English fallbacks in the scripts), which is the
// one place that knows where the published copy lives. The app.js / index.html checks above stay:
// those files are still built and shipped.
//
//   - no recurring-cadence suffix, in any entry, in visible text (tags, script and style bodies
//     removed from pages and JSON values; comments removed from scripts). The suffix list here
//     adds the French, German, Portuguese, Spanish and per-month spellings the old list never
//     needed, and a suffix only counts when no letter follows it, so "/android" is not "/an".
//   - no lifetime claim and no affirmative auto-renewal, in any entry.
//   - any JSON-LD Offer on a published page is not "annual" and says "no subscription".
//   - each plan card on the homepage states no subscription, the 1-year term and no renewal in
//     EVERY published language, in that language's own words (TERMS above). The card is found by
//     structure (<article class="plan">) and its text is resolved per language through the same
//     data-k keys i18n.js swaps, so a key a language leaves out shows English and fails there.
const PUBLISHED_CADENCE = [...CADENCE, '/an', '/jahr', '/mês', '/mes', '/mois', '/monat', '/月', '/월',
  '/месяц', '/سنة', '/شهر'];
const stripJsComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[\s;{}(),])\/\/[^\n]*/g, '$1');
const visibleOf = (e) => (e.kind === 'script' ? stripJsComments(e.text) : htmlText(e.text));

function cardTermProblems(entries, langs) {
  const out = [];
  const page = entries.find((e) => e.kind === 'page' && /<article\b[^>]*class="plan\b/.test(e.text));
  if (!page) return { out: ['no published page carries the homepage plan cards (<article class="plan">)'], cards: 0 };
  const homes = {};
  for (const e of entries) if (e.kind === 'home') homes[e.lang] = e.json;
  const cards = [...page.text.matchAll(/<article\b[^>]*class="plan\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g)];
  for (const [, card] of cards) {
    const plan = (/[?&]plan=(\w+)/.exec(card) || [])[1] || '?';
    // English as the page carries it, by key: i18n.js reads its English from these same elements.
    const en = {};
    for (const m of card.matchAll(/<(\w+)\b[^>]*\bdata-k="(t\d+)"[^>]*>([\s\S]*?)<\/\1>/g)) en[m[2]] = m[3];
    if (Object.keys(en).length === 0) { out.push(`${page.file} ${plan} plan card has no data-k text`); continue; }
    for (const lang of langs) {
      const t = TERMS[lang];
      if (!t) { out.push(`${lang}: no entry in TERMS, so the ${plan} card cannot be checked in this language`); continue; }
      const dict = lang === 'en' ? en : homes[lang];
      if (!dict) { out.push(`${lang}: no homepage dictionary among the published copy`); continue; }
      // A key missing from a language shows the English text there, which is what is checked.
      const text = htmlText(Object.keys(en).map((k) => (typeof dict[k] === 'string' ? dict[k] : en[k])).join(' \n '));
      const where = lang === 'en' ? `${page.file} ${plan} card` : `v2/i18n/${lang}.json ${plan} card [${Object.keys(en).join(', ')}]`;
      if (!has(text, t.oneTime)) out.push(`${where} does not say it is not a subscription in ${lang}: "${text.trim()}"`);
      if (!has(text, t.year)) out.push(`${where} does not state the 1-year term in ${lang}: "${text.trim()}"`);
      if (!has(text, t.noRenew)) out.push(`${where} does not state that it never auto-renews in ${lang}: "${text.trim()}"`);
    }
  }
  if (cards.length !== PLANS.length) out.push(`${page.file}: expected ${PLANS.length} plan cards, found ${cards.length}`);
  return { out, cards: cards.length };
}

function publishedProblems(entries, langs) {
  const out = [];
  let chars = 0;
  for (const e of entries) {
    const v = visibleOf(e);
    chars += v.length;
    const label = `${e.file}${e.lang && e.kind !== 'page' ? ` (${e.lang})` : ''}`;
    for (const c of PUBLISHED_CADENCE) {
      const re = new RegExp(c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '(?!\\p{L})', 'iu');
      const m = re.exec(v);
      if (m) {
        out.push(`${label} uses the recurring-cadence suffix "${c}": "${v.slice(Math.max(0, m.index - 40), m.index + 20).trim()}"`);
      }
    }
    const life = /lifetime access|lifetime licen[cs]e|forever/i.exec(v);
    if (life) out.push(`${label} claims lifetime access: "${v.slice(Math.max(0, life.index - 40), life.index + 30).trim()}"`);
    const renew = /auto-?renews\b|renews automatically|subscription will renew/i.exec(v);
    if (renew) out.push(`${label} describes automatic renewal: "${v.slice(Math.max(0, renew.index - 40), renew.index + 30).trim()}"`);
    if (e.kind === 'page') {
      for (const m of e.text.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        let data;
        try { data = JSON.parse(m[1]); } catch (err) { out.push(`${e.file}: a JSON-LD block is not valid JSON`); continue; }
        const visit = (node) => {
          if (Array.isArray(node)) return node.forEach(visit);
          if (!node || typeof node !== 'object') return;
          if (node['@type'] === 'Offer') {
            const cat = String(node.category || '');
            if (/annual/i.test(cat)) out.push(`${e.file} JSON-LD Offer "${node.name}" is categorised "${cat}", which reads as recurring`);
            if (!/no subscription/i.test(cat)) out.push(`${e.file} JSON-LD Offer "${node.name}" does not state no subscription ("${cat}")`);
          }
          Object.values(node).forEach((x) => { if (x && typeof x === 'object') visit(x); });
        };
        visit(data);
      }
    }
  }
  const cards = cardTermProblems(entries, langs);
  out.push(...cards.out);
  return { out, chars, cards: cards.cards };
}

let published;
let pubLangs;
try {
  pubLangs = publishedLangs();
  published = publishedCopy().map((e) => (e.kind === 'home' ? { ...e, json: JSON.parse(read(e.file)) } : e));
} catch (e) {
  console.error(`FAIL: could not read the published copy: ${e.message}`);
  process.exit(1);
}

// The same rules over planted copies, in memory only (nothing is written to a real file). Each
// must be caught, or this half of the guard proves nothing about the published copy.
{
  const base = publishedProblems(published, pubLangs).out.length;
  const homePage = published.find((e) => e.kind === 'page' && /<article\b[^>]*class="plan\b/.test(e.text));
  const otherLang = pubLangs.find((l) => l !== 'en' && published.some((e) => e.kind === 'home' && e.lang === l));
  const replaceIn = (pred, f) => published.map((e) => (pred(e) ? f(e) : e));
  const cardKeys = homePage
    ? [...homePage.text.matchAll(/<article\b[^>]*class="plan\b[\s\S]*?<\/article>/g)].flatMap((m) =>
      [...m[0].matchAll(/data-k="(t\d+)"/g)].map((k) => k[1]))
    : [];
  const englishCard = replaceIn((e) => e.kind === 'home' && e.lang === otherLang, (e) => {
    const json = { ...e.json };
    for (const k of cardKeys) delete json[k];
    return { ...e, json };
  });
  const plants = [
    ['a "/year" suffix in a homepage JSON value', [...published,
      { file: 'synthetic de home', lang: 'de', kind: 'home', text: '<b>59,99 $/Jahr</b>', json: {} }]],
    ['a "/yr" suffix in a script fallback string', [...published,
      { file: 'synthetic.js', lang: null, kind: 'script', text: 'var s = "$59.99/yr";' }]],
    ['a lifetime claim in a docs JSON value', [...published,
      { file: 'synthetic docs', lang: 'en', kind: 'docs', text: 'Buy once, lifetime access.' }]],
    ['an affirmative auto-renewal in the homepage', replaceIn((e) => e === homePage,
      (e) => ({ ...e, text: e.text.replace('</body>', '<p>Your license renews automatically.</p></body>') }))],
    ['a JSON-LD Offer categorised "annual"', replaceIn((e) => e === homePage,
      (e) => ({ ...e, text: e.text.replace(/("@type":\s*"Offer"[^}]*"category":\s*")[^"]*"/, '$1annual"') }))],
    [`the ${otherLang} plan cards left in English`, englishCard],
  ];
  if (!homePage || !otherLang || cardKeys.length === 0) {
    console.error('SELF-TEST FAILED: the published homepage plan cards could not be found, so no negative control can run');
    process.exit(2);
  }
  for (const [label, entries] of plants) {
    if (!(publishedProblems(entries, pubLangs).out.length > base)) {
      console.error(`SELF-TEST FAILED: negative control did not fire: the planted defect "${label}" in the ` +
        'published copy was accepted. This half of the guard cannot fail, so it proves nothing.');
      process.exit(2);
    }
  }
  // A comment in a script is not copy: "forever" in a code comment must not be read as a claim.
  if (publishedProblems([{ file: 'c.js', lang: null, kind: 'script', text: '/* forever */ // auto-renews\nvar u = "https://x/android";' }], pubLangs)
    .out.some((p) => /^c\.js/.test(p))) {
    console.error('SELF-TEST FAILED: a script comment or a URL was read as customer copy');
    process.exit(2);
  }
  console.log(`self-test (published copy): ${plants.length} planted defects rejected`);
}

const pub = publishedProblems(published, pubLangs);
for (const p of pub.out) check(false, `published copy: ${p}`);
// Positive control: an empty or truncated scan must not pass. The homepage alone is over 20 000
// characters of visible text in English; each language adds a homepage and a docs dictionary.
check(published.length >= 2 * pubLangs.length && pub.chars > 50000 && pub.cards === PLANS.length,
  'the published copy was actually scanned',
  `${published.length} entries, ${pub.chars} characters, ${pub.cards} plan cards`);

// --- the live site ----------------------------------------------------------
for (const p of termProblems(i18n)) check(false, p);
const { out: priceFails, records } = priceProblems(index, i18n);
for (const p of priceFails) check(false, p);
check(PLANS.every((plan) => records.some((r) => r.plan === plan)), 'every plan has price records');

if (fails) {
  console.error(`\ncheck-billing-copy: ${fails} failure(s).`);
  process.exit(1);
}
console.log(`check-billing-copy: OK. No subscription, 1-year term, no auto-renewal, in each of ` +
  `${codes.length} languages' own dictionary; ${records.length} displayed prices each equal the ` +
  'approved figure for its own plan. Published copy: ' +
  `${published.length} entries (${pub.chars} characters) free of cadence, lifetime and renewal wording; ` +
  `${pub.cards} homepage plan cards state all three in each of ${pubLangs.length} published languages.`);
