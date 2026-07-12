import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true}); fs.mkdirSync(dist,{recursive:true});
for (const item of ['index.html','styles.css','app.js','server.js','public','robots.txt','sitemap.xml','manifest.webmanifest','404.html','_headers','.well-known']) {
  const src = path.join(root,item); if (fs.existsSync(src)) fs.cpSync(src,path.join(dist,item),{recursive:true});
}

// Cache-busting. styles.css/app.js are served with a 4h browser cache (max-age=14400),
// so returning visitors keep stale copies after a deploy. Stamp a content hash onto
// their references in the HTML: a changed asset gets a new URL and is fetched right
// away, while the HTML itself is always revalidated (max-age=0). The query string does
// not change which file the server returns — it only changes the browser's cache key.
// Sources stay unversioned so scripts/check-assets.mjs (which reads the source) passes.
const hashOf = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(dist,f))).digest('hex').slice(0,10);
const versions = { 'styles.css': hashOf('styles.css'), 'app.js': hashOf('app.js') };
for (const html of ['index.html','404.html']) {
  const p = path.join(dist,html);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p,'utf8');
  s = s.replace(/(href|src)="\/(styles\.css|app\.js)(?:\?v=[^"]*)?"/g,
    (_m,attr,file) => `${attr}="/${file}?v=${versions[file]}"`);
  fs.writeFileSync(p,s);
}
console.log(`Build complete: dist (styles.css?v=${versions['styles.css']}, app.js?v=${versions['app.js']})`);
