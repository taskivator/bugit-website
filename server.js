import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mp4':'video/mp4','.pdf':'application/pdf','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer((req,res)=>{
  const clean = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, clean === '/' ? 'index.html' : clean);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
  if (!fs.existsSync(file)) file = path.join(root,'index.html');
  res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`BugIt dev server running at http://localhost:${PORT}`));
