/* The soundtrack starts only after an explicit visitor action. */
(function () {
  'use strict';
  var byId = function (id) { return document.getElementById(id); };
  var panel = byId('jukebox'), trigger = byId('jukebox-trigger'), close = byId('jukebox-close');
  var audio = byId('soundtrack'), play = byId('sound-toggle'), mute = byId('sound-mute');
  var volume = byId('sound-volume'), seek = byId('sound-seek');
  if (!panel || !trigger || !close || !audio || !play || !mute || !volume || !seek) return;
  if (!audio.canPlayType || !audio.canPlayType('audio/mpeg')) { trigger.hidden = true; return; }

  var current = byId('deck-current'), duration = byId('deck-duration');
  var percent = byId('sound-percent'), state = byId('deck-state');
  var miniState = byId('deck-trigger-status'), miniFill = byId('deck-trigger-fill');
  var playGlyph = play.querySelector('.deck-play-glyph'), playLabel = play.querySelector('.sound-label');
  var muteGlyph = mute.querySelector('span'), level = 0.4;
  try {
    var saved = localStorage.getItem('techmines-volume');
    if (saved !== null && Number.isFinite(Number(saved))) level = Math.max(0, Math.min(1, Number(saved)));
  } catch (error) { /* Storage is optional. */ }

  function clock(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
    var whole = Math.floor(seconds), minutes = Math.floor(whole / 60), left = String(whole % 60).padStart(2, '0');
    return minutes >= 60 ? Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0') + ':' + left : minutes + ':' + left;
  }
  function updatePlayback() {
    var playing = !audio.paused;
    play.setAttribute('aria-pressed', String(playing));
    play.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' Arpent Studio Edit');
    playGlyph.textContent = playing ? 'Ⅱ' : '▶';
    playLabel.textContent = playing ? 'PAUSE' : 'PLAY';
    panel.classList.toggle('is-playing', playing);
    trigger.classList.toggle('is-playing', playing);
    state.textContent = playing ? 'PLAYING' : 'STANDBY';
    miniState.textContent = playing ? 'PLAYING' : 'READY';
    trigger.setAttribute('aria-label', 'Open TECHMINES audio deck, ' + (playing ? 'playing' : 'paused'));
  }
  function updateMute() {
    var silent = audio.muted || Number(volume.value) === 0;
    mute.setAttribute('aria-pressed', String(audio.muted));
    mute.setAttribute('aria-label', audio.muted ? 'Unmute soundtrack' : 'Mute soundtrack');
    muteGlyph.textContent = silent ? '◖×' : '◖))';
  }
  function updateVolume() {
    volume.value = String(Math.round(level * 100));
    volume.style.setProperty('--fill', Math.round(level * 100) + '%');
    percent.textContent = Math.round(level * 100) + '%';
    updateMute();
  }
  function updateTime() {
    var length = audio.duration, valid = Number.isFinite(length) && length > 0;
    var ratio = valid ? Math.max(0, Math.min(1, audio.currentTime / length)) : 0;
    current.textContent = clock(audio.currentTime);
    duration.textContent = clock(length);
    seek.disabled = !valid;
    seek.value = String(Math.round(ratio * 1000));
    seek.style.setProperty('--fill', ratio * 100 + '%');
    seek.setAttribute('aria-valuetext', clock(audio.currentTime) + ' of ' + clock(length));
    miniFill.style.width = ratio * 100 + '%';
  }
  function closeDeck() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }
  trigger.addEventListener('click', function () {
    if (!panel.hidden) { closeDeck(); return; }
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    if (audio.preload === 'none') { audio.preload = 'metadata'; audio.load(); }
    close.focus();
  });
  close.addEventListener('click', closeDeck);
  panel.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { event.preventDefault(); closeDeck(); }
  });
  play.addEventListener('click', function () {
    if (!audio.paused) { audio.pause(); return; }
    audio.play().catch(function () { state.textContent = 'UNAVAILABLE'; miniState.textContent = 'ERROR'; });
  });
  mute.addEventListener('click', function () { audio.muted = !audio.muted; updateMute(); });
  volume.addEventListener('input', function () {
    level = Number(volume.value) / 100;
    audio.volume = level;
    if (level > 0) audio.muted = false;
    updateVolume();
    try { localStorage.setItem('techmines-volume', String(level)); } catch (error) { /* Optional preference. */ }
  });
  seek.addEventListener('input', function () {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = Number(seek.value) / 1000 * audio.duration;
      updateTime();
    }
  });
  ['play', 'pause'].forEach(function (name) { audio.addEventListener(name, updatePlayback); });
  ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked'].forEach(function (name) { audio.addEventListener(name, updateTime); });
  audio.addEventListener('error', function () { state.textContent = 'UNAVAILABLE'; miniState.textContent = 'ERROR'; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) audio.pause(); });
  window.addEventListener('pagehide', function () { audio.pause(); });
  audio.volume = level;
  if (Math.abs(audio.volume - level) > 0.01) {
    volume.disabled = true;
    byId('deck-volume-note').textContent = 'Use device volume for this browser.';
  }
  updateVolume();
  updatePlayback();
  updateTime();
})();
