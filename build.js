import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root,'dist');
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
