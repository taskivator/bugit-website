/* A small BugIt blip that trails the mouse. Decoration only: no text, no pointer events, hidden for
   anyone who asked for less motion, on touch screens and in forced colours mode. Transform only, one
   requestAnimationFrame loop that stops when the blip has caught up, so an idle page does no work. */
(function () {
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  if (mq('(prefers-reduced-motion: reduce)') || mq('(pointer: coarse)') || mq('(hover: none)') || mq('(forced-colors: active)')) return;

  var el = document.createElement('img');
  el.src = '/public/brand/blip-logo.svg';
  el.alt = '';
  el.width = 34; el.height = 34;
  el.setAttribute('aria-hidden', 'true');
  el.className = 'blip-follow';
  el.decoding = 'async';
  document.body.appendChild(el);

  var tx = -100, ty = -100, x = -100, y = -100, rot = 0, raf = 0, idle = 0, shown = false, squash = 0;
  var OFFSET = 22;

  function frame() {
    raf = 0;
    var dx = tx + OFFSET - x, dy = ty + OFFSET - y;
    x += dx * 0.16; y += dy * 0.16;
    rot += (Math.max(-22, Math.min(22, dx * 0.35)) - rot) * 0.2;
    squash *= 0.82;
    var s = 1 - squash * 0.25;
    el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(1) + 'deg) scale(' + s.toFixed(3) + ')';
    if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3 || Math.abs(rot) > 0.3 || squash > 0.01) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function show(on) {
    if (on === shown) return;
    shown = on; el.style.opacity = on ? '1' : '0';
  }
  function overField(t) { return !!(t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]')); }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (!shown && x < 0) { x = e.clientX + OFFSET; y = e.clientY + OFFSET; }
    tx = e.clientX; ty = e.clientY;
    show(!overField(e.target));
    clearTimeout(idle); idle = setTimeout(function () { show(false); }, 4500);
    kick();
  }, { passive: true });
  document.addEventListener('pointerdown', function (e) { if (!e.pointerType || e.pointerType === 'mouse') { squash = 1; kick(); } }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { show(false); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) show(false); });
})();
