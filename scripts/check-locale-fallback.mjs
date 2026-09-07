// Does a visitor get their own language? Both kinds: one who has never been here, and one who
// has, which is the half this file did not test on the day the fallback shipped.
//
// WHY THIS EXISTS. Until 2026-09-07 the answer was no, for everyone, everywhere. The whole
// locale decision in app.js was cookie, then localStorage, then a hard coded 'en'. There is no
// ?lang= parameter and there was no navigator.language step, so the ten non-English locales
// were reachable only by a visitor who found the language picker and clicked it. Eleven
// translations, the LQA rounds, the parity guards and the 22 localized PDFs all sat behind a
// control nobody had a reason to touch.
//
// It hid because every guard that renders a locale SETS the cookie first, since that is the
// documented way to drive this site. A harness that always sets the switch can never notice
// that nothing else ever does. The instrument and the defect were the same shape.
//
// So this guard is deliberately the one that does NOT set the cookie. It asks the browser for
// a language the way a stranger's browser does, and reads what the page turned into.
//
// A FRESH CONTEXT PER CASE, because the site picks its language once when the bundle boots:
// reusing a context measures the first case forever. And the assertion is the RENDERED result,
// not the html lang attribute alone. Setting the attribute is one line in applyLang(); proving
// the dictionary was applied needs a string that only that locale produces.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// browser locale -> what the visitor must end up reading, and the label only that dict yields
const CASES = [
  { locale: "ja-JP", expect: "ja",    label: "日本語", why: "base subtag: ja-JP resolves to ja" },
  { locale: "de-DE", expect: "de",    label: "Deutsch",            why: "base subtag: de-DE resolves to de" },
  { locale: "pt-BR", expect: "pt-br", label: "Português BR",  why: "exact tag: pt-BR matches the pt-br we ship" },
  { locale: "pt-PT", expect: "pt-br", label: "Português BR",  why: "region fallback: any Portuguese gets pt-br, the only one in the set" },
  { locale: "ar-EG", expect: "ar",    label: "العربية", dir: "rtl", why: "base subtag, and Arabic must also flip direction" },
  { locale: "nl-NL", expect: "en",    label: "English",            why: "a locale we do NOT ship falls back to English, not to nothing" },
  { locale: "en-US", expect: "en",    label: "English",            why: "the control: English still resolves to English" },
  // The half that matters most. A returning visitor who chose a language must keep it, or the
  // fallback silently overrules every explicit choice on every load.
  { locale: "ja-JP", cookie: "fr", expect: "fr", label: "Français", why: "an explicit choice beats the browser: cookie fr wins over a ja-JP browser" },
  // AND THE OTHER HALF, which the eight cases above could not see, because every one of them
  // describes a visitor with no history. The fallback shipped on 2026-09-07 and was reported
  // broken from Tokyo the same day, by the owner, on a Japanese browser. It was: applyLang()
  // persists bugitLang on every render, so the pre-fix code had stamped 'en' on everyone for a
  // year, and the cookie is read before the browser is ever asked. The fix was invisible to
  // exactly the people who had been to the site before, which is every customer it already had.
  // A first-visit guard cannot fail on a returning visitor. These are that visitor.
  { locale: "ja-JP", cookie: "en", expect: "ja", label: "日本語", why: "LEGACY 'en' was written BY US, not chosen: a Japanese browser gets Japanese" },
  { locale: "ja-JP", lsLang: "en", expect: "ja", label: "日本語", why: "the same legacy stamp in localStorage is equally not a choice" },
  { locale: "ja-JP", cookie: "en", marker: "user", expect: "en", label: "English", why: "someone who really did click English in Tokyo keeps English" },
  { locale: "de-DE", cookie: "ja", marker: "auto", expect: "de", label: "Deutsch", why: "an auto-detected value is re-derived, so a new browser language changes the site" },
  { locale: "de-DE", cookie: "ja", marker: "user", expect: "ja", label: "日本語", why: "a real choice outlives a different browser language" },
  // AND THE ONLY CASE THAT USES THE REAL CONTROL. Every case above INJECTS the stored state,
  // which means none of them exercises the one path that creates it: a person clicking the
  // picker. That gap hid a defect inside the fix itself. applyLang() also runs on renders that
  // are not choices -- signing in re-renders the header through it -- and it was writing 'auto'
  // over the 'user' a click had just written. The page looked right on the next load and lost
  // the language on the one after, so two reloads are the minimum that can see it.
  { locale: "ja-JP", click: "de", reloads: 2, expect: "de", label: "Deutsch", why: "a language chosen by CLICKING must survive the automatic re-renders that follow it" },
  // TOUCHING localStorage CAN THROW, and until 2026-09-07 that took the whole page with it.
  // Safari with "Block all cookies", and several enterprise and privacy configurations, make
  // every localStorage property access raise a SecurityError. Both uses here were unguarded:
  // the READ sat outside the try in the chain below, and the WRITE sat in applyLang() BEFORE it
  // set documentElement.lang, before it set dir, and before it applied a single string. So the
  // throw did not merely lose the stored choice, it left the visitor on the untranslated HTML
  // with the language control dead, in every language, including English.
  // Found by a live audit of 365 first-time visitors: these three were the only failures.
  { locale: "de-DE", breakStorage: true, expect: "de", label: "Deutsch", why: "storage throws and German is shipped: the browser is still the answer" },
  { locale: "fr-FR", breakStorage: true, expect: "fr", label: "Français", why: "storage throws and French is shipped" },
  { locale: "th-TH", breakStorage: true, expect: "en", label: "English", why: "storage throws and Thai is not shipped: English, and the page still works" },
];

const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
});
let serverExit = null;
server.on("exit", (code, signal) => { serverExit = signal || "code " + code; });
const base = "http://127.0.0.1:" + PORT;

const fail = [];
let browser = null;

try {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error("the site server exited before serving anything (" + serverExit + ")");
    try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  browser = await chromium.launch();

  for (const c of CASES) {
    const ctx = await browser.newContext({ locale: c.locale });
    if (c.cookie) await ctx.addCookies([{ name: "bugitLang", value: c.cookie, url: base }]);
    // bugitLangSet is how a click is told apart from a guess. Absent is the LEGACY state, and
    // it is the one that matters most here: it is what every existing visitor actually carries.
    if (c.marker) await ctx.addCookies([{ name: "bugitLangSet", value: c.marker, url: base }]);
    if (c.lsLang) await ctx.addInitScript((v) => { try { localStorage.setItem("bugitLang", v); } catch (e) {} }, c.lsLang);
    // Reproduce a browser that refuses storage, BEFORE any page script runs. Replacing the
    // property is how the real thing behaves: the throw comes from touching `localStorage`
    // itself, not from the method, so a stub that only fails on getItem would miss the write.
    if (c.breakStorage) {
      await ctx.addInitScript(() => {
        const boom = () => {
          throw new DOMException("The operation is insecure.", "SecurityError");
        };
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            return { getItem: boom, setItem: boom, removeItem: boom };
          },
        });
      });
    }
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Drive the picker the way a person does, then come back the way they do.
    if (c.click) {
      await page.click("#langButton");
      await page.click('#langList button[data-lang="' + c.click + '"]');
      await page.waitForTimeout(250);
      for (let n = 0; n < (c.reloads || 1); n++) {
        await page.goto(base, { waitUntil: "networkidle" });
        await page.waitForTimeout(400);
      }
    }

    const got = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      label: (document.getElementById("langLabel") || document.getElementById("langButton") || {}).textContent || "",
      // Proof the browser really was asked, so a pass cannot come from a stale cookie.
      navLangs: (navigator.languages || []).join(","),
    }));
    const seen = c.locale + (c.click ? " + clicked " + c.click + " then " + (c.reloads || 1) + " reload(s)" : "") +
                 (c.cookie ? " + cookie " + c.cookie : "") + (c.lsLang ? " + stored " + c.lsLang : "") +
                 (c.marker ? " + " + c.marker : c.cookie || c.lsLang ? " + no marker (legacy)" : "") +
                 (c.breakStorage ? " + storage throws" : "");

    if (got.lang !== c.expect) {
      fail.push(seen + ": documentElement.lang is '" + got.lang + "', expected '" + c.expect + "'. " + c.why);
    }
    // The attribute alone proves nothing: applyLang sets it before it swaps any text.
    if (got.label.trim() !== c.label) {
      fail.push(seen + ": the language control reads '" + got.label.trim() + "', expected '" + c.label +
                "'. The lang attribute may be right while the dictionary never applied.");
    }
    if (c.dir && got.dir !== c.dir) {
      fail.push(seen + ": direction is '" + got.dir + "', expected '" + c.dir + "'.");
    }
    if (!c.cookie && !c.lsLang && !got.navLangs.toLowerCase().startsWith(c.locale.toLowerCase().split("-")[0])) {
      fail.push(seen + ": the browser reported navigator.languages='" + got.navLangs +
                "', so this case never presented the locale it claims to test.");
    }
    if (errors.length) fail.push(seen + ": page threw " + errors[0]);

    await ctx.close();
  }
} catch (e) {
  fail.push("harness: " + (e && e.message ? e.message : String(e)));
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
}

if (fail.length) {
  for (const f of fail) console.error("FAIL: " + f);
  console.error("\ncheck-locale-fallback: " + fail.length + " failure(s). A visitor is not being " +
                "served their own language. Two places decide, and both read the marker before " +
                "the language: the IIFE that initialises currentLang in app.js (bugitLangSet " +
                "'user' pins bugitLang, 'auto' and absent re-derive from navigator), and " +
                "applyLang(), which records WHICH of those two it just did.");
  process.exit(1);
}
console.log("check-locale-fallback: OK, all " + CASES.length + " cases. A visitor is served their own " +
            "language where we ship it and English where we do not, whether they arrive with no " +
            "history, with the 'en' this site stamped on everyone before 2026-09-07, or with a " +
            "language they actually chose, which still overrules the browser.");
