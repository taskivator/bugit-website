/* THE BUILD SAID IT HAD DONE TWO THINGS IT HAD NOT (CR-08-F04, CR-08-F07).
 *
 * F04. `consent.js` declares `var ADS_ID = 'AW-...';` with spaces around the `=`, and the
 * BUGIT_ADS_ID override matched `/var ADS_ID='[^']*';/` with none. So the substitution was a
 * no-op on every build and the success line printed anyway, because it sat outside the question.
 * A deploy pointing the tag at a different Google Ads account shipped the DEFAULT account, and
 * said it had not: conversions attributed to the wrong advertiser with nothing to notice by.
 * `check-ads-tag.mjs` could not catch it, because it compares against the id in the SOURCE,
 * which is exactly the value a broken substitution leaves in place.
 *
 * F07. Every root file was copied `if (fs.existsSync(src))`, so a missing one was
 * indistinguishable from a copied one. That is fine for `robots.txt` and fatal for
 * `index.html`, which is the site, or `_headers`, which carries the CSP, HSTS and
 * frame-ancestors rules -- and `check-security-headers.mjs` reads the SOURCE `_headers`, so a
 * build that dropped it would deploy a site with no security headers at all, with both the
 * build and the guard green.
 *
 * Both are about the same thing: a build step that cannot fail is not a build step. So this
 * guard runs the real `build.js` against fixture trees and asserts the refusals, and -- the
 * part that matters -- asserts the POSITIVE case lands in the shipped bytes, because a build
 * that refused everything would satisfy the refusals alone.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let fails = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}`);
  if (detail) console.log(`          ${String(detail).split("\n")[0]}`);
  if (!ok) fails++;
};

/** A throwaway copy of the source tree, so nothing here touches the real dist/. */
function sandbox(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bugit-build-check-"));
  for (const item of fs.readdirSync(ROOT)) {
    if (["dist", "node_modules", ".git", "prototype-chatbot"].includes(item)) continue;
    fs.cpSync(path.join(ROOT, item), path.join(dir, item), { recursive: true });
  }
  // node_modules is linked rather than copied: esbuild is a build-time dependency and copying
  // it takes minutes. A junction is what works on Windows without Developer Mode; if the link
  // cannot be made the build would fail for a reason that has nothing to do with this guard, so
  // that is reported rather than read as a refusal.
  const nm = path.join(ROOT, "node_modules");
  if (fs.existsSync(nm)) {
    try {
      fs.symlinkSync(nm, path.join(dir, "node_modules"), "junction");
    } catch {
      fs.cpSync(nm, path.join(dir, "node_modules"), { recursive: true });
    }
  }
  if (mutate) mutate(dir);
  return dir;
}

function build(dir, env = {}) {
  const r = spawnSync(process.execPath, ["build.js"], {
    cwd: dir,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

// --- 1. THE POSITIVE CASE FIRST. Every refusal below is free if the build never succeeds. -----
{
  const dir = sandbox();
  const r = build(dir);
  check(r.code === 0, "an unmodified tree still builds", r.out.trim().split("\n").pop());
  fs.rmSync(dir, { recursive: true, force: true });
}

// --- 2. F04: the override reaches the SHIPPED BYTES, not just the log line -------------------
{
  const dir = sandbox();
  const r = build(dir, { BUGIT_ADS_ID: "AW-CHECKOVERRIDE9" });
  const distDir = path.join(dir, "dist");
  const consent = fs
    .readdirSync(distDir)
    .filter((n) => /^consent\..*\.js$/.test(n))
    .map((n) => fs.readFileSync(path.join(distDir, n), "utf8"))
    .join("");
  check(
    r.code === 0 && consent.includes("AW-CHECKOVERRIDE9"),
    "BUGIT_ADS_ID reaches the consent script that actually ships",
    consent.match(/AW-[A-Za-z0-9]+/)?.[0] ?? "no ADS_ID found in dist",
  );
  check(
    !consent.includes("AW-18322852127"),
    "and the default account is gone from the shipped bytes",
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// --- 3. F04: an override that cannot be applied STOPS the build ------------------------------
{
  const dir = sandbox((d) => {
    const p = path.join(d, "consent.js");
    // The declaration renamed out from under the substitution: exactly the drift that made the
    // original pattern stop matching, reproduced deliberately.
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/var\s+ADS_ID\s*=/, "var ADS_IDENT ="));
  });
  const r = build(dir, { BUGIT_ADS_ID: "AW-CHECKOVERRIDE9" });
  check(
    r.code !== 0 && /could not\s*\n?\s*be found|could not be found/.test(r.out),
    "an override that matches nothing refuses instead of reporting success",
    r.out.split("\n").find((l) => l.includes("BUGIT_ADS_ID")) ?? r.out.split("\n")[0],
  );
  check(
    !/Google Ads ID overridden/.test(r.out),
    "and it does not also print that the override was applied",
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// --- 4. F07: a missing REQUIRED root file stops the build ------------------------------------
for (const required of ["index.html", "_headers", "404.html", "_redirects"]) {
  const dir = sandbox((d) => fs.rmSync(path.join(d, required), { force: true }));
  const r = build(dir);
  check(
    r.code !== 0 && r.out.includes(required),
    `a missing ${required} stops the build and names itself`,
    r.out.split("\n").find((l) => l.includes(required)) ?? r.out.split("\n")[0],
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

// --- 5. F07: a missing OPTIONAL one is named, and does not stop it ----------------------------
{
  const dir = sandbox((d) => fs.rmSync(path.join(d, "robots.txt"), { force: true }));
  const r = build(dir);
  check(
    r.code === 0 && r.out.includes("robots.txt"),
    "a missing optional file is named rather than silently skipped",
    r.out.split("\n").find((l) => l.includes("not copied")) ?? "",
  );
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(
  fails
    ? `\ncheck-build-refuses-a-silent-skip: ${fails} FAILURE(S)`
    : "\ncheck-build-refuses-a-silent-skip OK: an unapplied ads override and a missing required " +
      "root file both stop the build, and the override reaches the bytes that ship",
);
process.exit(fails ? 1 : 0);
