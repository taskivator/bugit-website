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
 * EVERY Cache-Control rule that matches a path, in file order.
 *
 * THIS USED TO RETURN ONLY THE LAST ONE, on the stated belief that where two rules match one
 * path the last wins. That belief was wrong, and it was wrong in the direction that hides: the
 * zone's own four hour override was flattening the header, so the mistake could not be seen
 * from outside. The hour the override was removed -- 2026-09-21 -- the Guide's hashed files
 * came back carrying BOTH values joined into one header:
 *
 *   Cache-Control: public, max-age=0, must-revalidate, public, max-age=31536000, immutable
 *
 * Two max-age directives in one header. RFC 9111 does not say which a client must take, so the
 * answer is whatever that client's parser happens to do, which is not a thing to ship.
 *
 * So the correct shape is to return all of them and let the caller judge, because "more than
 * one rule matched" is itself the finding. A helper that silently picked a winner could only
 * ever report the overlap as absent.
 */
export function cacheControlRulesFor(rules, urlPath) {
  return rules
    .filter((r) => matchesPattern(r.pattern, urlPath) && r.headers["cache-control"])
    .map((r) => ({ pattern: r.pattern, cacheControl: r.headers["cache-control"] }));
}

/**
 * The single rule that governs a path, or null. Throws when more than one matches, rather than
 * choosing: there is no correct choice, and a caller that wants one value must first have
 * established that only one rule applies. check-cache-headers.mjs is what establishes it.
 */
export function promisedCacheControl(rules, urlPath) {
  const all = cacheControlRulesFor(rules, urlPath);
  if (all.length > 1) {
    throw new Error(
      `_headers has ${all.length} Cache-Control rules matching ${urlPath} ` +
        `(${all.map((r) => r.pattern).join(", ")}). Cloudflare emits all of them, joined. ` +
        `Narrow the patterns so exactly one matches.`,
    );
  }
  return all[0] ?? null;
}
