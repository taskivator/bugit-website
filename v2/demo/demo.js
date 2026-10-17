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
    { t: 'Checkout crash', tag: 'Mobile', note: 'Checkout crashed when I tapped Pay on the order screen. It happened twice today on my phone. Last week it worked fine.' },
    { t: 'Stuck upload', tag: 'Web', note: 'Uploads sometimes get stuck at 100 percent and never finish. Not every time, maybe one in five. I have no idea what triggers it.' },
    { t: 'Wrong total', tag: 'Billing', note: 'After the update, the invoice total shows 0.00 for orders with a discount code. I think the new discount code change broke it.' },
    { t: 'Sign in loop', tag: 'Login', note: 'Signing in with company SSO sends me back to the login page. Password login works. Only some people in our team have this.' },
    { t: 'Slow feed', tag: 'Mobile', note: 'The feed takes about 12 seconds to load since the last update. It was instant before. Wifi and mobile data are both slow.' },
    { t: 'API error', tag: 'API', note: 'POST to the invoices endpoint returns a 500 when currency is empty. It should be a 400 with a clear message. Only seen on staging.' },
    { t: 'Editor freeze', tag: 'Desktop', note: 'The editor freezes for about a minute when I save to the network drive. Saving to the local disk is fine. Started this week.' },
    { t: 'Duplicate file', tag: 'Desktop', note: 'Sometimes saving a document right after autosave creates a second copy named Report (1). Maybe one time in ten.' }
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

  /* a styled, keyboard operable picker that wraps a native select (the select stays the source of truth) */
  var PICK = {
    jira: ['Ji', '#2684ff', 'Rich text'], github: ['Gh', '#8b949e', 'Markdown'], gitlab: ['Gl', '#fc6d26', 'Markdown'],
    ado: ['Az', '#0078d4', 'Rich text'], linear: ['Li', '#5e6ad2', 'Markdown'], youtrack: ['Yt', '#ff318c', 'Markdown'],
    shortcut: ['Sh', '#8d4bff', 'Markdown'], clickup: ['Cu', '#7b68ee', 'Markdown'], asana: ['As', '#f06a6a', 'Rich text'],
    trello: ['Tr', '#0079bf', 'Markdown'], bugzilla: ['Bz', '#d4a72c', 'Plain text']
  };
  function enhancePick(sel) {
    var wrap = el('div', 'd-pick'), btn = el('button', 'd-pick-btn'), list = el('ul', 'd-pick-list'), lid = sel.id + '-list';
    btn.type = 'button'; btn.id = sel.id + '-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', lid);
    var lab = document.querySelector('label[for="' + sel.id + '"]');
    if (lab) { if (!lab.id) lab.id = sel.id + '-lab'; btn.setAttribute('aria-labelledby', lab.id + ' ' + btn.id); lab.addEventListener('click', function (e) { e.preventDefault(); btn.focus(); }); }
    list.id = lid; list.setAttribute('role', 'listbox'); list.hidden = true; list.tabIndex = -1;
    if (lab) list.setAttribute('aria-labelledby', lab.id);
    function badge(v) {
      var p = PICK[v] || ['?', '#999', ''], b = el('span', 'd-pick-b'), L = window.BUGIT_LOGOS || {}, svgText = L[v === 'ado' ? 'azuredevops' : v];
      b.setAttribute('aria-hidden', 'true');
      if (svgText) {
        // The site's own logo set (v2/logos.js, a fixed file we ship), parsed by the HTML parser so the svg gets its namespace.
        var tpl = document.createElement('template'); tpl.innerHTML = svgText;
        var node = tpl.content.firstElementChild;
        if (node && node.nodeName.toLowerCase() === 'svg') { b.appendChild(node); return b; }
      }
      b.textContent = p[0]; b.style.setProperty('--b', p[1]); b.classList.add('is-letters'); return b;
    }
    var opts = Array.prototype.map.call(sel.options, function (o) {
      var li = el('li', 'd-pick-o'); li.setAttribute('role', 'option'); li.id = sel.id + '-o-' + o.value; li.setAttribute('data-v', o.value);
      li.appendChild(badge(o.value)); li.appendChild(el('span', 'd-pick-n', o.text)); li.appendChild(el('span', 'd-pick-f', (PICK[o.value] || [])[2] || ''));
      li.appendChild(svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>')); li.lastChild.setAttribute('class', 'd-pick-ck');
      list.appendChild(li); return li;
    });
    var active = 0;
    function paint() {
      var cur = sel.value; btn.textContent = '';
      btn.appendChild(badge(cur)); btn.appendChild(el('span', 'd-pick-n', sel.options[sel.selectedIndex].text));
      var f = el('span', 'd-pick-f', (PICK[cur] || [])[2] || ''); btn.appendChild(f);
      var ch = svg('<path d="M6 9l6 6 6-6"/>'); ch.setAttribute('class', 'd-pick-ch'); btn.appendChild(ch);
      opts.forEach(function (li, i) { var on = li.getAttribute('data-v') === cur; li.setAttribute('aria-selected', String(on)); if (on) active = i; });
    }
    function setActive(i) { active = (i + opts.length) % opts.length; opts.forEach(function (li, j) { li.classList.toggle('is-active', j === active); }); list.setAttribute('aria-activedescendant', opts[active].id); opts[active].scrollIntoView({ block: 'nearest' }); }
    function openL() { list.hidden = false; btn.setAttribute('aria-expanded', 'true'); wrap.classList.add('is-open'); setActive(active); list.focus(); }
    function closeL(back) { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); wrap.classList.remove('is-open'); if (back) btn.focus(); }
    function choose(i) { sel.value = opts[i].getAttribute('data-v'); paint(); closeL(true); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    btn.addEventListener('click', function () { if (list.hidden) openL(); else closeL(true); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openL(); } });
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); closeL(true); }
      else if (e.key === 'Tab') { closeL(false); }
      else if (e.key.length === 1) { var k = e.key.toLowerCase(), n = opts.length; for (var s = 1; s <= n; s++) { var j = (active + s) % n; if (opts[j].textContent.toLowerCase().charAt(0) === k) { setActive(j); break; } } }
    });
    list.addEventListener('click', function (e) { var li = e.target.closest('.d-pick-o'); if (li) choose(opts.indexOf(li)); });
    document.addEventListener('click', function (e) { if (!list.hidden && !wrap.contains(e.target)) closeL(false); });
    sel.classList.add('d-native'); sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true');
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(btn); wrap.appendChild(list); wrap.appendChild(sel);
    sel._refresh = paint; paint();
  }

  /* start */
  function init() {
    var note = $('note');
    note.addEventListener('input', onCount); onCount();
    var grid = $('ex-grid');
    EXAMPLES.forEach(function (x) {
      var b = el('button', 'd-ex'); b.type = 'button';
      var top = el('span', 'd-ex-top'); top.appendChild(el('span', 'd-ex-t', x.t)); top.appendChild(el('span', 'd-ex-g', x.tag));
      b.appendChild(top); b.appendChild(el('span', 'd-ex-s', x.note));
      b.addEventListener('click', function () { note.value = x.note; onCount(); clearError('note-error'); note.focus(); });
      grid.appendChild(b);
    });
    $('note-form').addEventListener('submit', onSubmitNote);
    $('q-form').addEventListener('submit', function (e) { e.preventDefault(); sendDraft(collectAnswers()); });
    $('q-skip').addEventListener('click', function () { sendDraft([]); });
    $('use-sep').addEventListener('change', renderCopyPane);
    $('copy-title').addEventListener('click', onCopyTitle);
    $('copy-body').addEventListener('click', onCopyBody);
    enhancePick($('tracker')); enhancePick($('tracker2'));
    $('tracker').addEventListener('change', function () { $('tracker2').value = $('tracker').value; $('tracker2')._refresh(); resetSep(); renderCopyPane(); });
    $('tracker2').addEventListener('change', function () { $('tracker').value = $('tracker2').value; $('tracker')._refresh(); resetSep(); renderCopyPane(); });
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
      if (!res.ok) { panes('pane-note'); showError('note-error', codeOf(res)); outState('Your draft appears here'); focusHead('h-note'); return; }
      var d = res.data; S.runToken = d.runToken; S.redactedNote = d.redactedNote; S.redactions = d.redactions || {}; S.questions = d.questions || [];
      showReadback();
      if (S.questions.length) { renderQuestions(); } else { sendDraft([]); }
    });
  }

  var QUICK = {
    os: ['Windows', 'macOS', 'Linux', 'iOS', 'Android'],
    device: ['Phone', 'Tablet', 'Laptop', 'Desktop PC'],
    often: ['Every time', 'Most times', 'Sometimes', 'Once'],
    since: ['After the latest update', 'It always did this'],
    impact: ['I am blocked', 'There is a workaround', 'A minor annoyance']
  };
  function renderQuestions() {
    var list = $('q-list'); list.textContent = '';
    S.questions.slice(0, 8).forEach(function (q) {
      var wrap = el('div', 'd-q'), id = 'q-' + q.id;
      var lab = el('label', null, q.text); lab.setAttribute('for', id);
      var row = el('div', 'd-q-row'), inp = document.createElement('input');
      inp.type = 'text'; inp.id = id; inp.maxLength = 600; inp.autocomplete = 'off'; inp.setAttribute('data-q', q.id);
      var idk = el('button', 'd-idk', "I don't know"); idk.type = 'button'; idk.setAttribute('aria-pressed', 'false');
      idk.addEventListener('click', function () { var on = idk.getAttribute('aria-pressed') !== 'true'; idk.setAttribute('aria-pressed', String(on)); inp.disabled = on; if (on) inp.value = ''; });
      row.appendChild(inp); row.appendChild(idk); wrap.appendChild(lab); wrap.appendChild(row);
      var quick = QUICK[q.field];
      if (quick) {
        var chips = el('div', 'd-q-chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Quick answers');
        quick.forEach(function (t) {
          var c = el('button', 'd-q-chip', t); c.type = 'button';
          c.addEventListener('click', function () { inp.disabled = false; idk.setAttribute('aria-pressed', 'false'); inp.value = t; inp.focus(); });
          chips.appendChild(c);
        });
        wrap.appendChild(chips);
      }
      list.appendChild(wrap);
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
        outState('Your draft appears here'); return;
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
    resetSep(); renderCopyPane(); show('out-ghost', false); show('out-draft', true);
    $('fb-yes').setAttribute('aria-pressed', 'false'); $('fb-no').setAttribute('aria-pressed', 'false');
    show('fb-form', false); show('fb-thanks', false);
  }

  function onAgain() {
    S.draft = null; S.runToken = ''; S.state = 'idle';
    show('out-draft', false); show('out-ghost', true); show('read-box', false); show('redact-sum', false); show('again', false);
    clearError('note-error'); panes('pane-note'); setStep('note'); outState('Your draft appears here'); $('note').value = ''; onCount(); focusHead('h-note');
  }

  /* copy for the chosen tracker: the same draft laid out the way that tracker's own users write it.
     sep lists the details that tracker keeps in their own fields (from the tracker research): those get their own copy card. */
  var F = { prod: 'Product or area', build: 'Build or version', os: 'Operating system', dev: 'Device or browser', net: 'Network or setup', often: 'How often', since: 'Since when or last good version' };
  var TRK = {
    jira: { fmt: 'html', h: 'h3', body: 'Copy description', L: { steps: 'Steps to reproduce', exp: 'Expected result', act: 'Actual result', env: 'Environment', more: 'Additional information' },
      sev: ['Priority', { Critical: 'Highest', High: 'High', Medium: 'Medium', Low: 'Low' }], area: 'Labels', src: 'Checked on a Jira Cloud test project with the default setup.',
      sepLabel: 'My Jira form has an Environment field (company managed projects can add it). Give me a copy card for it.', sepDefault: false,
      sep: [{ label: 'Environment', rows: [F.os, F.dev, F.net, F.often, F.since], lines: true, note: 'Paste into the Environment field.' }],
      sepPicks: [{ label: 'Affects versions', rows: [F.build], note: 'A list of your project versions. Choose the closest one.' }],
      none: 'A default Jira project has no Environment, Affects version or Component field on its create form, so the details stay in the description.' },
    ado: { fmt: 'html', h: 'b', body: 'Copy Repro Steps', L: { steps: 'Steps to reproduce', exp: 'Expected behavior', act: 'Actual behavior', env: 'Reproducibility', more: 'Additional information' },
      sev: ['Severity', { Critical: '1 - Critical', High: '2 - High', Medium: '3 - Medium', Low: '4 - Low' }], area: 'Tags', src: 'Checked on an Azure DevOps test project (Agile process).',
      sepLabel: 'Give me copy cards for the System Info and Found In Build fields.', sepDefault: true,
      sep: [
        { label: 'System Info', rows: [F.os, F.dev, F.net], lines: true, html: true, note: 'Paste into the System Info field, beside Repro Steps.' },
        { label: 'Found In Build', rows: [F.build], note: 'Paste into the Found In Build field.' }],
      extraPick: [{ field: 'Priority', value: 'Choose 1 to 4 in triage', note: 'Priority is a different scale from Severity.' }] },
    bugzilla: { fmt: 'plain', h: ':', body: 'Copy description', L: { steps: 'Steps to Reproduce', exp: 'Expected Results', act: 'Actual Results', env: 'Reproducibility', more: 'Additional Information' },
      sev: ['Severity', { Critical: 'critical', High: 'major', Medium: 'normal', Low: 'minor' }], sevNote: 'Mozilla asks reporters to leave Severity to triage, so skip it if your team does the same.', area: 'Component',
      src: 'Not yet checked on a live instance. Based on the Bugzilla documentation.',
      picks: [{ field: 'Product', fixed: 'Choose the product yourself' }, { field: 'Version', rows: [F.build], note: 'A list of versions. Choose the closest one.' }, { field: 'Platform and OS', rows: [F.os, F.dev], note: 'Two lists. Choose the closest entries.' }],
      none: 'Bugzilla keeps version, platform and OS in drop down lists, so there is nothing to paste into them. The build and environment also stay in the description.' },
    youtrack: { fmt: 'md', h: '##', body: 'Copy description', L: { steps: 'Steps to reproduce', exp: 'Expected result', act: 'What happens instead', env: 'Environment', more: 'Additional information' },
      sev: ['Priority', { Critical: 'Critical', High: 'Major', Medium: 'Normal', Low: 'Minor' }], area: 'Subsystem', src: 'Not yet checked on a live instance. Based on the YouTrack documentation.',
      picks: [{ field: 'Affected versions', rows: [F.build], note: 'A list your project defines. Choose the closest one.' }],
      none: 'YouTrack has no Environment field by default, and Affected versions is a list, so the details stay in the description.' },
    asana: { fmt: 'html', h: 'b', body: 'Copy description', L: { steps: 'Steps to reproduce', exp: 'Expected behavior', act: 'What happened', env: 'Environment', more: 'Additional information' },
      sev: ['Priority (custom field)', { Critical: 'High', High: 'High', Medium: 'Medium', Low: 'Low' }], area: 'Tags', src: 'Checked on an Asana test project from the default template.', none: 'Asana has no field for build or environment, so they stay in the description.' },
    github: { fmt: 'md', h: '###', body: 'Copy description', L: { steps: 'Steps to reproduce', exp: 'Expected behavior', act: 'Actual behavior', env: 'Environment', more: 'Additional context' },
      area: 'Labels', src: 'Checked on a GitHub test repository.', none: 'GitHub issues have no field for build or environment, and no severity field, so they stay in the description.' },
    gitlab: { fmt: 'md', h: '###', body: 'Copy description', L: { steps: 'Steps to reproduce', exp: 'What is the expected *correct* behavior?', act: 'What is the current *bug* behavior?', env: 'Environment', more: 'Additional information' },
      area: 'Labels', src: 'Not yet checked on a live instance. Based on the GitLab documentation.', none: 'GitLab issues have no field for build or environment, so they stay in the description. Severity is a label if your project uses them.' },
    linear: { fmt: 'md', h: '##', body: 'Copy description', L: { steps: 'Steps to reproduce', exp: 'Expected behavior', act: 'Actual behavior', env: 'Environment', more: 'Additional context' },
      sev: ['Priority', { Critical: 'Urgent', High: 'High', Medium: 'Medium', Low: 'Low' }], area: 'Labels', src: 'Checked on a Linear test team.', none: 'Linear has no field for build or environment, so they stay in the description.' },
    shortcut: { fmt: 'md', h: '**', body: 'Copy description', L: { steps: 'Steps to reproduce', exp: 'Expected result', act: 'Actual result', env: 'Environment', more: 'Additional information' },
      sev: ['Priority (custom field)', { Critical: 'Highest', High: 'High', Medium: 'Medium', Low: 'Low' }], area: 'Labels', src: 'Checked on a Shortcut test workspace.', none: 'Shortcut has no field for build or environment, so they stay in the description.' },
    clickup: { fmt: 'md', h: '##', body: 'Copy description', L: { steps: 'Steps to reproduce', exp: 'Expected result', act: 'Actual result', env: 'Environment', more: 'Notes and attachments' },
      sev: ['Priority', { Critical: 'Urgent', High: 'High', Medium: 'Normal', Low: 'Low' }], area: 'Tags', src: 'Checked on a ClickUp test list.', none: 'ClickUp has no field for build or environment by default, so they stay in the description.' },
    trello: { fmt: 'md', h: '##', body: 'Copy description', L: { steps: 'Steps to reproduce', exp: 'Expected result', act: 'Actual result', env: 'Environment', more: 'Attachments and logs' },
      area: 'Labels', src: 'Checked on a Trello test board.', none: 'Trello cards have no priority, build or environment field, so they stay in the description.' }
  };
  var isUnk = function (it) { return !it || it.basis === 'unknown' || /^UNKNOWN\b/.test(it.text); };
  var chk = function (it) { return it.basis === 'inferred' ? ' (inferred, please check)' : ''; };
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function splitTitle(t) { var m = /^\s*\[([^\]]{1,40})\]\s+(.*)$/.exec(t); return m ? { tag: m[1], text: m[2] } : { tag: '', text: t }; }
  function useSep(key) { return !!(TRK[key].sep && $('use-sep').checked); }
  function rowsOf(d) { var r = {}; (d.environment || []).forEach(function (x) { r[x.field] = x; }); return r; }

  function sectionsOf(d, key) {
    var more = [], sepRows = {};
    if (useSep(key)) TRK[key].sep.forEach(function (g) { g.rows.forEach(function (r) { sepRows[r] = true; }); });
    (d.evidence_missing || []).forEach(function (m) { more.push(m.item + ': ' + m.why); });
    return {
      steps: (d.steps || []).filter(function (x) { return !isUnk(x); }).map(function (x) { return x.text + chk(x); }),
      exp: d.expected && !isUnk(d.expected) ? d.expected.text + chk(d.expected) : '',
      act: d.actual && !isUnk(d.actual) ? d.actual.text + chk(d.actual) : '',
      env: (d.environment || []).filter(function (x) { return !isUnk(x) && !sepRows[x.field]; }).map(function (x) { return [x.field, x.value + chk(x)]; }),
      susp: d.suspected_cause && d.suspected_cause.text ? 'Reporter suspicion, not confirmed: ' + d.suspected_cause.text : '',
      more: more
    };
  }
  function layout(d, key) {
    var T = TRK[key], S = sectionsOf(d, key), md = T.fmt === 'md', html = T.fmt === 'html', out = [];
    function head(label) {
      if (html) return T.h === 'b' ? '<p><strong>' + esc(label) + '</strong></p>' : '<' + T.h + '>' + esc(label) + '</' + T.h + '>';
      if (T.fmt === 'plain') return label + ':';
      return T.h === '**' ? '**' + label + '**' : T.h + ' ' + label;
    }
    function para(t) { return html ? '<p>' + esc(t) + '</p>' : t; }
    function ol(a) { return html ? '<ol>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : a.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n'); }
    function ul(a) { return html ? '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : a.map(function (x) { return '- ' + x; }).join('\n'); }
    function block(label, body) { out.push(head(label) + (html ? '' : '\n') + body); }
    if (S.steps.length) block(T.L.steps, ol(S.steps));
    if (S.exp) block(T.L.exp, para(S.exp));
    if (S.act) block(T.L.act, para(S.act));
    if (S.env.length) block(T.L.env, ul(S.env.map(function (r) { return (md ? '**' + r[0] + ':** ' : r[0] + ': ') + r[1]; })));
    var extra = [];
    if (S.susp) extra.push(S.susp);
    if (S.more.length) extra.push('Still needed from the reporter:');
    if (extra.length) {
      var body = extra.map(para).join(html ? '' : '\n\n');
      if (S.more.length) body += (html ? '' : '\n') + ul(S.more);
      block(T.L.more, body);
    }
    var text = out.join(html ? '' : '\n\n');
    return html ? text : text + '\n';
  }
  function plainOf(h) { return h.replace(/<\/(p|h3|li|ol|ul)>/g, '\n').replace(/<br\s*\/?>/g, '\n').replace(/<li>/g, '- ').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim() + '\n'; }

  /* the separate cards: one per field the tracker keeps on its own */
  function sepCards(d, key) {
    var T = TRK[key];
    if (!T.sep || !useSep(key)) return [];
    var rows = {}; (d.environment || []).forEach(function (x) { rows[x.field] = x; });
    return T.sep.map(function (g) {
      var have = g.rows.map(function (r) { return rows[r]; }).filter(function (x) { return x && !isUnk(x); });
      var checkIt = have.some(function (x) { return x.basis === 'inferred'; });
      var text = g.lines ? have.map(function (x) { return x.field + ': ' + x.value; }).join('\n') : have.map(function (x) { return x.value; }).join(', ');
      var htmlText = g.html ? '<p>' + have.map(function (x) { return esc(x.field + ': ' + x.value); }).join('<br>') + '</p>' : '';
      return { label: g.label, note: g.note, text: text, html: htmlText, checkIt: checkIt };
    });
  }

  function resetSep() { var T = TRK[$('tracker').value]; $('use-sep').checked = T.sep ? T.sepDefault !== false : true; }
  function currentTracker() { return $('tracker').value; }
  function valuesOf(d, rows) {
    var r = rowsOf(d), have = rows.map(function (n) { return r[n]; }).filter(function (x) { return x && !isUnk(x); });
    return { text: have.map(function (x) { return x.value; }).join(', '), inferred: have.some(function (x) { return x.basis === 'inferred'; }) };
  }
  function picksOf(d, key) {
    var T = TRK[key], out = [], t = splitTitle(d.title.text), lvl = d.severity && d.severity.level;
    if (T.sev) {
      var v = T.sev[1][lvl];
      out.push({ field: T.sev[0], value: v || 'Not enough in your note to suggest one', note: T.sevNote || '' });
    }
    if (t.tag) out.push({ field: T.area, value: t.tag, note: 'Your own ' + T.area.toLowerCase() + ' may use different names. Choose the closest.' });
    (T.picks || []).forEach(function (p) {
      if (p.fixed) { out.push({ field: p.field, value: p.fixed, note: '' }); return; }
      var v = valuesOf(d, p.rows);
      out.push({ field: p.field, value: v.text || 'Not given in your note', note: p.note + (v.inferred ? ' Part of this was inferred, so check it.' : '') });
    });
    if (T.sep && useSep(key) && T.sepPicks) T.sepPicks.forEach(function (p) {
      var v = valuesOf(d, p.rows);
      out.push({ field: p.label, value: v.text || 'Not given in your note', note: p.note + (v.inferred ? ' Part of this was inferred, so check it.' : '') });
    });
    (T.extraPick || []).forEach(function (p) { out.push(p); });
    return out;
  }
  function renderCopyPane() {
    if (!S.draft) return;
    var key = currentTracker(), T = TRK[key], body = layout(S.draft, key);
    $('fmt-prev').textContent = T.fmt === 'html' ? plainOf(body) : body;
    $('copy-body').textContent = T.body;
    $('sep-toggle').hidden = !T.sep;
    if (T.sep) $('sep-toggle-t').textContent = T.sepLabel;
    var none = $('sep-none'); none.hidden = !T.none || (T.sep && useSep(key)); none.textContent = T.none || '';
    var cards = $('sep-cards'); cards.textContent = '';
    sepCards(S.draft, key).forEach(function (c) {
      var card = el('div', 'd-sep'), top = el('div', 'd-sep-top');
      top.appendChild(el('b', null, c.label));
      var btn = el('button', 'btn btn-ghost btn-sm', 'Copy'); btn.type = 'button'; btn.setAttribute('aria-label', 'Copy ' + c.label);
      if (!c.text) { btn.disabled = true; btn.textContent = 'Not given'; }
      btn.addEventListener('click', function () { if (c.html) copyText(c.html, btn, 'Copy', true); else copyText(c.text, btn, 'Copy', false); });
      top.appendChild(btn); card.appendChild(top);
      card.appendChild(el('pre', 'd-sep-v', c.text || 'Nothing in your note for this field.'));
      card.appendChild(el('p', 'd-sep-n', c.note + (c.checkIt ? ' Part of this was inferred, so check it first.' : '')));
      cards.appendChild(card);
    });
    var picks = picksOf(S.draft, key), pc = $('pick-cards'); pc.textContent = '';
    $('pick-h').hidden = !picks.length;
    picks.forEach(function (p) {
      var card = el('div', 'd-sep d-pk'), top = el('div', 'd-sep-top');
      top.appendChild(el('b', null, p.field)); top.appendChild(el('span', 'd-pk-tag', 'Pick it yourself'));
      card.appendChild(top); card.appendChild(el('pre', 'd-sep-v', p.value));
      if (p.note) card.appendChild(el('p', 'd-sep-n', p.note));
      pc.appendChild(card);
    });
    $('fmt-src').textContent = T.src || '';
    $('fmt-set').textContent = '';
  }
  function copyText(text, btn, label, html) {
    var done = function () { say('Copied'); btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 1800); };
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = html ? plainOf(text) : text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { say('Select the text and copy it'); } ta.remove();
    }
    if (html && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      var item = new window.ClipboardItem({ 'text/html': new Blob([text], { type: 'text/html' }), 'text/plain': new Blob([plainOf(text)], { type: 'text/plain' }) });
      navigator.clipboard.write([item]).then(done, fallback);
    } else if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(html ? plainOf(text) : text).then(done, fallback); } else { fallback(); }
  }
  function onCopyTitle() { copyText(splitTitle(S.draft.title.text).text, $('copy-title'), 'Copy title', false); }
  function onCopyBody() { var k = currentTracker(); copyText(layout(S.draft, k), $('copy-body'), TRK[k].body, TRK[k].fmt === 'html'); }

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
    if (local) window.__demoTest = { layout: layout, sepCards: sepCards, picksOf: picksOf, TRK: TRK, S: S };
    if (!local) { init(); return; }
    var s = document.createElement('script'); s.src = '/v2/demo/preview/mock.js'; s.onload = function () { window.BUGIT_DEMO_API = '/__mock'; API = '/__mock'; TRIAL_BEACON = '/__mock/event'; init(); }; s.onerror = init; document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
