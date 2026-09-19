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
  page.on("request", (r) => {
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
  await page.fill("#bgd-input", entry.question);
  await page.click(".bgd-send");
  await page.waitForSelector(".bgd-answer p", { timeout: 15000 });
  const answered = await page.textContent(".bgd-bot .bgd-answer");
  const first = entry.answer.split("\n")[0].replace(/[*`]/g, "").slice(0, 40);
  check("a question the bank knows is answered word for word", answered.includes(first), `wanted "${first}"`);
  check("the answers were downloaded only when the Guide was used", asked.some((u) => u.includes("prepared/en.json")));

  await page.click(".bgd-head .bgd-icon");   // new conversation
  await page.fill("#bgd-input", "how many cats live in Tokyo");
  await page.click(".bgd-send");
  await page.waitForSelector(".bgd-bot .bgd-answer p", { timeout: 15000 });
  const unknown = await page.textContent(".bgd-bot .bgd-answer");
  check("a question it does not know is not answered", /don't have a confirmed answer|not sure which of these/i.test(unknown), unknown.slice(0, 80));

  await page.click(".bgd-head .bgd-icon");
  await page.fill("#bgd-input", refund.question);
  await page.click(".bgd-send");
  await page.waitForSelector(".bgd-hand a.bgd-mail", { timeout: 15000 });
  const href = await page.getAttribute(".bgd-hand a.bgd-mail", "href");
  check("a refund goes to a person, by email", href.startsWith("mailto:support@bugit.dev?subject="), href.slice(0, 60));
  check("the visitor's own question is in that email", decodeURIComponent(href).includes(refund.question.slice(0, 30)));

  // The claim itself.
  check("NOTHING left this origin but the site's own account check", offsite.length === 0, offsite.slice(0, 4).join(", "));
  check("no script errors", errors.length === 0, errors[0] || "");

  // German, to prove the language rule and a second bank.
  await page.click(".bgd-head .bgd-icon");
  await page.fill("#bgd-input", "Wie viel kostet BugIt und wie kann ich es kaufen?");
  await page.click(".bgd-send");
  await page.waitForSelector(".bgd-bot .bgd-answer p", { timeout: 15000 });
  const german = await page.textContent(".bgd-bot .bgd-answer");
  check("a German question is answered in German", /[äöüß]|BugIt kostet|Lizenz/i.test(german), german.slice(0, 80));
  check("still nothing left this origin", offsite.length === 0, offsite.slice(0, 4).join(", "));
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
