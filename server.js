import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mp4':'video/mp4','.pdf':'application/pdf','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer((req,res)=>{ try {
  // `/%`, `/%zz` and any other malformed escape make decodeURIComponent THROW. Thrown here it
  // is an uncaught exception and the process exits -- one bad URL ends the server, and the
  // fifteen guards that render against it then report a dead site instead of a clean one.
  let clean;
  try { clean = decodeURIComponent(req.url.split('?')[0]); }
  catch { res.writeHead(400); return res.end('Bad Request'); }
  let file = path.join(root, clean === '/' ? 'index.html' : clean);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
  if (!fs.existsSync(file)) file = path.join(root,'index.html');
  res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'});
  const stream = fs.createReadStream(file);
  // A client that walks away mid-response used to take the whole server with it: Chromium
  // aborts the demo videos on every render, and an unhandled 'error' on either half of this
  // pipe is an uncaught exception. Fifteen guards render against this server, and a dead
  // server reads as a dead site.
  stream.on('error', () => { if (!res.writableEnded) res.end(); });
  res.on('error', () => stream.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
} catch (e) {
  // Whatever the next unanticipated throw turns out to be, it is a 500, not an exit.
  try { if (!res.headersSent) res.writeHead(500); res.end('Server Error'); } catch {}
}});
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`BugIt dev server running at http://localhost:${PORT}`));
