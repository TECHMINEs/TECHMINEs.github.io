/* TECHMINES cursor: chamfer lock.
   Replaces the system pointer for mouse and trackpad users with a HUD-style target lock.
   At rest, four brackets with 45-degree cut corners (like the circuit traces in the
   backdrop) frame a fine plus at the pointer. Over a button or link the brackets spring
   around that element and turn white. Touch screens keep their normal behaviour, and
   reduced-motion visitors get no lag or spring. */
(function () {
  'use strict';

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var html = document.documentElement;
  var INTERACTIVE = 'a, button, summary, label, [role="button"], [role="slider"], [role="radio"], input, select, textarea';

  var root = document.createElement('div');
  root.className = 'tmc is-hidden';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<span class="tmc-dot"></span>' +
    '<span class="tmc-c tmc-c--tl"></span><span class="tmc-c tmc-c--tr"></span><span class="tmc-c tmc-c--br"></span><span class="tmc-c tmc-c--bl"></span><span class="tmc-tag"></span>';
  document.body.appendChild(root);
  html.classList.add('has-tmc');

  var dot = root.querySelector('.tmc-dot');
  var corners = Array.from(root.querySelectorAll('.tmc-c'));
  var tag = root.querySelector('.tmc-tag');

  var mouse = { x: -100, y: -100 }, aim = { x: -100, y: -100 };
  var target = null, raf = 0, t0 = performance.now();
  // each corner has a position and a velocity, for the springy snap
  var cs = corners.map(function () { return { x: -100, y: -100, vx: 0, vy: 0 }; });

  var last = 0;
  function frame(now) {
    raf = 0;
    var t = (now - t0) / 1000;
    // Real elapsed time drives the motion, so it feels the same on 60 Hz and 120 Hz screens
    var dt = Math.min(0.034, last ? (now - last) / 1000 : 0.016);
    last = now;
    var follow = calm ? 1 : 1 - Math.exp(-dt * 26);
    aim.x += (mouse.x - aim.x) * follow;
    aim.y += (mouse.y - aim.y) * follow;
    dot.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0)';

    // Where each corner wants to be: around the hovered element, or framing the pointer
    var goals, r = target ? target.getBoundingClientRect() : null;
    if (r && r.width) {
      var pad = 7;
      goals = [[r.left - pad, r.top - pad], [r.right + pad, r.top - pad], [r.right + pad, r.bottom + pad], [r.left - pad, r.bottom + pad]];
    } else {
      var g = 13 + (calm ? 0 : Math.sin(t * 2.2));
      goals = [[aim.x - g, aim.y - g], [aim.x + g, aim.y - g], [aim.x + g, aim.y + g], [aim.x - g, aim.y + g]];
    }

    cs.forEach(function (c, i) {
      var gx = goals[i][0], gy = goals[i][1];
      if (calm) { c.x = gx; c.y = gy; }
      else {
        // a damped spring, taken in two half-steps: quick to arrive, with one soft overshoot
        for (var s = 0; s < 2; s++) {
          var h = dt / 2;
          c.vx += ((gx - c.x) * 330 - c.vx * 31) * h;
          c.vy += ((gy - c.y) * 330 - c.vy * 31) * h;
          c.x += c.vx * h; c.y += c.vy * h;
        }
      }
      corners[i].style.transform = 'translate3d(' + c.x.toFixed(2) + 'px,' + c.y.toFixed(2) + 'px,0)';
    });

    tag.style.transform = 'translate3d(' + cs[2].x.toFixed(1) + 'px,' + cs[2].y.toFixed(1) + 'px,0)';   // rides the bottom-right bracket
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function locate(x, y) {
    var el = document.elementFromPoint(x, y);
    var hit = el && el.closest ? el.closest(INTERACTIVE) : null;
    if (hit !== target) {
      target = hit;
      root.classList.toggle('is-hover', !!hit);
      var tagged = hit && hit.closest('[data-cursor]');
      tag.dataset.t = tagged ? tagged.dataset.cursor : '';
      root.classList.toggle('has-tag', !!tagged);
    }
  }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if (root.classList.contains('is-hidden')) {
      aim.x = e.clientX; aim.y = e.clientY;
      cs.forEach(function (c) { c.x = e.clientX; c.y = e.clientY; c.vx = c.vy = 0; });
    }
    mouse.x = e.clientX; mouse.y = e.clientY;
    root.classList.remove('is-hidden');
    if (!root.classList.contains('is-press')) locate(mouse.x, mouse.y);   // keep hold of what is being dragged
    kick();
  }, { passive: true });
  window.addEventListener('scroll', function () { locate(mouse.x, mouse.y); }, { passive: true });
  window.addEventListener('pointerdown', function () { root.classList.add('is-press'); });
  ['pointerup', 'pointercancel'].forEach(function (ev) { window.addEventListener(ev, function () { root.classList.remove('is-press'); locate(mouse.x, mouse.y); }); });
  html.addEventListener('pointerleave', function () { root.classList.add('is-hidden'); });
  window.addEventListener('blur', function () { root.classList.add('is-hidden'); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; last = 0; } else kick(); });
})();
