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
        questions: [{ id: 'q1', text: 'Which build or version of the app were you using?' }, { id: 'q2', text: 'What did you expect to happen?' }, { id: 'q3', text: 'Does it happen every time?' }], canSkip: true }, 1800);
    }
    if (path === '/draft') {
      var txt = String(body.redactedNote || '').trim(), first = (txt.split(/(?<=[.!?])\s+/)[0] || txt).slice(0, 120);
      var ans = (body.answers || []).filter(function (x) { return x.text; });
      var low = txt.toLowerCase(), known = function (w) { return low.indexOf(w) >= 0; };
      return json(200, { feedbackToken: 'mock', redactions: null, draft: {
        verdict: 'draft',
        title: { text: '[Area unknown] ' + first.replace(/[.!?]+$/, ''), basis: 'inferred' },
        steps: [{ text: 'UNKNOWN: the note does not say how to reach this.', basis: 'unknown' }],
        expected: { text: 'UNKNOWN', basis: 'unknown' },
        actual: { text: txt.slice(0, 300), basis: 'stated' },
        severity: { level: 'UNKNOWN', reasons: [{ text: 'Impact, workaround and number of users are not stated.', basis: 'unknown' }], would_change_if: 'Knowing how many people are affected and whether a workaround exists.' },
        environment: [
          { field: 'Build or version', value: ans[0] ? ans[0].text : 'UNKNOWN', basis: ans[0] ? 'stated' : 'unknown' },
          { field: 'Operating system', value: known('ios') ? 'iOS' : known('android') ? 'Android' : 'UNKNOWN', basis: known('ios') || known('android') ? 'inferred' : 'unknown' },
          { field: 'Device or browser', value: known('phone') ? 'A phone' : 'UNKNOWN', basis: known('phone') ? 'stated' : 'unknown' },
          { field: 'How often', value: known('twice') ? 'Twice today' : 'UNKNOWN', basis: known('twice') ? 'stated' : 'unknown' }],
        evidence_missing: [
          { item: 'The exact steps', why: 'A developer needs them to reproduce it.' },
          { item: 'The crash log or error message', why: 'It points to the line that failed.' },
          { item: 'The exact build', why: 'It tells the team whether a recent release caused it.' }],
        suspected_cause: null }, notices: [] }, 2000);
    }
    return json(204, {}, 50);
  };
})();
