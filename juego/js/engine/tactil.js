/* ACHORADO — tactil.js: controles táctiles para jugar en el teléfono (horizontal).
   Se activa con (pointer: coarse), con el primer toque en un equipo con pantalla táctil, con ?touch=1 o con ACH.debug.touch(true).
   Todo pasa por ACH.input: eje analógico virtual (setVAxis), teclas virtuales (press/release) y mouse simulado en coordenadas de mundo
   (mouseTo/mousePress/mouseRelease) para la resortera. No toca la lógica del juego. En escritorio no hace nada.
   Pointer Events con multitoque por pointerId: se puede probar despachando PointerEvent sintéticos (pointerType 'touch'). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var T = ACH.touch = { on: false, forced: false };

  var Q = location.search || '';
  var FORCE_ON = /[?&]touch=1(&|$)/.test(Q), FORCE_OFF = /[?&]touch=0(&|$)/.test(Q);
  var COARSE = false;
  try { COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { /* nada */ }
  var HAS_TOUCH = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;

  var STICK_R = 56, DEAD = 0.14, RUN_AT = 0.85;          // joystick: radio (px de pantalla), zona muerta, correr pasando el 85 %
  var SL_CANCEL = 30, SL_DRAG = 120, SL_RMIN = 60, SL_RMAX = 280, SL_SPIN_PX = 70;   // resortera: radio de cancelar, arrastre para 60–280 px, efecto
  var KEY_VIB = 'achorado.vibra';

  var el = {}, built = false, ptrs = {}, stick = null, sling = null, firstDone = false;
  var vibOn = true;
  try { vibOn = window.localStorage.getItem(KEY_VIB) !== '0'; } catch (e) { /* nada */ }

  function I() { return ACH.input; }
  function G() { return ACH.G; }
  function state() { var g = G(); return g ? g.state : 'title'; }
  function invOpen() { try { return !!(ACH.inv && ACH.inv.isOpen && ACH.inv.isOpen()); } catch (e) { return false; } }
  // v0.13 verificación: el prólogo de la combi (estado 'cine', prologo.js lee ACH.input) se juega con joystick, GUITARRAZO, TITINA y ABRIR
  function proOn() { try { return !!(ACH.prologo && ACH.prologo.active && ACH.prologo.active()) && /^(golpe|pelea|puerta)$/.test(ACH.prologo.phase ? ACH.prologo.phase() : 'golpe') && !(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); } catch (e) { return false; } }
  function canAct(s) { return (s === 'playing' && !invOpen()) || (s === 'cine' && proOn()); }
  function proCtx() { try { return proOn() && ACH.prologo.canOpen && ACH.prologo.canOpen() ? { label: 'ABRIR', code: 'KeyE' } : null; } catch (e) { return null; } }
  function hasSling() {   // v0.9: resortera o molotov (arma a distancia activa, interaccion.js)
    try {
      var ri = ACH.inter && ACH.inter.rangedInfo ? ACH.inter.rangedInfo(G()) : null;
      if (ri) return !!(ri.sling || ri.molotov);
      return !!(ACH.inv && ACH.inv.has && ACH.inv.has('resortera'));
    } catch (e) { return false; }
  }
  var SL_SWAP_MS = 500, RK_LBL = { resortera: 'RESOR-<br>TERA', molotov: 'MOLO-<br>TOV' };   // v0.9 §7.2: mantener 0.5 s en el botón cambia de arma
  var rkShown = '';
  function syncRanged() {   // ícono, rótulo y munición del arma a distancia activa
    var ri = null; try { ri = ACH.inter && ACH.inter.rangedInfo ? ACH.inter.rangedInfo(G()) : null; } catch (e) { ri = null; }
    var k = ri && ri.kind === 'molotov' ? 'molotov' : 'resortera';
    if (rkShown !== k && el.tcSlingL) {
      rkShown = k; el.tcSlingL.innerHTML = RK_LBL[k];
      var cv = el.tcSlingIc, ic = ACH.sprites && ACH.sprites.fx && ACH.sprites.fx.rangedIcon && ACH.sprites.fx.rangedIcon[k];
      if (cv && cv.getContext) {
        var cx = cv.getContext('2d'); cx.clearRect(0, 0, cv.width, cv.height); cx.imageSmoothingEnabled = false;
        var src = ic && (ic.big || ic); if (src) cx.drawImage(src, 0, 0, src.width, src.height, 0, 0, cv.width, cv.height);
      }
    }
    if (el.tcSlingN && ACH.inv && ACH.inv.count) { var n = '' + ACH.inv.count(k === 'molotov' ? 'molotov' : 'piedras'); if (el.tcSlingN.textContent !== n) el.tcSlingN.textContent = n; }
  }
  // v0.8: armas.js
  function ctxAct() { try { return ACH.armas && ACH.armas.context ? ACH.armas.context() : null; } catch (e) { return null; } }
  function ctxHeld() { var g = ACH.G; return g && g.player && g.player.held; }
  var GUIT_LBL = { guit: 'GUITA-<br>RRAZO', punch: 'PUÑETE', skate: 'SKATE-<br>TAZO' };
  function guitLabel() {
    var g = ACH.G, p = g && g.player; if (!p) return 'guit';
    if (p.held && p.held.id === 'skate') return 'skate';
    if (p.held) return 'guit';
    return ACH.armas && ACH.armas.guitarState(p) >= 3 ? 'punch' : 'guit';
  }
  function $(id) { return document.getElementById(id); }

  /* ---------------- Zona segura (muescas) ---------------- */
  var probe = null;
  function safe() {
    if (!probe && document.body) {
      probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
      document.body.appendChild(probe);
    }
    if (!probe) return { t: 0, r: 0, b: 0, l: 0 };
    var cs = getComputedStyle(probe);
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  }
  T.safe = safe;
  T.box = function () { var s = safe(); return { w: Math.max(1, window.innerWidth - s.l - s.r), h: Math.max(1, window.innerHeight - s.t - s.b) }; };

  /* ---------------- Textos en modo táctil ---------------- */
  var TEXTS = [
    ['#hint', 'Joystick moverse · GUITARRAZO · SALTAR · TITINA · AGARRAR / LANZAR · MOCHILA'],
    ['#title .row', '<span>JOYSTICK moverse</span><span>A FONDO correr</span><span>GUITARRAZO</span><span>SALTAR</span><span>TITINA</span><span>MOCHILA</span><span>❚❚ pausa</span>'],
    ['#title .go', 'TOCA para empezar'],
    ['#intro .tip', 'TOCA'],
    ['#win .go', 'TOCA para empezar de nuevo'],
    ['#pause .go', 'TOCA AQUÍ para seguir'],
    ['#pause .mhint', '<b>🔊</b> silencio · <span id="muteState">CON SONIDO</span>'],
    ['.invfoot', '<span><b>TOCA</b> elegir</span><span><b>OTRA VEZ</b> o <b>USAR</b> usar</span><span>BARRA RÁPIDA: <b>TOCA</b> una casilla para asignar</span>']
  ];
  var orig = {};
  function swapTexts(on) {
    for (var i = 0; i < TEXTS.length; i++) {
      var n = document.querySelector(TEXTS[i][0]); if (!n) continue;
      if (on) { if (orig[i] === undefined) orig[i] = n.innerHTML; n.innerHTML = TEXTS[i][1]; }
      else if (orig[i] !== undefined) { n.innerHTML = orig[i]; }
    }
    var mute = $('muteState'); if (mute && ACH.audio && ACH.audio.muted) mute.textContent = ACH.audio.muted() ? 'SIN SONIDO' : 'CON SONIDO';
    var go = document.querySelector('#pause .go'); if (go) { if (on) go.setAttribute('data-tc', 'resume'); else go.removeAttribute('data-tc'); }
  }

  /* ---------------- DOM de los controles ---------------- */
  function build() {
    if (built || !document.body) return;
    built = true;
    var tc = document.createElement('div');
    tc.id = 'tc'; tc.setAttribute('data-ui', '');
    tc.innerHTML =
      '<div id="tcStick"><i></i><b>¡CORRE!</b></div>' +
      '<div class="tctop">' +
        '<button type="button" tabindex="-1" id="tcBag" data-tc="bag" aria-label="Mochila">MOCHILA</button>' +
        '<button type="button" tabindex="-1" id="tcRec" data-tc="rec" aria-label="Recetario">RECETAS</button>' +   // v0.13 (G5): directo al recetario
        '<button type="button" tabindex="-1" id="tcCasa" data-tc="casa" aria-label="Mi cuarto">CUARTO</button>' +   // v0.13 (G5): directo al cuarto
        '<button type="button" tabindex="-1" id="tcArbol" class="hide" data-tc="arbol" aria-label="Árbol de melodías">ÁRBOL</button>' +   // v0.11
        '<button type="button" tabindex="-1" id="tcPause" data-tc="pause" aria-label="Pausa">❚❚</button>' +
        '<button type="button" tabindex="-1" id="tcMute" data-tc="mute" aria-label="Sonido">🔊</button>' +
        '<button type="button" tabindex="-1" id="tcFull" class="fsbtn" data-tc="full" aria-label="Pantalla completa">⛶</button>' +
      '</div>' +
      '<button type="button" tabindex="-1" id="tcGuit" class="tcb big" data-tc="guit">GUITA-<br>RRAZO</button>' +
      '<button type="button" tabindex="-1" id="tcCtx" class="tcb hide" data-tc="ctx" style="right:calc(env(safe-area-inset-right) + 26px);bottom:calc(env(safe-area-inset-bottom) + 128px);border-color:rgba(255,229,0,.9);color:#ffe500">AGARRAR</button>' +
      '<button type="button" tabindex="-1" id="tcJump" class="tcb" data-tc="jump">SALTAR</button>' +   // v0.9: C
      '<button type="button" tabindex="-1" id="tcTit" class="tcb" data-tc="tit">TITINA<small id="tcTitN"></small></button>' +
      '<button type="button" tabindex="-1" id="tcSling" class="tcb" data-tc="sling"><canvas id="tcSlingIc" width="24" height="24" style="width:20px;height:20px;image-rendering:pixelated;margin-bottom:2px"></canvas><span id="tcSlingL">RESOR-<br>TERA</span><small id="tcSlingN"></small></button>' +
      '<button type="button" tabindex="-1" id="tcMel" class="tcb hide" data-tc="mel">MELO-<br>DÍA<small id="tcMelN"></small></button>' +   // v0.11: tocar = melodía elegida; mantener 0,4 s = abanico
      '<div id="tcMelFan" class="hide"></div>' +
      '<div id="tcAim"></div>';
    document.body.appendChild(tc);
    var rot = document.createElement('div');
    rot.id = 'tcRotate';
    rot.innerHTML = '<div class="poster"><p class="kicker">ACHORADO</p><h2>Gira tu teléfono</h2><p class="tcrot">📱↻</p><p class="sub">se juega en horizontal, causa</p></div>';
    document.body.appendChild(rot);
    // vibración: interruptor en la pausa
    var pz = document.querySelector('#pause .poster');
    if (pz) {
      var vb = document.createElement('button');
      vb.type = 'button'; vb.tabIndex = -1; vb.id = 'tcVib'; vb.className = 'tcvib'; vb.setAttribute('data-tc', 'vib');
      pz.insertBefore(vb, pz.querySelector('.go'));
    }
    ['tc', 'tcStick', 'tcBag', 'tcRec', 'tcCasa', 'tcPause', 'tcMute', 'tcFull', 'tcGuit', 'tcCtx', 'tcTit', 'tcTitN', 'tcSling', 'tcSlingN', 'tcSlingL', 'tcSlingIc', 'tcAim', 'tcRotate', 'tcVib', 'tcMel', 'tcMelN', 'tcMelFan', 'tcArbol'].forEach(function (k) { el[k] = $(k); });
    syncVib();
    // mochila: segundo toque sobre la casilla elegida = usar
    var grid = $('invGrid');
    if (grid) {
      var wasSel = false;
      grid.addEventListener('pointerdown', function (e) { var s = e.target.closest && e.target.closest('.islot'); wasSel = !!(s && s.classList.contains('sel')); }, true);
      grid.addEventListener('pointerup', function (e) {
        if (!T.on || e.pointerType === 'mouse') return;
        var s = e.target.closest && e.target.closest('.islot');
        if (s && wasSel && s.classList.contains('sel')) { var u = $('invUse'); if (u && !u.disabled) u.click(); }
        wasSel = false;
      });
    }
  }
  function syncVib() { if (el.tcVib) el.tcVib.textContent = 'VIBRACIÓN: ' + (vibOn ? 'SÍ' : 'NO'); }

  /* ---------------- Encender / apagar ---------------- */
  function enable(forced) {
    if (forced) T.forced = true;
    if (T.on) return;
    T.on = true;
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { T.on = false; enable(); }); return; }
    build();
    document.body.classList.add('touch');
    swapTexts(true);
    hookHaptics();
    refit();
    checkRotate();
  }
  function disable() {
    if (!T.on) return;
    if (!COARSE) T.persist(false);   // v0.13: volvió al teclado o al mouse
    releaseAll();
    T.on = false; T.forced = false;
    document.body.classList.remove('touch');
    swapTexts(false);
    refit();
    if (el.tcRotate) el.tcRotate.classList.remove('on');
  }
  function refit() { if (ACH.game && ACH.game.fit) { try { ACH.game.fit(); } catch (e) { /* nada */ } } }

  /* ---------------- Retrato: pide girar y pausa ---------------- */
  function portrait() { return window.innerHeight > window.innerWidth; }
  function checkRotate() {
    if (!el.tcRotate) return;
    var on = T.on && portrait();
    el.tcRotate.classList.toggle('on', on);
    if (on) {
      releaseAll();
      var s = state();
      if ((s === 'playing' || s === 'intro' || s === 'dead') && ACH.game && ACH.game.autoPause) ACH.game.autoPause();
    }
  }
  window.addEventListener('resize', function () { if (T.on) { refit(); checkRotate(); } });
  window.addEventListener('orientationchange', function () { setTimeout(function () { if (T.on) { refit(); checkRotate(); } }, 250); });

  /* ---------------- Primer toque: audio, voz, pantalla completa ---------------- */
  function firstGesture(noFs) {
    var A = ACH.audio;
    if (A && A.unlock) { try { A.unlock(); } catch (e) { /* nada */ } }
    var ua = navigator.userActivation;
    if (firstDone || (ua && !ua.isActive)) return;   // sin gesto real (eventos sintéticos) no se intenta: el navegador lo rechazaría
    firstDone = true;
    try {   // iOS: la voz sintética queda habilitada si la primera frase sale de un toque
      var ss = window.speechSynthesis;
      if (ss && window.SpeechSynthesisUtterance) { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; ss.speak(u); }
    } catch (e) { /* nada */ }
    if (!noFs) try {   // pantalla completa donde se puede (Android); en un iframe o en iPhone no hay: da igual
      var d = document.documentElement, rf = d.requestFullscreen || d.webkitRequestFullscreen;
      if (rf && (document.fullscreenEnabled || document.webkitFullscreenEnabled) && !(document.fullscreenElement || document.webkitFullscreenElement)) {
        var pr = rf.call(d, { navigationUI: 'hide' });
        if (pr && pr.then) pr.then(function () {
          try { var o = screen.orientation; if (o && o.lock) { var lp = o.lock('landscape'); if (lp && lp.catch) lp.catch(function () {}); } } catch (e) { /* nada */ }
        }, function () {});
      }
    } catch (e) { /* nada */ }
  }

  /* ---------------- Vibración ---------------- */
  var VIB = { hit: 12, 'punch.hit': 10, 'skate.hit': 12, 'moto.crash': 45, kill: 22, 'stone.hit.zombie': 10, 'shield.clang': 10, 'player.hurt': 40 }, vibAt = 0, hooked = false;
  function vibrate(ms) {
    if (!T.on || !vibOn || !navigator.vibrate || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return;
    var now = Date.now(); if (now - vibAt < 70) return; vibAt = now;
    try { navigator.vibrate(ms); } catch (e) { /* nada */ }
  }
  function hookHaptics() {
    var A = ACH.audio;
    if (hooked || !A || typeof A.emit !== 'function') return;
    hooked = true;
    var emit = A.emit;
    A.emit = function (name) { if (T.on && VIB[name]) vibrate(VIB[name]); return emit.apply(this, arguments); };
  }

  /* ---------------- Teclas virtuales ---------------- */
  function keyDown(id, code) { ptrs[id] = { kind: 'key', code: code }; I().press(code, true); }
  // la tecla se suelta solo si ningún otro dedo la sigue apretando
  function keyUp(id) {
    var p = ptrs[id]; if (!p) return;
    delete ptrs[id];
    for (var k in ptrs) if (ptrs[k].kind === 'key' && ptrs[k].code === p.code) return;
    I().release(p.code);
  }
  function releaseAll() {
    var inp = I(); if (!inp) return;
    for (var id in ptrs) { var p = ptrs[id]; if (p.kind === 'key') inp.release(p.code); }
    ptrs = {};
    endStick();
    if (sling) { inp.mouseCancel(); endSling(); }
    var b = document.querySelectorAll('#tc .on'); for (var i = 0; i < b.length; i++) b[i].classList.remove('on');
  }

  /* ---------------- Joystick flotante (mitad izquierda) ---------------- */
  function startStick(e) {
    var r = STICK_R, x = Math.max(r + 4, Math.min(window.innerWidth - r - 4, e.clientX)), y = Math.max(r + 4, Math.min(window.innerHeight - r - 4, e.clientY));
    stick = { id: e.pointerId, ox: x, oy: y, run: false };
    ptrs[e.pointerId] = { kind: 'stick' };
    if (el.tcStick) { el.tcStick.style.left = x + 'px'; el.tcStick.style.top = y + 'px'; el.tcStick.classList.add('on'); }
    moveStick(e);
  }
  function moveStick(e) {
    var s = stick; if (!s) return;
    var dx = e.clientX - s.ox, dy = e.clientY - s.oy, d = Math.sqrt(dx * dx + dy * dy), R = STICK_R;
    if (d > R * 1.35) {   // la base sigue al pulgar cuando se pasa de largo
      var k = (d - R * 1.35) / d; s.ox += dx * k; s.oy += dy * k;
      dx = e.clientX - s.ox; dy = e.clientY - s.oy; d = Math.sqrt(dx * dx + dy * dy);
      if (el.tcStick) { el.tcStick.style.left = s.ox + 'px'; el.tcStick.style.top = s.oy + 'px'; }
    }
    var mag = Math.min(1, d / R), ax = 0, ay = 0;
    if (mag > DEAD && d > 0) { ax = dx / d * mag; ay = dy / d * mag; }
    I().setVAxis(ax, ay);
    var run = mag >= RUN_AT;
    if (run !== s.run) { s.run = run; if (run) I().press('Shift'); else I().release('Shift'); if (el.tcStick) el.tcStick.classList.toggle('run', run); }
    var kd = Math.min(d, R), kx = d ? dx / d * kd : 0, ky = d ? dy / d * kd : 0;
    var knob = el.tcStick && el.tcStick.firstChild;
    if (knob) knob.style.transform = 'translate(' + kx.toFixed(1) + 'px,' + ky.toFixed(1) + 'px)';
  }
  function endStick() {
    if (!stick) return;
    delete ptrs[stick.id];
    if (stick.run) I().release('Shift');
    stick = null;
    I().setVAxis(0, 0);
    if (el.tcStick) el.tcStick.classList.remove('on', 'run');
  }

  /* ---------------- Resortera: apuntar arrastrando desde el botón ---------------- */
  // Logical px por px de pantalla (el canvas puede estar escalado de forma fraccionaria)
  function scaleK() { var cv = $('world'); if (!cv) return 1; var r = cv.getBoundingClientRect(), V = (ACH.render && ACH.render.VIEW) || cv; return r.width ? V.w / r.width : 1; }   // v0.15 (A): lógico (VIEW), no cv.width (= VIEW×K)
  function startSling(e, btn) {
    if (!hasSling() || state() !== 'playing' || invOpen()) return;
    var r = btn.getBoundingClientRect();
    sling = { t0: performance.now(), swap: 0, id: e.pointerId, bx: r.left + r.width / 2, by: r.top + r.height / 2, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, out: false, ux: 0, uy: 0 };
    ptrs[e.pointerId] = { kind: 'sling' };
    btn.classList.add('on');
    aimSling(true);
    I().mousePress();
  }
  // Pone el mouse simulado en el punto de mundo apuntado. Sin arrastre: hacia donde mira Alexander, el alcance lo da la carga.
  function aimSling(first) {
    var s = sling, g = G(); if (!s || !g || !g.player) return;
    var p = g.player, dx = s.x - s.bx, dy = s.y - s.by, d = Math.sqrt(dx * dx + dy * dy), ux, uy, R;
    var inside = d < SL_CANCEL;
    if (!inside) s.out = true;
    if (inside) {
      if (s.ux || s.uy) { ux = s.ux; uy = s.uy; } else { var dv = ACH.ent.DIRV[p.dir] || [1, 0], dl = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1]) || 1; ux = dv[0] / dl; uy = dv[1] / dl; }
      R = s.out ? SL_RMIN : SL_RMAX;
    } else {
      ux = dx / d; uy = dy / d;
      R = SL_RMIN + (SL_RMAX - SL_RMIN) * Math.min(1, (d - SL_CANCEL) / SL_DRAG);
    }
    if (!inside) { s.ux = ux; s.uy = uy; }
    I().mouseTo(p.x + ux * R, p.y - 1 + uy * R);
    // Efecto: solo el meneo lateral del pulgar (perpendicular a la mira) suma, como mover el mouse de lado en escritorio; los saltos de la mira
    // al girar no cuentan. Se le deja a interaccion.js el desplazamiento equivalente en lmx/lmy (lo consume en el siguiente paso).
    var sl = g.sling, m = I().mouse;
    if (sl && sl.charging) {
      if (sl.lmx !== s.wx || sl.lmy !== s.wy) s.pend = 0;     // el paso anterior ya lo consumió
      var mdx = s.x - s.lx, mdy = s.y - s.ly;
      s.pend = (s.pend || 0) + (inside ? 0 : (mdx * -uy + mdy * ux) / SL_SPIN_PX * ACH.inter.SL.spinK);
      sl.lmx = s.wx = m.x - (-uy) * s.pend; sl.lmy = s.wy = m.y - ux * s.pend;
    }
    s.lx = s.x; s.ly = s.y;
    if (el.tcSling) el.tcSling.classList.toggle('cancel', s.out && inside);
    if (el.tcAim) {
      el.tcAim.classList.toggle('on', !inside);
      if (!inside) { el.tcAim.style.left = s.bx + 'px'; el.tcAim.style.top = s.by + 'px'; el.tcAim.style.width = d + 'px'; el.tcAim.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)'; }
    }
    void first;
  }
  function endSling(fire) {
    var s = sling; if (!s) return;
    delete ptrs[s.id];
    sling = null;
    if (s.swap) fire = false;   // ya cambió de arma: soltar no tira
    if (fire !== undefined) {
      var d = Math.sqrt((s.x - s.bx) * (s.x - s.bx) + (s.y - s.by) * (s.y - s.by));
      if (fire && !(s.out && d < SL_CANCEL)) I().mouseRelease(); else I().mouseCancel();
    }
    if (el.tcSling) el.tcSling.classList.remove('on', 'cancel');
    if (el.tcAim) el.tcAim.classList.remove('on');
  }

  /* ---------------- v0.11: melodías (habilidades.js) ---------------- */
  function hab() { try { return !!(ACH.hab && ACH.hab.despierta); } catch (e) { return false; } }
  function habTree() { try { return !!(ACH.hab && ACH.hab.treeOpen && ACH.hab.treeOpen()); } catch (e) { return false; } }
  var MEL_HOLD = 400, fanOn = false;
  function fanShow(on) {
    if (!el.tcMelFan) return;
    fanOn = !!on;
    if (on) {
      var H = ACH.hab, l = H.learned(), sel = H.selected(), html = '';
      l.forEach(function (id) { var d = H.DEF[id]; html += '<button type="button" tabindex="-1" data-tc="melpick" data-id="' + id + '" class="' + (id === sel ? 'sel' : '') + '" style="--c:' + d.col + '"><b>' + d.k + '</b>' + d.short + '</button>'; });
      el.tcMelFan.innerHTML = html;
    }
    el.tcMelFan.classList.toggle('hide', !on);
  }

  /* ---------------- Botones ---------------- */
  function press(btn, e) {
    var k = btn.getAttribute('data-tc'), s = state(), id = e.pointerId;
    switch (k) {
      case 'guit': if (canAct(s)) { keyDown(id, 'Space'); btn.classList.add('on'); ptrs[id].btn = btn; } break;
      case 'jump': if (canAct(s)) { keyDown(id, 'KeyC'); btn.classList.add('on'); ptrs[id].btn = btn; } break;   // v0.9
      case 'tit': if (canAct(s)) { keyDown(id, 'KeyQ'); btn.classList.add('on'); ptrs[id].btn = btn; } break;
      case 'ctx': if (canAct(s)) { var cx = s === 'cine' ? proCtx() : ctxAct(); if (cx) { keyDown(id, cx.code); btn.classList.add('on'); ptrs[id].btn = btn; } } break;   // v0.8: AGARRAR (E) · LANZAR / PATEAR (F)
      case 'sling': startSling(e, btn); break;
      case 'mel': if (s === 'playing' && !invOpen() && hab()) { ptrs[id] = { kind: 'mel', t0: performance.now(), btn: btn }; btn.classList.add('on'); } break;   // v0.11
      case 'melpick': if (hab()) { try { ACH.hab.select(btn.getAttribute('data-id')); } catch (x) { /* nada */ } } fanShow(false); break;
      case 'arbol': if (hab()) { if (invOpen()) ACH.inv.close(); releaseMoves(); try { ACH.hab.toggleTree(); } catch (x) { /* nada */ } } break;
      case 'rec':   // v0.13 (G5)
        if (invOpen()) { var wasRec = false; try { wasRec = ACH.inv.tab() === 'rec'; } catch (x) { /* nada */ } ACH.inv.close(); if (wasRec) break; }
        if (s === 'playing' && ACH.inv && ACH.inv.openRecipes) { releaseMoves(); try { ACH.inv.openRecipes(); } catch (x) { /* nada */ } }
        break;
      case 'casa':   // v0.13 (G5): como H; si no se puede, el motivo (ACH.dif.canEnterBase)
        if (invOpen()) ACH.inv.close();
        if ((s === 'playing' || s === 'base') && ACH.game && ACH.game.goBase) { releaseMoves(); var gg = G(); if (gg) gg.baseMsg = null; var okB = false; try { okB = ACH.game.goBase() !== false; } catch (x) { okB = false; } if (!okB && ACH.hud && ACH.hud.toast) ACH.hud.toast((gg && gg.baseMsg) || 'Ahorita no se puede, causa.'); }
        break;
      case 'bag':
        if (invOpen()) ACH.inv.close();
        else if (s === 'playing' && ACH.inv && ACH.inv.open) { releaseMoves(); ACH.inv.open(); }
        break;
      case 'pause': case 'resume':
        if (s === 'playing') { if (invOpen()) ACH.inv.close(); releaseMoves(); keyDown(id, 'Escape'); }
        else if (s === 'paused') keyDown(id, 'Escape');
        else if ((s === 'intro' || s === 'dead') && ACH.game && ACH.game.autoPause) ACH.game.autoPause();
        break;
      case 'mute': if (ACH.audio && ACH.audio.mute) ACH.audio.mute(!ACH.audio.muted()); break;
      case 'full': ptrs[id] = { kind: 'full' }; break;   // en el toque, solo pointerup cuenta como gesto para pedir pantalla completa
      case 'vib': vibOn = !vibOn; try { window.localStorage.setItem(KEY_VIB, vibOn ? '1' : '0'); } catch (x) { /* nada */ } syncVib(); if (vibOn) { vibAt = 0; vibrate(30); } break;
    }
  }
  // al abrir la mochila o pausar se sueltan el joystick y los botones de acción
  function releaseMoves() {
    endStick();
    if (sling) { I().mouseCancel(); endSling(); }
    for (var id in ptrs) { var p = ptrs[id]; if (p.kind === 'key') { I().release(p.code); if (p.btn) p.btn.classList.remove('on'); delete ptrs[id]; } }
  }

  /* ---------------- Deslizadores de volumen ---------------- */
  function setRange(inp, x) {
    var r = inp.getBoundingClientRect(), mn = +inp.min || 0, mx = +inp.max || 100, st = +inp.step || 1;
    var v = mn + Math.max(0, Math.min(1, (x - r.left) / (r.width || 1))) * (mx - mn);
    v = Math.round(v / st) * st;
    if (+inp.value === v) return;
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ---------------- Pointer Events ---------------- */
  function isUI(t) { return !!(t && t.closest && t.closest('button, input, select, textarea, a, #inv, .vol, #tcRotate, .pz-diario, [data-scroll]')); }   // v0.13: el diario se desliza con el dedo
  function onDown(e) {
    if (e.pointerType === 'mouse') {
      if (T.on && !T.forced && !COARSE) disable();     // equipo híbrido: volvió al mouse
      return;
    }
    if (!T.on) { if (FORCE_OFF || !(COARSE || HAS_TOUCH)) return; enable(); }
    var t = e.target, s = state();
    if (el.tcRotate && el.tcRotate.classList.contains('on')) { e.preventDefault(); return; }
    var btn = t && t.closest && t.closest('[data-tc]');
    if (btn) { e.preventDefault(); press(btn, e); return; }
    var q = t && t.closest && t.closest('#qbar .qs');
    if (q) {
      e.preventDefault();
      if (s === 'playing' && !invOpen() && ACH.inv && ACH.inv.useQuick) ACH.inv.useQuick(Array.prototype.indexOf.call(q.parentNode.children, q));
      return;
    }
    var rg = t && t.closest && t.closest('input[type=range]');
    if (rg) { e.preventDefault(); ptrs[e.pointerId] = { kind: 'range', el: rg }; setRange(rg, e.clientX); return; }
    if (isUI(t)) return;                                 // mochila y botones HTML: su propio clic
    if (ACH.dialogo && ACH.dialogo.active()) { e.preventDefault(); return; }   // v0.10: el diálogo maneja su propio toque
    if ((s === 'cine' && !proOn()) || (t && t.closest && t.closest('.cm-root'))) return;      // v0.10: la cima y el mapa manejan su propio clic
    e.preventDefault();                                  // sin eventos de mouse de compatibilidad ni menú de toque largo
    if (s === 'title' || s === 'intro' || s === 'won') { keyDown(e.pointerId, 'Enter'); return; }
    if (canAct(s) && !stick && e.clientX < window.innerWidth * 0.5) startStick(e);
  }
  function onMove(e) {
    var p = ptrs[e.pointerId]; if (!p) return;
    if (p.kind === 'stick' && stick) moveStick(e);
    else if (p.kind === 'sling' && sling) { sling.x = e.clientX; sling.y = e.clientY; }   // la mira se pone una vez por cuadro (tick)
    else if (p.kind === 'range') setRange(p.el, e.clientX);
    if (e.cancelable) e.preventDefault();
  }
  function onUp(e) {
    if (e.pointerType === 'mouse') return;
    var p = ptrs[e.pointerId];
    if (T.on && e.type === 'pointerup') firstGesture(!!(p && p.kind === 'full'));   // el botón ⛶ pide la pantalla completa él mismo
    if (!p) return;
    if (p.kind === 'stick') endStick();
    else if (p.kind === 'sling') { if (sling) { sling.x = e.clientX; sling.y = e.clientY; aimSling(false); } endSling(e.type === 'pointerup'); }
    else if (p.kind === 'full') { delete ptrs[e.pointerId]; if (e.type === 'pointerup' && ACH.fullscreen) ACH.fullscreen.toggle(); }
    else if (p.kind === 'key') { if (p.btn) p.btn.classList.remove('on'); keyUp(e.pointerId); }
    else if (p.kind === 'mel') { delete ptrs[e.pointerId]; if (p.btn) p.btn.classList.remove('on'); if (!p.fan && e.type === 'pointerup' && hab()) { try { ACH.hab.castSelected(); } catch (x) { /* nada */ } } }   // v0.11
    else delete ptrs[e.pointerId];
  }
  window.addEventListener('pointerdown', onDown, { passive: false });
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('touchend', function () { if (T.on && ACH.audio && ACH.audio.unlock) { try { ACH.audio.unlock(); } catch (e) { /* nada */ } } }, true);
  window.addEventListener('contextmenu', function (e) { if (T.on) e.preventDefault(); });
  window.addEventListener('blur', function () { if (T.on) releaseAll(); });
  window.addEventListener('keydown', function (e) { if (T.on && !T.forced && !COARSE && e.isTrusted && !e.repeat) disable(); }, true);
  // Safari: gesto de pellizco
  document.addEventListener('gesturestart', function (e) { if (T.on) e.preventDefault(); });

  /* ---------------- Calidad (auto en el teléfono) ---------------- */
  var LEVELS = {
    1: { ambMax: 24, ambLitter: 4, ambFliesMax: 5, smokeMax: 18, sparksHit: 4, splintersHit: 2, sparksKill: 4, splintersKill: 1, dustKill: 2, zombieHalo: 0, fogLayers: 1, groundFogOver: 0 },
    0: { ambMax: 12, ambLitter: 2, ambFliesMax: 3, smokeMax: 10, sparksHit: 3, splintersHit: 1, sparksKill: 3, splintersKill: 1, dustKill: 1, zombieHalo: 0, fogLayers: 0, groundFogOver: 0,
      groundFog: 0, depthFog: 0, ambRipples: 0, ambDrips: 0 }
  };
  var qual = { level: 2, auto: true, base: null, acc: 0, n: 0, drops: [] };
  function setQuality(lv) {
    var F = ACH.ent && ACH.ent.CFG && ACH.ent.CFG.fx; if (!F) return;
    lv = Math.max(0, Math.min(2, lv | 0));
    if (!qual.base) { qual.base = {}; for (var l in LEVELS) for (var k in LEVELS[l]) qual.base[k] = F[k]; }
    for (var b in qual.base) { if (qual.base[b] === undefined) delete F[b]; else F[b] = qual.base[b]; }
    if (lv < 2) { var L = LEVELS[lv]; for (var k2 in L) F[k2] = L[k2]; }
    qual.level = lv;
  }
  // v0.15 (E, F1): decide con el COSTO medido del cuadro (ACH.postfx.frameCost: render + presentación), no con el dt de rAF; sin foco
  // o con la pestaña oculta no mide; picos sueltos (> P.spikeMs) no cuentan. postfx.judge() baja lente → HD → partículas y, con costo
  // bajo sostenido, sube en orden inverso (partículas primero). QA: perfSample(dt, costMs) alimenta un cuadro con ese costo.
  function perf(dt, costMs) {
    var g = G(), PF = ACH.postfx, fc = PF && PF.frameCost ? PF.frameCost() : null, foc = true;
    try { foc = !document.hasFocus || document.hasFocus(); } catch (eF) { foc = true; }
    if (!T.on || !qual.auto || !g || g.state !== 'playing' || invOpen() || document.hidden || !foc || dt > 1 || !PF || !PF.judge) { qual.acc = 0; qual.n = 0; qual.sum = 0; return; }
    var ms = costMs;
    if (ms === undefined) { if (!fc || fc.settling || fc.n === qual.lastN) return; qual.lastN = fc.n; ms = fc.ms; }   // un cuadro dibujado = una muestra
    if (!(ms >= 0) || ms > PF.P.spikeMs) return;
    qual.acc += dt; qual.n++; qual.sum = (qual.sum || 0) + ms;
    if (qual.acc >= 3) {
      var avg = qual.sum / qual.n, top = 2;
      var r = qual.n >= 20 ? PF.judge('tactil', avg, qual.acc * 1000, {
        hi: PF.P.costHiTouch,
        drop: function () { if (qual.level <= 0) return false; setQuality(qual.level - 1); return true; },
        raise: function () { if (qual.level >= top) return false; setQuality(qual.level + 1); return true; }
      }) : null;
      if (r) qual.drops.push({ at: Math.round(g.time), avgMs: +avg.toFixed(1), act: r, gfx: PF.level(), level: qual.level });
      qual.acc = 0; qual.n = 0; qual.sum = 0;
    }
  }

  /* ---------------- Bucle de la interfaz: visibilidad, Titina, resortera ---------------- */
  var lastT = 0, lastShow = {}, lastNoAir, noAirTO = 0;
  function syncMel(now) {   // v0.11: botón MELODÍA: rótulo de la elegida, gris si no alcanza, late con el último rasgueo; mantener = abanico
    var H = ACH.hab, inf = null; try { inf = H.info(); } catch (e) { return; }
    var id = inf.sel && inf.learned.indexOf(inf.sel) >= 0 ? inf.sel : inf.learned[0], d = id && H.DEF[id];
    var lbl = d ? d.short : '';
    if (el.tcMelN && el.tcMelN.textContent !== lbl) el.tcMelN.textContent = lbl;
    var cd = id && inf.cd[id] > 0, low = !d || cd || (id === 'rasgueo' ? !inf.rasAvail : inf.state.sabor < d.cost);
    if (el.tcMel) { el.tcMel.classList.toggle('low', !!low); el.tcMel.classList.toggle('ready', !!inf.rasAvail); }
    for (var k in ptrs) { var q = ptrs[k]; if (q.kind === 'mel' && !q.fan && now - q.t0 >= MEL_HOLD && inf.learned.length > 1) { q.fan = true; fanShow(true); vibrate(20); } }
  }
  function show(k, on) { if (lastShow[k] !== on && el[k]) { el[k].classList.toggle('hide', !on); lastShow[k] = on; } }
  function tick(now) {
    var dt = lastT ? (now - lastT) / 1000 : 0; lastT = now;
    perf(dt);
    if (T.on && built) {
      var g = G(), s = state(), play = s === 'playing' && !invOpen();
      var dlg = !!(ACH.dialogo && ACH.dialogo.active());   // v0.10: con diálogo con retrato no hay controles (se toca la caja)
      if (dlg) play = false;
      var ht = habTree(); if (ht) { play = false; dlg = true; }   // v0.11: con el árbol abierto no hay controles (se toca el afiche)
      var pro = !dlg && s === 'cine' && proOn();
      document.body.setAttribute('data-tcmode', dlg ? 'off' : play ? 'play' : pro ? 'pro' : (s === 'playing' && invOpen()) ? 'inv' : (s === 'paused' || s === 'dead' || s === 'intro') ? 'menu' : 'off');
      show('tcSling', play && hasSling());
      var hb = hab(), hl = false; try { hl = hb && ACH.hab.learned().length > 0; } catch (x) { hl = false; } show('tcMel', play && hl); show('tcArbol', hb && (play || ht));   // v0.11
      if (hl && play) syncMel(now); else if (fanOn) fanShow(false);
      if (play) syncRanged();
      if (sling && !sling.out && !sling.swap && now - sling.t0 >= SL_SWAP_MS) { sling.swap = 1; I().mouseCancel(); }   // mantenido sin arrastrar: se suelta la carga y se cambia de arma
      if (sling && sling.swap === 1 && !(g && g.sling && g.sling.charging)) {
        sling.swap = 2;
        try { if (ACH.inter && ACH.inter.cycleRanged) ACH.inter.cycleRanged(g); } catch (eC) { /* nada */ }
        vibrate(30);
      }
      // v0.8: botón contextual (solo cuando hay algo cerca o en la mano) y GUITARRAZO → PUÑETE con la guitarra rota
      var ca = play ? ctxAct() : pro ? proCtx() : null, held = !!ctxHeld();
      show('tcCtx', !!ca || held);
      if (el.tcCtx && (ca || held)) { var cl = ca ? ca.label : el.tcCtx.textContent; if (el.tcCtx.textContent !== cl) el.tcCtx.textContent = cl; }
      if (el.tcGuit) { var gl = guitLabel(); if (el.tcGuit.getAttribute('data-lbl') !== gl) { el.tcGuit.setAttribute('data-lbl', gl); el.tcGuit.innerHTML = GUIT_LBL[gl]; } }
      if (!play && !pro && (stick || sling)) releaseMoves();
      if (sling) aimSling(false);
      if (g && g.player && el.tcTit) {
        var ts = !g.player.bird ? 'volando' : g.qT > 0 ? 'activa' : g.qCD > 0 ? 'cd' : 'lista';
        if (el.tcTit.getAttribute('data-t') !== ts) el.tcTit.setAttribute('data-t', ts);
        var lbl = ts === 'cd' ? Math.ceil(g.qCD) + 's' : ts === 'volando' ? '...' : '';
        if (el.tcTitN.textContent !== lbl) el.tcTitN.textContent = lbl;
      }
      if (g && g.noAirAt !== undefined && g.noAirAt !== lastNoAir && el.tcGuit) {   // sin aliento: el botón parpadea gris con «¡sin aire!»
        lastNoAir = g.noAirAt;
        el.tcGuit.classList.remove('noair'); void el.tcGuit.offsetWidth; el.tcGuit.classList.add('noair');
        clearTimeout(noAirTO); noAirTO = setTimeout(function () { if (el.tcGuit) el.tcGuit.classList.remove('noair'); }, 650);
      }
      if (el.tcMute && ACH.audio && ACH.audio.muted) { var mi = ACH.audio.muted() ? '🔇' : '🔊'; if (el.tcMute.textContent !== mi) el.tcMute.textContent = mi; }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------------- Debug ---------------- */
  ACH.debug = ACH.debug || {};
  ACH.debug.touch = function (on) {
    if (on === undefined) return { on: T.on, forced: T.forced, coarse: COARSE, stick: stick ? { x: I().vaxis().x, y: I().vaxis().y, run: stick.run } : null, sling: !!sling, vib: vibOn };
    if (on) enable(true); else disable();
    return T.on;
  };
  ACH.debug.quality = function (lv) {
    if (lv === 'auto') { qual.auto = true; }
    else if (lv !== undefined) { qual.auto = false; setQuality(lv); }
    return { level: qual.level, auto: qual.auto, gfx: ACH.postfx ? ACH.postfx.level() : null, drops: qual.drops.slice(), levels: { 2: 'completa', 1: 'menos partículas y una capa de neblina', 0: 'sin neblinas ni halos' } };
  };
  T.vibrate = vibrate;
  T.perfSample = perf;   // QA: ACH.touch.perfSample(0.025) alimenta el promedio con un cuadro de 25 ms

  /* ---------------- Arranque ---------------- */
  // v0.13 (G5): ?touch=1 / ?touch=0 se recuerdan entre páginas (localStorage['achorado.touch'])
  var KEY_T = 'achorado.touch', SAVED = null;
  try { if (FORCE_ON) window.localStorage.setItem(KEY_T, '1'); else if (FORCE_OFF) window.localStorage.removeItem(KEY_T); SAVED = window.localStorage.getItem(KEY_T); } catch (e) { SAVED = null; }
  var FROM_SAVED = SAVED === '1' && !FORCE_ON && !FORCE_OFF;   // recordado: encendido sin forzar (en escritorio, el teclado o el mouse lo apagan y lo olvidan)
  T.persist = function (on) { try { if (on) window.localStorage.setItem(KEY_T, '1'); else window.localStorage.removeItem(KEY_T); } catch (e) { /* nada */ } };
  function boot() { if (FORCE_ON) enable(true); else if (FROM_SAVED || (!FORCE_OFF && COARSE)) enable(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
