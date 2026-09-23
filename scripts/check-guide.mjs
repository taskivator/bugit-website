// THE GUIDE, IN A REAL BROWSER, WITH ITS NETWORK WATCHED.
//
// The claim this site now makes to every visitor, in eleven languages and in its privacy policy, is
// that the Guide answers from prepared text inside their browser and sends their question nowhere.
// A unit test cannot check that claim: only the browser knows what was actually requested. So this
// opens the page, asks questions, and FAILS if any request leaves this origin.
//
// It also holds the two behaviours that make a no-model Guide honest: a question it knows is
// answered word for word, and a question it does not know is never answered, it offers a person.
//
// Run: node scripts/check-guide.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bank = JSON.parse(readFileSync(path.join(ROOT, "public/guide/prepared/en.json"), "utf8"));
const entry = bank.items.find((i) => i.kind === "entry");
const refund = bank.items.find((i) => i.id === "intent:refund-request");
// The German half below asks in German, so it asks with the GERMAN bank's own wording. A sentence
// invented here scored 0.56 against a threshold of 0.8 and was offered a list of questions instead
// of an answer, which is the matcher behaving correctly and the test being wrong.
const de = JSON.parse(readFileSync(path.join(ROOT, "public/guide/prepared/de.json"), "utf8"));
const deRefund = de.items.find((i) => i.id === "intent:refund-request");

const PORT = await new Promise((res, rej) => {
  const p = net.createServer();
  p.on("error", rej);
  p.listen(0, "127.0.0.1", () => {
    const { port } = p.address();
    p.close(() => res(port));
  });
});
const server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}/`;
await new Promise((r) => setTimeout(r, 900));

const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures.push(`${name}${detail ? ` -- ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
  }
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const offsite = [];
  const asked = [];
  const carried = [];   // requests that took part of the conversation with them, anywhere
  const spoke = [];     // requests that were not a plain GET with no body
  const typed = [];     // everything typed into the composer, so the watcher knows what to look for
  // WHAT a request carries, not just where it goes. A question put in a header on the bank fetch
  // leaves the browser exactly as surely as a request to another host, and this guard used to
  // decide by hostname alone: a planted header shipped every conversation and nothing failed.
  const readsAll = (r) => {
    const url = r.url();
    const method = r.method();
    const post = r.postData() || "";
    if (method !== "GET" || post) spoke.push(`${method} ${url}${post ? " body=" + post.slice(0, 60) : ""}`);
    let head = "";
    try { head = JSON.stringify(r.headers()); } catch (_) { head = ""; }
    const hay = decodeURIComponent(`${url} ${head} ${post}`).toLowerCase();
    for (const q of typed) {
      const needle = q.toLowerCase().slice(0, 24);
      if (needle.length > 8 && hay.includes(needle)) carried.push(`${needle} -> ${url.slice(0, 80)}`);
    }
  };
  const ask = async (question) => {
    typed.push(question);
    await page.fill("#bgd-input", question);
    await page.click(".bgd-send");
  };
  page.on("request", (r) => {
    readsAll(r);
    const url = r.url();
    if (url.startsWith(base) || url.startsWith("data:") || url.startsWith("blob:")) {
      if (url.includes("/public/guide/")) asked.push(url.slice(base.length - 1));
      return;
    }
    // The site's own account menu asks the Portal whether this visitor is signed in (app.js,
    // initAuth). It is there on every page with or without the Guide, and it is the ONLY offsite
    // request this site makes without consent. Anything else here is the Guide reaching out.
    if (url === "https://portal.bugit.dev/api/session-status") return;
    offsite.push(url);
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(base, { waitUntil: "networkidle" });
  check("the Guide downloads nothing before it is opened", !asked.some((u) => u.includes("prepared/")), asked.join(", "));
  // The launcher deliberately hides while the consent banner is up (guide.css), so a first visitor
  // is never asked two things at once. This check is about the Guide, not about consent.
  check("the launcher waits for the consent banner", !(await page.isVisible(".bgd-launch")));
  await page.evaluate(() => document.getElementById("consentBanner")?.remove());

  await page.click(".bgd-launch");
  await ask(entry.question);
  await page.waitForSelector(".bgd-answer p", { timeout: 15000 });
  const answered = await page.textContent(".bgd-bot .bgd-answer");
  const first = entry.answer.split("\n")[0].replace(/[*`]/g, "").slice(0, 40);
  check("a question the bank knows is answered word for word", answered.includes(first), `wanted "${first}"`);
  check("the answers were downloaded only when the Guide was used", asked.some((u) => u.includes("prepared/en.json")));

  await page.click(".bgd-head .bgd-icon");   // new conversation
  await ask("how many cats live in Tokyo");
  await page.waitForSelector(".bgd-bot .bgd-answer p", { timeout: 15000 });
  const unknown = await page.textContent(".bgd-bot .bgd-answer");
  check("a question it does not know is not answered", /don't have a confirmed answer|not sure which of these/i.test(unknown), unknown.slice(0, 80));

  await page.click(".bgd-head .bgd-icon");
  await ask(refund.question);
  await page.waitForSelector(".bgd-hand a.bgd-mail", { timeout: 15000 });
  const href = await page.getAttribute(".bgd-hand a.bgd-mail", "href");
  check("a refund goes to a person, by email", href.startsWith("mailto:support@bugit.dev?subject="), href.slice(0, 60));
  check("the visitor's own question is in that email", decodeURIComponent(href).includes(refund.question.slice(0, 30)));

  // EVERY CONTROL, because a leak hides in the one that is never pressed. A review put a beacon in
  // the feedback button and a pixel in closePanel, and this guard passed without touching either.
  // A missing control FAILS here: pressing what happens to be on screen is how four of these six
  // went untouched for a whole review round while this file said "EVERY CONTROL". `force` because
  // these are small buttons whose own label sits over them, and this is a network check, not a
  // hit-area check.
  const press = async (selector) => {
    const el = page.locator(selector).first();
    const there = await el.count();
    check(`the control is on screen to be pressed: ${selector}`, there > 0);
    if (there) await el.click({ force: true });
  };
  // Back to an ANSWERED turn, which is the only turn that has feedback buttons, a trail and
  // related questions. The hand-off above has none of them.
  await page.click(".bgd-head .bgd-icon");
  await ask(entry.question);
  await page.waitForSelector(".bgd-meta .bgd-tools .bgd-icon", { timeout: 15000 });
  await press(".bgd-meta .bgd-tools .bgd-icon:nth-child(1)");               // copy
  await press(".bgd-meta .bgd-tools .bgd-icon:nth-child(2)");               // useful
  await press(".bgd-meta .bgd-tools .bgd-icon:nth-child(3)");               // not useful
  await press(".bgd-trail summary");                                        // the disclosure
  await press(".bgd-follow");                                               // a related question
  await page.waitForSelector(".bgd-bot:nth-of-type(2), .bgd-me", { timeout: 15000 });
  await page.waitForTimeout(400);
  await press(".bgd-human");                                                // talk to a person
  await page.waitForSelector(".bgd-hand a.bgd-mail", { timeout: 15000 });
  await press(".bgd-expand");                                               // widen
  await press(".bgd-expand");
  await page.keyboard.press("Escape");                                      // close
  await press(".bgd-launch");                                               // and open again
  await page.reload({ waitUntil: "networkidle" });                         // restored from the tab
  await page.evaluate(() => document.getElementById("consentBanner")?.remove());
  await page.keyboard.press("/");
  check("the conversation survives a reload", (await page.$$(".bgd-bot")).length > 0);

  // The claim itself, in its three parts: nothing went to another host, nothing carried the
  // conversation anywhere at all, and nothing spoke rather than read.
  check("NOTHING left this origin but the site's own account check", offsite.length === 0, offsite.slice(0, 4).join(", "));
  check("no request carried any part of the conversation", carried.length === 0, carried.slice(0, 3).join(", "));
  check("every request was a plain GET with no body", spoke.length === 0, spoke.slice(0, 3).join(", "));

  // NEGATIVE CONTROL for the watcher above: it has to be able to see a request leave. Without this,
  // a watcher that never fires and a page that never leaks look exactly the same.
  await page.evaluate(() => { new Image().src = "https://control.invalid/proof"; });
  await page.waitForTimeout(300);
  check("the watcher can actually see a request leave", offsite.some((u) => u.includes("control.invalid")), offsite.join(", "));
  offsite.length = 0;

  // AND THAT IT CAN SEE A SAME-ORIGIN ONE CARRY THE CONVERSATION. This is the shape the review
  // planted: a header on a request to this site's own files, which every check above passed.
  await page.evaluate(() => fetch("/public/guide/sources.json", { headers: { "x-proof": "how many cats live in Tokyo" } }).catch(() => {}));
  await page.evaluate(() => fetch("/public/guide/sources.json", { method: "POST", body: "proof" }).catch(() => {}));
  await page.waitForTimeout(400);
  check("the watcher can see the conversation ride along on a same-origin request", carried.length > 0);
  check("the watcher can see a request that speaks rather than reads", spoke.length > 0);
  carried.length = 0;
  spoke.length = 0;

  // C1: the launcher hides while the banner is up, but the PANEL had two ways past it, the "/"
  // shortcut and a saved open state after a reload. A first visitor was asked two things at once.
  const fresh = await ctx.newPage();
  await fresh.goto(base, { waitUntil: "networkidle" });
  await fresh.keyboard.press("/");
  check("the shortcut cannot open the Guide over the consent banner", !(await fresh.isVisible(".bgd-panel")));
  await fresh.evaluate(() => sessionStorage.setItem("bugitGuide.v1", JSON.stringify({ open: true, wide: false, turns: [] })));
  await fresh.reload({ waitUntil: "networkidle" });
  check("a saved open state does not reopen it over the banner", !(await fresh.isVisible(".bgd-panel")));
  // PRESSING THE HERO BAR WHILE THE BANNER IS UP MUST SHOW THE VISITOR SOMETHING. The Guide
  // refuses to open, app.js honours the refusal by focusing "Accept all", and until 2026-09-22
  // that was the whole of it: this banner is fixed to the bottom of the viewport, so the
  // scrollIntoView beside that focus call moves nothing, and a focus ring at the far edge of the
  // screen is not an answer to pressing the largest control on the page. Every Google Ads click
  // is a first visit, so this is the state most visitors meet the Ask bar in.
  const bannerBox = async () => fresh.evaluate(() => {
    const r = document.getElementById("consentBanner").getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(",");
  });
  const boxBefore = await bannerBox();
  await fresh.click("#askBar");
  await fresh.waitForTimeout(200);
  const pointed = await fresh.evaluate(() => {
    const b = document.getElementById("consentBanner");
    return { marked: b.classList.contains("is-pointed"), outline: getComputedStyle(b).outlineStyle,
             focused: document.activeElement?.id, panelHidden: document.querySelector(".bgd-panel").hidden };
  });
  check("pressing the Ask bar over the banner marks the banner", pointed.marked);
  check("and the mark is a visible outline", pointed.outline === "solid", pointed.outline);
  check("and focus still goes to the choice that is blocking", pointed.focused === "consentAccept", String(pointed.focused));
  check("and the Guide still refuses to open over it", pointed.panelHidden === true);
  // An outline and not a border, so the fifteen viewports check-notice-fits renders are unchanged.
  check("and the banner does not move or resize", (await bannerBox()) === boxBefore, `${boxBefore} -> ${await bannerBox()}`);

  await fresh.evaluate(() => document.getElementById("consentBanner")?.remove());
  await fresh.click(".bgd-launch");
  check("and it opens normally once the banner is gone", await fresh.isVisible(".bgd-panel"));
  await fresh.close();

  // German, to prove the language rule and a second bank.
  await page.click(".bgd-head .bgd-icon");
  await ask("Wie viel kostet BugIt und wie kann ich es kaufen?");
  await page.waitForSelector(".bgd-bot .bgd-answer p", { timeout: 15000 });
  const german = await page.textContent(".bgd-bot .bgd-answer");
  check("a German question is answered in German", /[äöüß]|BugIt kostet|Lizenz/i.test(german), german.slice(0, 80));

  // A German answer inside an English card was the split the owner's language rule exists to prevent.
  await ask(deRefund.question);
  await page.waitForSelector(".bgd-hand a.bgd-mail", { timeout: 15000 });
  const card = await page.textContent(".bgd-hand");
  check("the card around a German answer is German too", /[äöüß]|Support|E-Mail/.test(card) && !card.includes("Email support"), card.slice(0, 80));

  // "Talk to a person" after a German answer. The card it builds is a different code path from the
  // automatic hand-off above, and it took the SITE's language: a German answer with an English card
  // under it was the exact split the owner's language rule exists to prevent.
  await page.click(".bgd-head .bgd-icon");
  await ask("Wie viel kostet BugIt und wie kann ich es kaufen?");
  await page.waitForSelector(".bgd-bot .bgd-answer p", { timeout: 15000 });
  const answerLang = await page.getAttribute(".bgd-bot .bgd-answer", "lang");
  check("the answer itself is marked as the language it is written in", answerLang === "de", String(answerLang));
  await page.click(".bgd-human");
  await page.waitForSelector(".bgd-hand a.bgd-mail", { timeout: 15000 });
  const manual = await page.textContent(".bgd-hand");
  check("asking for a person after a German answer gives a German card", /[äöüß]|Support|E-Mail/.test(manual) && !manual.includes("Email support"), manual.slice(0, 80));

  // HALF AN EMOJI. encodeURIComponent throws on one half of a surrogate pair, and the hand-off used
  // to cut the question at a fixed length, which can land between the two: the visitor was left
  // with no email link at all, which is the only route to a person this build has.
  await page.click(".bgd-head .bgd-icon");
  await page.evaluate(() => {
    const el = document.getElementById("bgd-input");
    el.value = "Refund please " + String.fromCharCode(0xd83d);   // a lone high surrogate
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.click(".bgd-send");
  await page.waitForSelector(".bgd-bot", { timeout: 15000 });
  await page.click(".bgd-human");
  await page.waitForSelector(".bgd-hand a.bgd-mail", { timeout: 15000 });
  const half = await page.getAttribute(".bgd-hand a.bgd-mail", "href");
  check("a question holding half an emoji still produces an email link", Boolean(half && half.startsWith("mailto:")), String(half).slice(0, 40));

  // THE PASTED-SECRET WARNING, WHICH NOTHING HERE HAD EVER PRESSED. Added 2026-09-22. The net in
  // guide.js is 60 lines of regular expressions and a Luhn check, it is the only thing standing
  // between a customer pasting a token and that token going into a mailto, and no guard in this
  // repository had ever typed a secret into the composer. It was found by an audit doing it by
  // hand against the live site.
  //
  // BOTH DIRECTIONS, because a net that refuses everything is worse than no net: it would block
  // ordinary questions and the visitor would have no way to reach a person at all. The prose
  // cases below are the ones a careless pattern matches -- "Authorization: approved" is a real
  // sentence about activation, and "basic troubleshooting" is a real request.
  const composerRefuses = async (text) => {
    await page.click(".bgd-head .bgd-icon");
    typed.push(text);
    await page.fill("#bgd-input", text);
    await page.click(".bgd-send");
    await page.waitForTimeout(250);
    return page.evaluate(() => {
      const w = document.querySelector(".bgd-warn");
      return Boolean(w && !w.hidden);
    });
  };
  // Synthetic values throughout. Nothing here is or resembles a live credential.
  for (const [what, text] of [
    ["an API key", "sk-ant-api03-" + "A".repeat(24)],
    ["a password given in words", "my password is hunter22xyz"],
    ["a card number", "4111 1111 1111 1111"],
    ["credentials inside a tracker URL", "our jira is https://svcacct:hunter22xyz@jira.example.com"],
    ["an Authorization header", "Authorization: Bearer 8f3a9c2e1b7d4f6a0c5e"],
    // Assembled from two pieces, exactly like the Anthropic key five lines above, and for the
    // same reason: this repo's own committed-secret scan greps for
    // `-----BEGIN [A-Z ]*PRIVATE KEY-----` and matched THIS LINE -- a synthetic fixture in a
    // test that exists to prove the composer REFUSES such strings. CI went red on bd981cb with
    // "Potential committed secret detected" pointing at a file that contains no secret.
    // Splitting the literal keeps the string this test sends byte-identical and leaves the
    // scan at full strength; the alternative, an exemption for this path, would have carved a
    // hole in the scan to accommodate a test.
    ["a private key", "-----BEGIN " + "OPENSSH PRIVATE KEY-----"],
    // Synthetic. The two tracker tokens this net did not know until the second round of
    // 2026-09-22, both of which BugIt files to.
    ["a YouTrack permanent token", "perm:YWRtaW4=.NDItMQ==.abcdefGHIJKL1234567890mnop"],
    ["an Asana personal access token", "1/1204553456789:abcdef0123456789abcdef0123456789"],
  ]) {
    check(`the composer refuses ${what}`, await composerRefuses(text), text.slice(0, 30));
  }
  for (const [what, text] of [
    ["an ordinary question", "how do I connect BugIt to Jira Cloud?"],
    ["a tracker URL with no credentials", "our jira is at https://jira.example.com/rest/api/2"],
    ["the word authorization in a sentence", "Authorization: required before the device appears"],
    ["the word basic in a sentence", "I need basic troubleshooting steps for the tracker"],
    ["an order number and a date", "my order number is 4471 and I paid on 12/28"],
    // The two the loose YouTrack and Asana rules would have eaten. A visitor writing either of
    // these and being told their question looks like a secret is the failure this pair guards.
    ["a hyphenated phrase that begins perm-", "perm-denied-error-code-12345 keeps appearing"],
    ["a ratio that looks like an Asana id", "the ratio is 1/200000 which seems wrong"],
  ]) {
    check(`the composer accepts ${what}`, !(await composerRefuses(text)), text.slice(0, 40));
  }

  check("still nothing left this origin", offsite.length === 0, offsite.slice(0, 4).join(", "));
  check("and still nothing carried the conversation", carried.length === 0 && spoke.length === 0, carried.concat(spoke).slice(0, 3).join(", "));
  // Last, so that everything above is inside it: this used to sit mid-file and could not fail for
  // anything that came after.
  check("no script errors", errors.length === 0, errors[0] || "");
} finally {
  await browser.close();
  server.kill();
}

if (failures.length) {
  console.error(`\ncheck-guide: FAILED ${failures.length}`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("\ncheck-guide: PASS — answers come from the bank, in the browser, and nothing is sent.");
