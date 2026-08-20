/*
 * IS ANY OF THIS STILL IN ENGLISH?
 *
 * WHY THIS EXISTS. On 2026-08-21 the film wall was found rendering twelve English names and
 * twelve English sentences on all ten translated pages. Twenty-four strings, the largest block
 * of untranslated copy left on the site, and every language guard here passed over it.
 *
 * None of them was wrong to. check-languages reads the language CATALOGUE. dictionary parity
 * asks whether a key EXISTS. check-locale-crosstalk compares the VALUES in the i18n object and
 * catches a locale that shipped another locale's prose. All three read the i18n object — and
 * the wall's copy was never in it. It was written straight into index.html. A key that does not
 * exist cannot fail a parity check, which is the whole shape of this defect: the guards were
 * looking at the place the strings were supposed to be, and the strings were somewhere else.
 *
 * So this one reads the RENDERED PAGE and asks the reader's question instead of the
 * maintainer's: on the Japanese page, is this sentence in Japanese?
 *
 * HOW IT DECIDES. A visible string on a translated page that is byte-identical to the string in
 * the same position on the English page is untranslated. That is a strong signal and a cheap
 * one, and it needs a short, specific allowlist, because some strings are identical ON PURPOSE:
 *
 *   the product's own name, the parent brand, the trackers it files to,
 *   FILE IT — the confirmation the agent matches on, which is a literal and not a word,
 *   the languages' own endonyms in the language menu,
 *   prices, versions, counts, URLs, e-mail addresses,
 *   and anything under about 12 characters, where "FAQ", "OK" and "Pro" are identical in most
 *   of these languages and always will be.
 *
 * Every entry in that list is a hole, so each one is named and justified rather than being a
 * loose pattern. A regex broad enough to be comfortable would let the next wall through.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(ROOT, "app.js"), "utf8");
const LANGS = JSON.parse(app.match(/const languages=(\[\[.*?\]\]);/s)[1].replace(/'/g, '"')).map(([c]) => c);
const DOC_ROUTES = JSON.parse(app.match(/const docRoutes=(\[.*?\]);/s)[1].replace(/'/g, '"'));
const ROUTES = ["", ...DOC_ROUTES.map((r) => "/" + r)];

/* Below this length, identical is the norm rather than the signal. */
const MIN = 12;

/* Identical in every language, by design. Each line is a hole in this guard, so each is here
   for a stated reason and nothing is here because it was easier than fixing it. */
const ALLOWED = [
  /^BugIt$/i, /^Taskivator$/i, /^BugIt by Taskivator$/i,   // the product and the parent brand
  /^FILE IT$/,                                            // a literal the agent matches, not a word
  /^(Jira|GitHub|GitLab|Bugzilla|YouTrack|Linear|Asana|Trello|ClickUp|Azure DevOps|Confluence|Zephyr|Notion|Slack|Stripe|Visual Studio Code|VS Code|GitHub Copilot|Claude|Gemini|GPT|Python|Windows|macOS|Linux)$/i,
  /^https?:\/\//, /@/,                                    // URLs and e-mail addresses
  /^[\s\d.,:$€¥%+\-/()·—–]+$/,                            // prices, versions, counts, separators
  /^(English|日本語|Français|Deutsch|Español|Português BR|Italiano|한국어|中文|Русский|العربية)$/,
  /^(EN|JA|FR|DE|ES|PT-BR|IT|KO|ZH|RU|AR)$/,              // the language menu's own tags
  /^v?\d+\.\d+/,                                          // version strings
  /^by Taskivator$/,                                      // the byline under the wordmark
  /^(\u00a9|Copyright \(c\))\s*\d{4}\s+Taskivator\b/,       // the copyright notice, a legal identifier
  /^[A-Za-z][A-Za-z .]*(\u00b7[A-Za-z .]*)+$/,               // a list of product names: "Jira \u00b7 ADO \u00b7 GitHub"
];

/* WORDS THAT ARE GENUINELY THE SAME WORD IN THAT LANGUAGE. Allowed per LOCALE, never globally:
   "Documentation" is correct French and would be a real defect in German, and a global entry
   would hide it there for ever. Each line names the locale it applies to and nothing else. */
const SAME_WORD = {
  fr: [/^Documentation$/, /^DOCUMENTATION$/, /^\d+\.\s+Restrictions$/],
  it: [/^Documentation$/],
  es: [/^Documentation$/],
};
const allowed = (s, lang) => ALLOWED.some((re) => re.test(s.trim()))
  || (SAME_WORD[lang] || []).some((re) => re.test(s.trim()));

const PORT = await new Promise((res, rej) => { const p = net.createServer(); p.on("error", rej); p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); }); });
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 80; i++) { try { const r = await fetch(base); if (r.ok) break; } catch { await new Promise((r) => setTimeout(r, 150)); } }

/* Every visible string on the page, keyed by where it sits, so two locales can be compared
   position by position rather than as two bags of words. */
const COLLECT = `(() => {
  const out = {};
  const pathOf = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const i = n.parentElement ? [...n.parentElement.children].indexOf(n) : 0;
      parts.push(n.tagName.toLowerCase() + ":" + i);
    }
    return parts.reverse().join(">");
  };
  const walk = (el) => {
    for (const child of el.children) {
      if (child.tagName === "SCRIPT" || child.tagName === "STYLE") continue;
      const cs = getComputedStyle(child);
      if (cs.display === "none" || cs.visibility === "hidden" || child.hasAttribute("hidden")) continue;
      const own = [...child.childNodes].filter((n) => n.nodeType === 3)
        .map((n) => n.textContent).join("").replace(/\\s+/g, " ").trim();
      if (own) out[pathOf(child)] = own;
      walk(child);
    }
  };
  walk(document.body);
  return out;
})()`;

const browser = await chromium.launch();

/* ONE CONTEXT PER LANGUAGE, walking the routes inside it. The first version opened a fresh
   context for every (route, language) pair -- 121 of them -- and waited for networkidle on a
   homepage that streams four videos. Measured: twenty minutes to compare ONE route. Eleven
   contexts and a hash change per route does the same work in a couple of minutes, and it is
   also a truer reproduction: the router is client-side, so a hash change is exactly what a
   reader's click does. */
const readAll = async (lang) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "bugitLang", value: lang, url: base }]);
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const out = {};
  for (const route of ROUTES) {
    await page.evaluate((r) => { location.hash = r ? "#" + r : ""; }, route);
    await page.waitForTimeout(route ? 800 : 500);
    out[route] = await page.evaluate(COLLECT);
  }
  await ctx.close();
  return out;
};

const en = await readAll("en");
const fail = [];
for (const lang of LANGS) {
  if (lang === "en") continue;
  const mine = await readAll(lang);
  for (const route of ROUTES) {
    const same = [];
    for (const [where, text] of Object.entries(mine[route] || {})) {
      if (text.length < MIN) continue;
      if (allowed(text, lang)) continue;
      if (en[route] && en[route][where] === text) same.push(text);
    }
    if (same.length) {
      const shown = [...new Set(same)].slice(0, 6);
      fail.push("[" + lang + "] " + (route || "/home") + " \u2014 " + same.length +
        " string(s) still in English:\n      " +
        shown.map((s) => '"' + s.slice(0, 74) + '"').join("\n      "));
    }
  }
  process.stdout.write("  " + lang.padEnd(6) + " " + ROUTES.length + " routes compared against English\n");
}
await browser.close();
server.kill();

if (fail.length) {
  console.error(`\ncheck-untranslated FAILED (${fail.length}):\n - ` + fail.join("\n - "));
  process.exit(1);
}
console.log(`\ncheck-untranslated OK: nothing on any of ${ROUTES.length} routes renders the English string in another language`);
