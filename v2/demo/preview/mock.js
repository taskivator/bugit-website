/* Local review only. Loaded by demo.js on localhost with ?mock=1. Not part of the build. */
(function () {
  var real = window.fetch.bind(window);
  function json(status, body, wait) { return new Promise(function (res) { setTimeout(function () { res(new Response(status === 204 ? null : JSON.stringify(body), { status: status, headers: { 'content-type': 'application/json' } })); }, wait); }); }
  window.fetch = function (url, opts) {
    if (String(url).indexOf('/__mock') !== 0) return real(url, opts);
    var path = String(url).slice(7), body = {}; try { body = JSON.parse((opts && opts.body) || '{}'); } catch (e) { /* none */ }
    if (path === '/status') return json(200, { state: 'open', limits: { noteMaxChars: 1500, answerMaxChars: 600 }, botCheck: null }, 100);
    if (path === '/start') {
      var note = String(body.note || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]');
      var n = (String(body.note || '').match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []).length;
      return json(200, { runToken: 'mock', redactedNote: note, redactions: { email: n, token: 0, phone: 0, ip: 0, card: 0, other: 0 },
        questions: [
          { id: 'q1', field: 'steps', text: 'What exact steps lead to it?' },
          { id: 'q2', field: 'expected', text: 'What did you expect to happen?' },
          { id: 'q3', field: 'build', text: 'Which build or version of the app were you using?' },
          { id: 'q4', field: 'os', text: 'Which operating system are you on?' },
          { id: 'q5', field: 'device', text: 'Which device or browser?' },
          { id: 'q6', field: 'often', text: 'How often does it happen?' },
          { id: 'q7', field: 'since', text: 'Since when does it happen, or what was the last version that worked?' },
          { id: 'q8', field: 'impact', text: 'How badly does it affect you, and is there a workaround?' }], canSkip: true }, 1800);
    }
    if (path === '/draft') {
      var txt = String(body.redactedNote || '').trim(), first = (txt.split(/(?<=[.!?])\s+/)[0] || txt).slice(0, 120);
      var A = {}; (body.answers || []).forEach(function (x) { if (x.text) A[x.id] = x.text; });
      var env = function (field, id) { return { field: field, value: A[id] || 'UNKNOWN', basis: A[id] ? 'stated' : 'unknown' }; };
      return json(200, { feedbackToken: 'mock', redactions: null, draft: {
        verdict: 'draft',
        title: { text: '[Area unknown] ' + first.replace(/[.!?]+$/, ''), basis: 'inferred' },
        steps: [A.q1 ? { text: A.q1, basis: 'stated' } : { text: 'UNKNOWN: not given', basis: 'unknown' }],
        expected: A.q2 ? { text: A.q2, basis: 'stated' } : { text: 'UNKNOWN', basis: 'unknown' },
        actual: { text: txt.slice(0, 300), basis: 'stated' },
        severity: { level: A.q8 && /blocked/i.test(A.q8) ? 'High' : A.q8 ? 'Medium' : 'UNKNOWN', reasons: [A.q8 ? { text: A.q8, basis: 'stated' } : { text: 'UNKNOWN: impact not given', basis: 'unknown' }], would_change_if: 'Knowing how many people are affected.' },
        environment: [env('Build or version', 'q3'), env('Operating system', 'q4'), env('Device or browser', 'q5'), env('How often', 'q6'), env('Since when or last good version', 'q7')],
        evidence_missing: [{ item: 'The crash log or error message', why: 'It points to the line that failed.' }],
        suspected_cause: null }, notices: [] }, 2000);
    }
    return json(204, {}, 50);
  };
})();
