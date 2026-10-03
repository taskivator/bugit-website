// Builds v2/docs/content.<lang>.json from the live site's own dictionaries (app.js as served on
// :3077), so the v2 docs reuse every reviewed translation: page titles, intros, shelf
// descriptions, FAQ (with the requirements item first, as on bugit.dev), guide labels, UI words.
import { chromium } from "playwright";
import fs from "node:fs";
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("http://127.0.0.1:3077/", { waitUntil: "networkidle" });
const all = await p.evaluate(() => {
  const out = {};
  for (const l of Object.keys(i18n)) {
    const d = i18n[l], e = i18n.en;
    const docPages = { ...e.docPages, ...(d.docPages || {}) }; delete docPages.sections;
    out[l] = { docPages, docs: { ...e.docs, ...(d.docs || {}) },
      faq: [reqFaqItem(l)].concat((d.faq && d.faq.items) || e.faq.items),
      dl: docDownloadLabels[l] || docDownloadLabels.en, ui: { ...docUiText.en, ...(docUiText[l] || {}) } };
  }
  return out;
});
await b.close();
for (const [l, c] of Object.entries(all)) {
  fs.writeFileSync(`v2/docs/content.${l}.json`, JSON.stringify(c, null, 1) + "\n");
  console.log(l, c.faq.length, "faq");
}
