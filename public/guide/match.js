// The website Guide's answers: the prepared bank, matched in the visitor's own browser.
//
// NO MODEL AND NO SERVER. The owner's decision of 2026-09-17 is that the Portal Guide may spend up
// to one dollar per customer per month on Haiku, and that the WEBSITE Guide spends nothing: it
// answers from the prepared bank or it offers a person. bugit.dev is a static site on Cloudflare
// Pages with no backend at all, so this file is the whole answering machinery, and the only thing
// it ever fetches is one of BugIt's own language files from this same origin. A visitor's question
// never leaves their browser, which is also why the privacy policy needs nothing new for it.
//
// THE RULES ARE THE PORTAL'S, ON PURPOSE. This is a port of the Portal's lib/assistant/prepared.ts
// (and lib/assistant/language.ts), so the same question gets the same answer on both surfaces. It is
// the CORRECTED copy: the prototype's older lib/prepared.mjs still keys exact matches with every
// punctuation mark stripped, which made `set-up.exe` and `setup.exe` one key, and marked the edges of
// a name, which made "CLAUDE.mdは" and "CLAUDE.md は" two. Both were fixed in the Portal under Codex
// review on 2026-09-20 and the fixes are carried here rather than reintroduced.
//
// A wrong prepared answer is worse than none: it is confident and it is not about the question. So a
// match carries a similarity between 0 and 1 (how much of the question the phrasing covers AND how
// much of the phrasing the question covers, weighted by how rare each word is), and `answerFor`
// answers only above a threshold measured on questions that are not in the bank.
//
// No imports, and nothing but standard JavaScript: it runs in the browser as a module and under
// plain `node --test` for its own tests.

export const PREPARED_LANGS = ["en", "ar", "de", "es", "fr", "it", "ja", "ko", "pt-br", "ru", "zh"];

// Function words that say nothing about which entry is meant. Kept short on purpose: a rare word is
// down-weighted by its frequency anyway, and a missing stop word costs less than a lost term.
const STOP = {
  en: "a an and are as at be by can could do does did for from how i if in into is it its me my of on or our so than that the their them then there these they this to us was we were what when where which who why will with would you your please hi hello there any some about just get also",
  de: "der die das den dem des ein eine einen einem einer und oder ist sind war wie was wo wann warum wer ich mich mir mein meine wir uns unser sie ihr ihre es er zu auf mit für von bei im in an am aus als auch noch nur so dass ob kann können könnte muss müssen darf soll sollte wird werden habe hat haben gibt bitte hallo ja nein nicht",
  es: "el la los las un una unos unas y o es son era como cómo que qué donde dónde cuando cuándo por para con sin de del al en mi mis tu tus su sus se me te lo le les nos yo puedo puede pueden hay hola favor también muy más sí no",
  fr: "le la les un une des et ou est sont était comme comment que quoi qui où quand pourquoi par pour avec sans de du au aux en mon ma mes ton ta tes son sa ses se me te je tu il elle nous vous ils elles on ce cet cette ces y a ai peut peux puis-je bonjour merci plus pas ne oui non est-ce qu",
  it: "il lo la i gli le un uno una e o è sono era come cosa che chi dove quando perché per con senza di del della dei delle al alla in nel nella mio mia miei mie tuo tua suo sua si mi ti ci vi lo li ho ha hanno posso può possono ciao grazie più non sì",
  "pt-br": "o a os as um uma uns umas e ou é são era como que quê onde quando por porque para com sem de do da dos das ao na no nas nos em meu minha meus minhas seu sua se me te você vocês eu nós posso pode podem tem olá obrigado mais não sim",
  ru: "и или а но в во на с со к ко по о об от до из за у для при как что где когда почему кто это этот эта эти мой моя мои мне меня мы нас вы вас ваш ваша ли же бы не да нет можно могу может есть пожалуйста здравствуйте привет",
  ar: "في من على إلى الى عن مع هل ما ماذا كيف متى أين اين لماذا هذا هذه ذلك تلك هو هي أنا انا نحن أنت انت أنتم لي لنا و أو او ثم لا نعم يمكن يمكنني يمكننا مرحبا من فضلك",
  ko: "저는 제가 저희 우리 이 그 저 것 수 좀 제 혹시 그리고 또는 어떻게 무엇 뭐 왜 언제 어디 누가 있나요 있어요 되나요 돼요 하나요 해요 합니까 입니까 인가요 알려 주세요 안녕하세요",
  ja: "",
  zh: "",
};
const STOPS = Object.fromEntries(Object.entries(STOP).map(([k, v]) => [k, new Set(v.split(" ").filter(Boolean))]));

// Kept whole in every language, and matched case-insensitively: product, tracker and platform names.
const NAMES =
  /(?<![\p{L}\p{N}])(?:file it|vs code|azure devops|github|gitlab|jira|youtrack|bugzilla|linear|shortcut|clickup|asana|trello|redmine|copilot|claude|codex|cursor|windows|macos|linux|ubuntu|python|portal|solo|team|bugit|taskivator|stripe|slack|teams|discord|mcp|api|pat|sso|saml|scim|vpn|proxy|pdf|csv|json|xml)(?![\p{L}\p{N}])/giu;

// Names that tell two otherwise identical questions apart: "how many devices does a Team license
// cover" is not "how many devices does a Solo license cover", and in Japanese the rest of the two
// questions shares nearly every character pair (measured: 0.86 for the wrong plan). A phrasing that
// names a different one of these than the question does is marked down to a suggestion.
const CONTRAST = new Set(["solo", "team", "jira", "azure devops", "github", "gitlab", "youtrack", "bugzilla", "linear", "shortcut", "clickup", "asana", "trello", "redmine", "copilot", "claude", "codex", "cursor", "windows", "macos", "linux", "ubuntu", "slack", "teams", "discord", "sso", "saml", "scim"]);

/**
 * The language a short question is written in, read from the prepared bank when the word lists
 * cannot tell (guessLanguage returns null). "Was kostet BugIt?" has one German function word, so it
 * was answered in the site's Italian; the German bank holds "Was kostet BugIt?" itself.
 * The best language must reach `min` and lead the next by `margin`, or the answer is still null.
 *
 * In the browser this reads only the languages already downloaded, which is one or two rather than
 * the server's eleven: a bank is about half a megabyte, and fetching ten more to settle the wording
 * of one short question would cost the visitor far more than answering it in the site's language.
 */
export function languageFromBank(bank, text, min = 0.5, margin = 0.15) {
  // Capped here rather than at the call site: this runs matchPrepared once per downloaded language,
  // so it is the MOST expensive path in the widget, and it was the one path the cap did not cover.
  text = String(text || "").slice(0, MATCH_LIMIT);
  const scores = [];
  for (const lang of Object.keys(bank.langs)) {
    const top = matchPrepared(bank, lang, text, 1)[0];
    if (top) scores.push([lang, top.exact ? 1.01 : top.sim]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  const [best, next] = scores;
  if (!best || best[1] < min) return null;
  if (next && best[1] - next[1] < margin) return null;
  return best[0];
}

/** The products, plans and trackers a question names ("jira", "team"...). */
export function namedSubjects(text, lang) {
  return [...termsOf(text, lang)].filter((t) => CONTRAST.has(t));
}

export function contrastFactor(qNames, phrasingTerms) {
  // The question names a product, plan or tracker the phrasing does not: a different subject. Measured:
  // "we are 12 testers, can BugIt file straight into our Jira board?" ranked "BugIt for game testers"
  // above every Jira phrasing.
  if (qNames.some((t) => !phrasingTerms.has(t))) return 0.6;
  // The question names none of them, the phrasing is about a specific one.
  if (!qNames.length && [...phrasingTerms].some((t) => CONTRAST.has(t))) return 0.85;
  return 1;
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u;
const HANGUL = /\p{Script=Hangul}/u;

function arabicStem(word) {
  let s = word
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
  for (const p of ["وال", "بال", "فال", "كال", "لل", "ال"]) {
    if (s.startsWith(p) && s.length - p.length >= 3) {
      s = s.slice(p.length);
      break;
    }
  }
  if (/^[وف]/.test(s) && s.length >= 5) s = s.slice(1);
  return s;
}

// Words customers write joined or apart: "setup" and "set up", "signin" and "sign in". They are joined
// before the terms are taken, so both spellings are one term: "how to setup jira" shared no term with
// any "set up Jira" phrasing and got suggestions instead of an answer (owner, 2026-09-15). "log in" is
// left apart on purpose: "the log in VS Code" is a real question about logs.
const COMPOUNDS = [
  [/\bset[\s-]+up\b/g, "setup"],
  [/\bsign[\s-]+(in|up|out|on)\b/g, "sign$1"],
  [/\be[\s-]+mail\b/g, "email"],
  [/\bweb[\s-]+site\b/g, "website"],
  [/\bplug[\s-]+in\b/g, "plugin"],
  [/\badd[\s-]+on\b/g, "addon"],
  [/\bback[\s-]+up\b/g, "backup"],
  [/\bwork[\s-]+flow\b/g, "workflow"],
];
function joinCompounds(s) {
  for (const [re, joined] of COMPOUNDS) s = s.replace(re, joined);
  return s;
}

/**
 * How much of a question is read. The scan for commands and file names backtracks over a long run of
 * letters with no separator, which is quadratic: 2000 characters of Japanese cost 178 milliseconds on
 * the main thread, and a question is read three times. The longest phrasing in the bank is under 200
 * characters, so nothing is lost by stopping here.
 */
export const MATCH_LIMIT = 600;

/** Terms for one text in one language. A Set: the similarity counts a term once. */
export function termsOf(text, lang) {
  let s = String(text || "").normalize("NFKC").toLowerCase();
  const out = new Set();
  const stop = STOPS[lang] ?? STOPS.en;
  // Commands and file names first, whole and in parts: `bugit_activate`, `.bugit/config.json`. Taken
  // before the names, which would otherwise take "bugit" out of `bugit_activate` and break it up. A
  // hyphenated compound customers also write apart or joined ("set-up", "e-mail") is prose, not a name,
  // and goes back joined; one with a dot, slash or underscore stays a name, so `set-up.exe` is never
  // made into `setup.exe`.
  s = s.replace(/[\p{L}\p{N}]+(?:[._/-][\p{L}\p{N}]+)+/gu, (m) => {
    if (!/[._/]/.test(m)) {
      const joined = joinCompounds(m);
      if (joined !== m) return ` ${joined} `;
    }
    out.add(m);
    for (const part of m.split(/[._/-]/)) if (part.length > 1 && !stop.has(part)) out.add(part);
    // A separator no compound can join across: with a plain space, "sign app.exe in portal" became
    // "sign  in portal" and then "signin".
    return " | ";
  });
  // The same compounds written apart ("set up"), in the prose that is left.
  s = joinCompounds(s);
  s = s.replace(NAMES, (m) => {
    out.add(m.replace(/\s+/g, " "));
    return " ";
  });
  for (const run of s.match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (CJK.test(run)) {
      // Japanese and Chinese: overlapping character pairs, split where a Latin or digit run sits.
      for (const piece of run.split(/([a-z0-9]+)/)) {
        if (!piece) continue;
        if (/^[a-z0-9]+$/.test(piece)) {
          if (piece.length > 1 || /\d/.test(piece)) out.add(piece);
          continue;
        }
        const chars = [...piece];
        if (chars.length === 1) {
          out.add(piece);
          continue;
        }
        for (let i = 0; i < chars.length - 1; i++) out.add(chars[i] + chars[i + 1]);
      }
      continue;
    }
    if (stop.has(run)) continue;
    if (HANGUL.test(run)) {
      // Korean writes particles onto the word (라이선스를, 라이선스는): the word and its syllable pairs.
      const syl = [...run];
      out.add(run);
      for (let i = 0; i < syl.length - 1; i++) out.add(syl[i] + syl[i + 1]);
      continue;
    }
    if (lang === "ar" && /\p{Script=Arabic}/u.test(run)) {
      const st = arabicStem(run);
      if (st.length >= 2 && !stop.has(st)) out.add(st);
      continue;
    }
    if (run.length < 2 && !/\d/.test(run)) continue;
    out.add(run);
    // A crude stem: inflected forms of one word share their first letters. Long German compounds
    // also give their tail.
    if (run.length >= 6) out.add("~" + run.slice(0, 5));
    if (lang === "de" && run.length >= 11) out.add("~" + run.slice(-6));
  }
  return out;
}

/**
 * The key an exact phrasing is looked up by: case, spacing and sentence punctuation ignored, but the
 * dot, slash or underscore INSIDE a command or file name kept. Stripping every mark made `set-up.exe`
 * and `setup.exe`, or `bugit_activate` and "bugit activate", the same key, and an exact hit skips
 * every confidence check, so the distinction termsOf keeps was lost on the strongest path. A hyphen
 * alone is prose ("e-mail"), exactly as termsOf treats it.
 *
 * Only those inner marks, never where a name starts or ends: Japanese and Chinese write a name against
 * the next word or leave a space, as they please ("CLAUDE.mdは" and "CLAUDE.md は"), and marking the
 * name's edges made those two different keys.
 */
export function normalizeExact(text) {
  const s = String(text || "").normalize("NFKC").toLowerCase();
  let out = "";
  for (const m of s.match(/[\p{L}\p{N}]+(?:[._/-][\p{L}\p{N}]+)*/gu) ?? []) {
    out += /[._/]/.test(m) ? m : m.replace(/-/g, "");
  }
  return out;
}

function buildLanguage(lang, items) {
  const phrasings = [];
  for (const item of items) {
    for (const p of [item.question, ...(item.variants ?? [])]) {
      if (typeof p !== "string" || !p.trim()) continue;
      const terms = termsOf(p, lang);
      if (terms.size) phrasings.push({ item, text: p, terms, mass: 0 });
    }
  }
  const df = new Map();
  for (const p of phrasings) for (const t of p.terms) df.set(t, (df.get(t) ?? 0) + 1);
  const N = phrasings.length || 1;
  const idfOf = (t) => Math.log(1 + N / (df.get(t) ?? 0.5));
  // A key two items about DIFFERENT topics share is no exact answer to either: it used to go to
  // whichever came first. Such a question is left to the ordinary matcher and its margin between
  // topics. A recorded common answer and the entry it cites are one topic, and keep their key.
  const exact = new Map();
  const shared = new Set();
  for (const p of phrasings) {
    const k = normalizeExact(p.text);
    if (!k) continue;
    const prev = exact.get(k);
    if (!prev) exact.set(k, p);
    else if (prev.item.id !== p.item.id && !sameTopic(prev.item, p.item)) shared.add(k);
  }
  for (const k of shared) exact.delete(k);
  const postings = new Map();
  phrasings.forEach((p, i) => {
    let mass = 0;
    for (const t of p.terms) {
      mass += idfOf(t);
      const list = postings.get(t);
      if (list) list.push(i);
      else postings.set(t, [i]);
    }
    p.mass = mass;
  });
  return { phrasings, idfOf, exact, postings };
}

/**
 * A bank from the language files that have been downloaded so far: `docs` is [{ lang, items }].
 * The widget adds a language to it the first time a visitor needs that language, so opening the
 * Guide costs one file rather than eleven.
 */
export function buildPreparedBank(docs, didYouMean = {}) {
  const langs = {};
  let items = 0;
  for (const doc of docs) {
    const list = (doc.items ?? []).filter((i) => i && i.id && i.question && (i.kind === "intent" ? i.reply : i.answer));
    langs[doc.lang] = buildLanguage(doc.lang, list);
    items += list.length;
  }
  return { langs, didYouMean, items };
}

/** The best prepared items for a question, best first, one per item. `sim` is 1 for an exact phrasing. */
export function matchPrepared(bank, lang, question, limit = 4) {
  const L = bank.langs[lang];
  if (!L) return [];
  const exact = L.exact.get(normalizeExact(question));
  const q = termsOf(question, lang);
  if (!q.size && !exact) return [];
  let qMass = 0;
  for (const t of q) qMass += L.idfOf(t);
  const shared = new Map();
  for (const t of q) {
    const list = L.postings.get(t);
    if (!list) continue;
    const w = L.idfOf(t);
    for (const i of list) shared.set(i, (shared.get(i) ?? 0) + w);
  }
  const qNames = [...q].filter((t) => CONTRAST.has(t));
  const shortQuestion = contentWords(question, lang) < 2;
  const best = new Map();
  for (const [i, m] of shared) {
    const p = L.phrasings[i];
    const cq = m / qMass;
    const cp = m / p.mass;
    let sim = ((2 * cq * cp) / (cq + cp)) * contrastFactor(qNames, p.terms);
    // One meaningful word is too little to tell questions apart: "Who is BugIt for?" and "What is
    // BugIt?" both come down to "bugit". Such a match can be suggested, never answered.
    if (shortQuestion) sim = Math.min(sim, SHORT_QUESTION_CAP);
    const prev = best.get(p.item.id);
    if (!prev || sim > prev.sim) best.set(p.item.id, { item: p.item, sim, phrasing: p.text, exact: false });
  }
  if (exact) best.set(exact.item.id, { item: exact.item, sim: 1, phrasing: exact.text, exact: true });
  // An exact phrasing always ranks first, whatever else also scores 1.
  return [...best.values()].sort((a, b) => Number(b.exact) - Number(a.exact) || b.sim - a.sim).slice(0, limit);
}

export const SHORT_QUESTION_CAP = 0.7;

/**
 * How many words the question really has, counted before stems and character pairs are added:
 * "terminal" gives two search terms ("terminal" and its stem) but is one word, and it was answered
 * with the Copilot entry at 0.86. A run of Japanese or Chinese, which has no spaces, counts as one
 * word up to five characters and one per four characters after that.
 */
export function contentWords(text, lang) {
  const stop = STOPS[lang] ?? STOPS.en;
  let n = 0;
  // Distinct words: "terminal terminal" says no more than "terminal". File names first, each distinct
  // one a word, set aside before compounds are joined so "set-up.exe" and "setup.exe" stay two words.
  // Then compounds are joined as termsOf joins them: "set up please" is one word, like "setup please".
  const names = new Set();
  const prose = String(text || "").normalize("NFKC").toLowerCase().replace(/[\p{L}\p{N}]+(?:[._/-][\p{L}\p{N}]+)+/gu, (m) => {
    if (!/[._/]/.test(m)) return m;
    names.add(m);
    return " | ";
  });
  n += names.size;
  for (const run of new Set(joinCompounds(prose).match(/[\p{L}\p{N}]+(?:[._/-][\p{L}\p{N}]+)*/gu) ?? [])) {
    if (CJK.test(run)) {
      const chars = [...run].length;
      n += chars <= 5 ? 1 : Math.ceil(chars / 4);
    } else if (!stop.has(run) && (run.length > 1 || /\d/.test(run))) n += 1;
  }
  return n;
}

/** Two items about the same documentation entry (an entry and a recorded common answer citing it). */
function sameTopic(a, b) {
  const ids = (it) => (it.kind === "entry" && it.entry ? [it.entry] : (it.cited ?? []));
  const x = ids(a);
  return ids(b).some((id) => x.includes(id));
}

/**
 * The match to answer with, or null. It must reach `threshold` and, unless it is an exact phrasing,
 * lead the best match about a DIFFERENT topic by `margin`: "How do I install BugIt?" scored 0.81 for
 * installing VS Code and 0.76 for installing BugIt, and a near tie is a question the customer should
 * pick, not one the Guide should guess.
 */
export function confidentMatch(matches, threshold, margin = 0.08) {
  const top = matches[0];
  if (!top || top.sim < threshold) return null;
  if (top.exact) return top;
  const rival = matches.slice(1).find((m) => !sameTopic(m.item, top.item));
  if (rival && top.sim - rival.sim < margin) return null;
  return top;
}

/**
 * THE THRESHOLDS, AND WHAT THEY WERE MEASURED ON.
 *
 * ANSWER (0.8): the floor for showing the prepared text as the answer. Measured on 33 English
 * questions held out of the bank: at 0.6, four of thirteen answers were about the wrong thing; at
 * 0.75 and above, none were, and the suggestions still held the right question for 22 of the 33.
 *
 * SUGGEST (0.3): the floor for offering a question to tap instead. Below it the match is noise, and
 * "how many cats live in Tokyo" was being offered "Can I see a demo?".
 *
 * SUGGEST_NAMED (0.2): the same floor when the question names a product, plan or tracker. The right
 * Jira phrasings scored 0.22 for "can BugIt file straight into our Jira board?", because the rest of
 * that sentence is words the bank does not use. A named subject is evidence in itself.
 *
 * RELATED (0.3): the floor for the "related questions" under an answer, capped below 0.9 so a
 * rephrasing of the same question is not offered as a different one.
 *
 * The website has no model, so the prototype's PREPARED_PREFER (0.85, the line above which the bank
 * was preferred to a model call) has no meaning here and is deliberately not carried over.
 */
export const ANSWER_AT = 0.8;
export const SUGGEST_AT = 0.3;
export const SUGGEST_NAMED_AT = 0.2;
export const RELATED_AT = 0.3;

/**
 * What the Guide should do with one question, in one language. The widget renders this and adds no
 * judgement of its own:
 *
 *   { kind: "answer",  item, answer, related[] }   the prepared text, word for word
 *   { kind: "person",  item }                      a topic only a person can settle: the ticket path
 *   { kind: "suggest", questions[] }               the closest questions, to tap
 *   { kind: "none" }                               nothing close enough: offer a person
 */
export function answerFor(bank, lang, question) {
  // Long enough for any real question and for every phrasing in the bank (the longest is under 200
  // characters). Past this the matcher only spends time: see MATCH_LIMIT's note in termsOf.
  question = String(question || "").slice(0, MATCH_LIMIT);
  const matches = matchPrepared(bank, lang, question, 5);
  const top = confidentMatch(matches, ANSWER_AT);
  if (top) {
    // A "needs a person" topic (a refund, a data request, a sales question): its reply is shown and
    // the ticket path opens. It carries no answer of its own on purpose.
    if (top.item.kind === "intent") return { kind: "person", item: top.item };
    return { kind: "answer", item: top.item, answer: top.item.answer, related: relatedTo(bank, lang, top.item) };
  }
  const floor = namedSubjects(question, lang).length ? SUGGEST_NAMED_AT : SUGGEST_AT;
  const seen = new Set();
  const questions = [];
  for (const m of matches) {
    if (m.item.kind === "intent" || m.sim < floor) continue;
    if (seen.has(m.item.question)) continue;
    seen.add(m.item.question);
    questions.push(m.item.question);
    if (questions.length === 3) break;
  }
  return questions.length ? { kind: "suggest", questions } : { kind: "none" };
}

/** Up to three other questions about other entries, close to the one just answered. */
export function relatedTo(bank, lang, item) {
  const ids = item.kind === "entry" && item.entry ? [item.entry] : (item.cited ?? []);
  const seen = new Set([item.question]);
  const out = [];
  for (const r of matchPrepared(bank, lang, item.question, 8)) {
    if (r.item.id === item.id || r.item.kind === "intent" || r.sim < RELATED_AT || r.sim >= 0.9) continue;
    if (ids.includes(r.item.entry) || (r.item.cited ?? []).some((c) => ids.includes(c))) continue;
    // Two items can carry the SAME wording (an entry and the recorded common answer that cites it),
    // and the same question offered twice reads as a bug to the customer.
    if (seen.has(r.item.question)) continue;
    seen.add(r.item.question);
    out.push(r.item.question);
    if (out.length === 3) break;
  }
  return out;
}

// ---------------------------------------------------------------- the language a visitor writes in
//
// The owner's rule is that the Guide answers in the language the visitor writes in, even when the
// site is set to another one. The same rules as the Portal's lib/assistant/language.ts.

const KANA = /[぀-ヿㇰ-ㇿ]/g;

const SCRIPTS = [
  ["ko", /[가-힯ᄀ-ᇿ㄰-㆏]/g],
  ["ja", KANA],
  ["zh", /[一-鿿㐀-䶿]/g],
  ["ar", /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g],
  ["ru", /[Ѐ-ӿ]/g],
];

const WORDS = {
  en: "the and is are to how what can do does did i my it for with you your of in on an be this that not have has will which where why when there any get use",
  de: "der die das und ist sind ich wie was nicht mit für kann können ein eine einen mein meine zu auf es sie wir ihr gibt wird wo warum wann bei von den dem auch oder habe hat muss",
  es: "el los las y es son que cómo qué no con para puedo puede mi un una en por se lo del al hay dónde cuándo porque también mis tengo",
  fr: "le les et est sont que comment quoi ne pas avec pour puis peux je mon ma un une en des du ce il elle nous vous où quand pourquoi aussi ai mes",
  it: "il lo gli e è sono che come cosa non con per posso può mio mia un una di in del della si ci dove quando perché anche ho mie",
  "pt-br": "o os e é são que como não com para posso pode meu minha um uma em do da no na se você vocês onde quando porque também tenho meus",
};
const SETS = Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, new Set(v.split(" "))]));

// Letter boundaries as Unicode lookarounds: `\b` only knows ASCII letters, so `\b(?:è|più)\b`
// could never match a standalone "è".
const MARKS = [
  ["de", /[äöüß]/g, 1.5],
  ["es", /[ñ¿¡]/g, 2],
  ["pt-br", /[ãõ]|ção|ções/g, 2],
  ["fr", /[êëîïôûœ]|(?<![\p{L}])(?:l|d|j|qu|n)['’]\p{L}/gu, 1.5],
  ["it", /(?<![\p{L}])(?:è|perché|più|può)(?![\p{L}])/gu, 1.5],
];

// Latin in every language (product, tracker and platform names, commands, file names, versions,
// addresses), so left out when weighing a script: "Jira Azure DevOps GitHub GitLab 支持吗" is Chinese.
const NEUTRAL =
  /`[^`]*`|https?:\/\/\S+|\S*[\d_/\\]\S*|\w+\.\w[\w.]*|(?<![\p{L}])(?:BugIt|Taskivator|Solo|Teams?|FILE IT|Jira|Azure|DevOps|GitHub|GitLab|Bugzilla|YouTrack|Linear|Shortcut|ClickUp|Asana|Trello|Copilot|Claude|VS ?Code|Visual Studio|Windows|macOS|Linux|Ubuntu|Python|Portal|MCP|API|PAT|Stripe|Chrome|Edge|Firefox|Safari)(?![\p{L}])/giu;

/**
 * The subset of NEUTRAL that may be removed before counting SCRIPTS, voting on WORDS or counting
 * ACCENT MARKS. A web or mail address, and a code span, can carry any script or any letter without
 * the sentence being written in it, so they go. The rest of NEUTRAL must not go here: see the note
 * in guessLanguage for the two things that were measured lost when it did.
 *
 * A bare host (jira.acme.com) and a path are in here as well as a full URL: they are how a
 * customer actually writes one, and their pieces are words. "jira.acme.com portal.acme.com
 * login?" read as Portuguese, because `com` is a Portuguese word and it was in there twice.
 * The path and file-name patterns are deliberately ASCII, so they cannot reach into CJK text.
 */
const ADDRESSES = /`[^`]*`|https?:\/\/\S+|www\.\S+|\S+@[\w.-]+\.\w+|[\w.:-]*[/\\][\w.:/\\-]*|\w+\.\w[\w.]*/giu;

const count = (s, re) => (s.match(re) || []).length;

export function guessLanguage(text) {
  const s = String(text || "").normalize("NFKC");
  // THREE READINGS OF THE SAME MESSAGE, because the three counts below are asking different
  // questions and one strip cannot serve all of them.
  //   prose  - the whole neutral list gone, for the Latin tally: a product name is Latin in every
  //            language and must not make a Chinese question look like an English one.
  //   plain  - only addresses gone, for the script tally, the word vote and the accent marks. The
  //            rest of NEUTRAL cannot be used here: `\S*[\d_/\\]\S*` matches any run of
  //            non-space characters containing a digit, which is an entire Japanese sentence (no
  //            spaces) and is also the German word in "7-taegigen", whose umlaut was the only
  //            evidence the sentence had. Both were measured, both were lost.
  const prose = s.replace(NEUTRAL, " ");
  const plain = s.replace(ADDRESSES, " ");
  const latin = count(prose, /[a-zA-ZÀ-ɏ]/g);
  for (const [code, re] of SCRIPTS) {
    if (code === "zh" && count(plain, KANA)) continue; // kana present: Japanese
    const n = count(plain, re);
    if (n >= 2 && n >= latin * 0.25) return code;
  }
  const words = plain.toLowerCase().match(/[\p{L}']+/gu) || [];
  const score = Object.fromEntries(Object.keys(SETS).map((k) => [k, 0]));
  for (const w of words) {
    const bare = w.replace(/^['’]+|['’]+$/g, "");
    for (const [k, set] of Object.entries(SETS)) if (set.has(bare)) score[k] += 1;
  }
  const lower = plain.toLowerCase();
  for (const [k, re, weight] of MARKS) score[k] += count(lower, re) * weight;
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (best[1] < 2) return null;
  if (best[1] - second[1] < 1.5 && best[1] < second[1] * 1.6) return null;
  return best[0];
}

/**
 * The owner's rule: no en or em dashes in anything a customer reads. The prepared answers are
 * already written that way; this covers the one line the Guide composes itself, the subject it
 * puts in a support email.
 */
export function undash(text, language) {
  const comma = language === "ja" ? "、" : language === "zh" ? "，" : language === "ar" ? "، " : ", ";
  return String(text).replace(/(\d)\s*[–—]\s*(?=\d)/g, "$1-").replace(/\s*[—–]\s*/g, comma);
}
