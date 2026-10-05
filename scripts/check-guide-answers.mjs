// The website Guide answers from the bank, or it offers a person. Nothing else.
//
// THE POINT OF THIS FILE IS THE NEGATIVE CONTROL. A matcher that answers everything is not a
// matcher, it is a confident wrong answer generator, and the whole reason the website Guide is
// allowed to run without a model is that it says "I don't know" honestly. So every case that must
// ANSWER is paired with one that must NOT, and the thresholds are exercised from both sides.
//
// It lives in scripts/, not beside the code it tests: anything under public/ is PUBLISHED, and
// check-assets refuses a published file that imports a node: builtin, because a browser cannot run
// it. A test shipped to bugit.dev is developer tooling handed to every visitor.
//
// Run: node scripts/check-guide-answers.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { performance } from "node:perf_hooks";

import { ANSWER_AT, answerFor, buildPreparedBank, contentWords, guessLanguage, languageFromBank, matchPrepared, normalizeExact, relatedTo, termsOf, undash } from "../public/guide/match.js";
import { amounts, money as usd, PLANS } from "./lib/copy-offers.mjs";
import { htmlText, publishedCopy } from "./lib/published-copy.mjs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
// Read a source file with its line endings NORMALISED.
//
// This repo has no .gitattributes and core.autocrlf is on, so git checks these
// files out CRLF on Windows and LF on CI's Linux runner. Several assertions below
// read guide.js as text and find the I18N table with patterns containing a literal
// newline. On a CRLF checkout those matched ZERO times, and the guard then reported
// "0 language sections" -- which reads as eleven missing translations and is
// actually a line ending. Red on every fresh Windows clone, green in CI forever,
// and the failure names the wrong thing, which is the worst part. Normalising on
// read costs nothing and removes the whole class.
const readText = (p) => readFileSync(here(p), "utf8").replace(/\r\n/g, "\n");
const load = (lang) => JSON.parse(readFileSync(here(`../public/guide/prepared/${lang}.json`), "utf8"));
const bankOf = (...langs) => buildPreparedBank(langs.map(load));

const en = bankOf("en");
const items = load("en").items;
const byId = Object.fromEntries(items.map((i) => [i.id, i]));

test("the bank is the whole of BugIt's prepared answers, in every language", () => {
  for (const lang of ["en", "ar", "de", "es", "fr", "it", "ja", "ko", "pt-br", "ru", "zh"]) {
    const doc = load(lang);
    assert.equal(doc.lang, lang);
    assert.equal(doc.items.length, 410, `${lang} has ${doc.items.length} items`);
    assert.equal(doc.items.filter((i) => i.kind === "intent").length, 18);
  }
});

test("a question written exactly as the bank writes it is answered word for word", () => {
  const entry = items.find((i) => i.kind === "entry");
  const got = answerFor(en, "en", entry.question);
  assert.equal(got.kind, "answer");
  assert.equal(got.item.id, entry.id);
  assert.equal(got.answer, entry.answer);
});

test("a question asked in the customer's own words still reaches the right answer", () => {
  const got = answerFor(en, "en", "Does BugIt work with Jira and Azure DevOps?");
  assert.equal(got.kind, "answer");
  assert.match(got.answer.toLowerCase(), /jira/);
});

test("NEGATIVE CONTROL: a question the bank cannot answer is never answered", () => {
  for (const q of ["how many cats live in Tokyo", "what is the capital of Peru", "write me a poem about bananas"]) {
    const got = answerFor(en, "en", q);
    assert.notEqual(got.kind, "answer", `${q} was answered`);
  }
});

test("a topic only a person can settle offers a person, not an answer", () => {
  const refund = byId["intent:refund-request"];
  const got = answerFor(en, "en", refund.question);
  assert.equal(got.kind, "person");
  assert.equal(got.item.reply, refund.reply);
  assert.ok(!got.item.answer, "a person topic carries no prepared answer");
});

test("every handoff reply points at the email, and none at a form that is not there", () => {
  for (const lang of ["en", "de", "es", "fr", "it", "ja", "ko", "pt-br", "ru", "zh", "ar"]) {
    for (const item of load(lang).items.filter((i) => i.kind === "intent")) {
      assert.match(item.reply, /support@bugit\.dev/, `${lang} ${item.id}`);
    }
  }
});

test("a near miss offers questions to pick from rather than guessing between them", () => {
  const got = answerFor(en, "en", "install");
  assert.equal(got.kind, "suggest");
  // ONE IS A LEGITIMATE ANSWER HERE, and the widget has a separate line for it -- see the two
  // tests below. This assertion used to be the whole of the story, and `>= 1` under a test named
  // "rather than guessing between them" is how the single-option case went unnoticed: there is
  // nothing to guess between, and the sentence the visitor was shown said there was.
  assert.ok(got.questions.length >= 1 && got.questions.length <= 3);
});

test("one meaningful word is never enough to answer with", () => {
  assert.equal(contentWords("terminal", "en"), 1);
  const top = matchPrepared(en, "en", "terminal", 1)[0];
  assert.ok(!top || top.sim <= 0.7, "a one word question was scored above the suggestion cap");
});

test("a file name keeps its punctuation, and a hyphenated word does not", () => {
  assert.equal(normalizeExact("set-up.exe"), "set-up.exe");
  assert.notEqual(normalizeExact("set-up.exe"), normalizeExact("setup.exe"));
  assert.equal(normalizeExact("e-mail"), "email");
  // Japanese writes a name against the next word or apart, as it pleases: one key either way.
  assert.equal(normalizeExact("CLAUDE.mdは"), normalizeExact("CLAUDE.md は"));
});

test("set up and setup are one term, so both spellings find the same answer", () => {
  assert.ok(termsOf("how do I set up Jira", "en").has("setup"));
  assert.ok(termsOf("how do I setup Jira", "en").has("setup"));
});

test("the answer is in the language the visitor wrote in", () => {
  const both = bankOf("en", "de");
  assert.equal(guessLanguage("Wie viel kostet BugIt und wie kann ich es kaufen?"), "de");
  const got = answerFor(both, "de", "Wie viel kostet BugIt und wie kann ich es kaufen?");
  assert.notEqual(got.kind, "none");
  if (got.kind === "answer") assert.ok(!/^[A-Za-z ,.]+$/.test(got.answer.slice(0, 60)), "a German question got an English answer");
});

test("a short question the word lists cannot read is settled by the bank", () => {
  const both = bankOf("en", "de");
  assert.equal(guessLanguage("Was kostet BugIt?"), null);
  assert.equal(languageFromBank(both, "Was kostet BugIt?"), "de");
});

test("Japanese and Chinese questions are answered from their own bank", () => {
  for (const [lang, q] of [["ja", "BugIt は Jira に対応していますか？"], ["zh", "BugIt 支持 Jira 吗？"]]) {
    const bank = bankOf(lang);
    const got = answerFor(bank, lang, q);
    assert.notEqual(got.kind, "none", `${lang} found nothing at all`);
  }
});

test("the threshold is the one measured, and it is not lowered by accident", () => {
  assert.equal(ANSWER_AT, 0.8);
});

/**
 * THE CONSTANT IS NOT THE BEHAVIOUR. Asserting ANSWER_AT === 0.8 passes while the comparison that
 * reads it is changed, and a review proved it: with the check inside confidentMatch lowered to 0.5,
 * all sixteen tests passed and "how do I turn off the sound" was answered with "How do I stop BugIt
 * emails?" (0.52). The off-topic negative controls cannot catch that, because they score around 0.2
 * and any threshold rejects them. These questions score BETWEEN the two, which is the only place a
 * lowered threshold shows.
 */
test("NEGATIVE CONTROL: a question that only half matches is offered, never answered", () => {
  const between = ["how do I turn off the sound", "does the license work if I reinstall Windows", "can I change the colour of the report"];
  let scored = 0;
  for (const q of between) {
    const top = matchPrepared(en, "en", q, 1)[0];
    if (!top || top.sim < 0.35 || top.sim >= ANSWER_AT) continue;   // not in the band today
    scored += 1;
    assert.notEqual(answerFor(en, "en", q).kind, "answer", `${q} (${top.sim.toFixed(2)}) was answered`);
  }
  assert.ok(scored >= 1, "no question landed between the suggest floor and the answer threshold");
});

test("the starter cards the Guide offers can all be answered by the bank it reads", () => {
  // Two could not: tapping them showed "I'm not sure which of these you mean", the Guide failing its
  // own suggestion. They are the first thing a visitor sees, in every language.
  const widget = readText("../public/guide/guide.js");
  const table = widget.slice(widget.indexOf("const I18N = {"), widget.indexOf("---------- helpers"));
  const langs = [...table.matchAll(/\n    "?([a-z-]+)"?: \{/g)].map((m) => m[1]);
  const cardSets = [...table.matchAll(/cards: \[(.*?)\],\n/gs)].map((m) => [...m[1].matchAll(/q: "((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]));
  assert.equal(langs.length, 11);
  assert.equal(cardSets.length, 11);
  for (const [i, lang] of langs.entries()) {
    const bank = bankOf(lang);
    for (const q of cardSets[i]) {
      assert.equal(answerFor(bank, lang, q).kind, "answer", `${lang} card: ${q}`);
    }
  }
});

test("related questions are never the same question twice", () => {
  for (const lang of ["en", "fr", "ar", "de", "ja"]) {
    const bank = bankOf(lang);
    for (const item of load(lang).items.filter((i) => i.kind !== "intent").slice(0, 120)) {
      const related = relatedTo(bank, lang, item);
      assert.equal(new Set(related).size, related.length, `${lang} ${item.id}: ${related.join(" | ")}`);
      assert.ok(!related.includes(item.question), `${lang} ${item.id} offers itself`);
    }
  }
});

test("an address in the question does not decide the language", () => {
  // "com" is a Portuguese function word, so two URLs used to make an English question Portuguese,
  // and the visitor was handed a Portuguese answer and half a megabyte of the wrong bank.
  // Abstaining is the right answer for these: with the addresses set aside there is not enough left
  // to tell, and the site's language stands. What must never happen is a confident WRONG reading,
  // which is what the address used to produce.
  for (const q of ["Error 403 from https://acme.com and https://cdn.acme.com", "support@acme.com bounced, try ops@acme.com?", "jira.acme.com portal.acme.com login?"]) {
    assert.notEqual(guessLanguage(q), "pt-br", q);
  }
  // Real words still decide, addresses or not.
  assert.equal(guessLanguage("Wie kann ich das in https://acme.com einrichten und was kostet es?"), "de");
  assert.equal(guessLanguage("How do I set this up and what does it cost?"), "en");
});

test("a script inside a web address does not decide the language", () => {
  // The addresses were set aside before the Latin tally and before the word vote, but NOT before
  // the script tally, so one Chinese path segment in a URL made an English question Chinese: the
  // visitor got the Chinese bank, a Chinese answer and a Chinese hand-off card.
  assert.notEqual(guessLanguage("How do I install BugIt? https://example.com/中文中文中文"), "zh");
  assert.equal(guessLanguage("How do I install BugIt and what does it cost? https://example.com/中文中文中文"), "en");
  // And a real Japanese sentence is still Japanese when it carries a number, which is why the
  // script tally may not use the whole neutral list: Japanese is written without spaces, so one
  // digit would otherwise delete the sentence around it.
  assert.equal(guessLanguage("Solo ライセンスは3台のパソコンで使えますか？"), "ja");
  assert.equal(guessLanguage("BugIt 支持 11 个跟踪器吗？"), "zh");
});

test("the language fallback is capped too, not only the answering", () => {
  // The 600 character cap covered answerFor and not languageFromBank, which matches the question
  // against EVERY downloaded bank: 2000 characters measured 314ms with three banks loaded, on the
  // main thread, before the capped stage was even reached.
  const three = bankOf("en", "de", "ja");
  const long = "अ".repeat(4000);
  const started = performance.now();
  languageFromBank(three, long);
  const took = performance.now() - started;
  assert.ok(took < 60, `the language fallback took ${took.toFixed(0)}ms on a 4000 character question`);
});

test("a long question cannot lock up the page it runs in", () => {
  // The scan for file names backtracks on a long run with no separator: 2000 Japanese characters
  // measured 178ms on the main thread, three times per question. Matching stops at MATCH_LIMIT.
  const ja = bankOf("ja");
  const started = Date.now();
  answerFor(ja, "ja", "安装".repeat(1000));
  const took = Date.now() - started;
  assert.ok(took < 60, `a 2000 character question took ${took}ms`);
});

test("the Guide has a separate line for when there is only one thing to tap", () => {
  // `answerFor` returns one to three suggestions. The plural line asks which of THESE the
  // visitor means and to tap the one CLOSEST, and with a single option both halves are false.
  // Measured on the 2,358 real questions in 08-test-evidence/2026-09-14-prototype-chatbot-corpus:
  // 77 of them, 3.3%, across all eleven languages, produce exactly one suggestion.
  const widget = readText("../public/guide/guide.js");
  assert.match(widget, /const DID_YOU_MEAN_ONE = \{/, "the single-option line is missing");
  // Declared is not used. This is the line that chooses between the two, and without it the
  // table above is decoration -- the exact shape of a guard that checks a constant exists while
  // the code that reads it says something else.
  assert.match(
    widget,
    /decision\.questions\.length === 1 \? DID_YOU_MEAN_ONE : DID_YOU_MEAN/,
    "the single-option line is declared but never chosen",
  );
  const one = JSON.parse("{" + widget.match(/const DID_YOU_MEAN_ONE = \{([\s\S]*?)\n  \};/)[1] + "}");
  const many = JSON.parse("{" + widget.match(/const DID_YOU_MEAN = \{([\s\S]*?)\n  \};/)[1] + "}");
  assert.deepEqual(Object.keys(one).sort(), Object.keys(many).sort(), "the two lines cover different languages");
  assert.equal(Object.keys(one).length, 11);
  for (const [lang, text] of Object.entries(one)) {
    assert.ok(text.trim().length > 0, `${lang} is empty`);
    assert.notEqual(text, many[lang], `${lang} repeats the plural line`);
    // The owner's standing rule, and these are customer-facing sentences in eleven languages.
    assert.doesNotMatch(text, /[–—]/, `${lang} contains an en or em dash`);
  }
});

test("prepared/common.json is the same copy the widget renders", () => {
  // The widget builds these lines in rather than fetching them, and common.json is PUBLISHED
  // beside the answer banks. Nothing read it: on 2026-09-22 it was referenced in one comment and
  // nowhere else, so the file a person would naturally edit was inert while the real copy sat in
  // guide.js. Two copies of one sentence with nothing comparing them is how a corrected string
  // survives in one of them, which this repository has recorded before.
  const widget = readText("../public/guide/guide.js");
  const common = JSON.parse(readFileSync(here("../public/guide/prepared/common.json"), "utf8"));
  for (const [key, name] of [["did_you_mean", "DID_YOU_MEAN"], ["did_you_mean_one", "DID_YOU_MEAN_ONE"]]) {
    const inline = JSON.parse("{" + widget.match(new RegExp("const " + name + " = \\{([\\s\\S]*?)\\n  \\};"))[1] + "}");
    assert.deepEqual(common[key], inline, `prepared/common.json ${key} has drifted from ${name} in guide.js`);
  }
});

test("every label the widget asks for exists in all eleven languages", () => {
  const widget = readText("../public/guide/guide.js");
  const table = widget.slice(widget.indexOf("const I18N = {"), widget.indexOf("---------- helpers"));
  const langs = [...table.matchAll(/\n    "?([a-z-]+)"?: \{\n/g)].map((m) => m[1]);
  const asked = new Set([...widget.matchAll(/\bt\("([a-zA-Z]+)"/g)].map((m) => m[1]));
  const sections = table.split(/\n    "?[a-z-]+"?: \{\n/).slice(1);
  assert.equal(sections.length, 11, `${sections.length} language sections`);
  for (const [i, section] of sections.entries()) {
    for (const key of asked) {
      assert.match(section, new RegExp("\\b" + key + ': "'), `${langs[i]} is missing ${key}`);
    }
  }
});

// Every dash-like codepoint, the same list the Portal's dictionaries are swept with. Hyphen-minus
// (U+002D) is not here: "one-time" and "SHA-256" are ordinary hyphenation, not the rule. The pair
// alone was not enough: nine NON-BREAKING HYPHENs were living in this bank and passed, a character
// that same Portal gate counts as a dash.
const DASHES = new Map([
  [0x2010, "HYPHEN"], [0x2011, "NON-BREAKING HYPHEN"], [0x2012, "FIGURE DASH"], [0x2013, "EN DASH"],
  [0x2014, "EM DASH"], [0x2015, "HORIZONTAL BAR"], [0x2212, "MINUS SIGN"], [0xfe58, "SMALL EM DASH"],
  [0xfe63, "SMALL HYPHEN-MINUS"], [0xff0d, "FULLWIDTH HYPHEN-MINUS"],
]);

test("no answer carries a dash of any kind, in any language", () => {
  const offenders = [];
  for (const lang of ["en", "ar", "de", "es", "fr", "it", "ja", "ko", "pt-br", "ru", "zh"]) {
    const raw = readFileSync(here(`../public/guide/prepared/${lang}.json`), "utf8");
    for (const [cp, name] of DASHES) {
      const at = raw.indexOf(String.fromCodePoint(cp));
      if (at >= 0) offenders.push(`${lang} (${name}): ...${raw.slice(Math.max(0, at - 40), at + 40)}...`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join(" | "));
  // NEGATIVE CONTROL: the sweep can see one when there is one.
  const planted = [..."BugIt files to eleven trackers — all at once"].map((c) => c.codePointAt(0)).filter((cp) => DASHES.has(cp));
  assert.deepEqual(planted.map((cp) => DASHES.get(cp)), ["EM DASH"]);
  assert.equal(undash("a — b", "en"), "a, b");
  assert.equal(undash("2026—2027", "en"), "2026-2027");
});

test("the widget asks for nothing but this site's own files", () => {
  const widget = readText("../public/guide/guide.js");
  const fetches = [...widget.matchAll(/fetch\(([^,)]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(fetches, ['BANK_BASE + code + ".json"', "SOURCES_URL"]);
  for (const forbidden of ["anthropic", "api.", "challenges.cloudflare.com", "/api/guide"]) {
    assert.ok(!widget.toLowerCase().includes(forbidden), `the widget still mentions ${forbidden}`);
  }
});

/**
 * EVERY WAY A BROWSER CAN SPEAK, not just fetch. A review added two lines to this widget, one
 * navigator.sendBeacon in the feedback button and one new Image().src on close, each carrying the
 * whole conversation to a third party. Both guards passed: this one because it read `fetch(` alone,
 * and check-guide.mjs because it never clicks feedback and never closes the panel.
 */
test("the widget's fetches may read, and may not speak", () => {
  const code = readText("../public/guide/guide.js");
  // A request is not safe because of where it goes. `fetch(url, { headers: { "x-q": question } })`
  // is same-origin, is a GET, and hands the conversation to this site's CDN: the browser guard
  // used to pass it and so did every test here. The only second argument allowed is the one that
  // asks for JSON.
  const calls = [...code.matchAll(/fetch\(([^;]*?)\);/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
  assert.ok(calls.length >= 1, "no fetch found at all; has the widget stopped reading its own files?");
  for (const call of calls) {
    const comma = call.indexOf(",");
    if (comma === -1) continue;                       // fetch(url) alone reads and nothing more
    // An abort signal is the one other thing allowed, spelled exactly: it lets the Guide give up on
    // a stalled download (2026-09-24) and carries nothing to anybody. Anything else still fails.
    const init = call
      .slice(comma + 1)
      .trim()
      .replace(/,\s*signal: ctrl \? ctrl\.signal : undefined,?\s*\}$/, " }");
    assert.equal(init, '{ headers: { accept: "application/json" } }', `a fetch does more than read: ${call.slice(0, 120)}`);
  }
});

test("no other way of speaking to the network is in the widget at all", () => {
  const code = readText("../public/guide/guide.js") + readText("../public/guide/match.js");
  const ways = [
    /\bsendBeacon\b/, /\bnew Image\b/, /\bWebSocket\b/, /\bEventSource\b/, /\bXMLHttpRequest\b/,
    /\bnavigator\.geolocation\b/, /\bimport\s*\(/, /\bRTCPeerConnection\b/, /\bBroadcastChannel\b/,
    /<form/i, /\baction:\s*["']http/i, /\bwindow\.open\b/, /\blocation\.(?:href|assign|replace)\s*=/,
    /\bdocument\.cookie\b/, /\blocalStorage\b/,
  ];
  for (const way of ways) assert.ok(!way.test(code), `the widget can reach the network or the disk via ${way}`);
  // Anchors it builds: only the mailto handoff and links the markdown allowlist has already passed.
  const anchors = [...code.matchAll(/h\("a",\s*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.equal(anchors.length, 2, "a new anchor appeared; say where its address comes from");
  // One is the handoff's mailto, built from the visitor's own text and encoded. The other is a
  // Sources chip, whose address comes from sources.json and goes through the SAME allowlist as
  // every link inside an answer, which is the line asserted below.
  assert.ok(anchors.some((x) => /href: mailtoFor\(hd\)/.test(x)), anchors.join(" || "));
  assert.ok(anchors.some((x) => /class: "bgd-chip", href,/.test(x)), anchors.join(" || "));
  assert.match(code, /allowedLink\(l\.href\)/, "the Sources chips no longer check their address");
});

// ---------------------------------------------------------------- the Guide's prices, bound to their plan
//
// THE BANK IS A CLAIM SURFACE, AND IT WAS IN NONE OF THE CLAIM GUARDS (measured 2026-09-22): the
// Guide answers 410 questions in eleven languages and states the prices in many of them, and no
// claim guard read public/guide/prepared/*.json. A price is a public offer.
//
// WHAT THE FIRST VERSION OF THIS GUARD GOT WRONG (audit 2026-10-05, F-11). It compared the SET of
// amounts in each bank with the set in ../index.html. Two defects, each enough on its own:
//   - ../index.html is the RETIRED single page. Since 2026-10-04 build.js publishes v2/index.html
//     as the homepage, so the baseline was a page nobody is served: the homepage could move a
//     price and this guard would keep comparing the Guide with the old one.
//   - A set forgets which plan a number belongs to. "Solo $249.99; Team $59.99" produces the same
//     set as the true sentence, so swapped prices passed.
//
// WHAT IT DOES NOW.
//   - The baseline is the published homepage, found through scripts/lib/published-copy.mjs (the one
//     place that knows where the published copy lives), read from its plan cards the way
//     check-price-matches-checkout reads them: the plan comes from the card's checkout link
//     (?plan=solo), its heading must name the same plan, and the price is the single amount in
//     <p class="price"><b>. Amounts are parsed by scripts/lib/copy-offers.mjs `amounts`, which
//     already handles a decimal comma and a trailing currency (59,99 $). No price is written here:
//     check-billing-copy owns the approved figures and check-price-matches-checkout owns whether
//     Stripe agrees; this guard only says the Guide and the published page name the same price for
//     the same plan.
//   - Every amount in every answer is bound to a plan. The banks write the plan names in Latin
//     script in every language ("Solo", "Team"), and in one of two orders: plan first ("Solo:
//     $59.99", "Soloが$59.99", "Solo 版 $59.99", "Team license ... at $249.99") or amount first
//     ("$59.99 for Solo", "$59.99 لخطة Solo", "59,99 $ для Solo"). Within one sentence, the order
//     is decided by whichever comes first, a plan name or an amount, and each amount is bound to the
//     plan name on that side of it with no other amount in between. An amount that cannot be bound
//     is a failure, not a skip: it is a price no check knows the plan of.
//   - The unknown-amount scan stays: an amount that is no plan's price fails on its own.
//   - A bank that names no price at all is also wrong.
const GUIDE_LANGS = ["en", "ar", "de", "es", "fr", "it", "ja", "ko", "pt-br", "ru", "zh"];
const PLAN_NAME = { solo: "Solo", team: "Team" };

/** Each plan's price on a published page's plan cards, as { solo: cents, team: cents }. */
function publishedPlanPrices(html) {
  const out = {};
  const problems = [];
  const cards = [...html.replace(/<!--[\s\S]*?-->/g, " ").matchAll(/<article\b[^>]*class="plan\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g)];
  for (const [, card] of cards) {
    const links = [...new Set([...card.matchAll(/[?&]plan=(\w+)/g)].map((x) => x[1]))];
    const plan = links.length === 1 && PLANS.includes(links[0]) ? links[0] : null;
    if (!plan) { problems.push(`a plan card sells [${links.join(", ")}], not exactly one known plan`); continue; }
    const head = /<h3\b[^>]*>([\s\S]*?)<\/h3>/.exec(card);
    if (!head || htmlText(head[1]).trim().toLowerCase() !== plan) problems.push(`the ${plan} card's heading does not name ${plan}`);
    const b = /<p\b[^>]*class="price\b[^"]*"[^>]*>\s*<b\b[^>]*>([\s\S]*?)<\/b>/.exec(card);
    const found = b ? amounts(htmlText(b[1])) : [];
    if (found.length !== 1) { problems.push(`the ${plan} card has ${found.length} amounts in <p class="price"><b>`); continue; }
    if (plan in out) problems.push(`two cards sell ${plan}`);
    out[plan] = found[0].cents;
  }
  for (const plan of PLANS) if (!(plan in out)) problems.push(`no plan card for ${plan}`);
  if (problems.length) throw new Error(`the published homepage's plan cards could not be read: ${problems.join("; ")}`);
  return out;
}

/** Every amount in one answer, each with the plan it is bound to (or null), sentence by sentence. */
function boundAmounts(text) {
  const out = [];
  const plain = String(text).replace(/\*\*|__|`/g, "");
  // A sentence ends at a line break, at CJK full stops, or at . ! ? followed by a space. A decimal
  // point is never followed by a space, so "$59.99" is never split.
  for (const sentence of plain.split(/\n|[。！？]|[.!?](?=\s)/)) {
    const tokens = [];
    let from = 0;
    for (const a of amounts(sentence)) {
      const at = sentence.indexOf(a.raw, from);
      tokens.push({ type: "amount", at, cents: a.cents, raw: a.raw });
      from = at + a.raw.length;
    }
    if (!tokens.length) continue;
    for (const [plan, name] of Object.entries(PLAN_NAME)) {
      for (const m of sentence.matchAll(new RegExp(`(?<![A-Za-z])${name}(?![a-z])`, "g"))) {
        tokens.push({ type: "plan", at: m.index, plan });
      }
    }
    tokens.sort((x, y) => x.at - y.at);
    const planFirst = tokens[0].type === "plan";
    tokens.forEach((t, i) => {
      if (t.type !== "amount") return;
      let plan = null;
      const step = planFirst ? -1 : 1;
      for (let j = i + step; j >= 0 && j < tokens.length; j += step) {
        if (tokens[j].type === "amount") break;
        plan = tokens[j].plan;
        break;
      }
      out.push({ cents: t.cents, raw: t.raw, plan, sentence: sentence.trim() });
    });
  }
  return out;
}

/** What is wrong with one language's bank against the published plan prices. */
function guidePriceProblems(doc, prices) {
  const problems = [];
  const known = new Set(Object.values(prices));
  let stated = 0;
  for (const item of doc.items) {
    for (const field of ["answer", "reply"]) {
      if (!item[field]) continue;
      for (const a of boundAmounts(item[field])) {
        stated++;
        const where = `${doc.lang} ${item.id} ${field}: "${a.raw}" in "${a.sentence.slice(0, 120)}"`;
        if (!known.has(a.cents)) {
          problems.push(`${where} is no plan's price; the published homepage states ` +
            PLANS.map((p) => `${PLAN_NAME[p]} ${usd(prices[p])}`).join(", "));
        } else if (!a.plan) {
          problems.push(`${where} is not bound to a plan name in its sentence, so nothing checks which plan it prices`);
        } else if (a.cents !== prices[a.plan]) {
          problems.push(`${where} is stated as the ${PLAN_NAME[a.plan]} price; the published homepage's ` +
            `${PLAN_NAME[a.plan]} card says ${usd(prices[a.plan])}`);
        }
      }
    }
  }
  if (!stated) problems.push(`${doc.lang} names no price at all, which is also wrong`);
  return problems;
}

const homepage = () => {
  const page = publishedCopy().find((e) => e.kind === "page" && /<article\b[^>]*class="plan\b/.test(e.text));
  assert.ok(page, "no published page carries the plan cards; published-copy.mjs and the homepage disagree");
  return page;
};

test("every price the Guide states is the published price of the plan it names", () => {
  const page = homepage();
  assert.equal(page.file, "v2/index.html", "the plan cards moved; this guard must follow the published homepage");
  const prices = publishedPlanPrices(page.text);
  for (const lang of GUIDE_LANGS) {
    assert.deepEqual(guidePriceProblems(load(lang), prices), [], `the ${lang} Guide disagrees with the published homepage`);
  }
});

test("the Guide price guard rejects what the amount-set comparison let through (negative controls)", () => {
  // Every control is a copy held in memory. Nothing is written to a bank or a page.
  const page = homepage();
  const prices = publishedPlanPrices(page.text);
  const clean = (doc) => guidePriceProblems(doc, prices);
  const swapAmounts = (s, a, b) => s.split(a).map((part) => part.split(b).join("\u0000")).join(b).split("\u0000").join(a);
  const editOne = (doc, id, edit) => {
    let hit = 0;
    const items = doc.items.map((i) => {
      if (i.id !== id) return i;
      const answer = edit(i.answer);
      if (answer !== i.answer) hit++;
      return { ...i, answer };
    });
    assert.equal(hit, 1, `${doc.lang} ${id}: the control could not be planted; the answer changed shape`);
    return { ...doc, items };
  };
  // The old predicate, kept here only to prove each control is one it missed.
  const oldSet = (s) => new Set([...s.matchAll(/(?:US\s?\$|\$)\s?(\d{1,3}(?:[.,]\d{2})?)/g)].map((m) => m[1].replace(",", ".")));
  const oldPasses = (doc, baseline) => {
    const site = oldSet(baseline);
    return [...oldSet(doc.items.map((i) => `${i.answer ?? ""}\n${i.reply ?? ""}`).join("\n"))].every((v) => site.has(v));
  };
  const retired = readText("../index.html");

  // 0. The predicates themselves: binding in both orders, and a decimal comma read as cents.
  const bound = (s) => boundAmounts(s).map((a) => [a.plan, a.cents]);
  assert.deepEqual(bound("Solo: $59.99. Team: $249.99."), [["solo", 5999], ["team", 24999]]);
  assert.deepEqual(bound("BugIt costs $59.99 for Solo and $249.99 for Team."), [["solo", 5999], ["team", 24999]]);
  assert.deepEqual(bound("Solo 59,99 $ und Team 249,99 $."), [["solo", 5999], ["team", 24999]]);
  assert.deepEqual(bound("BugItの料金はSoloが$59.99、Teamが$249.99です。"), [["solo", 5999], ["team", 24999]]);
  assert.deepEqual(bound("It costs $59.99."), [[null, 5999]], "an amount with no plan in its sentence must stay unbound");

  // 1. Swapped plans, both original amounts still present (the audit's own example).
  const en = load("en");
  assert.deepEqual(clean(en), []);
  const swapped = editOne(en, "lb-001", (s) => swapAmounts(s, "$59.99", "$249.99"));
  assert.ok(oldPasses(swapped, retired), "control 1 is not one the amount-set comparison missed");
  assert.ok(clean(swapped).some((p) => /lb-001 .* is stated as the Solo price/.test(p)), "Solo $249.99 / Team $59.99 was accepted");
  const auditExample = { lang: "en", items: [{ id: "x", answer: "Solo $249.99; Team $59.99" }] };
  assert.equal(clean(auditExample).length, 2, "the audit's swapped sentence was accepted");

  // 2. A wrong price in one translated answer only: German states the Solo price for Team, written
  //    with the decimal comma and trailing currency German uses. Every other answer and language is
  //    untouched, and both amounts remain elsewhere in the bank.
  const de = load("de");
  assert.deepEqual(clean(de), []);
  const deWrong = editOne(de, "core:c-07", (s) => s.replace("**Team: 249,99 $**", "**Team: 59,99 $**"));
  assert.ok(oldPasses(deWrong, retired), "control 2 is not one the amount-set comparison missed");
  const deProblems = clean(deWrong);
  assert.equal(deProblems.length, 1, deProblems.join("\n"));
  assert.match(deProblems[0], /^de core:c-07 answer: .* stated as the Team price/);
  // ...and a translated answer with an amount that is no plan's price is still caught by the scan.
  const jaWrong = editOne(load("ja"), "lb-004", (s) => s.replace("$249.99", "$199.99"));
  assert.ok(clean(jaWrong).some((p) => /^ja lb-004 .* is no plan's price/.test(p)), "an unknown amount in Japanese was accepted");

  // 3. The published homepage moves a price while the retired index.html is unchanged. The Guide
  //    still says $59.99, so it must now be rejected, which the old baseline could never do.
  const solo = /<article\b[^>]*class="plan\b[\s\S]*?\?plan=solo[\s\S]*?<\/article>/.exec(page.text)[0];
  const moved = page.text.replace(solo, solo.replace(/(<p\b[^>]*class="price[^>]*>\s*<b>)[^<]*/, (_m, a) => `${a}$69.99`));
  assert.notEqual(moved, page.text, "control 3 could not be planted; the homepage's plan card changed shape");
  const movedPrices = publishedPlanPrices(moved);
  assert.equal(movedPrices.solo, 6999);
  assert.ok(oldPasses(en, retired), "control 3 is not one the retired baseline missed");
  assert.ok(guidePriceProblems(en, movedPrices).some((p) => /is no plan's price/.test(p)), "a v2 price change did not reach the Guide check");

  // 4. A bank that states no price, and a price with no plan beside it, are failures too.
  assert.deepEqual(clean({ lang: "xx", items: [{ id: "x", answer: "No prices here." }] }), ["xx names no price at all, which is also wrong"]);
  assert.match(clean({ lang: "xx", items: [{ id: "x", answer: "It costs $59.99." }] })[0], /not bound to a plan name/);
});
