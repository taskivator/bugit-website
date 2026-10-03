// A PRICE ON THIS SITE IS A PUBLIC OFFER. IT MUST BE THE PRICE THE CHECKOUT CHARGES.
//
// WHY THIS EXISTS, AND WHY check-billing-copy IS NOT IT. That guard compares the prices shown
// here with approved figures typed into it. It cannot notice that the real price moved. If
// Stripe went to $49.99 tomorrow, bugit.dev would go on advertising $39.99, that guard would go
// on passing, and the first person to find out would be a buyer meeting a different number at
// the checkout. It is the hand-kept-list defect: a check whose subject is a list of the answers
// it expects.
//
// The authority for what a purchase costs is STRIPE, and the portal's /pricing page reads it
// live at request time. So this asks the only question that matters: is every price this site
// advertises the price the checkout offers FOR THAT PLAN?
//
// FOR THAT PLAN (CR-08-F21). The first version reduced both sides to an unlabelled set of dollar
// amounts and asserted website-subset-of-portal. That loses which plan a number is the price of
// and whether it is today's price or the struck-through regular one: Solo and Team could swap
// prices on this site and the two sets stayed identical, and a stale amount anywhere in the
// source (a comment, a dead literal, an example) counted as an advertised price that "matched".
// Its dollar regex also skipped the `59,99 $` spelling French and German use and ignored every
// amount under ten dollars. Now both sides are PLAN RECORDS:
//
//   - this site: scripts/lib/copy-offers.mjs, one record per displayed price with its plan,
//     its kind (current or regular) and the surface it is on: the index.html price cards (plan
//     from the card's title key AND its ?plan= checkout link), every locale's effective regular
//     price, the JSON-LD offers, and the commercial-disclosure page in every language. An amount
//     it cannot attribute to a plan is itself a failure.
//   - the portal: each plan card on /pricing, found by its heading ("BugIt Solo"), with the
//     current price as the card's first amount that is not struck through and the regular price
//     as the struck-through (`line-through`) one. Script bodies are removed first, so the page's
//     hydration payload is never read as evidence.
//
// Every site record must equal the portal's figure for the same plan and kind. A plan the portal
// also sells (a future third card) does not fail this site; a plan or kind this site shows that
// the portal does not is a failure.
//
// FAILS, NEVER SKIPS, when the portal cannot be read. "Could not check" is the answer this
// project has most often mistaken for "fine", and the cost of a false green here is a
// misstated price on a public page. There is no offline mode and no credential: the portal's
// /pricing page is public.
//
// Run: node scripts/check-price-matches-checkout.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEffectiveI18n } from './lib/copy-effective-i18n.mjs';
import { siteOffers, amounts, money, PLANS, KINDS } from './lib/copy-offers.mjs';
import { publishedCopy, htmlText } from './lib/published-copy.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const PORTAL = process.env.PORTAL_ORIGIN || 'https://portal.bugit.dev';
const PRICING = `${PORTAL}/pricing`;

/**
 * The portal's plan cards: { solo: { current, regular }, team: {...} } in cents, plus problems.
 * A card is the markup from its `<h2>BugIt Solo</h2>` heading to the next <h2>.
 */
function portalOffers(html) {
  const problems = [];
  const offers = {};
  const page = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const heads = [...page.matchAll(/<h2\b[^>]*>\s*BugIt\s+(\w+)\s*<\/h2>/g)];
  for (let i = 0; i < heads.length; i++) {
    const plan = heads[i][1].toLowerCase();
    const start = heads[i].index + heads[i][0].length;
    const nextH2 = page.indexOf('<h2', start);
    const card = page.slice(start, nextH2 < 0 ? page.length : nextH2);
    if (offers[plan]) { problems.push(`the portal shows two cards for ${plan}`); continue; }
    const found = { current: [], regular: [] };
    // Each leaf element's own text, with the classes of that element.
    for (const m of card.matchAll(/<(\w+)\b([^>]*)>([^<]*)<\/\1>/g)) {
      const struck = /line-through/.test(m[2]);
      for (const a of amounts(m[3])) found[struck ? 'regular' : 'current'].push(a.cents);
    }
    offers[plan] = { current: found.current[0], regular: found.regular[0] };
  }
  for (const plan of PLANS) {
    if (!offers[plan]) problems.push(`the portal page has no "BugIt ${plan[0].toUpperCase()}${plan.slice(1)}" card`);
    else if (offers[plan].current === undefined) problems.push(`the portal's ${plan} card shows no current price`);
  }
  return { offers, problems };
}

// ---------------------------------------------------------------- the published copy (2026-10-04)
//
// Since 2026-10-04 build.js publishes v2/index.html as the homepage and v2/docs/index.html as
// /docs/. copy-offers reads index.html and app.js, which are still built but which no visitor is
// served, so until this was added the prices people actually read were compared with nothing: the
// homepage could have advertised $49.99 while this guard compared the old page with the checkout
// and passed. These records come from scripts/lib/published-copy.mjs, the one place that knows
// where the published copy lives, and join the copy-offers records in the same comparison.
//
//   - a published page's JSON-LD Offers, by offer name, exactly as copy-offers reads index.html's.
//   - a published page's plan cards (<article class="plan">): the plan comes from the card's
//     checkout link (?plan=solo), which must name one plan only, and the card heading must say the
//     same plan; the current price is the single amount in the card's <b> inside <p class="price">.
//     Translations swap only the data-k spans, so the <b> price is the price in every language.
//   - anything else is a price no check can bind to a plan, and is a problem: an amount in a page's
//     visible text outside the cards and the JSON-LD, in any value of any language's homepage or
//     docs JSON (which is where a translated card would carry one), or in a script's code.
//
// One narrow allowance: in a script, `$1` to `$9` with nothing after the digit is a
// String.replace back reference (docs.js renders Markdown with them), not a price.
function publishedOffers(entries) {
  const records = [];
  const problems = [];
  let scanned = 0;
  for (const e of entries) {
    scanned += e.text.length;
    if (e.kind === 'page') {
      let rest = e.text.replace(/<!--[\s\S]*?-->/g, ' ');
      for (const m of rest.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        let data;
        try { data = JSON.parse(m[1]); } catch (err) {
          problems.push(`${e.file}: a JSON-LD block is not valid JSON (${err.message})`);
          continue;
        }
        const visit = (node) => {
          if (Array.isArray(node)) return node.forEach(visit);
          if (!node || typeof node !== 'object') return;
          if (node['@type'] === 'Offer') {
            const plan = String(node.name || '').trim().toLowerCase();
            if (!PLANS.includes(plan)) problems.push(`${e.file} JSON-LD: an Offer named "${node.name}" is not a known plan`);
            else if (node.priceCurrency !== 'USD') problems.push(`${e.file} JSON-LD: the ${plan} Offer is not in USD`);
            else if (!/^\d+(?:\.\d{1,2})?$/.test(String(node.price))) {
              problems.push(`${e.file} JSON-LD: the ${plan} Offer price "${node.price}" is not a plain amount`);
            } else {
              records.push({ plan, kind: 'current', cents: Math.round(Number(node.price) * 100),
                where: `${e.file} JSON-LD Offer "${node.name}"` });
            }
          }
          Object.values(node).forEach((x) => { if (x && typeof x === 'object') visit(x); });
        };
        visit(data);
      }
      rest = rest.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, ' ');
      const cardRe = /<article\b[^>]*class="plan\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
      const seen = new Set();
      for (const m of rest.matchAll(cardRe)) {
        const card = m[1];
        const links = [...new Set([...card.matchAll(/[?&]plan=(\w+)/g)].map((x) => x[1]))];
        const plan = links.length === 1 && PLANS.includes(links[0]) ? links[0] : null;
        if (!plan) { problems.push(`${e.file}: a plan card sells plan(s) [${links.join(', ')}], not exactly one known plan`); continue; }
        const where = `${e.file} ${plan} plan card`;
        if (seen.has(plan)) problems.push(`${where}: there are two cards for this plan`);
        seen.add(plan);
        const head = /<h3\b[^>]*>([\s\S]*?)<\/h3>/.exec(card);
        if (!head || htmlText(head[1]).trim().toLowerCase() !== plan) {
          problems.push(`${where}: its heading "${head ? htmlText(head[1]).trim() : ''}" does not name the plan its link sells`);
        }
        const price = /<p\b[^>]*class="price\b[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(card);
        const b = price && /<b\b[^>]*>([\s\S]*?)<\/b>/.exec(price[1]);
        const cur = b ? amounts(htmlText(b[1])) : [];
        if (cur.length !== 1) problems.push(`${where}: expected exactly one amount in <p class="price"><b>, found ${cur.length}`);
        else records.push({ plan, kind: 'current', cents: cur[0].cents, where: `${where} (price)` });
        const others = amounts(htmlText(card)).length - cur.length;
        if (others > 0) problems.push(`${where}: carries ${others} amount(s) besides its price, which no check binds`);
      }
      rest = rest.replace(cardRe, ' ');
      for (const a of amounts(htmlText(rest))) {
        problems.push(`${e.file}: "${a.raw}" is a price outside the plan cards and the JSON-LD offers, so no `
          + 'check knows which plan it is the price of');
      }
    } else if (e.kind === 'home' || e.kind === 'docs') {
      for (const a of amounts(htmlText(e.text))) {
        problems.push(`${e.file}: "${a.raw}" is a price in translated copy; translations do not carry the `
          + 'price, so no check knows which plan it is the price of');
      }
    } else {
      const code = e.text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[\s;{}(),])\/\/[^\n]*/g, '$1');
      for (const a of amounts(code)) {
        if (/^\$[1-9]$/.test(a.raw)) continue;
        problems.push(`${e.file}: "${a.raw}" is a price written into a script, so no check knows which plan it is the price of`);
      }
    }
  }
  for (const plan of PLANS) {
    if (!records.some((r) => r.plan === plan && /plan card/.test(r.where))) problems.push(`no published plan card for ${plan}`);
    if (!records.some((r) => r.plan === plan && /JSON-LD/.test(r.where))) problems.push(`no published JSON-LD Offer for ${plan}`);
  }
  return { records, problems, scanned };
}

/** Site records against portal offers: the list of disagreements. */
function disagreements(records, offers) {
  const out = [];
  for (const r of records) {
    const p = offers[r.plan] && offers[r.plan][r.kind];
    if (p === undefined) {
      out.push(`${r.where} shows ${money(r.cents)} as the ${r.kind} ${r.plan} price, and the ` +
        `checkout's ${r.plan} card shows no ${r.kind} price at all`);
    } else if (p !== r.cents) {
      out.push(`${r.where} shows ${money(r.cents)} as the ${r.kind} ${r.plan} price; the checkout ` +
        `charges ${money(p)}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------- the control
//
// Runs first, on every invocation. A comparison that has never failed is a comparison nobody
// has seen work, and this one only earns its place by being able to catch a moved price, a
// swapped plan and a price shown in a spelling it has to read.
{
  const card = (plan, cur, reg) => `<h2 class="t">BugIt ${plan}</h2><div><span class="text-3xl">${cur}</span>`
    + `<span class="text-sm line-through">${reg}</span></div><p>Save 33%</p>`;
  const portalOk = portalOffers(`<main>${card('Solo', '$39.99', '$59.99')}${card('Team', '$199.00', '$249.99')}`
    + '<script>self.__next_f.push(["$$12.34"])</script></main>');
  const site = [
    { plan: 'solo', kind: 'current', cents: 3999, where: 'solo card' },
    { plan: 'solo', kind: 'regular', cents: 5999, where: 'fr soloRegular' },
    { plan: 'team', kind: 'current', cents: 19900, where: 'team card' },
    { plan: 'team', kind: 'regular', cents: 24999, where: 'de teamRegular' },
  ];
  const fail = (why) => { console.error(`SELF-TEST FAILED: ${why}`); process.exit(2); };
  if (portalOk.problems.length) fail(`an agreeing portal page was misread: ${portalOk.problems.join('; ')}`);
  if (disagreements(site, portalOk.offers).length) {
    fail(`an agreeing pair was reported as a mismatch: ${disagreements(site, portalOk.offers).join('; ')}`);
  }
  // A plan swap leaves the SET of amounts unchanged. It must still fail, on both plans.
  const swapped = portalOffers(`${card('Solo', '$199.00', '$249.99')}${card('Team', '$39.99', '$59.99')}`);
  if (disagreements(site, swapped.offers).length !== 4) {
    fail('a plan swap on the checkout was not detected on every record. The comparison has lost '
      + 'plan identity, which is the defect this guard was rewritten to remove.');
  }
  const moved = portalOffers(`${card('Solo', '$49.99', '$59.99')}${card('Team', '$199.00', '$249.99')}`);
  const m = disagreements(site, moved.offers);
  if (m.length !== 1 || !/solo card/.test(m[0])) fail('a moved price was not detected. This guard cannot fail.');
  // The regular price is gone from the checkout (the promotion ended): the site's "regular
  // price" line is now a claim the checkout does not make.
  const noReg = portalOffers(`<h2>BugIt Solo</h2><span>$39.99</span>${card('Team', '$199.00', '$249.99')}`);
  if (disagreements(site, noReg.offers).length !== 1) fail('a regular price the checkout no longer shows was not detected');
  // A page with no Team card, and a page whose price lives only in the script payload.
  if (!portalOffers(card('Solo', '$39.99', '$59.99')).problems.length) fail('a missing Team card was not reported');
  if (!portalOffers('<h2>BugIt Solo</h2><h2>BugIt Team</h2><script>"$39.99"</script>').problems.length) {
    fail('prices present only in a script body were accepted as the checkout offer');
  }
  // The same offer in every spelling this site uses, and small amounts are amounts.
  const spellings = [
    ['$199', 19900], ['$199.00', 19900], ['$59.99', 5999], ['US$59,99', 5999], ['US$ 39,99', 3999],
    ['59,99 $', 5999], ['39,99 USD', 3999], ['39.99 美元', 3999], ['39,99 долл. США', 3999],
    ['$1,234.50', 123450], ['$1.234,50', 123450], ['$9.99', 999],
  ];
  for (const [written, cents] of spellings) {
    const got = amounts(written);
    if (got.length !== 1 || got[0].cents !== cents) {
      fail(`${written} did not read as ${money(cents)}, so the guard would fail on a difference in `
        + 'spelling rather than in price, or miss a price entirely. Six of the eleven languages on '
        + 'this site write the decimal separator as a comma, and two put the currency after it.');
    }
  }
  console.log('self-test: the comparison catches a moved price, a swapped plan and a withdrawn '
    + 'regular price, and tolerates every spelling');
}

// ---------------------------------------------------------------- what this site advertises
let site;
try {
  const { i18n, codes } = loadEffectiveI18n(path.join(root, 'app.js'));
  site = siteOffers({ indexHtml: read('index.html'), i18n, codes, docsDir: path.join(root, 'public', 'docs') });
} catch (e) {
  console.error(`FAIL: could not read this site's prices: ${e.message}`);
  process.exit(1);
}
// The published copy: read, controlled in memory, then joined to the comparison.
let published;
try {
  const entries = publishedCopy();
  published = publishedOffers(entries);
  // Negative controls, on copies held in memory only (nothing is written to a real file). Each
  // planted defect must add a disagreement or a problem over the unplanted copy, measured against
  // checkout offers taken from that copy's own cards, so the control does not depend on today's
  // prices being right.
  const fail = (why) => { console.error(`SELF-TEST FAILED: negative control did not fire: ${why}`); process.exit(2); };
  const home = entries.find((e) => e.kind === 'page' && /<article\b[^>]*class="plan\b/.test(e.text));
  if (!home) fail('no published page carries the plan cards, so nothing can be planted');
  const asOffers = {};
  for (const r of published.records) if (/plan card/.test(r.where)) asOffers[r.plan] ||= { current: r.cents };
  const score = (es) => { const o = publishedOffers(es); return o.problems.length + disagreements(o.records, asOffers).length; };
  const base = score(entries);
  const swap = (from, to) => entries.map((e) => {
    if (e !== home) return e;
    const text = to(e.text);
    if (text === e.text) fail(`could not plant "${from}": the homepage no longer has the shape this control edits`);
    return { ...e, text };
  });
  const soloCard = (t) => /<article\b[^>]*class="plan\b[\s\S]*?\?plan=solo[\s\S]*?<\/article>/.exec(t)[0];
  const plants = [
    ['the Solo card price moved', swap('card price', (t) => t.replace(soloCard(t),
      soloCard(t).replace(/(<p\b[^>]*class="price[^>]*>\s*<b>)[^<]*/, (_m, a) => `${a}$12.34`)))],
    ['the Solo JSON-LD Offer price moved', swap('JSON-LD price', (t) => t.replace(/("name":\s*"Solo",\s*"price":\s*")[^"]*/, (_m, a) => `${a}12.34`))],
    ['the two cards sell each other\'s plan', swap('checkout links', (t) => t.replace(/\?plan=solo/g, '?plan=TMP')
      .replace(/\?plan=team/g, '?plan=solo').replace(/\?plan=TMP/g, '?plan=team'))],
    ['a stray price in the homepage outside the cards', swap('stray price', (t) => t.replace('</body>', '<p hidden>Was $29.99</p></body>'))],
    ['a price in a translated homepage value', [...entries, { file: 'synthetic fr home', lang: 'fr', kind: 'home', text: 'Seulement 49,99 $' }]],
    ['a price in a docs JSON value', [...entries, { file: 'synthetic ja docs', lang: 'ja', kind: 'docs', text: '39.99 美元' }]],
    ['a price in a script fallback', [...entries, { file: 'synthetic.js', lang: null, kind: 'script', text: 'var p = "$9.99";' }]],
  ];
  for (const [label, es] of plants) if (!(score(es) > base)) fail(`"${label}" was accepted`);
  // The allowance stays narrow: a back reference is not a price (the $9.99 plant above shows a real one still is).
  if (publishedOffers([{ file: 'r.js', kind: 'script', text: 's.replace(re, "<b>$1</b>$2")' }]).problems.some((p) => /^r\.js/.test(p))) {
    fail('a String.replace back reference was read as a price');
  }
  console.log(`self-test (published copy): ${plants.length} planted defects rejected`);
  // Positive control: the published copy was actually read, not an empty list.
  if (entries.length < 20 || published.scanned < 100000) {
    console.error(`FAIL: the published copy scan read ${entries.length} entries (${published.scanned} characters); `
      + 'that is not the published site');
    process.exit(1);
  }
} catch (e) {
  console.error(`FAIL: could not read the published copy's prices: ${e.message}`);
  process.exit(1);
}
site.problems.push(...published.problems);
site.records.push(...published.records);

if (site.problems.length) {
  console.error('FAIL: this site shows prices that cannot all be bound to a plan, so they cannot be '
    + 'compared with the checkout:\n' + site.problems.map((p) => `  - ${p}`).join('\n'));
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
//
// From here on a failure sets process.exitCode instead of calling process.exit(): once fetch
// has opened a connection, exiting while its socket is still closing trips a libuv assertion on
// Windows ("UV_HANDLE_CLOSING") and the process dies with 127 and a crash message in place of
// the diagnosis. It still failed, but nobody could read why.
const body = await res.text();
function verdict() {
  if (res.status !== 200) {
    console.error(`FAIL: ${PRICING} answered HTTP ${res.status}. Nothing was compared.`);
    return 1;
  }
  const portal = portalOffers(body);
  if (portal.problems.length) {
    console.error(`FAIL: ${PRICING} returned 200 but its plan cards could not be read:\n`
      + portal.problems.map((p) => `  - ${p}`).join('\n')
      + '\n      Either the page renders its prices only in the browser, in which case this guard '
      + 'needs a browser, or the Stripe read failed and the page is showing a customer no prices.');
    return 1;
  }
  return compare(portal);
}

// ---------------------------------------------------------------- the comparison
function compare(portal) {
  const wrong = disagreements(site.records, portal.offers);

  const show = (o) => PLANS.map((p) => `${p} ${KINDS.map((k) => (o[p] && o[p][k] !== undefined
    ? `${k} ${money(o[p][k])}` : `${k} none`)).join(', ')}`).join('; ');
  const siteSummary = {};
  for (const r of site.records) {
    siteSummary[r.plan] ||= {};
    siteSummary[r.plan][r.kind] = r.cents;
  }
  console.log(`\n  this site advertises: ${show(siteSummary)} (${site.records.length} displayed prices)`);
  console.log(`  the checkout offers:  ${show(portal.offers)}`);

  if (wrong.length > 0) {
    console.error(`\nFAIL: ${wrong.length} displayed price(s) disagree with the checkout's price for the same plan:\n`
      + wrong.map((w) => `  - ${w}`).join('\n')
      + `\n\nA price on this site is a public offer. Either ${PRICING} is right and this site is `
      + 'stale, or Stripe was changed by mistake. Do not "fix" this by editing the number here '
      + 'until you know which.');
    return 1;
  }

  console.log(`\ncheck-price-matches-checkout: OK. Each of ${site.records.length} displayed prices equals `
    + `the checkout's price for the same plan and kind at ${PRICING}.`);
  return 0;
}

process.exitCode = verdict();
