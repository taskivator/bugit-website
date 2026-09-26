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
      'It reads as a subscription. BugIt is a one-time payment.',
    );
  }
}

check(
  !/"category":\s*"annual"/.test(index),
  'structured data must not categorise the offers as "annual"',
  'Schema.org consumers read that as a recurring cadence.',
);
check(
  /"category":\s*"one-time purchase"/.test(index),
  'structured data must state the offers are one-time purchases',
);

// --- every locale states the one-time nature, the term and no renewal -------
// Per language, matched case-insensitively against that language's own effective value, so a
// translation can be reworded freely as long as it still carries the meaning in its own words.
// A shipped language with no entry here FAILS: add how it says these three things.
const TERMS = {
  en: { oneTime: ['one-time', 'buy once'], year: ['1-year', '1 year'],
    noRenew: ['does not auto-renew', 'never auto-renews', 'no auto-renewal', 'does not renew automatically'] },
  ja: { oneTime: ['買い切り'], year: ['1年'], noRenew: ['自動更新なし'] },
  es: { oneTime: ['pago único'], year: ['1 año'], noRenew: ['no se renueva'] },
  'pt-br': { oneTime: ['pagamento único'], year: ['1 ano'], noRenew: ['não renova'] },
  it: { oneTime: ['pagamento unico'], year: ['1 anno'], noRenew: ['non si rinnova'] },
  ko: { oneTime: ['1회 결제'], year: ['1년'], noRenew: ['자동 갱신 없음'] },
  zh: { oneTime: ['一次性付款'], year: ['1 年', '1年'], noRenew: ['不自动续订'] },
  ru: { oneTime: ['разовый платёж'], year: ['на 1 год'], noRenew: ['без автопродления'] },
  fr: { oneTime: ['paiement unique'], year: ['1 an'], noRenew: ['sans reconduction automatique'] },
  // Case-insensitive: German capitalises nouns ("1-Jahres-Solo-Lizenz").
  de: { oneTime: ['einmalzahlung'], year: ['1-jahres'], noRenew: ['keine automatische verlängerung'] },
  // ar: "a single payment", "for a period of one year" (Arabic states the duration in words, not
  // as "1 ..."), "does not renew automatically".
  ar: { oneTime: ['دفعة واحدة'], year: ['لمدة سنة'], noRenew: ['لا يُجدَّد تلقائيًا'] },
};
const has = (value, markers) =>
  typeof value === 'string' && markers.some((m) => value.toLowerCase().includes(m.toLowerCase()));

function termProblems(dicts) {
  const out = [];
  for (const code of codes) {
    const t = TERMS[code];
    if (!t) {
      out.push(`${code}: no entry in TERMS, so nothing can tell whether this language states a ` +
        'one-time payment, a 1-year term and no renewal');
      continue;
    }
    const p = (dicts[code] && dicts[code].pricing) || {};
    if (!has(p.perYear, t.oneTime)) {
      out.push(`${code} pricing.perYear "${p.perYear}" does not state a one-time payment in this language`);
    }
    for (const key of ['soloTerm', 'teamTerm']) {
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
const APPROVED = {
  solo: { current: 3999, regular: 5999 },
  team: { current: 19900, regular: 24999 },
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
  const movedRegular = clone();
  movedRegular.fr.pricing.soloRegular = 'Prix normal 49,99 $';
  const englishTerm = clone();
  englishTerm[other].pricing.soloTerm = i18n.en.pricing.soloTerm;
  const noTerm = clone();
  delete noTerm[other].pricing.teamTerm;
  const affirmative = clone();
  affirmative.en.pricing.teamTerm = '1-year Team license · auto-renew on';
  const staleHidden = index.replace('</body>', '<div hidden>Was $29.99</div></body>');

  const plants = [
    ['Solo and Team card prices swapped', swapCards !== index && priceProblems(swapCards, i18n).out.length > 0],
    ['fr regular price moved while $59.99 stays everywhere else', priceProblems(index, movedRegular).out.length > 0],
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

// --- the live site ----------------------------------------------------------
for (const p of termProblems(i18n)) check(false, p);
const { out: priceFails, records } = priceProblems(index, i18n);
for (const p of priceFails) check(false, p);
check(PLANS.every((plan) => records.some((r) => r.plan === plan)), 'every plan has price records');

if (fails) {
  console.error(`\ncheck-billing-copy: ${fails} failure(s).`);
  process.exit(1);
}
console.log(`check-billing-copy: OK. One-time payment, 1-year term, no auto-renewal, in each of ` +
  `${codes.length} languages' own dictionary; ${records.length} displayed prices each equal the ` +
  'approved figure for its own plan.');
