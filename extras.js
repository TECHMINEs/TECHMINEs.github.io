/* TECHMINES extras: two small page-wide touches.
   1. A section route down the left edge of wide screens: a trace with one pad per section.
      It fills as you scroll, marks where you are, and each pad jumps to its section.
   2. The headline numbers in the About section count up the first time they come into view. */
(function () {
  'use strict';

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------ section route
  var STOPS = [['top', 'Intro'], ['about', 'About'], ['projects', 'Work'], ['experience', 'Experience'],
               ['education', 'Education'], ['skills', 'Skills'], ['now', 'Right now'], ['contact', 'Contact']];
  var stops = STOPS.filter(function (s) { return document.getElementById(s[0]); });
  if (stops.length > 2 && 'IntersectionObserver' in window) {
    var nav = document.createElement('nav');
    nav.className = 'route';
    nav.setAttribute('aria-label', 'Sections');
    nav.innerHTML = stops.map(function (s) { return '<a href="#' + s[0] + '" data-label="' + s[1] + '" aria-label="' + s[1] + '"></a>'; }).join('');
    document.body.appendChild(nav);
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('is-on', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    stops.forEach(function (s) { io.observe(document.getElementById(s[0])); });

    var ticking = false;
    var fill = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      nav.style.setProperty('--p', (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4));
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(fill); } }, { passive: true });
    fill();
  }

  // ------------------------------------------------------------------ counting numbers
  var nums = Array.prototype.slice.call(document.querySelectorAll('.stats strong'));
  if (nums.length && !calm && 'IntersectionObserver' in window) {
    var count = function (el) {
      var m = el.textContent.trim().match(/^(\d+)(.*)$/);
      if (!m) return;
      var to = +m[1], tail = m[2], t0 = performance.now();
      el.style.fontVariantNumeric = 'tabular-nums';
      (function step(now) {
        var k = Math.min(1, (now - t0) / 1400), v = Math.round(to * (1 - Math.pow(1 - k, 4)));
        el.textContent = v + tail;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    };
    var seen = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (e) { if (e.isIntersecting) { count(e.target); o.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { seen.observe(n); });
  }
})();
