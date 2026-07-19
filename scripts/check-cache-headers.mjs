// Cache-header invariants for the marketing site.
//
// Why this exists: `immutable, max-age=31536000` is a ONE-WAY door. Once the edge
// caches a response under it, that entry cannot be evicted by a deploy -- only by
// a manual cache purge -- for a year. It is only safe when the cache key can never
// be reused for different bytes, which is true exactly when the content hash is in
// the FILENAME (/consent.<hash>.js), and false for a bare path (/consent.js).
//
// That bug has already happened here twice:
//   1. Rules matched /app.js while the hash lived in a ?v= query. Cloudflare
//      matches _headers on PATH, so every query variant inherited a one-year
//      immutable TTL on one never-changing path; a deploy raced propagation and
//      the edge pinned an old body against a new key.
//   2. After that was fixed (hash moved into the filename), the OLD immutable
//      entries for the bare /app.js and /consent.js paths survived at the edge and
//      kept returning 200 for files that no longer exist in dist -- long after the
//      origin had started correctly returning 404 + no-store for them.
//
// So this asserts, statically, that a long-lived immutable rule can never match an
// unhashed asset path again. Cloudflare's `*` matches greedily and CAN match the
// empty string, which is the subtlety that makes `/consent.*.js` correct (it needs
// a literal dot on both sides of the hash) while `/consent*.js` would be WRONG.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');

let fails = 0;
const check = (ok, label, detail) => {
  if (ok) return;
  fails++;
  console.error(`FAIL: ${label}${detail ? `\n      ${detail}` : ''}`);
};

// --- Parse _headers into [{ pattern, headers: {name: value} }].
const rules = [];
let current = null;
for (const raw of headers.split(/\r?\n/)) {
  const line = raw.replace(/\s+$/, '');
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) {
    current = { pattern: line.trim(), headers: {} };
    rules.push(current);
  } else if (current) {
    const m = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (m) current.headers[m[1].toLowerCase()] = m[2];
  }
}
check(rules.length > 0, '_headers must contain at least one rule');

// --- Cloudflare _headers path matching: `*` is a greedy splat that MAY match the
//     empty string; everything else is literal. Anchored at both ends.
function matches(pattern, urlPath) {
  const re = new RegExp(
    '^' + pattern.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$',
  );
  return re.test(urlPath);
}

// Self-test the matcher, so a wrong matcher cannot silently pass the real checks.
for (const [pattern, urlPath, want] of [
  ['/consent.*.js', '/consent.abc123.js', true],
  ['/consent.*.js', '/consent.js', false], // the bare path: needs dots on BOTH sides
  ['/consent.*.js', '/consent..js', true], // `*` matches empty -> still hash-shaped
  ['/consent*.js', '/consent.js', true], // the WRONG pattern would match it
  ['/*', '/consent.js', true],
  ['/app.*.js', '/app.js', false],
]) {
  check(
    matches(pattern, urlPath) === want,
    `matcher self-test: ${pattern} vs ${urlPath} should be ${want}`,
  );
}

// --- A rule is "long-lived" if it pins content for more than a day or is immutable.
const LONG_LIVED_SECONDS = 86400;
const isLongLived = (cc) => {
  if (!cc) return false;
  if (/immutable/i.test(cc)) return true;
  const m = cc.match(/max-age\s*=\s*(\d+)/i);
  return !!m && Number(m[1]) > LONG_LIVED_SECONDS;
};

// --- 1. No long-lived rule may match an UNHASHED asset path. This is the guard
//        that fails if anyone reverts a pattern to the bare filename.
const UNHASHED = ['/app.js', '/consent.js', '/styles.css'];
for (const rule of rules) {
  const cc = rule.headers['cache-control'];
  if (!isLongLived(cc)) continue;
  for (const bare of UNHASHED) {
    check(
      !matches(rule.pattern, bare),
      `long-lived cache rule "${rule.pattern}" must not match the unhashed path ${bare}`,
      `Cache-Control: ${cc}\n      An immutable entry on a bare path cannot be evicted by a deploy for up to a year.`,
    );
  }
}

// --- 2. The hashed paths those rules exist for must still be covered, or the
//        fix above would have silently disabled caching instead of narrowing it.
for (const [bare, hashed] of [
  ['/app.js', '/app.0123456789.js'],
  ['/consent.js', '/consent.0123456789.js'],
  ['/styles.css', '/styles.0123456789.css'],
]) {
  const covering = rules.filter(
    (r) => isLongLived(r.headers['cache-control']) && matches(r.pattern, hashed),
  );
  check(
    covering.length > 0,
    `hashed asset ${hashed} must still be covered by a long-lived cache rule`,
    `(narrowing the rule for ${bare} must not drop caching for the hashed file)`,
  );
}

// --- 3. Unrelated static assets must keep their caching. Pinned explicitly so a
//        future "just make everything no-cache" edit fails loudly.
for (const [p, minAge] of [['/public/media/x.mp4', 604800], ['/public/brand/x.svg', 604800]]) {
  const best = rules
    .filter((r) => matches(r.pattern, p) && r.headers['cache-control'])
    .map((r) => Number((r.headers['cache-control'].match(/max-age\s*=\s*(\d+)/i) || [])[1] || 0));
  check(
    best.some((a) => a >= minAge),
    `${p} must keep a cache lifetime of at least ${minAge}s`,
    `found max-age values: ${best.join(', ') || 'none'}`,
  );
}

// --- 4. The build must not emit unhashed assets at all, so the bare paths 404
//        (with the site-wide no-store) rather than serving a cacheable body.
const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  for (const bare of ['app.js', 'consent.js', 'styles.css']) {
    check(
      !fs.existsSync(path.join(dist, bare)),
      `dist must not contain the unhashed asset ${bare}`,
      'build.js renames it to the hashed name; a leftover copy would be servable on a bare path',
    );
  }
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  check(
    !/(?:href|src)="\/(?:app\.js|consent\.js|styles\.css)(?:\?[^"]*)?"/.test(html),
    'built index.html must reference only content-hashed asset filenames',
  );
} else {
  console.log('  (dist/ absent — skipping build-output checks; run node build.js first)');
}

if (fails) {
  console.error(`\ncheck-cache-headers: ${fails} failure(s).`);
  process.exit(1);
}
console.log('check-cache-headers: OK — immutable caching is confined to content-hashed filenames.');
