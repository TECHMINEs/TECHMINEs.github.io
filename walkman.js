/* Walkman: a cassette player in the corner that opens into the full deck. Three tapes,
   pace and tone knobs, a volume wheel, a preset button and a rack of spare tapes to drag
   into the door. Tape A is a studio track; B and C are composed live with Web Audio.
   Every visit opens on tape C at its home preset, playing as soon as the browser allows. */
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

  // The mixes
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

  // Presets for the red button: a name, a pace and a tone for each tape
  var PRESETS = {
    A: [['Studio', 1, 0.85], ['Slow & warm', 0.85, 0.3], ['Lifted', 1.15, 1], ['Late drive', 0.92, 0.55]],
    B: [['Late night', 1, 0.85], ['After hours', 0.85, 0.3], ['Rush hour', 1.2, 1], ['Low light', 0.92, 0.5]],
    C: [['The grid', 1, 0.85], ['Slow burn', 0.82, 0.35], ['Overdrive', 1.25, 1], ['Night shift', 0.95, 0.55]]
  };

  // Each visit starts on tape C with its home preset, "The grid" (pace 1, tone 0.85).
  // Only the volume carries over, and never below an audible level.
  var startVolume = clamp(store.get('volume', 0.6), 0, 1);
  var state = {
    mix: 'C',
    pace: PRESETS.C[0][1],
    volume: startVolume < 0.15 ? 0.6 : startVolume,
    tone: PRESETS.C[0][2],
    playing: false
  };

  var ctx, out, toneFilter, comp, analyser, drumBus, synthBus, delay, delayWet, verb, verbWet, noise, shaper;
  var track, trackSource, trackTone;
  var step = 0, cycle = 0, nextTime = 0, timer = null;

  function clamp(v, a, b) { v = Number(v); return isFinite(v) ? Math.min(b, Math.max(a, v)) : a; }
  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function mix() { return MIXES[state.mix]; }
  function level() { return state.volume * 0.85; }
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
    setTrackRate(false);
  }

  // The studio track is time-stretched by the browser. Changing its speed on every pixel of a
  // knob drag makes Safari stall or go silent, so the speed moves in 5% steps and is applied
  // once the knob settles (and at most a few times a second while it is turning).
  var rateTimer = 0, rateAt = 0;
  function trackRate() { return Math.round(state.pace * 20) / 20; }
  function setTrackRate(now) {
    if (!track) return;
    var want = trackRate();
    clearTimeout(rateTimer);
    if (Math.abs(track.playbackRate - want) < 0.001) return;
    var apply = function () {
      if (!track) return;
      rateAt = performance.now();
      track.defaultPlaybackRate = want;
      track.playbackRate = want;
      if (state.playing && mix().type === 'track' && track.paused) track.play().catch(function () {});
    };
    if (now) apply();
    else rateTimer = setTimeout(apply, performance.now() - rateAt > 400 ? 120 : 260);
  }

  // Instruments
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

  // Sequencing
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
      track.defaultPlaybackRate = trackRate(); track.playbackRate = trackRate();
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
    out.gain.linearRampToValueAtTime(level(), ctx.currentTime + 0.35);
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
      if (name === 'volume' && state.playing) out.gain.setTargetAtTime(level(), ctx.currentTime, 0.05);
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

  // The Walkman
  var RED = '#FF2626';
  var TAPES = {
    A: { label: 'Sunrise tape', face: '#f2f2f2', ink: RED,
         sym: '<path d="M3 16.5h18"/><path d="M7 16.5a5 5 0 0 1 10 0"/><path d="M12 6.2v2M6.6 8.9l1.4 1.4M17.4 8.9 16 10.3"/><path d="M6.5 20c1.2-.8 2.4-.8 3.6 0s2.4.8 3.6 0 2.4-.8 3.6 0"/>' },
    B: { label: 'Midnight tape', face: '#161616', ink: '#f2f2f2',
         sym: '<path d="M14.8 4.2a7.8 7.8 0 1 0 5.1 12.4 6.3 6.3 0 0 1-5.1-12.4z"/><path d="M18.6 3v3.2M17 4.6h3.2"/>' },
    C: { label: 'Grid tape', face: '#0a0a0a', ink: RED,
         sym: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.8" stroke-width="2.4"/><path d="M12 1.6v1.8M12 20.6v1.8M1.6 12h1.8M20.6 12h1.8"/>' }
  };
  var ORDER = ['A', 'B', 'C'];

  function symbol(key, x, y, s, color) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + TAPES[key].sym + '</g>';
  }

  // The Walkman drawing. `p` prefixes gradient ids; `live` adds roles and focus for the open deck.
  function art(p, live) {
    var u = function (id) { return 'url(#' + p + id + ')'; };
    var act = function (role, label, extra) { return live ? ' role="' + role + '" tabindex="0" aria-label="' + label + '"' + (extra || '') : ''; };
    var screw = function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="1.4" fill="' + u('knob') + '" stroke="#222" stroke-width=".3"/><path d="M' + (x - 0.8) + ' ' + y + 'h1.6" stroke="#333" stroke-width=".4"/>'; };
    var key = function (cls, x, w, glyph, role, label, extra) {
      return '<g class="wm-key ' + cls + '"' + act(role, label, extra) + '>' +
        '<rect x="' + x + '" y="3" width="' + w + '" height="13" rx="1.6" class="wm-key-cap"/>' +
        '<rect x="' + (x + 0.8) + '" y="3.6" width="' + (w - 1.6) + '" height="1.2" rx=".6" class="wm-key-shine"/>' + glyph + '</g>';
    };
    var reel = function (cx, cy) {
      var t = '';
      for (var k = 0; k < 6; k++) t += '<rect x="' + (cx - 0.64) + '" y="' + (cy - 4.2) + '" width="1.28" height="2.1" fill="#1a1a1a" transform="rotate(' + (k * 60) + ' ' + cx + ' ' + cy + ')"/>';
      return '<g class="wm-reel"><circle cx="' + cx + '" cy="' + cy + '" r="5.1" fill="#ececec" stroke="#8a8a8a" stroke-width=".5"/>' + t + '<circle cx="' + cx + '" cy="' + cy + '" r="1.6" fill="#2a2a2a"/></g>';
    };
    var knob = function (name, label, cx, cy) {
      var ticks = '';
      for (var i = 0; i <= 10; i++) {
        var a = (-135 + i * 27) * Math.PI / 180, r1 = i % 5 === 0 ? 8.9 : 9.5, r2 = 10.5;
        ticks += '<line x1="' + (cx + Math.sin(a) * r1).toFixed(2) + '" y1="' + (cy - Math.cos(a) * r1).toFixed(2) + '" x2="' + (cx + Math.sin(a) * r2).toFixed(2) + '" y2="' + (cy - Math.cos(a) * r2).toFixed(2) + '" class="' + (i % 5 === 0 ? 'wm-tick wm-tick--major' : 'wm-tick') + '"/>';
      }
      return '<g class="wm-knob" data-dial="' + name + '"' + act('slider', label, ' aria-valuemin="0" aria-valuemax="100"') + '>' + ticks +
        '<circle cx="' + cx + '" cy="' + cy + '" r="7.3" fill="' + u('knob') + '" stroke="#111" stroke-width=".6"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="5.1" fill="#1b1b1b"/>' +
        '<g class="wm-pointer" data-cx="' + cx + '" data-cy="' + cy + '"><rect x="' + (cx - 0.9) + '" y="' + (cy - 6.8) + '" width="1.8" height="4.2" fill="' + RED + '"/></g>' +
        '<text x="' + cx + '" y="' + (cy + 18.6) + '" class="wm-text">' + label + '</text></g>';
    };
    var vu = '';
    for (var v = -4; v <= 4; v++) {
      var an = v * 10 * Math.PI / 180, r1 = v % 2 === 0 ? 17.5 : 19, r2 = 21.5;
      vu += '<line x1="' + (40 + Math.sin(an) * r1).toFixed(2) + '" y1="' + (139 - Math.cos(an) * r1).toFixed(2) + '" x2="' + (40 + Math.sin(an) * r2).toFixed(2) + '" y2="' + (139 - Math.cos(an) * r2).toFixed(2) + '" stroke="' + (v >= 2 ? RED : '#d8d8d8') + '" stroke-width="' + (v % 2 === 0 ? 0.9 : 0.6) + '"/>';
    }
    var ribs = '';
    for (var i2 = 0; i2 < 13; i2++) ribs += '<rect x="111.6" y="' + (42 + i2 * 3) + '" width="5.8" height="1" fill="#8a8a8a"/>';
    var labels = ORDER.map(function (k) {
      return '<g class="wm-label" data-mix="' + k + '">' +
        '<rect x="29.5" y="34.5" width="63" height="15.2" rx="1.4" fill="' + TAPES[k].face + '" stroke="rgba(255,255,255,.16)" stroke-width=".4"/>' +
        '<rect x="29.5" y="48.3" width="63" height="1.4" fill="' + RED + '"/>' +
        '<rect x="33" y="38" width="14" height=".8" fill="' + (k === 'A' ? '#bbb' : '#444') + '"/><rect x="33" y="41" width="9" height=".8" fill="' + (k === 'A' ? '#bbb' : '#444') + '"/>' +
        symbol(k, 55.2, 35.6, 0.5, TAPES[k].ink) + '</g>';
    }).join('');
    var tapeKeys = ORDER.map(function (k, i) {
      var x = 22 + i * 23;
      return '<g class="wm-tape-key" data-mix="' + k + '"' + act('radio', TAPES[k].label) + '>' +
        '<rect x="' + x + '" y="87" width="20" height="11" rx="1.6" class="wm-tape-cap"/>' +
        '<circle cx="' + (x + 3.4) + '" cy="89.8" r="1" class="wm-tape-led"/>' +
        '<g class="wm-tape-sym">' + symbol(k, x + 7.2, 88.3, 0.36, 'currentColor') + '</g></g>';
    }).join('');

    return '<svg viewBox="0 0 124 172" class="wm-art"' + (live ? '' : ' aria-hidden="true"') + '>' +
      '<defs>' +
        '<linearGradient id="' + p + 'body" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#242424"/><stop offset="1" stop-color="#060606"/></linearGradient>' +
        '<linearGradient id="' + p + 'metal" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#dcdcdc"/><stop offset=".35" stop-color="#9e9e9e"/><stop offset=".6" stop-color="#cacaca"/><stop offset="1" stop-color="#808080"/></linearGradient>' +
        '<linearGradient id="' + p + 'dark" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#4a4a4a"/><stop offset=".4" stop-color="#262626"/><stop offset=".7" stop-color="#3a3a3a"/><stop offset="1" stop-color="#1c1c1c"/></linearGradient>' +
        '<pattern id="' + p + 'brush" width="2" height="1" patternUnits="userSpaceOnUse"><rect width="2" height=".5" fill="rgba(255,255,255,.08)"/></pattern>' +
        '<linearGradient id="' + p + 'chrome" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f6f6f6"/><stop offset=".45" stop-color="#6d6d6d"/><stop offset="1" stop-color="#dadada"/></linearGradient>' +
        '<linearGradient id="' + p + 'red" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff5c5c"/><stop offset="1" stop-color="#b30e16"/></linearGradient>' +
        '<linearGradient id="' + p + 'smoke" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgba(20,20,20,.22)"/><stop offset="1" stop-color="rgba(5,5,5,.5)"/></linearGradient>' +
        '<radialGradient id="' + p + 'knob" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#f0f0f0"/><stop offset=".55" stop-color="#7a7a7a"/><stop offset="1" stop-color="#2d2d2d"/></radialGradient>' +
        '<radialGradient id="' + p + 'vuglow" cx=".5" cy="1" r=".95"><stop offset="0" stop-color="rgba(255,70,70,.55)"/><stop offset="1" stop-color="rgba(255,38,38,0)"/></radialGradient>' +
        '<radialGradient id="' + p + 'vu" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#1c1c1c"/><stop offset="1" stop-color="#070707"/></radialGradient>' +
        '<clipPath id="' + p + 'door"><rect x="21" y="27" width="80" height="56" rx="4"/></clipPath>' +
      '</defs>' +
      // piano keys
      key('wm-key--play', 18, 32, '<path class="wm-glyph-play" d="M31.6 7.4l5 2.6-5 2.6z"/><path class="wm-glyph-pause" d="M31.4 7.4h2v5.2h-2zM35 7.4h2v5.2h-2z"/>', 'button', 'Play', ' aria-pressed="false"') +
      key('wm-key--stop', 52, 18, '<rect x="59" y="8" width="4" height="4" fill="#cfcfcf"/>', 'button', 'Stop') +
      key('wm-key--prev', 72, 16, '<path d="M83.6 7.6l-3.4 2.4 3.4 2.4zM80 7.6l-3.4 2.4 3.4 2.4z" fill="#cfcfcf"/>', 'button', 'Previous tape') +
      key('wm-key--next', 90, 16, '<path d="M94.4 7.6l3.4 2.4-3.4 2.4zM98 7.6l3.4 2.4-3.4 2.4z" fill="#cfcfcf"/>', 'button', 'Next tape') +
      // body and aluminium face
      '<rect x="10" y="15" width="102" height="152" rx="10" fill="' + u('body') + '" stroke="' + u('chrome') + '" stroke-width="1.6"/>' +
      '<rect x="11.6" y="16.6" width="98.8" height="148.8" rx="8.6" fill="none" stroke="rgba(255,255,255,.07)" stroke-width=".6"/>' +
      '<rect x="15" y="21" width="92" height="82" rx="6" fill="' + u('metal') + '"/><rect x="15" y="21" width="92" height="82" rx="6" fill="' + u('brush') + '"/>' +
      '<rect x="15.5" y="21.5" width="91" height="81" rx="6" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".6"/>' +
      // tape door
      '<rect x="20" y="26" width="82" height="58" rx="5" fill="' + u('chrome') + '"/>' +
      '<rect x="21" y="27" width="80" height="56" rx="4" fill="#060606"/>' +
      '<g clip-path="url(#' + p + 'door)"><g class="wm-tape">' +
        '<rect x="26" y="31" width="70" height="44.8" rx="3.5" fill="#1a1a1a" stroke="#3c3c3c" stroke-width=".7"/>' + labels +
        '<rect x="40" y="53.1" width="42" height="15" rx="2.8" fill="#080808" stroke="#2c2c2c" stroke-width=".5"/>' +
        '<circle class="wm-pack wm-pack--l" cx="47.7" cy="60.6" r="8" fill="#2a1912"/><circle class="wm-pack wm-pack--r" cx="74.3" cy="60.6" r="6" fill="#2a1912"/>' +
        reel(47.7, 60.6) + reel(74.3, 60.6) +
        '<path d="M40 68.1h42" stroke="#4a2f22" stroke-width=".8"/>' +
        '<circle cx="31.8" cy="71.1" r="1.2" fill="#333"/><circle cx="90.2" cy="71.1" r="1.2" fill="#333"/>' +
      '</g></g>' +
      '<rect x="21" y="27" width="80" height="56" rx="4" fill="' + u('smoke') + '" class="wm-glass"' + act('button', 'Swap tape') + '/>' +
      '<path d="M23 29h34l-26 52h-8z" fill="#fff" opacity=".1" pointer-events="none"/>' +
      '<rect x="21" y="27" width="80" height="56" rx="4" fill="none" class="wm-door-line"/>' +
      screw(18.4, 24.4) + screw(103.6, 24.4) + screw(18.4, 99.6) + screw(103.6, 99.6) +
      // tape selector keys and indicator lights
      '<g' + (live ? ' role="radiogroup" aria-label="Tape"' : '') + '>' + tapeKeys + '</g>' +
      '<circle cx="93.5" cy="92.5" r="1.7" class="wm-led wm-led--power"/><circle cx="99.5" cy="92.5" r="1.7" class="wm-led wm-led--play"/>' +
      '<rect x="15" y="106" width="92" height="1.4" fill="' + u('red') + '"/>' +
      // VU meter
      '<rect x="16" y="112" width="48" height="29" rx="2.4" fill="' + u('chrome') + '"/>' +
      '<rect x="17" y="113" width="46" height="27" rx="1.8" fill="' + u('vu') + '"/>' +
      '<rect x="17" y="113" width="46" height="27" rx="1.8" fill="' + u('vuglow') + '" class="wm-vu-glow"/>' +
      '<path d="M29.4 126.36A16.5 16.5 0 0 1 50.6 126.36" fill="none" stroke="#5a5a5a" stroke-width=".4"/>' +
      '<text x="57" y="137.6" class="wm-text wm-vu-tag">VU</text>' + vu +
      '<g class="wm-needle"><line x1="40" y1="139" x2="40" y2="118.5" stroke="' + RED + '" stroke-width="1" stroke-linecap="round"/></g>' +
      '<path d="M33 140a7 7 0 0 1 14 0z" fill="#1a1a1a" stroke="#444" stroke-width=".4"/>' +
      '<path d="M18.4 114.4h20l-12 24h-8z" fill="#fff" opacity=".06"/>' +
      // readout under the meter
      '<rect x="16" y="146" width="48" height="11" rx="1.8" fill="#0a0a0a" stroke="#2c2c2c" stroke-width=".5"/>' +
      '<text x="40" y="153.6" class="wm-text wm-readout">' + '</text>' +
      // counter and hotline (mute) button
      '<rect x="68" y="112" width="26" height="12" rx="1.8" fill="#0a0a0a" stroke="#3a3a3a" stroke-width=".5"/>' +
      '<text x="81" y="121.2" class="wm-counter">000</text><rect x="68" y="117.8" width="26" height=".4" fill="rgba(255,255,255,.12)"/>' +
      '<g class="wm-mute"' + act('button', 'Next preset') + '><circle cx="102.5" cy="118" r="4.8" fill="' + u('red') + '" stroke="#7a0a0e" stroke-width=".5"/><circle cx="101.3" cy="116.7" r="1.4" fill="rgba(255,255,255,.45)"/></g>' +
      knob('pace', 'Pace', 76, 141) + knob('tone', 'Tone', 100, 141) +
      // side volume wheel with its scale
      '<g class="wm-wheel" data-dial="volume"' + act('slider', 'Volume', ' aria-valuemin="0" aria-valuemax="100" aria-orientation="vertical"') + '>' +
        '<rect x="111" y="40" width="7" height="40.6" rx="3" fill="' + u('dark') + '" stroke="#555" stroke-width=".5"/>' + ribs +
        '<rect class="wm-wheel-mark" x="110.6" y="60" width="7.8" height="1.8" fill="' + RED + '"/></g>' +
    '</svg>';
  }

  // A loose cassette for the rack beside the deck
  function cassette(k) {
    var T = TAPES[k], reel = function (cx) { return '<circle cx="' + cx + '" cy="60.6" r="5.1" fill="#ececec" stroke="#8a8a8a" stroke-width=".5"/><circle cx="' + cx + '" cy="60.6" r="1.6" fill="#2a2a2a"/>'; };
    return '<svg viewBox="24 29 74 49" aria-hidden="true">' +
      '<rect x="26" y="31" width="70" height="44.8" rx="3.5" fill="#1a1a1a" stroke="#4a4a4a" stroke-width=".7"/>' +
      '<rect x="29.5" y="34.5" width="63" height="15.2" rx="1.4" fill="' + T.face + '" stroke="rgba(255,255,255,.16)" stroke-width=".4"/>' +
      '<rect x="29.5" y="48.3" width="63" height="1.4" fill="' + RED + '"/>' + symbol(k, 55.2, 35.6, 0.5, T.ink) +
      '<rect x="40" y="53.1" width="42" height="15" rx="2.8" fill="#080808" stroke="#2c2c2c" stroke-width=".5"/>' + reel(47.7) + reel(74.3) +
      '<circle cx="31.8" cy="71.1" r="1.2" fill="#333"/><circle cx="90.2" cy="71.1" r="1.2" fill="#333"/></svg>';
  }

  var root = document.createElement('div');
  root.className = 'wm';
  root.innerHTML =
    '<button type="button" class="wm-mini" data-cursor="open" aria-expanded="false" aria-controls="wm-deck" aria-label="Open the Walkman">' + art('wmm-', false) + '</button>' +
    '<span class="wm-hint" aria-hidden="true">Press play</span>' +
    '<div class="wm-deck" id="wm-deck" role="region" aria-label="TECHMINES Walkman" hidden>' + art('wmd-', true) +
      '<button type="button" class="wm-fold"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>Minimise</button>' +
      '<div class="wm-rack" role="group" aria-label="Tape rack">' + ORDER.map(function (k) {
        return '<button type="button" class="wm-cass" data-cursor="drag" data-mix="' + k + '" aria-label="Load the ' + TAPES[k].label.toLowerCase() + '">' + cassette(k) + '</button>';
      }).join('') + '<span class="wm-rack-note" aria-hidden="true">Drag a tape into the door</span></div>' +
    '</div>';
  document.body.appendChild(root);

  var mini = root.querySelector('.wm-mini');
  var deck = root.querySelector('.wm-deck');
  var fold = root.querySelector('.wm-fold');
  var playKey = deck.querySelector('.wm-key--play');
  var muteKey = deck.querySelector('.wm-mute');
  var tapeKeys = Array.from(deck.querySelectorAll('.wm-tape-key'));
  var played = 0, lastTick = 0, needle = -42, watchAt = 0, watchPos = -1;

  var DIALS = {
    pace:   { min: 0.7, max: 1.4, def: 1,    text: function (v) { return mix().type === 'track' ? Math.round(v * 20) * 5 + '% pace' : Math.round(mix().bpm * v) + ' bpm'; } },
    volume: { min: 0,   max: 1,   def: 0.6,  text: function (v) { return Math.round(v * 100) + '% volume'; } },
    tone:   { min: 0,   max: 1,   def: 0.85, text: function (v) { return v < 0.34 ? 'Warm tone' : v < 0.67 ? 'Even tone' : 'Bright tone'; } }
  };
  var lastTouched = 'pace';

  function each(sel, fn) { Array.from(root.querySelectorAll(sel)).forEach(fn); }

  function renderDials() {
    Object.keys(DIALS).forEach(function (name) {
      var d = DIALS[name], pct = (state[name] - d.min) / (d.max - d.min);
      each('[data-dial="' + name + '"]', function (el) {
        if (el.hasAttribute('role')) { el.setAttribute('aria-valuenow', String(Math.round(pct * 100))); el.setAttribute('aria-valuetext', d.text(state[name])); }
        var ptr = el.querySelector('.wm-pointer');
        if (ptr) ptr.setAttribute('transform', 'rotate(' + (-135 + pct * 270) + ' ' + ptr.dataset.cx + ' ' + ptr.dataset.cy + ')');
        var mark = el.querySelector('.wm-wheel-mark');
        if (mark) mark.setAttribute('y', (78.2 - pct * 36.6).toFixed(2));
      });
    });
    var shown = performance.now() < presetUntil ? presetName : DIALS[lastTouched].text(state[lastTouched]);
    each('.wm-readout', function (t) { t.textContent = shown; });
    root.style.setProperty('--spin', (2.6 / state.pace).toFixed(2) + 's');
    root.style.setProperty('--beat', beat());
  }

  function render() {
    root.classList.toggle('is-playing', state.playing);
    root.dataset.mix = state.mix;
    playKey.setAttribute('aria-pressed', String(state.playing));
    playKey.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
    mini.setAttribute('aria-label', (deck.hidden ? 'Open the Walkman' : 'Close the Walkman') + (state.playing ? ', music playing' : ''));
    tapeKeys.forEach(function (k) {
      var on = k.dataset.mix === state.mix;
      k.setAttribute('aria-checked', String(on));
      k.tabIndex = on ? 0 : -1;
    });
    renderDials();
  }

  // Swapping tapes: the cassette slides out of the door, changes, and slides back in
  var swapping = 0;
  function swapTo(key) {
    if (key === state.mix || !MIXES[key]) return;
    clearTimeout(swapping);
    if (calm) { setMix(key); return; }
    root.classList.add('is-swapping');
    swapping = setTimeout(function () {
      setMix(key);
      root.classList.remove('is-swapping');
    }, 230);
  }
  function skip(dir) { swapTo(ORDER[(ORDER.indexOf(state.mix) + dir + ORDER.length) % ORDER.length]); }

  // Opening and closing: the mini Walkman grows into the deck and shrinks back
  var closing = 0;
  function openDeck() {
    clearTimeout(closing);
    deck.classList.remove('is-closing');
    deck.hidden = false;
    root.classList.add('is-open', 'is-seen'); store.set('seen', true);
    mini.setAttribute('aria-expanded', 'true');
    render();
    playKey.focus();
    loop();
  }
  function closeDeck(returnFocus) {
    if (deck.hidden || deck.classList.contains('is-closing')) return;
    deck.classList.add('is-closing');
    mini.setAttribute('aria-expanded', 'false');
    closing = setTimeout(function () {
      deck.hidden = true;
      deck.classList.remove('is-closing');
      root.classList.remove('is-open');
      render();
      if (returnFocus) mini.focus();
    }, calm ? 0 : 240);
  }

  // Treat Enter and Space as a click on the drawn controls
  function press(el, fn) {
    el.addEventListener('click', fn);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
  }

  mini.addEventListener('click', function () { if (carried) { carried = false; return; } if (deck.hidden) openDeck(); else closeDeck(false); });

  // The Walkman can be carried to either side of the page: drag it and it settles in the nearer corner
  var carry = null, carried = false;
  function setSide(s) { root.classList.toggle('is-left', s === 'left'); }
  var savedSide = store.get('side', null);
  setSide(savedSide === 'left' || savedSide === 'right' ? savedSide : (window.innerWidth > 760 ? 'right' : 'left'));
  if (store.get('seen', false)) root.classList.add('is-seen');
  mini.addEventListener('pointerdown', function (e) { if (!e.button) carry = { x: e.clientX, y: e.clientY, id: e.pointerId, on: false }; });
  window.addEventListener('pointermove', function (e) {
    if (!carry) return;
    var dx = e.clientX - carry.x, dy = e.clientY - carry.y;
    if (!carry.on) {
      if (Math.hypot(dx, dy) < 8) return;
      carry.on = true; root.classList.add('is-carried');
      try { mini.setPointerCapture(carry.id); } catch (err) { /* optional */ }
    }
    root.style.transform = 'translate(' + dx + 'px,' + (Math.min(0, dy) * 0.35) + 'px) rotate(' + clamp(dx * 0.02, -6, 6) + 'deg)';
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) { window.addEventListener(ev, function () {
    if (!carry) return;
    var was = carry.on; carry = null;
    if (!was) return;
    carried = true; setTimeout(function () { carried = false; }, 120);
    // glide from where it was let go to its new corner
    var before = root.getBoundingClientRect();
    var next = before.left + before.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
    root.style.transform = ''; setSide(next); store.set('side', next);
    var after = root.getBoundingClientRect();
    root.style.transform = 'translate(' + (before.left - after.left) + 'px,' + (before.top - after.top) + 'px)';
    root.getBoundingClientRect();
    root.classList.remove('is-carried');
    root.style.transform = '';
  }); });
  fold.addEventListener('click', function () { closeDeck(true); });
  deck.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closeDeck(true); } });
  document.addEventListener('pointerdown', function (e) { if (!deck.hidden && !root.contains(e.target)) closeDeck(false); });

  press(playKey, function () { if (state.playing) pause(); else play(); });
  press(deck.querySelector('.wm-key--stop'), function () { pause(); });
  press(deck.querySelector('.wm-key--prev'), function () { skip(-1); });
  press(deck.querySelector('.wm-key--next'), function () { skip(1); });
  press(deck.querySelector('.wm-glass'), function () { skip(1); });

  // Loose tapes: drag one onto the door to load it, or just click it. The tape that was
  // playing pops back out into the rack.
  var glass = deck.querySelector('.wm-glass'), held = null;
  Array.from(deck.querySelectorAll('.wm-cass')).forEach(function (c) {
    c.addEventListener('pointerdown', function (e) { if (e.button) return; held = { c: c, x: e.clientX, y: e.clientY, on: false }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', function (e) {
      if (!held || held.c !== c) return;
      var dx = e.clientX - held.x, dy = e.clientY - held.y;
      if (!held.on && Math.hypot(dx, dy) < 6) return;
      held.on = true; c.classList.add('is-held'); root.classList.add('is-loading');
      c.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + clamp(dx * 0.05, -10, 10) + 'deg) scale(1.08)';
      var r = glass.getBoundingClientRect();
      root.classList.toggle('is-over', e.clientX > r.left - 14 && e.clientX < r.right + 14 && e.clientY > r.top - 14 && e.clientY < r.bottom + 14);
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) { c.addEventListener(ev, function () {
      if (!held || held.c !== c) return;
      var dropped = held.on && root.classList.contains('is-over');
      c.dataset.dragged = held.on ? '1' : '';
      held = null; c.classList.remove('is-held'); c.style.transform = ''; root.classList.remove('is-loading', 'is-over');
      if (dropped) swapTo(c.dataset.mix);
    }); });
    c.addEventListener('click', function () { if (c.dataset.dragged) { c.dataset.dragged = ''; return; } swapTo(c.dataset.mix); });
  });
  // The red button glides both knobs to the tape's next preset and names it on the display
  var presetAt = {}, presetName = '', presetUntil = 0, glide = 0;
  press(muteKey, function () {
    var list = PRESETS[state.mix] || PRESETS.A;
    var i = presetAt[state.mix] = ((presetAt[state.mix] == null ? 0 : presetAt[state.mix]) + 1) % list.length;
    var target = list[i], from = { pace: state.pace, tone: state.tone }, t0 = performance.now();
    presetName = target[0]; presetUntil = t0 + 2600;
    setTimeout(renderDials, 2650);
    muteKey.setAttribute('aria-label', 'Next preset (now ' + target[0] + ')');
    muteKey.classList.remove('is-hit'); void muteKey.getBoundingClientRect(); muteKey.classList.add('is-hit');
    cancelAnimationFrame(glide);
    (function slide(now) {
      var k = calm ? 1 : Math.min(1, (now - t0) / 480), e = 1 - Math.pow(1 - k, 3);
      setControl('pace', from.pace + (target[1] - from.pace) * e);
      setControl('tone', from.tone + (target[2] - from.tone) * e);
      if (k < 1) glide = requestAnimationFrame(slide);
    })(t0);
    // land exactly on the preset even if animation frames are paused (a background tab)
    setTimeout(function () { if (presetName === target[0]) { cancelAnimationFrame(glide); setControl('pace', target[1]); setControl('tone', target[2]); } }, 560);
  });
  tapeKeys.forEach(function (k, idx) {
    press(k, function () { swapTo(k.dataset.mix); });
    k.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = tapeKeys[(idx + dir + tapeKeys.length) % tapeKeys.length];
      swapTo(next.dataset.mix); next.focus();
    });
  });

  // Dials and the volume wheel: drag up or down, scroll, arrow keys; double-click resets
  Array.from(deck.querySelectorAll('[data-dial]')).forEach(function (el) {
    var name = el.dataset.dial, d = DIALS[name], span = d.max - d.min;
    function set(v) {
      lastTouched = name; presetUntil = 0;
      setControl(name, clamp(v, d.min, d.max));
    }
    var startY = 0, startV = 0, dragging = false;
    el.addEventListener('pointerdown', function (e) { dragging = true; startY = e.clientY; startV = state[name]; el.setPointerCapture(e.pointerId); e.preventDefault(); el.focus(); });
    el.addEventListener('pointermove', function (e) { if (dragging) set(startV + (startY - e.clientY) / 150 * span); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { el.addEventListener(ev, function () { dragging = false; }); });
    el.addEventListener('wheel', function (e) { e.preventDefault(); set(state[name] + (e.deltaY < 0 ? 0.04 : -0.04) * span); }, { passive: false });
    el.addEventListener('dblclick', function () { set(d.def); });
    el.addEventListener('keydown', function (e) {
      var map = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 };
      if (e.key in map) { e.preventDefault(); set(state[name] + map[e.key] * span); }
      else if (e.key === 'Home') { e.preventDefault(); set(d.min); }
      else if (e.key === 'End') { e.preventDefault(); set(d.max); }
    });
  });

  // While playing: the VU needle follows the music, the counter runs, the tape winds across
  var bins, raf = 0, beatAvg = 0, beatAt = 0;
  function loop() { if (!raf) raf = requestAnimationFrame(frame); }
  function setNeedle(a) { each('.wm-needle', function (n) { n.setAttribute('transform', 'rotate(' + a.toFixed(1) + ' 40 139)'); }); }
  function frame(now) {
    raf = 0;
    var level = 0;
    if (state.playing && analyser) {
      if (!bins) bins = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(bins);
      var sum = 0; for (var i = 0; i < 24; i++) sum += bins[i];
      level = Math.min(1, sum / 24 / 150);
      // tell the rest of the page when the music hits, so the circuit behind it can answer
      beatAvg += (level - beatAvg) * 0.08;
      if (level > 0.28 && level > beatAvg * 1.15 && now - beatAt > 180) {
        beatAt = now;
        window.dispatchEvent(new CustomEvent('tm:beat', { detail: { strength: Math.min(1, 0.45 + (level - beatAvg) * 2.5) } }));
      }
    }
    var goal = -42 + level * 84;
    needle += (goal - needle) * (goal > needle ? 0.35 : 0.08);
    setNeedle(needle);
    if (state.playing) {
      // keep the studio track running: if the browser stalls it, nudge it back into play
      if (track && mix().type === 'track' && now - watchAt > 900) {
        if (track.paused || (track.currentTime === watchPos && track.readyState >= 2)) {
          try { if (track.currentTime === watchPos) track.currentTime = track.currentTime + 0.01; } catch (e) {}
          track.play().catch(function () {});
        }
        watchAt = now; watchPos = track.currentTime;
      }
      if (lastTick) played += (now - lastTick) / 1000 * state.pace;
      lastTick = now;
      var count = String(Math.floor(played / 2) % 1000);
      while (count.length < 3) count = '0' + count;
      each('.wm-counter', function (t) { if (t.textContent !== count) t.textContent = count; });
      var prog = (played % 96) / 96;
      each('.wm-pack--l', function (c) { c.setAttribute('r', (5 + 4.4 * (1 - prog)).toFixed(2)); });
      each('.wm-pack--r', function (c) { c.setAttribute('r', (5 + 4.4 * prog).toFixed(2)); });
      raf = requestAnimationFrame(frame);
    } else {
      lastTick = 0;
      if (Math.abs(needle + 42) > 0.3) raf = requestAnimationFrame(frame);
    }
  }

  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.addEventListener('pagehide', pause);

  // Start the music as soon as the page opens. Browsers only allow sound after the
  // visitor's first click, tap or key press, so if this first attempt is held back,
  // the music starts on that first interaction instead.
  function autoStart() {
    play();
    if (ctx.state === 'running') return;
    stopSources(); state.playing = false; render();
    var events = ['pointerdown', 'keydown', 'touchend'];
    function unlock(e) {
      events.forEach(function (t) { document.removeEventListener(t, unlock, true); });
      // The Walkman's own keys and the mainboard switch handle their own clicks
      if (e && e.target && e.target.closest && e.target.closest('.wm-deck, .toy-sw')) return;
      if (!state.playing) play();
    }
    events.forEach(function (t) { document.addEventListener(t, unlock, true); });
  }

  render();
  setNeedle(needle);
  if (calm) root.classList.add('is-calm');
  autoStart();
})();
