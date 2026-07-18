# BugIt logo — maintenance & the upper-corner artifact

## Master source

The single editable master for the BugIt logo is the SVG:

- `public/brand/blip-logo.svg` — the full logo (mascot + magnifier).
- `public/brand/favicon.svg` — the static favicon mark (same body, no magnifier).

These are hand-edited vector files (no build step generates them in this repo).
Byte-identical copies live in the portal repo (`bugit-portal/public/brand/blip-logo.svg`,
`.../public/brand/favicon.svg`, `.../app/icon.svg`) — keep them in sync.

### The BugIt logo family (all carry the highlight; all must stay clipped)

All of these are BugIt artwork (`aria-label="BugIt Blip"`) and share the same body +
top highlight, so the same fix applies to every one. `scripts/check-logo.mjs` guards
all of them:

- `blip-logo.svg` — primary logo (mascot + magnifier).
- `blip-bugit.svg` — byte-identical alias of the primary logo.
- `blip-main.svg` / `blip-mark.svg` — the BugIt mascot mark (no magnifier).
- `favicon.svg` (= portal `app/icon.svg`) — static favicon mark.

The other `blip-*.svg` files (buildit / deployit / docsit / planit / reviewit /
testit / watchit) are SEPARATE Taskivator product marks — not BugIt, out of scope
here. They share the same highlight construction, so if they are ever adopted as
BugIt assets they need the identical clip.

### Google Ads brand logos & the desktop delivery folder

- Google Ads pack (`Google ADs/v2/BugIt-Google-Ads-v2-Complete/`): `source/blip-logo.svg`
  is synced to the corrected master, `OFFICIAL_LOGO_SHA256` in `validate_assets.py`
  is updated to match, and the three brand logos are regenerated via
  `render_logo_assets()` + `render_google_upload_logos()`. On the dark ad background the
  corner overflow was already absorbed (0 visible artifact); regeneration keeps a single
  source of truth. The 15 campaign creatives were NOT regenerated (ad layouts/copy are
  out of scope) and show no artifact.
- Desktop delivery folder `C:\Users\Ppedr\Desktop\BugIt Logo`: fully refreshed from the
  corrected master (transparent PNGs, dark-bg brand logos, vector sources). See its
  `README.txt`.

## The upper-corner artifact (fixed 2026-07-18)

**Symptom:** two thin white lines hugging the upper-left and upper-right corners
of the pink rounded square, most visible in browsers and on light/transparent
backgrounds.

**Root cause:** the glossy top highlight is a white rounded rect over the body:

```
<rect x="20" y="22" width="60" height="30" rx="20" fill="#ffffff" opacity="0.12"/>
```

It is only 30 tall, so the SVG spec clamps its vertical corner radius to
height / 2 = 15. The pink body's corners use radius 20. The highlight's shallower
(20 × 15) top corners therefore bulge a fraction of a unit **outside** the body at
each upper corner, laying ~12 % white onto the transparent background — the two
white lines. Spec-compliant renderers (all browsers) show it; it also bakes into
raster exports whose renderer clamps.

**Fix:** clip the highlight to the exact pink body so it can never paint past the
rounded corners, in any renderer:

```
<clipPath id="body_clip_bugit"><rect x="20" y="22" width="60" height="60" rx="20"/></clipPath>
...
<rect x="20" y="22" width="60" height="30" rx="20" fill="#ffffff" opacity="0.12" clip-path="url(#body_clip_bugit)"/>
```

Nothing else changed: mascot, face, eyes, magnifier, mouth, feet, gradient,
highlight shape, outlines, proportions, dimensions, and transparency are identical.
The clip only removes the out-of-body overflow.

## Regeneration after any logo edit

`node build.js` copies `public/` verbatim into `dist/` — it does NOT re-render the
brand rasters. The raster favicons come from the official (external) brand
generator. If you edit the logo SVG, regenerate and re-sync these:

**Raster favicons** (transparent PNG, from `favicon.svg`), sizes 16/32/48/64/180:
render each at native size, RGBA, sRGB, no added background/padding/compression.
Reinstall into `public/brand/favicon-<n>.png` (this repo) and the portal's
`public/brand/favicon-<n>.png` + rebuild `app/favicon.ico` (16/32/48/64).

**Copies to re-sync** (keep byte-identical to the master):
`bugit-portal/public/brand/blip-logo.svg`, `bugit-portal/public/brand/favicon.svg`,
`bugit-portal/app/icon.svg`.

**Not regenerated here (no visible defect / external pipeline):**
- `public/brand/og-image.png` and the portal's copy — the mascot sits small on the
  dark card, where the overflow is absorbed; regenerate via the external brand
  generator when convenient.
- Google Ads brand logos (`../../Google ADs/**`) — composited on the dark BugIt
  background, they show **zero** corner artifact (verified). Left untouched per the
  release scope. To refresh them from the corrected master, sync
  `source/blip-logo.svg`, update `OFFICIAL_LOGO_SHA256` in `validate_assets.py`, and
  run `python render_ads.py --ad all`.

## Production polish: clean canonical vs marketing (glow)

The master `blip-logo.svg` / `favicon.svg` include an ambient glow — a single blurred
pink ellipse (`blip-glow`, `feGaussianBlur stdDeviation="5"`, ~16% opacity, animated).
On the animated website/portal header this is the approved live treatment and stays.
For STATIC production exports (app icon, Google Ads logo fields, favicons, avatars) the
glow becomes a heavy fuzzy halo that eats padding and reads as a neon rim, so the
canonical exports omit it.

- **Canonical (clean) source:** the master with the `blip-glow` ellipse (and its now-unused
  CSS/`bf_*` filter) removed. Crisp edge, transparent pixels immediately outside the body.
- **Marketing source:** the unchanged master (keeps the glow) — clearly named `*-marketing`.
- **Approved glow settings:** canonical = NO glow (0-1px AA edge only). Marketing = the
  master's single blurred ellipse, never stacked/duplicated (a "repeated ring" means a
  double-composited export, not the design).
- **Padding / occupancy:** icon-only files frame the mascot at ~80% of canvas height
  (content bbox svg `x20-80 y22-90`, centred; icon viewBox `7.5 13.5 85 85`). Range 75-85%.
- **Canonical wordmark:** horizontal + stacked read "BugIt / by Taskivator". The longer
  "QA workflow agent by Taskivator" is a marketing-only lockup.
- **Light vs dark text:** light = `#fff8ff` / `#d8c7e7` (for dark backgrounds); dark =
  `#17101a` / `#6a5a72` (for light backgrounds). Each is invisible on its opposite ground.
- **Blip mark vs icon:** consolidated — the magnifier mascot is `BugIt-icon-square`; the
  no-magnifier mascot (favicon) is `BugIt-mascot-mark`. They are different artwork (magnifier
  vs none), used for different sizes; don't mix them.
- **Regenerate / refresh** the desktop delivery folder `C:\Users\Ppedr\Desktop\BugIt Logo`
  from these sources; its `README.txt` lists the recommended file per use case. Verify each
  export: RGBA + full transparency, ~80% icon occupancy, 0-1px edge band on canonical files,
  correct dimensions, and legibility at 32/48/64 px.

## How the artifact is prevented from recurring

`scripts/check-logo.mjs` (wired into CI and `npm run test:logo`) asserts that every
white highlight rect in `blip-logo.svg` / `favicon.svg` carries a `clip-path`
pointing at the full 60 × 60 rx=20 body. It is a structural text check — it fails
only if an unclipped white highlight is reintroduced (the exact defect), and is
unaffected by harmless edits (colors, animation timing, formatting, metadata).
