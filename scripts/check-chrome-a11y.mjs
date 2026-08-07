// Render the real page and read the real accessibility tree. The site defines each
// locale twice (the readable literal, then a generated add("<code>",{...}) that wins),
// so grepping app.js proves nothing about what a reader actually gets.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";

// A free port, asked for at run time. The port used to be hardcoded, which meant this
// harness could answer to a server it had not started: if the port was already taken its
// own server exited immediately, `fetch` succeeded against the OTHER process, and the run
// then died halfway through with ERR_CONNECTION_REFUSED when that process went away.
// Worse than the crash is the quiet version -- passing against a stale build.
const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});
let serverExit = null;
server.on("exit", (code, signal) => { serverExit = signal || `code ${code}`; });
const base = `http://127.0.0.1:${PORT}`;
const fail = [];
const note = (m) => console.log("  " + m);

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error(`the site server exited before serving anything (${serverExit})`);
    try { await fetch(base); return true; } catch { await new Promise(r => setTimeout(r, 250)); }
  }
  return false;
};

try {
  if (!await waitForServer()) throw new Error(`server never came up on ${base}`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // The consent banner correctly takes focus on first load, so dismiss it once up
  // front. Otherwise the first Tab lands inside the banner and this harness would be
  // measuring the banner rather than the page.
  await page.goto(base, { waitUntil: "networkidle" });
  await page.click("#consentReject");
  await page.waitForTimeout(200);

  for (const lang of ["en", "ar", "ja", "de", "ru"]) {
    // Switch language the way a reader does. The cookie beats localStorage and is
    // rewritten on every load, so poking storage directly would be a no-op.
    await page.goto(base, { waitUntil: "networkidle" });
    await page.click("#langButton");
    await page.click(`#langList button[data-lang="${lang}"]`);
    await page.waitForTimeout(250);
    // Reload before testing the tab order. Clicking sets Chromium's sequential focus
    // navigation starting point, so a Tab after a click continues from the thing that
    // was clicked -- which is NOT what a reader who has just loaded the page gets. The
    // language survives in the cookie, and so does the dismissed consent banner.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(200);

    console.log(`\n[${lang}]`);

    // 1. The skip link exists, is FIRST in the tab order, and is localized.
    const skip = page.locator(".skip-link");
    if (await skip.count() !== 1) { fail.push(`${lang}: no skip link`); continue; }
    const skipText = (await skip.textContent()).trim();
    note(`skip link: "${skipText}"`);
    if (lang !== "en" && skipText === "Skip to content")
      fail.push(`${lang}: skip link is still English`);

    await page.keyboard.press("Tab");
    const focusedClass = await page.evaluate(() => document.activeElement?.className || "");
    if (!String(focusedClass).includes("skip-link"))
      fail.push(`${lang}: first Tab does not reach the skip link (got "${focusedClass}")`);

    // 2. It becomes VISIBLE on focus (an invisible skip link abandons sighted keyboard users).
    // The link transitions in (transition:top .15s), so measuring in the same frame reads
    // the START of the animation. Wait for it to settle; the assertion below is unchanged.
    await page.waitForTimeout(400);
    const box = await page.evaluate(() =>
      document.querySelector(".skip-link").getBoundingClientRect().toJSON());
    const inView = box && box.y >= 0 && box.y < 200;
    note(`focused skip link at y=${box ? Math.round(box.y) : "none"} (${inView ? "visible" : "OFF-SCREEN"})`);
    if (!inView) fail.push(`${lang}: focused skip link is not on screen`);

    // 3. Activating it moves focus to the visible <main> WITHOUT navigating.
    const hashBefore = await page.evaluate(() => location.hash);
    await page.keyboard.press("Enter");
    const after = await page.evaluate(() => ({
      hash: location.hash,
      id: document.activeElement?.id || "",
      tag: document.activeElement?.tagName || "",
    }));
    note(`after Enter: focus=<${after.tag} id="${after.id}"> hash="${after.hash}"`);
    if (after.tag !== "MAIN") fail.push(`${lang}: skip link did not move focus into <main>`);
    if (after.hash !== hashBefore) fail.push(`${lang}: skip link changed the route`);

    // 3b. And it works on a DOC page too, without throwing the reader back to home.
    await page.goto(`${base}/#/docs/privacy`, { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector(".skip-link").click());
    const onDoc = await page.evaluate(() => ({
      hash: location.hash,
      id: document.activeElement?.id || "",
    }));
    note(`on a doc page: focus=#${onDoc.id} hash="${onDoc.hash}"`);
    if (onDoc.hash !== "#/docs/privacy")
      fail.push(`${lang}: skip link navigated away from the doc page`);
    if (onDoc.id !== "docView")
      fail.push(`${lang}: skip link did not focus the doc content (got "${onDoc.id}")`);
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(200);

    // 4. Footer rights line is localized.
    const rights = (await page.locator(".foot-brand p").textContent()).trim();
    note(`footer: "${rights}"`);
    if (lang !== "en" && rights.includes("All Rights Reserved"))
      fail.push(`${lang}: footer rights line is still English`);

    // 5. Nav CTA "one-time" is localized.
    const cta = (await page.locator(".nav-cta small").textContent()).trim();
    note(`nav CTA: "${cta}"`);
    if (lang !== "en" && /one-time/i.test(cta))
      fail.push(`${lang}: nav CTA still says "one-time" in English`);

    // 6. Language menu semantics.
    const menu = await page.evaluate(() => {
      const btn = document.getElementById("langButton");
      const list = document.getElementById("langList");
      const items = [...list.querySelectorAll("button")];
      return {
        expanded: btn.getAttribute("aria-expanded"),
        controls: btn.getAttribute("aria-controls"),
        listRole: list.getAttribute("role"),
        roles: [...new Set(items.map((b) => b.getAttribute("role")))],
        checked: items.filter((b) => b.getAttribute("aria-checked") === "true")
                      .map((b) => b.dataset.lang),
        count: items.length,
      };
    });
    note(`lang menu: role=${menu.listRole} items=${menu.count} childRoles=${JSON.stringify(menu.roles)} checked=${JSON.stringify(menu.checked)} controls=${menu.controls}`);
    if (menu.listRole !== "menu") fail.push(`${lang}: lang list is not role=menu`);
    if (menu.controls !== "langList") fail.push(`${lang}: lang button has no aria-controls`);
    if (menu.roles.length !== 1 || menu.roles[0] !== "menuitemradio")
      fail.push(`${lang}: menu children are not menuitemradio (${JSON.stringify(menu.roles)})`);
    if (menu.checked.length !== 1 || menu.checked[0] !== lang)
      fail.push(`${lang}: exactly one item must be aria-checked, and it must be ${lang} (got ${JSON.stringify(menu.checked)})`);

    // 7. The title and direction still track the locale.
    const meta = await page.evaluate(() => ({
      title: document.title,
      dir: getComputedStyle(document.documentElement).direction,
      lang: document.documentElement.lang,
    }));
    note(`title="${meta.title}" lang=${meta.lang} dir=${meta.dir}`);
    if (meta.lang !== lang) fail.push(`${lang}: <html lang> is ${meta.lang}`);
    if (lang === "ar" && meta.dir !== "rtl") fail.push("ar: direction is not rtl");
    if (lang !== "en" && meta.title.startsWith("BugIt | QA Bug-Filing Agent"))
      fail.push(`${lang}: <title> is still the English default`);

    // 8. Arabic typography, measured on the rendered page.
    //
    // Arabic is cursive: the letters of a word are JOINED, so letter-spacing pulls those
    // joins apart and the word stops reading as a word. Twenty rules in this sheet set a
    // non-zero value, including -.035em on section headings, and only four of them had
    // ever been switched off for RTL. And the headline was set at 102px in a 470px
    // column, which Latin survives because its words are short: Arabic came out one word
    // per line, eight lines, 1063px of heading in a 620px slot.
    //
    // Read from the real cascade, because the first attempt at the tracking fix was
    // written correctly and lost on specificity -- which grepping the stylesheet would
    // have called a pass.
    if (lang === "ar") {
      const type = await page.evaluate(() => {
        const read = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return { sel, ls: cs.letterSpacing, fs: parseFloat(cs.fontSize),
                   lh: parseFloat(cs.lineHeight), h: Math.round(r.height) };
        };
        const tracked = [...document.querySelectorAll("h1,h2,h3,h4,p,span,a,b,strong,small,li")]
          .filter((el) => {
            if (el.closest("bdi,code,kbd,pre,.mono")) return false;   // Latin runs may track
            const ls = getComputedStyle(el).letterSpacing;
            return ls !== "normal" && Math.abs(parseFloat(ls)) > 0.01;
          })
          .map((el) => `${el.tagName.toLowerCase()}.${el.className.toString().split(" ")[0]}`);
        return { title: read(".hero-title"), tracked: [...new Set(tracked)] };
      });
      if (type.tracked.length)
        fail.push(`ar: ${type.tracked.length} element(s) still letter-spaced, which breaks Arabic joining: ${type.tracked.slice(0, 6).join(", ")}`);
      if (type.title) {
        note(`hero title: ${type.title.fs}px lh=${type.title.lh}px box height=${type.title.h}px`);
        if (type.title.fs > 80)
          fail.push(`ar: hero title is ${type.title.fs}px; at that size one Arabic word fills the column`);
        if (type.title.h > 520)
          fail.push(`ar: hero title occupies ${type.title.h}px, far more than the other locales`);
      }
    }
  }

  if (errors.length) fail.push("page errors: " + errors.join(" | "));
  await browser.close();
} finally {
  server.kill();
}

console.log("");
if (fail.length) {
  console.error("FAILED:\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log("All checks passed.");
