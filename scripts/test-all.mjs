// Self-contained aggregate test runner (AUD-1.1.0-011): one command that BUILDS, starts the
// production server on a disposable port, waits for readiness, runs every declared suite against
// that server, tears the server down, and exits non-zero on ANY failure — no pre-existing dist,
// browser server, or CONSENT_TEST_URL required. Run with: npm test
import { spawn, spawnSync } from "node:child_process";

function step(label, cmd, args, env) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...(env || {}) }, shell: process.platform === "win32" });
  return r.status === 0;
}

// 1. Build (so dist-dependent suites like team-paused have their input).
if (!step("build", "node", ["build.js"])) { console.error("build failed"); process.exit(1); }

// 2. Start the server on a disposable port.
const port = 3200 + Math.floor(Math.random() * 700);
const base = `http://localhost:${port}`;
const srv = spawn("node", ["server.js"], { stdio: "inherit", env: { ...process.env, PORT: String(port) },
                                           shell: process.platform === "win32" });
const shutdown = () => { try { srv.kill(); } catch {} try { process.kill(srv.pid); } catch {} };
process.on("exit", shutdown);
process.on("SIGINT", () => { shutdown(); process.exit(130); });

// 3. Wait for readiness (poll, never a fixed sleep). Fail loudly if the server never comes up.
let ready = false;
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(base + "/"); if (r.ok) { ready = true; break; } } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 250));
}
if (!ready) { console.error(`server did not become ready at ${base}`); shutdown(); process.exit(1); }

// 4. Run every declared suite against the served site.
const SUITES = [
  "check-doc-links.mjs", "check-docs.mjs", "check-overflow.mjs", "check-logo.mjs",
  "check-trust-icons.mjs", "check-ads-tag.mjs", "check-cache-headers.mjs", "check-csp-telemetry.mjs",
  "check-billing-copy.mjs", "check-team-paused.mjs", "check-activation-copy.mjs", "check-legal-copy.mjs", "check-consent-network.mjs",
];
const failed = [];
for (const s of SUITES) {
  if (!step(s, "node", ["scripts/" + s], { CONSENT_TEST_URL: base, BASE_URL: base, PORT: String(port) })) failed.push(s);
}

// 5. Tear down + propagate.
shutdown();
if (failed.length) { console.error("\nFAILED SUITES: " + failed.join(", ")); process.exit(1); }
console.log("\nALL WEBSITE SUITES PASSED against " + base);
process.exit(0);
