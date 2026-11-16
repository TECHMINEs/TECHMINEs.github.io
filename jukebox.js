/* TECHMINES jukebox.
   A retro-modern jukebox parked in the corner of the page. Tap it to open the cabinet:
   the record plays and pauses, three keys switch the mix, and three dials set pace,
   volume and tone. Sound only ever starts after a click.

   Mix A is the site's original studio track (pace changes speed while keeping pitch).
   Mixes B and C are composed live in the browser with the Web Audio API, so their pace
   changes the tempo itself. C is a dark, cinematic grid piece: a pulsing sixteenth-note
   ostinato under swelling strings and low brass. */
(function () {
  'use strict';

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  // Resolve the track next to this script, whatever page loads it
  var BASE = document.currentScript ? document.currentScript.src : location.href;

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('tm-jbx-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('tm-jbx-' + k, JSON.stringify(v)); } catch (e) { /* optional */ } }
  };

  // ------------------------------------------------------------------ the mixes
  var MIXES = {
    A: { type: 'track', src: new URL('audio/arpent-studio.mp3', BASE).href },
    B: { // late night, half time
      type: 'synth', bpm: 84,
      chords: [[50, 53, 57, 60], [46, 50, 53, 57], [43, 46, 50, 53], [45, 49, 52, 55]],
      bass: [38, 46, 43, 45],
      kick:  'x......x..x.....',
      snare: '....x.......x...',
      hat:   '..x...x...x...x.',
      tick:  '..x.x.x...x.x.x.',
      bassLine: 'x.......x..x....',
      arp: [0, -1, 2, -1, 1, -1, 3, -1, 2, -1, 0, -1, 1, -1, 3, -1],
      arpLevel: 0.1, padLevel: 0.05, padCut: 1700, verb: 0.18
    },
    C: { // the grid: dark, cinematic, B minor
      type: 'synth', style: 'grid', bpm: 104,
      roots: [47, 43, 50, 45],                 // B, G, D, A
      thirds: [3, 4, 4, 4],                    // minor on B, major on the rest
      strings: [[59, 62, 66], [55, 59, 62], [57, 62, 66], [57, 61, 64]],
      verb: 0.34
    }
  };

  var state = {
    mix: MIXES[store.get('mix', 'A')] ? store.get('mix', 'A') : 'A',
    pace: clamp(store.get('pace', 1), 0.7, 1.4),
    volume: clamp(store.get('volume', 0.6), 0, 1),
    tone: clamp(store.get('tone', 0.85), 0, 1),
    playing: false
  };

  var ctx, out, toneFilter, comp, analyser, drumBus, synthBus, delay, delayWet, verb, verbWet, noise, shaper;
  var track, trackSource, trackTone;
  var step = 0, cycle = 0, nextTime = 0, timer = null;

  function clamp(v, a, b) { v = Number(v); return isFinite(v) ? Math.min(b, Math.max(a, v)) : a; }
  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function mix() { return MIXES[state.mix]; }
  function stepDur() { return 60 / ((mix().bpm || 100) * state.pace) / 4; }
  function toneHz() { return 700 * Math.pow(16000 / 700, state.tone); }

  function build() {
    ctx = new AudioCtx();
    out = ctx.createGain(); out.gain.value = 0;
    toneFilter = ctx.createBiquadFilter(); toneFilter.type = 'lowpass'; toneFilter.Q.value = 0.6; toneFilter.frequency.value = toneHz();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.22;
    analyser = ctx.createAnalyser(); analyser.fftSize = 128; analyser.smoothingTimeConstant = 0.78;

    drumBus = ctx.createGain(); drumBus.gain.value = 0.55;
    synthBus = ctx.createGain(); synthBus.gain.value = 0.6;

    delay = ctx.createDelay(2);
    var fb = ctx.createGain(); fb.gain.value = 0.32;
    var dTone = ctx.createBiquadFilter(); dTone.type = 'lowpass'; dTone.frequency.value = 2400;
    delayWet = ctx.createGain(); delayWet.gain.value = 0.22;
    delay.connect(dTone); dTone.connect(fb); fb.connect(delay); dTone.connect(delayWet);

    verb = ctx.createConvolver();
    var len = Math.floor(ctx.sampleRate * 2.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = ir.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    verb.buffer = ir;
    verbWet = ctx.createGain(); verbWet.gain.value = 0.18;
    verb.connect(verbWet);

    // gentle saturation for the grid ostinato
    shaper = ctx.createWaveShaper();
    var curve = new Float32Array(1024);
    for (var k = 0; k < 1024; k++) { var x = k / 512 - 1; curve[k] = Math.tanh(x * 2.4) / Math.tanh(2.4); }
    shaper.curve = curve; shaper.oversample = '2x';
    shaper.connect(synthBus);

    [drumBus, synthBus, delayWet, verbWet].forEach(function (n) { n.connect(toneFilter); });
    toneFilter.connect(comp); comp.connect(out); out.connect(analyser); analyser.connect(ctx.destination);

    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noise.getChannelData(0);
    for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
    retune();
  }

  // The studio track runs through its own tone filter and skips the compressor
  function ensureTrack() {
    if (track) return;
    track = new Audio(MIXES.A.src);
    track.loop = true;
    track.preload = 'auto';
    track.preservesPitch = true; track.mozPreservesPitch = true; track.webkitPreservesPitch = true;
    trackSource = ctx.createMediaElementSource(track);
    trackTone = ctx.createBiquadFilter(); trackTone.type = 'lowpass'; trackTone.Q.value = 0.5; trackTone.frequency.value = toneHz();
    trackSource.connect(trackTone); trackTone.connect(out);
  }

  function retune() {
    if (!ctx) return;
    var now = ctx.currentTime;
    delay.delayTime.setTargetAtTime(stepDur() * 3, now, 0.05);
    verbWet.gain.setTargetAtTime(mix().verb || 0.18, now, 0.2);
    if (track) track.playbackRate = state.pace;
  }

  // ------------------------------------------------------------------ instruments
  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function kick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.14);
    env(g, t, 0.62, 0.004, 0.3);
    o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.4);
  }

  function noiseHit(t, type, cutoff, level, decay, bus) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = cutoff;
    env(g, t, level, 0.002, decay);
    s.connect(f); f.connect(g); g.connect(bus || drumBus);
    s.start(t, Math.random() * 0.5); s.stop(t + decay + 0.05);
    return g;
  }

  function snare(t) {
    noiseHit(t, 'bandpass', 1900, 0.32, 0.2).connect(verb);
    var o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 185;
    env(og, t, 0.14, 0.002, 0.09);
    o.connect(og); og.connect(drumBus); o.start(t); o.stop(t + 0.12);
  }

  function bass(t, midi, dur) {
    var o = ctx.createOscillator(), sub = ctx.createOscillator(), subLevel = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq(midi);
    sub.type = 'sine'; sub.frequency.value = freq(midi - 12); subLevel.gain.value = 0.45;
    f.type = 'lowpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(820, t + 0.03); f.frequency.exponentialRampToValueAtTime(240, t + Math.min(dur, 0.35));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.008); g.gain.setTargetAtTime(0.0001, t + dur * 0.85, 0.05);
    o.connect(f); sub.connect(subLevel); subLevel.connect(f); f.connect(g); g.connect(synthBus);
    o.start(t); sub.start(t); o.stop(t + dur + 0.3); sub.stop(t + dur + 0.3);
  }

  function pad(t, chord, dur, level, cut, voices) {
    var f = ctx.createBiquadFilter(), g = ctx.createGain(), attack = Math.min(1.2, dur * 0.35);
    f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setValueAtTime(level, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    chord.forEach(function (m) {
      (voices || [-7, 7]).forEach(function (cents) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = freq(m); o.detune.value = cents;
        o.connect(f); o.start(t); o.stop(t + dur + 0.7);
      });
    });
    f.connect(g); g.connect(synthBus); g.connect(verb);
  }

  function pluck(t, midi, level) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = freq(midi);
    o2.type = 'square'; o2.frequency.value = freq(midi); o2.detune.value = 4; g2.gain.value = 0.25;
    f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.22);
    env(g, t, level, 0.003, 0.28);
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(synthBus); g.connect(delay);
    o.start(t); o2.start(t); o.stop(t + 0.35); o2.stop(t + 0.35);
  }

  // Grid instruments: a resonant pulse, a low brass swell, a cinematic boom, a sub drone
  function pulse(t, midi, cutoff, level) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq(midi);
    o2.type = 'square'; o2.frequency.value = freq(midi); o2.detune.value = -6;
    f.type = 'lowpass'; f.Q.value = 9;
    f.frequency.setValueAtTime(cutoff * 2.2, t); f.frequency.exponentialRampToValueAtTime(cutoff, t + 0.09);
    env(g, t, level, 0.002, stepDur() * 0.9);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(shaper); g.connect(delay);
    o.start(t); o2.start(t); o.stop(t + stepDur() + 0.1); o2.stop(t + stepDur() + 0.1);
  }

  function brass(t, notes, dur) {
    var f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(1500, t + dur * 0.45); f.frequency.linearRampToValueAtTime(500, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.35);
    g.gain.setValueAtTime(0.06, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    notes.forEach(function (m) {
      [-12, 0, 12].forEach(function (cents) {
        var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq(m); o.detune.value = cents;
        o.connect(f); o.start(t); o.stop(t + dur + 0.5);
      });
    });
    f.connect(g); g.connect(synthBus); g.connect(verb);
  }

  function boom(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.9);
    env(g, t, 0.5, 0.01, 1.3);
    o.connect(g); g.connect(drumBus); g.connect(verb); o.start(t); o.stop(t + 1.5);
    noiseHit(t, 'lowpass', 260, 0.25, 0.6).connect(verb);
  }

  function drone(t, midi, dur) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq(midi);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.4);
    g.gain.setValueAtTime(0.07, t + dur - 0.1); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    o.connect(g); g.connect(synthBus); o.start(t); o.stop(t + dur + 0.3);
  }

  // ------------------------------------------------------------------ sequencing
  function scheduleClassic(m, s, t) {
    var bar = Math.floor(s / 16) % 4, i = s % 16, chord = m.chords[bar], sd = stepDur();
    if (i === 0) pad(t, chord, sd * 16, m.padLevel, m.padCut);
    if (m.kick[i] === 'x') kick(t);
    if (m.snare[i] === 'x') snare(t);
    if (m.hat[i] === 'x') noiseHit(t, 'highpass', 5800, 0.22, 0.11);
    if (m.tick[i] === 'x') noiseHit(t, 'highpass', 7000, 0.09, 0.035);
    if (m.bassLine[i] === 'x') {
      var len = 1; while (i + len < 16 && m.bassLine[i + len] === '.') len++;
      bass(t, m.bass[bar], Math.min(len, 8) * sd);
    }
    var a = m.arp[i];
    if (a >= 0) pluck(t, chord[a % chord.length] + 12 * (1 + Math.floor(a / chord.length)), m.arpLevel);
  }

  function scheduleGrid(m, s, t) {
    var bar = Math.floor(s / 16) % 4, i = s % 16, sd = stepDur();
    var r = m.roots[bar], th = m.thirds[bar];
    // Sixteenth-note ostinato: root, octave, fifth, octave, with the third answering
    var shape = [0, 12, 7, 12, 0, 12, 7, 12 + th, 0, 12, 7, 12, 7, 12, 12 + th, 12];
    // The filter opens across each four-bar phrase and a little more every cycle
    var phrase = (s % 64) / 64, lift = Math.min(cycle, 3) / 3;
    pulse(t, r + shape[i], 320 + phrase * 900 + lift * 700, i % 4 === 0 ? 0.085 : 0.065);
    if (i === 0) {
      drone(t, r - 12, sd * 16);
      if (cycle >= 1) pad(t, m.strings[bar], sd * 16, 0.034, 2400, [-9, 0, 9]);
      if (bar === 0 || bar === 2) brass(t, [r - 12, r - 5], sd * 16);
      if (bar === 0) boom(t);
    }
    if (cycle >= 2 && (i === 4 || i === 12)) noiseHit(t, 'bandpass', 1500, 0.16, 0.3).connect(verb);
    if (i % 2 === 1) noiseHit(t, 'bandpass', 9500, 0.035, 0.03);
  }

  function schedule(s, t) {
    var m = mix();
    if (m.style === 'grid') scheduleGrid(m, s, t); else scheduleClassic(m, s, t);
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.12) {
      schedule(step, nextTime);
      nextTime += stepDur();
      step = (step + 1) % 64;
      if (step === 0) cycle++;
    }
  }

  function startSequencer() {
    step = 0; cycle = 0;
    nextTime = ctx.currentTime + 0.06;
    clearInterval(timer);
    timer = setInterval(tick, 25);
  }

  function stopSources() {
    clearInterval(timer); timer = null;
    if (track) track.pause();
  }

  function startSources() {
    if (mix().type === 'track') {
      ensureTrack();
      track.playbackRate = state.pace;
      track.play().catch(function () { state.playing = false; render(); });
    } else {
      startSequencer();
    }
  }

  function play() {
    if (!ctx) build();
    ctx.resume();
    retune();
    startSources();
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
    out.gain.linearRampToValueAtTime(state.volume * 0.85, ctx.currentTime + 0.35);
    state.playing = true;
    render(); loop();
  }

  function pause() {
    if (!ctx || !state.playing) return;
    state.playing = false;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    setTimeout(function () { if (!state.playing) { stopSources(); ctx.suspend(); } }, 300);
    render();
  }

  function setMix(key) {
    if (!MIXES[key] || key === state.mix) return;
    var wasPlaying = state.playing;
    if (ctx && wasPlaying) stopSources();
    state.mix = key; store.set('mix', key);
    if (ctx) { retune(); if (wasPlaying) startSources(); }
    render();
  }

  function setControl(name, value) {
    state[name] = value; store.set(name, value);
    if (ctx) {
      if (name === 'volume' && state.playing) out.gain.setTargetAtTime(value * 0.85, ctx.currentTime, 0.05);
      if (name === 'tone') {
        toneFilter.frequency.setTargetAtTime(toneHz(), ctx.currentTime, 0.05);
        if (trackTone) trackTone.frequency.setTargetAtTime(toneHz(), ctx.currentTime, 0.05);
      }
      if (name === 'pace') retune();
    }
    renderDials();
    root.style.setProperty('--beat', beat());
  }

  function beat() { return (60 / ((mix().bpm || 96) * state.pace)).toFixed(3) + 's'; }

  // ------------------------------------------------------------------ the jukebox
  var miniBulbs = '';
  for (var b = 0; b < 9; b++) {
    var ang = Math.PI + (Math.PI * b) / 8;
    miniBulbs += '<circle cx="' + (40 + Math.cos(ang) * 31).toFixed(2) + '" cy="' + (46 + Math.sin(ang) * 31).toFixed(2) + '" r="1.7" style="--i:' + b + '"/>';
  }
  var bulbs = '';
  for (var n = 0; n < 15; n++) bulbs += '<i style="--a:' + (-90 + (180 * n) / 14).toFixed(1) + 'deg;--i:' + n + '"></i>';

  function dial(name, label) {
    var ticks = '';
    for (var t = 0; t <= 10; t++) {
      var a = (-135 + t * 27) * Math.PI / 180, r1 = t % 5 === 0 ? 26.5 : 28.5, r2 = 31;
      ticks += '<line x1="' + (32 + Math.sin(a) * r1).toFixed(2) + '" y1="' + (32 - Math.cos(a) * r1).toFixed(2) + '" x2="' + (32 + Math.sin(a) * r2).toFixed(2) + '" y2="' + (32 - Math.cos(a) * r2).toFixed(2) + '"/>';
    }
    return '<div class="jbx-dial" data-dial="' + name + '">' +
      '<div class="jbx-dial-face"><svg class="jbx-scale" viewBox="0 0 64 64" aria-hidden="true">' + ticks + '</svg>' +
      '<span class="jbx-knob" role="slider" tabindex="0" aria-label="' + label + '" aria-valuemin="0" aria-valuemax="100"><i></i></span></div>' +
      '<span class="jbx-dial-label">' + label + '</span>' +
      '<output class="jbx-dial-value"></output></div>';
  }

  var root = document.createElement('div');
  root.className = 'jbx';
  root.innerHTML =
    '<button type="button" class="jbx-icon" aria-expanded="false" aria-controls="jbx-panel" aria-label="Open the jukebox">' +
      '<svg viewBox="0 0 80 112" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="jbxBody" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#202020"/><stop offset="1" stop-color="#060606"/></linearGradient>' +
          '<linearGradient id="jbxChrome" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f2f2f2"/><stop offset=".45" stop-color="#6d6d6d"/><stop offset="1" stop-color="#d6d6d6"/></linearGradient>' +
          '<linearGradient id="jbxRed" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff5a5a"/><stop offset="1" stop-color="#b30e16"/></linearGradient>' +
          '<radialGradient id="jbxGlass" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#2a2a2a"/><stop offset="1" stop-color="#030303"/></radialGradient>' +
        '</defs>' +
        '<g class="jbx-i-all">' +
          '<path class="jbx-i-body" d="M4 112V46a36 36 0 0 1 72 0v66z"/>' +
          '<rect x="7" y="54" width="4" height="50" class="jbx-i-pillar"/><rect x="69" y="54" width="4" height="50" class="jbx-i-pillar"/>' +
          '<path class="jbx-i-neon" d="M13 106V48a27 27 0 0 1 54 0v58"/>' +
          '<g class="jbx-i-bulbs">' + miniBulbs + '</g>' +
          '<path class="jbx-i-glass" d="M20 74V50a20 20 0 0 1 40 0v24z"/>' +
          '<g class="jbx-i-rec"><circle cx="40" cy="58" r="15" class="jbx-i-vinyl"/><circle cx="40" cy="58" r="11" class="jbx-i-groove"/><circle cx="40" cy="58" r="7.5" class="jbx-i-groove"/><circle cx="40" cy="58" r="4.5" class="jbx-i-label"/><circle cx="40" cy="58" r="1.2" class="jbx-i-hole"/></g>' +
          '<path class="jbx-i-shine" d="M24 50a16 16 0 0 1 12-14l1.5 2.6a13 13 0 0 0-10 11.4z"/>' +
          '<rect x="18" y="79" width="44" height="17" class="jbx-i-grille"/>' +
          '<g class="jbx-i-bars">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<rect x="' + (21 + i * 6) + '" y="83" width="3" height="10"/>'; }).join('') + '</g>' +
          '<rect x="22" y="99.5" width="10" height="4.5" class="jbx-i-key"/><rect x="35" y="99.5" width="10" height="4.5" class="jbx-i-key jbx-i-key--on"/><rect x="48" y="99.5" width="10" height="4.5" class="jbx-i-key"/>' +
          '<rect x="0" y="107" width="80" height="5" class="jbx-i-plinth"/><rect x="0" y="107" width="80" height="1" class="jbx-i-plinth-line"/>' +
        '</g>' +
      '</svg>' +
    '</button>' +
    '<div class="jbx-panel" id="jbx-panel" role="region" aria-label="TECHMINES jukebox" hidden>' +
      '<div class="jbx-cabinet">' +
        '<div class="jbx-crown">' +
          '<span class="jbx-bulbs" aria-hidden="true">' + bulbs + '</span>' +
          '<div class="jbx-dome">' +
            '<button type="button" class="jbx-record" aria-pressed="false" aria-label="Play music">' +
              '<svg viewBox="0 0 120 120" aria-hidden="true">' +
                '<g class="jbx-disc">' +
                  '<circle cx="60" cy="60" r="58" class="jbx-vinyl"/>' +
                  [53, 48, 43, 38, 33, 28].map(function (r) { return '<circle cx="60" cy="60" r="' + r + '" class="jbx-groove"/>'; }).join('') +
                  '<circle cx="60" cy="60" r="19" class="jbx-label"/>' +
                  '<circle cx="60" cy="60" r="13" class="jbx-label-ring"/>' +
                  '<rect x="57" y="44" width="6" height="3" class="jbx-label-mark"/>' +
                  '<circle cx="60" cy="60" r="2.6" class="jbx-hole"/>' +
                '</g>' +
                '<path class="jbx-sheen" d="M60 2a58 58 0 0 1 41 17L60 60z"/>' +
                '<path class="jbx-sheen" d="M60 118a58 58 0 0 1-41-17L60 60z"/>' +
              '</svg>' +
              '<span class="jbx-play-glyph" aria-hidden="true"></span>' +
            '</button>' +
            '<span class="jbx-arm" aria-hidden="true"></span>' +
          '</div>' +
        '</div>' +
        '<div class="jbx-deck">' +
          '<div class="jbx-keys" role="radiogroup" aria-label="Mix">' +
            ['A', 'B', 'C'].map(function (k) { return '<button type="button" role="radio" data-mix="' + k + '" aria-label="Mix ' + k + '"><i class="jbx-led" aria-hidden="true"></i><span>' + k + '</span></button>'; }).join('') +
          '</div>' +
          '<div class="jbx-dials">' + dial('pace', 'Pace') + dial('volume', 'Volume') + dial('tone', 'Tone') + '</div>' +
          '<div class="jbx-speaker"><canvas class="jbx-grille" width="520" height="84" aria-hidden="true"></canvas></div>' +
        '</div>' +
        '<div class="jbx-plinth"><button type="button" class="jbx-fold"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>Minimise</button></div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(root);

  var icon = root.querySelector('.jbx-icon');
  var panel = root.querySelector('.jbx-panel');
  var record = root.querySelector('.jbx-record');
  var fold = root.querySelector('.jbx-fold');
  var keys = Array.from(root.querySelectorAll('[data-mix]'));
  var grille = root.querySelector('.jbx-grille');
  var iconBars = Array.from(root.querySelectorAll('.jbx-i-bars rect'));
  var g2d = grille.getContext('2d');

  var DIALS = {
    pace:   { min: 0.7, max: 1.4, def: 1,    text: function (v) { return mix().type === 'track' ? Math.round(v * 100) + '%' : Math.round(mix().bpm * v) + ' bpm'; } },
    volume: { min: 0,   max: 1,   def: 0.6,  text: function (v) { return Math.round(v * 100) + '%'; } },
    tone:   { min: 0,   max: 1,   def: 0.85, text: function (v) { return v < 0.34 ? 'Warm' : v < 0.67 ? 'Even' : 'Bright'; } }
  };

  function renderDials() {
    Object.keys(DIALS).forEach(function (name) {
      var d = DIALS[name], wrap = root.querySelector('[data-dial="' + name + '"]');
      var knob = wrap.querySelector('.jbx-knob'), v = state[name], pct = (v - d.min) / (d.max - d.min);
      knob.style.setProperty('--turn', (-135 + pct * 270) + 'deg');
      knob.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
      knob.setAttribute('aria-valuetext', d.text(v));
      wrap.querySelector('.jbx-dial-value').textContent = d.text(v);
    });
  }

  function render() {
    root.classList.toggle('is-playing', state.playing);
    root.dataset.mix = state.mix;
    root.style.setProperty('--beat', beat());
    record.setAttribute('aria-pressed', String(state.playing));
    record.setAttribute('aria-label', state.playing ? 'Pause music' : 'Play music');
    icon.setAttribute('aria-label', (panel.hidden ? 'Open the jukebox' : 'Close the jukebox') + (state.playing ? ', music playing' : ''));
    keys.forEach(function (k) {
      var on = k.dataset.mix === state.mix;
      k.setAttribute('aria-checked', String(on));
      k.tabIndex = on ? 0 : -1;
    });
    renderDials();
  }

  function openPanel() {
    panel.hidden = false;
    root.classList.add('is-open');
    icon.setAttribute('aria-expanded', 'true');
    render();
    record.focus();
    loop();
  }

  function closePanel(returnFocus) {
    if (panel.hidden) return;
    panel.hidden = true;
    root.classList.remove('is-open');
    icon.setAttribute('aria-expanded', 'false');
    render();
    if (returnFocus) icon.focus();
  }

  icon.addEventListener('click', function () { if (panel.hidden) openPanel(); else closePanel(false); });
  fold.addEventListener('click', function () { closePanel(true); });
  record.addEventListener('click', function () { if (state.playing) pause(); else play(); });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closePanel(true); } });
  // Clicking anywhere else on the page folds the cabinet away; the music keeps playing
  document.addEventListener('pointerdown', function (e) { if (!panel.hidden && !root.contains(e.target)) closePanel(false); });

  keys.forEach(function (k, idx) {
    k.addEventListener('click', function () { setMix(k.dataset.mix); });
    k.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = keys[(idx + dir + keys.length) % keys.length];
      setMix(next.dataset.mix); next.focus();
    });
  });

  // Dials: drag up or down, scroll, arrow keys; double-click resets
  Object.keys(DIALS).forEach(function (name) {
    var d = DIALS[name], knob = root.querySelector('[data-dial="' + name + '"] .jbx-knob'), span = d.max - d.min;
    function nudge(delta) { setControl(name, clamp(state[name] + delta * span, d.min, d.max)); }
    var startY = 0, startV = 0, dragging = false;
    knob.addEventListener('pointerdown', function (e) {
      dragging = true; startY = e.clientY; startV = state[name];
      knob.setPointerCapture(e.pointerId); knob.classList.add('is-grabbed'); e.preventDefault();
    });
    knob.addEventListener('pointermove', function (e) {
      if (dragging) setControl(name, clamp(startV + (startY - e.clientY) / 160 * span, d.min, d.max));
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      knob.addEventListener(ev, function () { dragging = false; knob.classList.remove('is-grabbed'); });
    });
    knob.addEventListener('wheel', function (e) { e.preventDefault(); nudge(e.deltaY < 0 ? 0.04 : -0.04); }, { passive: false });
    knob.addEventListener('dblclick', function () { setControl(name, d.def); });
    knob.addEventListener('keydown', function (e) {
      var map = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 };
      if (e.key in map) { e.preventDefault(); nudge(map[e.key]); }
      else if (e.key === 'Home') { e.preventDefault(); setControl(name, d.min); }
      else if (e.key === 'End') { e.preventDefault(); setControl(name, d.max); }
    });
  });

  // Light bars behind the speaker mesh, and in the mini jukebox, follow the music
  var bins, raf = 0;
  function loop() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame() {
    raf = 0;
    if (!state.playing || !analyser) { drawIdle(); return; }
    if (!bins) bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);
    if (!panel.hidden) drawGrille(bins);
    iconBars.forEach(function (bar, i) {
      var h = 2 + (bins[2 + i * 4] / 255) * 11;
      bar.setAttribute('height', h.toFixed(1)); bar.setAttribute('y', (94 - h).toFixed(1));
    });
    raf = requestAnimationFrame(frame);
  }
  function drawGrille(data) {
    var w = grille.width, h = grille.height, cols = 26, gap = 6, bw = (w - gap * (cols - 1)) / cols;
    g2d.clearRect(0, 0, w, h);
    var grad = g2d.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#B30E16'); grad.addColorStop(0.6, '#FF2626'); grad.addColorStop(1, '#FF8A8A');
    g2d.fillStyle = grad;
    g2d.globalAlpha = data ? 0.95 : 0.3;
    for (var i = 0; i < cols; i++) {
      var v = data ? data[1 + Math.floor(i * 1.6)] / 255 : 0.08;
      var bh = Math.max(6, v * h);
      g2d.fillRect(i * (bw + gap), h - bh, bw, bh);
    }
    g2d.globalAlpha = 1;
  }
  function drawIdle() {
    drawGrille(null);
    iconBars.forEach(function (bar, i) {
      var h = [4, 7, 5, 9, 6, 8, 4][i];
      bar.setAttribute('height', String(h)); bar.setAttribute('y', String(94 - h));
    });
  }

  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.addEventListener('pagehide', pause);

  render();
  drawIdle();
  if (calm) root.classList.add('is-calm');
})();
