/* BugIt free preview. State lives in memory only: no cookies, no localStorage, no sessionStorage.
   Every server string is mapped to a fixed message here; the page never shows server text.
   Every field is written with textContent, never innerHTML. */
(function () {
  'use strict';

  var API = (window.BUGIT_DEMO_API || 'https://portal.bugit.dev/api/demo').replace(/\/$/, '');
  var TRIAL_BEACON = API + '/event';

  var MSG = {
    paused: 'The preview is paused right now. Please try again later.',
    busy: 'The preview is busy right now. Please try again tomorrow.',
    rate_limited: 'You have used the preview a few times today. Please try again later.',
    refused_secrets: 'That text looks like it contains a password or a token, so we did not use it. Remove it and try again.',
    refused_logs: 'That looks like a log or a file dump. Please write a short note in your own words instead.',
    not_english: 'The preview works in English only.',
    not_a_bug_note: 'That does not look like a note about a bug. Describe what went wrong, in a sentence or two.',
    too_short: 'That note is too short. Describe what went wrong in a sentence or two.',
    too_long: 'That note is too long. Please shorten it.',
    bot_check_failed: 'We could not confirm you are a person. Please try again.',
    error: 'Something went wrong on our side. Nothing was kept. Please try again.'
  };

  var EXAMPLES = [
    'Checkout crashed when I tapped Pay on the order screen. It happened twice today on my phone. Last week it worked fine.',
    'Uploads sometimes get stuck at 100 percent and never finish. Not every time, maybe one in five. I have no idea what triggers it.',
    'After the update, the invoice total shows 0.00 for orders with a discount code. I think the new discount code change broke it.'
  ];

  var BASIS = {
    stated: { text: 'From your note', icon: '<path d="M5 12.5l4.5 4.5L19 7.5"/>' },
    inferred: { text: 'Inferred, please check', icon: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16v.5"/>' },
    unknown: { text: 'UNKNOWN', icon: '<circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/>' }
  };

  var CAT = { email: ['email address', 'email addresses'], token: ['token', 'tokens'], phone: ['phone number', 'phone numbers'],
    ip: ['IP address', 'IP addresses'], card: ['card number', 'card numbers'], ssn: ['ID number', 'ID numbers'], other: ['other item', 'other items'] };

  var $ = function (id) { return document.getElementById(id); };
  var S = { state: 'idle', runToken: '', redactedNote: '', questions: [], draft: null, feedbackToken: '', botToken: '', botReady: false, siteKey: '', open: true };

  /* small DOM helpers */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function svg(inner) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.4'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = inner; return s; }
  function say(t) { var l = $('live'); l.textContent = ''; setTimeout(function () { l.textContent = t; }, 40); }
  function focusHead(id) { var h = $(id); if (h) { h.focus({ preventScroll: false }); } }
  function show(id, on) { var n = $(id); if (n) n.hidden = !on; }
  function showError(id, key) { var n = $(id); n.textContent = MSG[key] || MSG.error; n.hidden = false; }
  function clearError(id) { var n = $(id); n.textContent = ''; n.hidden = true; }

  function setStep(name) {
    var order = ['note', 'questions', 'draft'], idx = order.indexOf(name);
    Array.prototype.forEach.call($('d-steps').children, function (li, i) {
      li.classList.toggle('is-now', i === idx);
      li.classList.toggle('is-done', i < idx);
      if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }
  function panes(which) {
    ['pane-note', 'pane-busy', 'pane-questions'].forEach(function (p) { show(p, p === which); });
  }
  function outState(t) { $('out-state').textContent = t; }

  /* network */
  function post(path, body) {
    return fetch(API + path, { method: 'POST', credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; }); })
      .catch(function () { return { ok: false, status: 0, data: { error: { code: 'network' } } }; });
  }
  function codeOf(res) { var c = res && res.data && res.data.error && res.data.error.code; return MSG[c] ? c : (res.status === 429 ? 'rate_limited' : 'error'); }

  /* redacted text with visible placeholders */
  function renderRedacted(target, text) {
    target.textContent = '';
    var re = /(\[(?:email|phone|ip|card|token|ssn)\]|\[removed: looks like a secret\])/g, parts = String(text).split(re);
    parts.forEach(function (p, i) { if (i % 2) target.appendChild(el('span', 'd-ph', p)); else if (p) target.appendChild(document.createTextNode(p)); });
  }
  function redactionSentence(r) {
    var bits = [];
    Object.keys(CAT).forEach(function (k) { var n = (r && r[k]) | 0; if (n > 0) bits.push(n + ' ' + CAT[k][n === 1 ? 0 : 1]); });
    var tail = ' Names and addresses are not recognised, so read the draft.';
    if (!bits.length) return 'We found nothing we recognised as personal data.' + tail;
    var list = bits.length > 1 ? bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1] : bits[0];
    return 'Before reading your note we replaced ' + list + ' with placeholders.' + tail;
  }
  function showReadback() {
    renderRedacted($('read-note'), S.redactedNote);
    show('read-box', true);
    var rs = $('redact-sum'); rs.textContent = redactionSentence(S.redactions); rs.hidden = false;
  }

  /* bot check: loaded only when the server names a provider */
  function mountBot(cfg) {
    if (!cfg || cfg.provider !== 'turnstile' || !cfg.siteKey) { S.botReady = true; return; }
    S.siteKey = cfg.siteKey;
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.defer = true;
    s.onload = function () {
      try {
        window.turnstile.render($('bot-slot'), { sitekey: S.siteKey, theme: 'dark', callback: function (t) { S.botToken = t; S.botReady = true; }, 'error-callback': function () { S.botReady = false; }, 'expired-callback': function () { S.botToken = ''; } });
      } catch (e) { S.botReady = false; }
    };
    s.onerror = function () { S.botReady = false; $('go').disabled = true; showError('note-error', 'paused'); };
    document.head.appendChild(s);
  }

  /* start */
  function init() {
    var note = $('note');
    note.addEventListener('input', onCount); onCount();
    Array.prototype.forEach.call(document.querySelectorAll('[data-ex]'), function (b) {
      b.addEventListener('click', function () { note.value = EXAMPLES[+b.getAttribute('data-ex')]; onCount(); clearError('note-error'); note.focus(); });
    });
    $('note-form').addEventListener('submit', onSubmitNote);
    $('q-form').addEventListener('submit', function (e) { e.preventDefault(); sendDraft(collectAnswers()); });
    $('q-skip').addEventListener('click', function () { sendDraft([]); });
    $('copy-btn').addEventListener('click', onCopy);
    $('again').addEventListener('click', onAgain);
    $('fb-yes').addEventListener('click', function () { onFeedback(true); });
    $('fb-no').addEventListener('click', function () { onFeedback(false); });
    $('fb-form').addEventListener('submit', onFeedbackText);
    $('trial-btn').addEventListener('click', function () { try { navigator.sendBeacon(TRIAL_BEACON, JSON.stringify({ name: 'trial_clicked' })); } catch (e) { /* the link still works */ } });

    fetch(API + '/status', { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.state === 'paused' || d.state === 'busy') { S.open = false; $('go').disabled = true; showError('note-error', d.state); outState(d.state === 'busy' ? 'Busy right now' : 'Paused right now'); return; }
      mountBot(d.botCheck);
    }).catch(function () { S.open = false; $('go').disabled = true; showError('note-error', 'paused'); });
  }
  function onCount() {
    var n = $('note').value.length; $('note-count-n').textContent = n;
    $('note-count').classList.toggle('is-near', n > 1350);
  }

  function onSubmitNote(e) {
    e.preventDefault();
    if (S.state === 'checking' || !S.open) return;
    clearError('note-error');
    var text = $('note').value.trim();
    if (text.length < 15) { showError('note-error', 'too_short'); return; }
    if ($('hp').value) return;
    if (S.siteKey && !S.botToken) { showError('note-error', 'bot_check_failed'); return; }
    S.state = 'checking'; $('go').disabled = true;
    $('scan-text').textContent = text; panes('pane-busy'); outState('Reading your note'); say('Reading your note'); focusHead('h-busy');
    post('/start', { note: text, botToken: S.botToken, hp: '', v: 1 }).then(function (res) {
      S.state = 'idle'; $('go').disabled = false;
      if (S.siteKey && window.turnstile) { try { window.turnstile.reset(); S.botToken = ''; } catch (x) { /* ignore */ } }
      if (!res.ok) { panes('pane-note'); showError('note-error', codeOf(res)); outState('Waiting for your note'); focusHead('h-note'); return; }
      var d = res.data; S.runToken = d.runToken; S.redactedNote = d.redactedNote; S.redactions = d.redactions || {}; S.questions = d.questions || [];
      showReadback();
      if (S.questions.length) { renderQuestions(); } else { sendDraft([]); }
    });
  }

  function renderQuestions() {
    var list = $('q-list'); list.textContent = '';
    S.questions.slice(0, 3).forEach(function (q) {
      var wrap = el('div', 'd-q'), id = 'q-' + q.id;
      var lab = el('label', null, q.text); lab.setAttribute('for', id);
      var row = el('div', 'd-q-row'), inp = document.createElement('input');
      inp.type = 'text'; inp.id = id; inp.maxLength = 600; inp.autocomplete = 'off'; inp.setAttribute('data-q', q.id);
      var idk = el('button', 'd-idk', "I don't know"); idk.type = 'button'; idk.setAttribute('aria-pressed', 'false');
      idk.addEventListener('click', function () { var on = idk.getAttribute('aria-pressed') !== 'true'; idk.setAttribute('aria-pressed', String(on)); inp.disabled = on; if (on) inp.value = ''; });
      row.appendChild(inp); row.appendChild(idk); wrap.appendChild(lab); wrap.appendChild(row); list.appendChild(wrap);
    });
    clearError('q-error'); panes('pane-questions'); setStep('questions'); outState('Waiting for your answers'); say('A few questions'); focusHead('h-questions');
  }
  function collectAnswers() {
    return Array.prototype.map.call($('q-list').querySelectorAll('input[data-q]'), function (i) { return { id: i.getAttribute('data-q'), text: i.disabled || !i.value.trim() ? null : i.value.trim() }; });
  }

  function sendDraft(answers) {
    if (S.state === 'drafting') return;
    S.state = 'drafting'; clearError('q-error');
    $('scan-text').textContent = S.redactedNote; panes('pane-busy'); $('h-busy').textContent = 'Writing your draft';
    outState('Writing your draft'); say('Writing your draft'); focusHead('h-busy');
    post('/draft', { runToken: S.runToken, redactedNote: S.redactedNote, answers: answers }).then(function (res) {
      S.state = 'idle'; $('h-busy').textContent = 'Reading your note';
      if (!res.ok) {
        var key = codeOf(res);
        if (S.questions.length) { panes('pane-questions'); showError('q-error', key); setStep('questions'); focusHead('h-questions'); }
        else { panes('pane-note'); show('read-box', false); show('redact-sum', false); showError('note-error', key); setStep('note'); focusHead('h-note'); }
        outState('Waiting for your note'); return;
      }
      var d = res.data; S.draft = d.draft; S.feedbackToken = d.feedbackToken;
      if (d.redactions) { S.redactions = d.redactions; $('redact-sum').textContent = redactionSentence(S.redactions); }
      renderDraft(S.draft); show('again', true); panes(null); setStep('draft'); outState('Draft ready'); say('Draft ready'); focusHead('h-draft');
      if (window.matchMedia('(max-width:980px)').matches) $('d-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* draft rendering */
  function chip(basis) {
    var b = BASIS[basis] || BASIS.inferred, s = el('span', 'd-basis ' + (BASIS[basis] ? basis : 'inferred'));
    s.appendChild(svg(b.icon)); s.appendChild(document.createTextNode(b.text)); return s;
  }
  function item(obj) { var w = el('div', 'd-item'); w.appendChild(el('span', null, obj.text)); w.appendChild(chip(obj.basis)); return w; }
  function sec(title, delay) { var s = el('section', 'd-sec'); s.style.animationDelay = (delay * 70) + 'ms'; s.appendChild(el('h4', null, title)); return s; }

  function renderDraft(d) {
    var body = $('draft-body'), n = 0; body.textContent = '';
    $('draft-title').textContent = (d.title && d.title.text) || 'Untitled draft';
    if (d.title) { var t = $('draft-title'); var ex = t.querySelector('.d-basis'); if (ex) ex.remove(); }
    var titleRow = $('draft-title'); titleRow.appendChild(document.createTextNode(' ')); titleRow.appendChild(chip(d.title ? d.title.basis : 'inferred'));

    if (d.steps && d.steps.length) {
      var s1 = sec('Steps', n++), ol = el('ol', 'd-steps-l');
      d.steps.forEach(function (st) { var li = el('li'); li.appendChild(item(st)); ol.appendChild(li); });
      s1.appendChild(ol); body.appendChild(s1);
    }
    if (d.expected || d.actual) {
      var two = sec('Expected and actual', n++), g = el('div', 'd-two');
      [['Expected result', d.expected], ['Actual result', d.actual]].forEach(function (p) {
        var c = el('div'); c.appendChild(el('h4', null, p[0])); if (p[1]) c.appendChild(item(p[1])); g.appendChild(c);
      });
      two.querySelector('h4').remove(); two.appendChild(g); body.appendChild(two);
    }
    if (d.severity) {
      var sv = sec('Severity', n++), lv = String(d.severity.level || 'UNKNOWN'), order = ['Low', 'Medium', 'High', 'Critical'], at = order.indexOf(lv);
      var head = el('div', 'd-sev'), meter = el('div', 'd-sev-m'); meter.setAttribute('aria-hidden', 'true');
      order.forEach(function (_, i) { meter.appendChild(el('span', i <= at ? 'on' : '')); });
      var lab = el('span', 'd-sev-l', lv); if (at >= 0) lab.style.setProperty('--c', ['#32f28c', '#ffc24d', '#ff8a4d', '#ff5b72'][at]);
      head.appendChild(lab); head.appendChild(meter); sv.appendChild(head);
      var ul = el('ul', 'd-reasons'); (d.severity.reasons || []).forEach(function (r) { var li = el('li'); li.appendChild(item(r)); ul.appendChild(li); });
      sv.appendChild(ul);
      if (d.severity.would_change_if) { var w = el('p', 'd-would'); w.appendChild(el('b', null, 'What would change this: ')); w.appendChild(document.createTextNode(d.severity.would_change_if)); sv.appendChild(w); }
      body.appendChild(sv);
    }
    if (d.environment && d.environment.length) {
      var ev = sec('Environment', n++), dl = el('dl', 'd-env');
      d.environment.forEach(function (r) { dl.appendChild(el('dt', null, r.field)); var dd = el('dd'); dd.appendChild(el('span', null, r.value)); dd.appendChild(chip(r.basis)); dl.appendChild(dd); });
      ev.appendChild(dl); body.appendChild(ev);
    }
    if (d.evidence_missing && d.evidence_missing.length) {
      var em = sec('Evidence still missing', n++), ml = el('ul', 'd-miss');
      d.evidence_missing.forEach(function (m) { var li = el('li'), box = el('div'); box.appendChild(el('b', null, m.item)); box.appendChild(el('span', null, m.why)); li.appendChild(box); ml.appendChild(li); });
      em.appendChild(ml); body.appendChild(em);
    }
    if (d.suspected_cause && d.suspected_cause.text) {
      var sc = sec('Your suspicion, not confirmed', n++); sc.classList.add('d-susp'); sc.appendChild(el('p', null, d.suspected_cause.text)); body.appendChild(sc);
    }
    show('out-ghost', false); show('out-draft', true);
    $('fb-yes').setAttribute('aria-pressed', 'false'); $('fb-no').setAttribute('aria-pressed', 'false');
    show('fb-form', false); show('fb-thanks', false);
  }

  function onAgain() {
    S.draft = null; S.runToken = ''; S.state = 'idle';
    show('out-draft', false); show('out-ghost', true); show('read-box', false); show('redact-sum', false); show('again', false);
    clearError('note-error'); panes('pane-note'); setStep('note'); outState('Waiting for your note'); $('note').value = ''; onCount(); focusHead('h-note');
  }

  /* copy as plain text */
  function draftText(d) {
    var L = [];
    L.push(d.title.text, '');
    if (d.steps && d.steps.length) { L.push('Steps'); d.steps.forEach(function (s, i) { L.push((i + 1) + '. ' + s.text); }); L.push(''); }
    if (d.expected) L.push('Expected result: ' + d.expected.text);
    if (d.actual) L.push('Actual result: ' + d.actual.text);
    if (d.expected || d.actual) L.push('');
    if (d.severity) { L.push('Severity: ' + d.severity.level); (d.severity.reasons || []).forEach(function (r) { L.push('  ' + r.text); }); if (d.severity.would_change_if) L.push('  What would change this: ' + d.severity.would_change_if); L.push(''); }
    if (d.environment && d.environment.length) { L.push('Environment'); d.environment.forEach(function (r) { L.push('  ' + r.field + ': ' + r.value); }); L.push(''); }
    if (d.evidence_missing && d.evidence_missing.length) { L.push('Evidence still missing'); d.evidence_missing.forEach(function (m) { L.push('  ' + m.item + ' (' + m.why + ')'); }); L.push(''); }
    if (d.suspected_cause && d.suspected_cause.text) L.push('Your suspicion, not confirmed: ' + d.suspected_cause.text);
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function onCopy() {
    var text = draftText(S.draft), done = function () { say('Copied'); var b = $('copy-btn'); b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy as text'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { say('Select the text and copy it'); } ta.remove();
    }
  }

  /* feedback */
  function onFeedback(yes) {
    $('fb-yes').setAttribute('aria-pressed', String(yes)); $('fb-no').setAttribute('aria-pressed', String(!yes));
    post('/feedback', { feedbackToken: S.feedbackToken, useful: yes, missingText: null });
    if (yes) { show('fb-form', false); show('fb-thanks', true); } else { show('fb-thanks', false); show('fb-form', true); $('fb-text').focus(); }
  }
  function onFeedbackText(e) {
    e.preventDefault(); var t = $('fb-text').value.trim();
    if (t) post('/feedback', { feedbackToken: S.feedbackToken, useful: false, missingText: t });
    show('fb-form', false); show('fb-thanks', true);
  }

  /* local preview only: a canned server so the page can be reviewed without the portal */
  function boot() {
    var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]mock=1\b/.test(location.search);
    if (!local) { init(); return; }
    var s = document.createElement('script'); s.src = '/v2/demo/preview/mock.js'; s.onload = function () { window.BUGIT_DEMO_API = '/__mock'; API = '/__mock'; TRIAL_BEACON = '/__mock/event'; init(); }; s.onerror = init; document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
