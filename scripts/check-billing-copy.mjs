// Billing wording must not read as a subscription.
//
// WHY THIS EXISTS. BugIt sells a ONE-TIME payment that grants a 365-day licence
// and never auto-renews. The site said "$39.99/year" and "Regular price
// $59.99/year", and the structured data tagged both offers `"category":
// "annual"`. Every one of those is a reasonable way to describe a recurring
// subscription, which is not what a customer is buying — and a buyer who thinks
// they subscribed and later sees no renewal (or fears an unwanted charge) has
// been misled by the copy, not by the product.
//
// The failure mode is that "/year" is genuinely ambiguous: it can mean "per year,
// recurring" or "for a year, once". Only the first reading is wrong, and nothing
// in a rendered page disambiguates it. So the rule is that every locale must
// state the one-time nature explicitly somewhere in the pricing block.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// --- every locale states the one-time nature explicitly --------------------
// Matched on the pricing keys rather than on prose, so a translation can be
// reworded freely as long as it still carries the meaning.
// app.js carries the pricing keys in BOTH quote styles: an older single-quoted
// generation and the later double-quoted add() calls that actually win at
// runtime. Matching only one style checks dead code and proves nothing, which is
// exactly the trap this guard fell into on its first draft.
const keyValues = (key) =>
  // The key itself is quoted in the double-quoted generation and bare in the
  // single-quoted one, so both forms have to be accepted.
  [...app.matchAll(new RegExp('["\']?' + key + '["\']?\\s*:\\s*["\']([^"\']*)["\']', 'g'))].map(
    (m) => m[1],
  );

const perYear = keyValues('perYear');
check(perYear.length >= 10, 'every locale defines the price-suffix key', `found ${perYear.length}`);

// One-time wording, per shipped language.
const ONE_TIME_MARKERS = [
  'one-time', 'buy once',
  '買い切り',            // ja
  'pago único',          // es
  'pagamento único',     // pt-br
  'pagamento unico',     // it
  '1회 결제',            // ko
  '一次性付款',           // zh
  'разовый платёж',      // ru
  'paiement unique',     // fr
  'einmalzahlung',       // de
];
for (const value of perYear) {
  check(
    ONE_TIME_MARKERS.some((m) => value.toLowerCase().includes(m.toLowerCase())),
    `the price suffix "${value}" does not state a one-time payment`,
    'Add the locale wording to ONE_TIME_MARKERS if this is a new language.',
  );
}

// --- every locale states the term and the absence of auto-renewal ----------
const soloTerms = keyValues('soloTerm');
const teamTerms = keyValues('teamTerm');
check(soloTerms.length === perYear.length, 'every locale defines soloTerm');
check(teamTerms.length === perYear.length, 'every locale defines teamTerm');

// "1 year" expressed in each shipped language, plus a no-renewal marker.
const YEAR_MARKERS = ['1-year', '1 year', '1年', '1 año', '1 ano', '1 anno', '1년', '1 年',
  'на 1 год', '1 an', '1-jahres'];
const NO_RENEW_MARKERS = [
  'does not auto-renew', 'auto-renew',
  '自動更新なし',                       // ja
  'no se renueva',                     // es
  'não renova',                        // pt-br
  'non si rinnova',                    // it
  '자동 갱신 없음',                     // ko
  '不自动续订',                         // zh
  'без автопродления',                 // ru
  'sans reconduction automatique',     // fr
  'keine automatische verlängerung',   // de
];
for (const [label, list] of [['soloTerm', soloTerms], ['teamTerm', teamTerms]]) {
  for (const value of list) {
    check(
      // Case-insensitive: German capitalises nouns ("1-Jahres-Solo-Lizenz").
      YEAR_MARKERS.some((m) => value.toLowerCase().includes(m.toLowerCase())),
      `${label} "${value}" does not state the 1-year term`,
    );
    check(
      NO_RENEW_MARKERS.some((m) => value.toLowerCase().includes(m.toLowerCase())),
      `${label} "${value}" does not state that it never auto-renews`,
    );
  }
}

// --- the claims that must NOT appear --------------------------------------
for (const [name, src] of [['app.js', app], ['index.html', index]]) {
  check(!/lifetime access|lifetime licen[cs]e|forever/i.test(src),
    `${name} must not claim lifetime access — the licence is 365 days`);
  check(!/auto-?renews\b|renews automatically|subscription will renew/i.test(src),
    `${name} must not describe automatic renewal`);
}

// The prices themselves are commercial truth and must not drift.
for (const price of ['39.99', '199', '59.99', '249.99']) {
  check(index.includes(price) || app.includes(price), `the price ${price} is still present`);
}

if (fails) {
  console.error(`\ncheck-billing-copy: ${fails} failure(s).`);
  process.exit(1);
}
console.log('check-billing-copy: OK — one-time payment, 1-year term, no auto-renewal, in every locale.');
