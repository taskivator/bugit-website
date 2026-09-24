// Spanish and Italian address the reader ONE way on this site, and it is the informal one.
//
// WHY THIS EXISTS. The register of these two languages has now drifted twice, in opposite
// directions, and both times the drift was invisible to every other check because nothing here
// reads meaning -- a formal sentence is spelled correctly, parses, renders, and passes every
// structural gate in this repo.
//
//   - An earlier round moved es and it to the formal register across the product. The external
//     LQA round of 2026-09-18 rejected 18 of those records: these two languages take `tu` and
//     `tu`/informal imperatives in product copy. German and French are the formal ones.
//   - The sweep that put them back was itself incomplete on the first pass, because the
//     extractor behind it only read `key: "value"` lines and never looked inside array
//     elements. It reported Italian clean while a FAQ answer still opened "la sua segnalazione".
//
// So the invariant is worth a gate rather than another paragraph of instructions, and this file
// is the gate. `lib/i18n/one-register-per-language.test.ts` is the portal's half of the same
// invariant; this is the website's, because app.js is a separate copy of the copy.
//
// THREE THINGS THIS DELIBERATELY GETS RIGHT, each of which a naive version gets wrong:
//
//   1. CONTRACT TEXT IS NOT PRODUCT COPY. The licence-agreement summary ends with a governing
//      law and jurisdiction clause whose wording is constrained by law, and it says "si usted es
//      consumidor". Rewording an agreement to satisfy a style rule quietly changes the
//      agreement. It is allowed, by exact sentence, not by a blanket exemption for the page.
//
//   2. `lei` IS A PORTUGUESE WORD TOO. The pt-br legal copy names the Japanese statute "Lei de
//      Transações Comerciais Especificadas". A scan for the Italian formal pronoun that does not
//      exclude it flags a language this rule does not govern at all -- the wrong-subject-scan
//      class, which has bitten this repo repeatedly and bit THIS check while it was being
//      written.
//
//   3. `su` IS NOT MECHANICALLY FORMAL, so it is not scanned for. "cada uno con su propia
//      cuenta" is each MEMBER's account and "cada licencia tiene su propio plazo" is each
//      LICENCE's term -- ordinary third person, correct in any register. Only markers that can
//      ONLY be reader-address are scanned, plus exact regression pins for the sentences that
//      actually drifted. A guard that flags correct copy gets switched off.
//
// AN ALLOWANCE THAT NO LONGER MATCHES ANYTHING IS A FAILURE, not a pass. Every entry in ALLOWED
// must still be present in app.js. A restated fact goes stale; an allowance for a sentence that
// has since been reworded is dead cover, and silently keeps covering whatever moves into its
// place. This is the same rot that put a wrong branch name in CLAUDE.md for weeks.
//
// Run: `node scripts/check-register-es-it.mjs`. No dependencies. Exit 0 = clean.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = readFileSync(join(ROOT, "app.js"), "utf8").split("\r\n").join("\n");

/**
 * Comments blanked, length preserved so every offset still points at the real character.
 *
 * The sibling check `check-locale-registration-order.mjs` reported its own explanatory comment
 * as the defect on its first run. This file carries the forbidden Spanish and Italian words in
 * its own header for the same reason that one did, so it would do exactly the same thing if it
 * scanned itself -- it does not, it scans app.js, but app.js has comments too and the rule is
 * the same: a scan reads the SHIPPED text, never the prose about it.
 */
function blankComments(src) {
  let out = "";
  let mode = null; // null | "line" | "block" | "'" | '"' | "`"
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    const d = src[i + 1];
    if (mode === "line") {
      if (c === "\n") { mode = null; out += c; } else out += " ";
      continue;
    }
    if (mode === "block") {
      if (c === "*" && d === "/") { mode = null; out += "  "; i += 1; } else out += c === "\n" ? c : " ";
      continue;
    }
    if (mode === "'" || mode === '"' || mode === "`") {
      out += c;
      if (c === "\\") { out += d ?? ""; i += 1; continue; }
      if (c === mode) mode = null;
      continue;
    }
    if (c === "/" && d === "/") { mode = "line"; out += "  "; i += 1; continue; }
    if (c === "/" && d === "*") { mode = "block"; out += "  "; i += 1; continue; }
    if (c === "'" || c === '"' || c === "`") { mode = c; out += c; continue; }
    out += c;
  }
  return out;
}

/**
 * Text that legitimately contains a marker, each with the reason it is not product copy.
 * Blanked out before scanning, length-preserving, so the offsets of real findings survive.
 */
const ALLOWED = [
  {
    why: "Spanish licence agreement, governing law and jurisdiction. Contract wording, not style.",
    text: "si usted es consumidor",
  },
  {
    why: "Portuguese (pt-br) legal copy naming a Japanese statute. Italian's rule does not reach it.",
    text: "Lei de Transações Comerciais Especificadas",
  },
];

/**
 * Markers that can only be formal address of the reader.
 * Kept deliberately narrow: see point 3 in the header.
 */
const MARKERS = [
  { lang: "es", label: "Spanish formal pronoun", re: /\busted(es)?\b/gi },
  { lang: "it", label: "Italian formal pronoun", re: /\blei\b/gi },
];

/**
 * Exact sentences that DID drift, pinned so the same regression cannot return quietly.
 * These are the strings the 2026-09-19 sweep replaced. A pin is cheaper than a cleverer scan
 * and it cannot produce a false positive.
 */
const PINS = [
  // Spanish
  "añada una licencia para más",
  "vendemos sus datos",
  "¿Necesita más de cinco?",
  "aprende</span> su flujo de trabajo",
  "Sus ajustes y actividad permanecen en su equipo",
  "estén disponibles en su plan",
  "respalda sus archivos propios",
  "mientras que sus archivos y ajustes locales",
  "Primero pida al asistente",
  "protegemos sus datos.",
  "Si tiene problemas de configuración",
  "Instale VS Code y GitHub Copilot",
  "El inicio de sesión en su cuenta de BugIt",
  // W1 F3 (2026-09-24 cloud audit): the generated add("es",...) override set
  // docs.supportDesc back to the formal imperative, after the informal one was already
  // set by supportDescByLang, because the override ran second. Fixed on both sides
  // (the string itself, and the load order), pinned so either regression is caught.
  "Obtenga ayuda y abra un ticket de soporte",
  // Italian
  "che contiene la sua segnalazione",
  "Usi dry run per esercitarsi",
  "L’accesso al suo account BugIt",
  "restano sul suo dispositivo",
];

function blankAllowed(text) {
  let out = text;
  const missing = [];
  for (const a of ALLOWED) {
    if (!out.includes(a.text)) { missing.push(a); continue; }
    out = out.split(a.text).join(" ".repeat(a.text.length));
  }
  return { out, missing };
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** The scan itself, as a function, so the controls can run it over text of their own. */
function scan(source) {
  const code = blankComments(source);
  const { out, missing } = blankAllowed(code);
  const findings = [];

  for (const m of MARKERS) {
    m.re.lastIndex = 0;
    let hit;
    while ((hit = m.re.exec(out)) !== null) {
      findings.push({
        kind: m.label,
        line: lineOf(out, hit.index),
        quote: out.slice(Math.max(0, hit.index - 60), hit.index + 70).replace(/\s+/g, " ").trim(),
      });
    }
  }
  for (const pin of PINS) {
    let from = 0;
    for (;;) {
      const at = out.indexOf(pin, from);
      if (at === -1) break;
      findings.push({ kind: "formal sentence returned", line: lineOf(out, at), quote: pin });
      from = at + pin.length;
    }
  }
  return { findings, missing };
}

// --- controls: the check must FIND these, or it is not checking anything -------------------
const CONTROLS = [
  { name: "a Spanish formal pronoun", text: 'const t = "cuando usted mismo ejecuta notify test";', expect: 1 },
  { name: "an Italian formal pronoun", text: 'const t = "quando esegue lei stesso notify test";', expect: 1 },
  { name: "a pinned formal sentence", text: 'const t = "El plan Solo. ¿Necesita más de cinco?";', expect: 1 },
  { name: "a marker inside a comment", text: '// usted, lei\nconst t = "todo bien";', expect: 0 },
  { name: "clean informal copy", text: 'const t = "Tu trabajo va a la IA que conectes. Usa dry run.";', expect: 0 },
];

let bad = 0;
for (const c of CONTROLS) {
  const got = scan(c.text).findings.length;
  if (got !== c.expect) {
    console.error(`check-register-es-it: CONTROL FAILED -- ${c.name}: expected ${c.expect} finding(s), got ${got}`);
    bad += 1;
  }
}
if (bad) {
  console.error("check-register-es-it: the check itself is broken; not reporting on app.js.");
  process.exit(1);
}

// --- the real scan --------------------------------------------------------------------------
const { findings, missing } = scan(RAW);

for (const a of missing) {
  console.error(`check-register-es-it: STALE ALLOWANCE -- app.js no longer contains ${JSON.stringify(a.text)}`);
  console.error(`    it was allowed because: ${a.why}`);
  console.error("    Re-read the sentence that replaced it and either update or delete this allowance.");
}

for (const f of findings) {
  console.error(`check-register-es-it: app.js:${f.line}  ${f.kind}`);
  console.error(`    ${f.quote}`);
}

if (findings.length || missing.length) {
  console.error("");
  console.error("Spanish and Italian product copy on this site uses the INFORMAL register (tu / tu),");
  console.error("per the external LQA round of 2026-09-18. German and French are the formal ones.");
  console.error("If a finding is genuinely contract text, add the exact sentence to ALLOWED with its reason.");
  process.exit(1);
}

console.log(
  `check-register-es-it: OK (${CONTROLS.length} controls fired as expected; ` +
    `${MARKERS.length} markers and ${PINS.length} regression pins clean across app.js; ` +
    `${ALLOWED.length} allowances all still matched)`,
);
