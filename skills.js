/* Skills: engineering and business panels wired into seven shared results. Picking a
   result lights the skills behind it and draws traces into the centre. Without this
   script the section is a plain list. */
(function () {
  'use strict';

  var fusion = document.getElementById('fusion');
  if (!fusion) return;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var core = fusion.querySelector('.fusion-core'), svg = fusion.querySelector('.fusion-wires');
  var picks = Array.prototype.slice.call(fusion.querySelectorAll('.fusion-pick'));
  var chips = Array.prototype.slice.call(fusion.querySelectorAll('.chip'));
  var title = core.querySelector('.fusion-title'), line = core.querySelector('.fusion-line');
  var proof = core.querySelector('.fusion-proof'), tally = core.querySelector('.fusion-tally');
  var current = Math.max(0, picks.findIndex(function (p) { return p.getAttribute('aria-pressed') === 'true'; }));
  var uses = picks.map(function (p) { return p.dataset.uses.split('|'); });

  function sideOf(chip) { return chip.closest('.fusion-side').dataset.side; }

  function select(i, fromUser) {
    current = (i + picks.length) % picks.length;
    var p = picks[current], set = uses[current], n = { eng: 0, biz: 0 };
    picks.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === current)); });
    chips.forEach(function (c) {
      var on = set.indexOf(c.dataset.skill) !== -1;
      c.classList.toggle('is-lit', on);
      if (on) n[sideOf(c)]++;
    });
    fusion.classList.add('has-pick');
    title.textContent = p.textContent.replace(/^\d+/, '');
    line.textContent = p.dataset.line;
    proof.textContent = p.dataset.proof;
    tally.textContent = n.eng + ' from engineering · ' + n.biz + ' from business';
    if (!calm && core.animate && fromUser !== null) core.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    wire();
  }

  // The traces
  // Each lit skill sends a trace down into the gap under its row, across to the gutter
  // beside the middle column, and into the core. Corners are cut at 45 degrees.
  function route(points) {
    var c = 5, d = '';
    points.forEach(function (p, i) {
      if (i === 0) { d += 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); return; }
      var a = points[i - 1], b = points[i + 1];
      if (!b) { d += 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); return; }
      var la = Math.hypot(p[0] - a[0], p[1] - a[1]) || 1, lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
      var ca = Math.min(c, la / 2), cb = Math.min(c, lb / 2);
      d += 'L' + (p[0] - (p[0] - a[0]) / la * ca).toFixed(1) + ' ' + (p[1] - (p[1] - a[1]) / la * ca).toFixed(1) +
           'L' + (p[0] + (b[0] - p[0]) / lb * cb).toFixed(1) + ' ' + (p[1] + (b[1] - p[1]) / lb * cb).toFixed(1);
    });
    return d;
  }

  function wire() {
    if (!svg) return;
    if (window.innerWidth <= 980) { svg.innerHTML = ''; return; }
    var f = fusion.getBoundingClientRect(), k = core.getBoundingClientRect(), out = '';
    ['eng', 'biz'].forEach(function (side) {
      var panel = fusion.querySelector('.fusion-side--' + side).getBoundingClientRect();
      var lit = chips.filter(function (c) { return c.classList.contains('is-lit') && sideOf(c) === side; })
        .map(function (c) { return c.getBoundingClientRect(); })
        .sort(function (a, b) { return a.top - b.top || a.left - b.left; });
      var left = side === 'eng', edge = left ? k.left : k.right;
      var gap = left ? k.left - panel.right : panel.left - k.right;
      var rows = [];
      lit.forEach(function (r, i) {
        if (rows.indexOf(Math.round(r.top)) === -1) rows.push(Math.round(r.top));
        var lane = rows.length - 1;
        // each row of skills gets its own lane in the gutter, so the bundle reads as a bus
        var gx = (left ? panel.right : panel.left) + (left ? 1 : -1) * (gap * 0.3 + (lane % 5) * Math.min(5, gap * 0.1));
        var ty = k.top + 16 + (lit.length > 1 ? i / (lit.length - 1) : 0.5) * (k.height - 32);
        var x = r.left + r.width / 2, y = r.bottom;
        var d = route([[x - f.left, y - f.top], [x - f.left, y + 4 - f.top], [gx - f.left, y + 4 - f.top], [gx - f.left, ty - f.top], [edge - f.left, ty - f.top]]);
        out += '<path class="fw-line" d="' + d + '"/><path class="fw-pulse" pathLength="100" style="animation-delay:' + (-(i * 0.31) % 2.4).toFixed(2) + 's" d="' + d + '"/>';
      });
    });
    svg.innerHTML = out;
  }

  // Hands on
  var touched = false, timer = 0;
  function stop() { touched = true; clearInterval(timer); }

  picks.forEach(function (b, i) {
    b.addEventListener('click', function () { stop(); select(i, true); });
    b.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault(); stop();
      select(i + dir, true); picks[current].focus();
    });
  });

  // A skill shows which results it feeds; clicking it steps to the next one that uses it
  chips.forEach(function (c) {
    var feeds = function (on) { picks.forEach(function (b, k) { b.classList.toggle('is-fed', on && uses[k].indexOf(c.dataset.skill) !== -1); }); };
    c.addEventListener('pointerenter', function () { feeds(true); });
    c.addEventListener('pointerleave', function () { feeds(false); });
    c.addEventListener('focus', function () { feeds(true); });
    c.addEventListener('blur', function () { feeds(false); });
    c.addEventListener('click', function () {
      stop();
      for (var s = 1; s <= picks.length; s++) {
        var k = (current + s) % picks.length;
        if (uses[k].indexOf(c.dataset.skill) !== -1) { select(k, true); return; }
      }
    });
    var n = uses.filter(function (u) { return u.indexOf(c.dataset.skill) !== -1; }).length;
    c.setAttribute('aria-label', c.textContent + ', used in ' + n + (n === 1 ? ' result' : ' results'));
  });

  fusion.addEventListener('pointerdown', stop);

  // Start
  select(current, null);
  var redraw = 0;
  function later() { clearTimeout(redraw); redraw = setTimeout(wire, 160); }
  window.addEventListener('resize', later);
  window.addEventListener('load', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  fusion.addEventListener('transitionend', function (e) { if (e.propertyName === 'transform' || e.propertyName === 'opacity') later(); });

  // Step through the list while the section is on screen, until someone takes over
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var seen = entries[0].isIntersecting;
      clearInterval(timer);
      if (seen) { later(); if (!touched && !calm) timer = setInterval(function () { if (!document.hidden) select(current + 1, false); }, 3800); }
    }, { threshold: 0.25 }).observe(fusion);
  }
})();
