/* THE GUARD FOR scripts/lib/chrome-devtools.mjs.
 *
 * WHY IT EXISTS. On 2026-09-04 `check-overflow.mjs` went red in CI with "Chrome DevTools
 * endpoint never came up" and passed on the same commit locally with 3300 assertions. The wait
 * was 80 polls of 150ms -- twelve seconds -- measured on a machine where Chrome is already
 * warm. That sentence also covered a second, opposite failure: a Chrome that had already died.
 * One message for "too slow" and "already dead" sends the reader to the wrong place, and a gate
 * that flakes is a gate people re-run instead of read.
 *
 * The fix is only worth having if both branches can be SHOWN, and a real Chrome that dies on a
 * hosted runner is not something you can ask for on demand. Behind the seam a two-line fake
 * child produces each case in milliseconds, which is the same argument check-browser-session.mjs
 * makes for browser-session.mjs.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { waitForDevTools, DEFAULT_TIMEOUT_MS } from './lib/chrome-devtools.mjs';

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}`);
  if (detail) console.log(`          ${String(detail).split('\n').join('\n          ')}`);
  if (!ok) failures++;
};

const alive = () => spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000);'],
                          { stdio: ['ignore', 'ignore', 'pipe'] });

// A child that says what Chrome says. Real Chrome announces its endpoint on stderr:
//     DevTools listening on ws://127.0.0.1:9411/devtools/browser/<uuid>
// That line, on the stderr of the process WE spawned, is the ownership proof the helper uses
// first -- because Chrome 153 stopped writing DevToolsActivePort at all. See the block below.
const announcing = (port, id) =>
  spawn(process.execPath,
        ['-e', `process.stderr.write("DevTools listening on ws://127.0.0.1:${port}/devtools/browser/${id}\\n");setTimeout(() => {}, 60000);`],
        { stdio: ['ignore', 'ignore', 'pipe'] });

// ASK THE OS FOR A PORT, NEVER GUESS ONE. This file used to hard-code 59991 to 59994. Windows
// reserves blocks of high ports when Hyper-V or WSL is present -- `netsh interface ipv4 show
// excludedportrange protocol=tcp` lists them -- and it RE-RANDOMISES those blocks on every boot.
// On a boot whose exclusions covered 59959 to 60058, the two cases below that must listen() died
// with EACCES and took the process with them, so the last two checks in this file never ran and
// the whole suite went red. The two cases that only CONNECT survived, because a refused
// connection is what they assert, which is why the failure looked partial and arbitrary.
//
// A port the OS hands out is a port the OS has not reserved. `freePort` also serves the cases
// that need a port with NOTHING on it: bind, read the number, release it.
const freePort = async () => {
  const s = http.createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const { port } = s.address();
  await new Promise((r) => s.close(r));
  return port;
};

// --- the ceiling itself, asserted as a NUMBER ------------------------------------------------
// The mechanism below would pass at twelve seconds too. This is the line that fails if someone
// tunes the ceiling back down to where the incident lives.
check(`the default ceiling is at least 30s (it is ${Math.round(DEFAULT_TIMEOUT_MS / 1000)}s)`,
      DEFAULT_TIMEOUT_MS >= 30_000);

// --- a child that DIES is reported as dead, with evidence -------------------------------------
{
  const child = spawn(process.execPath, [
    '-e', "process.stderr.write('simulated: error while loading shared libraries: libnss3.so'); process.exit(3);",
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let msg = '';
  const port = await freePort();
  try { await waitForDevTools(child, port, { name: 'fake', timeoutMs: 8000 }); }
  catch (e) { msg = e.message; }
  check('a child that exits is reported as an exit, with its code',
        msg.includes('exited before its DevTools endpoint came up') && msg.includes('exit code 3'), msg);
  check("and it carries the child's own last words", msg.includes('libnss3.so'));
  check('and it says plainly that re-running will not help', msg.includes('not a slow machine'));
}

// --- a child that LIVES and stays silent is reported as that, not as dead ----------------------
{
  const child = alive();
  const port = await freePort();
  const t0 = Date.now();
  let msg = '';
  try { await waitForDevTools(child, port, { name: 'fake', timeoutMs: 2000 }); }
  catch (e) { msg = e.message; }
  const waited = Date.now() - t0;
  child.kill();
  check('a live-but-silent child is reported as still running, never as dead',
        msg.includes('still running but did not open its DevTools endpoint') && !msg.includes('exited before'),
        msg);
  check('and it waited for the deadline it was given', waited >= 1900, `${waited}ms`);
}

// --- the happy path still returns the payload --------------------------------------------------
{
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ Browser: 'HeadlessChrome/simulated' }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const child = alive();
  const version = await waitForDevTools(child, port, { name: 'fake', timeoutMs: 5000 });
  child.kill();
  server.close();
  check('an endpoint that answers returns its payload',
        version.Browser === 'HeadlessChrome/simulated', JSON.stringify(version));
}

// --- a start slower than a short ceiling is caught by a longer one ------------------------------
// The incident in miniature: the endpoint opens after a delay that a tight ceiling misses. The
// real numbers were 15s against 12s; these are scaled so the guard costs five seconds and not
// fifteen, and the ceiling that mattered is asserted as a number at the top of this file.
{
  const server = http.createServer((req, res) => { res.writeHead(200); res.end('{"Browser":"late"}'); });
  const port = await freePort();
  setTimeout(() => server.listen(port, '127.0.0.1'), 5000);
  const child = alive();
  let tight = '';
  try { await waitForDevTools(child, port, { name: 'fake', timeoutMs: 2000 }); }
  catch (e) { tight = e.message; }
  check('CONTROL: a ceiling shorter than the start still fails',
        tight.includes('still running but did not open'));
  const v = await waitForDevTools(child, port, { name: 'fake', timeoutMs: 20000 });
  child.kill();
  server.close();
  check('and a ceiling longer than the start picks it up', v.Browser === 'late');
}

// --- WHOSE BROWSER ANSWERED (CR-08-F28) -------------------------------------------------------
// The callers use fixed debugging ports, 9411 and 9416. A Chrome left behind by a killed run --
// which happens on this machine -- is listening on that same port, and the helper used to return
// the first parseable reply it got. The guard would then drive a window it did not open, in a
// profile it did not create, and report the result as its own. That is a green run measuring
// nothing, which is the worst outcome a guard has.
{
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"Browser":"SomebodyElsesChrome/1.0"}');
  });
  const port = await freePort();
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  const child = alive();

  // A profile directory that exists and holds no DevToolsActivePort: precisely the state of a
  // freshly mkdtemp'd profile whose Chrome has not come up yet.
  const udir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugit-devtools-check-'));
  let msg = '';
  try { await waitForDevTools(child, port, { name: 'fake', timeoutMs: 2000, userDataDir: udir }); }
  catch (e) { msg = e.message; }
  check('a browser answering on the port that is NOT ours is refused, not adopted',
        msg.includes('is NOT the one this run started'), msg.split('\n')[0]);

  // CONTROL, and it is the one that matters: with the profile marker present the SAME endpoint
  // is accepted. Without this, a helper that refused every endpoint would pass the check above.
  fs.writeFileSync(path.join(udir, 'DevToolsActivePort'), `${port}\n/devtools/browser/x\n`, 'utf8');
  const mine = await waitForDevTools(child, port, { name: 'fake', timeoutMs: 8000, userDataDir: udir });
  check('CONTROL: the same endpoint IS adopted once our profile claims that port',
        mine.Browser === 'SomebodyElsesChrome/1.0');

  // And a marker naming a DIFFERENT port does not count as ownership of this one.
  fs.writeFileSync(path.join(udir, 'DevToolsActivePort'), `${port + 1}\n/devtools/browser/x\n`, 'utf8');
  let other = '';
  try { await waitForDevTools(child, port, { name: 'fake', timeoutMs: 2000, userDataDir: udir }); }
  catch (e) { other = e.message; }
  check('a profile marker for another port is not ownership of this one',
        other.includes('is NOT the one this run started'));

  child.kill();
  server.close();
  fs.rmSync(udir, { recursive: true, force: true });
}

// --- WHOSE BROWSER ANSWERED, WHEN THERE IS NO FILE TO ASK ------------------------------------
// THE PROOF ABOVE STOPPED EXISTING. Chrome 153 with --headless=new and an explicit
// --remote-debugging-port writes no DevToolsActivePort anywhere in the profile -- verified by
// launching it with the exact flag set check-overflow uses and searching the whole temp tree. So
// ownsEndpoint() answered false for our OWN child on every run, and check-overflow and
// check-mission-pause aborted saying a browser we had just started was somebody else's.
//
// It failed closed, so nothing was ever mis-measured. But the two guards were permanently red,
// and a guard that cannot recognise its own browser is one people learn to skip.
//
// The replacement proof is the child's own announcement on stderr matched against the uuid the
// endpoint reports. These two cases cover it: the file fallback above is exercised, this is the
// path that actually runs on a current Chrome, and without them the working mechanism would be
// the untested one.
{
  const id = 'b62a6fea-2b94-423d-8e9b-b41e74d23722';
  const port = await freePort();
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      Browser: 'Chrome/153.0.8010.48',
      webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/browser/${id}`,
    }));
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));

  // A profile with NO marker in it, which is what a current Chrome leaves behind.
  const udir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugit-devtools-ws-'));

  const ours = announcing(port, id);
  const got = await waitForDevTools(ours, port, { name: 'fake', timeoutMs: 8000, userDataDir: udir });
  check('our own browser is recognised by what it announced, with no marker file at all',
        got.Browser === 'Chrome/153.0.8010.48');
  ours.kill();

  // THE CONTROL THAT MATTERS: same endpoint, but our child announced a DIFFERENT session. This
  // is the killed-run case on a modern Chrome -- the leftover browser holds the port and
  // announced itself on somebody else's stderr, so the uuids cannot agree.
  const theirs = announcing(port, '00000000-0000-0000-0000-000000000000');
  let msg = '';
  try { await waitForDevTools(theirs, port, { name: 'fake', timeoutMs: 2000, userDataDir: udir }); }
  catch (e) { msg = e.message; }
  check('an endpoint whose session is not the one our child announced is still refused',
        msg.includes('is NOT the one this run started'), msg.split('\n')[0]);
  theirs.kill();

  server.close();
  fs.rmSync(udir, { recursive: true, force: true });
}

// --- A SOCKET THAT ACCEPTS AND NEVER ANSWERS ---------------------------------------------------
// The loop condition is checked before an attempt and never again, so an await inside it was
// unbounded. Something holding the port that accepts the connection and then says nothing parked
// the guard forever: in CI that is a forty-minute job timeout reported as `cancelled`, with
// nothing anywhere saying what it was waiting for. This case hangs the connection deliberately
// and asserts that the helper still gives up on time.
{
  const server = http.createServer(() => { /* accept, then never respond */ });
  const port = await freePort();
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  const child = alive();
  const started = Date.now();
  let msg = '';
  try { await waitForDevTools(child, port, { name: 'fake', timeoutMs: 3000 }); }
  catch (e) { msg = e.message; }
  const took = Date.now() - started;
  child.kill();
  server.close();
  check('a socket that accepts and never answers still fails on time, rather than hanging',
        msg !== '' && took < 15_000, `${took}ms: ${msg.split('\n')[0]}`);
}

console.log(failures
  ? `\ncheck-chrome-devtools: ${failures} FAILURE(S)`
  : '\ncheck-chrome-devtools OK: a dead browser and a slow one are told apart, an endpoint we do ' +
    'not own is refused, a hung socket fails on time, and the ceiling is the one the incident needs');
process.exit(failures ? 1 : 0);
