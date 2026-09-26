/*
 * EVERY PRICE THIS SITE SHOWS, BOUND TO THE PLAN IT IS THE PRICE OF.
 *
 * WHY THIS EXISTS (CR-08-F12, CR-08-F21). Two guards held the site's prices, and both reduced
 * them to loose numbers. check-billing-copy asked whether the string "39.99" occurred anywhere
 * in index.html or app.js; check-price-matches-checkout collected every dollar amount in both
 * files into one unlabelled set and asked whether the portal's page contained the same set.
 * Neither knew which plan a number belonged to, or whether it was the price a buyer pays today
 * or the regular price struck through beside it. So Solo and Team could swap prices and both
 * stayed green (the set is unchanged), and a visible price could move while a stale copy of the
 * old one, in a comment, a dead dictionary literal or another locale, kept the number "present".
 * The suffix spelling French and German use, `59,99 $`, was not even read as a price.
 *
 * WHAT THIS RETURNS. One record per displayed price: { plan, kind, cents, currency, where }.
 * `plan` is "solo" or "team", `kind` is "current" (what is charged now) or "regular" (the
 * struck-through reference price), and `where` names the exact surface, so a disagreement can
 * say which one moved. The surfaces, each bound to its plan by STRUCTURE rather than by
 * proximity:
 *
 *   - index.html price cards: the card's plan comes from its title key (pricing.soloTitle), and
 *     its checkout link must carry the same plan (?plan=solo), so a card cannot show one plan's
 *     title and sell the other. The current price is the amount inside <div class="price">; the
 *     regular price is the amount inside that card's pricing.<plan>Regular span, whose key must
 *     name the same plan.
 *   - every locale's EFFECTIVE dictionary (scripts/lib/copy-effective-i18n.mjs): the regular
 *     price is pricing.soloRegular / pricing.teamRegular as applyLang() will render it, one
 *     record per shipped language, and a language without one is a problem, not a skip.
 *   - the Schema.org offers in the JSON-LD block, by offer name, with priceCurrency.
 *   - the commercial-disclosure page in every language (TOKUSHOHO*.md), which states each
 *     plan's price on its own line.
 *
 * And an amount it cannot attribute is a problem too: a currency amount anywhere else in the
 * visible page (after comments, the JSON-LD block and the price cards are set aside), or in any
 * other key of any effective dictionary, is a price a buyer could read that no check binds to a
 * plan. That is how a stale hidden price used to satisfy a presence check.
 *
 * WHAT IT DOES NOT DO. It does not say what the prices SHOULD be. check-billing-copy compares
 * these records with the approved figures; check-price-matches-checkout compares them with the
 * portal's live price cards. Tax and regional formatting are not modelled: every accepted
 * spelling is a US dollar amount.
 */
import fs from "node:fs";
import path from "node:path";
import { walkStrings } from "./copy-effective-i18n.mjs";

export const PLANS = ["solo", "team"];
export const KINDS = ["current", "regular"];

// A US dollar amount, with the currency before it ($59.99, US$59,99, US$ 39,99) or after it
// (59,99 $, 39,99 USD, 39.99 美元, 39,99 долл. США). Other currencies are deliberately not read:
// a price shown in euros would then have no record, and a missing record is a failure.
const AMOUNT = /(?:US\$|\$)\s?(\d[\d.,]*)|(\d[\d.,]*)\s?(?:US\$|\$|USD\b|美元|долл\.)/g;

/**
 * Every US dollar amount in a string, as { cents, raw }.
 *
 * A COMMA IS A DECIMAL POINT IN SIX OF THE ELEVEN LANGUAGES THIS SITE SHIPS, so the separator is
 * decided by what FOLLOWS it, not by which character it is: two trailing digits are cents, three
 * are a thousands group. `$1,234` and `$59,99` are both unambiguous under that rule, and it is
 * the same rule a reader applies.
 */
export function amounts(text) {
  const out = [];
  for (const m of String(text).matchAll(AMOUNT)) {
    // Trim a trailing separator: a price at the end of a sentence swallows the full stop.
    const raw = (m[1] || m[2]).replace(/[.,]+$/, "");
    if (!/\d/.test(raw)) continue;
    const tail = /[.,](\d{2})$/.exec(raw);
    const cents = tail ? Number(tail[1]) : 0;
    const whole = Number((tail ? raw.slice(0, tail.index) : raw).replace(/[.,]/g, ""));
    if (!Number.isFinite(whole)) continue;
    out.push({ cents: whole * 100 + cents, raw: m[0].trim() });
  }
  return out;
}

export const money = (cents) => `$${(cents / 100).toFixed(2)}`;

const stripTags = (html) => html.replace(/<[^>]+>/g, " ");

/** The price cards, the JSON-LD offers and anything left over, from one index.html. */
function fromIndex(html, records, problems) {
  let rest = html.replace(/<!--[\s\S]*?-->/g, "");
  // JSON-LD offers.
  const ld = [...rest.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  let offers = 0;
  for (const m of ld) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) {
      problems.push(`index.html: a JSON-LD block is not valid JSON (${e.message})`);
      continue;
    }
    const visit = (node) => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      if (node["@type"] === "Offer") {
        offers++;
        const plan = String(node.name || "").trim().toLowerCase();
        if (!PLANS.includes(plan)) {
          problems.push(`index.html JSON-LD: an Offer named "${node.name}" is not a known plan`);
        } else if (node.priceCurrency !== "USD") {
          problems.push(`index.html JSON-LD: the ${plan} Offer has priceCurrency ` +
            `"${node.priceCurrency}", not USD`);
        } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(node.price))) {
          problems.push(`index.html JSON-LD: the ${plan} Offer price "${node.price}" is not a plain amount`);
        } else {
          records.push({ plan, kind: "current", cents: Math.round(Number(node.price) * 100),
            currency: "USD", where: `index.html JSON-LD Offer "${node.name}"` });
        }
      }
      for (const v of Object.values(node)) if (v && typeof v === "object") visit(v);
    };
    visit(data);
  }
  if (offers === 0) problems.push("index.html: the JSON-LD block carries no Offer at all");
  rest = rest.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, " ");

  // Price cards.
  const cardRe = /<article\b[^>]*class="[^"]*\bprice-card\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  const seen = new Set();
  for (const m of rest.matchAll(cardRe)) {
    const card = m[1];
    const titles = [...card.matchAll(/data-t="pricing\.(\w+)Title"/g)].map((x) => x[1]);
    const plan = titles.length === 1 && PLANS.includes(titles[0]) ? titles[0] : null;
    if (!plan) {
      problems.push(`index.html: a price card has title key(s) [${titles.join(", ")}], not exactly ` +
        `one of ${PLANS.map((p) => `pricing.${p}Title`).join(", ")}`);
      continue;
    }
    const where = `index.html ${plan} price card`;
    if (seen.has(plan)) problems.push(`${where}: there are two cards for this plan`);
    seen.add(plan);
    const links = [...card.matchAll(/[?&]plan=(\w+)/g)].map((x) => x[1]);
    if (links.length === 0 || links.some((p) => p !== plan)) {
      problems.push(`${where}: its checkout link sells plan [${links.join(", ")}], not ${plan}, so ` +
        "the card shows one plan and sells another");
    }
    const priceDiv = /<div\b[^>]*class="[^"]*\bprice\b[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(card);
    const cur = priceDiv ? amounts(stripTags(priceDiv[1])) : [];
    if (cur.length !== 1) {
      problems.push(`${where}: expected exactly one amount in <div class="price">, found ${cur.length}`);
    } else {
      records.push({ plan, kind: "current", cents: cur[0].cents, currency: "USD", where: `${where} (price)` });
    }
    const regKeys = [...card.matchAll(/data-t="pricing\.(\w+)Regular"[^>]*>([^<]*)</g)];
    if (regKeys.length !== 1 || regKeys[0][1] !== plan) {
      problems.push(`${where}: expected one pricing.${plan}Regular span, found ` +
        `[${regKeys.map((r) => `pricing.${r[1]}Regular`).join(", ")}]`);
    } else {
      const reg = amounts(regKeys[0][2]);
      if (reg.length !== 1) {
        problems.push(`${where}: expected exactly one amount in its regular-price text, found ${reg.length}`);
      } else {
        records.push({ plan, kind: "regular", cents: reg[0].cents, currency: "USD",
          where: `${where} (regular, no-script fallback)` });
      }
    }
  }
  for (const plan of PLANS) if (!seen.has(plan)) problems.push(`index.html: no price card for ${plan}`);
  rest = rest.replace(cardRe, " ");

  // Anything left over is a price nothing binds to a plan.
  for (const a of amounts(stripTags(rest))) {
    problems.push(`index.html: "${a.raw}" is a price outside the price cards and the JSON-LD ` +
      "offers, so no check knows which plan it is the price of");
  }
}

/** The regular price in every shipped language, and any stray amount in the dictionaries. */
function fromDictionaries(i18n, codes, records, problems) {
  for (const code of codes) {
    const dict = i18n[code];
    if (!dict) { problems.push(`${code}: no effective dictionary`); continue; }
    for (const plan of PLANS) {
      const key = `${plan}Regular`;
      const value = dict.pricing && dict.pricing[key];
      const where = `${code} pricing.${key}`;
      if (typeof value !== "string") { problems.push(`${where} is not defined`); continue; }
      const found = amounts(value);
      if (found.length !== 1) {
        problems.push(`${where} ("${value}") should carry exactly one US dollar amount, found ${found.length}`);
        continue;
      }
      records.push({ plan, kind: "regular", cents: found[0].cents, currency: "USD", where });
    }
    for (const [key, value] of walkStrings(dict)) {
      if (/^pricing\.(?:solo|team)Regular$/.test(key)) continue;
      for (const a of amounts(value)) {
        problems.push(`${code} ${key}: "${a.raw}" is a price outside the plan price keys, so no ` +
          "check knows which plan it is the price of");
      }
    }
  }
}

/** Each plan's price on the commercial-disclosure page, in every shipped language. */
function fromCommerceDocs(docsDir, codes, records, problems) {
  for (const code of codes) {
    const file = code === "en" ? "TOKUSHOHO.md" : `TOKUSHOHO.${code}.md`;
    const p = path.join(docsDir, file);
    if (!fs.existsSync(p)) { problems.push(`public/docs/${file} is missing`); continue; }
    const lines = fs.readFileSync(p, "utf8").split("\n").map(stripTags);
    const bound = new Set();
    for (const plan of PLANS) {
      const name = `BugIt ${plan[0].toUpperCase()}${plan.slice(1)}`;
      const priced = lines
        .map((l, i) => [i, l])
        .filter(([, l]) => new RegExp(`^\\s*-\\s*${name}\\s*[:：]`).test(l));
      if (priced.length !== 1) {
        problems.push(`public/docs/${file}: expected one "${name}: <price>" line, found ${priced.length}`);
        continue;
      }
      const [i, l] = priced[0];
      bound.add(i);
      const found = amounts(l);
      if (found.length !== 1) {
        problems.push(`public/docs/${file}: the ${name} line should carry one US dollar amount, found ${found.length}`);
        continue;
      }
      records.push({ plan, kind: "current", cents: found[0].cents, currency: "USD",
        where: `public/docs/${file} (${name})` });
    }
    lines.forEach((l, i) => {
      if (bound.has(i)) return;
      for (const a of amounts(l)) {
        problems.push(`public/docs/${file}: "${a.raw}" is a price outside the plan price lines`);
      }
    });
  }
}

/**
 * All displayed price records and the problems met collecting them.
 * Inputs are passed in (not read here) so a guard can feed planted copies to its self-test.
 */
export function siteOffers({ indexHtml, i18n, codes, docsDir }) {
  const records = [];
  const problems = [];
  fromIndex(indexHtml, records, problems);
  fromDictionaries(i18n, codes, records, problems);
  if (docsDir) fromCommerceDocs(docsDir, codes, records, problems);
  // Every plan must have both kinds from somewhere, or a comparison over the records is over
  // nothing for that slot.
  for (const plan of PLANS) {
    for (const kind of KINDS) {
      if (!records.some((r) => r.plan === plan && r.kind === kind)) {
        problems.push(`no ${kind} price for ${plan} was found on any surface`);
      }
    }
  }
  return { records, problems };
}
