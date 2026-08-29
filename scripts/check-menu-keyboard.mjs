// A DECLARED MENU IS A PROMISE ABOUT THE KEYBOARD. THIS DRIVES THE KEYBOARD.
//
// WHY THIS EXISTS. External audit 2026-08-21, F-06: "Both live language menus declare menu
// semantics but ignore keyboard controls." `role="menu"` with `menuitemradio` rows,
// `aria-haspopup` and `aria-expanded` is not decoration. It tells a screen reader, and every
// keyboard-only visitor, that Enter or Space opens, the arrows walk the rows, Home and End jump
// to the ends, a letter jumps to a name, Escape closes and hands focus back, and Tab leaves. A
// buyer who cannot open the language menu cannot reach localized sign-in, pricing or docs.
//
// WHY IT IS A SEPARATE FILE FROM THE ONE THAT ALREADY "CHECKS THE MENU". check-chrome.mjs has a
// keyboard block, and it passed the whole time the defects below were live, for two reasons that
// are worth writing down because they are the shape of this repo's recurring failure:
//
//   1. IT SYNTHESISES ITS OWN KEY EVENTS. `dispatchEvent(new KeyboardEvent("keydown", ...))`
//      never asks the BROWSER what a key does. A real <button> turns Enter into a click on
//      keydown and Space into a click on KEYUP, and WebKit puts focus back on the button after
//      that keyup -- so Space opened the menu and left focus outside it, in Safari only. A
//      synthetic keydown cannot produce that, so it cannot see it. This file presses keys
//      through the browser's own input pipeline (`page.keyboard`), which is what a person has.
//   2. IT NAMES ITS SUBJECT. It reads `#langButton`. The header carries a SECOND declared menu
//      -- the account menu, which every signed-in customer uses -- and it had no keyboard
//      behaviour at all: Enter opened it and left focus on the button, the arrows did nothing.
//      Nothing was looking at it, because nothing had been told to. This file derives its
//      subject from the page: every element that declares `role="menu"`, whatever it is called.
//
// A menu that is declared but cannot be exercised is a FAILURE, not a skip: the account menu is
// only rendered for a signed-in reader, so the session-status response is stubbed here, exactly
// as the site's own `initAuth` consumes it. If a future menu appears with no reachable opener,
// this stops the build rather than quietly measuring one menu instead of two.
//
// Both engines, for the reason in scripts/check-disclosure.mjs: the Safari-only defects on this
// surface were invisible to forty Chromium guards.
//
// Run: `node scripts/check-menu-keyboard.mjs` (or `npm run test:menu-keyboard`).
// Needs both engines: `npx playwright install chromium webkit`.
import { chromium, webkit } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];

/* ---------- the harness -------------------------------------------------- */
const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
});
let serverExit = null;
server.on("exit", (c, s) => { serverExit = s || `code ${c}`; });
const base = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60 && !serverExit; i++) {
  try { const r = await fetch(base + "/"); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 120));
}
if (serverExit) {
  console.error(`check-menu-keyboard: the dev server exited (${serverExit}) before a page was rendered.`);
  process.exit(1);
}
const done = () => {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try { spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  }
};

/* ---------- what the page says about itself ------------------------------ */
// Every declared menu, and the control that claims to open it. Nothing here is a selector this
// file invented: the roles and the aria-controls wiring are the page's own declarations.
const MENUS = () => {
  const idOf = (el) => el.id || null;
  return [...document.querySelectorAll('[role="menu"]')].map((list) => {
    const id = idOf(list);
    const opener =
      (id && document.querySelector(`[aria-controls="${CSS.escape(id)}"]`)) ||
      list.parentElement?.querySelector("[aria-haspopup]") ||
      null;
    const visible = (el) => !!el && (el.offsetParent !== null || getComputedStyle(el).position === "fixed");
    return {
      listId: id,
      listSel: id ? "#" + CSS.escape(id) : null,
      openerSel: opener?.id ? "#" + CSS.escape(opener.id) : null,
      openerLabel: (opener?.getAttribute("aria-label") || opener?.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34),
      hasOpener: !!opener,
      openerVisible: visible(opener),
      items: list.querySelectorAll('[role^="menuitem"]').length,
    };
  });
};

// The state of one menu, read the way a reader meets it. `active` is an INDEX into the menu's
// own rows, so "did the arrow key move" is answered without this file knowing any row's name.
const STATE = ([listSel, openerSel]) => {
  const list = document.querySelector(listSel);
  const btn = document.querySelector(openerSel);
  const items = [...list.querySelectorAll('[role^="menuitem"]')];
  const a = document.activeElement;
  const label = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  return {
    expanded: btn.getAttribute("aria-expanded"),
    count: items.length,
    active: items.indexOf(a),
    activeLabel: label(a),
    activeTag: (a?.getAttribute?.("lang") || a?.getAttribute?.("data-lang") || "").toLowerCase(),
    onButton: a === btn,
    tabbable: items.filter((b) => b.tabIndex === 0).length,
  };
};

/* ---------- measure ------------------------------------------------------ */
const VIEWS = [
  { engine: "chromium", type: chromium },
  { engine: "webkit", type: webkit },
];

let measured = 0;
const seen = new Set();

for (const view of VIEWS) {
  let browser;
  try {
    browser = await view.type.launch();
  } catch (e) {
    // NOT a skip. A guard that quietly stops running reads as coverage for as long as nobody
    // looks, and both defects this file was written for were engine-specific.
    fail.push(`${view.engine} could not be launched, so the contract was never checked in it: ` +
              `${String(e).split("\n")[0]}. Run \`npx playwright install ${view.engine}\`.`);
    continue;
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // The account menu exists only for a signed-in reader. `initAuth` asks the portal and renders
  // the menu when the answer is `authenticated`, so answer it -- this is the site's own path,
  // not a shortcut around it.
  // `initAuth` sends this cross-origin with `credentials: "include"`, and a credentialed
  // response may not answer `access-control-allow-origin: *` -- it has to name the origin and
  // allow credentials, or the browser discards a 200 that looks perfectly fine in the network
  // panel and the site renders itself signed out. Answering it the way the portal does is the
  // difference between exercising the account menu and never seeing it.
  await ctx.route("**/api/session-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": base,
        "access-control-allow-credentials": "true",
      },
      body: JSON.stringify({ authenticated: true, name: "Keyboard Probe" }),
    }),
  );

  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  try { await page.click("#consentReject", { timeout: 2500 }); } catch {}
  await page.waitForTimeout(900);

  const menus = await page.evaluate(MENUS);
  const where = view.engine;

  if (!menus.length) {
    fail.push(`[${where}] nothing on the page declares role="menu": the sweep did not run, and ` +
              `an empty sweep must never read as a clean one.`);
    await browser.close();
    continue;
  }

  for (const m of menus) {
    const name = `${m.openerLabel || m.listId || "(unnamed)"}`;
    const K = `[${where}] the "${name}" menu`;
    if (!m.listSel) {
      fail.push(`${K} has no id, so nothing can point aria-controls at it and this guard cannot address it.`);
      continue;
    }
    if (!m.hasOpener) {
      fail.push(`${K} declares role="menu" but no control points aria-controls at it: it announces itself as a popup nothing opens.`);
      continue;
    }
    if (!m.openerVisible) {
      // A declared menu whose opener never renders cannot be operated by anyone. Failing here
      // is the point: the alternative is a sweep that silently measures one menu and reports
      // the site clean.
      fail.push(`${K} declares role="menu" but its opener (${m.openerSel}) is not on the page, so the ` +
                `keyboard contract could not be exercised at all.`);
      continue;
    }
    if (!m.items) {
      fail.push(`${K} declares role="menu" with no menuitem rows inside it.`);
      continue;
    }
    seen.add(m.listId);

    const list = m.listSel, btn = m.openerSel;
    const state = () => page.evaluate(STATE, [list, btn]);

    const s0 = await state();
    if (s0.expanded !== "false") {
      fail.push(`${K} starts at aria-expanded="${s0.expanded}" on a fresh page.`);
      continue;
    }

    /* 1. IT MUST BE REACHABLE WITHOUT A POINTER AT ALL. Everything below is worthless if the
          only way to put focus on the opener is to click it. */
    await page.evaluate(() => document.activeElement?.blur?.());
    let tabs = 0, reached = false;
    // THE TRAIL IS RECORDED WHILE WALKING, not reconstructed afterwards. This assertion failed on
    // Linux WebKit in CI for six days and passed on Windows WebKit on the machine where it was
    // being read, and all it ever said was that 80 stops were not enough. "Not reachable" has at
    // least four causes -- the control is not in the sequential order, focus is trapped, focus
    // left the document, or the page really is that deep -- and they are told apart by where the
    // focus actually went, which nothing was keeping.
    const trail = [];
    for (; tabs < 80; tabs++) {
      await page.keyboard.press("Tab");
      const here = await page.evaluate((b) => {
        const a = document.activeElement;
        const name = (el) => !el ? "(none)"
          : (el === document.body ? "body"
            : el.tagName.toLowerCase() + (el.id ? "#" + el.id : "")
              + (el.className && typeof el.className === "string"
                 ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""));
        return { at: name(a), hit: a === document.querySelector(b) };
      }, btn);
      trail.push(here.at);
      if (here.hit) { reached = true; break; }
    }
    if (!reached) {
      // What the browser thinks of the control itself, asked once, at the moment it was missed.
      const why = await page.evaluate((b) => {
        const el = document.querySelector(b);
        if (!el) return { missing: true };
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        let hidden = null, inert = null;
        for (let n = el; n; n = n.parentElement) {
          if (!hidden && n.getAttribute && n.getAttribute("aria-hidden") === "true") hidden = n.tagName.toLowerCase() + (n.id ? "#" + n.id : "");
          if (!inert && n.hasAttribute && n.hasAttribute("inert")) inert = n.tagName.toLowerCase() + (n.id ? "#" + n.id : "");
        }
        return {
          tabindex: el.getAttribute("tabindex"), disabled: !!el.disabled,
          display: cs.display, visibility: cs.visibility, pointerEvents: cs.pointerEvents,
          rect: `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.x)},${Math.round(r.y)}`,
          offsetParent: el.offsetParent ? "yes" : "null",
          ariaHiddenAncestor: hidden, inertAncestor: inert,
          focusables: document.querySelectorAll(
            'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])').length,
        };
      }, btn);
      // Repeats are what a focus trap or an exhausted order looks like, so the trail is printed
      // as runs rather than as eighty lines.
      const runs = [];
      for (const step of trail) {
        const last = runs[runs.length - 1];
        if (last && last.at === step) last.n += 1; else runs.push({ at: step, n: 1 });
      }
      fail.push(
        `${K} is not reachable by Tab within 80 stops, so its keyboard contract is unreachable too.\n` +
        `      the control: ${JSON.stringify(why)}\n` +
        `      where Tab went: ${runs.slice(0, 14).map((r) => r.n > 1 ? `${r.at} x${r.n}` : r.at).join(" -> ")}` +
        (runs.length > 14 ? ` -> ... ${runs.length - 14} more distinct stop(s)` : ""),
      );
    }
    await page.evaluate((b) => document.querySelector(b).focus(), btn);

    /* 2. ENTER OPENS, AND FOCUS GOES INTO THE MENU. */
    await page.keyboard.press("Enter");
    await page.waitForTimeout(220);
    let s = await state();
    if (s.expanded !== "true") fail.push(`${K} does not open on Enter: aria-expanded stayed "${s.expanded}".`);
    if (s.active < 0) fail.push(`${K} opened on Enter but left focus outside its rows (${s.onButton ? "on the button" : "nowhere in the menu"}), so every key below is delivered to something that is not the menu.`);
    if (s.tabbable !== 1) fail.push(`${K} puts ${s.tabbable} rows in the tab order, expected exactly 1 (roving tabindex).`);

    if (s.active >= 0) {
      /* 3. THE ARROWS WALK, HOME AND END JUMP, AND ARROWUP WRAPS. */
      const before = s.active;
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(120);
      let t = await state();
      if (t.active === before) fail.push(`${K} declares role="menu" but ArrowDown leaves row ${before} active.`);
      await page.keyboard.press("End");
      await page.waitForTimeout(120);
      t = await state();
      if (t.active !== t.count - 1) fail.push(`${K} does not answer End (row ${t.active} of ${t.count} is active).`);
      await page.keyboard.press("Home");
      await page.waitForTimeout(120);
      t = await state();
      if (t.active !== 0) fail.push(`${K} does not answer Home (row ${t.active} of ${t.count} is active).`);
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(120);
      t = await state();
      if (t.active !== t.count - 1) fail.push(`${K} does not wrap: ArrowUp from the first row went to row ${t.active}, expected the last (${t.count - 1}).`);
      await page.keyboard.press("Home");
      await page.waitForTimeout(120);

      /* 4. A LETTER JUMPS TO A NAME. The character is chosen from the rows themselves: one that
            some OTHER row answers to and the row in hand does not, so a handler that does
            nothing cannot pass. If no such character exists the guard says so rather than
            skipping quietly. */
      const pick = await page.evaluate(([l]) => {
        const items = [...document.querySelector(l).querySelectorAll('[role^="menuitem"]')];
        const keys = (el) => {
          const out = [(el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase()];
          const tag = (el.getAttribute("lang") || el.getAttribute("data-lang") || "").toLowerCase();
          if (tag) out.push(tag);
          return out.filter(Boolean);
        };
        const active = document.activeElement;
        const mine = keys(active).map((k) => k[0]);
        for (const el of items) {
          if (el === active) continue;
          for (const k of keys(el)) {
            const c = k[0];
            if (!/^[a-z]$/.test(c)) continue;
            if (mine.includes(c)) continue;
            return { char: c, label: (el.textContent || "").replace(/\s+/g, " ").trim() };
          }
        }
        return null;
      }, [list]);
      if (!pick) {
        fail.push(`${K}: no row offers a Latin first letter that the row in hand does not, so type-ahead could not be probed here. That is a hole in this guard, not a pass.`);
      } else {
        await page.keyboard.type(pick.char);
        await page.waitForTimeout(200);
        t = await state();
        const hit = t.activeLabel.toLowerCase().startsWith(pick.char) || t.activeTag.startsWith(pick.char);
        if (!hit) {
          fail.push(`${K} does not answer type-ahead: pressing "${pick.char}" (which "${pick.label}" answers to) left ` +
                    `"${t.activeLabel || "nothing"}" active. A menu that names eleven languages and cannot be searched by ` +
                    `letter makes a reader arrow past every one of them.`);
        }
      }
    }

    /* 5. ESCAPE CLOSES AND HANDS FOCUS BACK. */
    await page.keyboard.press("Escape");
    await page.waitForTimeout(220);
    s = await state();
    if (s.expanded !== "false") fail.push(`${K} does not close on Escape: aria-expanded is still "${s.expanded}".`);
    if (!s.onButton) fail.push(`${K} closes on Escape but drops focus (now on "${s.activeLabel || "nothing"}") instead of returning it to the button.`);

    /* 6. SPACE OPENS TOO, AND ALSO LEAVES FOCUS INSIDE. This is the one a synthetic keydown can
          never see: Space becomes a click on KEYUP, and WebKit refocuses the button afterwards. */
    await page.evaluate((b) => document.querySelector(b).focus(), btn);
    await page.keyboard.press("Space");
    await page.waitForTimeout(260);
    s = await state();
    if (s.expanded !== "true") fail.push(`${K} does not open on Space: aria-expanded stayed "${s.expanded}".`);
    else if (s.active < 0) fail.push(`${K} opens on Space but leaves focus ${s.onButton ? "on the button" : "outside its rows"}, so the arrows that follow go nowhere.`);

    /* 7. TAB LEAVES, AND THE MENU DOES NOT STAY OPEN BEHIND IT. An open menu under a button
          reporting itself collapsed is a lie told to anyone who cannot see the screen -- and an
          open menu the reader has walked out of is the same lie the other way round. */
    await page.keyboard.press("Tab");
    await page.waitForTimeout(240);
    s = await state();
    if (s.expanded !== "false") fail.push(`${K} stays open (aria-expanded="${s.expanded}") after Tab has taken the reader out of it.`);

    // Leave the page in a known state for the next menu.
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(120);
    measured++;
  }

  await browser.close();
}

console.log(`  ${measured} declared menu(s) driven by keyboard across ${VIEWS.length} engine(s): ${[...seen].join(", ") || "none"}`);
// An empty sweep must fail. Two engines times the menus the page declares; anything less means
// a menu, or an engine, silently dropped out.
if (measured < 2 * seen.size || !seen.size) {
  fail.push(`only ${measured} menu/engine pair(s) were exercised for ${seen.size} declared menu(s) across ${VIEWS.length} engines: too few to mean anything.`);
}

done();
if (fail.length) {
  for (const f of fail) console.error("FAIL: " + f);
  console.error(`\ncheck-menu-keyboard: ${fail.length} finding(s).`);
  process.exit(1);
}
console.log("check-menu-keyboard OK: every declared menu opens on Enter and Space, walks with the arrows, answers Home, End and a letter, and closes on Escape and Tab — in WebKit and in Chromium.");
