// A language must be REGISTERED before anything asks whether we ship it.
//
// WHY THIS EXISTS, and it is a defect I shipped into this branch myself.
//
// CR-08-F01 fixed a real problem: `if(!i18n[lang])` is a property lookup on a plain object
// literal, so it walks the prototype chain. 'constructor', 'toString', 'valueOf' and
// '__proto__' all answer truthy, and `lang` arrives from a cookie and from location.hash. So
// the check was rewritten to ask the dictionary's own keys, through Object.prototype:
//
//     function hasLang(lang){return Object.prototype.hasOwnProperty.call(i18n,lang)}
//
// The check is right. It was asked in one place where the dictionary is not finished being
// built. `app.js` registers ten locales in the early add() block near the top of the file --
// and ARABIC only in the generated override block, roughly two thousand lines further down.
// The initializer that resolves a returning visitor's stored choice runs between the two. So
// `hasLang('ar')` was false at the only moment it was asked, a stored Arabic choice was
// discarded on every single page load, and the site fell through to browser detection and
// served English to every Arabic reader. Three separate suites caught it -- check-routing (18
// failures), check-untranslated (168 English strings on the Arabic home page) and the locale
// chrome sweep -- and all three were describing one cause.
//
// It is the same shape as the defect it was fixing: a guard asking a question of a structure
// that is not finished. Fixing the one call site is not enough, because nothing would stop the
// next person adding a second load-time membership check, and nothing would stop a twelfth
// language being registered late the way Arabic is.
//
// WHAT THIS DELIBERATELY DOES NOT DO: it does not require Arabic to be moved up into the early
// block. Where a locale is registered is a property of how the overrides are generated, and a
// guard that demanded a particular ORDER would break the next time the generator changed. The
// invariant is that nobody asks before the answer exists, not that the answer arrives early.
//
// Run: `node scripts/check-locale-registration-order.mjs`. No dependencies.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "app.js"), "utf8").split("\r\n").join("\n");
const LINES = SRC.split("\n");

/**
 * The same source with every comment blanked out, line numbering preserved.
 *
 * NOT a cosmetic detail. The first version of this guard skipped a line when it STARTED with
 * `//` or `*`, and immediately reported app.js:200 -- a continuation line inside the block
 * comment that explains this very finding, quoting the old `i18n[currentLang]` it replaced. A
 * scan that reads its own explanation as the defect is the wrong-subject-scan class arriving
 * inside the tool written to catch it, which has happened here before.
 *
 * Characters are replaced with spaces rather than removed so every reported line number still
 * points at the real line, and the original line is quoted from LINES for the message.
 */
function blankComments(src) {
  let out = "";
  let mode = null; // null | "line" | "block" | "'" | '"' | "`"
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    const d = src[i + 1];
    if (mode === "line") {
      if (c === "\n") { mode = null; out += c; } else out += " ";
    } else if (mode === "block") {
      if (c === "*" && d === "/") { mode = null; out += "  "; i += 1; }
      else out += c === "\n" ? c : " ";
    } else if (mode === "'" || mode === '"' || mode === "`") {
      out += c;
      if (c === "\\") { out += src[i + 1] ?? ""; i += 1; }
      else if (c === mode) mode = null;
    } else if (c === "/" && d === "/") { mode = "line"; out += "  "; i += 1; }
    else if (c === "/" && d === "*") { mode = "block"; out += "  "; i += 1; }
    else { if (c === "'" || c === '"' || c === "`") mode = c; out += c; }
  }
  return out;
}

const CODE = blankComments(SRC).split("\n");

const fail = [];

// ── 1. The picker and the dictionaries name the same languages ──────────────────────────────
//
// A locale in the picker with no dictionary renders a menu entry that does nothing. A
// dictionary with no picker entry is copy nobody can reach. Neither is true today.

const cat = /const languages=\[(.*?)\];/s.exec(SRC);
if (!cat) fail.push("the `languages` catalogue is gone, or no longer reads `const languages=[...]`");
const shipped = cat ? [...cat[1].matchAll(/\['([a-z-]+)',/g)].map((m) => m[1]) : [];

const registered = new Map();
LINES.forEach((line, i) => {
  const m = /^add\(['"]([a-z-]+)['"]/.exec(line);
  if (m && !registered.has(m[1])) registered.set(m[1], i + 1);
});
// English is the base every other locale is merged onto: an object literal, not an add() call.
registered.set("en", LINES.findIndex((l) => /^const i18n=\{/.test(l)) + 1);

for (const code of shipped) {
  if (!registered.has(code)) {
    fail.push(`[${code}] is offered in the language picker but no dictionary is registered for it`);
  }
}
for (const code of registered.keys()) {
  if (!shipped.includes(code)) {
    fail.push(`[${code}] has a dictionary but is not in the language picker, so nobody can reach it`);
  }
}

// ── 2. The load-time language decision must not consult the dictionary ──────────────────────
//
// SCOPED TO THE INITIALIZER, not to the whole load-time region, and that narrowing is a finding
// rather than a convenience. Several statements near the end of the file DO read i18n at load
// time: `for(const c in i18n)` applying sign-in labels, and three
// `Object.keys(t).forEach(code=>{ if(i18n[code]) ... })` override passes. Every one is
// membership-guarded, and every one MUTATES locales that already exist. Skipping a locale not
// yet registered loses nothing there, because the late generated block that registers it
// already carries the same content. Checked rather than assumed: signinLabels.ar and the Arabic
// dictionary's own cta.signin are the same string.
//
// The initializer is different in kind. It does not mutate a dictionary, it DECIDES which
// language the visitor gets. A false answer there is not a skipped override; it is the wrong
// language for the rest of the session, which is exactly what happened.

const initStart = LINES.findIndex((l) => /(?:let|var|const) currentLang=/.test(l));
if (initStart === -1) {
  fail.push("the currentLang initializer is gone; this guard no longer covers anything");
} else {
  let end = initStart;
  while (end < LINES.length && !/^\}\)\(\);/.test(LINES[end])) end += 1;

  // Scanned over CODE, where comments are blanked; quoted from LINES, where they are not.
  CODE.slice(initStart, end + 1).forEach((line, i) => {
    const n = initStart + i + 1;
    const where = registered.get("ar") ?? "?";
    if (/\bhasLang\s*\(/.test(line)) {
      fail.push(
        `app.js:${n} asks hasLang() while resolving the visitor's language. The dictionary then ` +
          `holds only the locales registered above it, and Arabic is registered at line ${where}. ` +
          `Ask SHIPPED_LANGS instead.\n      ${LINES[n - 1].trim().slice(0, 140)}`,
      );
    }
    if (/\bi18n\s*\[/.test(line)) {
      fail.push(
        `app.js:${n} reads i18n[...] while resolving the visitor's language, before every locale ` +
          `is registered.\n      ${LINES[n - 1].trim().slice(0, 140)}`,
      );
    }
  });
}

// ── 3. The membership check that IS made stays prototype-safe ───────────────────────────────
//
// The CONTROL against "fixing" this by deleting the check. CR-08-F01 exists because a cookie
// saying '__proto__' became currentLang, and every later i18n[currentLang] answered truthy for
// a dictionary with no strings in it. Whatever the initializer asks, it must ask a Set built
// from the catalogue -- never a bare property lookup.

if (initStart !== -1) {
  const init = LINES.slice(initStart, initStart + 40).join("\n");
  if (/if\(chosen&&how===['"]user['"]\)return chosen/.test(init)) {
    fail.push(
      "the stored language choice is returned unchecked again: a cookie saying '__proto__' " +
        "becomes currentLang (CR-08-F01)",
    );
  } else if (!/SHIPPED_LANGS\.has\(/.test(init)) {
    fail.push(
      "the stored language choice is no longer checked against SHIPPED_LANGS, the one set that " +
        "is complete before any locale is registered and is prototype-safe (CR-08-F01)",
    );
  }
}

// ── 4. SHIPPED_LANGS is derived, never listed ───────────────────────────────────────────────
//
// A second hand-written list of language codes would go stale the day a twelfth language lands,
// and would do it silently, because a missing entry reads exactly like a language we do not
// ship. It must be computed from `languages`, which is the one catalogue.

if (SRC.includes("SHIPPED_LANGS")) {
  const decl = /const SHIPPED_LANGS=([^;]+);/.exec(SRC);
  if (!decl) {
    fail.push("SHIPPED_LANGS is used but not declared as `const SHIPPED_LANGS=...;`");
  } else if (!/languages\.map\(/.test(decl[1])) {
    fail.push(
      "SHIPPED_LANGS is not derived from `languages`. A second list of language codes goes " +
        `stale silently the day a twelfth language lands:\n      ${decl[1].trim().slice(0, 140)}`,
    );
  }
}

if (fail.length) {
  console.error(`FAIL: ${fail.length} locale registration problem(s)\n`);
  for (const f of fail) console.error("  - " + f);
  console.error(
    "\nA language can be registered late in app.js -- Arabic is, by about two thousand lines. So\n" +
      "anything deciding whether we ship a language must ask `languages`, which is complete at\n" +
      "parse time, and not `i18n`, which is not.",
  );
  process.exit(1);
}

console.log(
  `check-locale-registration-order OK: ${shipped.length} shipped languages, every one registered, ` +
    `and the language decision asks the catalogue rather than the half-built dictionary`,
);
