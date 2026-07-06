import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true}); fs.mkdirSync(dist,{recursive:true});
for (const item of ['index.html','styles.css','app.js','server.js','public','robots.txt','sitemap.xml','manifest.webmanifest','404.html']) {
  const src = path.join(root,item); if (fs.existsSync(src)) fs.cpSync(src,path.join(dist,item),{recursive:true});
}
console.log('Build complete: dist');
