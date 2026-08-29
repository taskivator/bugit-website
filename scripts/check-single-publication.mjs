#!/usr/bin/env node
/**
 * This site must have exactly ONE public origin. Assert that the others are not serving.
 *
 * WHY THIS EXISTS. GitHub Pages was enabled on this repository on 2026-07-06 -- five days
 * before the Cloudflare DNS records for bugit.dev were created -- and never switched off when
 * Cloudflare Pages took over. For 97 builds it published the repository ROOT at
 * https://<owner>.github.io/<repo>/ on every push to main: the whole marketing site, plus
 * server.js, build.js, package.json and all 67 guard scripts, every one answering HTTP 200.
 *
 * The damage was never disclosure -- this repository is public, so nothing there was secret.
 * It was that THE DEPLOY GATE DID NOT APPLY TO IT. bugit.dev publishes only when somebody runs
 * `wrangler pages deploy`, and that manual step is the control that lets copy be committed and
 * reviewed before customers can read it. A push-published mirror removes that control silently:
 * on the day it was found it was serving a commit AHEAD of production. It also served the source
 * tree rather than the build, so it carried none of the `_headers` security headers -- no CSP,
 * no HSTS -- because `_headers` is a Cloudflare Pages construct that GitHub Pages serves as text.
 *
 * An external audit had it in hand on 2026-08-03. It listed the Pages deployment id, the workflow
 * run and the environment URL under "Website deployment identity", directly above the Cloudflare
 * project and the custom domain, and nobody read three origins in that list as meaning there were
 * three origins. Recorded is not the same as noticed, which is why this is a guard and not a note.
 *
 * WHAT IT CHECKS, AND WHY THIS WAY. It probes the URL rather than reading the repository setting.
 * A setting says what is configured; only the URL says what a member of the public can fetch,
 * and those came apart once already today when a deleted file went on being served. It needs no
 * token, so it runs anywhere. And it COMPUTES its subject from the git remote instead of naming
 * a host: pointed at a fork, it checks that fork's mirror rather than passing while quietly
 * measuring somebody else's.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------------------------------------------------------- the subject
 * GITHUB_REPOSITORY first because in CI it is authoritative; the remote otherwise. Naming
 * taskivator/bugit-website here would make this pass on a fork it had never looked at. */
function ownerAndRepo() {
  if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.includes("/")) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
    return { owner, repo, from: "GITHUB_REPOSITORY" };
  }
  let url;
  try {
    url = execSync("git remote get-url origin", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
  const m = /github\.com[:/]+([^/]+)\/([^/.]+)(\.git)?\/?$/.exec(url);
  return m ? { owner: m[1], repo: m[2], from: "git remote origin" } : null;
}

const id = ownerAndRepo();
if (!id) {
  console.error("FAIL: cannot determine owner/repo, so this guard does not know what to check.");
  console.error("      It computes its subject deliberately; there is no fallback constant.");
  process.exit(1);
}

const MIRROR = `https://${id.owner.toLowerCase()}.github.io/${id.repo}`;

/* Paths worth asking for by name. `/` proves the site is not mirrored; the others prove the
 * repository's own working files are not being handed out. They are derived from what actually
 * exists at the repo root rather than typed here, so a new root file is covered on the day it
 * lands -- the same reason check-live-delivery probes the COMPLEMENT of dist. */
const rootFiles = ["server.js", "build.js", "package.json"].filter((f) => existsSync(join(ROOT, f)));
const PATHS = ["/", ...rootFiles.map((f) => "/" + f)];

async function status(url) {
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "bugit-publication-check" } });
    return { status: res.status };
  } catch (e) {
    return { status: 0, error: String(e.message || e) };
  }
}

console.log(`single-publication: subject ${id.owner}/${id.repo} (from ${id.from})`);
console.log(`  probing ${MIRROR}\n`);

const serving = [];
const unreachable = [];
for (const p of PATHS) {
  const r = await status(MIRROR + p);
  if (r.status === 0) {
    // A network failure is NOT a pass. Reporting "I could not look" as "nothing is there" is
    // how an absent check reads as a clean one; both CI and a workstation have network.
    unreachable.push(`${p}  ${r.error}`);
    console.log(`  ${p.padEnd(16)} COULD NOT REACH  ${r.error}`);
    continue;
  }
  const bad = r.status === 200;
  if (bad) serving.push(`${p}  HTTP ${r.status}`);
  console.log(`  ${p.padEnd(16)} HTTP ${r.status}${bad ? "   <- SERVING" : ""}`);
}

console.log("");
if (unreachable.length) {
  console.error(`FAIL: ${unreachable.length} probe(s) could not be made. This guard did not run;`);
  console.error("      do not read its silence as an all-clear.");
  for (const u of unreachable) console.error("  - " + u);
  process.exit(1);
}
if (serving.length) {
  console.error(`FAIL: ${MIRROR} is publishing this repository -- a SECOND public copy of the site,`);
  console.error("      updated on every push, outside the manual deploy gate that bugit.dev has.");
  for (const s of serving) console.error("  - " + s);
  console.error("\n  Turn it off:  gh api -X DELETE repos/" + id.owner + "/" + id.repo + "/pages");
  console.error("  Then re-run this. Production is unaffected: bugit.dev is a proxied CNAME to");
  console.error("  Cloudflare Pages direct-upload and never touched GitHub Pages.");
  process.exit(1);
}

console.log(`single-publication: OK — ${PATHS.length} path(s) checked, ${MIRROR} serves none of them.`);
console.log("bugit.dev remains the only public origin for this site.");
