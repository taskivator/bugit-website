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

import {
  parseHeadersFile,
  matchesPattern,
  cacheControlRulesFor,
  promisedCacheControl,
} from './lib/headers-file.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');

let fails = 0;
const check = (ok, label, detail) => {
  if (ok) return;
  fails++;
  console.error(`FAIL: ${label}${detail ? `\n      ${detail}` : ''}`);
};

// --- Parse _headers. The parser lives in scripts/lib/headers-file.mjs because
//     check-live-delivery.mjs needs the same one to compare what this file ASKS for
//     against what the origin actually serves, and two copies of one list is a mistake
//     this workspace has already paid for.
const rules = parseHeadersFile(root);
check(rules.length > 0, '_headers must contain at least one rule');

const matches = matchesPattern;

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

// --- 3b. Files whose CONTENT changes every release while their PATH does not must be
//         revalidated, not cached. A content hash in the filename is the other way to be safe,
//         and these deliberately cannot have one: something else names them at a fixed path.
//
//         /verify.json had no rule at all, so it inherited the four-hour default that this
//         file's own comments record twice as having already burned us. It is the value the
//         shipped verifier tells customers to compare their download against, so serving the
//         previous release's checksum for four hours tells honest buyers their bytes are wrong.
for (const p of ['/verify.json', '/404.js']) {
  const covering = rules.filter((r) => matches(r.pattern, p) && r.headers['cache-control']);
  check(
    covering.length > 0,
    `${p} must have an explicit cache rule`,
    'with no rule it inherits the platform default, which is four hours on a path whose ' +
      'content changes at every release',
  );
  for (const r of covering) {
    const cc = r.headers['cache-control'];
    check(
      !isLongLived(cc) && /max-age\s*=\s*0/i.test(cc),
      `${p} must be revalidated on every request (matched by "${r.pattern}")`,
      `Cache-Control: ${cc}`,
    );
  }
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

// --- 5. EXACTLY ONE Cache-Control rule may match any file the build publishes.
//
//        Cloudflare does NOT resolve two matching rules by letting the last one win. It emits
//        both values, joined into one header. `_headers` said otherwise in a comment, this
//        repository's own parser encoded the same belief, and neither could be caught from
//        outside while the zone's four hour browser TTL was overriding every header anyway.
//        The hour that override was removed, on 2026-09-21, the Guide's hashed code came back
//        carrying both:
//
//          Cache-Control: public, max-age=0, must-revalidate, public, max-age=31536000, immutable
//
//        because `/public/guide/*` and `/public/guide/guide.*.js` both matched it. Two max-age
//        directives in one header is not something RFC 9111 resolves. It is whatever the
//        reader's browser happens to do.
//
//        ZERO matches is a finding too, and the quieter one: a file with no rule at all
//        inherits the platform default, which is the four hour bucket this file's comments
//        already record as having burned us more than once.
const walk = (dir, base = '') => {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const urlPath = `${base}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), urlPath));
    else out.push(urlPath);
  }
  return out;
};

if (fs.existsSync(dist)) {
  // _headers and _redirects are Pages control files: they configure the deployment and are
  // never served, so a cache rule for them would be meaningless rather than missing.
  const published = walk(dist).filter((p) => p !== '/_headers' && p !== '/_redirects');
  const overlapping = [];
  const uncovered = [];
  for (const p of published) {
    const matching = cacheControlRulesFor(rules, p);
    if (matching.length > 1) overlapping.push({ p, matching });
    else if (matching.length === 0) uncovered.push(p);
  }

  const shownOverlap = overlapping
    .slice(0, 8)
    .map(({ p, matching }) => {
      const lines = matching.map((m) => `          "${m.pattern}" -> ${m.cacheControl}`);
      return [`${p}`, ...lines].join('\n      ');
    })
    .join('\n      ');

  check(
    overlapping.length === 0,
    `${overlapping.length} published file(s) matched by MORE THAN ONE Cache-Control rule`,
    `${shownOverlap}\n      Cloudflare emits every matching value, joined into one header.` +
      `\n      Narrow the patterns so exactly one matches.`,
  );

  check(
    uncovered.length === 0,
    `${uncovered.length} published file(s) matched by NO Cache-Control rule`,
    `${uncovered.slice(0, 12).join('\n      ')}` +
      `\n      With no rule a file inherits the platform default, which is four hours.`,
  );

  if (!overlapping.length && !uncovered.length) {
    console.log(
      `  ${published.length} published file(s): each governed by exactly one Cache-Control rule`,
    );
  }
}

// --- 5b. NEGATIVE CONTROLS for the rule above.
//
//         A coverage check that cannot fail is worse than none, because it reads as evidence.
//         These run against synthetic rule sets rather than the real `_headers`, so the guard
//         proves its own logic on every run without a doctored file on disk and without the
//         ordering hazard of mutating the tree while a gate is reading it.
{
  const parse = (text) => {
    const out = [];
    let cur = null;
    for (const raw of text.split('\n')) {
      if (!raw.trim()) continue;
      if (!/^\s/.test(raw)) {
        cur = { pattern: raw.trim(), headers: {} };
        out.push(cur);
      } else if (cur) {
        const m = raw.trim().match(/^([^:]+):\s*(.*)$/);
        if (m) cur.headers[m[1].toLowerCase()] = m[2];
      }
    }
    return out;
  };

  // The exact shape that shipped: a catch-all and a hashed pattern both matching one file.
  // Cloudflare joins the two values, and the reader gets two max-age directives.
  const overlapping = parse(
    '/public/guide/*\n  Cache-Control: public, max-age=0, must-revalidate\n' +
      '/public/guide/guide.*.js\n  Cache-Control: public, max-age=31536000, immutable\n',
  );
  const hit = cacheControlRulesFor(overlapping, '/public/guide/guide.d737660742.js');
  check(
    hit.length === 2,
    'negative control: the overlap check must SEE two rules matching one hashed path',
    `saw ${hit.length}: ${hit.map((h) => h.pattern).join(', ') || 'nothing'}`,
  );

  // And the same file set with the catch-all narrowed must come back to exactly one, or the
  // fix would be indistinguishable from the check having stopped looking.
  const narrowed = parse(
    '/public/guide/*.json\n  Cache-Control: public, max-age=0, must-revalidate\n' +
      '/public/guide/guide.*.js\n  Cache-Control: public, max-age=31536000, immutable\n',
  );
  check(
    cacheControlRulesFor(narrowed, '/public/guide/guide.d737660742.js').length === 1,
    'negative control: narrowing the catch-all must leave exactly one rule on the hashed path',
  );
  check(
    cacheControlRulesFor(narrowed, '/public/guide/prepared/ja.json').length === 1,
    'negative control: narrowing must NOT orphan the data files the catch-all existed for',
  );

  // Zero matches must be visible as zero, not as a quiet pass.
  check(
    cacheControlRulesFor(narrowed, '/robots.txt').length === 0,
    'negative control: a path no rule covers must report zero matches',
  );

  // promisedCacheControl must refuse to pick a winner rather than inventing one, because the
  // version that picked silently is what let this ship.
  let threw = false;
  try {
    promisedCacheControl(overlapping, '/public/guide/guide.d737660742.js');
  } catch {
    threw = true;
  }
  check(threw, 'negative control: promisedCacheControl must refuse an ambiguous path, not choose');
}

if (fails) {
  console.error(`\ncheck-cache-headers: ${fails} failure(s).`);
  process.exit(1);
}
console.log('check-cache-headers: OK — immutable caching is confined to content-hashed filenames.');
