/* ONE BAD URL MUST NOT END THE PREVIEW SERVER.

   Fifteen guards render the site against `server.js`. On 2026-08-21 it died three jobs into a
   fifty-five job sweep and check-space reported ERR_CONNECTION_REFUSED for every route after
   it -- a dead site, when the site was fine.

   The cause, measured rather than assumed: `decodeURIComponent(req.url)` THROWS on a malformed
   percent-escape, and a throw inside the request handler is an uncaught exception. `/%` ends
   the process on its first request.

   My first guess was the aborted video reads, and it was wrong -- 400 aborted mid-body reads
   leave the server running, and the guard I wrote from that guess PASSED against the crashing
   code. It is kept below as a second axis, but the malformed-URL case is the one that earns
   this file. A guard that cannot fail is decoration.

   A harness that dies silently is worse than one that fails: it reports the page as broken. */
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = [];

const freePort = () => new Promise((res, rej) => {
  const p = net.createServer();
  p.on("error", rej);
  p.listen(0, "127.0.0.1", () => { const { port } = p.address(); p.close(() => res(port)); });
});

const PORT = await freePort();
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "ignore", "pipe"] });
let stderr = "";
server.stderr.on("data", (b) => { stderr += b.toString(); });
let exited = null;
server.on("exit", (code) => { exited = code; });

const base = `http://127.0.0.1:${PORT}`;
const alive = async () => { try { const r = await fetch(base + "/"); return r.ok; } catch { return false; } };
for (let i = 0; i < 80 && !(await alive()); i++) await new Promise((r) => setTimeout(r, 150));
if (!(await alive())) { console.error("check-dev-server FAIL: the preview server never came up"); server.kill(); process.exit(1); }

/* The biggest thing the site serves, so there is a real body in flight to interrupt. */
const BIG = "/public/media/BugIt-Demo-Core-Workflow.mp4";

const abortMidBody = () => new Promise((done) => {
  const req = http.get(base + BIG, (res) => {
    let seen = 0;
    res.on("data", (c) => { seen += c.length; if (seen > 2048) { req.destroy(); done(); } });
    res.on("end", done);
    res.on("error", done);
  });
  req.on("error", done);
  setTimeout(done, 4000);
});

const abortAtHeaders = () => new Promise((done) => {
  const req = http.get(base + BIG, (res) => { res.destroy(); req.destroy(); done(); });
  req.on("error", done);
  setTimeout(done, 4000);
});

/* No HTTP client at all: open the socket, send the request line, hang up without reading. */
const hangUpRaw = () => new Promise((done) => {
  const s = net.connect(PORT, "127.0.0.1", () => {
    s.write(`GET ${BIG} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n`);
    setTimeout(() => { s.destroy(); done(); }, 60);
  });
  s.on("error", done);
  setTimeout(done, 4000);
});

/* THE ONE THAT ACTUALLY KILLED IT. Each of these makes decodeURIComponent throw. */
const MALFORMED = ["/%", "/%zz.css", "/%E0%A4%A", "/docs/%%", "/style%.css"];
const malformed = async () => {
  for (const u of MALFORMED) {
    let status = null;
    try { status = (await fetch(base + u)).status; } catch { /* dead or refusing: caught below */ }
    if (status === null) { fail.push(`a malformed URL (${u}) killed the server or refused the connection`); return; }
    if (status >= 500) fail.push(`a malformed URL (${u}) answered ${status}; it should be a clean 4xx`);
  }
};

const cases = [["malformed url", malformed], ["abort mid-body", abortMidBody], ["abort at headers", abortAtHeaders], ["hang up raw", hangUpRaw]];
for (const [name, run] of cases) {
  for (let i = 0; i < (name === "malformed url" ? 1 : 4); i++) await run();
  await new Promise((r) => setTimeout(r, 120));
  if (exited !== null) { fail.push(`${name}: the server exited (code ${exited})`); break; }
  if (!(await alive())) fail.push(`${name}: the server stopped answering`);
}

if (exited === null && !(await alive())) fail.push("the server stopped answering after the aborts");
if (stderr.trim()) fail.push("the server wrote to stderr: " + stderr.trim().split("\n")[0]);

server.kill();
if (fail.length) {
  console.error("check-dev-server FAIL");
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log("check-dev-server OK: a malformed URL is a clean 4xx, and an aborted, abandoned or hung-up request does not kill the preview server");
