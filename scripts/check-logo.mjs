// Regression guard for the BugIt logo's upper-corner artifact (zero dependencies).
//
// THE DEFECT THIS PREVENTS
// The logo's glossy top highlight is a white rounded rect drawn over the pink
// body: `<rect ... width=60 height=30 rx=20 fill="#ffffff" ...>`. Because the
// rect is only 30 tall, the SVG spec clamps its vertical corner radius to
// height/2 = 15, so its top corners are a shallower (20x15) ellipse than the
// pink body's (20x20) corners. The highlight therefore bulges a fraction of a
// unit OUTSIDE the body at each upper corner, depositing ~12% white on the
// transparent background — two faint white lines. Browsers (which clamp per
// spec) show it; it also bakes into raster exports.
//
// THE FIX (what this check enforces)
// Clip the white highlight to the exact pink body via a clipPath, so it can
// never paint outside the rounded square regardless of renderer:
//   <clipPath id="body_clip_*"><rect x=20 y=22 width=60 height=60 rx=20/></clipPath>
//   <rect ... fill="#ffffff" ... clip-path="url(#body_clip_*)"/>
//
// This is a structural text check, not a pixel/render/metadata comparison, so it
// is stable: it only fails if a white highlight rect is reintroduced WITHOUT a
// clip-path, which is exactly the defect. Harmless edits (colors, animation
// timing, viewBox, formatting) do not trip it.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Every SVG here IS BugIt logo artwork (aria-label "BugIt Blip") that carries the
// glossy top highlight and must stay clipped:
//   blip-logo  — the primary logo (mascot + magnifier)
//   blip-bugit — a byte-identical alias of the primary logo
//   blip-main / blip-mark — the BugIt mascot mark (no magnifier)
//   favicon    — the static favicon mark
// The other blip-*.svg files (buildit/deployit/docsit/planit/reviewit/testit/
// watchit) are SEPARATE Taskivator product marks — deliberately out of scope, so
// they are NOT listed here (listing them would make this check fail on artwork this
// task never touched).
const LOGO_SVGS = [
  "public/brand/blip-logo.svg",
  "public/brand/blip-bugit.svg",
  "public/brand/blip-main.svg",
  "public/brand/blip-mark.svg",
  "public/brand/favicon.svg",
];

let failures = 0;

for (const rel of LOGO_SVGS) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    console.error(`  MISSING   ${rel}`);
    failures++;
    continue;
  }
  const svg = readFileSync(path, "utf8");

  // Find every white-filled <rect> (the glossy highlight). Eye glints are
  // <circle>, so this matches only the top highlight overlay(s).
  const whiteRects = [...svg.matchAll(/<rect\b[^>]*\bfill="#ffffff"[^>]*>/gi)];

  if (whiteRects.length === 0) {
    // No white highlight at all is acceptable (some variants omit it); nothing
    // can overflow, so nothing to guard.
    console.log(`  ok (no white highlight)   ${rel}`);
    continue;
  }

  for (const m of whiteRects) {
    const rect = m[0];
    const clip = rect.match(/clip-path="url\(#([A-Za-z0-9_-]+)\)"/);
    if (!clip) {
      console.error(
        `  UNCLIPPED HIGHLIGHT  ${rel}\n     ${rect.trim()}\n     -> add clip-path="url(#body_clip_...)" so it cannot paint past the rounded corners`,
      );
      failures++;
      continue;
    }
    const clipId = clip[1];
    // The referenced clipPath must exist AND be the full body (height 60), not a
    // partial shape — otherwise the highlight could still overflow.
    const clipDef = new RegExp(
      `<clipPath id="${clipId}">\\s*<rect\\b[^>]*\\bheight="60"[^>]*\\brx="20"[^>]*/>`,
    );
    if (!clipDef.test(svg)) {
      console.error(
        `  BAD CLIP TARGET  ${rel}: clip-path #${clipId} is missing or is not the full 60x60 rx=20 body`,
      );
      failures++;
      continue;
    }
    console.log(`  ok (highlight clipped to body #${clipId})   ${rel}`);
  }
}

if (failures > 0) {
  console.error(`\nLogo corner-artifact check FAILED (${failures} problem(s)).`);
  process.exit(1);
}
console.log("\nLogo corner-artifact check passed.");
