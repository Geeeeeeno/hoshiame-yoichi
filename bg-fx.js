/**
 * ほしあめ夜市 — 背景アンビエント演出（星・ボケ・流れ星・ほしあめ雨・提灯グロー）
 * #bg-canvas に描画。#fx-canvas（ゲーム演出）とは独立。
 * Node(test.js) / window なしでは何もしない。
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  var COLORS = ['#ff4fd8', '#ffc43d', '#3ff3ff', '#9b5cff'];
  var HARD_CAP = 220;
  var DPR_CAP = 2;

  var canvas = null;
  var ctx = null;
  var dpr = 1;
  var cssW = 0;
  var cssH = 0;
  var running = false;
  var rafId = 0;
  var lastTs = 0;
  var reduced = false;
  var hidden = false;

  var pointerX = 0.5;
  var pointerY = 0.5;
  var parallaxX = 0;
  var parallaxY = 0;
  var scrollParallax = 0;

  // 事前確保プール（フレーム内 new を避ける）
  var stars = [];
  var bokeh = [];
  var motes = [];
  var rain = [];
  var shoots = [];
  var lanterns = [];
  var washes = [];

  var starN = 0;
  var bokehN = 0;
  var moteN = 0;
  var rainN = 0;
  var shootN = 0;
  var lanternN = 0;
  var washN = 0;

  var shootCooldown = 0;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pickColor() {
    return COLORS[(Math.random() * COLORS.length) | 0];
  }

  function ensureLen(arr, n, factory) {
    while (arr.length < n) arr.push(factory());
    return n;
  }

  function makeStar() {
    return {
      x: 0, y: 0, r: 1, phase: 0, speed: 1,
      bright: 0.6, color: '#fff', glint: false, layer: 0
    };
  }

  function makeBokeh() {
    return {
      x: 0, y: 0, r: 8, vx: 0, vy: 0, a: 0.2,
      color: '#ff4fd8', layer: 1, phase: 0
    };
  }

  function makeMote() {
    return {
      x: 0, y: 0, r: 1.2, vx: 0, vy: 0, a: 0.5,
      color: '#fff', layer: 2, tw: 0
    };
  }

  function makeRain() {
    return {
      x: 0, y: 0, len: 12, speed: 80, a: 0.4,
      spark: 0, color: '#3ff3ff'
    };
  }

  function makeShoot() {
    return {
      alive: false, x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1, len: 40, color: '#fff'
    };
  }

  function makeLantern() {
    return {
      x: 0, y: 0, baseR: 18, phase: 0, speed: 1,
      color: '#ffc43d', flicker: 0
    };
  }

  function makeWash() {
    return {
      x: 0, y: 0, r: 120, phase: 0, speed: 0.3,
      color: '#9b5cff', a: 0.08
    };
  }

  function budgetForArea(area) {
    // 基準 ~1280x720 → ~180、面積比でスケール、ハードキャップ
    var n = Math.round(180 * (area / (1280 * 720)));
    n = clamp(n, 40, HARD_CAP);
    if (cssW < 700 || cssH < 500) n = Math.min(n, 110);
    if (reduced) n = Math.min(n, 36);
    return n;
  }

  function layoutCounts(total) {
    if (reduced) {
      starN = total;
      bokehN = 0;
      moteN = 0;
      rainN = 0;
      shootN = 0;
      lanternN = Math.min(4, Math.max(2, (total / 10) | 0));
      washN = 2;
      return;
    }
    starN = Math.round(total * 0.38);
    bokehN = Math.round(total * 0.16);
    moteN = Math.round(total * 0.18);
    rainN = Math.round(total * 0.2);
    shootN = 3;
    lanternN = 6;
    washN = 3;
    var used = starN + bokehN + moteN + rainN + shootN + lanternN + washN;
    if (used > total) {
      var cut = used - total;
      rainN = Math.max(0, rainN - cut);
    }
  }

  function seedStar(s, w, h) {
    s.x = Math.random() * w;
    s.y = Math.random() * h * 0.72;
    s.r = rand(0.6, 2.4);
    s.phase = Math.random() * Math.PI * 2;
    s.speed = rand(0.6, 2.2);
    s.bright = rand(0.35, 0.95);
    s.color = Math.random() < 0.55 ? '#ffffff' : pickColor();
    s.glint = Math.random() < 0.22;
    s.layer = Math.random() < 0.55 ? 0 : 1;
  }

  function seedBokeh(b, w, h) {
    b.x = Math.random() * w;
    b.y = Math.random() * h;
    b.r = rand(10, 36);
    b.vx = rand(-6, 6);
    b.vy = rand(-4, 4);
    b.a = rand(0.06, 0.18);
    b.color = pickColor();
    b.layer = 1;
    b.phase = Math.random() * Math.PI * 2;
  }

  function seedMote(m, w, h) {
    m.x = Math.random() * w;
    m.y = Math.random() * h;
    m.r = rand(0.8, 2.2);
    m.vx = rand(-12, 12);
    m.vy = rand(-18, -4);
    m.a = rand(0.25, 0.7);
    m.color = pickColor();
    m.layer = 2;
    m.tw = Math.random() * Math.PI * 2;
  }

  function seedRain(r, w, h) {
    r.x = Math.random() * (w + 80) - 40;
    r.y = Math.random() * h;
    r.len = rand(10, 22);
    r.speed = rand(70, 140);
    r.a = rand(0.15, 0.45);
    r.spark = Math.random() * Math.PI * 2;
    r.color = Math.random() < 0.5 ? '#c9b6ff' : pickColor();
  }

  function seedLantern(L, w, h, i) {
    var frac = (i + 0.5) / Math.max(lanternN, 1);
    L.x = w * (0.12 + frac * 0.76);
    L.y = h * (0.72 + (i % 3) * 0.03);
    L.baseR = rand(16, 28);
    L.phase = Math.random() * Math.PI * 2;
    L.speed = rand(2.5, 5.5);
    L.color = COLORS[i % COLORS.length];
    L.flicker = Math.random();
  }

  function seedWash(wsh, w, h, i) {
    wsh.x = w * (0.2 + (i % 3) * 0.3);
    wsh.y = h * (0.25 + (i % 2) * 0.35);
    wsh.r = Math.min(w, h) * rand(0.28, 0.45);
    wsh.phase = Math.random() * Math.PI * 2;
    wsh.speed = rand(0.25, 0.55);
    wsh.color = COLORS[i % COLORS.length];
    wsh.a = rand(0.05, 0.11);
  }

  function rebuild() {
    var area = cssW * cssH;
    if (area <= 0) return;
    var total = budgetForArea(area);
    layoutCounts(total);

    ensureLen(stars, starN, makeStar);
    ensureLen(bokeh, bokehN, makeBokeh);
    ensureLen(motes, moteN, makeMote);
    ensureLen(rain, rainN, makeRain);
    ensureLen(shoots, shootN, makeShoot);
    ensureLen(lanterns, lanternN, makeLantern);
    ensureLen(washes, washN, makeWash);

    var i;
    for (i = 0; i < starN; i++) seedStar(stars[i], cssW, cssH);
    for (i = 0; i < bokehN; i++) seedBokeh(bokeh[i], cssW, cssH);
    for (i = 0; i < moteN; i++) seedMote(motes[i], cssW, cssH);
    for (i = 0; i < rainN; i++) seedRain(rain[i], cssW, cssH);
    for (i = 0; i < shootN; i++) {
      shoots[i].alive = false;
      shoots[i].life = 0;
    }
    for (i = 0; i < lanternN; i++) seedLantern(lanterns[i], cssW, cssH, i);
    for (i = 0; i < washN; i++) seedWash(washes[i], cssW, cssH, i);
    shootCooldown = rand(2.5, 5);
  }

  function resize() {
    if (!canvas) return;
    var sky = canvas.parentElement || document.body;
    var rect = sky.getBoundingClientRect();
    cssW = Math.max(1, Math.floor(rect.width || window.innerWidth || 1));
    cssH = Math.max(1, Math.floor(rect.height || window.innerHeight || 1));
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuild();
  }

  function spawnShoot() {
    var i;
    var s = null;
    for (i = 0; i < shootN; i++) {
      if (!shoots[i].alive) {
        s = shoots[i];
        break;
      }
    }
    if (!s) return;
    s.alive = true;
    s.x = rand(-40, cssW * 0.7);
    s.y = rand(0, cssH * 0.35);
    var sp = rand(380, 620);
    var ang = rand(0.35, 0.65);
    s.vx = Math.cos(ang) * sp;
    s.vy = Math.sin(ang) * sp;
    s.maxLife = rand(0.45, 0.85);
    s.life = s.maxLife;
    s.len = rand(48, 90);
    s.color = Math.random() < 0.5 ? '#ffffff' : pickColor();
  }

  function update(dt) {
    var i;
    var px = reduced ? 0 : parallaxX;
    var py = reduced ? 0 : parallaxY + scrollParallax;

    // ポインタ視差を滑らかに追従
    if (!reduced) {
      var tx = (pointerX - 0.5) * 18;
      var ty = (pointerY - 0.5) * 12;
      parallaxX += (tx - parallaxX) * Math.min(1, dt * 3);
      parallaxY += (ty - parallaxY) * Math.min(1, dt * 3);
    }

    for (i = 0; i < washN; i++) {
      washes[i].phase += washes[i].speed * dt;
    }

    for (i = 0; i < starN; i++) {
      stars[i].phase += stars[i].speed * dt;
    }

    if (reduced) {
      for (i = 0; i < lanternN; i++) {
        lanterns[i].phase += lanterns[i].speed * 0.35 * dt;
        lanterns[i].flicker = 0.55 + 0.15 * Math.sin(lanterns[i].phase);
      }
      return;
    }

    for (i = 0; i < bokehN; i++) {
      var b = bokeh[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += dt * 0.7;
      if (b.x < -b.r) b.x = cssW + b.r;
      if (b.x > cssW + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = cssH + b.r;
      if (b.y > cssH + b.r) b.y = -b.r;
    }

    for (i = 0; i < moteN; i++) {
      var m = motes[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.tw += dt * 3;
      if (m.y < -10) {
        m.y = cssH + 10;
        m.x = Math.random() * cssW;
      }
      if (m.x < -10) m.x = cssW + 10;
      if (m.x > cssW + 10) m.x = -10;
    }

    for (i = 0; i < rainN; i++) {
      var r = rain[i];
      r.y += r.speed * dt;
      r.x += r.speed * 0.35 * dt;
      r.spark += dt * 8;
      if (r.y > cssH + 20) {
        r.y = -r.len;
        r.x = Math.random() * (cssW + 80) - 40;
      }
    }

    for (i = 0; i < lanternN; i++) {
      var L = lanterns[i];
      L.phase += L.speed * dt;
      // 暖かいちらつき（ノイズ風に複数サイン）
      L.flicker =
        0.55 +
        0.25 * Math.sin(L.phase) +
        0.12 * Math.sin(L.phase * 2.7 + 1.2) +
        0.08 * Math.sin(L.phase * 5.1 + 0.4);
      L.flicker = clamp(L.flicker, 0.25, 1);
    }

    shootCooldown -= dt;
    if (shootCooldown <= 0) {
      spawnShoot();
      shootCooldown = rand(3.5, 8.5);
    }
    for (i = 0; i < shootN; i++) {
      var s = shoots[i];
      if (!s.alive) continue;
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0 || s.x > cssW + 80 || s.y > cssH + 80) {
        s.alive = false;
      }
    }

    // silence unused in reduced path
    void px;
    void py;
  }

  function layerOffset(layer) {
    if (reduced) return { x: 0, y: 0 };
    var mul = layer === 0 ? 0.35 : layer === 1 ? 0.7 : 1.15;
    return {
      x: parallaxX * mul,
      y: (parallaxY + scrollParallax) * mul
    };
  }

  function drawWashes() {
    var i;
    // 少数のみなので soft radial を許可（毎フレ大量 new は星側で回避済み）
    for (i = 0; i < washN; i++) {
      var w = washes[i];
      var pulse = 0.55 + 0.45 * Math.sin(w.phase);
      var a = w.a * pulse;
      var grd = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r);
      grd.addColorStop(0, 'rgba(255,255,255,' + (a * 0.35).toFixed(3) + ')');
      grd.addColorStop(0.25, washRgba(w.color, a));
      grd.addColorStop(1, washRgba(w.color, 0));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function washRgba(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + clamp(a, 0, 1).toFixed(3) + ')';
  }

  function drawStars() {
    var i;
    var off0 = layerOffset(0);
    var off1 = layerOffset(1);
    for (i = 0; i < starN; i++) {
      var s = stars[i];
      var off = s.layer === 0 ? off0 : off1;
      var tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(s.phase));
      if (reduced) tw = 0.5 + 0.35 * (0.5 + 0.5 * Math.sin(s.phase * 0.6));
      var a = s.bright * tw;
      var x = s.x + off.x;
      var y = s.y + off.y;
      var R = s.r;

      // soft glow halo（globalAlpha のみ・毎フレームの gradient 生成を避ける）
      ctx.fillStyle = s.color;
      ctx.globalAlpha = a * 0.22;
      ctx.beginPath();
      ctx.arc(x, y, R * 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fill();

      if (s.glint && !reduced && tw > 0.75) {
        var g = R * 3.2 * tw;
        ctx.globalAlpha = a * 0.65;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x - g, y);
        ctx.lineTo(x + g, y);
        ctx.moveTo(x, y - g);
        ctx.lineTo(x, y + g);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawBokeh() {
    var i;
    var off = layerOffset(1);
    for (i = 0; i < bokehN; i++) {
      var b = bokeh[i];
      var pulse = 0.75 + 0.25 * Math.sin(b.phase);
      var x = b.x + off.x;
      var y = b.y + off.y;
      ctx.fillStyle = b.color;
      ctx.globalAlpha = b.a * 0.35 * pulse;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = b.a * pulse;
      ctx.beginPath();
      ctx.arc(x, y, b.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMotes() {
    var i;
    var off = layerOffset(2);
    for (i = 0; i < moteN; i++) {
      var m = motes[i];
      var tw = 0.5 + 0.5 * Math.sin(m.tw);
      ctx.fillStyle = m.color;
      ctx.globalAlpha = m.a * tw;
      ctx.beginPath();
      ctx.arc(m.x + off.x, m.y + off.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRain() {
    var i;
    var off = layerOffset(2);
    ctx.lineCap = 'round';
    for (i = 0; i < rainN; i++) {
      var r = rain[i];
      var sparkle = 0.55 + 0.45 * Math.sin(r.spark);
      var x = r.x + off.x;
      var y = r.y + off.y;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.a * sparkle;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + r.len * 0.35, y + r.len);
      ctx.stroke();
      if (sparkle > 0.85) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.55 * sparkle;
        ctx.beginPath();
        ctx.arc(x + r.len * 0.2, y + r.len * 0.55, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawShoots() {
    var i;
    for (i = 0; i < shootN; i++) {
      var s = shoots[i];
      if (!s.alive) continue;
      var t = s.life / s.maxLife;
      var nx = s.vx;
      var ny = s.vy;
      var mag = Math.sqrt(nx * nx + ny * ny) || 1;
      var ux = (nx / mag) * s.len;
      var uy = (ny / mag) * s.len;
      ctx.lineCap = 'round';
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = 0.25 * t;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - ux, s.y - uy);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * t;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - ux * 0.55, s.y - uy * 0.55);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.9 * t;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawLanterns() {
    var i;
    var off = layerOffset(1);
    for (i = 0; i < lanternN; i++) {
      var L = lanterns[i];
      var x = L.x + off.x * 0.4;
      var y = L.y + off.y * 0.4;
      var f = L.flicker;
      var R = L.baseR * (0.85 + 0.25 * f);
      ctx.fillStyle = '#ffe9a0';
      ctx.globalAlpha = 0.28 * f;
      ctx.beginPath();
      ctx.arc(x, y, R * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = L.color;
      ctx.globalAlpha = 0.2 * f;
      ctx.beginPath();
      ctx.arc(x, y, R * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35 * f;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, cssW, cssH);
    drawWashes();
    drawStars();
    if (!reduced) {
      drawBokeh();
      drawMotes();
      drawRain();
      drawShoots();
    }
    drawLanterns();
  }

  function frame(ts) {
    if (!running) return;
    if (lastTs === 0) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (!hidden) {
      update(dt);
      draw();
    }
    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTs = 0;
    rafId = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function onVisibility() {
    hidden = !!document.hidden;
    // 非表示中はループ自体を止め、復帰時に再開
    if (hidden) {
      stop();
    } else if (canvas) {
      start();
    }
  }

  function onPointer(e) {
    if (reduced || cssW <= 0) return;
    var x = e.clientX;
    var y = e.clientY;
    if (typeof x !== 'number') return;
    pointerX = clamp(x / cssW, 0, 1);
    pointerY = clamp(y / cssH, 0, 1);
  }

  function onScroll() {
    if (reduced) return;
    var sy = window.scrollY || document.documentElement.scrollTop || 0;
    scrollParallax = clamp(sy * 0.04, -20, 40);
  }

  function applyReduced(mq) {
    reduced = !!(mq && mq.matches);
    rebuild();
  }

  function init() {
    var sky = document.querySelector('.sky');
    if (!sky) return;

    canvas = document.getElementById('bg-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'bg-canvas';
      canvas.className = 'bg-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      var art = sky.querySelector('.sky-art');
      if (art && art.nextSibling) {
        sky.insertBefore(canvas, art.nextSibling);
      } else if (art) {
        sky.appendChild(canvas);
      } else {
        sky.insertBefore(canvas, sky.firstChild);
      }
    }

    ctx = canvas.getContext('2d');
    if (!ctx) return;

    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mq) {
      applyReduced(mq);
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', function () { applyReduced(mq); });
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(function () { applyReduced(mq); });
      }
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    hidden = !!document.hidden;
    start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
