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
import { waitForDevTools, DEFAULT_TIMEOUT_MS } from './lib/chrome-devtools.mjs';

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}`);
  if (detail) console.log(`          ${String(detail).split('\n').join('\n          ')}`);
  if (!ok) failures++;
};

const alive = () => spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000);'],
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

console.log(failures
  ? `\ncheck-chrome-devtools: ${failures} FAILURE(S)`
  : '\ncheck-chrome-devtools OK: a dead browser and a slow one are told apart, and the ceiling is the one the incident needs');
process.exit(failures ? 1 : 0);
