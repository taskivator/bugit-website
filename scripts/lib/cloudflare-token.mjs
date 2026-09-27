/**
 * THE ONE PLACE A SCRIPT HERE FINDS THE CLOUDFLARE TOKEN.
 *
 * WHY ONE PLACE. The search used to be written out twice, in purge-cache.mjs and in
 * check-deploy-safety.mjs. On 2026-09-21 a purge run from a git worktree reported "No Cloudflare
 * API token found" while the token sat where it always sits, and the fix (ask git where the main
 * checkout is) went into purge-cache.mjs only. On 2026-09-27 the 1.4.3 release deploy ran from a
 * worktree and check-deploy-safety.mjs refused with "no Cloudflare token": the same defect, in
 * the copy the fix never reached, and the third time a website credential lookup failed from a
 * worktree. scripts/check-token-lookup.mjs now fails if any script reads the deploy env file
 * other than through this module, and proves the lookup from a real linked worktree.
 *
 * WHERE IT LOOKS, most explicit first:
 *   1. the process environment;
 *   2. this checkout's own .env.deploy.local;
 *   3. ../bugit-portal/.env.deploy.local beside this checkout (the live tree's layout);
 *   4. ../bugit-portal/.env.deploy.local beside the MAIN checkout, found by asking git:
 *      `rev-parse --git-common-dir` resolves to the original repository's .git even from a
 *      linked worktree. Not an absolute path: this repository is public, and a path inside one
 *      person's home directory only ever works for that person.
 *
 * SECRET HYGIENE. The value is read by this process and returned to the caller, which uses it
 * only in an Authorization header. It is never printed, never put in a URL, argv or a shell
 * command. A caller may show the LABEL (where it was found), never the value.
 */
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

const FILE = ".env.deploy.local";

/** <main checkout>/../<name>/<file>, or null when git cannot say (the other sources still apply). */
export function mainCheckoutSibling(root, name, file) {
  try {
    const common = execFileSync(
      "git",
      ["-C", root, "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    // .../bugit-website/.git -> .../bugit-website -> .../<workspace>/<name>/<file>
    return common ? join(dirname(common), "..", name, file) : null;
  } catch {
    return null;
  }
}

/** The sources in search order, as [label, path]; a null path means the process environment.
 *  A lookup that could not resolve is dropped, never passed along as a null that would re-read
 *  the environment under a label claiming it read a file. */
export function credentialSources(root) {
  return [
    ["process env", null],
    [FILE, join(root, FILE)],
    [`../bugit-portal/${FILE}`, join(root, "..", "bugit-portal", FILE)],
    [`<main checkout>/../bugit-portal/${FILE}`, mainCheckoutSibling(root, "bugit-portal", FILE)],
  ].filter(([label, p]) => label === "process env" || p !== null);
}

/** The first token found under any of `names`, as {label, value}, or null. */
export function findCloudflareToken(root, names) {
  for (const [label, path] of credentialSources(root)) {
    if (path === null) {
      for (const n of names) if (process.env[n]) return { label: `${label}:${n}`, value: process.env[n] };
      continue;
    }
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const n of names) {
      const m = new RegExp("^\\s*(?:export\\s+)?" + n + "\\s*=\\s*(.*)$", "m").exec(text);
      const v = m?.[1]?.trim().replace(/^["']|["']$/g, "");
      if (v) return { label: `${label}:${n}`, value: v };
    }
  }
  return null;
}
