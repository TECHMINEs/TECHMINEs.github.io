/* TECHMINES backdrop: one continuous circuit.
   Right-angle traces with chamfered corners run along the page grid, with glowing contact
   pads and light pulses racing along them. The circuit is continuous across the whole
   page: behind reading text the very same traces carry on, simply faded down with a
   gradual edge, and their pulses fade even further so nothing competes with the words.
   In open space everything stays vivid. Pads near the pointer light up. The canvas is
   fixed behind the page, pauses when the tab is hidden and stays still for visitors who
   prefer reduced motion. */
(function () {
  'use strict';

  var backdrop = document.getElementById('backdrop');
  if (!backdrop) return;

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var GRID = 56;
  // How much of the circuit remains behind reading text (1 = untouched)
  var TEXT_TRACES = 0.26;
  var TEXT_PULSES = 0.14;


  var canvas = document.createElement('canvas');
  canvas.className = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  backdrop.appendChild(canvas);
  backdrop.dataset.bg = 'circuit';
  var g = canvas.getContext('2d');
  var pulses = document.createElement('canvas');       // pulses are faded separately, and further
  var pg = pulses.getContext('2d');
  var mask = document.createElement('canvas');         // soft-edged shape of the text areas (cached)
  var mg = mask.getContext('2d');
  var maskAt = null, maskTime = -1e9;

  var W, H, dpr, raf = 0, last = 0, scrollP = 0, traces = [];
  var pointer = { x: -9999, y: -9999 };

  // Blocks of reading text (cards and panels already have their own surface)
  var TEXT = '.hero-text, .section-head, .split .section-label, .statement, .about-text, .stats, .orgs, .now-intro, .contact > div, .footer-row';
  var textEls = [];

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function light() { return document.documentElement.classList.contains('is-light'); }
  function rgba(hex, a) {
    var h = (hex || '#FF2626').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    [canvas, pulses, mask].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    pg.setTransform(dpr, 0, 0, dpr, 0, 0);
    maskAt = null;
    build();
    textEls = Array.from(document.querySelectorAll(TEXT));
  }

  function build() {
    var cols = Math.ceil(W / GRID) + 1, rows = Math.ceil(H / GRID) + 2;
    var count = Math.round(Math.min(30, Math.max(12, (W * H) / 44000)));
    traces = [];
    for (var k = 0; k < count; k++) {
      var x = Math.floor(Math.random() * cols), y = Math.floor(Math.random() * rows);
      var dir = Math.floor(Math.random() * 4), pts = [[x * GRID, y * GRID]];
      var segs = 3 + Math.floor(Math.random() * 4);
      for (var s = 0; s < segs; s++) {
        var len = 1 + Math.floor(Math.random() * 5);
        var dx = [1, 0, -1, 0][dir], dy = [0, 1, 0, -1][dir], lastPt = pts[pts.length - 1];
        var nx = lastPt[0] + dx * len * GRID, ny = lastPt[1] + dy * len * GRID;
        var ndir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4, c = GRID * 0.4;
        pts.push([nx - dx * c, ny - dy * c]);
        pts.push([nx + [1, 0, -1, 0][ndir] * c, ny + [0, 1, 0, -1][ndir] * c]);
        dir = ndir;
      }
      var lengths = [0];
      for (var i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      traces.push({ pts: pts, lengths: lengths, total: lengths[lengths.length - 1], t: Math.random(), speed: 80 + Math.random() * 90 });
    }
  }

  function at(tr, d) {
    var L = tr.lengths, i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    var seg = L[i] - L[i - 1] || 1, f = (d - L[i - 1]) / seg, a = tr.pts[i - 1], b = tr.pts[i];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  function near(x, y) {
    var d = Math.hypot(x - pointer.x, y - pointer.y);
    return d > 200 ? 0 : 1 - d / 200;
  }

  // Soft-edged mask of every text block on screen. It is drawn with a blurred shadow, whose
  // offset and blur are measured in device pixels, so both scale with the pixel ratio
  // (otherwise the shadow lands off-screen on Retina displays).
  function buildMask() {
    mg.setTransform(1, 0, 0, 1, 0, 0);
    mg.clearRect(0, 0, mask.width, mask.height);
    mg.setTransform(dpr, 0, 0, dpr, 0, 0);
    mg.shadowColor = '#000';
    mg.shadowBlur = 64 * dpr;
    mg.shadowOffsetX = 10000 * dpr;
    mg.fillStyle = '#000';
    mg.beginPath();
    var pad = 24, any = false;
    textEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -120 || r.top > H + 120 || r.width === 0 || r.height === 0) return;
      mg.rect(r.left - 10000 - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
      any = true;
    });
    if (any) mg.fill();
    mg.shadowColor = 'transparent';
  }

  // Fades a layer inside the text areas, leaving the given fraction of it
  function fadeText(ctx, keep) {
    if (!mask.width || !mask.height) return;   // nothing to fade while the page has no size
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1 - keep;
    ctx.drawImage(mask, 0, 0);
    ctx.restore();
  }

  function draw(dt) {
    if (!pulses.width || !pulses.height) return;   // the page has no size yet (a hidden tab or frame)
    var red = css('--red'), lt = light(), shift = scrollP * -40;
    var v = lt
      ? { trace: 0.3, pad: 0.5, ring: 0.6, pulse: 0.75, glow: 8 }
      : { trace: 0.3, pad: 0.55, ring: 0.7, pulse: 1, glow: 14 };

    var now = performance.now();
    if (maskAt !== window.scrollY || now - maskTime > 700) { buildMask(); maskAt = window.scrollY; maskTime = now; }

    traces.forEach(function (tr) {
      tr.t = (tr.t + (dt * tr.speed) / tr.total) % 1;
      tr.head = tr.t * tr.total; tr.tail = Math.max(0, tr.head - 80);
    });

    // 1. traces and pads: one continuous circuit, faded behind text
    g.clearRect(0, 0, W, H);
    g.save(); g.translate(0, shift);
    g.lineWidth = 1.3; g.strokeStyle = rgba(red, v.trace);
    g.beginPath();
    traces.forEach(function (tr) { tr.pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); });
    g.stroke();
    traces.forEach(function (tr) {
      [tr.pts[0], tr.pts[tr.pts.length - 1]].forEach(function (p) {
        var n = near(p[0], p[1] + shift);
        g.fillStyle = rgba(red, v.pad + n * (1 - v.pad));
        g.fillRect(p[0] - 3.5, p[1] - 3.5, 7, 7);
        g.lineWidth = 1; g.strokeStyle = rgba(red, (v.ring * 0.35) + n * 0.65);
        g.strokeRect(p[0] - 7.5, p[1] - 7.5, 15, 15);
      });
    });
    g.restore();
    fadeText(g, TEXT_TRACES);

    // 2. pulses on their own layer, faded further behind text so reading stays calm
    pg.clearRect(0, 0, W, H);
    pg.save(); pg.translate(0, shift);
    pg.lineWidth = 2.2; pg.strokeStyle = rgba(red, v.pulse);
    pg.shadowColor = red; pg.shadowBlur = v.glow;
    traces.forEach(function (tr) {
      pg.beginPath();
      for (var d = tr.tail, first = true; d <= tr.head; d += 6, first = false) { var p = at(tr, d); first ? pg.moveTo(p[0], p[1]) : pg.lineTo(p[0], p[1]); }
      pg.stroke();
    });
    pg.restore();
    fadeText(pg, TEXT_PULSES);

    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(pulses, 0, 0); g.restore();
  }

  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var max = document.documentElement.scrollHeight - innerHeight;
    scrollP = max > 0 ? window.scrollY / max : 0;
    draw(calm ? 0 : dt);
    if (!calm && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('pointermove', function (e) { pointer.x = e.clientX; pointer.y = e.clientY; if (calm) kick(); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; if (calm) kick(); });
  window.addEventListener('resize', function () { size(); kick(); });
  window.addEventListener('scroll', function () { if (calm) kick(); }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = 0; kick(); } });
  new MutationObserver(function () { kick(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  size();
  kick();
})();
