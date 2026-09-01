import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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
// EVERYTHING BELOW IS PUBLISHED TO bugit.dev VERBATIM, so this list is a decision about what
// the public gets, not a convenience. `server.js` was on it and should never have been: it is
// the LOCAL PREVIEW SERVER, every rendering guard spawns it from the repo root rather than
// from dist, and nothing in dist ever loaded it -- yet `https://bugit.dev/server.js` answered
// 200 with its source for as long as the build has existed. check-assets.mjs now computes the
// set of scripts in dist and fails any that import a node: builtin, so the next one cannot
// arrive quietly under a different name.
for (const item of ['index.html','styles.css','app.js','consent.js','public','robots.txt','sitemap.xml','manifest.webmanifest','404.html','_headers','.well-known','verify.json']) {
  const src = path.join(root,item); if (fs.existsSync(src)) fs.cpSync(src,path.join(dist,item),{recursive:true});
}

// ---------------------------------------------------------------- localized /404.html
//
// A MISTYPED URL LANDED EVERY READER ON AN ENGLISH PAGE. The site ships eleven languages and
// the in-app not-found view is translated into all of them, but `404.html` -- the page the
// EDGE serves for a path that is not a hash route -- was a third, English-only copy of the
// same two sentences.
//
// The strings come from app.js, from the one table the in-app view uses, so the hard 404 and
// the in-app one cannot drift apart. Read at build time rather than duplicated here: this file
// is where the two would otherwise become copies four and five.
{
  const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const literal = (name, re) => {
    const m = appSrc.match(re);
    if (!m) {
      console.error(`build: could not read ${name} out of app.js, so /404.js cannot be `
        + 'generated. The 404 page would silently go back to English only.');
      process.exit(1);
    }
    return new Function(`return ${m[1]}`)();
  };
  const base = literal('NOT_FOUND', /const NOT_FOUND = (\{[\s\S]*?\n\});/);
  const site = literal('_siteNotFound', /const _siteNotFound=(\{[\s\S]*?\n\});/);
  const strings = { ...base };
  for (const code of Object.keys(site)) {
    strings[code] = { title: site[code].title, body: site[code].body, home: site[code].home };
  }
  // An empty or one-language table would produce a page that is English everywhere and a build
  // that says nothing about it.
  const codes = Object.keys(strings);
  if (codes.length < 11) {
    console.error(`build: only ${codes.length} not-found translations found (${codes.join(', ')}). `
      + 'The site ships eleven languages; publishing this would leave the 404 page English for '
      + 'the rest.');
    process.exit(1);
  }
  const js = '/* generated by build.js from the NOT_FOUND table in app.js. Do not edit. */\n'
    + '(function(){try{'
    + 'var T=' + JSON.stringify(strings) + ';'
    + 'var m=document.cookie.match(/(?:^|; )bugitLang=([^;]+)/);'
    + "var l=m?decodeURIComponent(m[1]):'';"
    + 'var t=T[l];if(!t)return;'
    + 'var d=document.documentElement;'
    + "d.lang=l;d.dir=(l==='ar')?'rtl':'ltr';"
    + "document.title=t.title+' \\u00b7 BugIt';"
    + "var b=document.getElementById('nf-body');if(b)b.textContent=t.body;"
    + "var h=document.getElementById('nf-home');if(h)h.textContent=t.home;"
    + '}catch(e){}})();\n';
  fs.writeFileSync(path.join(dist, '404.js'), js);
  console.log(`build: /404.js generated for ${codes.length} languages.`);
}

// ---------------------------------------------------------------- /favicon.ico
//
// A BROWSER ASKS FOR /favicon.ico WHETHER OR NOT THE PAGE DECLARES AN ICON, and so do a lot of
// things that never parse the HTML at all: bookmark managers, feed readers, link-preview
// fetchers, some crawlers. The site declares four icons under /public/brand/ and served
// nothing at the root, so every one of those requests got a 404 -- the icon exists, at
// public/brand/favicon.ico, and was simply never published where the default lookup goes.
//
// Copied rather than redirected: it is 15 KB, it is requested on nearly every cold visit, and
// a redirect for it costs a round trip on the critical path for no benefit.
{
  const ico = path.join(root, 'public', 'brand', 'favicon.ico');
  if (fs.existsSync(ico)) {
    fs.cpSync(ico, path.join(dist, 'favicon.ico'));
    console.log('build: /favicon.ico published at the root (the default lookup path).');
  } else {
    console.error('build: public/brand/favicon.ico is missing, so /favicon.ico will 404.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------- sitemap lastmod
//
// `lastmod` told crawlers the site had not changed since 2026-07-19, on a build whose content
// changed on 2026-08-27. It was a literal in sitemap.xml, so it was only ever right on the day
// somebody typed it, and the effect of being wrong is that a crawler defers a re-crawl -- the
// new content is live and unread.
//
// Derived from the last COMMIT that touched a published file, not from the clock: a rebuild
// with no content change must not claim the site changed, and `git log` is the only thing here
// that knows the difference. Falls back to whatever is in the file if git cannot answer, which
// is no worse than today.
{
  const sp = path.join(dist, 'sitemap.xml');
  if (fs.existsSync(sp)) {
    let stamped = null;
    try {
      const out = execFileSync(
        'git',
        ['log', '-1', '--format=%cs', '--', 'index.html', 'app.js', 'styles.css', 'public'],
        { cwd: root, encoding: 'utf8' },
      ).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(out)) stamped = out;
    } catch { /* no git here; keep the literal */ }
    if (stamped) {
      const before = fs.readFileSync(sp, 'utf8');
      const after = before.replace(
        /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g,
        `<lastmod>${stamped}</lastmod>`,
      );
      if (after !== before) {
        fs.writeFileSync(sp, after);
        console.log(`build: sitemap lastmod stamped ${stamped} (last content commit).`);
      }
    } else {
      console.log('build: sitemap lastmod left as written (git could not date the content).');
    }
  }
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
// The demo clips get the SAME treatment, and for the same reason.
//
// They were left unhashed while _headers caches /public/media/* for a week. On
// 2026-08-12 the clips were re-rendered and redeployed under their existing names:
// the HTML and CSS went live, and every video came back `cf-cache-status: HIT` at
// its OLD byte size. The deploy succeeded and the delivery did not, which is the
// failure this file already documents for app.js -- it simply had not been applied
// to media. Purging is not an option here; the note above is explicit that the
// available Cloudflare tokens carry no cache-purge permission.
//
// Hashing the filename makes a re-render a path that has never been requested, so
// it cannot be served from a stale entry. Sources stay unversioned so
// scripts/check-assets.mjs keeps verifying real files on disk.
const mediaDir = path.join(dist,'public','media');
const media = {};
if (fs.existsSync(mediaDir)) {
  for (const f of fs.readdirSync(mediaDir).filter((n) => n.endsWith('.mp4'))) {
    const h = crypto.createHash('md5').update(fs.readFileSync(path.join(mediaDir,f))).digest('hex').slice(0,10);
    const name = f.replace(/\.mp4$/, `.${h}.mp4`);
    fs.renameSync(path.join(mediaDir,f), path.join(mediaDir,name));
    media[f] = name;
  }
}

for (const html of ['index.html','404.html']) {
  const p = path.join(dist,html);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p,'utf8');
  s = s.replace(/(href|src)="\/(styles\.css|app\.js|consent\.js)(?:\?v=[^"]*)?"/g,
    (_m,attr,file) => `${attr}="/${built[file]}"`);
  // src= plus the data-landscape/data-portrait pair the player swaps between.
  s = s.replace(/\/public\/media\/([A-Za-z0-9._-]+\.mp4)/g,
    (m,file) => media[file] ? `/public/media/${media[file]}` : m);
  fs.writeFileSync(p,s);
  // A missed reference would 404 in production, so fail the build instead.
  const stale = s.match(/(?:href|src)="\/(?:styles\.css|app\.js|consent\.js)(?:\?[^"]*)?"/);
  if (stale) { console.error(`build: ${html} still references an unhashed asset: ${stale[0]}`); process.exit(1); }
  for (const f of Object.keys(media)) {
    if (s.includes(`/public/media/${f}"`) || s.includes(`/public/media/${f}'`)) {
      console.error(`build: ${html} still references unhashed media: ${f}`); process.exit(1);
    }
  }
}
console.log(`Build complete: dist (${built['styles.css']}, ${built['app.js']}, ${built['consent.js']})`);
