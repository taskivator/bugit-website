#!/usr/bin/env node
/**
 * REFUSE A DEPLOY THAT WOULD TAKE SOMETHING AWAY FROM THE LIVE SITE.
 *
 * WHY THIS EXISTS. On 2026-09-23 I deployed this site from `main` and removed the Ask bar and the
 * Guide's mark from bugit.dev. Not by reverting them: the build I published had never contained
 * them. Production was not built from `main` at all. It was built from
 * `feat/2026-09-20-ask-bugit-launcher` (6a890d4), which carried ELEVEN commits that were never
 * merged -- among them "Give the Guide its own mark, and make the Ask bar survive eleven
 * languages" and "Serve the Spanish and Italian guides the owner asked for". `public/brand/
 * blip-guide.svg` existed on that branch and did not exist on main at all.
 *
 * Every existing guard passed. They had to: each one checks that the tree is internally
 * consistent, and it was. `check-live-delivery` compares dist against live AFTER the deploy, by
 * which time live IS dist and the comparison can only agree. Nothing anywhere asked the one
 * question that mattered: **is what I am about to publish a superset of what is already there?**
 *
 * The information was one command away the whole time. `wrangler pages deployment list` prints
 * the source commit of the live deployment, and it did not match main. I ran it after the damage.
 *
 * So this runs BEFORE `wrangler pages deploy`, and it asks that question two independent ways.
 * Either one on its own would have refused that deploy.
 *
 *   1. ANCESTRY   what commit is production built from, and is it an ancestor of HEAD?
 *                 If production holds commits HEAD does not, publishing HEAD drops them.
 *   2. ASSETS     what files does the LIVE homepage reference, and does the new build still
 *                 contain all of them? A file production serves and the new dist lacks is a
 *                 removal, whatever the git history says -- this catches a deploy from a dirty
 *                 tree, a squashed branch, or a commit that no longer exists.
 *
 * Check 2 is the one that does not depend on git being tidy, and it is the one that names
 * blip-guide.svg directly.
 *
 *   node scripts/check-deploy-safety.mjs              # refuse on any finding
 *   node scripts/check-deploy-safety.mjs --explain    # show the reasoning and the evidence
 *
 * SECRET HYGIENE, same rule as purge-cache.mjs: the token is read from a gitignored env file BY
 * THIS PROCESS and used only in an Authorization header. It is never printed, never interpolated
 * into a URL or a shell command, never passed in argv.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const ORIGIN = "https://bugit.dev";
const PROJECT = "bugit-website";
const API = "https://api.cloudflare.com/client/v4";
const EXPLAIN = process.argv.includes("--explain");

let findings = 0;
const fail = (what, detail) => {
  findings++;
  console.error(`\n  REFUSE  ${what}`);
  if (detail) console.error(detail.split("\n").map((l) => "          " + l).join("\n"));
};
const ok = (what) => console.log(`  ok      ${what}`);

/* ------------------------------------------------------------------ credential, as purge-cache does it */
const SOURCES = [
  ["process env", null],
  [".env.deploy.local", join(ROOT, ".env.deploy.local")],
  ["../bugit-portal/.env.deploy.local", join(ROOT, "..", "bugit-portal", ".env.deploy.local")],
];
const NAMES = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_TOKEN_DEPLOY", "CLOUDFLARE_TOKEN_PURGE"];
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "dfea28143809bc2f7bc93880bcfa626f";

function findToken() {
  for (const [label, path] of SOURCES) {
    if (path === null) {
      for (const n of NAMES) if (process.env[n]) return { label: `${label}:${n}`, value: process.env[n] };
      continue;
    }
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const n of NAMES) {
      const m = new RegExp("^\\s*(?:export\\s+)?" + n + "\\s*=\\s*(.*)$", "m").exec(text);
      const v = m?.[1]?.trim().replace(/^["']|["']$/g, "");
      if (v) return { label: `${label}:${n}`, value: v };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ dist inventory */
function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push("/" + relative(DIST, p).split("\\").join("/"));
  }
  return acc;
}

/**
 * A content hash in a filename makes every rebuild a different path, so paths are compared by
 * STEM. `/styles.ddc95a0c7a.css` and `/styles.18666548e9.css` are the same asset; `blip-guide.svg`
 * carries no hash and is therefore compared exactly. Getting this wrong in either direction is
 * how a guard becomes noise (every rebuild "removes" every hashed asset) or becomes blind.
 */
const stem = (p) => p.replace(/\.[0-9a-f]{8,}\.(js|css|mjs)$/i, ".$1");

console.log("check-deploy-safety: self-test of the stem normaliser");
{
  const cases = [
    ["/styles.ddc95a0c7a.css", "/styles.css"],
    ["/app.77cd27ded8.js", "/app.js"],
    ["/public/guide/guide.8120e72da8.js", "/public/guide/guide.js"],
    ["/public/brand/blip-guide.svg", "/public/brand/blip-guide.svg"],
    ["/public/docs/guides/es/user-guide.pdf", "/public/docs/guides/es/user-guide.pdf"],
  ];
  let bad = 0;
  for (const [input, want] of cases) {
    if (stem(input) !== want) {
      bad++;
      console.error(`  FAIL  stem(${input}) = ${stem(input)}, expected ${want}`);
    }
  }
  if (bad) {
    console.error("\ncheck-deploy-safety: the normaliser is wrong, so every comparison below is meaningless.");
    process.exit(1);
  }
  ok(`the normaliser strips a content hash and leaves everything else alone (${cases.length} cases)`);
}

if (!existsSync(DIST)) {
  console.error("\ncheck-deploy-safety: dist/ does not exist. Run `node build.js` first.");
  process.exit(1);
}
const distPaths = walk(DIST);
const distStems = new Set(distPaths.map(stem));
ok(`dist holds ${distPaths.length} file(s)`);

/* ================================================================== 1. ANCESTRY */
console.log("\ncheck-deploy-safety: is production's commit an ancestor of what I am about to publish?");
const tok = findToken();
let prodCommit = null;

if (!tok) {
  fail(
    "no Cloudflare token, so production's source commit cannot be read",
    "This check is the cheap one and it is the one that names the missing commits.\n" +
      "Put CLOUDFLARE_API_TOKEN in .env.deploy.local, or run the asset check alone knowing\n" +
      "it is the only thing standing between you and a silent removal.",
  );
} else {
  try {
    const res = await fetch(
      `${API}/accounts/${ACCOUNT}/pages/projects/${PROJECT}/deployments?env=production&per_page=1`,
      { headers: { authorization: `Bearer ${tok.value}` } },
    );
    const body = await res.json();
    if (!res.ok || !body.success) {
      fail(`Cloudflare refused the deployments query (HTTP ${res.status})`, JSON.stringify(body.errors ?? {}));
    } else {
      const d = body.result?.[0];
      prodCommit = d?.deployment_trigger?.metadata?.commit_hash ?? null;
      const when = d?.created_on ?? "unknown";
      if (!prodCommit) {
        fail(
          "the live deployment records no source commit",
          "Nothing can be proved about what it contains. The asset check below is now the only guard.",
        );
      } else {
        ok(`production was built from ${prodCommit.slice(0, 7)} (${when})`);
      }
    }
  } catch (e) {
    fail("could not reach the Cloudflare API", String(e.message).slice(0, 160));
  }
}

if (prodCommit) {
  const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  let known = true;
  try {
    git(["cat-file", "-e", prodCommit + "^{commit}"]);
  } catch {
    known = false;
  }
  if (!known) {
    fail(
      `production's commit ${prodCommit.slice(0, 7)} is not in this repository`,
      "It may be unpushed, or on a branch that was deleted. Nothing here can prove the build you\n" +
        "are about to publish contains its work. Fetch it, or treat the asset check as the only guard.",
    );
  } else {
    let ancestor = false;
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", prodCommit, "HEAD"], { cwd: ROOT });
      ancestor = true;
    } catch {
      ancestor = false;
    }
    if (ancestor) {
      ok("production's commit is an ancestor of HEAD, so this deploy adds and does not drop");
    } else {
      const missing = git(["log", "--oneline", `HEAD..${prodCommit}`]);
      const n = missing ? missing.split("\n").length : 0;
      fail(
        `production holds ${n} commit(s) that HEAD does not`,
        "Publishing HEAD would remove their work from the live site:\n\n" +
          missing +
          "\n\nEither merge them, or deploy from a commit that contains them.",
      );
    }
  }
}

/* ================================================================== 2. ASSETS */
console.log("\ncheck-deploy-safety: does the new build still contain every file the live site references?");
try {
  const res = await fetch(ORIGIN + "/", { headers: { "user-agent": "bugit-deploy-safety" } });
  const html = await res.text();
  if (!res.ok || html.length < 500) {
    fail(`the live homepage did not answer usefully (HTTP ${res.status}, ${html.length}B)`);
  } else {
    // Every same-origin reference the live page makes: src=, href=, and url(...) in inline CSS.
    const refs = new Set();
    for (const re of [/\b(?:src|href)="(\/[^"]+)"/g, /url\((['"]?)(\/[^'")]+)\1\)/g]) {
      for (const m of html.matchAll(re)) refs.add(m[2] ?? m[1]);
    }
    // Assert the extractor found something, so a zero cannot read as "nothing to check".
    if (refs.size < 5) {
      fail(
        `only ${refs.size} same-origin reference(s) extracted from the live homepage`,
        "The extractor is not reading the page. A pass from it would mean nothing.",
      );
    } else {
      ok(`the live homepage references ${refs.size} same-origin path(s)`);
      const missing = [...refs].filter((p) => {
        const clean = p.split("#")[0].split("?")[0];
        if (clean === "/" || clean.endsWith("/")) return false;
        return !distStems.has(stem(clean));
      });
      if (missing.length) {
        fail(
          `${missing.length} file(s) the live site uses are NOT in this build`,
          missing.map((m) => "  " + m).join("\n") +
            "\n\nPublishing this would remove them. If that is deliberate, the references on the\n" +
            "live page have to go first, in the same change.",
        );
      } else {
        ok("every file the live homepage references survives this build");
      }
    }
  }
} catch (e) {
  fail("could not fetch the live homepage", String(e.message).slice(0, 160));
}

/* ================================================================== verdict */
if (findings) {
  console.error(
    `\ncheck-deploy-safety: ${findings} REFUSAL(S). Do not deploy.\n` +
      "\nThis guard exists because on 2026-09-23 a deploy from `main` removed the Ask bar and the\n" +
      "Guide's mark from bugit.dev, and every other gate passed while it happened. If you are\n" +
      "certain, the honest path is to fix the branch you are deploying, not to skip this.",
  );
  process.exit(1);
}
console.log(
  "\ncheck-deploy-safety OK: production's commit is contained in this one, and every file the live\n" +
    "site references survives the build. This deploy adds; it does not take away.",
);
