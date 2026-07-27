import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root,'dist');

// ---- FAQ language-contamination guard (2026-07-22) --------------------------
// A Russian answer was once pasted into EVERY language's "What is included in
// Team?" FAQ entry, so English/Japanese/etc. all showed Russian. This fails the
// build if any localized FAQ block contains a script that does not belong to it
// (Cyrillic outside `ru`, Kana outside `ja`, Hangul outside `ko`, and any of
// those in a Latin-script block). It scans line-by-line, tracking the current
// `<lang>: [ … ]` block, so a wrong-language paste can never ship again.
{
  const appSrc = fs.readFileSync(path.join(root,'app.js'),'utf8');
  const SCRIPTS = {
    cyrillic:/[Ѐ-ӿ]/, kana:/[぀-ヿ]/,
    hangul:/[가-힣]/,   han:/[一-鿿]/,
  };
  const forbid = {
    en:['cyrillic','kana','hangul','han'], es:['cyrillic','kana','hangul','han'],
    fr:['cyrillic','kana','hangul','han'], de:['cyrillic','kana','hangul','han'],
    it:['cyrillic','kana','hangul','han'], 'pt-br':['cyrillic','kana','hangul','han'],
    ru:['kana','hangul','han'], ja:['cyrillic','hangul'], ko:['cyrillic','kana'],
    zh:['cyrillic','kana','hangul'],
  };
  const lines = appSrc.split('\n'); let cur=null; const problems=[];
  const head=/^\s*'?(en|ja|es|fr|de|pt-br|it|ko|zh|ru)'?\s*:\s*\[/;
  for (let i=0;i<lines.length;i++){
    const ln=lines[i]; const h=head.exec(ln);
    if (h){ cur=h[1]; continue; }
    if (/^\s*\][,;)]?\s*$/.test(ln)){ cur=null; continue; }
    if (!cur) continue;
    const t=ln.trim();
    if (!(t.startsWith("['")||t.startsWith('["'))) continue; // a ['question','answer'] entry
    for (const s of (forbid[cur]||[])) if (SCRIPTS[s].test(ln))
      problems.push(`${cur} FAQ (line ${i+1}) has ${s} script it should not: ${t.slice(0,70)}`);
  }
  if (problems.length){
    console.error('build: FAQ language contamination — a localized answer is in the wrong language:\n  '+problems.join('\n  '));
    process.exit(1);
  }

  // Second, structure-independent guard: the "What is included in Team?" answer
  // exists in the base i18n object, the bugitV16 doc-FAQ, AND the minified add()
  // overrides (single- and double-quoted). Once, Spanish/English/Russian were
  // pasted into the wrong language across all three. This asserts each known Team
  // question is followed by an answer containing THAT language's fingerprint, so a
  // wrong-language paste (even Latin→Latin, which the script guard cannot see)
  // fails the build regardless of which structure it lives in. The fingerprints
  // are the launched-state "available now" phrasing (Team went on sale 2026-07-27);
  // they double as the availability guard — a stale "unavailable" answer no longer
  // carries its language's fingerprint and fails the build.
  const Q2LANG = {
    'What is included in Team?':'en','¿Qué incluye Team?':'es','Que contient Team ?':'fr',
    'Que comprend Team ?':'fr','Was ist in Team enthalten?':'de','Was enthält Team?':'de',
    'O que está incluído no Team?':'pt-br','Cosa include Team?':'it','Что входит в Team?':'ru',
    'Teamには何が含まれますか？':'ja','Team에는 무엇이 포함되나요?':'ko','Team 包含什么？':'zh',
  };
  const FINGERPRINT = {
    en:'available now', es:'ya está disponible',
    fr:'disponible dès maintenant', de:'jetzt verfügbar',
    'pt-br':'já está disponível', it:'è disponibile ora',
    ru:'уже доступен', ja:'現在ご利用いただけます',
    ko:'지금 이용할 수 있습니다', zh:'现已推出',
  };
  const esc = (s)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const faqProblems = [];
  for (const [q,lang] of Object.entries(Q2LANG)){
    const re = new RegExp(esc(q)+"['\"]\\s*,\\s*(['\"])([\\s\\S]*?)\\1","g");
    let mm;
    while ((mm = re.exec(appSrc))){
      if (!mm[2].includes(FINGERPRINT[lang])){
        const line = appSrc.slice(0,mm.index).split('\n').length;
        faqProblems.push(`Team FAQ (line ${line}) for "${q}" is NOT in ${lang}: ${mm[2].slice(0,50)}`);
      }
    }
  }
  if (faqProblems.length){
    console.error('build: Team FAQ language mismatch — an answer is in the wrong language:\n  '+faqProblems.join('\n  '));
    process.exit(1);
  }
  console.log('build: FAQ language guard OK (block scripts + Team-FAQ fingerprints).');
}

fs.rmSync(dist,{recursive:true,force:true}); fs.mkdirSync(dist,{recursive:true});
for (const item of ['index.html','styles.css','app.js','consent.js','server.js','public','robots.txt','sitemap.xml','manifest.webmanifest','404.html','_headers','.well-known']) {
  const src = path.join(root,item); if (fs.existsSync(src)) fs.cpSync(src,path.join(dist,item),{recursive:true});
}

// Build-time Google Ads ID override. consent.js ships a default; a deploy can point
// the tag at a different account via BUGIT_ADS_ID without editing source. The ID is
// defined in exactly one place (the `var ADS_ID='…'` line), so this single swap
// covers every use of it.
const adsId = process.env.BUGIT_ADS_ID;
if (adsId) {
  const cp = path.join(dist,'consent.js');
  let cs = fs.readFileSync(cp,'utf8');
  cs = cs.replace(/var ADS_ID='[^']*';/, `var ADS_ID='${adsId.replace(/'/g,"")}';`);
  fs.writeFileSync(cp,cs);
  console.log(`build: Google Ads ID overridden from BUGIT_ADS_ID (${adsId}).`);
}

// Minify the two hashed assets IN dist (sources stay readable + unversioned).
// Runs before hashing so the content hash reflects the bytes actually served.
// esbuild is a build-time devDependency only — nothing is added to the shipped
// site, which stays dependency-free at runtime. app.js is a classic <script>
// (no import/export), so esbuild leaves top-level names intact and only strips
// comments/whitespace + mangles locals — behavior-preserving.
for (const [file,loader] of [['app.js','js'],['consent.js','js'],['styles.css','css']]) {
  const p = path.join(dist,file);
  const src = fs.readFileSync(p,'utf8');
  // charset:'utf8' keeps embedded unicode (i18n strings) as-is; the esbuild
  // default 'ascii' would \u-escape every multi-byte char and BLOAT app.js.
  const { code } = await esbuild.transform(src,{ loader, minify:true, legalComments:'none', charset:'utf8' });
  fs.writeFileSync(p,code);
}

// Cache-busting by FILENAME, not query string.
//
// This used to emit /app.js?v=<hash> while the file on disk stayed /app.js, and
// _headers pins that path as `immutable, max-age=31536000`. Cloudflare matches
// _headers on PATH, so every ?v= variant inherited a one-year immutable TTL on a
// single, never-changing path. On 2026-07-20 that combination pinned a STALE
// app.js at the edge under a BRAND-NEW ?v= key: the deploy raced propagation, the
// edge cached the old body against the new key, and served it as immutable. The
// site shipped new CSS with old JS, and the entry could not be evicted — the
// available Cloudflare tokens have no cache-purge permission, so there was no way
// to fix it except waiting up to a year.
//
// Hashing the filename removes the failure mode by construction: changed content
// means a path that has never been requested, so it cannot collide with a
// poisoned entry, and `immutable` becomes truthful rather than a gamble. The
// unhashed originals are deleted so a stale /app.js can never be referenced again.
// Sources stay unversioned so scripts/check-assets.mjs (which reads the source)
// keeps passing.
const hashOf = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(dist,f))).digest('hex').slice(0,10);
const hashedName = (f,h) => f.replace(/\.(js|css)$/, `.${h}.$1`);
const built = {};
for (const f of ['styles.css','app.js','consent.js']) {
  const h = hashOf(f);
  const name = hashedName(f,h);
  fs.renameSync(path.join(dist,f), path.join(dist,name));
  built[f] = name;
}
for (const html of ['index.html','404.html']) {
  const p = path.join(dist,html);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p,'utf8');
  s = s.replace(/(href|src)="\/(styles\.css|app\.js|consent\.js)(?:\?v=[^"]*)?"/g,
    (_m,attr,file) => `${attr}="/${built[file]}"`);
  fs.writeFileSync(p,s);
  // A missed reference would 404 in production, so fail the build instead.
  const stale = s.match(/(?:href|src)="\/(?:styles\.css|app\.js|consent\.js)(?:\?[^"]*)?"/);
  if (stale) { console.error(`build: ${html} still references an unhashed asset: ${stale[0]}`); process.exit(1); }
}
console.log(`Build complete: dist (${built['styles.css']}, ${built['app.js']}, ${built['consent.js']})`);
