/*
 * THE DICTIONARY A VISITOR ACTUALLY READS, NOT THE TEXT OF app.js.
 *
 * WHY THIS EXISTS (CR-08-F10, F12, F21). app.js builds its eleven language dictionaries in
 * several passes and the last writer wins: a readable literal near the top, `add(code, merge(...))`
 * calls, the v16 FAQ pass that ASSIGNS `faq.items` wholesale, a generated `add("xx", {...})` line
 * per locale that rebuilds the dictionary from the English base, and a dozen later
 * `for (const c in i18n)` passes that overwrite single keys. The copy guards used to read that
 * source as text: an 80,000-character window after each `add(` call, a regex over every
 * definition of a key in both quote styles, a count of how many times a key was spelled. None of
 * those is the dictionary a reader sees. A window runs past its own locale into the next one, so
 * a locale whose answer was lost could borrow its neighbour's correct one and pass; a count of
 * definitions says nothing about which locale each belongs to, and a stale literal that nothing
 * reads any more is counted as if it were live.
 *
 * So this runs app.js. It is a classic browser script, and every dictionary pass is plain
 * top-level code, so it evaluates in a node:vm context with the browser objects replaced by an
 * inert stub (every property is another stub, every call returns one, iteration yields nothing).
 * What comes back is `i18n` and `languages` exactly as they stand when the script has finished
 * loading, which is what applyLang() reads.
 *
 * WHAT IT CANNOT SEE. A mutation made inside an event handler or a timer (DOMContentLoaded, a
 * click, setTimeout) never runs here, because the stubs never call back. At the time of writing
 * no dictionary is written that way. If one ever is, this reports the load-time dictionary, and
 * the guard that uses it says so in its own output.
 *
 * FAILS LOUDLY. If app.js throws while it loads here, that is an error, never a partial result:
 * a dictionary half built is the "it read something, so it must be fine" answer these guards
 * were rewritten to stop giving. The usual cause is a new top-level use of a browser API the
 * stub list below does not cover; add it there.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function inert(depth = 0) {
  const target = function () {};
  return new Proxy(target, {
    get(_t, key) {
      if (key === Symbol.toPrimitive) return (hint) => (hint === "number" ? 0 : "");
      if (key === Symbol.iterator) return function* () {};
      if (key === "then") return undefined; // never look like a promise
      if (key === "length") return 0;
      if (key === "toString" || key === "valueOf") return () => "";
      return depth > 64 ? undefined : inert(depth + 1);
    },
    apply: () => inert(depth + 1),
    construct: () => inert(depth + 1),
    set: () => true,
    has: () => true,
  });
}

const BROWSER_GLOBALS = [
  "document", "navigator", "location", "localStorage", "sessionStorage", "history", "matchMedia",
  "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback", "IntersectionObserver",
  "MutationObserver", "ResizeObserver", "fetch", "performance", "screen", "CSS", "HTMLElement",
  "Element", "Node", "Event", "CustomEvent", "getComputedStyle", "addEventListener",
  "removeEventListener", "dispatchEvent", "scrollTo", "scrollBy", "gtag", "dataLayer", "Image",
  "innerWidth", "innerHeight", "devicePixelRatio", "crypto", "caches", "open", "alert", "confirm",
  "BroadcastChannel", "Worker", "XMLHttpRequest", "FormData", "Blob", "FileReader",
];
const HOST_GLOBALS = [
  "structuredClone", "URL", "URLSearchParams", "TextEncoder", "TextDecoder", "AbortController",
  "Intl", "atob", "btoa",
];

const cache = new Map();

/**
 * Evaluate app.js and return `{ i18n, languages, codes }` as they stand after load.
 * `codes` is the ordered list of shipped locale codes from the site's own `languages` table.
 * Pass `appPath` to point at a planted copy; the default is the repo's app.js.
 */
export function loadEffectiveI18n(appPath) {
  const file = path.resolve(appPath || path.join(REPO, "app.js"));
  if (cache.has(file)) return cache.get(file);
  const source = fs.readFileSync(file, "utf8");
  const ctx = {};
  for (const k of BROWSER_GLOBALS) ctx[k] = inert();
  for (const k of HOST_GLOBALS) ctx[k] = globalThis[k];
  ctx.setTimeout = () => 0;
  ctx.setInterval = () => 0;
  ctx.clearTimeout = () => {};
  ctx.clearInterval = () => {};
  ctx.queueMicrotask = () => {};
  ctx.console = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
  const context = vm.createContext(ctx);
  vm.runInContext("var window=globalThis;var self=globalThis;", context);
  try {
    vm.runInContext(source, context, { filename: file, timeout: 20000 });
  } catch (e) {
    throw new Error(`could not evaluate ${file} to read its effective dictionaries: ${e.message}. ` +
      "Refusing to check a half-built dictionary. If app.js now uses another browser API at load " +
      "time, add it to BROWSER_GLOBALS in scripts/lib/copy-effective-i18n.mjs.");
  }
  let out;
  try {
    out = JSON.parse(vm.runInContext(
      "JSON.stringify({ i18n: typeof i18n === 'undefined' ? null : i18n, " +
      "languages: typeof languages === 'undefined' ? null : languages })", context));
  } catch (e) {
    throw new Error(`app.js evaluated but its dictionaries could not be read back: ${e.message}`);
  }
  if (!out.i18n || typeof out.i18n !== "object") throw new Error("app.js defines no `i18n` dictionary");
  if (!Array.isArray(out.languages) || out.languages.length === 0) {
    throw new Error("app.js defines no `languages` table");
  }
  out.codes = out.languages.map(([c]) => c);
  cache.set(file, out);
  return out;
}

/** Every string in a dictionary, with its dotted key path. */
export function walkStrings(obj, prefix = "", out = []) {
  if (typeof obj === "string") out.push([prefix, obj]);
  else if (Array.isArray(obj)) obj.forEach((v, i) => walkStrings(v, `${prefix}[${i}]`, out));
  else if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) walkStrings(obj[k], prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}
