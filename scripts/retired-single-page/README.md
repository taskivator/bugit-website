# Retired with the single page site (2026-10-04)

On 2026-10-04 bugit.dev switched to the redesign: build.js publishes `v2/index.html` as `/` and
`v2/docs/index.html` as `/docs/`. The guards in this folder drove the single page site that was
replaced: its picker (`#langButton`), its docs view (`#docView`), its Mission Control demo, its video
stage, its stylesheet. Against the new pages they could only crash, or pass while measuring nothing,
which is worse. They are kept for history and are not run by CI or `npm test`
(`check-ci-coverage.mjs` scans `scripts/check-*.mjs` only, so a guard here is not expected to be wired).
They import `./lib/...` relative to `scripts/`, so they will not run from here unmodified.

Where a property outlived the design, it is held on the published pages by
`check-published-pages.mjs` (routes, keyboard, targets, type, names, motion, narrow screens, zoom),
`check-redesign.mjs` (old addresses, every language rendering clean, consent, the Ask bar), and the copy
guards, which read the published copy through `scripts/lib/published-copy.mjs`.

| Guard | Why it was retired, and what holds its property now |
|---|---|
| `check-a11y.mjs` | a static check of the old demo's tablist in index.html. The new pages have no tablist; names, alts and one h1 are held by check-published-pages (6. NAMES). |
| `check-alignment.mjs` | measured the old stylesheet's layers and called applyLang(). |
| `check-channel.mjs` | the old video stage (#ytStage). |
| `check-chrome-a11y.mjs` | drove #langButton and #langList, the old picker. The new picker's keyboard contract is held by check-published-pages (2. PICKER). |
| `check-chrome.mjs` | the old page chrome (#langButton). |
| `check-close-control.mjs` | the old page-locking overlays. |
| `check-compositor-budget.mjs` | the old video stage and styles.css. |
| `check-demo-pause.mjs` | the old demo pause control (#demoPause). |
| `check-demo-stage.mjs` | the old demo stage (ambient layer). |
| `check-dim-on-screen.mjs` | the old Mission Control fade on a landscape phone. Text left faded is held by check-published-pages (7. MOTION). |
| `check-doc-markup.mjs` | the old docs view (#docContent). Markup leaking into a rendered document is held by check-doc-rendering, which now renders through the new docs page's own renderers. |
| `check-docs-chrome.mjs` | the old docs chrome (#docNav). |
| `check-forced-colors.mjs` | drove the old router (/#/support rendered no document view on the new pages, so nothing was measured). Windows High Contrast (every control keeps an edge, focus draws an outline) is held by check-published-pages (10. CONTRAST). |
| `check-ground.mjs` | the old ambient background gradient at 4K. The new background is flat. |
| `check-hairlines.mjs` | routed styles.css, which the new pages never load. |
| `check-instrument-size.mjs` | the old Mission Control (.mission). |
| `check-menu-keyboard.mjs` | needed role="menu", which only the old picker declared. Held by check-published-pages (2. PICKER). |
| `check-mission-box.mjs` | the old Mission Control (#mcStepsToggle). |
| `check-mission-live-row.mjs` | the old Mission Control rows (#mcStepList). |
| `check-mission-marker.mjs` | the old Mission Control marker (#mcStepList). |
| `check-mission-pause.mjs` | the old Mission Control demo. The new demo has no pause latch. |
| `check-mobile-chrome.mjs` | the old demo and ambient layers. Touch targets are held by check-published-pages (4. TAP, 24px, WCAG 2.2 AA). |
| `check-motion.mjs` | the old hero and demo reveals. Reduced motion is held by check-published-pages (7. MOTION). |
| `check-overflow.mjs` | evaluated applyLang() of the old page. Sideways scroll is held by check-redesign (every language at 360 and 1440) and check-published-pages (320). |
| `check-overlay-controls.mjs` | the old Mission Control steps toggle (#mcStepsToggle). |
| `check-phone-height.mjs` | the old Mission Control on a phone. |
| `check-progress-label.mjs` | the old Mission Control progress label (.report-pct). |
| `check-reading.mjs` | the old docs view (#docView). |
| `check-report-bar.mjs` | the old demo report bar. |
| `check-report-reveal.mjs` | the old "Show full report" control. |
| `check-reveal.mjs` | the old scroll reveals (#langButton). |
| `check-routing.mjs` | the old one page router, eleven languages by click, reload and history. Held by check-published-pages (1. ROUTES, English and Arabic, Back and Forward) and check-redesign (forwarding, every language). |
| `check-rule-pair.mjs` | measured the old section labels' paired rules; the new pages have no label with a rule either side, so its subject is gone. |
| `check-spa-routing.mjs` | the old one page router (#docView). Docs routes, not-found and recovery are held by check-published-pages (1. ROUTES); old addresses by check-redesign. |
| `check-space.mjs` | read the old index.html's routes. |
| `check-toc-teardown.mjs` | the old docs view's contents list (#docView). |
| `check-type-floor.mjs` | read its floor from styles.css's --t-3xs and routed styles*.css, which the new pages never load. The 10px floor is held by check-published-pages (5. TYPE). |
| `check-untranslated.mjs` | rendered the old page per language. Translation completeness is held statically by check-languages (every key the pages read, in every language) and check-locale-crosstalk (no shared prose). |
| `check-watch-inline.mjs` | the old inline film stage (#ytStage). |
| `check-zoomed-overlay.mjs` | the old phone menu (#navToggle). The new phone menu is held by check-published-pages (3. MENU). |
