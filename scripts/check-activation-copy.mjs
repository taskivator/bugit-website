#!/usr/bin/env node
/**
 * Guard: bugit.dev must describe only the browser-based Portal authorization
 * flow (1.0.9). The customer license-KEY activation model was removed from the
 * product, so no customer-facing surface may instruct pasting/copying/revealing
 * a license key, pass a key on the `activate` command, use the removed
 * --clipboard/--prompt/--stdin input flags, treat license.key/QA_AGENT_LICENSE
 * as a customer credential, or describe a shared Team key.
 *
 * Scope decisions (deliberate, matched to the activation-doc migration):
 *  - NEGATIVE patterns target the removed FLOW (a verb/flag + key), never the
 *    bare noun "license key". Two noun-only mentions are intentionally retained
 *    pending a coupled legal / agent-PRIVACY reconciliation: the "license/update
 *    data … your license key" privacy disclosure and the "Keys may not be
 *    shared…" licensing restriction. Both are data/legal statements, not the
 *    activation flow, so this guard must not fire on them.
 *  - The stale-OVERRIDE check asserts the app.js FAQ (base + add() overrides)
 *    no longer answers "renewals stack" with an "activate a new KEY" model, in
 *    every localized script — the exact regression that hides in the minified
 *    duplicate FAQ structures.
 *  - Provider keys ("your own OpenAI/Anthropic key") are unrelated and allowed.
 *
 * Checks SOURCE and BUILT dist — a stale hashed bundle would keep serving old
 * copy after the source was fixed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let failures = 0;
const check = (ok, msg) => { if (!ok) { console.error(`FAIL: ${msg}`); failures++; } };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const distJs = exists("dist")
  ? fs.readdirSync(path.join(ROOT, "dist")).filter((f) => /^app\.[0-9a-f]+\.js$/.test(f))
  : [];

const GUIDES = fs.readdirSync(path.join(ROOT, "public/docs"))
  .filter((f) => /^GETTING_STARTED(\.[a-z-]+)?\.web\.md$/.test(f))
  .map((f) => [`public/docs/${f}`, read(`public/docs/${f}`)]);

const APP_SOURCES = [
  ["app.js", read("app.js")],
  ...distJs.map((f) => [`dist/${f}`, read(`dist/${f}`)]),
];
const ALL = [...APP_SOURCES, ...GUIDES];

// ---------------------------------------------------------------------------
// NEGATIVE: removed key-activation FLOW must not appear (source + dist).
// ---------------------------------------------------------------------------
const PROHIBITED = [
  [/--clipboard/i, "removed --clipboard activation flag"],
  [/--prompt\b/i, "removed --prompt activation flag"],
  [/--stdin/i, "removed --stdin activation flag"],
  [/QA_AGENT_LICENSE/i, "QA_AGENT_LICENSE presented as customer setup"],
  [/license\.key/i, "license.key presented as a customer credential"],
  [/paste (your |the )?(full )?(license )?key/i, "instruction to paste a key"],
  [/copy (your |the )?(full )?license key/i, "instruction to copy a license key"],
  [/reveal (your |the )?(full )?(license )?key/i, "instruction to reveal a license key"],
  [/enter (your |the )?license key/i, "instruction to enter a license key"],
  [/masked (terminal )?prompt[^.]{0,40}key/i, "masked-prompt key entry"],
  [/activate\s+[<`]?(your[- ])?(license[- ])?key/i, "activate <key> form"],
  [/activate\s+BUGIT-/i, "activate with a literal key"],
  // Instruction to SHARE a key, or a shared Team key — but "no shared key" /
  // "never share a key" is the correct browser-model copy, so exclude negations.
  [/(?<!no )(?<!never )shared (team )?(license )?key/i, "shared Team key"],
  [/shar(e|ing) (your |the |a )?(team )?(license )?key\b/i, "instruction to share a key"],
  [/key-based (update|device)/i, "key-based update/device wording"],
];
for (const [name, src] of ALL) {
  for (const [rx, why] of PROHIBITED) {
    check(!rx.test(src), `${name}: ${why} (matched ${rx})`);
  }
}

// ---------------------------------------------------------------------------
// NEGATIVE (localized stale-OVERRIDE): the "renewals stack" FAQ answer must no
// longer describe activating a new KEY, in any localized script. These are the
// exact nouns the migration removed from both FAQ structures in app.js.
// ---------------------------------------------------------------------------
const STALE_RENEWAL_KEY = [
  "Activating a new key", "nueva clave", "nouvelle clé", "neuer Schlüssel",
  "nuova chiave", "nova chave", "新しいキー", "새 키", "新密钥", "нового ключ",
];
for (const [name, src] of APP_SOURCES) {
  for (const frag of STALE_RENEWAL_KEY) {
    check(!src.includes(frag), `${name}: stale renewals FAQ still says "${frag}" (key-based renewal)`);
  }
}

// ---------------------------------------------------------------------------
// POSITIVE: the English getting-started guide must describe the browser flow.
// ---------------------------------------------------------------------------
const en = GUIDES.find(([n]) => n.endsWith("GETTING_STARTED.web.md"));
check(!!en, "GETTING_STARTED.web.md (English) is present");
if (en) {
  const [, g] = en;
  const must = [
    [/opens the BugIt Portal in your browser/i, "browser Portal activation"],
    [/\bSolo\b/, "Solo entitlement named"],
    [/\bTeam\b/, "Team entitlement named"],
    [/own BugIt account/i, "individual account sign-in"],
    [/approve this device/i, "Portal device approval"],
    [/72 hours/i, "72-hour offline grace"],
    [/`Switch license`/, "switch-license explained"],
    [/`Deactivate` removes the entitlement from this machine only/i, "local-only deactivate"],
    [/signed entitlement/i, "entitlement-authorized updates"],
    [/no shared key and no shared login/i, "Team per-person, no shared key"],
    [/English only/i, "English-only support"],
  ];
  for (const [rx, why] of must) {
    check(rx.test(g), `GETTING_STARTED.web.md missing ${why} (${rx})`);
  }
}

if (failures) {
  console.error(`\ncheck-activation-copy: ${failures} failure(s).`);
  process.exit(1);
}
console.log(`check-activation-copy: OK — browser flow present, no removed key-activation flow in ${ALL.length} source/dist files.`);
