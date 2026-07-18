# BugIt logo — maintenance & the upper-corner artifact

## Master source

The single editable master for the BugIt logo is the SVG:

- `public/brand/blip-logo.svg` — the full logo (mascot + magnifier).
- `public/brand/favicon.svg` — the static favicon mark (same body, no magnifier).

These are hand-edited vector files (no build step generates them in this repo).
Byte-identical copies live in the portal repo (`bugit-portal/public/brand/blip-logo.svg`,
`.../public/brand/favicon.svg`, `.../app/icon.svg`) — keep them in sync.

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

## How the artifact is prevented from recurring

`scripts/check-logo.mjs` (wired into CI and `npm run test:logo`) asserts that every
white highlight rect in `blip-logo.svg` / `favicon.svg` carries a `clip-path`
pointing at the full 60 × 60 rx=20 body. It is a structural text check — it fails
only if an unclipped white highlight is reintroduced (the exact defect), and is
unaffected by harmless edits (colors, animation timing, formatting, metadata).
