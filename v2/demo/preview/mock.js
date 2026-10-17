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
      return json(200, { feedbackToken: 'mock', redactions: null, draft: {
        verdict: 'draft',
        title: { text: '[Checkout] App crashes when tapping Pay on the order screen', basis: 'stated' },
        steps: [
          { text: 'Open the order screen on a phone.', basis: 'inferred' },
          { text: 'Tap Pay.', basis: 'stated' },
          { text: 'The app closes. It happened twice today.', basis: 'stated' }
        ],
        expected: { text: 'The payment goes through and a confirmation is shown.', basis: 'inferred' },
        actual: { text: 'The app crashes. It worked last week.', basis: 'stated' },
        severity: { level: 'High', reasons: [
          { text: 'Payment cannot be completed on this device.', basis: 'inferred' },
          { text: 'No workaround was mentioned.', basis: 'unknown' },
          { text: 'It happened twice in one day.', basis: 'stated' }], would_change_if: 'A working payment path on another device would make this Medium.' },
        environment: [
          { field: 'Product or area', value: 'Checkout, order screen', basis: 'stated' },
          { field: 'Build or version', value: 'UNKNOWN', basis: 'unknown' },
          { field: 'Operating system', value: 'UNKNOWN', basis: 'unknown' },
          { field: 'Device or browser', value: 'A phone', basis: 'stated' },
          { field: 'How often', value: 'Twice today', basis: 'stated' },
          { field: 'Since when or last good version', value: 'Worked last week', basis: 'stated' }],
        evidence_missing: [
          { item: 'The crash log from the phone', why: 'It shows the line that failed, so a developer can start there.' },
          { item: 'The exact app build', why: 'It tells the team whether a recent release caused it.' },
          { item: 'A screen recording of the steps', why: 'It removes any doubt about what was tapped before the crash.' }],
        suspected_cause: null }, notices: [] }, 2200);
    }
    return json(204, {}, 50);
  };
})();
