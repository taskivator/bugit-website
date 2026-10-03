// Accessibility gate (WEB Phase H): the demo "One agent. Different QA worlds."
// switcher must be a proper ARIA tablist — tabs with aria-selected + aria-controls,
// matching tabpanels, exactly one selected tab, and inactive panels hidden from the
// a11y tree. Static structural check over index.html (no browser needed).
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const fail = [];

// Scope to the demo section.
const demo = (html.match(/<section id="demo"[\s\S]*?<\/section>/) || [""])[0];
if (!demo) fail.push("demo section not found");

if (!/class="demo-tabs"[^>]*role="tablist"/.test(demo))
  fail.push("demo-tabs is not role=tablist");

const tabs = [...demo.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((m) => m[0]);
if (tabs.length < 2) fail.push(`expected >=2 role=tab buttons, found ${tabs.length}`);

let selected = 0;
for (const tab of tabs) {
  if (!/aria-selected="(true|false)"/.test(tab)) fail.push("a tab lacks aria-selected");
  if (!/aria-controls="demopanel-[a-z]+"/.test(tab)) fail.push("a tab lacks aria-controls");
  if (!/id="demotab-[a-z]+"/.test(tab)) fail.push("a tab lacks an id");
  if (!/tabindex="(0|-1)"/.test(tab)) fail.push("a tab lacks roving tabindex");
  if (/aria-selected="true"/.test(tab)) selected++;
}
if (selected !== 1) fail.push(`exactly one tab must be aria-selected=true (found ${selected})`);

// Every aria-controls target must exist as a role=tabpanel with the matching id.
for (const tab of tabs) {
  const ctl = (tab.match(/aria-controls="(demopanel-[a-z]+)"/) || [])[1];
  const lbl = (tab.match(/id="(demotab-[a-z]+)"/) || [])[1];
  if (!ctl) continue;
  const panel = (demo.match(new RegExp(`<video[^>]*id="${ctl}"[^>]*>`)) || [])[0];
  if (!panel) { fail.push(`no tabpanel with id=${ctl}`); continue; }
  if (!/role="tabpanel"/.test(panel)) fail.push(`${ctl} is not role=tabpanel`);
  if (lbl && !panel.includes(`aria-labelledby="${lbl}"`)) fail.push(`${ctl} not labelled by ${lbl}`);
}

// Inactive panels (no is-active) must be hidden from AT and out of keyboard order.
const panels = [...demo.matchAll(/<video[^>]*id="demopanel-[a-z]+"[^>]*>/g)].map((m) => m[0]);
for (const p of panels) {
  const active = /class="[^"]*\bis-active\b/.test(p);
  if (!active) {
    if (!/aria-hidden="true"/.test(p)) fail.push("inactive panel not aria-hidden");
    if (!/tabindex="-1"/.test(p)) fail.push("inactive panel still in keyboard order");
  }
}

// W1 F4 (2026-09-24 audit): the language and account buttons show a short visible
// word, or the signed-in user's name, and their accessible name must CONTAIN that
// visible text (WCAG 2.5.3, Label in Name) -- not name the control instead, the way
// aria-label="Language" and aria-label="Account menu" used to. Neither button may
// carry an aria-label any more (that would make the visible text irrelevant to the
// accessible name again), and each must hold a visually-hidden prefix span directly
// ahead of its visible label span, so the accessible name -- built from text content
// alone once aria-label is gone -- is the prefix followed by whatever the visible
// span currently shows, including a name nobody wrote at build time.
const HEADER_BUTTONS = [
  { id: "langButton", visible: "langLabel", prefixKey: "a11y.language" },
  { id: "acctButton", visible: "acctLabel", prefixKey: "account.menu" },
];
for (const { id, visible, prefixKey } of HEADER_BUTTONS) {
  const btn = (html.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?</button>`)) || [""])[0];
  if (!btn) { fail.push(`no <button id="${id}"> found`); continue; }
  if (/\saria-label=/.test(btn))
    fail.push(`#${id} still carries aria-label, so its visible text (#${visible}) is not part of its accessible name`);
  const prefix = new RegExp(`<span class="sr-only" data-t="${prefixKey.replace(".", "\\.")}"[^>]*>[^<]*</span>\\s+<span id="${visible}"`);
  if (!prefix.test(btn))
    fail.push(`#${id} has no sr-only "${prefixKey}" prefix immediately before #${visible}, so its accessible name is not built from the visible text`);
}

if (fail.length) {
  console.error("check-a11y FAILED:\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log(`check-a11y OK: demo tablist has ${tabs.length} tabs, ${panels.length} panels, 1 selected; ` +
            `${HEADER_BUTTONS.length} header controls build their accessible name from their visible text.`);
