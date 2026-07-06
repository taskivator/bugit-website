# Legacy BugIt logo (the old v19 "bug-face" glyph)

This is the **original logo** that the Blips mascot replaced on 2026-07-06.
It is kept here so you can **switch back at any time** if you change your mind.

Nothing here is loaded by the site — it's a backup only.

## What changed
- `index.html`: the three `.bug-logo` glyph spans (header, hero mission-control panel, footer)
  were replaced with the animated Blip SVG (`<svg class="blip-logo …">`).
- `styles.css`: the legacy `.bug-logo` CSS is **still present** (untouched) and the new
  `.blip-logo` block was appended below it.

## How to switch back to the old logo
1. In `index.html`, replace each `<svg class="blip-logo mini …">…</svg>` with:
   ```html
   <span class="bug-logo mini blink"><span class="eye left"></span><span class="eye right"></span><span class="mouth"></span><span class="antenna a1"></span><span class="antenna a2"></span></span>
   ```
   and the `<svg class="blip-logo big …">…</svg>` (in the hero panel) with the same markup
   but `class="bug-logo big blink"`.
   (The exact original markup is in `legacy-logo.html` next to this file.)
2. (Optional) remove the favicon `<link>` tags from `<head>` if you also want the old
   no-favicon behaviour.
3. Run `node build.js` to refresh `dist/`.

The `.bug-logo` CSS is already in `styles.css`, so the old logo will render immediately.
