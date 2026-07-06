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
- Downloadable product documentation under `public/docs/`
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
  docs/             # downloadable user documentation (+ localized copies)
```

## Deployment

The site is static: deploy the contents of `dist/` to any static host or CDN.
No server-side runtime, environment variables, or secrets are required.

## License

© 2026 Taskivator. All Rights Reserved. See [LICENSE](LICENSE). The site code
and all brand assets are proprietary; see the license for terms.

## Support

Questions or issues: **support@bugit.dev**
