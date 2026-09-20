#!/usr/bin/env node
/**
 * The Guide's inline mark may not drift from the generated one.
 *
 * WHY THIS EXISTS. Every other BugIt mark on this site is an <img> pointing at a
 * file the brand pipeline generates, so it cannot disagree with the brand source:
 * scripts/check-brand-sync.mjs hashes it. The Guide is the one exception, and for
 * a reason worth keeping — public/guide/guide.js writes its blip inline so that
 * guide.css can drive it from the panel's state (the pupil darts and the typing
 * dots quicken while an answer is being composed; an <img> is an isolated
 * document and no stylesheet of ours can reach inside it).
 *
 * The price of that is a hand copy, and a hand copy of generated artwork is the
 * exact shape of failure this repository has already had twice: a second copy
 * nobody remembers to update, staying green because nothing compares the two.
 * The brand build is the authority. This asserts the copy still agrees with it.
 *
 * SCOPE, STATED HONESTLY. The inline blip is deliberately a SIMPLIFICATION of the
 * generated file: no outer glow, no inner iris circle, a slightly heavier smile.
 * So this does not compare whole documents — that would fail on differences that
 * are intended and would then be switched off. It compares the figures that make
 * the mark identifiable as the Guide and that a brand-side edit would move: the
 * speech bubble's outline, where the bubble sits, and the three typing dots.
 * Anything else can differ.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = "public/brand/blip-guide.svg";
const INLINE = "public/guide/guide.js";

const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };

for (const rel of [BRAND, INLINE]) {
  if (!existsSync(join(root, rel))) {
    console.error(`FAIL: ${rel} is missing.`);
    process.exit(1);
  }
}

// Read both with CR stripped: this repo has no .gitattributes and core.autocrlf
// is on, so a Windows checkout hands back CRLF while CI's Linux runner does not.
// A guard that is red on one platform for a reason nobody can act on gets ignored.
const read = (rel) => readFileSync(join(root, rel), "utf8").replace(/\r\n/g, "\n");
const brand = read(BRAND);
const inline = read(INLINE);

/* The bubble outline. Compared as normalised path data so that whitespace and a
 * different quote style are not reported as a brand change. */
const pathD = (src) => {
  const m = [...src.matchAll(/<path\b[^>]*\bd="([^"]*M-11 -8[^"]*)"/g)];
  return m.map((x) => x[1].replace(/\s+/g, " ").trim());
};

const brandPath = pathD(brand);
const inlinePath = pathD(inline);

if (brandPath.length !== 1) fail(`${BRAND} should hold exactly one speech-bubble path, found ${brandPath.length}. If the mark was redrawn, update this guard with it.`);
if (inlinePath.length !== 1) fail(`${INLINE} should hold exactly one speech-bubble path, found ${inlinePath.length}.`);
if (brandPath.length === 1 && inlinePath.length === 1 && brandPath[0] !== inlinePath[0]) {
  fail(`the Guide's inline speech bubble no longer matches ${BRAND}.\n` +
       `  brand:  ${brandPath[0]}\n` +
       `  inline: ${inlinePath[0]}\n` +
       `  The brand source is the authority. Regenerate it, then copy the path into blip() in ${INLINE}.`);
} else if (brandPath.length === 1 && inlinePath.length === 1) {
  console.log("  ok   the speech bubble matches the generated mark");
}

/* Where the tool sits. brand.mjs derives this from TOOL_PLACE, so a change there
 * moves the bubble in the generated file and this catches the copy left behind. */
const placement = (src) => {
  const m = src.match(/transform="translate\(66 64\) scale\(1\.16\)"/);
  return Boolean(m);
};
if (!placement(brand)) fail(`${BRAND} no longer places its tool at translate(66 64) scale(1.16). If TOOL_PLACE changed in the brand source, update ${INLINE} and this guard together.`);
else if (!placement(inline)) fail(`${INLINE} does not place the bubble where ${BRAND} does.`);
else console.log("  ok   the bubble sits where the generated mark puts it");

/* The three typing dots, by position and radius. */
const dots = (src) =>
  [...src.matchAll(/<circle class="(?:blip-dot|b-dot)[^"]*" cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)]
    .map((m) => `${m[1]},${m[2]},${m[3]}`);

const brandDots = dots(brand);
const inlineDots = dots(inline);
if (brandDots.length !== 3) fail(`${BRAND} should hold three typing dots, found ${brandDots.length}.`);
else if (inlineDots.join("|") !== brandDots.join("|")) {
  fail(`the Guide's inline typing dots no longer match ${BRAND}.\n` +
       `  brand:  ${brandDots.join("  ") || "(none)"}\n` +
       `  inline: ${inlineDots.join("  ") || "(none)"}`);
} else console.log("  ok   the three typing dots match the generated mark");

/* The dots and the bubble must both stop under reduced motion. The Guide's
 * stylesheet does this with a universal rule inside .bgd-root, which covers them
 * whatever they are called — assert that rule is still there rather than naming
 * the classes, so this does not go stale the next time one is renamed. */
const css = read("public/guide/guide.css");
const rm = css.match(/@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\n\}/);
if (!rm) fail("public/guide/guide.css has no reduced-motion block at all.");
else if (!/\.bgd-root \*[^{]*\{[^}]*animation-duration:\.001ms!important/.test(rm[1])) {
  fail("the Guide's reduced-motion block no longer stops every animation inside .bgd-root, so the new bubble and dots would keep moving for a reader who asked them not to.");
} else console.log("  ok   the bubble and dots stop under reduced motion");

/* The mark has to be ON the Guide's surfaces, not merely defined. Both avatars
 * come from the same blip(), so one call site returning something else is the
 * realistic regression. */
const calls = (inline.match(/html: blip\(\)/g) || []).length;
if (calls < 2) fail(`expected the launcher AND the panel header to draw the mark, found ${calls} call site(s) of blip() in ${INLINE}.`);
else console.log(`  ok   ${calls} Guide surfaces draw the mark`);

/* And the hero bar points at the generated file, not at some other blip. */
const html = read("index.html");
if (!/class="askbar-orb"[\s\S]{0,200}?src="\/public\/brand\/blip-guide\.svg"/.test(html)) {
  fail("the hero Ask BugIt bar's orb is not showing /public/brand/blip-guide.svg.");
} else console.log("  ok   the hero Ask BugIt bar shows the Guide mark");

if (process.exitCode) {
  console.error("\ncheck-guide-blip FAILED");
} else {
  console.log("\ncheck-guide-blip OK: the Guide's inline mark still agrees with the generated one, on every surface that draws it");
}
