# 320px pricing-note overflow — reproduction & fix (RC3 Approval 2)

Pre-existing responsive defect, separate from the consent/privacy remediation. Branched
from production-proven `b93b457` (not from the privacy branch).

## Reproduction environment (CI = the Linux-font repro)

The overflow reproduces only under the CI's Linux fonts; it passes on a Windows dev box
(different font metrics). The reproduction is therefore the GitHub Actions run of
`scripts/check-overflow.mjs`:

| Item | Value |
|---|---|
| OS image | `ubuntu-latest` (GitHub-hosted runner) |
| Browser | system `/usr/bin/google-chrome` (headless, CDP), Chrome for Testing on the runner |
| Node | 22 (`actions/setup-node@v5`) |
| Viewport (failing) | 320 × 720, device-scale 1 |
| Fallback font | runner default sans (DejaVu/Liberation family) — wider metrics than Windows Segoe/Arial |
| Locales failing | de ≈ +28px, it ≈ +2px, pt-br ≈ +2px (all at 320px) |
| Overflowing element | `<p class="pricing-note">` (right ≈ 348 at de) |
| Container | the pricing `<section>`; the `.pricing` grid track is forced wide by a `.price-card` |
| Overflow amount | de +28px, it/pt-br +2px |
| Reproduction command | `node scripts/check-overflow.mjs` (11 widths × 9 routes × 10 locales × 3 states) |

The `fix(css)` branch adds culprit diagnostics to `check-overflow.mjs` that log, for any
overflow, the element's computed `width`/`min-width`/`white-space`/`overflow-wrap` and its
parent's `grid-template-columns`/`width`/`min-width` — so the exact computed sizing is
captured in the CI log, not assumed.

## Root cause

`<p class="pricing-note">` is a **sibling** of `<div class="pricing">` (a CSS grid). The
grid's `.price-card` children keep the default `min-width:auto` (= min-content). A long
localized compound — German `Rückerstattungsrichtlinie` / `Projektkonfiguration` — makes a
card's min-content wider than a 320px phone, so the `1fr` track (and the section) overflow;
the pricing-note, a block filling the section width, is what the sweep reports. It is a grid
intrinsic-sizing defect, **not** the note's own text and **not** a German-only issue (it/pt-br
overflow marginally too).

## Fix (commit to cherry-pick)

`fix(css): resolve 320px pricing-note overflow via grid min-content`:
- `.pricing{grid-template-columns:minmax(0,1fr) …}` and `.price-card{min-width:0}` — let the
  grid children shrink below their content.
- `overflow-wrap:break-word; word-break:break-word; hyphens:auto` on card + note text — let
  long localized words wrap.

Explicitly NOT used: page `overflow-x:hidden`, fixed clipping heights, negative margins,
locale-only font shrink, shortened customer wording, or any change to the overflow gate.

## Verification

The full sweep (unchanged assertions/tolerances/locales/viewports) is run with the watchdog
raised to 300s (fit proven runtime) plus a per-500-assertion heartbeat, so a real hang stays
distinguishable from a long valid run. Locally (Windows) the sweep passes at 2970/2970; the
authoritative Linux-font verification is the CI run of this workflow.
