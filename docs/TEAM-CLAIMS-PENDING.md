# bugit.dev — Team-unavailable correction (RC3 Decision 2) — SCOPED PENDING

Option A (privacy/consent) is done on this branch. The **Team-unavailable** copy
correction is deliberately **not** bulk-edited yet, because `app.js` is a 375 KB
production bundle whose i18n is unsafe to mass-find/replace. This file records exactly
what must change, the hazards, and the approved wording, so the edit can be done
carefully (not rushed) without corrupting production copy.

## Approved wording (owner, RC3 Decision 2)
- Short: **"Team plans are not currently available."**
- Long: **"Team plans are not currently available while we complete additional licensing
  and account-management verification."**
- **No** Team price, **no** historical price ("Regular price $249.99"), **no** seat/user
  count, **no** availability date / "coming soon", **no** internal-engineering language.
- Solo is untouched and remains purchasable.

## Every offending string (found 2026-07-23), by surface

### 1. Pricing card (index.html + i18n keys `pricing.*`)
`index.html` Team `<article>` renders via `data-t` keys, so the DICTIONARY values must
change (markup alone won't re-render). Keys and current values:
- `pricing.seats` = "5 SEATS" / "5シート" / "5 ASIENTOS" / "5 ASSENTOS" / "5 POSTI" /
  "5석" / "5 席位" / "5 МЕСТ" → status badge, e.g. "CURRENTLY UNAVAILABLE" (localized)
- `pricing.teamRegular` = "Regular price $249.99" (10 locales) → remove (historical price)
- `pricing.teamDevices` = "5 devices (5 users)" etc → remove (user-count)
- `pricing.teamCta` = "Get Team License" etc → "Not available" (localized), CTA disabled
- `pricing.teamTerm` = "1-year Team licence for up to 5 users …" etc → approved sentence
- `index.html` Team `<article>`: drop `<div class="price">$199</div>`, the historical-price
  `<p class="regular">`, the device `<li>`, and replace the `href=…?plan=team` CTA with a
  disabled `<span aria-disabled="true">`.

### 2. FAQ answers (TWO structures + `add()` overrides)
"What is included in Team?" / "Team includes 5 devices for 5 users, …" appears in BOTH the
main `faq` dict AND `bugitV16Faq`, in all languages, plus a licensing answer "One license =
one device at a time. Team includes 5 devices for 5 users." Each full answer must be
rewritten to the approved sentence (Solo clause kept where present).

## Hazards that forbid a naive find/replace
1. **Value collisions**: Japanese `pricing.teamCta` = "チームライセンス" is byte-identical to
   `pricing.teamTitle`. A global replace of the CTA string would also rewrite the title.
   → replacement MUST be key-aware, not value-global.
2. **Three structures**: a single-quoted dict, an escaped-JSON copy (`\"key\":\"value\"`), and
   FAQ arrays. `indexOf("teamCta:")` matches only the first; the escaped copy needs its own
   pass. Fixing only one structure leaves the guard failing and/or the wrong copy rendering
   (per the prior FAQ-language incident, `add()` overrides can win at runtime).
3. **CRLF**: the bundle is CRLF locally; edits must not depend on `\n`-anchored slices.

## Safe method (for the careful pass)
Edit per-key, per-structure with anchored replacements (key name adjacent), verify each
replacement count, rebuild, then run `scripts/check-team-paused.mjs` (present on
`origin/phase-0/team-pause`, to be imported and STRENGTHENED to also forbid the Team PRICE
and historical price, not just the user-count) + `check-billing-copy` + `check-docs` +
`check-overflow` as the completeness/rendering net. Do NOT add the strengthened guard to CI
until every locale + structure passes it locally.

## COMPLETE structural map (verified 2026-07-23) — makes the edit key-aware

Only TWO source structures exist (the `\"key\":\"value\"` escaped copies seen in the bundle
are DIST artifacts regenerated from source by build.js — fixing source is sufficient):

- **Structure A — explicit `add(code,{…pricing:{…}})`**: `en` (base, `i18n.en`), and
  `es`, `it`, `ja`, `ko`, `ru`, `zh`, **`pt-br`**. Each has named pricing keys
  `teamTitle/seats/teamRegular/teamDevices/teamCta/teamTerm` to edit in place (key-aware),
  a `faq.items[]` Team Q&A, and a `docPages.sections[]` Team sentence.
- **Structure B — `makeLang(code,name,nav,cta,heroTitle,heroSub,priceLimited,soloReg,teamReg,teamCta,faqTitle,docsName)`**:
  `de`, `fr`. Team values are POSITIONAL: `nav[6]`=teamTitle, `nav[7]`=seats,
  `nav[14]`=teamDevices; `teamReg` (arg 9) and `teamCta` (arg 10) are separate literals; the
  FAQ is `docsName.faq` (e.g. `frFaq`), Team sentence in `docsName.sections`.
  NOTE: `makeLang` does NOT set `teamTerm`, so `de`/`fr` INHERIT `en`'s `teamTerm` via
  `merge(i18n.en,obj)` — fixing `en.teamTerm` fixes them too (do not add a teamTerm to de/fr).

Collision reminder: `ja` `teamCta` == `teamTitle` ("チームライセンス") — edit the value at the
`teamCta:` key position only, never a value-global replace.

Recommended execution: a Node codemod that, for each target string, asserts an EXACT expected
occurrence count in its key/positional context BEFORE replacing, writes only if every
assertion holds (no partial write), then rebuild + run check-team-paused (strengthened to also
forbid the Team price/historical price) + all 11 guards + build as the completeness/rendering net.

## Existing related work
`origin/phase-0/team-pause` (`f8bcb44`) attempts this but is NON-compliant (keeps $199 /
$249.99, "COMING SOON", internal-engineering copy) and is not merged. Reuse its
`check-team-paused.mjs` guard; do not merge its copy.
