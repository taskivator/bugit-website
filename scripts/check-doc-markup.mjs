/* NO DOCUMENT MAY SHOW ITS OWN MARKUP.

   The ten translated licences opened with `**Avertissement sur la traduction.**` -- asterisks
   and all -- on the page. The source was right and the corpus was right: PRIVACY, REFUND and
   TOKUSHOHO render that same disclaimer as bold text, because they go through
   formatMarkdownDoc. The licence goes through formatLicense, which escaped the markers and
   printed them. Two renderers over one corpus, one of them deaf to the markup that corpus uses.

   Every existing guard missed it. A source scan cannot see it: the source is correct markdown.
   A translation-parity check cannot see it: every language has the disclaimer, and they all
   have it in the same shape. check-untranslated cannot see it: the text IS translated. Only
   reading the RENDERED page catches it, which is the recurring lesson in this repo -- the page
   is the claim, not the source.

   So this reads what the reader sees, on every document route, in every language, and asserts
   that no markdown marker survives into visible text. It is deliberately about the class, not
   about `**`: an unrendered link, a leftover backtick and a literal heading hash are the same
   defect wearing different clothes, and any new document or new renderer inherits the check. */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const app = readFileSync(path.join(ROOT, "app.js"), "utf8");

/* Both subjects come from the product, never from a list kept here: a document added tomorrow,
   or a language added tomorrow, is covered without anyone remembering to edit this file. */
const LANGS = JSON.parse(app.match(/const languages=(\[\[.*?\]\]);/s)[1].replace(/'/g, '"')).map(([c]) => c);
const DOC_ROUTES = JSON.parse(app.match(/const docRoutes=(\[[^\]]*\]);/)[1].replace(/'/g, '"'))
  .filter((r) => r !== "docs" && r !== "docs/faq" && r !== "support");

/* Each pattern is a marker that should have become an element. The message says what the
   reader is looking at, because that is what makes a failure actionable at 3am. */
const MARKERS = [
  { re: /\*\*/, what: "bold markers (**) printed as text" },
  { re: /(?:^|\s)`[^`]+`/, what: "a backtick code span printed as text" },
  { re: /\[[^\]]{1,80}\]\((?:https?:|mailto:|\/|#)[^)\s]+\)/, what: "an unrendered markdown link" },
  { re: /(?:^|\n)\s*#{1,4}\s+\S/, what: "a heading written as hashes" },
  { re: /&lt;bdi|<bdi dir/i, what: "a bdi tag printed as text" },
  { re: /&amp;|&quot;|&lt;|&gt;/, what: "double-escaped HTML" },
];

const freePort = () => new Promise((res, rej) => {
  const p = net.createServer();
  p.on("error", rej);
  p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); });
});

const PORT = await freePort();
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) break; } catch { await new Promise((r) => setTimeout(r, 150)); } }

const browser = await chromium.launch();
const findings = [];
let read = 0;

/* One context per language, every document inside it: opening a context per page turned an
   earlier version of this sweep into a twenty-minute job for no extra coverage. */
for (const lang of LANGS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "bugitLang", value: lang, url: base }]);
  const page = await ctx.newPage();
  for (const route of DOC_ROUTES) {
    await page.goto(base + "#" + route, { waitUntil: "domcontentloaded" });
    /* The document arrives by fetch after the route renders, and aria-busy is how the page
       itself says it has finished. Waiting on that rather than on a timer means a slow
       document is read completely instead of being read empty and passing. */
    /* Wait on the page's OWN signal that the document has landed. `#docContent` is the box the
       router fills, and aria-busy is how it says it is still fetching. An earlier version of
       this waited on a container that does not exist, so every page burned its full timeout and
       was then read empty -- a sweep that took half an hour and could only ever pass. */
    await page.waitForFunction(() => {
      const box = document.querySelector("#docContent") || document.querySelector("main");
      if (!box) return false;
      if (box.querySelector("[aria-busy='true']")) return false;
      return box.innerText.trim().length > 200;
    }, null, { timeout: 15000 }).catch(() => {});
    const text = await page.evaluate(() => {
      const main = document.querySelector("#docContent") || document.querySelector("main") || document.body;
      /* innerText, not textContent: it is what is actually painted, so a hidden template or a
         script body cannot supply a false positive -- or hide a real one. */
      return main.innerText;
    });
    read++;
    /* A page that arrived empty proves nothing, and a guard that silently passes on nothing is
       the failure mode this whole audit keeps finding. Say so instead. */
    if (text.trim().length < 200) { findings.push(`${lang}/${route}: the document never rendered (${text.trim().length} characters)`); continue; }
    for (const m of MARKERS) {
      const hit = text.match(m.re);
      if (!hit) continue;
      const at = text.indexOf(hit[0]);
      const sample = text.slice(Math.max(0, at - 40), at + 70).replace(/\s+/g, " ").trim();
      findings.push(`${lang}/${route}: ${m.what}  «${sample}»`);
    }
  }
  await ctx.close();
}

await browser.close();
server.kill();

if (findings.length) {
  console.error(`check-doc-markup FAIL — ${findings.length} document(s) show their own markup\n`);
  for (const f of findings) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-doc-markup OK: ${read} rendered documents (${LANGS.length} languages x ${DOC_ROUTES.length} routes) and not one of them shows a markdown marker`);
