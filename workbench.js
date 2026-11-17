/* TECHMINES project workbench.
   A full-screen dialog that runs each project's live demo in a frame, with a tab per project,
   a loading state while the demo starts, and a link to open the demo in its own tab. */
(function () {
  'use strict';
  const dialog = document.getElementById('workbench');
  const open = document.getElementById('workbench-open');
  const close = document.getElementById('workbench-close');
  const frame = document.getElementById('workbench-frame');
  const external = document.getElementById('workbench-external');
  const description = document.getElementById('workbench-description');
  const demos = {
    chainproof: ['ChainProof', 'Trace evidence through every hand-off.'],
    relay: ['Relay', 'Watch a request recover when its model provider fails.'],
    devpulse: ['DevPulse', 'Explore illustrative commit patterns and workload signals.'],
    nexora: ['Nexora', 'Walk through a factory risk scenario.'],
    autoline: ['AutoLine', 'Explore production, parts and quality in one place.']
  };
  const loading = document.getElementById('workbench-loading');
  const loadingName = document.getElementById('workbench-loading-name');
  if (!dialog || !open) return;
  // Keep the frame hidden behind a loading panel until the demo has painted,
  // so visitors never stare at a blank white rectangle.
  let loadTimer;
  function showLoading(name) {
    if (!loading) return;
    loadingName.textContent = name;
    loading.hidden = false;
    frame.classList.remove('is-ready');
    clearTimeout(loadTimer);
    loadTimer = setTimeout(hideLoading, 12000);
  }
  function hideLoading() {
    clearTimeout(loadTimer);
    if (loading) loading.hidden = true;
    frame.classList.add('is-ready');
  }
  frame.addEventListener('load', function () {
    if (frame.getAttribute('src')) setTimeout(hideLoading, 250);
  });
  function select(key) {
    if (!Object.prototype.hasOwnProperty.call(demos, key)) return;
    const url = 'https://techmines.github.io/' + demos[key][0] + '/';
    frame.title = demos[key][0] + ' live demo';
    if (frame.getAttribute('src') !== url) {
      showLoading(demos[key][0]);
      frame.src = url;
    }
    external.href = url;
    description.textContent = demos[key][1];
    dialog.querySelectorAll('[data-demo]').forEach(function (button) {
      const active = button.dataset.demo === key;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function dismiss() {
    frame.removeAttribute('src');
    frame.classList.remove('is-ready');
    dialog.hidden = true;
    document.body.classList.remove('workbench-open');
    open.focus();
  }
  open.addEventListener('click', function () {
    dialog.hidden = false;
    document.body.classList.add('workbench-open');
    select('chainproof');
    close.focus();
  });
  close.addEventListener('click', dismiss);
  dialog.querySelectorAll('[data-demo]').forEach(function (button) {
    button.addEventListener('click', function () { select(button.dataset.demo); });
  });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) dismiss(); });
  document.addEventListener('keydown', function (event) {
    if (dialog.hidden) return;
    if (event.key === 'Escape') { dismiss(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll('button, a[href], iframe')).filter(function (el) { return el.offsetParent !== null; });
    if (event.shiftKey && document.activeElement === focusable[0]) {
      event.preventDefault(); focusable[focusable.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
      event.preventDefault(); focusable[0].focus();
    }
  });
})();
