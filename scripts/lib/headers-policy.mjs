// What the site's security headers must MEAN, not merely which words they contain.
//
// WHY THIS FILE EXISTS (CR-08-F22). check-security-headers.mjs used to accept the CSP when four
// substrings were present: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'` and the
// bare word `frame-ancestors`. So `frame-ancestors *` passed, and so did a CSP that added
// `script-src *`, `'unsafe-inline'` on scripts, a bare `https:` scheme grant or a wildcard host,
// because none of those remove the four words. script-src and form-action were not required at
// all. check-csp-telemetry.mjs, the other reader of the same policy, enumerated only tokens of the
// shape `https://host`, so a broad grant (`*`, `https:`, `*.example.com`, a bare `evil.example`)
// was invisible to its allowlist as well. The ACAO test was `v !== "*"`, which `null` or any
// foreign origin also passes. And both guards read only the first `/*` rule, while Cloudflare
// merges every matching rule into a response and `! Header` in a later rule DETACHES a header.
//
// Required words can coexist with a policy that no longer restricts anything. So the policy is
// parsed into directives and source lists here, and each source is judged against an explicit
// rule. One parser and one reviewed-host list, imported by both guards, so the two cannot drift.

/** Every third-party host the CSP may name, each reviewed (see the comments in `_headers` and in
 *  check-csp-telemetry.mjs for why each one is there). Hostnames only, always granted as https. */
export const REVIEWED_CSP_HOSTS = [
  "static.cloudflareinsights.com",
  "cloudflareinsights.com",
  "www.googletagmanager.com",
  "www.google.com",
  "google.com",
  "www.google.co.jp",
  "www.googleadservices.com",
  "googleads.g.doubleclick.net",
  "td.doubleclick.net",
  "ad.doubleclick.net",
  "pagead2.googlesyndication.com",
  "www.google-analytics.com",
  "region1.google-analytics.com",
  "portal.bugit.dev",
  // The channel section's player. Approved deliberately, and only in this form: see
  // check-csp-telemetry.mjs, which asserts the tracking host is NOT granted and the embed is
  // click-gated rather than loaded with the page.
  "www.youtube-nocookie.com",
];

/** The one origin Access-Control-Allow-Origin may name. */
export const ALLOWED_ACAO = ["https://bugit.dev"];

/** The security headers that only the `/*` rule may set, exactly once, and no rule may detach. */
export const SECURITY_HEADER_NAMES = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "content-security-policy",
  "cross-origin-opener-policy",
  "access-control-allow-origin",
];

/**
 * Parse `_headers` text into [{ pattern, headers: [{ name, value }], detached: [name] }].
 * Unlike the cache parser in headers-file.mjs, this keeps EVERY occurrence of a header (a
 * repeated name is sent twice by Cloudflare, not overwritten) and records `! Name` detach lines,
 * which the plain "Name: value" grammar silently skipped.
 */
export function parseHeadersRules(text) {
  const rules = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [], detached: [] };
      rules.push(current);
    } else if (current) {
      const t = line.trim();
      const det = t.match(/^!\s*([^:\s]+)\s*$/);
      if (det) { current.detached.push(det[1].toLowerCase()); continue; }
      const m = t.match(/^([^:]+):\s*(.*)$/);
      if (m) current.headers.push({ name: m[1].trim().toLowerCase(), value: m[2].trim() });
    }
  }
  return rules;
}

/** Parse a CSP value into { directives: Map(name -> [sources]), duplicates: [name] }. */
export function parseCsp(value) {
  const directives = new Map();
  const duplicates = [];
  for (const part of String(value).split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    const name = tokens[0].toLowerCase();
    // A browser honours the FIRST occurrence and ignores the rest, so a later, stricter copy is
    // decoration over an earlier, looser one. Ambiguity is a finding either way.
    if (directives.has(name)) { duplicates.push(name); continue; }
    directives.set(name, tokens.slice(1));
  }
  return { directives, duplicates };
}

const FETCH_DIRECTIVES = [
  "default-src", "script-src", "script-src-elem", "script-src-attr", "style-src", "style-src-elem",
  "style-src-attr", "img-src", "connect-src", "font-src", "media-src", "frame-src", "child-src",
  "worker-src", "manifest-src", "object-src",
];

/**
 * Every way a CSP value fails to be the restrictive policy this site intends. Returns [] for a
 * policy that passes. `hosts` is the reviewed host list.
 */
export function cspProblems(value, hosts = REVIEWED_CSP_HOSTS) {
  const problems = [];
  const { directives, duplicates } = parseCsp(value);
  for (const d of duplicates) problems.push(`directive ${d} appears more than once (a browser uses only the first)`);

  const hostOk = (tok) => {
    const m = tok.match(/^https:\/\/([a-z0-9.-]+)\/?$/i);
    return Boolean(m) && hosts.includes(m[1].toLowerCase());
  };
  const exactly = (name, allowedSets, why) => {
    const got = directives.get(name);
    if (!got) { problems.push(`${name} is missing (${why})`); return; }
    const norm = got.map((s) => s.toLowerCase());
    if (!allowedSets.some((set) => set.length === norm.length && set.every((s) => norm.includes(s)))) {
      problems.push(`${name} is "${got.join(" ")}", must be ${allowedSets.map((s) => s.join(" ")).join(" or ")} (${why})`);
    }
  };

  exactly("default-src", [["'self'"], ["'none'"]], "everything not named falls back to it");
  exactly("object-src", [["'none'"]], "plugins are never needed");
  exactly("base-uri", [["'self'"], ["'none'"]], "a foreign <base> rewrites every relative URL");
  exactly("frame-ancestors", [["'self'"], ["'none'"]], "clickjacking; `*` or a host list would let others frame the site");

  for (const name of ["script-src", "form-action"]) {
    if (!directives.has(name)) problems.push(`${name} is missing (it must be stated, not inherited or omitted)`);
  }

  for (const [name, sources] of directives) {
    const isFetch = FETCH_DIRECTIVES.includes(name);
    if (!isFetch && name !== "form-action" && name !== "frame-ancestors" && name !== "base-uri") continue;
    for (const raw of sources) {
      const s = raw.toLowerCase();
      if (s === "'self'" || s === "'none'") continue;
      if (s === "'unsafe-inline'" && (name === "style-src" || name === "style-src-attr" || name === "style-src-elem")) continue;
      if (s === "data:" && (name === "img-src" || name === "font-src")) continue;
      if (hostOk(raw) && name !== "frame-ancestors" && name !== "base-uri") continue;
      problems.push(`${name} grants "${raw}", which is not a reviewed source` +
        (s === "*" || /^[a-z][a-z0-9+.-]*:$/.test(s) || s.includes("*")
          ? " (a wildcard or bare scheme grants the whole web)"
          : s.startsWith("'") ? " (an unsafe keyword)" : ""));
    }
  }
  return problems;
}

/**
 * Route-level problems: a security header set anywhere but the single `/*` rule, set twice, or
 * detached with `! Name`. Cloudflare applies every matching rule, so a later rule can weaken or
 * strip what the catch-all sends on some paths.
 */
export function routeProblems(rules, names = SECURITY_HEADER_NAMES) {
  const problems = [];
  const catchAlls = rules.filter((r) => r.pattern === "/*");
  if (catchAlls.length !== 1) problems.push(`_headers must have exactly one /* rule, has ${catchAlls.length}`);
  const primary = catchAlls[0];
  for (const r of rules) {
    for (const n of r.detached) {
      if (names.includes(n)) problems.push(`rule ${r.pattern} detaches ${n} with "! ${n}"`);
    }
    for (const { name } of r.headers) {
      if (names.includes(name) && r !== primary) problems.push(`rule ${r.pattern} also sets ${name}; only /* may`);
    }
  }
  if (primary) {
    for (const n of names) {
      const count = primary.headers.filter((h) => h.name === n).length;
      if (count > 1) problems.push(`/* sets ${n} ${count} times; Cloudflare sends every copy`);
    }
  }
  return problems;
}
