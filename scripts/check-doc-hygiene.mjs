// Shipped-document hygiene guard.
//
// Written after a real escape: the six Arabic documents were installed straight from a
// translation pack, and every one of them carried the pack's own scaffolding on its tail --
// a "DOCUMENT 4 OF 6" banner, a `Source: .cache/_website_lqa_sources/...` build path, and in
// TOKUSHOHO's case 78 lines of English "COMPLETENESS CHECKS" appendix. All of it reached
// bugit.dev. Nothing in the suite noticed, because every other guard asks whether required
// text is PRESENT; none asked whether foreign text had come along with it.
//
// So this checks the other direction: a customer-facing document must contain the document
// and nothing else. It also catches the same class of accident for any future locale --
// merge markers, editor conflict debris, TODO/FIXME notes, and internal paths.
//
// Deliberately NOT checked here: whether a translation says the right thing. That is
// check-legal-copy's job, and no pattern can do it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const docs = path.join(root, "public", "docs");
const fail = [];

// Each entry is [label, regex]. Kept literal and narrow so a legitimate document cannot
// trip them: no real legal text contains a 60-character ruler or a `.cache/` path.
const CONTAMINATION = [
  ["translation-pack banner", /^\s*DOCUMENT\s+\d+\s+OF\s+\d+\s*$/im],
  ["translation-pack ruler", /^={60,}\s*$/m],
  ["translation-pack trailer", /^\s*END OF (PACK|DOCUMENT)\s*$/im],
  ["pack section header", /^\s*(PART [A-Z]|SECTION \d+:|COMPLETENESS CHECKS)/m],
  ["build-path leak", /(^|\s)(?:Source:\s*)?\.?[\\/]?(?:\.cache|node_modules|dist)[\\/]/m],
  ["absolute local path", /[A-Za-z]:\\Users\\/],
  ["git conflict marker", /^(<{7}|={7}|>{7})(\s|$)/m],
  ["editorial note", /\b(TODO|FIXME|XXX|LOREM IPSUM)\b/],
];

const files = fs.readdirSync(docs).filter((f) => /\.(md|txt)$/i.test(f));
if (files.length < 30) fail.push(`only ${files.length} documents found in public/docs — expected the full localized corpus`);

for (const name of files.sort()) {
  const text = fs.readFileSync(path.join(docs, name), "utf8");
  for (const [label, re] of CONTAMINATION) {
    const m = text.match(re);
    if (!m) continue;
    const line = text.slice(0, m.index).split("\n").length;
    fail.push(`${name}:${line} — ${label}: ${JSON.stringify(m[0].trim().slice(0, 70))}`);
  }
}

// A translation must not invent a term the governing English text does not contain. The
// Arabic EULA arrived with a post-expiry grace clause and a 72-hour offline clause that
// exist in no other language, including the English version that governs by clause 7.
const en = fs.readFileSync(path.join(docs, "LICENSE.txt"), "utf8");
const enHasGrace = /\bgrace\b/i.test(en);
const GRACE = {
  ar: /فترة سماح|فترة السماح/, de: /Schonfrist|Nachfrist|Kulanz/, es: /per[ií]odo de gracia/i,
  fr: /(délai|période) de gr[âa]ce/i, it: /periodo di grazia/i, ja: /猶予/, ko: /유예/,
  "pt-br": /per[ií]odo de car[êe]ncia/i, ru: /льготн/i, zh: /宽限/,
};
for (const [code, re] of Object.entries(GRACE)) {
  const f = `LICENSE.${code}.txt`;
  if (!fs.existsSync(path.join(docs, f))) { fail.push(`${f} is missing`); continue; }
  const has = re.test(fs.readFileSync(path.join(docs, f), "utf8"));
  if (has !== enHasGrace)
    fail.push(`${f} ${has ? "grants" : "omits"} a post-expiry grace period, but LICENSE.txt ${enHasGrace ? "grants" : "does not"} — a translation may not change the terms`);
}

if (fail.length) {
  console.error("check-doc-hygiene FAILED:\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log(`check-doc-hygiene OK: ${files.length} documents clean; no translation adds terms the English licence does not.`);
