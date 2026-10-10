#!/usr/bin/env node
// Tells IndexNow (Bing, Yandex, Seznam, Naver; Bing feeds ChatGPT search and Copilot) that the
// pages in the sitemap may have changed (SEO audit 2026-10-10).
//
//   node scripts/indexnow-ping.mjs            submit every URL in dist/sitemap.xml
//   node scripts/indexnow-ping.mjs --dry-run  print what would be sent, send nothing
//
// Runs at the end of `npm run deploy`, after verify:live, so it only announces what the edge
// already serves. The key is public by design: IndexNow proves ownership by fetching
// https://bugit.dev/<key>.txt, the one root file named 32 hex characters + .txt (build.js
// publishes it). A failed ping never fails the deploy: the site is already live, and a ping that
// did not land costs a slower re-crawl, nothing more. It says so plainly instead.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry-run");

const keys = fs.readdirSync(root).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (keys.length !== 1) {
  console.error(`indexnow: expected exactly one key file at the root, found ${keys.length}. Nothing sent.`);
  process.exit(dry ? 1 : 0);
}
const key = keys[0].slice(0, -4);
if (fs.readFileSync(path.join(root, keys[0]), "utf8").trim() !== key) {
  console.error(`indexnow: ${keys[0]} does not contain its own name. Nothing sent.`);
  process.exit(dry ? 1 : 0);
}

const sitemap = path.join(root, "dist", "sitemap.xml");
const src = fs.existsSync(sitemap) ? sitemap : path.join(root, "sitemap.xml");
const urlList = [...fs.readFileSync(src, "utf8").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
if (!urlList.length || urlList.some((u) => !u.startsWith("https://bugit.dev/"))) {
  console.error(`indexnow: ${path.relative(root, src)} gave ${urlList.length} URL(s), or one outside bugit.dev. Nothing sent.`);
  process.exit(dry ? 1 : 0);
}

const body = { host: "bugit.dev", key, keyLocation: `https://bugit.dev/${key}.txt`, urlList };
if (dry) {
  console.log(`indexnow (dry run): would submit ${urlList.length} URL(s) with key file ${body.keyLocation}`);
  for (const u of urlList) console.log("  " + u);
  process.exit(0);
}

try {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  // 200 = received, 202 = received and the key is still being validated. Anything else is named.
  if (res.status === 200 || res.status === 202) console.log(`indexnow: ${urlList.length} URL(s) submitted (HTTP ${res.status}).`);
  else console.warn(`indexnow: NOT accepted, HTTP ${res.status} ${(await res.text()).slice(0, 200)}. The deploy itself is fine.`);
} catch (e) {
  console.warn(`indexnow: could not reach the endpoint (${e.message}). The deploy itself is fine.`);
}
