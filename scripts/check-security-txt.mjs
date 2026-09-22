/**
 * THE SECURITY CONTACT MUST STILL BE VALID, AND IT EXPIRES ON A DATE NOBODY IS WATCHING.
 *
 * `.well-known/security.txt` is a static file with a hardcoded `Expires` field. RFC 9116 is not
 * advisory about it: a parser MUST ignore a file whose Expires has passed, so on that date the
 * document stops being a security contact and becomes a 200 that means nothing. Nothing in
 * `scripts/` mentioned this file before 2026-09-22 -- not its existence, not its syntax, not the
 * date -- and the Guide cites it to customers in all ELEVEN languages as where to report a
 * vulnerability. A researcher who follows that link after it lapses has been sent to a dead end
 * by our own help text.
 *
 * WHY IT FAILS EARLY RATHER THAN ON THE DAY. A guard that goes red the morning the file expires
 * has not prevented anything; it has reported an outage. This one fails while there is still a
 * quarter of a year to act, which is the difference between a chore and an incident. That is the
 * same reasoning as the cadence lesson in LESSONS.md: a threshold restated from a cadence goes
 * stale, so the threshold is here, in code, next to the thing it protects.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REL = join(".well-known", "security.txt");

/** Fail while there is still time to act, not on the morning it lapses. */
const MIN_DAYS_REMAINING = 90;

let failures = 0;
const check = (name, ok, detail = "") => {
  process.stdout.write(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}\n`);
  if (!ok) failures++;
};

/** Parse the field set. Values are the remainder of the line; keys are case-insensitive. */
function fields(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Za-z-]+):\s*(.+?)\s*$/.exec(line);
    if (m) {
      const k = m[1].toLowerCase();
      if (!out.has(k)) out.set(k, []);
      out.get(k).push(m[2]);
    }
  }
  return out;
}

/** Days from now until an Expires value, or null when it is not a date at all. */
function daysLeft(value) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? (t - Date.now()) / 86_400_000 : null;
}

for (const where of ["", "dist"]) {
  const path = join(ROOT, where, REL);
  const label = where ? "dist" : "repo";
  if (!existsSync(path)) {
    // dist only exists after a build; the repo copy is the one that must always be there.
    if (label === "dist") {
      process.stdout.write("skip  dist copy not built in this run\n");
      continue;
    }
    check(`${label}: .well-known/security.txt exists`, false, path);
    continue;
  }
  const text = readFileSync(path, "utf8");
  const f = fields(text);

  check(`${label}: names a Contact`, f.has("contact"), [...(f.get("contact") ?? [])].join(", "));
  check(`${label}: names an Expires`, f.has("expires"));

  const raw = f.get("expires")?.[0];
  const left = raw ? daysLeft(raw) : null;
  check(`${label}: Expires is a date RFC 9116 can read`, left !== null, String(raw));
  if (left !== null) {
    check(`${label}: has not already expired`, left > 0, `${Math.round(left)} days`);
    check(
      `${label}: more than ${MIN_DAYS_REMAINING} days left, so this fails before it breaks`,
      left > MIN_DAYS_REMAINING,
      `${Math.round(left)} days remaining, expires ${raw}`,
    );
  }
  // Canonical must name itself over https, or a copy served elsewhere claims to be this one.
  const canonical = f.get("canonical")?.[0] ?? "";
  check(`${label}: Canonical is an https bugit.dev URL`, /^https:\/\/bugit\.dev\//.test(canonical), canonical);
}

/* THE NEGATIVE CONTROLS. Every assertion above passes today, so on its own this file proves only
   that it ran. These four documents are each wrong in one way, and the parser must say so --
   otherwise the checks above are shape, not judgement. */
const controls = [
  ["an expired document", "Contact: mailto:x@y\nExpires: 2020-01-01T00:00:00.000Z\n", (f) => daysLeft(f.get("expires")[0]) > 0],
  ["a document expiring next week", "Contact: mailto:x@y\nExpires: " + new Date(Date.now() + 7 * 86_400_000).toISOString() + "\n", (f) => daysLeft(f.get("expires")[0]) > MIN_DAYS_REMAINING],
  ["an unparseable Expires", "Contact: mailto:x@y\nExpires: soon\n", (f) => daysLeft(f.get("expires")[0]) !== null],
  ["a document with no Contact", "Expires: 2099-01-01T00:00:00.000Z\n", (f) => f.has("contact")],
];
for (const [name, doc, predicate] of controls) {
  check(`negative control: ${name} is rejected`, predicate(fields(doc)) === false);
}
// And the parser must actually read a well-formed file, or every control above passes vacuously.
check(
  "positive control: a valid document is accepted",
  (() => {
    const f = fields("Contact: mailto:security@bugit.dev\nExpires: 2099-01-01T00:00:00.000Z\n");
    return f.has("contact") && daysLeft(f.get("expires")[0]) > MIN_DAYS_REMAINING;
  })(),
);

process.stdout.write(failures ? `\n${failures} failure(s)\n` : "\nsecurity.txt is present, parseable and not about to lapse\n");
process.exit(failures ? 1 : 0);
