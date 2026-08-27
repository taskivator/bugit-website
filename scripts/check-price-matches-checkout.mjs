// A PRICE ON THIS SITE IS A PUBLIC OFFER. IT MUST BE THE PRICE THE CHECKOUT CHARGES.
//
// WHY THIS EXISTS, AND WHY check-billing-copy IS NOT IT. That guard ends with
//
//     // The prices themselves are commercial truth and must not drift.
//     for (const price of ['39.99', '199', '59.99', '249.99']) {
//       check(index.includes(price) || app.includes(price), ...);
//     }
//
// which asserts that four strings somebody typed here are still present in files in this
// repository. It cannot notice that the real price moved. If Stripe went to $49.99 tomorrow,
// bugit.dev would go on advertising $39.99, this guard would go on passing, and the first
// person to find out would be a buyer meeting a different number at the checkout. It is the
// hand-kept-list defect: a check whose subject is a list of the answers it expects.
//
// The authority for what a purchase costs is STRIPE, and the portal's /pricing page reads it
// live at request time. So this asks the only question that matters: is every price this site
// advertises a price the checkout actually offers?
//
// Direction matters. It asserts website ⊆ portal, not equality. The portal legitimately shows
// amounts this site does not (a tax example, a proration), and adding one there must not fail
// the marketing site. What must never happen is this site naming a number the checkout will
// not honour.
//
// FAILS, NEVER SKIPS, when the portal cannot be read. "Could not check" is the answer this
// project has most often mistaken for "fine", and the cost of a false green here is a
// misstated price on a public page.
//
// Run: node scripts/check-price-matches-checkout.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const PORTAL = process.env.PORTAL_ORIGIN || 'https://portal.bugit.dev';
const PRICING = `${PORTAL}/pricing`;

/**
 * Every money amount in a blob of text, normalised to a number of cents.
 *
 * A COMMA IS A DECIMAL POINT IN SIX OF THE ELEVEN LANGUAGES THIS SITE SHIPS. The first version
 * of this read `US$59,99` -- which is how Brazilian Portuguese correctly writes it -- as `$59`,
 * and reported that bugit.dev was advertising two prices the checkout does not offer. The site
 * was right and the guard was wrong, which is the worse direction: a false alarm on a price
 * page is how a real one gets waved through.
 *
 * So the separator is decided by what FOLLOWS it, not by which character it is: two trailing
 * digits are cents, three are a thousands group. `$1,234` and `$59,99` are both unambiguous
 * under that rule, and it is the same rule a reader applies.
 */
function amounts(text) {
  const out = new Map(); // cents -> the spelling it was written with
  for (const m of text.matchAll(/\$\s?\d[\d.,]*/g)) {
    // Trim a trailing separator: a price at the end of a sentence swallows the full stop,
    // and `59.99.` then parses as 5999 dollars. Found by the control below, which is what
    // a control is for.
    const raw = m[0].replace(/[^\d.,]/g, '').replace(/[.,]+$/, '');
    const tail = /[.,](\d{2})$/.exec(raw);
    const cents = tail ? Number(tail[1]) : 0;
    const wholePart = tail ? raw.slice(0, tail.index) : raw;
    const whole = Number(wholePart.replace(/[.,]/g, ''));
    if (!Number.isFinite(whole)) continue;
    const total = whole * 100 + cents;
    // Amounts under a plausible product price are almost always prose ("$1 of every sale"),
    // and including them would make this guard noisy in the direction that gets it ignored.
    if (total < 1000) continue;
    if (!out.has(total)) out.set(total, m[0]);
  }
  return out;
}


const money = (cents) => `$${(cents / 100).toFixed(2)}`;

// ---------------------------------------------------------------- the control
//
// Runs first, on every invocation. A comparison that has never failed is a comparison nobody
// has seen work, and this one only earns its place by being able to catch a moved price.
{
  const site = amounts('Solo $39.99 today, regular $59.99. Team $199 today, regular $249.99.');
  const ok = amounts('Solo $39.99 · $59.99 · Team $199.00 · $249.99 · plus $12.34 tax');
  const moved = amounts('Solo $49.99 · $59.99 · Team $199.00 · $249.99');
  const missingFrom = (a, b) => [...a.keys()].filter((c) => !b.has(c));

  if (missingFrom(site, ok).length !== 0) {
    console.error('SELF-TEST FAILED: an agreeing pair was reported as a mismatch:',
      missingFrom(site, ok).map(money).join(', '));
    process.exit(2);
  }
  if (missingFrom(site, moved).length !== 1 || missingFrom(site, moved)[0] !== 3999) {
    console.error('SELF-TEST FAILED: a moved price was not detected. This guard cannot fail, '
      + 'so it proves nothing.');
    process.exit(2);
  }
  // And the cheap mistakes in the other direction, both of which this guard made:
  //   * $199 and $199.00 are the same offer;
  //   * so are $59.99 and the pt-BR US$59,99, and the fr/de 59,99 $.
  const spellings = [
    ['$199', 19900], ['$199.00', 19900],
    ['$59.99', 5999], ['US$59,99', 5999], ['$59,99', 5999],
    ['$1,234.50', 123450], ['$1.234,50', 123450],
  ];
  for (const [written, cents] of spellings) {
    if (!amounts(written).has(cents)) {
      console.error(`SELF-TEST FAILED: ${written} did not read as ${money(cents)}, so the guard `
        + 'would fail on a difference in spelling rather than in price. Six of the eleven '
        + 'languages on this site write the decimal separator as a comma.');
      process.exit(2);
    }
  }
  console.log('self-test: the comparison catches a moved price and tolerates a spelling');
}

// ---------------------------------------------------------------- what this site advertises
const site = amounts(read('index.html') + '\n' + read('app.js'));
if (site.size === 0) {
  console.error('FAIL: no price found in index.html or app.js. Either the pricing block moved '
    + 'or this guard is now reading the wrong files -- an empty subject passes every '
    + 'comparison, which is how a sweep reports success over nothing.');
  process.exit(1);
}

// ---------------------------------------------------------------- what the checkout offers
let res;
try {
  res = await fetch(PRICING, { headers: { 'user-agent': 'bugit-price-agreement-check' } });
} catch (e) {
  console.error(`FAIL: could not reach ${PRICING}: ${e.message}\n`
    + '      This is a FAIL, not a skip. Re-run when the portal is reachable rather than '
    + 'shipping an unverified price.');
  process.exit(1);
}
// CHECK THE STATUS BEFORE YOU TRUST THE BODY. An error page is a perfectly stable document
// that contains no prices, which would read here as "the checkout offers nothing".
if (res.status !== 200) {
  console.error(`FAIL: ${PRICING} answered HTTP ${res.status}. Nothing was compared.`);
  process.exit(1);
}
const portal = amounts(await res.text());
if (portal.size === 0) {
  console.error(`FAIL: ${PRICING} returned 200 but named no price. Either the page renders its `
    + 'prices only in the browser, in which case this guard needs a browser, or the Stripe '
    + 'read failed and the page is showing a customer no prices at all.');
  process.exit(1);
}

// ---------------------------------------------------------------- the comparison
const missing = [...site.keys()].filter((c) => !portal.has(c)).sort((a, b) => a - b);

console.log(`\n  this site advertises: ${[...site.keys()].sort((a, b) => a - b).map(money).join(', ')}`);
console.log(`  the checkout offers:  ${[...portal.keys()].sort((a, b) => a - b).map(money).join(', ')}`);

if (missing.length > 0) {
  console.error(`\nFAIL: ${missing.length} price(s) advertised here that the checkout does not offer:\n`
    + missing.map((c) => `  - ${money(c)} (written as "${site.get(c)}")`).join('\n')
    + `\n\nA price on this site is a public offer. Either ${PRICING} is right and this site is `
    + 'stale, or Stripe was changed by mistake. Do not "fix" this by editing the number here '
    + 'until you know which.');
  process.exit(1);
}

console.log(`\ncheck-price-matches-checkout: OK — every advertised price is offered at ${PRICING}.`);
