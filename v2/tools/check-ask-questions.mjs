// The Ask bar SHOWS a short question (ask-questions.json, one line on a phone) and, when pressed,
// ASKS the Guide's own wording of the same question (the first phrasing of that id in
// public/guide/prepared/<lang>.json). The asked text must reach its answer through the Guide's
// real matcher in every language. Writes js.qN (shown) and js.aN (asked) into v2/i18n/<lang>.json.
//   node v2/tools/check-ask-questions.mjs [--write]
import fs from "node:fs";
import { buildPreparedBank, answerFor } from "../../public/guide/match.js";
const Q = JSON.parse(fs.readFileSync("v2/tools/ask-questions.json", "utf8"));
const WRITE = process.argv.includes("--write");
let bad = 0;
for (const l of Object.keys(Q).filter((k) => !k.startsWith("_") && k !== "ids")) {
  const doc = JSON.parse(fs.readFileSync(`public/guide/prepared/${l}.json`, "utf8"));
  const bank = buildPreparedBank([{ lang: l, items: doc.items }], {});
  const asked = Q.ids.map((id) => { const it = doc.items.find((x) => x.id === id); return it ? String(it.question || (it.questions || [])[0] || "") : ""; });
  Q[l].forEach((shown, i) => {
    const q = asked[i];
    const d = answerFor(bank, l, q), want = Q.ids[i];
    const got = d.item ? d.item.id : "-";
    if (d.kind !== "answer" || got !== want) { bad++; console.log(`FAIL ${l} q${i + 1} "${q}" -> ${d.kind} ${got} (want ${want})`); }
    if (/\s[–—-]\s|—|–/.test(shown)) { bad++; console.log(`DASH ${l} q${i + 1}`); }
  });
  if (WRITE && !bad) {
    const p = `v2/i18n/${l}.json`, j = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const k of Object.keys(j)) if (/^js\.[qa]\d+$/.test(k)) delete j[k];
    Q[l].forEach((q, i) => { j["js.q" + (i + 1)] = q; j["js.a" + (i + 1)] = asked[i]; });
    j.t015 = Q[l][0];
    fs.writeFileSync(p, JSON.stringify(j, null, 1) + "\n");
  }
}
console.log(bad ? `${bad} problem(s)` : "every question reaches its answer in every language");
process.exit(bad ? 1 : 0);
