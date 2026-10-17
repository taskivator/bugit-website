// The free preview page and the portal engine must agree on the draft request.
// The engine binds the run token to the question list, so a /draft call that leaves the
// questions out is refused with 401 for every visitor (found live on 2026-10-17: the
// canned local server did not enforce it). This reads the page source and fails if the
// request stops carrying the fields the engine checks.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../v2/demo/demo.js', import.meta.url), 'utf8');
const i = src.indexOf("post('/draft',"), j = i < 0 ? -1 : src.indexOf(").then(", i);
const call = i < 0 || j < 0 ? null : [null, src.slice(i, j)];
const fails = [];
if (!call) fails.push("no post('/draft', {...}) found");
else for (const f of ['runToken', 'redactedNote', 'questions', 'answers']) if (!new RegExp('\b' + f + '\s*:').test(call[1])) fails.push('the /draft request does not send ' + f);
if (fails.length) { console.error('check-preview-contract FAILED: ' + fails.join('; ')); process.exit(1); }
console.log('check-preview-contract OK: the /draft request carries runToken, redactedNote, questions and answers, as the engine verifies them.');
