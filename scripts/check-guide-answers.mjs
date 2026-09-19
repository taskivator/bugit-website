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

import { ANSWER_AT, answerFor, buildPreparedBank, contentWords, guessLanguage, languageFromBank, matchPrepared, normalizeExact, termsOf, undash } from "../public/guide/match.js";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
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

test("no answer carries an en or em dash, in any language", () => {
  for (const lang of ["en", "ar", "de", "es", "fr", "it", "ja", "ko", "pt-br", "ru", "zh"]) {
    const raw = readFileSync(here(`../public/guide/prepared/${lang}.json`), "utf8");
    assert.ok(!raw.includes("—") && !raw.includes("–"), `${lang} carries a dash`);
  }
  assert.equal(undash("a — b", "en"), "a, b");
  assert.equal(undash("2026—2027", "en"), "2026-2027");
});

test("the widget asks for nothing but this site's own files", () => {
  const widget = readFileSync(here("../public/guide/guide.js"), "utf8");
  const fetches = [...widget.matchAll(/fetch\(([^,)]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(fetches, ['BANK_BASE + code + ".json"', "SOURCES_URL"]);
  for (const forbidden of ["anthropic", "api.", "challenges.cloudflare.com", "/api/guide"]) {
    assert.ok(!widget.toLowerCase().includes(forbidden), `the widget still mentions ${forbidden}`);
  }
});
