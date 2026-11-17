/* TECHMINES logo toy.
   Turns the logo case in the intro into something you can play with. The case keeps its
   look and its place, and now hangs from the header on a thin trace: drag it, throw it,
   and it swings back to rest. Click it (or press Enter) and it turns over to show the
   page's mainboard: the time in India, three switches that drive the real page (theme,
   music, backdrop) and the contact links.

   Without this script the logo is simply the static case. With reduced motion there is no
   swinging: the case stays put and still turns over. */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  var fig = document.getElementById('hero-logo');
  var front = fig && fig.querySelector('.logo-case');
  var header = document.querySelector('header');
  if (!hero || !front) return;

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = {
    get: function (k) { try { return localStorage.getItem('tm-toy-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('tm-toy-' + k, v); } catch (e) { /* optional */ } }
  };

  // ------------------------------------------------------------------ build
  // .toy swings, .toy-in turns over, the original case is the front face
  var toy = document.createElement('div'), inner = document.createElement('div');
  toy.className = 'toy';
  inner.className = 'toy-in';
  front.classList.add('toy-front');
  fig.insertBefore(toy, front);
  toy.appendChild(inner);
  inner.appendChild(front);
  var badge = fig.querySelector('.hero-badge');
  if (badge) inner.appendChild(badge);

  function row(key, name, sub) {
    return '<div class="toy-row" data-row="' + key + '"><div><span>' + name + '</span><em>' + sub + '</em></div>' +
      '<button type="button" class="toy-sw" role="switch" aria-checked="false" data-k="' + key + '" aria-label="' + name + '"></button></div>';
  }
  inner.insertAdjacentHTML('beforeend',
    '<div class="logo-case toy-back">' +
      '<span class="case-corner case-corner--tl"></span><span class="case-corner case-corner--tr"></span><span class="case-corner case-corner--bl"></span><span class="case-corner case-corner--br"></span>' +
      '<div class="toy-panel">' +
        '<div class="toy-top">Mainboard<span>TM-01<i></i></span></div>' +
        '<div class="toy-oled"><b class="toy-clock">--:--:--</b><span class="toy-stat">IST</span></div>' +
        row('theme', 'Light', 'Theme') + row('music', 'Music', 'Walkman') + row('glow', 'Circuit', 'Backdrop') +
        '<nav class="toy-pads" aria-label="Contact"><a href="mailto:Pjangid.work@gmail.com">Email</a>' +
          '<a href="https://www.linkedin.com/in/pranavjangid" target="_blank" rel="noopener">LinkedIn</a>' +
          '<a href="https://github.com/TECHMINEs" target="_blank" rel="noopener">GitHub</a></nav>' +
      '</div>' +
    '</div>');
  var back = inner.querySelector('.toy-back');
  fig.insertAdjacentHTML('beforeend', '<p class="toy-hint" aria-hidden="true"></p>');
  hero.insertAdjacentHTML('beforeend',
    '<svg class="toy-cable" aria-hidden="true"><path class="tc-glow"/><path class="tc-base"/><path class="tc-pulse" pathLength="100"/>' +
    '<rect width="13" height="13"/><rect class="tc-dot" width="5" height="5"/><rect width="9" height="9"/><rect class="tc-dot" width="3" height="3"/></svg>');
  var cableSvg = hero.querySelector('.toy-cable');
  var cable = cableSvg.querySelectorAll('path'), nodes = cableSvg.querySelectorAll('rect');
  var hint = fig.querySelector('.toy-hint');
  if (store.get('seen')) hint.hidden = true;
  toy.tabIndex = 0;

  // ------------------------------------------------------------------ turning over
  var clockTimer = 0;
  function face() {
    var flipped = toy.classList.contains('is-flipped');
    toy.setAttribute('role', flipped ? 'group' : 'button');
    toy.setAttribute('aria-label', flipped ? 'Page controls and contact links. Press Escape to turn the logo back.' : 'TECHMINES logo. Drag to swing it, or press Enter to turn it over.');
    front.inert = flipped;      // only the face you can see takes focus and clicks
    back.inert = !flipped;
    hint.textContent = flipped ? 'Click the board to turn it back' : 'Drag me · click to turn over';
    clearInterval(clockTimer);
    if (flipped) { sync(); clockTimer = setInterval(sync, 1000); }
  }
  function flip() {
    toy.classList.toggle('is-flipped');
    face();
    seen();
  }
  function seen() { if (!hint.hidden) { hint.classList.add('is-gone'); store.set('seen', '1'); } }

  // The switches drive the real page, and follow it when it changes elsewhere
  var backdrop = document.getElementById('backdrop'), dim = false;
  var walkman = function () { return document.querySelector('.wm'); };
  var acts = {
    theme: function () { var b = document.getElementById('theme-toggle'); if (b) b.click(); },
    music: function () { var k = document.querySelector('.wm-deck .wm-key--play'); if (k) k.dispatchEvent(new MouseEvent('click', { bubbles: true })); },
    glow: function () { dim = !dim; if (backdrop) { backdrop.style.transition = 'opacity .5s'; backdrop.style.opacity = dim ? 0.25 : ''; } }
  };
  var switches = Array.prototype.slice.call(back.querySelectorAll('.toy-sw'));
  var clock = back.querySelector('.toy-clock'), stat = back.querySelector('.toy-stat');
  function sync() {
    var wm = walkman();
    var on = { theme: document.documentElement.classList.contains('is-light'), music: !!(wm && wm.classList.contains('is-playing')), glow: !dim };
    switches.forEach(function (b) { b.setAttribute('aria-checked', String(on[b.dataset.k])); });
    back.querySelector('[data-row="music"]').hidden = !wm;
    clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });
    stat.textContent = 'IST\n' + (wm ? 'MUSIC ' + (on.music ? 'ON' : 'OFF') + '\n' : '') + (on.theme ? 'LIGHT' : 'DARK');
  }
  switches.forEach(function (b) { b.addEventListener('click', function () { acts[b.dataset.k](); sync(); setTimeout(sync, 400); }); });

  // ------------------------------------------------------------------ placement
  // Tell the stylesheet where the intro text really ends, so the logo can sit in the free
  // space between the text and the Walkman (see "Logo toy" in style.css).
  function place() {
    var text = hero.querySelector('.hero-text'), right = 0;
    if (!text || window.innerWidth <= 960) { fig.style.removeProperty('--text-right'); return; }
    // the ink itself: every run of text, plus the buttons and pills, not the full-width blocks around them
    var walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT), node, range = document.createRange();
    while ((node = walker.nextNode())) {
      if (!node.nodeValue.trim()) continue;
      range.selectNodeContents(node);
      Array.prototype.forEach.call(range.getClientRects(), function (r) { right = Math.max(right, r.right); });
    }
    Array.prototype.forEach.call(text.querySelectorAll('a, button, .status'), function (el) { right = Math.max(right, el.getBoundingClientRect().right); });
    fig.style.setProperty('--text-right', Math.ceil(right) + 'px');
  }

  // ------------------------------------------------------------------ the swing
  // A short rope: a fixed point under the header, N links of trace, then the case as one
  // stiff, heavier link. At rest the case hangs exactly where it sits in the layout.
  var N = 8, L, CL, ax, ay, cx, cy, pt = null, drag = null;
  var raf = 0, quiet = 0, visible = true, lastT = 0, acc = 0, angle = 0;

  function init(startAngle) {
    toy.style.transform = '';
    var hr = hero.getBoundingClientRect(), r = toy.getBoundingClientRect();
    var heroTop = hr.top + window.scrollY, headerH = header ? header.offsetHeight : 0;
    toy.classList.toggle('is-compact', r.width < 345);     // the back tightens up when the case is small
    toy.classList.toggle('is-tiny', r.width < 285);
    cx = r.left + r.width / 2 - hr.left;
    cy = r.top - hr.top;
    ax = cx;
    ay = headerH - heroTop;
    if (cy - ay > 460) ay = cy - 46;          // stacked layout: the logo sits below the text, so the trace is short
    L = (cy - ay) / N;
    CL = r.height * 0.5;
    pt = [];
    for (var i = 0; i <= N + 1; i++) {
      var d = i <= N ? i * L : N * L + CL, x = ax + Math.sin(startAngle) * d, y = ay + Math.cos(startAngle) * d;
      pt.push({ x: x, y: y, ox: x, oy: y });
    }
    nodes[0].setAttribute('x', ax - 6.5); nodes[0].setAttribute('y', ay - 1);
    nodes[1].setAttribute('x', ax - 2.5); nodes[1].setAttribute('y', ay + 3);
  }

  function step() {
    var n = pt.length, i, k, p;
    for (i = 1; i < n; i++) {
      p = pt[i];
      var vx = (p.x - p.ox) * 0.99, vy = (p.y - p.oy) * 0.99;
      p.ox = p.x; p.oy = p.y;
      p.x += Math.max(-40, Math.min(40, vx));
      p.y += Math.max(-40, Math.min(40, vy)) + (i === n - 1 ? 1.6 : 0.6);
    }
    var A = pt[N], B = pt[N + 1];
    if (drag && drag.tx != null) {
      var dx = drag.tx - (A.x + B.x) / 2, dy = drag.ty - (A.y + B.y) / 2;
      A.x += dx; A.y += dy; B.x += dx; B.y += dy;
    }
    for (k = 0; k < 14; k++) {
      for (i = 0; i < n - 1; i++) {
        var a = pt[i], b = pt[i + 1], len = i === N ? CL : L;
        var ex = b.x - a.x, ey = b.y - a.y, l = Math.hypot(ex, ey) || 1, f = (l - len) / l;
        if (i === 0) { b.x -= ex * f; b.y -= ey * f; }
        else { a.x += ex * f * 0.5; a.y += ey * f * 0.5; b.x -= ex * f * 0.5; b.y -= ey * f * 0.5; }
      }
      pt[0].x = ax; pt[0].y = ay;
    }
  }

  function render() {
    var A = pt[N], B = pt[N + 1], sway = A.x - A.ox, dx = A.x - cx, dy = A.y - cy;
    angle = Math.atan2(-(B.x - A.x), B.y - A.y);
    var resting = !drag && Math.abs(angle) < 0.002 && Math.abs(sway) < 0.03;
    // at rest it sits on whole pixels, so the picture and the text stay sharp
    toy.style.transform = resting
      ? 'translate(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px)'
      : 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) rotate(' + angle.toFixed(4) + 'rad) rotateY(' + Math.max(-18, Math.min(18, sway * 2)).toFixed(2) + 'deg)';
    var d = 'M' + pt.slice(0, N + 1).map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join('L');
    cable[0].setAttribute('d', d); cable[1].setAttribute('d', d); cable[2].setAttribute('d', d);
    nodes[2].setAttribute('x', A.x - 4.5); nodes[2].setAttribute('y', A.y - 4.5);
    nodes[3].setAttribute('x', A.x - 1.5); nodes[3].setAttribute('y', A.y - 1.5);
    return resting;
  }

  // The physics runs at a fixed 60 steps a second whatever the screen's refresh rate, and
  // the loop goes to sleep once the case has come to rest.
  function frame(now) {
    raf = 0;
    acc += Math.min(0.1, lastT ? (now - lastT) / 1000 : 1 / 60);
    lastT = now;
    var steps = 0;
    while (acc >= 1 / 60 && steps < 4) { step(); acc -= 1 / 60; steps++; }
    quiet = render() ? quiet + 1 : 0;
    if (visible && quiet < 45) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }
  function wake() { quiet = 0; if (!raf && pt && !calm && visible && !document.hidden) raf = requestAnimationFrame(frame); }

  function settle() { for (var q = 0; q < 1200; q++) step(); render(); }

  function relayout(first) {
    place();
    init(first && !calm ? 0.14 : 0);
    if (calm || !first) settle();
    cableSvg.classList.add('is-on');
    wake();
  }

  // Start once the intro's entrance animation has finished moving the logo
  var started = false;
  function start() { if (started) return; started = true; relayout(true); }
  var entrance = fig.getAnimations ? fig.getAnimations().map(function (a) { return a.finished; }) : [];
  Promise.all(entrance).then(start, start);
  setTimeout(start, 2500);

  var resizeTimer = 0;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { if (started) relayout(false); }, 140); });
  window.addEventListener('load', function () { if (started && !drag) relayout(false); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (started && !drag) relayout(false); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) wake(); }).observe(fig);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });

  // ------------------------------------------------------------------ hands on
  toy.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toy.classList.contains('is-flipped')) { e.preventDefault(); flip(); toy.focus(); return; }
    if (e.target === toy && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flip(); }
  });
  toy.addEventListener('pointerdown', function (e) {
    if (e.button || e.target.closest('a, button')) return;
    var r = hero.getBoundingClientRect(), A = pt ? pt[N] : null, B = pt ? pt[N + 1] : null;
    drag = { sx: e.clientX, sy: e.clientY, m: 0 };
    if (A) { drag.gx = e.clientX - r.left - (A.x + B.x) / 2; drag.gy = e.clientY - r.top - (A.y + B.y) / 2; }
    try { toy.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
  });
  toy.addEventListener('pointermove', function (e) {
    if (!drag) return;
    drag.m = Math.max(drag.m, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
    if (calm || !pt || drag.m < 6) return;
    var r = hero.getBoundingClientRect();
    drag.tx = e.clientX - r.left - drag.gx; drag.ty = e.clientY - r.top - drag.gy;
    toy.classList.add('is-held');
    seen();
    wake();
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    toy.addEventListener(ev, function (e) {
      if (!drag) return;
      var tapped = drag.m < 6 && e.type === 'pointerup';
      drag = null;
      toy.classList.remove('is-held');
      if (tapped) flip();
      wake();
    });
  });

  face();
})();
