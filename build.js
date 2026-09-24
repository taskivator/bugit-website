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
// WHICH OF THESE MAY BE ABSENT, SAID OUT LOUD (CR-08-F07).
//
// Every item was copied `if (fs.existsSync(src))`, so a missing file was indistinguishable from
// a copied one and the build printed "Build complete" either way. That is fine for a file that
// is genuinely optional and catastrophic for `index.html`, which IS the site, or for `_headers`,
// which carries the CSP, HSTS and frame-ancestors rules that `check-security-headers.mjs`
// verifies against the SOURCE rather than against dist. A build missing it deploys a site with
// no security headers at all and says nothing.
//
// So absence is a decision rather than an accident: the required ones stop the build and the
// optional ones are named as skipped, which is the same distinction `attachment` and `sidecar`
// handling makes everywhere else in this project.
// `_redirects` joined this set on 2026-09-23. It is the same shape of file as `_headers`:
// a Cloudflare Pages control file whose absence is completely silent. Without it every
// clean URL on this site answers 404 again -- /pricing, /privacy, /terms, /support and
// twenty more -- and nothing in the build, the gates or the deploy would say a word.
const REQUIRED_AT_ROOT = new Set(['index.html','styles.css','app.js','consent.js','404.html','_headers','_redirects']);
const skippedOptional = [];
for (const item of ['index.html','styles.css','app.js','consent.js','public','robots.txt','sitemap.xml','manifest.webmanifest','404.html','_headers','_redirects','.well-known','verify.json']) {
  const src = path.join(root,item);
  if (!fs.existsSync(src)) {
    if (REQUIRED_AT_ROOT.has(item)) {
      console.error(
        `build: ${item} is missing from the source tree. It is required, and copying silently\n` +
        `       skipped it before, so the build reported success while shipping a site without\n` +
        `       it. Refusing rather than deploying whatever this would have produced.`);
      process.exit(1);
    }
    skippedOptional.push(item);
    continue;
  }
  fs.cpSync(src,path.join(dist,item),{recursive:true});
}

// ---------------------------------------------------------- internal build notes are not a customer surface
//
// W1 F7 (2026-09-24 audit). `public/` is copied to dist WHOLESALE above, and four files in it
// are read by OTHER check scripts (check-brand-sync, check-channel, check-docs, guides-fresh)
// from the SOURCE tree, not from dist -- they have to stay in public/ for those checks to keep
// working. Nothing on the site itself reads them: no <script>, no fetch, no link. Shipped as
// part of dist they are internal detail with no reason to be on bugit.dev -- SYNC-RECEIPT.json
// and MANIFEST.json name Logo.tsx and internal check scripts, channel.json cites
// "scratchpad/yt_orient.py", and guides-manifest.json lists toolchain versions and internal
// agent-repo paths. So this removes the dist COPIES only, after they have already served their
// purpose (nothing downstream of this point reads dist/public), leaving the source files alone.
const INTERNAL_ONLY = [
  'public/brand/SYNC-RECEIPT.json',
  'public/brand/MANIFEST.json',
  'public/media/youtube/channel.json',
  'public/docs/guides/guides-manifest.json',
];
for (const rel of INTERNAL_ONLY) {
  const p = path.join(dist, ...rel.split('/'));
  if (fs.existsSync(p)) fs.rmSync(p);
}
console.log(`build: ${INTERNAL_ONLY.length} internal build note(s) kept out of dist (still read from public/ by other checks).`);

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
// THE PATTERN DID NOT MATCH THE LINE IT WAS AIMED AT, AND IT SAID IT HAD (CR-08-F04).
//
// `consent.js` declares `var ADS_ID = 'AW-...';` with spaces around the `=`, and the pattern
// required none. So `replace` was a no-op on every build, and the line below printed
// "Google Ads ID overridden from BUGIT_ADS_ID" anyway, because it was outside the question.
// A deploy that pointed the tag at a different account got the default account and a log line
// saying otherwise: conversions attributed to the wrong advertiser, with nothing to notice by.
//
// `check-ads-tag.mjs` could not catch it either, because it compares against the id in the
// SOURCE, which is the value the broken substitution left in place.
//
// Whitespace is now tolerated, and the substitution is CHECKED rather than announced. A
// build-time override that silently does nothing is worse than no override, so a failure to
// apply it stops the build rather than printing a sentence nobody will re-read.
const adsId = process.env.BUGIT_ADS_ID;
if (adsId) {
  const cp = path.join(dist,'consent.js');
  const before = fs.readFileSync(cp,'utf8');
  const clean = adsId.replace(/'/g,"");
  const cs = before.replace(/var\s+ADS_ID\s*=\s*'[^']*'\s*;/, `var ADS_ID = '${clean}';`);
  if (cs === before) {
    console.error(
      `build: BUGIT_ADS_ID is set (${adsId}) and the ADS_ID declaration in consent.js could not\n` +
      `       be found, so the tag would ship pointing at the DEFAULT account while this build\n` +
      `       reported an override. Refusing. Look for the \`var ADS_ID = '...'\` line.`);
    process.exit(1);
  }
  fs.writeFileSync(cp,cs);
  // Read back, because a substitution that produced the wrong text is the same failure with
  // extra steps. This is the one assertion that the shipped bytes carry the requested account.
  if (!fs.readFileSync(cp,'utf8').includes(`var ADS_ID = '${clean}';`)) {
    console.error('build: the ADS_ID override did not survive the write to dist/consent.js.');
    process.exit(1);
  }
  console.log(`build: Google Ads ID overridden from BUGIT_ADS_ID (${clean}).`);
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
// 404.js joins them from 2026-09-21. It is generated from the NOT_FOUND table in app.js, so
// its CONTENT changes with a release while its PATH never did, and _headers asking for
// max-age=0 did not save it: the edge bumps .js to its own four hour browser TTL regardless.
// Same defect as the Guide's code, same remedy.
for (const f of ['styles.css','app.js','consent.js','404.js'].filter((n) => fs.existsSync(path.join(dist,n)))) {
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

// THE GUIDE'S OWN CODE GETS THE SAME TREATMENT, and the reason is worth stating because
// _headers already tries to solve this and cannot.
//
// WHAT WENT WRONG, 2026-09-21. The owner reported two Guide bugs still present on his phone
// AFTER a deploy this repository had verified byte-identical at the edge. Both fixes were
// genuinely live. His browser was holding the PREVIOUS guide.css and guide.js, because those
// two filenames carry no content hash and so never change.
//
// _headers ASKS for the right thing and is overridden. It sets `/public/guide/* max-age=0,
// must-revalidate` precisely so a corrected answer cannot sit in a cache for hours. Measured
// against the live site, that rule is honoured for sources.json and for the prepared answer
// bank, and silently ignored for guide.css and guide.js, which come back `max-age=14400`: the
// edge bumps those two extensions to its own four hour browser TTL. So the one rule written to
// keep the Guide correctable works on the Guide's DATA and is defeated on the Guide's CODE,
// which is the half that needed it. /404.js is served the same way, for the same reason.
//
// A header we do not control cannot be argued with. A filename can. Hashing makes a changed
// file a path that has never been requested, so no cache anywhere can answer it with
// yesterday's bytes, and `immutable` becomes true rather than hopeful. This is the same
// argument the block above makes for app.js and for the demo clips; the Guide was never added.
const guideDir = path.join(dist,'public','guide');
const guideAssets = {};
if (fs.existsSync(guideDir)) {
  const codeFiles = fs.readdirSync(guideDir).filter((n) => /\.(js|css)$/.test(n));
  const stamp = (f) => {
    const src = path.join(guideDir,f);
    const h = crypto.createHash('md5').update(fs.readFileSync(src)).digest('hex').slice(0,10);
    const name = f.replace(/\.(js|css)$/, `.${h}.$1`);
    fs.renameSync(src, path.join(guideDir,name));
    guideAssets[f] = name;
    return name;
  };

  // DEPENDENCIES FIRST, then the entry point, and the order is the whole trick. guide.js is an
  // ES module that imports ./match.js, which is where the answer matching lives. Hashing the
  // entry point while leaving its import unhashed would fix half of this and leave the half that
  // decides what the Guide SAYS stuck behind the same four hour cache.
  const entryPoints = new Set(['guide.js','guide.css']);
  for (const f of codeFiles.filter((n) => !entryPoints.has(n))) stamp(f);

  // Rewrite the imports BEFORE hashing guide.js, so its hash describes the bytes actually served
  // rather than the bytes before the rewrite. Getting this backwards produces a filename that
  // promises immutability for content it does not describe, which is worse than no hash at all.
  const entryJs = path.join(guideDir,'guide.js');
  if (fs.existsSync(entryJs) && Object.keys(guideAssets).length) {
    let code = fs.readFileSync(entryJs,'utf8');
    for (const [from,to] of Object.entries(guideAssets)) {
      code = code.split(`./${from}`).join(`./${to}`);
    }
    fs.writeFileSync(entryJs, code);
    const missed = code.match(/["']\.\/[A-Za-z0-9._-]+\.(?:js|css)["']/g) || [];
    const unhashed = missed.filter((m) => !/\.[a-f0-9]{10}\.(?:js|css)["']$/.test(m));
    if (unhashed.length) {
      console.error(`build: the Guide's entry point still imports an unhashed module: ${unhashed.join(', ')}`);
      process.exit(1);
    }
  }

  for (const f of codeFiles.filter((n) => entryPoints.has(n))) if (fs.existsSync(path.join(guideDir,f))) stamp(f);
  console.log(`build: the Guide's code is content-hashed (${Object.values(guideAssets).join(', ') || 'nothing found'}).`);
}

for (const html of ['index.html','404.html']) {
  const p = path.join(dist,html);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p,'utf8');
  s = s.replace(/(href|src)="\/(styles\.css|app\.js|consent\.js|404\.js)(?:\?v=[^"]*)?"/g,
    (_m,attr,file) => built[file] ? `${attr}="/${built[file]}"` : _m);
  // src= plus the data-landscape/data-portrait pair the player swaps between.
  s = s.replace(/\/public\/media\/([A-Za-z0-9._-]+\.mp4)/g,
    (m,file) => media[file] ? `/public/media/${media[file]}` : m);
  s = s.replace(/(href|src)="\/public\/guide\/(guide\.css|guide\.js)"/g,
    (m,attr,file) => guideAssets[file] ? `${attr}="/public/guide/${guideAssets[file]}"` : m);
  fs.writeFileSync(p,s);
  // A missed reference would 404 in production, so fail the build instead.
  const stale = s.match(/(?:href|src)="\/(?:styles\.css|app\.js|consent\.js|404\.js)(?:\?[^"]*)?"/);
  if (stale) { console.error(`build: ${html} still references an unhashed asset: ${stale[0]}`); process.exit(1); }
  for (const f of Object.keys(media)) {
    if (s.includes(`/public/media/${f}"`) || s.includes(`/public/media/${f}'`)) {
      console.error(`build: ${html} still references unhashed media: ${f}`); process.exit(1);
    }
  }
  // The same refusal for the Guide. A missed reference here would NOT 404 loudly: server.js
  // falls back to the SPA with HTTP 200 and HTML for any unknown path, so the page would load
  // and the Guide would simply be dead on it. Fail the build instead.
  const staleGuide = s.match(/(?:href|src)="\/public\/guide\/guide\.(?:css|js)"/);
  if (staleGuide && Object.keys(guideAssets).length) {
    console.error(`build: ${html} still references an unhashed Guide asset: ${staleGuide[0]}`); process.exit(1);
  }
}
// Named rather than counted. An optional file that stopped being copied is something somebody
// should see once, at the end, rather than discover from a 404 in production.
if (skippedOptional.length) {
  console.log(`build: not present in the source tree, so not copied: ${skippedOptional.join(', ')}`);
}
// PROVE THE REMOVAL ABOVE ACTUALLY HAPPENED. `fs.existsSync` in that loop makes the removal a
// silent no-op if a path is ever renamed there without renaming it here, or vice versa, and
// "build: 4 internal build note(s) kept out of dist" would keep printing whatever the number
// actually is. So the end of the build asserts the real state of dist, not the loop's own count:
// none of the four files may exist in dist, and each has to still be in the SOURCE tree, because
// a source file removed by accident would make dist "clean" for the wrong reason.
for (const rel of INTERNAL_ONLY) {
  if (!fs.existsSync(path.join(root, ...rel.split('/')))) {
    console.error(`build: ${rel} is missing from the SOURCE tree. check-brand-sync, check-channel, ` +
      'check-docs and guides-fresh read it from public/, not from dist, so this is not the removal ' +
      'above working -- it is the file gone from both places.');
    process.exit(1);
  }
  if (fs.existsSync(path.join(dist, ...rel.split('/')))) {
    console.error(`build: ${rel} shipped to dist. It is internal build detail, not a customer surface.`);
    process.exit(1);
  }
}
console.log(`Build complete: dist (${built['styles.css']}, ${built['app.js']}, ${built['consent.js']})`);
