/* ACHORADO — input.js: teclado y mouse. Flancos ("pressed") se consumen al final de cada paso de update. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var down = {}, pressed = {};
  // v0.6: x/y = lógicas (ACH.render.VIEW, se adapta a la ventana); wx/wy = mundo (game.js llama setCam cada paso); down = botón izquierdo apretado;
  // clicked / released = flancos de bajada y subida (se consumen en endStep).
  var mouse = { x: 0, y: 0, wx: 0, wy: 0, clicked: false, clickX: 0, clickY: 0, down: false, released: false };
  var camX = 0, camY = 0;
  var vax = 0, vay = 0;   // eje analógico virtual (joystick táctil, tactil.js): se suma a las teclas
  function uiTarget(e) {   // clics sobre botones o paneles HTML (mochila, pausa) no son disparos
    var t = e.target;
    if (!t || !t.closest) return false;
    return !!t.closest('button, input, select, textarea, label, a, [data-ui], .inv, #inv, #inventario, #mochila');
  }
  var BLOCK = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, F3: 1, Tab: 1 };

  /* ---------------- v0.13 T2 (U · G5): ACH.opciones — pausa con P, remapeo, calma (sacudida/destellos), texto grande, contraste ----------------
     localStorage['achorado.opciones.v1'] = {dif (dificultad.js), pausaP, teclas: {accion: código físico}, calma, texto: 'normal'|'grande', contraste}
     El remapeo traduce aquí: la tecla física elegida llega al juego como el código de siempre (ACH.input.pressed('KeyE') sigue igual).
     Solo se remapean las acciones que pasan por ACH.input; las teclas fijas (ESC, P, I, TAB, L, H, K, M, melodías, 1-9, flechas) no se pueden usar. */
  var OKEY = 'achorado.opciones.v1';
  var ACCIONES = [
    { id: 'arriba', def: 'KeyW', nombre: 'subir' }, { id: 'abajo', def: 'KeyS', nombre: 'bajar' }, { id: 'izq', def: 'KeyA', nombre: 'izquierda' }, { id: 'der', def: 'KeyD', nombre: 'derecha' },
    { id: 'correr', def: 'ShiftLeft', nombre: 'correr' }, { id: 'golpe', def: 'Space', nombre: 'guitarrazo' }, { id: 'saltar', def: 'KeyC', nombre: 'saltar' },
    { id: 'titina', def: 'KeyQ', nombre: 'mandar a Titina' }, { id: 'agarrar', def: 'KeyE', nombre: 'agarrar · usar · hablar' }, { id: 'lanzar', def: 'KeyF', nombre: 'tirar' },
    { id: 'resortera', def: 'KeyR', nombre: 'resortera / molotov' }];
  var RESERVED = /^(Escape|KeyP|KeyI|Tab|KeyL|KeyH|KeyK|KeyM|KeyZ|KeyX|KeyV|KeyB|KeyG|KeyN|Digit\d|Numpad\d|Enter|NumpadEnter|F\d+|Arrow\w+|Meta\w*|OS\w*|ContextMenu|CapsLock|Backspace)$/;
  var omem = null, oFns = [], tmap = {}, tblock = {};
  function oRead() {
    if (omem) return omem;
    var o = null; try { o = JSON.parse(window.localStorage.getItem(OKEY) || 'null'); } catch (e) { o = null; }
    omem = (o && typeof o === 'object') ? o : {};
    if (!omem.teclas || typeof omem.teclas !== 'object') omem.teclas = {};
    return omem;
  }
  function oWrite() {
    try { var cur = JSON.parse(window.localStorage.getItem(OKEY) || '{}') || {}; for (var k in omem) cur[k] = omem[k]; window.localStorage.setItem(OKEY, JSON.stringify(cur)); } catch (e) { /* memoria */ }
  }
  var ODEF = { pausaP: true, calma: false, texto: 'normal', contraste: false };
  function oGet(k) { var o = oRead(); return o[k] === undefined ? ODEF[k] : o[k]; }
  function physOf(a) { var t = oRead().teclas; return t[a.id] || a.def; }
  function rebuild() {
    tmap = {}; tblock = {};
    ACCIONES.forEach(function (a) { var ph = physOf(a); if (ph !== a.def) { tmap[ph] = a.def; tblock[a.def] = true; } });
    for (var ph in tmap) delete tblock[ph];   // la tecla de siempre de otra acción, reasignada aquí: no se bloquea, se traduce
    if (tmap.ShiftLeft === undefined && tblock.ShiftLeft) tblock.ShiftRight = true;
  }
  function translate(code) { if (tmap[code] !== undefined) return tmap[code]; if (tblock[code]) return null; return code; }
  function bodyClasses() {
    var b = document.body; if (!b) return;
    b.classList.toggle('opt-calma', !!oGet('calma'));
    b.classList.toggle('opt-txtbig', oGet('texto') === 'grande');
    b.classList.toggle('opt-hc', !!oGet('contraste'));
  }
  function oSet(k, v) {
    oRead()[k] = v; oWrite(); bodyClasses();
    oFns.forEach(function (f) { try { f(k, v); } catch (e) { /* nada */ } });
    return v;
  }
  // remap('agarrar', 'KeyG'): si esa tecla ya era de otra acción, las dos se cambian. Devuelve {ok, motivo}
  function remap(id, code) {
    var a = null; ACCIONES.forEach(function (x) { if (x.id === id) a = x; });
    if (!a) return { ok: false, motivo: 'Acción desconocida.' };
    if (!code || RESERVED.test(code)) return { ok: false, motivo: 'Esa tecla ya está ocupada (menú, mochila o melodías).' };
    var prev = physOf(a), t = oRead().teclas;
    ACCIONES.forEach(function (x) { if (x !== a && physOf(x) === code) { if (prev === x.def) delete t[x.id]; else t[x.id] = prev; } });
    if (code === a.def) delete t[a.id]; else t[a.id] = code;
    oWrite(); rebuild();
    oFns.forEach(function (f) { try { f('teclas', t); } catch (e) { /* nada */ } });
    return { ok: true };
  }
  function resetTeclas() { oRead().teclas = {}; oWrite(); rebuild(); oFns.forEach(function (f) { try { f('teclas', {}); } catch (e) { /* nada */ } }); }
  // physFor('KeyE') → la tecla física que hoy hace de E (para los rótulos)
  function physFor(canon) { var r = canon; ACCIONES.forEach(function (a) { if (a.def === canon) r = physOf(a); }); return r; }
  rebuild();
  if (document.body) bodyClasses(); else document.addEventListener('DOMContentLoaded', bodyClasses);
  ACH.opciones = { KEY: OKEY, ACCIONES: ACCIONES, get: oGet, set: oSet, on: function (f) { if (typeof f === 'function') oFns.push(f); },
    remap: remap, resetTeclas: resetTeclas, physFor: physFor, tecla: function (id) { var r = null; ACCIONES.forEach(function (a) { if (a.id === id) r = physOf(a); }); return r; },
    reserved: function (c) { return RESERVED.test(c); }, translate: translate };
  function dlgOn() { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); }


  function onDown(e) {
    var raw = e.code || e.key, code = translate(raw);
    if (BLOCK[raw] || BLOCK[code]) e.preventDefault();
    if (raw === 'KeyP' && oGet('pausaP') && !e.repeat && !dlgOn()) pressed.Escape = true;   // v0.13: P = ESC para la pausa (Chrome en pantalla completa se come el ESC)
    if (code === null) return;
    if (!down[code]) pressed[code] = true;
    down[code] = true;
  }
  function onUp(e) {
    var code = translate(e.code || e.key);
    if (code === null) return;
    down[code] = false;
  }
  // v0.11: filtros de teclado en captura (se registran aquí, antes que pausa.js e inventario.js): fn(e) → true = la tecla se traga.
  // Lo usa habilidades.js: con el árbol abierto, K / ESC lo cierran y ESC no llega a la pausa.
  var keyFilters = [];
  window.addEventListener('keydown', function (e) {
    for (var i = 0; i < keyFilters.length; i++) {
      var hit = false; try { hit = keyFilters[i](e) === true; } catch (x) { hit = false; }
      if (hit) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    }
  }, true);
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', function () { down = {}; mouse.down = false; });

  // Coordenadas lógicas (VIEW) a partir de un evento de mouse sobre el canvas.
  function toLogical(e) {
    var cv = document.getElementById('world');
    if (!cv) return { x: 0, y: 0 };
    var r = cv.getBoundingClientRect();
    var V = (ACH.render && ACH.render.VIEW) || { w: cv.width, h: cv.height };   // v0.15 (A): #world mide VIEW×K; las coordenadas son LÓGICAS
    var lx = (e.clientX - r.left) * (V.w / r.width), ly = (e.clientY - r.top) * (V.h / r.height);
    // v0.14 (A): con la lente WebGL (inclinación de cámara) el píxel que se ve bajo el cursor no es el lineal → inversa exacta
    return ACH.postfx && ACH.postfx.toWorld ? ACH.postfx.toWorld(lx, ly) : { x: lx, y: ly };
  }
  function toWorld() { mouse.wx = mouse.x + camX; mouse.wy = mouse.y + camY; }
  window.addEventListener('mousemove', function (e) { var p = toLogical(e); mouse.x = p.x; mouse.y = p.y; toWorld(); });
  window.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || uiTarget(e)) return;
    var p = toLogical(e);
    mouse.x = p.x; mouse.y = p.y; toWorld();
    mouse.clicked = true; mouse.clickX = p.x; mouse.clickY = p.y; mouse.down = true;
  });
  window.addEventListener('mouseup', function (e) {
    if (e.button !== 0) return;
    if (mouse.down) mouse.released = true;
    mouse.down = false;
  });

  function any(codes) {
    for (var i = 0; i < codes.length; i++) if (down[codes[i]]) return true;
    return false;
  }
  function anyPressed(codes) {
    for (var i = 0; i < codes.length; i++) if (pressed[codes[i]]) return true;
    return false;
  }

  ACH.input = {
    down: function (code) { return !!down[code]; },
    pressed: function (code) { return !!pressed[code]; },
    any: any, anyPressed: anyPressed,
    mouse: mouse,
    // Eje de movimiento (-1..1) en x/y.
    axis: function () {
      var x = 0, y = 0;
      if (any(['KeyA', 'ArrowLeft'])) x -= 1;
      if (any(['KeyD', 'ArrowRight'])) x += 1;
      if (any(['KeyW', 'ArrowUp'])) y -= 1;
      if (any(['KeyS', 'ArrowDown'])) y += 1;
      if (vax || vay) { x = Math.max(-1, Math.min(1, x + vax)); y = Math.max(-1, Math.min(1, y + vay)); }
      return { x: x, y: y };
    },
    endStep: function () { pressed = {}; mouse.clicked = false; mouse.released = false; },
    // cámara actual (px de mundo, enteros): convierte el mouse a coordenadas de mundo
    setCam: function (x, y) { camX = x; camY = y; toWorld(); },
    // Para pruebas: mouse simulado en coordenadas de mundo
    mouseTo: function (wx, wy) { mouse.x = wx - camX; mouse.y = wy - camY; toWorld(); },
    mousePress: function () { mouse.clicked = true; mouse.down = true; mouse.clickX = mouse.x; mouse.clickY = mouse.y; },
    mouseRelease: function () { if (mouse.down) mouse.released = true; mouse.down = false; },
    // táctil (tactil.js): suelta el botón sin flanco de subida → la resortera se cancela sin disparar
    mouseCancel: function () { mouse.down = false; mouse.released = false; },
    // táctil: eje analógico virtual (-1..1) que axis() suma a las teclas
    setVAxis: function (x, y) { vax = +x || 0; vay = +y || 0; },
    vaxis: function () { return { x: vax, y: vay }; },
    // Para pruebas: simular teclas sin eventos del navegador.
    // force (botones táctiles): el flanco cuenta aunque otro dedo ya tenga la tecla apretada. El flanco queda puesto hasta que un
    // paso de update lo consume (endStep), aunque la tecla se suelte antes: un toque de 0 ms entre bajada y subida también cuenta.
    press: function (code, force) { if (force || !down[code]) pressed[code] = true; down[code] = true; },
    release: function (code) { down[code] = false; },
    reset: function () { down = {}; pressed = {}; vax = 0; vay = 0; mouse.clicked = false; mouse.released = false; mouse.down = false; },
    addKeyFilter: function (fn) { if (typeof fn === 'function' && keyFilters.indexOf(fn) < 0) keyFilters.push(fn); },   // v0.11
    consume: function (code) { pressed[code] = false; }   // v0.11: borra el flanco de una tecla en este paso
  };
})();
