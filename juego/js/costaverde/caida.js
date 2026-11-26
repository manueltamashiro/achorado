/* ACHORADO — js/costaverde/caida.js → ACH.cv.caida (C4): jefe 2 «El Tablazo», duelo en parapente en caída libre.
     ACH.cv.caida.start({onWin, onLose})   stop()   isOn()
     debug: { win(), hp(n), god(b), state(), bot(b), alt(m), bossHp(n), fps() }
   Modo de juego propio (como js/cine/cima.js): un lienzo 480×270 encima de #stage con el mismo escalado pixelado, su bucle rAF y su
   propio teclado/ratón/toque. Al terminar se quita todo (lienzo, oyentes, rAF, viento) y recién se llama al callback.
   Arte: ACH.sprites.cv.caida (arte-caida.js); si falta, bloques de color con su nombre. Sonido/música, siempre protegidos.
   Vida: la del juego (ACH.game.G.player.hp, sobre ACH.ent.CFG.hpMax) en 10 corazones; al salir se escribe de vuelta.
   Mundo: ACH.cv.freeze(true/false) mientras corre, si existe. Barras fosforescentes: ACH.cv.juguetes.fosfoCount(). Ver COSTAVERDE.md §6. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  ACH.cv = ACH.cv || {};

  var W = 480, H = 270, HOR = 150;
  var CFG = {
    hearts: 10, minHeartsIn: 4, inv: 1.1,
    pSpeedY: 135, pSpeedX: 95, pX: 112, pXr: 30, pYmin: 54, pYmax: 236,
    cd: 0.22, hold: 0.65, arrowV: 360, arrowDmg: 0.25,
    fanDeg: 4, fanAimMax: 12, fanLead: 0.8, fanCd: 0.3,       // v0.13 (E4): abanico a 4° con el centro apuntado (con adelanto) al Tablazo: las 3 flechas pegan
    hintSec: 9,                                               // aviso de controles
    barMax: 5,                                                // barras que cuentan (+10 % cada una, tope +50 %)
    bossHp: 30, bossX: 392, boardHp: 2,
    altStart: 300, altLock: 30, altRate: 2.6,                 // m/s → 300→30 m en ~104 s
    p1: { every: 1.45, tele: 0.4, v: 185, dbl: 0.35 },
    p2: { every: 1.85, tele: 0.45, v: 170, boom: 0.3 },
    p3: { every: 2.6, tele: 0.5, v: 145, single: 1.25, pel: [3.4, 5.2] },
    rage: 0.9, rageV: 1.1, autoPause: true                    // v0.13 (E4): furioso con tope ×1,1 (antes: intervalo ×0,65 y tablas ×1,2 → espiral)
  };
  var COLN = ['verde', 'rosado', 'amarillo', 'celeste'];

  var S = null, god = false, bot = false, fpsLog = [];

  /* ---------- utilidades protegidas ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function now() { return (window.performance || Date).now(); }
  function warn(m, e) { try { console.warn('[caida] ' + m, e || ''); } catch (x) { /* nada */ } }
  function sfx(n, d) {
    try {
      if (ACH.cv && typeof ACH.cv.sfx === 'function') { ACH.cv.sfx(n, d); return; }
      var a = ACH.audio; if (a && typeof a.emit === 'function') a.emit(n, d);
    } catch (e) { /* el sonido nunca rompe */ }
  }
  function art() { try { var s = ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.caida; return s && s.bake ? s.bake() : null; } catch (e) { warn('arte-caida falló; uso bloques', e); return null; } }
  function gameP() { try { var G = ACH.G || (ACH.game && ACH.game.G); return G && G.player ? G.player : null; } catch (e) { return null; } }
  function hpMaxGame() { try { return (ACH.ent && ACH.ent.CFG && ACH.ent.CFG.hpMax) || 100; } catch (e) { return 100; } }
  function freeze(b) { try { if (ACH.cv && typeof ACH.cv.freeze === 'function') ACH.cv.freeze(b); } catch (e) { warn('freeze', e); } }
  function fosfo() { try { var j = ACH.cv && ACH.cv.juguetes; return (j && typeof j.fosfoCount === 'function') ? (j.fosfoCount() | 0) : 0; } catch (e) { return 0; } }
  function dlgActive() { try { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); } catch (e) { return false; } }
  function touchOn() { try { return !!(ACH.touch && ACH.touch.on); } catch (e) { return false; } }

  /* ---------- montaje ---------- */
  function mount() {
    var stage = document.getElementById('stage') || document.body;
    var root = document.createElement('div');
    root.className = 'cvc-root';
    root.setAttribute('data-ui', '');
    root.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;z-index:5;background:#000;overflow:hidden;touch-action:none;cursor:crosshair;';
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    if (ACH.lienzo && ACH.lienzo.gpu) ACH.lienzo.gpu(cv);   // lienzo por cuadro: en GPU, como #world
    cv.style.cssText = 'position:absolute;image-rendering:pixelated;image-rendering:crisp-edges;display:block;';
    root.appendChild(cv);
    stage.appendChild(root);
    var ctx = cv.getContext('2d', { alpha: false }); ctx.imageSmoothingEnabled = false;
    return { stage: stage, root: root, cv: cv, ctx: ctx };
  }
  function layout() {
    if (!S) return;
    var r = S.dom.root, sw = r.clientWidth || W * 2, sh = r.clientHeight || H * 2;
    var s = Math.min(sw / W, sh / H);
    if (s >= 1 && Math.floor(s) / s > 0.86) s = Math.floor(s);
    var cw = Math.round(W * s), ch = Math.round(H * s), st = S.dom.cv.style;
    st.width = cw + 'px'; st.height = ch + 'px'; st.left = Math.round((sw - cw) / 2) + 'px'; st.top = Math.round((sh - ch) / 2) + 'px';
  }
  function listen(t, ty, fn, o) { t.addEventListener(ty, fn, o); S.ls.push([t, ty, fn, o]); }

  /* ---------- entrada ---------- */
  var USE = { KeyW: 1, KeyS: 1, KeyA: 1, KeyD: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, Escape: 1, Enter: 1, KeyP: 1, Tab: 1 };
  function onKey(e) {
    if (!S) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var c = e.code || e.key;
    if (/^F\d+$/.test(c)) return;
    if (dlgActive()) { if (USE[c]) { e.preventDefault(); e.stopImmediatePropagation(); } return; }   // el diálogo con retrato maneja ENTER/ESPACIO antes que yo
    e.preventDefault(); e.stopImmediatePropagation();   // el juego de abajo no ve nada
    var dn = e.type === 'keydown';
    if (dn && !e.repeat) {
      if (c === 'Escape' || c === 'KeyP') { togglePause(); return; }
      if (S.paused && (c === 'Enter')) { togglePause(); return; }
      if (c === 'Space') fireDown('key');
    }
    if (!dn && c === 'Space') fireUp('key');
    S.keys[c] = dn;
  }
  function lp(e) { var r = S.dom.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / Math.max(1, r.width) * W, y: (e.clientY - r.top) / Math.max(1, r.height) * H }; }
  function onPDown(e) {
    if (!S || dlgActive()) return;
    e.preventDefault();
    try { ensureAudio(); } catch (x) { /* nada */ }
    if (S.paused) { togglePause(); return; }
    var p = lp(e), touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (touch) S.touchSeen = true;
    if (touch && p.x < W / 2) { S.stick = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y }; }
    else if (e.pointerType !== 'mouse' || e.button === 0) { S.firePtr = e.pointerId; fireDown('ptr'); }
    try { S.dom.root.setPointerCapture(e.pointerId); } catch (x) { /* nada */ }
  }
  function onPMove(e) { if (!S || !S.stick || e.pointerId !== S.stick.id) return; var p = lp(e); S.stick.x = p.x; S.stick.y = p.y; }
  function onPUp(e) {
    if (!S) return;
    if (S.stick && e.pointerId === S.stick.id) S.stick = null;
    if (S.firePtr === e.pointerId) { S.firePtr = null; fireUp('ptr'); }
  }
  function ensureAudio() { var a = ACH.audio; if (a && a.ctx && a.ctx.state === 'suspended') a.ctx.resume(); if (a && typeof a.unlock === 'function') a.unlock(); }
  function onVis() { if (S && CFG.autoPause && document.hidden && !S.paused && S.phase !== 'end' && !dlgActive()) togglePause(); }
  function togglePause() { if (!S) return; S.paused = !S.paused; S.keys = {}; S.fire = null; S.stick = null; }

  /* ---------- disparo ---------- */
  function canShoot() { return S && S.phase === 'fight' && !S.paused; }
  function fireDown(src) {
    if (!S) return;
    if (!S.fire) S.fire = { src: src, t: 0 };
    if (canShoot() && S.cd <= 0) shoot(false);
  }
  function fireUp(src) {
    if (!S || !S.fire || S.fire.src !== src) return;
    if (canShoot() && S.fire.t >= CFG.hold) shoot(true);
    S.fire = null;
  }
  // v0.13 (E4): el centro del abanico se apunta hacia donde estará el Tablazo cuando llegue la flecha (con tope de ±fanAimMax°)
  function fanAim() {
    var p = S.p, b = S.b, x0 = p.x + 14, y0 = p.y - 3, dx = Math.max(60, b.x - x0), t = dx / CFG.arrowV;
    var by = (b.y - 2) + b.vy * Math.min(t, 0.6) * CFG.fanLead;
    var a = Math.atan2(by - y0, dx), mx = CFG.fanAimMax * Math.PI / 180;
    return clamp(a, -mx, mx);
  }
  function shoot(fan) {
    var p = S.p, ang = fan ? [-CFG.fanDeg, 0, CFG.fanDeg] : [0], c0 = fan ? fanAim() : 0;
    for (var i = 0; i < ang.length; i++) {
      var a = c0 + ang[i] * Math.PI / 180, ci = S.colI++ % 4; S.shots = (S.shots | 0) + 1;
      S.arrows.push({ x: p.x + 14, y: p.y - 3, vx: Math.cos(a) * CFG.arrowV, vy: Math.sin(a) * CFG.arrowV, c: ci, t: 0 });
    }
    S.cd = fan ? CFG.fanCd : CFG.cd; S.shootT = 0.12;
    sfx('cv.flecha', { fan: !!fan });
  }

  /* ---------- inicio ---------- */
  function start(opts) {
    if (S) stop(true);
    opts = opts || {};
    var A = art();
    var dom = mount();
    var gp = gameP(), hm = hpMaxGame();
    var hearts = gp ? clamp(Math.ceil(gp.hp / hm * CFG.hearts), CFG.minHeartsIn, CFG.hearts) : CFG.hearts;
    var n = fosfo();
    S = {
      opts: opts, A: A, dom: dom, ls: [], raf: 0, last: now(), t: 0, phase: 'intro', phT: 0, paused: false,
      keys: {}, fire: null, stick: null, firePtr: null, touchSeen: false,
      alt: CFG.altStart, rage: false, scroll: 0, cloud: 0, fall: 1,
      p: { x: -40, y: 30, vx: 0, vy: 0, hp: hearts, inv: 0, hurtT: 0, stun: 0, kx: 0, ky: 0 },
      b: { x: W + 70, y: 120, hp: CFG.bossHp, cd: 1.2, tele: 0, teleKind: null, pose: 'idle', hurtT: 0, throwT: 0, vy: 0, rot: 0, alt: 0, nextPel: 4, seq: 0 },
      arrows: [], boards: [], pels: [], parts: [], toasts: [], gulls: [], fogs: [], splashT: -1, splashX: 0, cardT: -1,
      cd: 0, shootT: 0, colI: 0, mult: 1 + 0.1 * Math.min(CFG.barMax, n), fosfo: n, says: [], lastPh: 1, dlgDone: false, dlgAsked: false,
      fade: 1, endT: 0, result: null, hintT: 0, music: false, wind: null, tcPrev: null, frames: 0, ftSum: 0, ftMax: 0, hits: 0, taken: 0
    };
    for (var i = 0; i < 6; i++) S.gulls.push(newGull(true));
    for (i = 0; i < 3; i++) S.fogs.push({ x: rnd(-60, W), y: rnd(0, H), v: rnd(140, 190), f: i % 2 });
    layout();
    listen(window, 'keydown', onKey, true); listen(window, 'keyup', onKey, true);
    listen(dom.root, 'pointerdown', onPDown); listen(window, 'pointermove', onPMove); listen(window, 'pointerup', onPUp); listen(window, 'pointercancel', onPUp);
    listen(dom.root, 'contextmenu', function (e) { e.preventDefault(); });
    listen(window, 'resize', layout); listen(document, 'visibilitychange', onVis);
    var tc = document.getElementById('tc'); if (tc) { S.tcPrev = tc.style.display; tc.style.display = 'none'; }
    freeze(true);
    try { if (ACH.audio && ACH.audio.cv && typeof ACH.audio.cv.play === 'function') { ACH.audio.cv.play('cv.caida'); S.music = true; } } catch (e) { warn('música cv.caida', e); }
    try {
      var au = ACH.audio;
      if (au && typeof au.loop === 'function') S.wind = au.loop('cv.viento', { intensity: 0.7 });
      else sfx('cv.viento', { dur: 300 });
    } catch (e) { S.wind = null; }
    S.raf = requestAnimationFrame(frame);
    return true;
  }

  /* ---------- fin y limpieza ---------- */
  function finish(result) {   // escribe la vida de vuelta, limpia y llama al callback
    if (!S) return;
    var o = S.opts, gp = gameP(), hm = hpMaxGame(), hearts = S.p.hp;
    try {
      if (gp) {
        if (result === 'win') gp.hp = Math.max(1, Math.round(hearts / CFG.hearts * hm));
        else gp.hp = hm;   // §2.6: si muere en la caída reaparece en el borde con la vida llena
      }
    } catch (e) { warn('vida', e); }
    stop(true);
    if (result === 'win') {   // v0.13 T2: +200 XP al vencer al Tablazo; el ampli (ACH.concierto) lo entrega nivel.js al cerrar el nivel
      var CVx = ACH.cv || {}; CVx.tablazoVencido = true;
      try { if (ACH.hab && typeof ACH.hab.addXP === 'function') ACH.hab.addXP(200, false); } catch (e) { warn('xp', e); }
      try { if (ACH.partida && typeof ACH.partida.flag === 'function') ACH.partida.flag('costaverde.tablazo', true); } catch (e) { /* nada */ }
    }
    var cb = result === 'win' ? o.onWin : o.onLose;
    if (typeof cb === 'function') { try { cb({ hearts: hearts, result: result }); } catch (e) { warn('callback ' + result, e); } }
  }
  function stop(silent) {
    if (!S) return false;
    var s = S; S = null;
    try { cancelAnimationFrame(s.raf); } catch (e) { /* nada */ }
    s.ls.forEach(function (x) { try { x[0].removeEventListener(x[1], x[2], x[3]); } catch (e) { /* nada */ } });
    try { if (s.dom.root.parentNode) s.dom.root.parentNode.removeChild(s.dom.root); } catch (e) { /* nada */ }
    var tc = document.getElementById('tc'); if (tc && s.tcPrev !== null) tc.style.display = s.tcPrev;
    try { if (s.wind && typeof s.wind.stop === 'function') s.wind.stop(); else if (ACH.audio && ACH.audio.stop) ACH.audio.stop('cv.viento'); } catch (e) { /* nada */ }
    try { if (s.music && ACH.audio && ACH.audio.cv && typeof ACH.audio.cv.stop === 'function') ACH.audio.cv.stop(); } catch (e) { /* nada */ }
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
    freeze(false);
    return true;
  }

  /* ---------- bucle ---------- */
  function frame(ts) {
    if (!S) return;
    S.raf = requestAnimationFrame(frame);
    var tn = now(), dt = (tn - S.last) / 1000; S.last = tn;
    if (dt > 0.05) dt = 0.05; if (dt < 0) dt = 0;
    var t0 = now();
    try { if (!S.paused) update(dt); } catch (e) { warn('update', e); }
    if (!S) return;
    try { render(); } catch (e) { warn('render', e); }
    var ft = now() - t0; S.frames++; S.ftSum += ft; if (ft > S.ftMax) S.ftMax = ft;
    fpsLog.push(dt); if (fpsLog.length > 240) fpsLog.shift();
    if (S.phase === 'end' && S.endT <= 0) finish(S.result);
  }

  function newGull(any) { return { x: rnd(0, W), y: any ? rnd(0, H) : H + rnd(10, 60), v: rnd(70, 130), vx: rnd(-30, 10), f: Math.random() * 2, s: Math.random() < .3 }; }
  function toast(key, dur, y) { S.toasts.push({ k: key, t: 0, d: dur || 1.6, y: y == null ? 74 : y }); }
  // v0.13 (E4): voz del Tablazo (frases de voces-cv.js). El globo HTML de voces.js seguiría a Alexander en el mundo (tapado por el modo), así que se
  // lo apaga y el texto se dibuja en el lienzo, a la izquierda del Tablazo. Sin voz (silencio / sin audio) igual sale el subtítulo.
  var VOZ_TXT = { cv_tablazoOla: ['¡Se viene la ola, causa!', '¡Ahí viene la ola!', '¡Súbete a la ola!'], cv_tablazoGrito: ['¡Tablazo!', '¡Tabla va!', '¡Cuidado con la tabla!'], cv_tablazoFurioso: ['¡Ahora sí te revuelco!', '¡Me hiciste mala ola!'] };
  function bossSay(id) {
    if (!S) return;
    var txt = null, pool = VOZ_TXT[id] || [''];
    try {
      var a = ACH.audio;
      if (a && typeof a.say === 'function') {
        var ok = a.say(id, { who: 'tablazo', always: true });
        var els = document.querySelectorAll('.vbub');
        for (var i = 0; i < els.length; i++) { if (ok && els[i].classList.contains('zombie')) txt = els[i].textContent; els[i].style.display = 'none'; }
      }
    } catch (e) { warn('voz del Tablazo', e); }
    if (!txt) txt = pool[(Math.random() * pool.length) | 0];
    if (txt) S.says = [{ s: txt, t: 0, d: 2.3 }];
  }

  function update(dt) {
    S.t += dt; S.phT += dt;
    var p = S.p, b = S.b;
    // altura y caída
    var falling = S.phase === 'fight' || S.phase === 'card' || S.phase === 'intro';
    if (S.phase === 'fight') {
      S.alt = Math.max(CFG.altLock, S.alt - CFG.altRate * dt);
      if (S.alt <= CFG.altLock && !S.rage) { S.rage = true; toast('furioso', 2.2, 60); sfx('cv.tabla.gira', { rage: true }); bossSay('cv_tablazoFurioso'); }
    } else if (S.phase === 'dying') { var a0 = S.alt; S.alt += (6 - S.alt) * Math.min(1, dt * 2.6); S.scroll += Math.min(30, (a0 - S.alt) * 0.9); }
    else if (S.phase === 'intro' || S.phase === 'card') S.alt = Math.max(CFG.altStart - 6, S.alt - 1.5 * dt);
    var targetFall = (S.phase === 'fight' && S.rage) ? 0.18 : (falling || S.phase === 'dying' ? 1 : 0.3);
    S.fall += (targetFall - S.fall) * Math.min(1, dt * 1.5);
    S.scroll += 58 * S.fall * dt; S.cloud += (5 + 6 * S.fall) * dt;
    // aves y neblina
    for (var i = 0; i < S.gulls.length; i++) { var g = S.gulls[i]; g.y -= g.v * (0.4 + S.fall) * dt; g.x += g.vx * dt; g.f += dt * 6; if (g.y < -10 || g.x < -20 || g.x > W + 20) S.gulls[i] = newGull(false); }
    for (i = 0; i < S.fogs.length; i++) { var f = S.fogs[i]; f.y -= f.v * (0.3 + S.fall) * dt; f.x -= 12 * dt; if (f.y < -30) { f.y = H + rnd(10, 120); f.x = rnd(-80, W - 40); } }
    if (S.cd > 0) S.cd -= dt; if (S.shootT > 0) S.shootT -= dt;
    if (S.fire) S.fire.t += dt;
    for (i = S.toasts.length - 1; i >= 0; i--) { S.toasts[i].t += dt; if (S.toasts[i].t > S.toasts[i].d) S.toasts.splice(i, 1); }
    for (i = S.says.length - 1; i >= 0; i--) { S.says[i].t += dt; if (S.says[i].t > S.says[i].d) S.says.splice(i, 1); }
    if (S.fade > 0 && S.phase !== 'end' && S.phase !== 'outro') S.fade = Math.max(0, S.fade - dt * 2);

    if (S.phase === 'intro') introUpdate(dt);
    else if (S.phase === 'card') cardUpdate(dt);
    else if (S.phase === 'fight') { playerUpdate(dt); bossUpdate(dt); S.hintT += dt; }
    else if (S.phase === 'dying') { playerUpdate(dt); dyingUpdate(dt); }
    else if (S.phase === 'lost') { p.vy += 120 * dt; p.y += p.vy * dt; p.x -= 20 * dt; if (S.phT > 1.6) { S.fade = Math.min(1, S.fade + dt * 2.2); } if (S.phT > 2.2) { S.phase = 'end'; S.result = 'lose'; S.endT = 0; } }
    else if (S.phase === 'outro') { S.fade = Math.min(1, S.fade + dt * 1.8); if (S.fade >= 1) { S.phase = 'end'; S.result = 'win'; S.endT = 0; } }
    projUpdate(dt);
    partsUpdate(dt);
  }

  /* ---------- intro: parte las barritas y carga la resortera ---------- */
  var INTRO_LINES = [{ quien: 'alexander', cara: 'picaro', texto: '¡Titina, agárrate! Parto mis barritas, las cargo en la resortera… ¡y que llueva luz, causa!' }];
  function introUpdate(dt) {
    var p = S.p, k = clamp(S.phT / 0.9, 0, 1), e = 1 - Math.pow(1 - k, 3);
    p.x = -40 + (CFG.pX + 40) * e; p.y = 30 + (140 - 30) * e;
    if (S.phT > 0.9 && S.phT < 1.0 && !S.snap1) { S.snap1 = true; snapFx(); }
    if (S.phT > 1.5 && !S.snap2) { S.snap2 = true; snapFx(); }
    if (S.phT > 0.5 && !S.dlgAsked) {
      S.dlgAsked = true;
      var d = ACH.dialogo;
      if (d && typeof d.play === 'function') {
        try { d.play(INTRO_LINES, { pausaJuego: false, onDone: function () { if (S) S.dlgDone = true; } }); } catch (x) { S.dlgDone = true; }
      } else S.dlgDone = true;
    }
    if (S.phT > 2.6 && S.dlgDone) { S.phase = 'card'; S.phT = 0; sfx('cv.tabla.gira', { intro: true }); }
  }
  function snapFx() {
    var p = S.p;
    for (var i = 0; i < 10; i++) S.parts.push({ x: p.x + 8, y: p.y - 4, vx: rnd(-50, 60), vy: rnd(-70, 20), g: 60, t: 0, d: rnd(.35, .7), c: i % 4, k: 'spark' });
    sfx('cv.flecha', { snap: true });
  }
  function cardUpdate(dt) {
    var b = S.b, k = clamp(S.phT / 1.3, 0, 1), e = 1 - Math.pow(1 - k, 3);
    b.x = W + 70 - (W + 70 - CFG.bossX) * e; b.y = 120 + Math.sin(S.t * 1.2) * 8;
    if (S.phT > 0.4 && !S.olaT) { S.olaT = true; toast('ola', 1.8, 196); bossSay('cv_tablazoOla'); }
    if (S.phT > 2.4) {
      S.phase = 'fight'; S.phT = 0; b.cd = 1.0;
      if (S.fosfo > 0) { toast('luces', 2.2, 60); S.bonusT = 2.2; }
    }
  }

  /* ---------- Alexander ---------- */
  function playerUpdate(dt) {
    var p = S.p, K = S.keys, ax = 0, ay = 0;
    if (S.phase === 'fight' || S.phase === 'dying') {
      if (K.KeyW || K.ArrowUp) ay -= 1; if (K.KeyS || K.ArrowDown) ay += 1;
      if (K.KeyA || K.ArrowLeft) ax -= 1; if (K.KeyD || K.ArrowRight) ax += 1;
      if (S.stick) { var dx = S.stick.x - S.stick.x0, dy = S.stick.y - S.stick.y0; ax += clamp(dx / 22, -1, 1); ay += clamp(dy / 22, -1, 1); }
      if (bot && S.phase === 'fight') { var bb = botAI(); ax = bb.ax; ay = bb.ay; }
    }
    ax = clamp(ax, -1, 1); ay = clamp(ay, -1, 1);
    if (p.stun > 0) { p.stun -= dt; ax *= .2; ay *= .2; }
    var tvx = ax * CFG.pSpeedX, tvy = ay * CFG.pSpeedY;
    p.vx += (tvx - p.vx) * Math.min(1, dt * 10); p.vy += (tvy - p.vy) * Math.min(1, dt * 9);
    p.x += (p.vx + p.kx) * dt; p.y += (p.vy + p.ky) * dt + Math.sin(S.t * 2.1) * 6 * dt;
    p.kx *= Math.pow(0.02, dt); p.ky *= Math.pow(0.02, dt);
    p.x = clamp(p.x, CFG.pX - CFG.pXr, CFG.pX + CFG.pXr); p.y = clamp(p.y, CFG.pYmin, CFG.pYmax);
    if (p.inv > 0) p.inv -= dt; if (p.hurtT > 0) p.hurtT -= dt;
  }
  function hurtPlayer(dmg, kx, ky) {
    var p = S.p;
    if (p.inv > 0 || S.phase !== 'fight') return false;
    if (!god) p.hp = Math.max(0, p.hp - dmg);
    S.taken += dmg;
    p.inv = CFG.inv; p.hurtT = 0.35; p.kx = kx || -60; p.ky = ky || 0;
    sfx('cv.tabla.golpe', { player: true });
    try { if (navigator.vibrate && S.touchSeen) navigator.vibrate(40); } catch (e) { /* nada */ }
    if (p.hp <= 0) { S.phase = 'lost'; S.phT = 0; p.vy = -40; toast('revolcon', 2.2, 90); S.boards.length = 0; }
    return true;
  }

  /* ---------- El Tablazo ---------- */
  function phaseOf() { var h = S.b.hp / CFG.bossHp; return h > 2 / 3 ? 1 : h > 1 / 3 ? 2 : 3; }
  function bossUpdate(dt) {
    var b = S.b, p = S.p, ph = phaseOf();
    if (ph !== S.lastPh) { S.lastPh = ph; bossSay(ph === 2 ? 'cv_tablazoGrito' : 'cv_tablazoOla'); }   // v0.13: grita en cada cambio de fase
    var ty = clamp(p.y * 0.45 + 140 * 0.55 + Math.sin(S.t * 0.8) * 58 + Math.sin(S.t * 2.3) * 12, 58, 228);
    var vmax = ph === 1 ? 70 : 92;
    b.vy = clamp((ty - b.y) * 1.6, -vmax, vmax);
    if (b.tele > 0) b.vy *= 0.35;
    b.y += b.vy * dt;
    b.x = CFG.bossX + Math.sin(S.t * 0.7) * 14;
    if (b.hurtT > 0) b.hurtT -= dt; if (b.throwT > 0) b.throwT -= dt;
    var rm = S.rage ? CFG.rage : 1;
    if (b.tele > 0) {
      b.tele -= dt;
      if (b.tele <= 0) doAttack(b.teleKind);
    } else {
      b.cd -= dt;
      if (b.cd <= 0) {
        var kind = 'straight', C = ph === 1 ? CFG.p1 : ph === 2 ? CFG.p2 : CFG.p3;
        b.seq++;
        if (ph === 2) kind = (Math.random() < C.boom) ? 'boom' : (b.seq % 2 ? 'burst' : 'straight');
        else if (ph === 3) kind = (b.seq % 3 === 0) ? 'straight' : 'wave';
        b.teleKind = kind; b.tele = C.tele;
        b.cd = (ph === 3 && kind === 'straight' ? C.single : C.every) * rm * rnd(0.9, 1.1);
      }
    }
    b.pose = b.tele > 0 ? 'pull' : (b.throwT > 0 ? 'throw' : 'idle');
    // pelícanos en la fase 3
    if (ph === 3) {
      b.nextPel -= dt;
      if (b.nextPel <= 0) {
        b.nextPel = rnd(CFG.p3.pel[0], CFG.p3.pel[1]) * rm;
        var fromR = Math.random() < .6, yy = clamp(p.y + rnd(-50, 50), 60, 230);
        S.pels.push({ x: fromR ? W + 30 : -30, y: yy, vx: fromR ? -rnd(150, 190) : rnd(150, 190), f: 0, hit: false, dir: fromR ? -1 : 1 });
        sfx('cv.viento', { gust: true, dur: 0.4 });
      }
    }
  }
  function boardAt(x, y, vx, vy, kind, ci) {
    S.boards.push({ x: x, y: y, vx: vx, vy: vy || 0, kind: kind, ci: ci == null ? (Math.random() * 4) | 0 : ci, hp: CFG.boardHp, rot: Math.random() * 8, spin: rnd(9, 13) * (Math.random() < .5 ? -1 : 1), t: 0, back: false, flash: 0 });
  }
  function doAttack(kind) {
    var b = S.b, p = S.p, vm = S.rage ? CFG.rageV : 1, x0 = b.x - 22, y0 = b.y - 4;
    b.throwT = 0.25;
    if (kind === 'straight') {   // recta, apuntada a donde está Alexander (en diagonal si no están a la misma altura)
      var sv = CFG.p1.v * vm * (phaseOf() === 3 ? 1.15 : 1), tt = Math.max(0.4, (x0 - p.x) / sv);
      boardAt(x0, y0, -sv, clamp((p.y - y0) / tt, -110, 110), 'straight');
      if (Math.random() < CFG.p1.dbl) {   // a veces una segunda tabla, hacia donde uno se escaparía
        var y2 = clamp(p.y + (p.y > 140 ? -1 : 1) * rnd(40, 60), 50, 236);
        boardAt(x0 + 8, y0, -sv * 0.92, clamp((y2 - y0) / tt, -130, 130), 'straight');
      }
    }
    else if (kind === 'burst') {
      var sh = rnd(-19, 19), gap = (Math.random() * 4) | 0;   // 4 carriles de 38 px alrededor de Alexander; uno queda libre
      for (var i = 0; i < 4; i++) if (i !== gap) boardAt(x0 - i * 6, clamp(p.y + (i - 1.5) * 38 + sh, 48, 236), -CFG.p2.v * vm, 0, 'burst');
      // las tablas salen del Tablazo y se abren hasta su carril
      for (var j = S.boards.length - 3; j < S.boards.length; j++) { var bd = S.boards[j]; bd.ty = bd.y; bd.y = y0; }
    }
    else if (kind === 'boom') {
      boardAt(x0, y0, -215 * vm, 0, 'boom', 4);
      var bm = S.boards[S.boards.length - 1]; bm.by = clamp(y0 + (y0 > 140 ? -1 : 1) * rnd(55, 80), 60, 228); bm.hp = 3;
    }
    else if (kind === 'wave') {
      var gapI = 1 + ((Math.random() * 4) | 0), sp = 36, base = 45, ph0 = Math.random() * 6.28;
      for (var k = 0; k < 6; k++) if (k !== gapI) {
        boardAt(W + 14, base + k * sp, -CFG.p3.v * vm, 0, 'wave');
        var w = S.boards[S.boards.length - 1]; w.y0 = base + k * sp; w.ph = ph0;
      }
      sfx('cv.tabla.gira', { wave: true });
    }
    sfx('cv.tabla.gira', { kind: kind });
  }
  function hitBoss(dmg, x, y, c) {
    var b = S.b;
    b.hp = Math.max(0, b.hp - dmg); b.hurtT = 0.08; S.hits++;
    sparkAt(x, y, c, 4);
    if (b.hp <= 0 && S.phase === 'fight') killBoss();
  }
  function killBoss() {
    var b = S.b;
    S.phase = 'dying'; S.phT = 0; b.vy = -50; b.vx = -30; b.rot = 0;
    S.torn = [{ x: b.x - 18, y: b.y - 48, vx: -70, vy: -60, r: 0, vr: -3 }, { x: b.x + 18, y: b.y - 48, vx: 80, vy: -70, r: 0, vr: 3 }];
    for (var i = 0; i < S.boards.length; i++) shatter(S.boards[i]);
    S.boards.length = 0; S.pels.length = 0;
    sfx('cv.tabla.golpe', { boss: true });
    for (i = 0; i < 16; i++) S.parts.push({ x: b.x, y: b.y - 40, vx: rnd(-80, 80), vy: rnd(-90, 10), g: 140, t: 0, d: rnd(.6, 1.2), c: i % 2 ? '#22c9bf' : '#128c86', k: 'rect' });
  }
  function dyingUpdate(dt) {
    var b = S.b, sea = seaTop();
    if (S.splashT < 0) {
      b.vy += 260 * dt; b.y += b.vy * dt; b.x += b.vx * dt; b.rot += 7 * dt;
      if (b.y >= sea + 6) { S.splashT = 0; S.splashX = b.x; sfx('cv.splash'); toast('splash', 1.3, 96); S.p.shout = 0; }
    } else {
      S.splashT += dt;
      if (S.splashT > 1.25 && !S.rasaT) { S.rasaT = true; toast('rasa', 2.2, 104); }
      if (S.splashT > 3.4) { S.phase = 'outro'; S.phT = 0; }
    }
    if (S.torn) for (var i = 0; i < 2; i++) { var w = S.torn[i]; w.vy += 150 * dt; w.x += w.vx * dt; w.y += w.vy * dt; w.r += w.vr * dt; }
  }
  function seaTop() { return Math.round(H - clamp((95 - S.alt) / 95, 0, 1) * 46); }

  /* ---------- proyectiles ---------- */
  function projUpdate(dt) {
    var p = S.p, b = S.b, i, j, a, bd;
    for (i = S.arrows.length - 1; i >= 0; i--) {
      a = S.arrows[i]; a.t += dt; a.x += a.vx * dt; a.y += a.vy * dt;
      var dead = a.x > W + 20 || a.y < -10 || a.y > H + 10;
      if (!dead) for (j = 0; j < S.boards.length; j++) {
        bd = S.boards[j]; var dx = a.x - bd.x, dy = a.y - bd.y;
        if (dx * dx + dy * dy < 12 * 12) {
          bd.hp--; bd.flash = 0.08; sparkAt(a.x, a.y, a.c, 3); dead = true;
          if (bd.hp <= 0) { shatter(bd); S.boards.splice(j, 1); sfx('cv.tabla.golpe', { broke: true }); }
          break;
        }
      }
      if (!dead && (S.phase === 'fight')) {
        var ex = (a.x - b.x) / 15, ey = (a.y - (b.y - 2)) / 21;
        if (ex * ex + ey * ey < 1) { hitBoss(CFG.arrowDmg * S.mult, a.x, a.y, a.c); dead = true; }
      }
      if (dead) S.arrows.splice(i, 1);
    }
    for (i = S.boards.length - 1; i >= 0; i--) {
      bd = S.boards[i]; bd.t += dt; bd.rot += bd.spin * dt; if (bd.flash > 0) bd.flash -= dt;
      if (bd.kind === 'boom') {
        if (!bd.back && (bd.x < CFG.pX - 72 || bd.t > 1.7)) { bd.back = true; bd.vx = 0; }
        if (bd.back) { bd.vx = Math.min(185, bd.vx + 420 * dt); bd.y += (bd.by - bd.y) * Math.min(1, dt * 3.2); }
        else bd.vx = Math.min(-60, bd.vx + 110 * dt);
      } else if (bd.kind === 'wave') {
        bd.y = bd.y0 + Math.sin(bd.t * 2.5 + bd.ph) * 38;
      } else if (bd.ty != null) {
        bd.y += (bd.ty - bd.y) * Math.min(1, dt * 7);
      }
      bd.x += bd.vx * dt; bd.y += bd.vy * dt;
      if (bd.x < -30 || bd.x > W + 40) { S.boards.splice(i, 1); continue; }
      var hx = (bd.x - (p.x + 1)) / 15, hy = (bd.y - (p.y - 1)) / 16;
      if (hx * hx + hy * hy < 1 && p.inv <= 0 && S.phase === 'fight') {
        hurtPlayer(1, bd.vx < 0 ? -90 : 90, (p.y - bd.y) * 3);
        shatter(bd); S.boards.splice(i, 1);
        if (S.phase !== 'fight') { S.boards.length = 0; break; }   // perdió: hurtPlayer vació la lista
      }
    }
    for (i = S.pels.length - 1; i >= 0; i--) {
      var pl = S.pels[i]; pl.x += pl.vx * dt; pl.f += dt * 9; pl.y += Math.sin(pl.f * .5) * 10 * dt;
      if (pl.x < -50 || pl.x > W + 50) { S.pels.splice(i, 1); continue; }
      var qx = (pl.x - p.x) / 22, qy = (pl.y - p.y) / 16;
      if (!pl.hit && qx * qx + qy * qy < 1 && S.phase === 'fight') {   // empuja, no hace daño
        pl.hit = true; p.ky = (p.y < pl.y ? -1 : 1) * 190; p.kx = pl.dir * 60; p.stun = 0.25;
        sfx('cv.viento', { gust: true, dur: 0.3 });
        for (j = 0; j < 6; j++) S.parts.push({ x: pl.x, y: pl.y, vx: rnd(-40, 40), vy: rnd(-40, 20), g: 30, t: 0, d: .6, c: '#efe8d8', k: 'rect' });
      }
    }
  }
  function shatter(bd) {
    var cols = (S.A && S.A.COL.board[bd.ci]) || ['#ff5a3c', '#fff', '#a33'];
    for (var i = 0; i < 7; i++) S.parts.push({ x: bd.x, y: bd.y, vx: rnd(-90, 60), vy: rnd(-80, 40), g: 220, t: 0, d: rnd(.5, .9), c: cols[i % 3], k: 'rect', w: 2 + (i % 2) * 2 });
  }
  function sparkAt(x, y, c, n) { for (var i = 0; i < n; i++) S.parts.push({ x: x, y: y, vx: rnd(-70, 30), vy: rnd(-60, 60), g: 0, t: 0, d: rnd(.18, .35), c: c, k: 'spark' }); }
  function partsUpdate(dt) {
    for (var i = S.parts.length - 1; i >= 0; i--) { var q = S.parts[i]; q.t += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.t > q.d) S.parts.splice(i, 1); }
    if (S.parts.length > 160) S.parts.splice(0, S.parts.length - 160);
  }

  /* ---------- piloto automático (solo QA: mide duración y daño recibido) ---------- */
  function botAI() {
    var p = S.p, best = p.y, bestScore = -1e9;
    for (var y = CFG.pYmin; y <= CFG.pYmax; y += 6) {
      var sc = -Math.abs(y - S.b.y) * 0.4 - Math.abs(y - p.y) * 0.15;
      for (var i = 0; i < S.boards.length; i++) {
        var bd = S.boards[i], dxp = bd.x - p.x; if (dxp < -20) continue;
        if (bot === 'noob') continue;
        if (bot === 'mid') { if (bd.miss == null) bd.miss = Math.random() < 0.22; if (bd.miss || bd.t < 0.3) continue; }
        var tt = Math.abs(dxp / (bd.vx || -1)); if (bd.vx > 0 && dxp > 0) continue;
        var yy = bd.kind === 'wave' ? bd.y0 + Math.sin((bd.t + tt) * 2.5 + bd.ph) * 38 : (bd.ty != null ? bd.ty : bd.y);
        if (tt < (bot === 'mid' ? 0.7 : 1.4) && Math.abs(yy - y) < (bot === 'mid' ? 18 : 24)) sc -= 300 * (1.5 - tt);
      }
      if (sc > bestScore) { bestScore = sc; best = y; }
    }
    if (bot === 'fan') { if (S.cd <= 0) { if (S.botCh == null) S.botCh = S.t; if (S.t - S.botCh >= CFG.hold) { shoot(true); S.botCh = null; } } }   // piloto del abanico: carga CFG.hold y suelta
    else if (S.cd <= 0) shoot(false);
    return { ax: 0, ay: clamp((best - p.y) / 12, -1, 1) };
  }

  /* ==================== DIBUJO ==================== */
  function block(ctx, x, y, w, h, col, label) {   // reemplazo si falta el arte
    ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h);
    if (label) { ctx.fillStyle = '#000'; ctx.font = '6px monospace'; ctx.fillText(label, Math.round(x) + 1, Math.round(y) + 7); }
  }
  function spr(ctx, c, x, y) { if (c) ctx.drawImage(c, Math.round(x - (c.ax || 0)), Math.round(y - (c.ay || 0))); }
  function render() {
    var ctx = S.dom.ctx, A = S.A, t = S.t, i;
    if (!A) { renderFallback(ctx); return; }
    // 1) cielo y mar del fondo
    ctx.drawImage(A.bg, 0, 0);
    // nubes: suben despacio (mosaico vertical), solo sobre el horizonte
    var cy = Math.floor(S.cloud) % 300, hh = HOR - 3, cx = Math.floor(t * 3) % W;
    for (var pass = 0; pass < 2; pass++) {
      var dx = pass ? W - cx : -cx;
      var h1 = Math.min(hh, 300 - cy);
      ctx.drawImage(A.clouds, 0, cy, W, h1, dx, 0, W, h1);
      if (h1 < hh) ctx.drawImage(A.clouds, 0, 0, W, hh - h1, dx, h1, W, hh - h1);
    }
    // 2) costa lejana y el Morro Solar que se acerca
    ctx.drawImage(A.coast, 0, HOR - 38);
    var k = 1 - S.alt / CFG.altStart, sc = 0.78 + 0.5 * k, mw = Math.round(A.morro.width * sc), mh = Math.round(A.morro.height * sc);
    ctx.drawImage(A.morro, W + 8 - mw, HOR + 3 - mh, mw, mh);
    // 3) acantilado de la Costa Verde (sube rápido)
    var cly = -(Math.floor(S.scroll) % 256);
    for (var yy = cly; yy < H; yy += 256) ctx.drawImage(A.cliff, 0, yy);
    // mar cercano + Circuito de Playas cuando ya estás abajo
    var st = seaTop();
    if (st < H) { ctx.drawImage(A.base, 0, st); ctx.drawImage(A.waves[Math.floor(t * 5) % 3], 0, st - 4); }
    // 4a) gaviotas (detrás de los personajes)
    for (i = 0; i < S.gulls.length; i++) { var g = S.gulls[i]; spr(ctx, A.gull[Math.floor(g.f) % 2], g.x, g.y); }
    // garúa
    var rx = Math.floor(t * 14) % 240, ry = Math.floor(t * 40 * (0.5 + S.fall)) % 240;
    for (var gy = -ry; gy < H; gy += 240) for (var gx = -rx; gx < W; gx += 240) ctx.drawImage(A.rain, gx, gy);
    // El Tablazo
    drawBoss(ctx, A);
    // tablas
    for (i = 0; i < S.boards.length; i++) {
      var bd = S.boards[i], ro = ((Math.floor(bd.rot / (Math.PI / 8)) % 8) + 8) % 8;
      spr(ctx, bd.flash > 0 ? A.board[3][ro] : A.board[bd.ci][ro], bd.x, bd.y);
    }
    // flechitas con estela y brillo
    for (i = 0; i < S.arrows.length; i++) {
      var a = S.arrows[i];
      spr(ctx, A.halo[a.c], a.x - 3, a.y);
      if (a.vy === 0) spr(ctx, A.trail[a.c], a.x - 7, a.y);
      else { ctx.save(); ctx.translate(Math.round(a.x), Math.round(a.y)); ctx.rotate(Math.atan2(a.vy, a.vx)); ctx.drawImage(A.trail[a.c], -31, -2); ctx.restore(); }
      spr(ctx, A.arrow[a.c], a.x, a.y);
    }
    // Alexander
    drawAlex(ctx, A);
    // pelícanos (obstáculos)
    for (i = 0; i < S.pels.length; i++) {
      var pl = S.pels[i], pc = A.pelican[Math.floor(pl.f) % 3];
      if (pl.dir > 0) { ctx.save(); ctx.translate(Math.round(pl.x), Math.round(pl.y)); ctx.scale(-1, 1); ctx.drawImage(pc, -pc.ax, -pc.ay); ctx.restore(); }
      else spr(ctx, pc, pl.x, pl.y);
    }
    // partículas
    for (i = 0; i < S.parts.length; i++) {
      var q = S.parts[i];
      if (q.k === 'spark') spr(ctx, A.spark[typeof q.c === 'number' ? q.c : 0], q.x, q.y);
      else { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.w || 2, 2); }
    }
    // salpicón
    if (S.splashT >= 0 && S.splashT < 0.9) spr(ctx, A.splash[Math.min(4, Math.floor(S.splashT / 0.18))], S.splashX, st + 8);
    // 4b) jirones de neblina delante
    for (i = 0; i < S.fogs.length; i++) { var f = S.fogs[i]; ctx.drawImage(A.fog[f.f], Math.round(f.x), Math.round(f.y)); }
    drawHud(ctx, A);
    if (S.fade > 0) { ctx.globalAlpha = Math.min(1, S.fade); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (S.paused) {
      ctx.globalAlpha = 0.6; ctx.fillStyle = '#08070a'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      spr(ctx, A.hud.toasts.pausa, W / 2 - A.hud.toasts.pausa.width / 2, 104);
      spr(ctx, A.hud.toasts.pausaSub, W / 2 - A.hud.toasts.pausaSub.width / 2, 142);
    }
  }
  function drawAlex(ctx, A) {
    var p = S.p, t = S.t;
    if (p.inv > 0 && S.phase === 'fight' && Math.floor(p.inv * 14) % 2 === 0) return;   // parpadeo
    var lost = S.phase === 'lost';
    var tilt = clamp(p.vy / 600, -0.12, 0.12) + (lost ? S.phT * 2 : 0);
    var wx = Math.round(clamp(-p.vx / 40, -2, 2)), bob = Math.round(Math.sin(t * 2.1) * 1);
    var body;
    if (S.phase === 'intro') body = S.phT < 0.9 ? A.alex.fly[Math.floor(t * 6) % 2] : (S.phT < 1.9 ? A.alex.snap[Math.floor(S.phT * 5) % 2] : A.alex.load);
    else if (p.hurtT > 0 || lost) body = A.alex.hurt;
    else if (S.shootT > 0) body = A.alex.shoot;
    else if (S.fire && S.fire.t > 0.18) body = A.alex.charge;
    else body = A.alex.fly[Math.floor(t * 5) % 2];
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y + bob)); if (tilt) ctx.rotate(tilt);
    ctx.drawImage(A.alexWing, -A.alexWing.ax + wx, -10 - A.alexWing.ay);
    ctx.drawImage(body, -body.ax, -body.ay);
    ctx.restore();
    // carga del abanico
    if (S.fire && S.phase === 'fight' && S.fire.t > 0.18) {
      var k = clamp(S.fire.t / CFG.hold, 0, 1), col = A.COL.arrow[Math.floor(S.t * 10) % 4];
      ctx.fillStyle = '#141216'; ctx.fillRect(Math.round(p.x) - 10, Math.round(p.y) + 16, 22, 4);
      ctx.fillStyle = k >= 1 ? col : '#ffe500'; ctx.fillRect(Math.round(p.x) - 9, Math.round(p.y) + 17, Math.round(20 * k), 2);
      if (k >= 1) spr(ctx, A.halo[Math.floor(S.t * 10) % 4], p.x + 12, p.y - 4);
    }
  }
  function drawBoss(ctx, A) {
    var b = S.b;
    if (S.phase === 'intro') return;
    var bob = Math.round(Math.sin(S.t * 2.6) * 1), x = Math.round(b.x), y = Math.round(b.y + bob);
    if (S.phase === 'dying' || S.phase === 'outro') {
      if (S.torn) for (var i = 0; i < 2; i++) { var w = S.torn[i]; ctx.save(); ctx.translate(Math.round(w.x), Math.round(w.y)); ctx.rotate(w.r); ctx.drawImage(A.wingTorn[i], -A.wingTorn[i].ax, -A.wingTorn[i].ay); ctx.restore(); }
      if (S.splashT < 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot); ctx.drawImage(A.boss.dead, -A.boss.dead.ax, -A.boss.dead.ay); ctx.restore(); }
      return;
    }
    var tilt = clamp(b.vy / 700, -0.1, 0.1);
    ctx.save(); ctx.translate(x, y); if (tilt) ctx.rotate(tilt);
    ctx.drawImage(A.bossWing, -A.bossWing.ax, -11 - A.bossWing.ay);
    var fr = b.pose === 'pull' ? A.boss.pull : b.pose === 'throw' ? A.boss.throw : (S.rage ? A.boss.rage : A.boss.idle)[Math.floor(S.t * 4) % 2];
    if (b.hurtT > 0) fr = A.bossHurt;
    ctx.drawImage(fr, -fr.ax, -fr.ay);
    ctx.restore();
    // aviso: «!» que parpadea sobre la tabla que saca
    if (b.tele > 0 && S.phase === 'fight') {
      var on = Math.floor(b.tele * 16) % 2 === 0, col = b.teleKind === 'wave' ? '#4fe3ff' : b.teleKind === 'boom' ? '#b04aff' : '#ffe500';
      if (on) { ctx.fillStyle = '#141216'; ctx.fillRect(x - 34, y - 12, 7, 13); ctx.fillStyle = col; ctx.fillRect(x - 32, y - 10, 3, 6); ctx.fillRect(x - 32, y - 3, 3, 2); }
    }
  }
  function num(ctx, A, str, x, y) { for (var i = 0; i < str.length; i++) { var d = A.hud.digits[str[i]]; if (d) { ctx.drawImage(d, x, y); x += d.width - 3; } } return x; }
  function drawHud(ctx, A) {
    var hd = A.hud, i, p = S.p, b = S.b;
    if (S.phase === 'intro' && S.phT < 0.4) return;
    // corazones
    for (i = 0; i < CFG.hearts; i++) ctx.drawImage(i < Math.ceil(p.hp) ? hd.heart : hd.heartE, 6 + i * 10, 6);
    if (god) { ctx.fillStyle = '#ffe500'; ctx.fillRect(6, 16, 3, 2); }
    // v0.13 (E4): contador de barras fosforescentes (+10 % de daño cada una, tope +50 %)
    var nb = S.fosfo, pc = Math.round((S.mult - 1) * 100);
    var bl = A.text('BARRAS X' + nb + (nb > 0 ? ' - +' + pc + ' %' + (nb > CFG.barMax ? ' (TOPE)' : '') : ' - +0 %'), { font: 'a5', ink: nb > 0 ? '#1fe07a' : '#9b95a3', outline: '#141216' });
    ctx.drawImage(bl, 5, 17);
    // altura
    var ax = W - 20, ay = 30;
    ctx.drawImage(hd.toasts.altura, ax - 8, ay - 11);
    ctx.drawImage(hd.altBar, ax, ay);
    var my = Math.round(ay + 2 + 204 * (1 - S.alt / CFG.altStart));
    ctx.fillStyle = '#141216'; ctx.fillRect(ax - 6, my - 3, 6, 7); ctx.fillStyle = S.rage ? '#ff2e88' : '#ffe500'; ctx.fillRect(ax - 5, my - 2, 4, 5); ctx.fillRect(ax - 1, my - 1, 2, 3);
    var s = Math.round(S.alt) + ' m', nw = s.length * 4 + 4;
    ctx.fillStyle = '#141216'; ctx.fillRect(ax - 9 - nw, my - 4, nw + 2, 9);
    num(ctx, A, s, ax - 9 - nw, my - 3);
    // barra del jefe
    if (S.phase === 'fight' || S.phase === 'dying' || (S.phase === 'card' && S.phT > 1.2)) {
      var bx = Math.round(W / 2 - 88), by = 8;
      ctx.drawImage(hd.bossFrame, bx, by);
      var k = b.hp / CFG.bossHp;
      ctx.fillStyle = S.rage ? '#ff4b4b' : '#ff2e88'; ctx.fillRect(bx + 3, by + 3, Math.round(170 * k), 6);
      ctx.fillStyle = '#ffc1dd'; ctx.fillRect(bx + 3, by + 3, Math.round(170 * k), 1);
      ctx.fillStyle = '#141216'; ctx.fillRect(bx + 3 + Math.round(170 / 3), by + 3, 1, 6); ctx.fillRect(bx + 3 + Math.round(340 / 3), by + 3, 1, 6);
      var nm = A.text('EL TABLAZO', { font: 'a5', ink: '#ffe500', outline: '#141216' });
      ctx.drawImage(nm, Math.round(W / 2 - nm.width / 2), by + 11);
    }
    // cartel del jefe
    if (S.phase === 'card') {
      var c = hd.card, kk = clamp(S.phT / 0.35, 0, 1), out = clamp((S.phT - 2.0) / 0.35, 0, 1);
      var cyy = Math.round(-c.height + (c.height + 40) * (1 - Math.pow(1 - kk, 3)) - out * (c.height + 50));
      ctx.drawImage(c, Math.round(W / 2 - c.width / 2), cyy);
    }
    // carteles
    for (i = 0; i < S.toasts.length; i++) {
      var tt = S.toasts[i], im = hd.toasts[tt.k]; if (!im) continue;
      var pop = tt.t < 0.12 ? 1 + (0.12 - tt.t) * 3 : 1, a = tt.t > tt.d - 0.3 ? (tt.d - tt.t) / 0.3 : 1;
      ctx.globalAlpha = clamp(a, 0, 1);
      var w = Math.round(im.width * pop), h = Math.round(im.height * pop);
      var tx = tt.k === 'ola' ? Math.round(S.b.x - w + 10) : Math.round(W / 2 - w / 2);
      ctx.drawImage(im, tx, Math.round(tt.y - h / 2), w, h);
      if (tt.k === 'luces' && S.fosfo > 0) { var bn = A.text('+' + Math.round((S.mult - 1) * 100) + '% DE DAÑO', { font: 'a5', ink: '#ffe500', outline: '#141216' }); ctx.drawImage(bn, Math.round(W / 2 - bn.width / 2), Math.round(tt.y + h / 2 + 2)); }
      ctx.globalAlpha = 1;
    }
    // subtítulo de la voz del Tablazo (a la izquierda de él)
    for (i = 0; i < S.says.length; i++) {
      var sy = S.says[i], st = A.text(sy.s, { font: 'a5', ink: '#141216' }), sa = sy.t > sy.d - 0.3 ? (sy.d - sy.t) / 0.3 : 1;
      var sw = st.width + 8, sx = Math.round(clamp(S.b.x - 46 - sw, 4, W - sw - 4)), syy = Math.round(clamp(S.b.y - 14, 36, H - 40));
      ctx.globalAlpha = clamp(sa, 0, 1);
      ctx.fillStyle = '#141216'; ctx.fillRect(sx - 1, syy - 1, sw + 2, 15); ctx.fillStyle = '#b9e8c0'; ctx.fillRect(sx, syy, sw, 13); ctx.fillStyle = '#ff2e88'; ctx.fillRect(sx + 1, syy + 13, sw, 1);
      ctx.drawImage(st, sx + 2, syy + 2);
      ctx.globalAlpha = 1;
    }
    // ayuda de controles (v0.13: 9 s, con las cuatro cosas que hay que saber)
    var tch = touchOn() || S.touchSeen;
    if (S.phase === 'fight' && S.hintT < CFG.hintSec) {
      var hk = CFG.hintSec;
      ctx.globalAlpha = clamp(S.hintT > hk - 0.6 ? (hk - S.hintT) / 0.6 : Math.min(1, S.hintT / 0.2), 0, 1);
      var h1 = A.text(tch ? 'IZQUIERDA: ARRASTRA PARA SUBIR-BAJAR Y ESQUIVAR' : 'W/S: SUBIR-BAJAR - A/D: ESQUIVAR', { font: 'a5', ink: '#f2f2ee', outline: '#141216' });
      var h2 = A.text(tch ? 'BOTÓN: FLECHAS - MANTÉN = ABANICO' : 'ESPACIO: FLECHAS - MANTÉN = ABANICO', { font: 'a5', ink: '#ffe500', outline: '#141216' });
      var hw = Math.max(h1.width, h2.width) + 10;
      ctx.fillStyle = 'rgba(20,18,22,0.72)'; ctx.fillRect(Math.round(W / 2 - hw / 2), H - 36, hw, 26);
      ctx.drawImage(h1, Math.round(W / 2 - h1.width / 2), H - 33);
      ctx.drawImage(h2, Math.round(W / 2 - h2.width / 2), H - 21);
      ctx.globalAlpha = 1;
    }
    // táctil: botón de disparo y palanca
    if (tch && (S.phase === 'fight' || S.phase === 'card')) {
      ctx.globalAlpha = S.fire ? 1 : 0.7; spr(ctx, hd.fireBtn, W - 52, H - 40); ctx.globalAlpha = 1;
      if (S.stick) { ctx.fillStyle = 'rgba(255,229,0,0.35)'; ctx.fillRect(Math.round(S.stick.x0) - 2, Math.round(S.stick.y0) - 2, 4, 4); ctx.fillRect(Math.round(S.stick.x) - 4, Math.round(S.stick.y) - 4, 8, 8); }
    }
  }
  function renderFallback(ctx) {   // sin arte: bloques con nombre (el modo igual se juega)
    ctx.fillStyle = '#8d919b'; ctx.fillRect(0, 0, W, HOR); ctx.fillStyle = '#4f6d6e'; ctx.fillRect(0, HOR, W, H - HOR);
    block(ctx, 0, 0, 80, H, '#9a7b55', 'acantilado');
    var p = S.p, b = S.b, i;
    if (S.phase !== 'intro') { block(ctx, b.x - 40, b.y - 60, 80, 12, '#22c9bf', 'SURF'); block(ctx, b.x - 12, b.y - 18, 24, 36, b.hurtT > 0 ? '#fff' : '#93a083', 'tablazo'); }
    block(ctx, p.x - 38, p.y - 60, 76, 12, '#ff2e88', 'parapente'); if (!(p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0)) block(ctx, p.x - 10, p.y - 16, 20, 32, '#2f5fb8', 'alex');
    for (i = 0; i < S.boards.length; i++) block(ctx, S.boards[i].x - 12, S.boards[i].y - 4, 24, 8, '#ff5a3c');
    for (i = 0; i < S.arrows.length; i++) block(ctx, S.arrows[i].x - 8, S.arrows[i].y - 1, 9, 3, ['#39ff6a', '#ff4fb3', '#fff13a', '#4fe3ff'][S.arrows[i].c]);
    for (i = 0; i < S.pels.length; i++) block(ctx, S.pels[i].x - 14, S.pels[i].y - 7, 28, 14, '#8a7f70', 'pelicano');
    ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
    ctx.fillText('VIDA ' + p.hp + '  JEFE ' + b.hp.toFixed(1) + '  ALT ' + Math.round(S.alt) + 'm  ' + S.phase, 90, 12);
    if (S.fade > 0) { ctx.globalAlpha = Math.min(1, S.fade); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  /* ---------- API ---------- */
  ACH.cv.caida = {
    start: start,
    stop: function () { return stop(false); },
    isOn: function () { return !!S; },
    CFG: CFG,
    debug: {
      win: function () { if (!S) return false; if (S.phase === 'intro' || S.phase === 'card') { S.phase = 'fight'; S.phT = 0; try { if (dlgActive()) ACH.dialogo.close(); } catch (e) { /* nada */ } } S.b.hp = 0; killBoss(); return true; },
      hp: function (n) { if (!S) return null; if (n != null) S.p.hp = clamp(n, 0, CFG.hearts); return S.p.hp; },
      god: function (b) { god = b === undefined ? !god : !!b; return god; },
      bot: function (b) { bot = b === undefined ? !bot : (b === 'mid' || b === 'noob' || b === 'fan' ? b : !!b); return bot; },
      shoot: function (fan) { if (!S || S.phase !== 'fight') return false; S.cd = 0; shoot(!!fan); return S.arrows.length; },
      alt: function (m) { if (S && m != null) S.alt = clamp(m, CFG.altLock, CFG.altStart); return S ? S.alt : null; },
      bossHp: function (n) { if (S && n != null) S.b.hp = clamp(n, 0.01, CFG.bossHp); return S ? S.b.hp : null; },
      sim: function (sec) { if (!S) return null; var n = Math.round(sec * 60); for (var i = 0; i < n && S && S.phase !== 'end'; i++) update(1 / 60); var st = S ? ACH.cv.caida.debug.state() : null; if (S && S.phase === 'end') finish(S.result); return st; },
      bench: function (n) { if (!S) return null; n = n || 300; var t0 = now(); for (var i = 0; i < n; i++) { update(1 / 60); if (!S) break; render(); } return S ? +((now() - t0) / n).toFixed(3) : null; },
      paint: function () { if (S) { S.paused = false; render(); } return !!S; },
      skipIntro: function () { if (!S) return false; try { if (dlgActive()) ACH.dialogo.close(); } catch (e) { /* nada */ } S.dlgDone = true; S.p.x = CFG.pX; S.p.y = 140; S.b.x = CFG.bossX; S.phase = 'fight'; S.phT = 0; S.fade = 0; return true; },
      state: function () {
        if (!S) return null;
        return { phase: S.phase, t: +S.t.toFixed(2), alt: +S.alt.toFixed(1), rage: S.rage, hp: S.p.hp, bossHp: +S.b.hp.toFixed(2), bossPhase: phaseOf(),
          boards: S.boards.length, arrows: S.arrows.length, shots: S.shots | 0, pels: S.pels.length, parts: S.parts.length, mult: S.mult, hits: S.hits, taken: S.taken,
          art: !!S.A, bakeMs: S.A ? S.A.bakeMs : null, avgFrameMs: S.frames ? +(S.ftSum / S.frames).toFixed(3) : 0, maxFrameMs: +S.ftMax.toFixed(2) };
      },
      fps: function () { if (!fpsLog.length) return null; var s = 0, mx = 0; fpsLog.forEach(function (d) { s += d; if (d > mx) mx = d; }); return { fps: +(fpsLog.length / s).toFixed(1), worstMs: +(mx * 1000).toFixed(1), n: fpsLog.length }; }
    }
  };
})();
