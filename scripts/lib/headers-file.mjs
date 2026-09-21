// Reading `_headers`, in ONE place.
//
// WHY THIS FILE EXISTS. check-cache-headers.mjs asserts what `_headers` SAYS. On 2026-09-21 the
// owner found two Guide bugs still live on his phone after a deploy this repository had verified
// byte-identical at the edge, and the cause was that what `_headers` says and what the edge does
// are not the same thing. `_headers` asks for `max-age=0, must-revalidate` on `/public/guide/*`;
// measured against the live site, `sources.json` and the prepared answer bank get exactly that,
// while `guide.css` and `guide.js` come back `max-age=14400`, because the edge applies its own
// four hour browser TTL to those two extensions. The rule written to keep the Guide correctable
// worked on the Guide's data and was defeated on the Guide's code.
//
// So a second check was needed, against the live origin, and it needs the same parser. Copying
// it would have made two lists that drift -- this workspace has been bitten by exactly that
// before, when a security gate and its redactor kept separate copies of one list and only one of
// them was updated. One parser, imported twice.
import fs from "node:fs";
import path from "node:path";

/** Parse `_headers` into [{ pattern, headers: { name: value } }], names lowercased. */
export function parseHeadersFile(root) {
  const text = fs.readFileSync(path.join(root, "_headers"), "utf8");
  const rules = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
    } else if (current) {
      const m = line.trim().match(/^([^:]+):\s*(.*)$/);
      if (m) current.headers[m[1].toLowerCase()] = m[2];
    }
  }
  return rules;
}

/* Cloudflare `_headers` path matching: `*` is a greedy splat that MAY match the empty string;
 * everything else is literal, and the pattern is anchored at both ends. That subtlety is what
 * makes `/consent.*.js` correct (a literal dot is required on both sides of the hash) while
 * `/consent*.js` would also match the unhashed `/consent.js` and hand it a one year TTL. */
export function matchesPattern(pattern, urlPath) {
  const re = new RegExp(
    "^" + pattern.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$",
  );
  return re.test(urlPath);
}

/** The max-age a rule declares, or null when it declares none. */
export function maxAgeOf(cacheControl) {
  if (!cacheControl) return null;
  const m = cacheControl.match(/max-age\s*=\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

/**
 * What `_headers` PROMISES for a path: the last matching rule wins, which is how Cloudflare
 * resolves two rules that both match. Returns null when nothing matches.
 */
export function promisedCacheControl(rules, urlPath) {
  let found = null;
  for (const r of rules) {
    if (matchesPattern(r.pattern, urlPath) && r.headers["cache-control"]) {
      found = { pattern: r.pattern, cacheControl: r.headers["cache-control"] };
    }
  }
  return found;
}
