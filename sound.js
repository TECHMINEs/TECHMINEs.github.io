/* User-controlled Arpent / Studio Edit. Sound starts only when the visitor presses play. */
(function () {
  'use strict';
  var audio = document.getElementById('soundtrack');
  var button = document.getElementById('sound-toggle');
  var slider = document.getElementById('sound-volume');
  var label = button && button.querySelector('.sound-label');
  if (!audio || !button || !slider) return;

  if (!audio.canPlayType || !audio.canPlayType('audio/mpeg')) {
    button.closest('.sound-control').hidden = true;
    return;
  }

  var volume = 0.28;
  try {
    var stored = Number(localStorage.getItem('techmines-volume'));
    if (localStorage.getItem('techmines-volume') !== null &&
        Number.isFinite(stored) && stored >= 0 && stored <= 1) volume = stored;
  } catch (e) {}
  slider.value = String(Math.round(volume * 100));
  var frame = 0;
  var intent = 0;

  function updateUI(playing) {
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Pause TECHMINES soundtrack' : 'Play TECHMINES soundtrack');
    label.textContent = playing ? 'Sound on' : 'Sound off';
  }

  function fadeTo(target, duration, done) {
    cancelAnimationFrame(frame);
    var start = audio.volume;
    var begin = performance.now();
    function step(now) {
      var k = Math.min(1, (now - begin) / duration);
      audio.volume = Math.max(0, Math.min(1, start + (target - start) * k));
      if (k < 1) frame = requestAnimationFrame(step);
      else { frame = 0; if (done) done(); }
    }
    frame = requestAnimationFrame(step);
  }

  function stop(immediate) {
    var thisIntent = ++intent;
    updateUI(false);
    if (audio.paused) return;
    if (immediate) {
      cancelAnimationFrame(frame);
      frame = 0;
      audio.pause();
      audio.volume = 0;
      return;
    }
    fadeTo(0, 220, function () {
      if (thisIntent === intent) audio.pause();
    });
  }

  button.addEventListener('click', function () {
    if (!audio.paused) { stop(); return; }
    var thisIntent = ++intent;
    cancelAnimationFrame(frame);
    audio.volume = 0;
    audio.play().then(function () {
      if (thisIntent !== intent) { audio.pause(); return; }
      updateUI(true);
      fadeTo(volume, 650);
    }).catch(function () {
      updateUI(false);
      button.setAttribute('aria-label', 'Soundtrack unavailable');
    });
  });

  slider.addEventListener('input', function () {
    volume = Number(slider.value) / 100;
    if (!audio.paused) {
      cancelAnimationFrame(frame);
      audio.volume = volume;
    }
    try { localStorage.setItem('techmines-volume', String(volume)); } catch (e) {}
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(true);
  });
})();
