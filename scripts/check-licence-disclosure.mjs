#!/usr/bin/env node
/**
 * THE LIST OF WHAT THE SOFTWARE SENDS MUST BE THE SAME LIST IN ELEVEN LANGUAGES,
 * AND ON BOTH SURFACES THAT PUBLISH IT.
 *
 * WHY THIS EXISTS. "F-05, the privacy policy on licence data" has been found by four
 * separate audit packs: 2026-08-12 (hostname, OS, installation id, version and challenge
 * data missing), 2026-09-10 (five translated overview PDFs short of an exhaustive
 * disclosure), 2026-09-14 (the live policies missing the plan filter and the returned
 * entitlement) and 2026-09-16. Each round fixed the instance that was reported. On
 * 2026-09-18 the live policy still said "your device sends only the following" over six
 * bullets while the activation modules sent eight things, in ALL eleven languages, and
 * the one-time approval token was on no surface of this site in any language.
 *
 * The agent repository does guard its own copy, and guards it well:
 * `tests/test_privacy_and_threat_model_match_the_wire.py` parses the request bodies off
 * the AST, so a field added to `tools/activation.py` next month is checked next month,
 * and its DISCLOSURE map fixes the wording each field must carry. The package PRIVACY.md
 * it covers has been correct throughout. Only the website copy drifted, because nothing
 * here had ever compared one language to another, let alone to the wire.
 *
 * WHAT THIS CAN CHECK AND WHAT IT CANNOT. It cannot read the agent's Python; that lives
 * in another repository and this gate must run on a checkout of this one. So it checks
 * the two properties that are true of every version of this defect:
 *
 *   1. PARITY. All eleven policies enumerate the same number of items. Nine of the ten
 *      recurrences were one surface or one language left behind, and a count is enough
 *      to see that. `EXPECTED_ITEMS` is the number the agent's wire guard covers; it is
 *      a restated fact and will rot, so it names where the truth lives and fails loudly
 *      rather than quietly when the wire gains a field.
 *
 *   2. THE TWO THAT KEEP GOING MISSING, plus one control. The plan filter and the
 *      approval token are checked by a per-language term, on both the policy and the
 *      FAQ. The acknowledgement secret is checked the same way as a CONTROL: it is
 *      already present everywhere, so if it ever reports missing, the extractor has
 *      broken rather than the copy.
 *
 * A gate whose subject can go empty passes by checking nothing, so the first assertion
 * is that it found eleven policies and eleven FAQ answers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

/**
 * How many items the device sends and receives, per the activation modules. The authority
 * is the agent repository's `tests/test_privacy_and_threat_model_match_the_wire.py`,
 * which computes the set from the AST: fingerprint, installation_id, device_label, os,
 * app_version, requested_mode, challenge, token, ack_secret_hash/ack_secret, and the
 * entitlement coming back. Eight bullets plus the "in return" sentence.
 *
 * IF THE WIRE GAINS A FIELD this number is wrong and every language is short by one. The
 * fix is not to edit this constant: it is to add the bullet in eleven languages and in
 * the FAQ, then edit it.
 */
const EXPECTED_ITEMS = 8;

const LOCALES = ['', 'ar', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt-br', 'ru', 'zh'];

/** The heading of the "what the BugIt software sends to us" section, per language. */
const SENDS_HEADING = /sends|envoie|sendet|env[ií]a|invia|送信|전송|发送|отправляет|يرسله/i;

/**
 * The term each language uses for three of the items. Taken from the shipped copy, not
 * composed: every one of these appears in `public/docs` and in `app.js` today.
 */
const TERMS = {
  '':      { plan: /plan filter|selected plan/i, token: /one-time approval token/i, ack: /acknowledgement secret/i },
  // The policy writes the term definite and the FAQ writes it indefinite; both are the
  // same term and neither is wrong, so the gate accepts either rather than forcing a
  // needless edit to shipped Arabic.
  ar:      { plan: /مرشّح ا?لخطة|مرشّح خطة/, token: /رمز موافقة لمرة واحدة/, ack: /سر إقرار/ },
  de:      { plan: /Planfilter/i, token: /Freigabe-Token/i, ack: /Bestätigungsgeheimnis/i },
  es:      { plan: /filtro de plan/i, token: /token de aprobación de un solo uso/i, ack: /secreto de confirmación/i },
  fr:      { plan: /filtre d['’]offre/i, token: /jeton d['’]approbation à usage unique/i, ack: /secret d['’]accusé de réception/i },
  it:      { plan: /filtro di piano/i, token: /token di approvazione monouso/i, ack: /segreto di conferma/i },
  ja:      { plan: /プランフィルター/, token: /一回限りの承認トークン/, ack: /確認シークレット/ },
  ko:      { plan: /플랜 필터/, token: /일회용 승인 토큰/, ack: /확인 비밀값/ },
  'pt-br': { plan: /filtro de plano/i, token: /token de aprovação de uso único/i, ack: /segredo de confirmação/i },
  ru:      { plan: /фильтр плана|фильтр плана|фильтра плана|выбранный вами фильтр/i, token: /одноразовый токен подтверждения/i, ack: /секрет подтверждения/i },
  zh:      { plan: /套餐筛选/, token: /一次性批准令牌/, ack: /确认密钥/ },
};

let failures = 0;
const fail = (msg, why) => { failures++; console.error(`  FAIL  ${msg}\n        ${why}`); };
const check = (ok, msg, why) => { if (!ok) fail(msg, why); };

/** The "what the software sends" section of one policy, from its heading to the next. */
function sendsSection(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## ') && SENDS_HEADING.test(l));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

// --- 1. the policies -------------------------------------------------------
const seen = [];
for (const lg of LOCALES) {
  const name = lg === '' ? 'PRIVACY.md' : `PRIVACY.${lg}.md`;
  const file = path.join('public', 'docs', name);
  if (!fs.existsSync(path.join(root, file))) { fail(name, 'the policy is missing entirely'); continue; }
  const section = sendsSection(read(file));
  if (section === null) {
    fail(name, 'no "what the software sends" heading matched, so nothing below was checked');
    continue;
  }
  const items = section.split('\n').filter((l) => l.startsWith('- ')).length;
  check(items === EXPECTED_ITEMS, `${name}: ${items} items, expected ${EXPECTED_ITEMS}`,
    'the page says the device sends ONLY what it lists, so a short list is a false claim, ' +
    'not a documentation gap. If the wire really changed, change all eleven and EXPECTED_ITEMS.');
  const t = TERMS[lg];
  check(t.plan.test(section), `${name}: no plan filter`, 'requested_mode is sent to /activate/start');
  check(t.token.test(section), `${name}: no approval token`, 'token is sent to /activate/poll and /activate/exchange');
  check(t.ack.test(section), `${name}: no acknowledgement secret`,
    'THIS IS THE CONTROL. It has been present in every language for months, so a failure here ' +
    'means this gate stopped reading the section, not that the copy regressed.');
  seen.push(name);
}
check(seen.length === LOCALES.length, `only ${seen.length} of ${LOCALES.length} policies were read`,
  'a gate that computes its own subject passes vacuously when the subject is empty');

// --- 2. the FAQ and the doc pages, which are the same list again -----------
const app = read('app.js');
for (const lg of LOCALES) {
  const t = TERMS[lg];
  const n = (app.match(new RegExp(t.ack.source, t.ack.flags.replace('g', '') + 'g')) || []).length;
  check(n > 0, `app.js [${lg || 'en'}]: the licensing list was not found`,
    'THE CONTROL AGAIN: the acknowledgement secret anchors every copy of this list.');
  if (n === 0) continue;
  const plan = (app.match(new RegExp(t.plan.source, t.plan.flags.replace('g', '') + 'g')) || []).length;
  const token = (app.match(new RegExp(t.token.source, t.token.flags.replace('g', '') + 'g')) || []).length;
  check(plan >= n, `app.js [${lg || 'en'}]: ${n} copies of the list, ${plan} name the plan filter`,
    'every copy of the list must be complete; updating the first one is how this finding survived four rounds');
  check(token >= n, `app.js [${lg || 'en'}]: ${n} copies of the list, ${token} name the approval token`,
    'every copy of the list must be complete');
}

if (failures > 0) {
  console.error(`\ncheck-licence-disclosure: ${failures} failure(s)`);
  process.exit(1);
}
console.log('check-licence-disclosure: OK, eleven policies and every copy of the FAQ list agree.');
