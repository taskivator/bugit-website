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

// Cache-busting. styles.css/app.js are served with a 4h browser cache (max-age=14400),
// so returning visitors keep stale copies after a deploy. Stamp a content hash onto
// their references in the HTML: a changed asset gets a new URL and is fetched right
// away, while the HTML itself is always revalidated (max-age=0). The query string does
// not change which file the server returns — it only changes the browser's cache key.
// Sources stay unversioned so scripts/check-assets.mjs (which reads the source) passes.
const hashOf = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(dist,f))).digest('hex').slice(0,10);
const versions = { 'styles.css': hashOf('styles.css'), 'app.js': hashOf('app.js'), 'consent.js': hashOf('consent.js') };
for (const html of ['index.html','404.html']) {
  const p = path.join(dist,html);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p,'utf8');
  s = s.replace(/(href|src)="\/(styles\.css|app\.js|consent\.js)(?:\?v=[^"]*)?"/g,
    (_m,attr,file) => `${attr}="/${file}?v=${versions[file]}"`);
  fs.writeFileSync(p,s);
}
console.log(`Build complete: dist (styles.css?v=${versions['styles.css']}, app.js?v=${versions['app.js']}, consent.js?v=${versions['consent.js']})`);
