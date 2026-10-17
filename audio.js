/**
 * ほしあめ夜市 — Web Audio 手続き的シンセ（SFX / BGM）
 * 著作権音源・外部CDNなし。Node(test.js)では window ガードで何もしない。
 */
(function (root) {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  var STORAGE_KEY = 'hoshiame-audio-v1';
  var AudioCtx = window.AudioContext || window.webkitAudioContext;

  var ctx = null;
  var masterGain = null;
  var bgmGain = null;
  var seGain = null;
  var started = false;
  var bgmPlaying = false;
  var bgmMode = 'play'; // play | shop
  var nextNoteTime = 0;
  var scheduleTimer = null;
  var stepIndex = 0;

  var settings = {
    bgmMuted: false,
    seMuted: false,
    bgmVolume: 0.45,
    seVolume: 0.7
  };

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (typeof parsed.bgmMuted === 'boolean') settings.bgmMuted = parsed.bgmMuted;
      if (typeof parsed.seMuted === 'boolean') settings.seMuted = parsed.seMuted;
      if (typeof parsed.bgmVolume === 'number') settings.bgmVolume = clamp(parsed.bgmVolume, 0, 1);
      if (typeof parsed.seVolume === 'number') settings.seVolume = clamp(parsed.seVolume, 0, 1);
    } catch (e) { /* ignore */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) { /* ignore */ }
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function ensureContext() {
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ctx.destination);

      bgmGain = ctx.createGain();
      bgmGain.gain.value = settings.bgmMuted ? 0 : settings.bgmVolume;
      bgmGain.connect(masterGain);

      seGain = ctx.createGain();
      seGain.gain.value = settings.seMuted ? 0 : settings.seVolume;
      seGain.connect(masterGain);
    }
    return ctx;
  }

  function resume() {
    ensureContext();
    if (!ctx) return Promise.resolve(false);
    if (ctx.state === 'suspended') {
      return ctx.resume().then(function () {
        started = true;
        return true;
      }).catch(function () { return false; });
    }
    started = true;
    return Promise.resolve(true);
  }

  function applyVolumes() {
    if (!ctx) return;
    var now = ctx.currentTime;
    bgmGain.gain.cancelScheduledValues(now);
    seGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setTargetAtTime(settings.bgmMuted ? 0 : settings.bgmVolume, now, 0.03);
    seGain.gain.setTargetAtTime(settings.seMuted ? 0 : settings.seVolume, now, 0.03);
  }

  // ---- ノイズバッファ ----
  var noiseBuffer = null;
  function getNoiseBuffer() {
    if (!ctx) return null;
    if (noiseBuffer) return noiseBuffer;
    var len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  /**
   * jsfxr風パラメータで短い効果音を合成
   * @param {object} p
   *   wave: 'sine'|'square'|'triangle'|'sawtooth'|'noise'
   *   freq, freqEnd (Hz)
   *   attack, decay, sustain, release (秒)
   *   sustainLevel (0-1)
   *   filterFreq, filterQ
   *   duty (square only, unused broadly)
   *   slide (extra pitch curve)
   *   volume
   *   delay (start offset)
   *   type: destination bus 'se'|'bgm'
   */
  function playTone(p) {
    if (!started || !ctx || settings.seMuted && (p.type || 'se') === 'se') return;
    ensureContext();
    var t0 = ctx.currentTime + (p.delay || 0);
    var bus = (p.type === 'bgm') ? bgmGain : seGain;
    var vol = (p.volume != null ? p.volume : 0.35);

    var attack = p.attack != null ? p.attack : 0.005;
    var decay = p.decay != null ? p.decay : 0.05;
    var sustain = p.sustain != null ? p.sustain : 0.04;
    var release = p.release != null ? p.release : 0.08;
    var susLevel = p.sustainLevel != null ? p.sustainLevel : 0.5;
    var total = attack + decay + sustain + release;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * susLevel), t0 + attack + decay);
    gain.gain.setValueAtTime(Math.max(0.001, vol * susLevel), t0 + attack + decay + sustain);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + total);

    var filter = null;
    if (p.filterFreq) {
      filter = ctx.createBiquadFilter();
      filter.type = p.filterType || 'lowpass';
      filter.frequency.setValueAtTime(p.filterFreq, t0);
      if (p.filterFreqEnd) {
        filter.frequency.linearRampToValueAtTime(p.filterFreqEnd, t0 + total);
      }
      filter.Q.value = p.filterQ != null ? p.filterQ : 1;
    }

    var src;
    if (p.wave === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer();
      src.loop = true;
    } else {
      src = ctx.createOscillator();
      src.type = p.wave || 'square';
      var f0 = p.freq || 440;
      var f1 = p.freqEnd != null ? p.freqEnd : f0;
      src.frequency.setValueAtTime(f0, t0);
      if (f1 !== f0) {
        src.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + total);
      }
    }

    if (filter) {
      src.connect(filter);
      filter.connect(gain);
    } else {
      src.connect(gain);
    }
    gain.connect(bus);

    src.start(t0);
    src.stop(t0 + total + 0.02);
  }

  function playChord(freqs, opts) {
    opts = opts || {};
    for (var i = 0; i < freqs.length; i++) {
      playTone({
        wave: opts.wave || 'triangle',
        freq: freqs[i],
        freqEnd: freqs[i] * (opts.slide || 1),
        attack: opts.attack != null ? opts.attack : 0.01,
        decay: opts.decay != null ? opts.decay : 0.12,
        sustain: opts.sustain != null ? opts.sustain : 0.2,
        release: opts.release != null ? opts.release : 0.35,
        sustainLevel: opts.sustainLevel != null ? opts.sustainLevel : 0.45,
        volume: (opts.volume != null ? opts.volume : 0.18) * (1 - i * 0.08),
        delay: (opts.stagger || 0) * i,
        filterFreq: opts.filterFreq || 2400
      });
    }
  }

  // ---- 名前付き SFX ----
  var SFX = {
    deal: function () {
      playTone({
        wave: 'triangle', freq: 620, freqEnd: 880,
        attack: 0.002, decay: 0.04, sustain: 0.01, release: 0.06,
        sustainLevel: 0.3, volume: 0.22, filterFreq: 3200
      });
    },
    select: function () {
      playTone({
        wave: 'sine', freq: 740, freqEnd: 980,
        attack: 0.002, decay: 0.03, sustain: 0.02, release: 0.05,
        volume: 0.2
      });
    },
    deselect: function () {
      playTone({
        wave: 'sine', freq: 520, freqEnd: 360,
        attack: 0.002, decay: 0.04, sustain: 0.01, release: 0.05,
        volume: 0.16
      });
    },
    /** 全選択解除：短く柔らかい下降2音（deselect より静か） */
    deselectAll: function () {
      playTone({
        wave: 'sine', freq: 480, freqEnd: 340,
        attack: 0.002, decay: 0.035, sustain: 0.01, release: 0.05,
        volume: 0.1, filterFreq: 1800, filterType: 'lowpass'
      });
      playTone({
        wave: 'triangle', freq: 360, freqEnd: 260,
        attack: 0.002, decay: 0.04, sustain: 0.008, release: 0.06,
        volume: 0.07, delay: 0.045, filterFreq: 1400, filterType: 'lowpass'
      });
    },
    flip: function () {
      playTone({
        wave: 'noise',
        attack: 0.001, decay: 0.03, sustain: 0.01, release: 0.04,
        volume: 0.12, filterFreq: 1800, filterFreqEnd: 600, filterType: 'bandpass', filterQ: 2
      });
      playTone({
        wave: 'square', freq: 280, freqEnd: 420,
        attack: 0.001, decay: 0.05, sustain: 0.02, release: 0.04,
        volume: 0.1, delay: 0.01
      });
    },
    discard: function () {
      playTone({
        wave: 'sawtooth', freq: 300, freqEnd: 90,
        attack: 0.005, decay: 0.08, sustain: 0.04, release: 0.12,
        sustainLevel: 0.25, volume: 0.2, filterFreq: 900, filterFreqEnd: 200
      });
    },
    play: function () {
      playTone({
        wave: 'triangle', freq: 440, freqEnd: 660,
        attack: 0.005, decay: 0.06, sustain: 0.05, release: 0.1,
        volume: 0.24
      });
      playTone({
        wave: 'sine', freq: 880, freqEnd: 1100,
        attack: 0.01, decay: 0.08, sustain: 0.05, release: 0.12,
        volume: 0.14, delay: 0.04
      });
    },
    chipTick: function (i) {
      var base = 520 + (i || 0) * 28;
      playTone({
        wave: 'square', freq: base, freqEnd: base * 1.05,
        attack: 0.001, decay: 0.025, sustain: 0.01, release: 0.03,
        volume: 0.12, filterFreq: 2800
      });
    },
    chipCount: function (n) {
      var count = Math.min(Math.max(n || 6, 3), 14);
      for (var i = 0; i < count; i++) {
        (function (idx) {
          setTimeout(function () { SFX.chipTick(idx); }, idx * 55);
        })(i);
      }
    },
    multHit: function () {
      playTone({
        wave: 'sawtooth', freq: 220, freqEnd: 880,
        attack: 0.005, decay: 0.1, sustain: 0.08, release: 0.15,
        sustainLevel: 0.4, volume: 0.22, filterFreq: 1600, filterFreqEnd: 3200
      });
      playTone({
        wave: 'triangle', freq: 660, freqEnd: 990,
        attack: 0.01, decay: 0.08, sustain: 0.06, release: 0.12,
        volume: 0.16, delay: 0.05
      });
    },
    bigScore: function () {
      // 和音ファンファーレ（夜市ネオン風ペンタ）
      playChord([392, 494, 587, 740], {
        wave: 'triangle', attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.45,
        volume: 0.2, stagger: 0.05, filterFreq: 2800
      });
      playTone({
        wave: 'noise', attack: 0.002, decay: 0.08, sustain: 0.05, release: 0.2,
        volume: 0.1, filterFreq: 2400, filterType: 'bandpass', filterQ: 1.5, delay: 0.02
      });
    },
    roundClear: function () {
      playChord([523.25, 659.25, 783.99], {
        wave: 'sine', attack: 0.02, decay: 0.12, sustain: 0.3, release: 0.5,
        volume: 0.22, stagger: 0.08
      });
      playTone({
        wave: 'triangle', freq: 1046.5, freqEnd: 1318.5,
        attack: 0.02, decay: 0.1, sustain: 0.15, release: 0.35,
        volume: 0.14, delay: 0.25
      });
    },
    fail: function () {
      playTone({
        wave: 'sawtooth', freq: 220, freqEnd: 80,
        attack: 0.02, decay: 0.2, sustain: 0.15, release: 0.35,
        sustainLevel: 0.35, volume: 0.22, filterFreq: 800, filterFreqEnd: 150
      });
      playTone({
        wave: 'triangle', freq: 165, freqEnd: 70,
        attack: 0.03, decay: 0.25, sustain: 0.2, release: 0.4,
        volume: 0.14, delay: 0.08
      });
    },
    gameOver: function () {
      playChord([196, 233, 277], {
        wave: 'triangle', attack: 0.04, decay: 0.25, sustain: 0.35, release: 0.6,
        volume: 0.18, stagger: 0.12, slide: 0.85
      });
    },
    buy: function () {
      playTone({
        wave: 'square', freq: 660, freqEnd: 990,
        attack: 0.005, decay: 0.06, sustain: 0.04, release: 0.08,
        volume: 0.2
      });
      playTone({
        wave: 'sine', freq: 1320,
        attack: 0.01, decay: 0.08, sustain: 0.05, release: 0.1,
        volume: 0.12, delay: 0.06
      });
    },
    sell: function () {
      playTone({
        wave: 'triangle', freq: 500, freqEnd: 280,
        attack: 0.005, decay: 0.07, sustain: 0.04, release: 0.1,
        volume: 0.18
      });
    },
    reroll: function () {
      playTone({
        wave: 'noise', attack: 0.002, decay: 0.05, sustain: 0.04, release: 0.08,
        volume: 0.12, filterFreq: 1400, filterFreqEnd: 400, filterType: 'bandpass', filterQ: 3
      });
      playTone({
        wave: 'square', freq: 400, freqEnd: 700,
        attack: 0.005, decay: 0.06, sustain: 0.03, release: 0.06,
        volume: 0.14, delay: 0.04
      });
    },
    hover: function () {
      playTone({
        wave: 'sine', freq: 880,
        attack: 0.001, decay: 0.02, sustain: 0.01, release: 0.03,
        volume: 0.06
      });
    },
    click: function () {
      playTone({
        wave: 'square', freq: 420, freqEnd: 320,
        attack: 0.001, decay: 0.03, sustain: 0.01, release: 0.04,
        volume: 0.12, filterFreq: 2000
      });
    },
    omamori: function () {
      playTone({
        wave: 'sine', freq: 784, freqEnd: 1175,
        attack: 0.01, decay: 0.1, sustain: 0.12, release: 0.25,
        volume: 0.2
      });
      playTone({
        wave: 'triangle', freq: 1175, freqEnd: 1568,
        attack: 0.02, decay: 0.12, sustain: 0.1, release: 0.3,
        volume: 0.12, delay: 0.08
      });
      playTone({
        wave: 'noise', attack: 0.005, decay: 0.08, sustain: 0.04, release: 0.15,
        volume: 0.06, filterFreq: 3000, filterType: 'highpass', delay: 0.02
      });
    }
  };

  // ---- BGM（夜越ペンタトニック + ベース + 軽いドラム）----
  // 律旋法っぽい: D E G A B (D minor pentatonic / 和風)
  var SCALE_PLAY = [294, 330, 392, 440, 494, 587, 660];
  var SCALE_SHOP = [262, 311, 349, 415, 466, 523, 622]; // 少し明るく・半音ずれ
  var MELODY_PLAY = [0, 2, 4, 2, 3, 4, 1, 0, 4, 3, 2, 4, 5, 4, 2, 0];
  var MELODY_SHOP = [1, 3, 5, 3, 4, 5, 2, 1, 5, 4, 3, 5, 6, 5, 3, 1];
  var BASS_PLAY = [0, 0, 3, 2, 0, 0, 4, 3];
  var BASS_SHOP = [0, 2, 4, 2, 0, 3, 5, 3];

  var LOOKAHEAD = 0.12;
  var SCHEDULE_AHEAD = 0.25;
  var STEP_DUR = 0.22; // 16ths-ish

  function scheduleNote(time, freq, wave, vol, dur, bus) {
    if (!ctx) return;
    var osc = ctx.createOscillator();
    osc.type = wave || 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = wave === 'square' ? 1800 : 3200;
    osc.connect(f);
    f.connect(g);
    g.connect(bus || bgmGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function scheduleDrum(time, kind) {
    if (!ctx) return;
    if (kind === 'kick') {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.28, time + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
      osc.connect(g);
      g.connect(bgmGain);
      osc.start(time);
      osc.stop(time + 0.16);
    } else if (kind === 'hat') {
      var src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer();
      var f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 6000;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.06, time + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
      src.connect(f);
      f.connect(g);
      g.connect(bgmGain);
      src.start(time);
      src.stop(time + 0.05);
    }
  }

  function scheduleStep(step, time) {
    var shop = bgmMode === 'shop';
    var scale = shop ? SCALE_SHOP : SCALE_PLAY;
    var melody = shop ? MELODY_SHOP : MELODY_PLAY;
    var bassPat = shop ? BASS_SHOP : BASS_PLAY;
    var mi = melody[step % melody.length];
    var bi = bassPat[step % bassPat.length];

    // ベース（4分）
    if (step % 2 === 0) {
      scheduleNote(time, scale[bi] / 2, 'triangle', shop ? 0.1 : 0.12, STEP_DUR * 1.6);
    }
    // メロディ
    if (step % 2 === 0 || (shop && step % 4 === 1)) {
      scheduleNote(time, scale[mi], shop ? 'sine' : 'triangle', shop ? 0.09 : 0.11, STEP_DUR * 1.4);
    }
    // 装飾（高音）
    if (step % 8 === 4) {
      scheduleNote(time, scale[mi] * 2, 'sine', 0.045, STEP_DUR * 0.9);
    }
    // ドラム
    if (step % 4 === 0) scheduleDrum(time, 'kick');
    if (step % 2 === 1) scheduleDrum(time, 'hat');
    if (shop && step % 8 === 6) scheduleDrum(time, 'hat');
  }

  function schedulerTick() {
    if (!bgmPlaying || !ctx) return;
    var now = ctx.currentTime;
    while (nextNoteTime < now + SCHEDULE_AHEAD) {
      scheduleStep(stepIndex, nextNoteTime);
      nextNoteTime += STEP_DUR;
      stepIndex++;
    }
  }

  function startBgm(mode) {
    ensureContext();
    if (!ctx || !started) return;
    if (mode) bgmMode = mode;
    if (bgmPlaying) return;
    bgmPlaying = true;
    stepIndex = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    schedulerTick();
    scheduleTimer = setInterval(schedulerTick, LOOKAHEAD * 1000);
  }

  function stopBgm() {
    bgmPlaying = false;
    if (scheduleTimer) {
      clearInterval(scheduleTimer);
      scheduleTimer = null;
    }
  }

  function setBgmMode(mode) {
    if (mode === bgmMode) return;
    bgmMode = mode === 'shop' ? 'shop' : 'play';
  }

  function play(name) {
    if (!started) return;
    var fn = SFX[name];
    if (typeof fn === 'function') fn();
  }

  // ---- UI ----
  function iconSpeaker(muted) {
    if (muted) {
      return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
        '<path fill="currentColor" d="M4 9v6h3l5 4V5L7 9H4zm11.5 3l2.1-2.1 1.4 1.4L17 13.4l2 2-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1-2.1-2.1 1.4-1.4 2.1 2.1z"/>' +
        '</svg>';
    }
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path fill="currentColor" d="M4 9v6h3l5 4V5L7 9H4zm11.5 3c0-1.8-1-3.3-2.5-4v8c1.5-.7 2.5-2.2 2.5-4z"/>' +
      '<path fill="currentColor" d="M14 3.2v2.1c2.9.9 5 3.5 5 6.7s-2.1 5.8-5 6.7v2.1c4-.9 7-4.5 7-8.8s-3-7.9-7-8.8z"/>' +
      '</svg>';
  }

  function iconNote() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="currentColor" d="M12 3v10.5a3.5 3.5 0 1 1-2-3.15V5l8-2v8.5a3.5 3.5 0 1 1-2-3.15V3l-4 1z"/>' +
      '</svg>';
  }

  function iconWave() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="currentColor" d="M3 12h2l2-6 3 12 3-10 2 4h6v2h-7l-1.5-3-3.2 10.5L6 12H3z"/>' +
      '</svg>';
  }

  function iconGear() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.6a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.49.39 1.03.7 1.62.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.62-.94l2.39.96c.26.1.55 0 .69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>' +
      '</svg>';
  }

  function updateAudioUi() {
    var rootEl = document.getElementById('audio-controls');
    if (!rootEl) return;
    var bgmMuteBtn = rootEl.querySelector('[data-audio="bgm-mute"]');
    var seMuteBtn = rootEl.querySelector('[data-audio="se-mute"]');
    var bgmVol = rootEl.querySelector('[data-audio="bgm-vol"]');
    var seVol = rootEl.querySelector('[data-audio="se-vol"]');
    var toggle = document.querySelector('.audio-toggle');
    if (bgmMuteBtn) {
      bgmMuteBtn.innerHTML = iconSpeaker(settings.bgmMuted);
      bgmMuteBtn.setAttribute('aria-pressed', settings.bgmMuted ? 'true' : 'false');
      bgmMuteBtn.title = settings.bgmMuted ? 'BGMオン' : 'BGMミュート';
    }
    if (seMuteBtn) {
      seMuteBtn.innerHTML = iconSpeaker(settings.seMuted);
      seMuteBtn.setAttribute('aria-pressed', settings.seMuted ? 'true' : 'false');
      seMuteBtn.title = settings.seMuted ? 'SEオン' : 'SEミュート';
    }
    if (bgmVol) bgmVol.value = String(Math.round(settings.bgmVolume * 100));
    if (seVol) seVol.value = String(Math.round(settings.seVolume * 100));
    if (toggle) {
      var anyMuted = settings.bgmMuted || settings.seMuted;
      toggle.innerHTML = anyMuted ? iconSpeaker(true) : iconGear();
      toggle.title = '音量設定';
    }
  }

  function mountUi() {
    if (document.getElementById('audio-controls')) {
      updateAudioUi();
      return;
    }
    var shell = document.createElement('div');
    shell.className = 'audio-shell';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'audio-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'audio-controls');
    toggle.setAttribute('aria-label', '音量設定を開く');
    toggle.innerHTML = iconGear();

    var wrap = document.createElement('div');
    wrap.id = 'audio-controls';
    wrap.className = 'audio-controls';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', '音量設定');
    wrap.innerHTML =
      '<div class="audio-row">' +
      '<span class="audio-label" title="BGM">' + iconNote() + '<span>BGM</span></span>' +
      '<button type="button" class="audio-mute" data-audio="bgm-mute" aria-label="BGMミュート"></button>' +
      '<input type="range" class="audio-slider" data-audio="bgm-vol" min="0" max="100" aria-label="BGM音量" />' +
      '</div>' +
      '<div class="audio-row">' +
      '<span class="audio-label" title="効果音">' + iconWave() + '<span>SE</span></span>' +
      '<button type="button" class="audio-mute" data-audio="se-mute" aria-label="SEミュート"></button>' +
      '<input type="range" class="audio-slider" data-audio="se-vol" min="0" max="100" aria-label="SE音量" />' +
      '</div>';

    shell.appendChild(toggle);
    shell.appendChild(wrap);

    var slot = document.getElementById('audio-controls-slot');
    if (slot) slot.appendChild(shell);
    else {
      var header = document.querySelector('header.top');
      if (header) header.appendChild(shell);
      else document.body.appendChild(shell);
    }

    function setPopoverOpen(open) {
      shell.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '音量設定を閉じる' : '音量設定を開く');
    }

    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var next = !shell.classList.contains('is-open');
      setPopoverOpen(next);
      if (next) resume();
    });

    document.addEventListener('pointerdown', function (e) {
      if (!shell.classList.contains('is-open')) return;
      if (shell.contains(e.target)) return;
      setPopoverOpen(false);
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setPopoverOpen(false);
    });

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-audio]');
      if (!btn || btn.tagName === 'INPUT') return;
      var kind = btn.getAttribute('data-audio');
      resume().then(function () {
        if (kind === 'bgm-mute') {
          settings.bgmMuted = !settings.bgmMuted;
          if (!settings.bgmMuted && !bgmPlaying) startBgm(bgmMode);
        } else if (kind === 'se-mute') {
          settings.seMuted = !settings.seMuted;
        }
        applyVolumes();
        saveSettings();
        updateAudioUi();
        if (kind === 'se-mute' && !settings.seMuted) play('click');
      });
    });

    wrap.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var kind = t.getAttribute('data-audio');
      if (kind === 'bgm-vol') {
        settings.bgmVolume = clamp(parseInt(t.value, 10) / 100, 0, 1);
        if (settings.bgmVolume > 0) settings.bgmMuted = false;
      } else if (kind === 'se-vol') {
        settings.seVolume = clamp(parseInt(t.value, 10) / 100, 0, 1);
        if (settings.seVolume > 0) settings.seMuted = false;
      } else {
        return;
      }
      applyVolumes();
      saveSettings();
      updateAudioUi();
    });

    updateAudioUi();
  }

  function unlockOnGesture() {
    var once = function () {
      resume().then(function (ok) {
        if (ok) {
          startBgm(bgmMode);
          document.removeEventListener('pointerdown', once, true);
          document.removeEventListener('keydown', once, true);
          document.removeEventListener('touchstart', once, true);
        }
      });
    };
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('keydown', once, true);
    document.addEventListener('touchstart', once, true);
  }

  function bindHoverClicks() {
    document.addEventListener('mouseover', function (e) {
      var btn = e.target.closest && e.target.closest('button.btn, button.audio-mute');
      if (!btn || btn.disabled) return;
      if (btn._hoverArmed) return;
      btn._hoverArmed = true;
      play('hover');
      setTimeout(function () { btn._hoverArmed = false; }, 120);
    }, true);

    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('button.btn');
      if (!btn || btn.disabled) return;
      // ゲーム固有SFXがある操作はそちらに任せる（二重発音を避ける）
      if (btn.id === 'btn-play' || btn.id === 'btn-discard') return;
      if (btn.getAttribute('data-card')) return;
      play('click');
    }, true);
  }

  loadSettings();

  var api = {
    resume: resume,
    play: play,
    sfx: SFX,
    startBgm: startBgm,
    stopBgm: stopBgm,
    setBgmMode: setBgmMode,
    getSettings: function () {
      return {
        bgmMuted: settings.bgmMuted,
        seMuted: settings.seMuted,
        bgmVolume: settings.bgmVolume,
        seVolume: settings.seVolume
      };
    },
    setBgmMuted: function (v) {
      settings.bgmMuted = !!v;
      applyVolumes();
      saveSettings();
      updateAudioUi();
    },
    setSeMuted: function (v) {
      settings.seMuted = !!v;
      applyVolumes();
      saveSettings();
      updateAudioUi();
    },
    setBgmVolume: function (v) {
      settings.bgmVolume = clamp(v, 0, 1);
      applyVolumes();
      saveSettings();
      updateAudioUi();
    },
    setSeVolume: function (v) {
      settings.seVolume = clamp(v, 0, 1);
      applyVolumes();
      saveSettings();
      updateAudioUi();
    },
    isStarted: function () { return started; }
  };

  root.HoshiameAudio = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      mountUi();
      unlockOnGesture();
      bindHoverClicks();
    });
  } else {
    mountUi();
    unlockOnGesture();
    bindHoverClicks();
  }
})(typeof window !== 'undefined' ? window : this);
