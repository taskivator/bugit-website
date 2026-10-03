// Checks every v2/i18n/<lang>.json against en.json: the same keys, the same HTML tags (by name
// and count, so a translation cannot drop a <kbd> or break a <span class="grad">), the same
// {placeholders}, FILE IT kept verbatim wherever English has it, and no dash used as punctuation
// (owner rule: no dashes in copy).   node v2/tools/check-i18n.mjs [lang ...]
import fs from "node:fs";
const DIR = new URL("../i18n/", import.meta.url);
const en = JSON.parse(fs.readFileSync(new URL("en.json", DIR), "utf8"));
const want = process.argv.slice(2);
const langs = want.length ? want : fs.readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "en.json").map((f) => f.slice(0, -5));
const tags = (s) => (String(s).match(/<\/?[a-z][a-z0-9]*/gi) || []).map((t) => t.toLowerCase()).filter((t) => !/^<\/?bdi$/.test(t)).sort().join(" ");
const attrs = (s) => (String(s).match(/\s(?:class|href|id|data-[a-z-]+)="[^"]*"/g) || []).sort().join(" ");
const ph = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(" ");
let bad = 0;
for (const l of langs) {
  const p = new URL(l + ".json", DIR);
  if (!fs.existsSync(p)) { console.log(`${l}: MISSING`); bad++; continue; }
  let d; try { d = JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { console.log(`${l}: invalid JSON ${e.message}`); bad++; continue; }
  const out = [];
  for (const k of Object.keys(en)) {
    if (!(k in d)) { out.push(`missing ${k}`); continue; }
    const a = en[k], b = d[k];
    if (typeof b !== "string" || !b.trim()) { out.push(`empty ${k}`); continue; }
    if (tags(a) !== tags(b)) out.push(`${k}: tags differ\n    en: ${tags(a)}\n    ${l}: ${tags(b)}`);
    if (attrs(a) !== attrs(b)) out.push(`${k}: attributes differ`);
    if (ph(a) !== ph(b)) out.push(`${k}: placeholders differ`);
    if (/FILE IT/.test(a) && !/FILE IT/.test(b)) out.push(`${k}: FILE IT must stay verbatim`);
    if (/\s[–—-]\s|—/.test(b.replace(/<[^>]+>/g, ""))) out.push(`${k}: dash used as punctuation`);
  }
  for (const k of Object.keys(d)) if (!(k in en)) out.push(`extra key ${k}`);
  if (out.length) { bad++; console.log(`${l}: ${out.length} problem(s)\n  ` + out.join("\n  ")); }
  else console.log(`${l}: OK (${Object.keys(en).length} strings)`);
}
process.exit(bad ? 1 : 0);
