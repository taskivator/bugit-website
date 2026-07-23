# bugit.dev — production source provenance (RC3 Decision 1)

**Finding: an authoritative git repository EXISTS and was located by read-only
evidence. No reconstruction or "recovered baseline" was needed.**

## How the source was matched (read-only)

The RC3 directive named two candidate folders under `BugIt Website/bugit-dev-website-v2/`.
Neither is production: both are early throwaway starter snapshots (3 Jul 2026, ~1 KB
`index.html`, Vite starter, no Cloudflare deploy apparatus). The Desktop tree actually
holds ~25 versioned website folders (`bugit-dev-v5-unique` … `bugit-dev-v19-official-logo-docs`).
Rather than pick by name/date/appearance (explicitly forbidden), the source was
identified by git remote + deployment-fingerprint evidence:

| Evidence | Result |
|---|---|
| Working checkout | `BugIt Website/bugit-dev-v19-official-logo-docs/bugit-dev-v18-doc-logo-polish` |
| `.git` remote (`origin`) | **`https://github.com/taskivator/bugit-website.git`** (same org as the agent + portal repos) |
| Default branch | `main` (`origin/HEAD -> origin/main`) |
| GitHub repo metadata | `default_branch=main`, `visibility=public`, `pushed_at=2026-07-20` |
| **Current production commit** | **`b93b457518ab3b13f37dec042dbb80bf30c51fc6`** (= `origin/main`, verified via `gh api` + `git ls-remote`) |
| Deploy apparatus present | `_headers` (CSP), `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `.wrangler/`, content-hashing `build.js` |
| Cloudflare Pages project (memory) | `bugit-website`, static build, `wrangler pages deploy dist` (manual) |

### Live-deployment fingerprint corroboration (read-only, no Cloudflare writes)

`curl https://bugit.dev/` on 23 Jul 2026 served content-hashed assets
`/app.99ee657294.js`, `/styles.995aa80974.css`, `/consent.9e38a3ffa8.js`,
`/public/brand/tokens.css`; `Server: cloudflare`; `robots.txt` = `Allow: /` + sitemap;
`sitemap.xml` = single homepage entry, `lastmod 2026-07-19`. The repo's source uses
un-hashed names (`app.js`, `styles.css`, `consent.js`) and `build.js` emits the hashed
filenames at build time, so the live hashes are a build artifact of this exact source
tree — consistent, not contradictory. The commit topics on `origin/main`
(Cloudflare Web Analytics CSP, Google Ads tag shape guard, Consent Mode collect,
10-language i18n hero, SEO sitemap, a11y) match the known production history 1:1.

**Classification: `bugit-dev-v18-doc-logo-polish` checkout = _exact production-source match_
(authoritative repo `taskivator/bugit-website`). The two directive-named `-website-v2`
candidates = _starter/template source_, unrelated to production.**

## Local checkout was stale — branched from the proven production commit

The local checkout's `HEAD`/`main` sat at `6d6242f` (an older commit); true production
`origin/main` is `b93b457`. Per the directive ("branch from the proven production
commit … do not branch from an old snapshot"), a `git fetch origin` was run and the
remediation branch was created from **`origin/main` (`b93b457`)**, not the stale local
tip:

```
remediation/1.0.9-privacy  (from b93b457)
```

Unrelated local state was preserved; `main` was not moved.

## Reconciliation notes (existing unmerged work)

- **`origin/phase-0/team-pause` (`f8bcb44`)** already attempts a Team pause but does
  NOT meet RC3 Decision 2: it still shows the Team price (`$199`, "Regular price
  $249.99"), uses "COMING SOON" (an availability implication), and reveals internal
  engineering ("being rebuilt so every member gets their own account"). It is not
  merged and not deployed. It is therefore **not** merged into the remediation branch;
  the compliant Team-unavailable correction is implemented separately in the
  translations pass, reusing/strengthening its `check-team-paused.mjs` guard.
- **Advertising already ships in production**: `consent.js` on `b93b457` loads the
  Google tag on every page (Consent Mode redaction only). Option A changes this — see
  the `privacy(consent)` commit.

## What was NOT done (per constraints)

No Cloudflare configuration read/written beyond `curl` of the public site. Nothing
deployed, merged, or pushed as part of this provenance step. No public repository
created (the authoritative one already exists and is public).
