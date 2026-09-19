# Taskivator — Marketing Website

The public marketing site for **Taskivator**, maker of **BugIt** — a QA
bug-filing agent for VS Code that turns rough test notes into polished,
reviewed bug tickets filed to your tracker after your approval.

Live site: **https://bugit.dev**

## Overview

A fast, dependency-free static website. Content is authored in plain
`index.html`, `styles.css`, and `app.js` (a small hand-written client that
handles routing, internationalization, and interactive demos). The build step
simply assembles a deployable `dist/` folder — there is no framework and no
runtime dependency.

## Features

- Single-page marketing site with client-side routing and deep-linkable views
- Full internationalization (10 languages) driven from `app.js`
- Inline product demos (video) and the animated Blip brand mark
- Current in-app product documentation sourced from `public/docs/`
- Self-contained brand system (`public/brand/`) shared with the product

## Requirements

- **Node.js ≥ 18** (used only for the build/preview scripts; the site itself
  ships as static files)

## Development

```bash
npm install        # no dependencies, but initializes the project
npm run dev        # serve locally at http://localhost:3000
```

## Build

```bash
npm run build      # assembles a deployable static site into dist/
npm run preview    # serve the built site locally
```

`dist/` is generated output and is not committed.

## Project structure

```
index.html          # markup + <head>/meta/canonical
styles.css          # all styling (design tokens imported from brand)
app.js              # routing, i18n, interactive behavior
build.js            # copies static assets into dist/
server.js           # tiny static server for dev/preview
public/
  brand/            # logos, favicons, design tokens (shared brand system)
  media/            # product demo videos
  docs/             # current web guides and localized legal documents
  guide/            # the Guide: prepared answers, matched in the visitor's browser
```

### The Guide (`public/guide/`)

The chat Guide answers **only** from answers written in advance, matched in the visitor's own
browser. It calls no model and no server, so it costs nothing to run and a question never leaves the
page; that is the owner's decision of 2026-09-17, which gives the Portal Guide a model with a monthly
spending cap and gives this one none. When nothing in the bank fits, it offers a person: a button
that opens the visitor's own email application, addressed to support.

```
match.js            # the matching rules, a port of the Portal's lib/assistant/prepared.ts
guide.js            # the widget, from prototype-chatbot/widget/guide.js minus everything server-side
guide.css           # the widget's styling, unchanged from the prototype
prepared/<lang>.json  # 410 answers in each of the 11 languages
sources.json        # entry id -> the site page where that answer can be read
```

The banks are the Portal's `lib/assistant/prepared-answers/`, which is the authority, with two
differences that only make sense here: the "needs a person" replies point at the support email rather
than at the Portal's ticket form and a signed-in account, and the two privacy answers say first that
this Guide uses no AI before describing the Portal assistant that does. `scripts/check-guide.mjs`
holds the claim itself: it asks real questions in a real browser and fails if anything leaves this
origin.

Retired v1.0.1 manuals are preserved under `archive/v1.0.1-docs/` and are not copied into the deployable build.

## Deployment

The site is static: deploy the contents of `dist/` to any static host or CDN.
No server-side runtime, environment variables, or secrets are required.

## License

© 2026 Taskivator. All Rights Reserved. See [LICENSE](LICENSE). The site code
and all brand assets are proprietary; see the license for terms.

## Support

Questions or issues: **support@bugit.dev**
