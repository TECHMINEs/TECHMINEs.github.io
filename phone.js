/* Contact handset: hangs on a coiled cord from a carriage on a rail, follows the pointer,
   rings as it gets close and connects on the email. Placement keeps it clear of the text
   and the Walkman. phone3d.js draws it in 3D; the SVG below is the fallback. */
(function () {
  'use strict';

  var sec = document.getElementById('contact');
  if (!sec || !window.requestAnimationFrame || !document.createElementNS) return;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touchOnly = window.matchMedia('(hover: none)').matches;
  var wrap = sec.querySelector('.contact');
  var mail = sec.querySelector('.contact-email'), copyBtn = sec.querySelector('#copy-email');

  // The drawing
  // Handset in its own units: the cord enters at (8, -13), the body runs to y = 201, the
  // ear and mouth cups face +x. Flipping x turns it to face the other way.
  function ridges(flip) {
    var out = '';
    for (var k = 0; k < 6; k++) {
      var y = 21 + k * 3.9;
      var xi = 45.8 + (y - 19.8) * (1.8 / 24.8), xo = 52.1 + (y - 19) * (2.1 / 20.8);
      out += '<path d="M' + (xi + 0.6).toFixed(2) + ' ' + y.toFixed(2) + 'L' + (xo - 0.5).toFixed(2) + ' ' + (y + 0.25).toFixed(2) + '"/>';
    }
    return '<g class="ph-ridge"' + (flip ? ' transform="matrix(1 0 0 -1 0 200)"' : '') + '>' + out + '</g>';
  }
  var CAP = 'M45.4 13.6Q51.2 14.4 52.2 19.2L54.3 39.6Q54.5 45.4 49.6 48.5L47.7 44.6L45.8 19.8Z';
  var BODY = 'M-4 14C-4 4 3-1 13-1L33 2C43 3.5 49 9 51 17L53.5 40C54 47 50 52 43 53C31 54.5 21 55 15 59C11 62 10 67 10 73L10 127C10 133 11 138 15 141C21 145 31 145.5 43 147C50 148 54 153 53.5 160L51 183C49 191 43 196.5 33 198L13 201C3 201-4 196-4 186C-9.6 150-9.6 50-4 14Z';

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'phone');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<defs>' +
      '<linearGradient id="ph-body" gradientUnits="userSpaceOnUse" x1="-9.6" y1="0" x2="54.5" y2="0">' +
        '<stop offset="0" stop-color="#050506"/><stop offset=".05" stop-color="#2b2b2f"/><stop offset=".1" stop-color="#4a4a50"/>' +
        '<stop offset=".18" stop-color="#232327"/><stop offset=".32" stop-color="#141416"/><stop offset=".5" stop-color="#0d0d0e"/>' +
        '<stop offset=".68" stop-color="#0f0f11"/><stop offset=".84" stop-color="#1a1a1d"/><stop offset=".94" stop-color="#2d2d31"/><stop offset="1" stop-color="#0a0a0b"/>' +
      '</linearGradient>' +
      '<linearGradient id="ph-cap" gradientUnits="userSpaceOnUse" x1="45" y1="0" x2="55" y2="0">' +
        '<stop offset="0" stop-color="#050505"/><stop offset=".55" stop-color="#1b1b1e"/><stop offset=".85" stop-color="#3d3d42"/><stop offset="1" stop-color="#121214"/>' +
      '</linearGradient>' +
      '<linearGradient id="ph-boot" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#040404"/><stop offset=".45" stop-color="#2a2a2c"/><stop offset="1" stop-color="#070707"/>' +
      '</linearGradient>' +
      '<linearGradient id="ph-plate" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#36363a"/><stop offset=".18" stop-color="#1a1a1c"/><stop offset="1" stop-color="#070708"/>' +
      '</linearGradient>' +
      '<radialGradient id="ph-screw" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#6a6a70"/><stop offset=".6" stop-color="#2a2a2d"/><stop offset="1" stop-color="#0d0d0e"/></radialGradient>' +
      '<filter id="ph-shadow" x="-40%" y="-20%" width="180%" height="150%"><feDropShadow dx="5" dy="10" stdDeviation="5" flood-color="#2a0000" flood-opacity=".42"/></filter>' +
      '<filter id="ph-soft" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation=".6"/></filter>' +
    '</defs>' +
    '<g class="ph-rail">' +
      '<path class="ph-track" d=""/><path class="ph-track-hi" d=""/>' +
      '<rect class="ph-stop ph-stop-a" width="5" height="13" rx="1"/><rect class="ph-stop ph-stop-b" width="5" height="13" rx="1"/>' +
    '</g>' +
    '<g class="ph-ring3d ph-ring"><path d="M7.4-5.2A9 9 0 0 1 7.4 5.2"/><path d="M13.1-9.2A16 16 0 0 1 13.1 9.2"/><path d="M18.8-13.2A23 23 0 0 1 18.8 13.2"/></g>' +
    '<g class="ph-lbl"><circle class="ph-dot" r="2.6"/><text class="ph-say" text-anchor="end"></text></g>' +
    '<g class="ph-all" filter="url(#ph-shadow)">' +
      '<path class="ph-cord"/><path class="ph-cord-hi"/>' +
      '<g class="ph-car">' +
        '<path d="M-3.2-3L-2.4 5L2.4 5L3.2-3Z" fill="url(#ph-boot)"/>' +
        '<rect x="-25" y="-17" width="50" height="15" rx="3.2" fill="url(#ph-plate)" stroke="#000" stroke-width=".7"/>' +
        '<path d="M-22-15.6L22-15.6" stroke="rgba(255,255,255,.22)" stroke-width=".8" stroke-linecap="round"/>' +
        '<circle cx="-17" cy="-9.5" r="2.6" fill="url(#ph-screw)"/><path d="M-18.6-10.4L-15.4-8.6" stroke="#000" stroke-width=".7"/>' +
        '<circle cx="17" cy="-9.5" r="2.6" fill="url(#ph-screw)"/><path d="M15.6-11L18.4-8" stroke="#000" stroke-width=".7"/>' +
        '<ellipse cx="0" cy="-3.6" rx="4.6" ry="2.1" fill="#000" stroke="#2c2c2f" stroke-width=".6"/>' +
      '</g>' +
      '<g class="ph-hs">' +
        '<g class="ph-ring"><path d="M61.4 165.9A9 9 0 0 1 61.4 176.1"/><path d="M66.6 161.8A16 16 0 0 1 66.6 180.2"/><path d="M71.8 157.8A23 23 0 0 1 71.8 184.2"/></g>' +
        '<path d="M3.2 0.6L5-10.6Q8-14.4 11-10.6L12.8 0.6Z" fill="url(#ph-boot)"/>' +
        '<path d="M4.6-3H11.4M4.9-6H11.1M5.3-9H10.7" stroke="rgba(0,0,0,.75)" stroke-width=".7"/>' +
        '<path d="M4.7-2.4H11.3M5-5.4H11M5.4-8.4H10.6" stroke="rgba(255,255,255,.1)" stroke-width=".5"/>' +
        '<path d="' + BODY + '" fill="url(#ph-body)" stroke="#000" stroke-width=".8"/>' +
        '<path d="' + CAP + '" fill="url(#ph-cap)" stroke="#000" stroke-width=".5"/>' +
        '<path d="' + CAP + '" transform="matrix(1 0 0 -1 0 200)" fill="url(#ph-cap)" stroke="#000" stroke-width=".5"/>' +
        ridges(false) + ridges(true) +
        '<path d="M52.6 20.4L54.3 39.2" stroke="rgba(255,255,255,.38)" stroke-width=".9" stroke-linecap="round" filter="url(#ph-soft)"/>' +
        '<path d="M52.6 179.6L54.3 160.8" stroke="rgba(255,255,255,.2)" stroke-width=".9" stroke-linecap="round" filter="url(#ph-soft)"/>' +
        '<path d="M1.3 19C-2.5 60-2.5 140 1.3 181" fill="none" stroke="rgba(0,0,0,.75)" stroke-width=".8"/>' +
        '<path d="M2.1 19C-1.7 60-1.7 140 2.1 181" fill="none" stroke="rgba(255,255,255,.07)" stroke-width=".6"/>' +
        '<path d="M-2.4 22C-6.6 62-6.6 138-2.4 178" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.4" stroke-linecap="round" filter="url(#ph-soft)"/>' +
        '<path d="M12 2.5L32.4 5.4C40 6.6 45 10.2 47.6 16" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1.2" stroke-linecap="round" filter="url(#ph-soft)"/>' +
        '<path d="M12 197.5L32.4 194.6C40 193.4 45 189.8 47.6 184" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1" stroke-linecap="round"/>' +
        '<path d="M8.4 75L8.4 125" stroke="rgba(255,255,255,.09)" stroke-width="1" stroke-linecap="round"/>' +
        '<path d="M42 54.6C31 56 22 56.6 16.4 60.4" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1" stroke-linecap="round" filter="url(#ph-soft)"/>' +
        '<path d="M42 145.4C31 144 22 143.4 16.4 139.6" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1" stroke-linecap="round" filter="url(#ph-soft)"/>' +
        '<g class="ph-word"><text transform="rotate(90)" y="0.6" text-anchor="middle" class="ph-word-lo">TECHMINES</text><text transform="rotate(90)" text-anchor="middle" class="ph-word-hi">TECHMINES</text></g>' +
        '<rect class="ph-hit" x="-16" y="-17" width="80" height="224" fill="transparent"/>' +
      '</g>' +
    '</g>';
  sec.appendChild(svg);

  var $ = function (s) { return svg.querySelector(s); };
  var track = $('.ph-track'), trackHi = $('.ph-track-hi'), stopA = $('.ph-stop-a'), stopB = $('.ph-stop-b');
  var car = $('.ph-car'), hs = $('.ph-hs'), ring = $('.ph-ring'), word = $('.ph-word'), hit = $('.ph-hit');
  var ring3d = $('.ph-ring3d');
  var cordP = $('.ph-cord'), cordH = $('.ph-cord-hi'), lbl = $('.ph-lbl'), say = $('.ph-say'), dot = $('.ph-dot');
  hit.setAttribute('data-cursor', 'drag');

  // Placement
  var ATTACH = { x: 8, y: -13 }, COM = { x: 14, y: 101 }, HS_H = 240, HALF = 60;
  var BASE = document.currentScript ? document.currentScript.src : location.href;
  var gl = null;
  var CAR_Y = 22, ANCHOR_DY = 5;
  var S = 0.86, HL = 114, N = 12, LL = 10, zone = null, rest = 0, room = 0, shown = false;

  // Where the text actually is: line boxes of the words, not the full-width blocks
  function inkRects() {
    var out = [], s = sec.getBoundingClientRect();
    var add = function (r) { if (r.width > 0 && r.height > 0) out.push({ l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top }); };
    sec.querySelectorAll('.eyebrow, .contact-heading, .contact-lead').forEach(function (el) {
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, range = document.createRange();
      while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; range.selectNodeContents(n); Array.prototype.forEach.call(range.getClientRects(), add); }
    });
    sec.querySelectorAll('.contact-email, .copy-email, .contact-links a, .contact-links button').forEach(function (el) { add(el.getBoundingClientRect()); });
    return out;
  }

  // Columns that fixed things on the page use: the Walkman (whatever state it is in) and the top button
  function fixedColumns() {
    var cols = [], s = sec.getBoundingClientRect();
    var take = function (el) {
      if (!el || el.hidden) return;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.1) return;
      var r = el.getBoundingClientRect();
      if (r.width && r.height) cols.push([r.left - s.left - 28, r.right - s.left + 28]);
    };
    var wm = document.querySelector('.wm');
    if (wm) wm.querySelectorAll('.wm-mini, .wm-hint, .wm-deck, .wm-rack, .wm-fold').forEach(take);
    take(document.getElementById('to-top'));
    take(document.querySelector('.route'));
    return cols;
  }

  function freeIntervals(scale, cord, obstacles, cols, W, minX) {
    var half = HALF * scale, bottom = CAR_Y + ANCHOR_DY + cord * 1.12 + HS_H * scale + 14, pad = 22 * scale;
    var lo = Math.max(half + 16, minX), hi = W - half - 16, list = [], start = null;
    for (var x = lo; x <= hi + 0.1; x += 4) {
      var l = x - half, r = x + half, ok = true;
      for (var i = 0; ok && i < cols.length; i++) if (r > cols[i][0] && l < cols[i][1]) ok = false;
      for (var j = 0; ok && j < obstacles.length; j++) {
        var o = obstacles[j];
        if (r > o.l - pad && l < o.r + pad && bottom > o.t - pad && 0 < o.b + pad) ok = false;
      }
      if (ok && start === null) start = x;
      if ((!ok || x + 4 > hi + 0.1) && start !== null) { list.push([start, ok ? x : x - 4]); start = null; }
    }
    return list;
  }

  function plan() {
    var s = sec.getBoundingClientRect(), W = s.width, H = s.height;
    if (!W || !H) return;
    var vw = window.innerWidth;
    var base = vw >= 1100 ? 0.9 : vw >= 760 ? 0.76 : 0.6;
    var obstacles = inkRects(), cols = fixedColumns(), w = wrap.getBoundingClientRect();
    var minX = w.left - s.left + 40;
    var prefer = pts.length ? carX : w.right - s.left - 120;
    var full = Math.max(40, (H - CAR_Y - ANCHOR_DY - HS_H * base - 56) / 1.12);
    // cord options: a fraction of the space below the rail, or (negative) a fixed short length
    var configs = [[base, 1], [base, 0.72], [base, 0.5], [base, -96], [base, -64], [base, -42], [base * 0.85, -42], [base * 0.72, -36]];
    // on phones it never shrinks into a corner: it gets its own room above the text instead
    if (vw < 760) configs = [[base, -64], [base, -42]];
    var pick = null;
    // first look for a spot with some room to slide; settle for a tight one only if nothing else fits
    for (var pass = 0; pass < 2 && !pick; pass++)
    for (var c = 0; c < configs.length && !pick; c++) {
      var sc = configs[c][0], cord = configs[c][1] > 0 ? Math.max(34 * sc, Math.min(full * configs[c][1], 260 * sc)) : -configs[c][1] * sc;
      var ints = freeIntervals(sc, cord, obstacles, cols, W, minX).filter(function (z) { return pass || z[1] - z[0] >= 40 * sc; });
      if (ints.length) {
        // stay close to where it already hangs rather than jumping across the section
        var gap = function (z) { return prefer < z[0] ? z[0] - prefer : prefer > z[1] ? prefer - z[1] : 0; };
        ints.sort(function (a, b) { return gap(a) - gap(b) || (b[1] - b[0]) - (a[1] - a[0]); });
        pick = { s: sc, cord: cord, z: ints[0] };
      }
    }
    if (!pick) {
      // No free space beside the text (narrow screens): open a strip of room above it
      if (!room) {
        room = Math.round(CAR_Y + ANCHOR_DY + 42 * base * 1.12 + HS_H * base + 4);
        sec.style.setProperty('--ph-room', room + 'px');
        sec.classList.add('has-phone-room');
        return plan();
      }
      svg.style.display = 'none'; shown = false; zone = null; return;
    }
    svg.style.display = ''; shown = true;
    var newS = pick.s, newN = 12;
    zone = pick.z;
    rest = zone[0] + (zone[1] - zone[0]) * 0.55;
    var newLL = pick.cord / newN;
    var rebuild = !pts.length || Math.abs(newS - S) > 0.001 || Math.abs(newLL - LL) > 0.5;
    S = newS; N = newN; LL = newLL; HL = (gl ? 112 : Math.hypot(COM.x - ATTACH.x, COM.y - ATTACH.y)) * S;
    if (rebuild) seed(pts.length ? carX : rest, pts.length ? 0.05 : 0.32);
    drawRail();
    if (!running) { for (var i = 0; i < (calm ? 240 : 0); i++) step(); render(performance.now(), { near: false, px: -9999, py: -9999 }); }
  }

  var railA = 0, railB = 0;
  function drawRail() {
    if (!zone) return;
    var a = Math.min(zone[0], pts.length ? carX : zone[0]) - 30 * S, b = Math.max(zone[1], pts.length ? carX : zone[1]) + 30 * S, y = CAR_Y - 12;
    if (Math.abs(a - railA) < 0.5 && Math.abs(b - railB) < 0.5) return;
    railA = a; railB = b;
    track.setAttribute('d', 'M' + a.toFixed(1) + ' ' + y + 'H' + b.toFixed(1));
    trackHi.setAttribute('d', 'M' + (a + 3).toFixed(1) + ' ' + (y - 1.1) + 'H' + (b - 3).toFixed(1));
    stopA.setAttribute('x', (a - 4).toFixed(1)); stopA.setAttribute('y', y - 6.5);
    stopB.setAttribute('x', (b - 1).toFixed(1)); stopB.setAttribute('y', y - 6.5);
  }

  // Physics (section pixels, 60 steps a second)
  var pts = [], carX = 0, carV = 0, grab = null, face = -1, faceGoal = -1, engage = 0;
  function seed(x, swing) {
    carX = x; carV = 0; pts = [];
    var ax = x, ay = CAR_Y + ANCHOR_DY;
    for (var i = 0; i <= N + 1; i++) {
      var d = i <= N ? i * LL * 0.92 : N * LL * 0.92 + HL;
      var px = ax + Math.sin(swing) * d, py = ay + Math.cos(swing) * d;
      pts.push({ x: px, y: py, ox: px, oy: py });
    }
  }

  var P = { x: 0, y: 0, on: false }, hot = false, copiedUntil = 0, pickedUntil = 0, autoRingUntil = 0;

  function step() {
    var s = sec.getBoundingClientRect(), n = pts.length, end = pts[n - 1], top = pts[n - 2];
    var px = P.x - s.left, py = P.y - s.top;
    var near = P.on && px > -260 && px < s.width + 260 && py > -240 && py < s.height + 200;
    engage += ((near || hot) && !calm ? 1 : 0) - engage > 0 ? 0.06 : -0.03;
    engage = Math.max(0, Math.min(1, engage));

    // the carriage slides along the rail toward the pointer
    var goal = near && !calm ? Math.max(zone[0], Math.min(zone[1], px)) : rest;
    if (hot) { var m = mail.getBoundingClientRect(); goal = Math.max(zone[0], Math.min(zone[1], m.right - s.left)); }
    if (calm) { carX = goal; carV = 0; }
    else { carV += ((goal - carX) * 38 - carV * 10.5) / 60; carV = Math.max(-620, Math.min(620, carV)); carX += carV / 60; }

    // the handset reaches for the pointer, but only a little way out of its own space
    var fx = 0, fy = 0;
    if (!grab && engage > 0.01) {
      var tx = px, ty = py;
      if (hot) { var mr = mail.getBoundingClientRect(); tx = mr.right - s.left; ty = mr.top + mr.height / 2 - s.top; }
      // it leans toward you but stays in its own column and never hangs lower than at rest,
      // so it can never swing over the text or the buttons below it
      var reach = 14 * S, depth = CAR_Y + ANCHOR_DY + N * LL * 1.05 + HL;
      tx = Math.max(zone[0] - reach, Math.min(zone[1] + reach, tx));
      ty = Math.max(CAR_Y + 60 * S, Math.min(depth, ty));
      if (hot) ty = Math.min(ty, depth - 20 * S);
      var dx = tx - end.x, dy = ty - end.y, d = Math.hypot(dx, dy) || 1;
      var pull = Math.min(0.85, d * 0.006) * engage * (hot ? 0.9 : 1) * Math.min(1, d / 30);
      fx = dx / d * pull; fy = dy / d * pull;
    }
    for (var i = 1; i < n; i++) {
      var p = pts[i], vx = (p.x - p.ox) * 0.986, vy = (p.y - p.oy) * 0.986;
      vx = Math.max(-36, Math.min(36, vx)); vy = Math.max(-36, Math.min(36, vy));
      p.ox = p.x; p.oy = p.y;
      var wgt = i === n - 1 ? 1 : i === n - 2 ? 0.35 : 0.08;
      p.x += vx + fx * wgt; p.y += vy + 0.46 + fy * wgt;
    }
    if (grab) { end.x = px + grab.dx; end.y = py + grab.dy; }
    for (var k = 0; k < 12; k++) {
      pts[0].x = carX; pts[0].y = CAR_Y + ANCHOR_DY;
      for (var j = 0; j < n - 1; j++) {
        var a = pts[j], b = pts[j + 1], last = j === n - 2, len = last ? HL : LL;
        var ddx = b.x - a.x, ddy = b.y - a.y, dd = Math.hypot(ddx, ddy) || 0.001;
        if (!last && dd <= len) continue;                    // a coiled cord goes slack, it never pushes
        var corr;
        if (last) corr = (dd - len) / dd;
        else corr = dd > len * 1.45 ? (dd - len * 1.45) / dd + 0.42 * (len * 0.45) / dd : (dd - len) / dd * 0.42;   // springy, with a hard limit
        var wa = j === 0 ? 0 : last ? 0.82 : 0.5, wb = 1 - wa;
        if (grab && last) { wa = 1; wb = 0; }
        a.x += ddx * corr * wa; a.y += ddy * corr * wa;
        b.x -= ddx * corr * wb; b.y -= ddy * corr * wb;
      }
    }
    // stay in its own column even when the carriage moves fast
    if (!grab) {
      var lim0 = zone[0] - 26 * S, lim1 = zone[1] + 26 * S;
      if (end.x < lim0) end.x += (lim0 - end.x) * 0.3;
      if (end.x > lim1) end.x -= (end.x - lim1) * 0.3;
    }
    // never let it flip up over the rail
    var floor = CAR_Y + ANCHOR_DY + 24 * S;
    if (end.y < floor) { end.y = floor; end.oy = Math.min(end.oy, floor); }
    if (top.y < CAR_Y + ANCHOR_DY + 4) { top.y = CAR_Y + ANCHOR_DY + 4; }
    // turn to face the pointer; face the words when nobody is around
    if (near && !calm) { var rel = px - end.x; if (Math.abs(rel) > 24) faceGoal = rel > 0 ? 1 : -1; }
    else if (hot) faceGoal = -1;
    else faceGoal = -1;
    face += (faceGoal - face) * 0.1;
    return { near: near, px: px, py: py };
  }

  // Drawing each frame
  var ringAmt = 0, said = '', lastSx = 0;
  function render(now, st) {
    var n = pts.length, end = pts[n - 1], top = pts[n - 2], t = now / 1000;
    var dEnd = Math.hypot(st.px - end.x, st.py - end.y);
    var want = 0;
    if (!hot && !grab && now > pickedUntil) {
      if (st.near && !calm) want = Math.max(0, 1 - dEnd / (460 * S));
      if (now < autoRingUntil) want = Math.max(want, 0.7);
    }
    ringAmt += (want - ringAmt) * 0.09;
    // a British double ring: two short bursts, then a pause
    var ph = t % 2.6, burst = (ph < 0.42 || (ph > 0.62 && ph < 1.04)) ? 1 : 0;
    var shake = calm ? 0 : Math.sin(t * 64) * ringAmt * burst;

    drawRail();
    car.setAttribute('transform', 'translate(' + carX.toFixed(2) + ' ' + CAR_Y + ') scale(' + S.toFixed(3) + ')');
    var segA = Math.atan2(end.y - top.y, end.x - top.x);
    var f = Math.abs(face) < 0.04 ? (face < 0 ? -0.04 : 0.04) : face;
    var locA = Math.atan2((COM.y - ATTACH.y), (COM.x - ATTACH.x) * f);
    var rot = (segA - locA) * 57.29578 + shake * 5;
    hs.setAttribute('transform', 'translate(' + (top.x + shake * 1.2).toFixed(2) + ' ' + top.y.toFixed(2) + ') rotate(' + rot.toFixed(2) + ') scale(' + (f * S).toFixed(3) + ' ' + S.toFixed(3) + ') translate(' + (-ATTACH.x) + ' ' + (-ATTACH.y) + ')');
    if (gl) {
      var ep = gl.draw({ W: sec.clientWidth, H: sec.clientHeight, face: face, segA: segA, shake: shake, top: top, S: S, carX: carX, carY: CAR_Y, railA: railA, railB: railB, pts: pts });
      var el = Math.hypot(ep.dx, ep.dy), ang = el > 6 * S ? Math.atan2(ep.dy, ep.dx) * 57.29578 : (face < 0 ? 180 : 0);
      ring3d.setAttribute('transform', 'translate(' + ep.x.toFixed(1) + ' ' + ep.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ') scale(' + S.toFixed(3) + ')');
      ring3d.style.opacity = (ringAmt * burst * (0.55 + 0.45 * Math.abs(Math.sin(t * 10)))).toFixed(3);
    }
    var sx = f < 0 ? -1 : 1;
    if (sx !== lastSx) { lastSx = sx; word.setAttribute('transform', 'translate(2.6 100) scale(' + sx + ' 1)'); }
    ring.style.opacity = (ringAmt * burst * (0.55 + 0.45 * Math.abs(Math.sin(t * 10)))).toFixed(3);

    // the coiled cord: a fixed number of loops per link, so stretching it spreads the loops
    var d = '', hi = '', loops = 1.55, R = 4.3 * S, SAMP = 14, open = false;
    for (var i = 0; i < n - 2; i++) {
      var a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, tx = dx / len, ty = dy / len;
      for (var k = 0; k < SAMP; k++) {
        var u = k / SAMP, g = i + u, phs = g * loops * Math.PI * 2;
        var taper = Math.min(1, g / 0.7, (n - 2 - g) / 0.5);
        var r = R * Math.max(0, taper), sn = Math.sin(phs), cs = Math.cos(phs);
        var x = a.x + dx * u - ty * sn * r + tx * cs * r * 0.45, y = a.y + dy * u + tx * sn * r + ty * cs * r * 0.45;
        d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
        if (cs > 0.2 && taper > 0.3) { hi += (open ? 'L' : 'M') + (x - 0.5).toFixed(1) + ' ' + (y - 0.6).toFixed(1); open = true; }
        else open = false;
      }
    }
    d += 'L' + top.x.toFixed(1) + ' ' + top.y.toFixed(1);
    cordP.setAttribute('d', d); cordH.setAttribute('d', hi);
    cordP.style.strokeWidth = (2.3 * S).toFixed(2); cordH.style.strokeWidth = (0.8 * S).toFixed(2);

    // status line beside the carriage
    var text = now < copiedUntil ? 'Email copied' : grab ? 'On the line' : hot ? 'Connected · say hello' : now < pickedUntil ? 'Hello?' : ringAmt > 0.2 ? 'Incoming call' : 'Line open';
    if (text !== said) { said = text; say.textContent = text; lbl.classList.toggle('is-live', text !== 'Line open'); }
    lbl.setAttribute('transform', 'translate(' + (carX - 34 * S).toFixed(1) + ' ' + (CAR_Y + 18) + ')');
    dot.style.opacity = ringAmt > 0.2 ? (burst ? 1 : 0.25) : 1;
  }

  // Loop
  var running = false, visible = false, acc = 0, last = 0, quiet = 0;
  function frame(now) {
    if (!visible || !shown) { running = false; return; }
    var dt = Math.min(0.1, (now - last) / 1000 || 1 / 60); last = now; acc += dt;
    var st = null, g = 0;
    while (acc >= 1 / 60 && g++ < 6) { acc -= 1 / 60; st = step(); }
    if (g >= 6) acc = 0;
    if (st) render(now, st);
    // go to sleep once nothing is moving and nobody is near
    var e = pts[pts.length - 1], motion = Math.abs(e.x - e.ox) + Math.abs(e.y - e.oy) + Math.abs(carV) / 60;
    var idle = !grab && !hot && engage === 0 && ringAmt < 0.004 && motion < 0.01 && now > autoRingUntil && now > copiedUntil && now > pickedUntil;
    quiet = idle ? quiet + 1 : 0;
    if (quiet > 90) { running = false; quiet = 0; return; }
    requestAnimationFrame(frame);
  }
  function wake() { if (!running && visible && shown && pts.length) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

  // Input
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' && !grab) return;
    P.x = e.clientX; P.y = e.clientY; P.on = true;
    if (!running && visible) { var r = sec.getBoundingClientRect(); if (P.y > r.top - 300 && P.y < r.bottom + 300) wake(); }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { P.on = false; });
  [mail, copyBtn].forEach(function (el) {
    if (!el) return;
    ['pointerenter', 'focus'].forEach(function (ev) { el.addEventListener(ev, function () { hot = true; wake(); }); });
    ['pointerleave', 'blur'].forEach(function (ev) { el.addEventListener(ev, function () { hot = false; wake(); }); });
  });
  if (copyBtn) copyBtn.addEventListener('click', function () { setTimeout(function () { if (copyBtn.classList.contains('copied')) copiedUntil = performance.now() + 2200; wake(); }, 60); });

  var down = null;
  hit.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    try { hit.setPointerCapture(e.pointerId); } catch (_) {}
    var s = sec.getBoundingClientRect(), end = pts[pts.length - 1];
    P.x = e.clientX; P.y = e.clientY; P.on = true;
    grab = { dx: end.x - (e.clientX - s.left), dy: end.y - (e.clientY - s.top) };
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    wake();
  });
  function release(e) {
    if (!grab) return;
    var end = pts[pts.length - 1], sp = Math.hypot(end.x - end.ox, end.y - end.oy);
    grab = null;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 400) {
      // a tap answers the call
      pickedUntil = performance.now() + 1800; ringAmt = 0;
      end.oy = end.y + 5;
    } else if (sp > 7) {
      window.dispatchEvent(new CustomEvent('tm:beat', { detail: { strength: Math.min(1, sp / 22) } }));
    }
    down = null;
    if (e.pointerType === 'touch') P.on = false;
  }
  hit.addEventListener('pointerup', release);
  hit.addEventListener('pointercancel', release);

  // the cord bounces to the Walkman's beat
  window.addEventListener('tm:beat', function (e) {
    if (calm || grab || !pts.length) return;
    var end = pts[pts.length - 1], k = (e.detail && e.detail.strength) || 0.5;
    end.oy += 1.6 * k; end.ox += (Math.random() - 0.5) * 1.2 * k;
    wake();
  });

  // The 3D handset
  // three.js loads a little before the section comes into view; until then (or if WebGL is
  // missing) the flat drawing above is shown instead.
  var glTried = false;
  function loadScript(src, ok, fail) { var t = document.createElement('script'); t.src = src; t.async = true; t.onload = ok; t.onerror = fail; document.head.appendChild(t); }
  function loadGL() {
    if (glTried) return; glTried = true;
    try { var test = document.createElement('canvas'); if (!(test.getContext('webgl2') || test.getContext('webgl'))) return; } catch (e) { return; }
    var go = function () {
      loadScript(new URL('phone3d.js?v=3', BASE).href, function () {
        try { gl = window.TMPhone3D && window.TMPhone3D(sec); } catch (e) { gl = null; }
        if (!gl) return;
        svg.classList.add('is-gl');
        hit.setAttribute('y', '-20'); hit.setAttribute('height', '252');
        plan(); render(performance.now(), { near: false, px: -9999, py: -9999 }); wake();
      }, function () {});
    };
    if (window.THREE) go();
    else loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', go, function () {});
  }
  // start loading once the visitor is within a few screens of the section
  var glWatch = function () {
    var r = sec.getBoundingClientRect();
    if (r.top < window.innerHeight * 3 && r.bottom > -window.innerHeight) { window.removeEventListener('scroll', glWatch); loadGL(); }
  };
  window.addEventListener('scroll', glWatch, { passive: true });
  window.addEventListener('load', glWatch);
  glWatch();

  // Start and keep placed
  var replan = 0;
  function later(ms) { clearTimeout(replan); replan = setTimeout(function () { plan(); wake(); }, ms); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) {
        if (!pts.length) plan();
        // on touch screens there is no pointer to notice, so it rings once when it comes into view
        if (touchOnly && !calm && !sec.dataset.rang && es[0].intersectionRatio > 0.5) { sec.dataset.rang = '1'; autoRingUntil = performance.now() + 2600; }
        wake();
      }
    }, { threshold: [0, 0.55] }).observe(sec);
  } else { visible = true; plan(); wake(); }

  window.addEventListener('resize', function () { later(180); });
  window.addEventListener('load', function () { later(60); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { later(30); });
  // the Walkman opens, closes and moves sides: make room once it has settled
  var wm = document.querySelector('.wm');
  if (wm && 'MutationObserver' in window) {
    new MutationObserver(function () { later(620); }).observe(wm, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });
    wm.addEventListener('animationend', function () { later(40); });
    wm.addEventListener('transitionend', function (e) { if (e.target === wm || e.propertyName === 'transform') later(40); });
  }
})();
